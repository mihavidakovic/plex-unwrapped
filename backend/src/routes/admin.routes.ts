import { Router } from 'express';
import { asyncHandler, createError } from '../middleware/error.middleware';
import { authenticateToken, generateToken, hashPassword, verifyPassword } from '../middleware/auth.middleware';
import { adminRateLimiter, authRateLimiter } from '../middleware/rate-limit.middleware';
import { UserModel } from '../models/User';
import { WrappedGenerationModel } from '../models/WrappedGeneration';
import { UserWrappedStatsModel } from '../models/UserWrappedStats';
import { AccessTokenModel } from '../models/AccessToken';
import { EmailLogModel } from '../models/EmailLog';
import { getTautulliService } from '../services/tautulli.service';
import { getOverseerrService } from '../services/overseerr.service';
import StatsCalculator from '../processors/stats-calculator';
import logger from '../utils/logger';
import { db } from '../config/database';
import nodemailer from 'nodemailer';

const router = Router();

/**
 * POST /api/admin/login
 * Admin login
 */
router.post('/login', authRateLimiter, asyncHandler(async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    throw createError('Username and password are required', 400);
  }

  // Get admin credentials from env
  const adminUsername = process.env.ADMIN_USERNAME || 'admin';
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminPassword) {
    throw createError('Admin authentication not configured', 500);
  }

  // Verify credentials
  if (username !== adminUsername) {
    throw createError('Invalid credentials', 401);
  }

  // For simplicity, we're comparing plain text passwords from env
  // In production, you'd want to hash the password in the env and use bcrypt
  const isValid = password === adminPassword;

  if (!isValid) {
    throw createError('Invalid credentials', 401);
  }

  // Generate token
  const token = generateToken({ id: 1, username: adminUsername });

  logger.info(`Admin login successful: ${username}`);

  res.json({
    success: true,
    token,
    user: {
      id: 1,
      username: adminUsername,
    },
  });
}));

// Apply authentication to all routes below
router.use(authenticateToken);
router.use(adminRateLimiter);

/**
 * GET /api/admin/dashboard
 * Get dashboard overview
 */
router.get('/dashboard', asyncHandler(async (req, res) => {
  const targetYear = parseInt(process.env.TARGET_YEAR || '2025', 10);

  // Get counts
  const [
    totalUsers,
    totalGenerations,
    yearStats,
    latestGeneration,
    emailStats,
  ] = await Promise.all([
    UserModel.count(),
    db.one<{ count: string }>('SELECT COUNT(*) FROM wrapped_generations'),
    UserWrappedStatsModel.countByYear(targetYear),
    WrappedGenerationModel.getLatestByYear(targetYear),
    db.one<any>(`
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'sent') as sent,
        COUNT(*) FILTER (WHERE status = 'failed') as failed
      FROM email_logs
      WHERE created_at > NOW() - INTERVAL '30 days'
    `),
  ]);

  res.json({
    totalUsers,
    totalGenerations: parseInt(totalGenerations.count, 10),
    usersWithStats: yearStats,
    latestGeneration,
    emailStats: {
      totalSent: parseInt(emailStats.sent, 10),
      totalPending: parseInt(emailStats.total, 10) - parseInt(emailStats.sent, 10) - parseInt(emailStats.failed, 10),
      totalFailed: parseInt(emailStats.failed, 10),
    },
    testMode: process.env.TEST_MODE === 'true',
    targetYear,
  });
}));

/**
 * POST /api/admin/users/sync
 * Sync users from Tautulli
 */
router.post('/users/sync', asyncHandler(async (req, res) => {
  logger.info('Starting user sync from Tautulli');

  const tautulli = getTautulliService();
  const tautulliUsers = await tautulli.getUsers();

  const synced = [];
  for (const tUser of tautulliUsers) {
    const user = await UserModel.upsert({
      plex_user_id: tUser.user_id,
      username: tUser.username,
      email: tUser.email,
      friendly_name: tUser.friendly_name,
      thumb: tUser.thumb,
      is_admin: tUser.is_admin === 1,
      is_home_user: tUser.is_home_user === 1,
      is_allow_sync: tUser.is_allow_sync === 1,
      is_restricted: tUser.is_restricted === 1,
    });
    synced.push(user);
  }

  logger.info(`Synced ${synced.length} users from Tautulli`);

  res.json({
    success: true,
    message: `Synced ${synced.length} users`,
    users: synced,
  });
}));

/**
 * GET /api/admin/users
 * List all users
 */
router.get('/users', asyncHandler(async (req, res) => {
  const users = await UserModel.findAll();
  const targetYear = parseInt(process.env.TARGET_YEAR || '2025', 10);

  // Get stats for each user
  const usersWithStats = await Promise.all(
    users.map(async (user) => {
      const stats = await UserWrappedStatsModel.findByUserAndYear(user.id, targetYear);
      const tokens = stats ? await AccessTokenModel.findByWrappedStatsId(stats.id) : null;

      return {
        ...user,
        hasStats: !!stats,
        statsId: stats?.id || null,
        token: tokens?.token || null,
        generatedAt: stats?.generated_at || null,
      };
    })
  );

  res.json(usersWithStats);
}));

/**
 * GET /api/admin/users/:id
 * Get specific user with stats
 */
router.get('/users/:id', asyncHandler(async (req, res) => {
  const userId = parseInt(req.params.id, 10);
  const user = await UserModel.findById(userId);

  if (!user) {
    throw createError('User not found', 404);
  }

  const targetYear = parseInt(process.env.TARGET_YEAR || '2025', 10);
  const stats = await UserWrappedStatsModel.findByUserAndYear(userId, targetYear);
  const tokens = stats ? await AccessTokenModel.findByWrappedStatsId(stats.id) : [];

  res.json({
    user,
    stats,
    tokens,
  });
}));

/**
 * PATCH /api/admin/users/:id/language
 * Update user's preferred language
 */
router.patch('/users/:id/language', asyncHandler(async (req, res) => {
  const userId = parseInt(req.params.id, 10);
  const { preferred_language } = req.body;

  // Validate language code
  const validLanguages = ['en', 'es', 'fr', 'de', 'sl'];
  if (!preferred_language || !validLanguages.includes(preferred_language)) {
    throw createError('Invalid language code. Must be one of: en, es, fr, de, sl', 400);
  }

  // Check if user exists
  const user = await UserModel.findById(userId);
  if (!user) {
    throw createError('User not found', 404);
  }

  // Update user's language preference
  const updatedUser = await UserModel.update(userId, { preferred_language });

  logger.info(`Updated language for user ${userId} to ${preferred_language}`);

  res.json({
    success: true,
    user: updatedUser,
  });
}));

/**
 * POST /api/admin/users/:id/send-email
 * Send wrapped email to a specific user
 */
router.post('/users/:id/send-email', asyncHandler(async (req, res) => {
  const userId = parseInt(req.params.id, 10);
  const user = await UserModel.findById(userId);

  if (!user) {
    throw createError('User not found', 404);
  }

  if (!user.email) {
    throw createError('User does not have an email address', 400);
  }

  const targetYear = parseInt(process.env.TARGET_YEAR || '2025', 10);
  const stats = await UserWrappedStatsModel.findByUserAndYear(userId, targetYear);

  if (!stats) {
    throw createError('No wrapped stats found for this user', 404);
  }

  // Get or create access token
  let tokenRecord = await AccessTokenModel.findByWrappedStatsId(stats.id);
  if (!tokenRecord) {
    const result = await AccessTokenModel.create({
      user_wrapped_stats_id: stats.id,
      user_id: stats.user_id,
      year: stats.year
    });
    tokenRecord = result.record;
  }

  // Get user's preferred language (defaults to 'en' if not set)
  const locale = user.preferred_language || 'en';

  // Construct wrapped URL with language parameter
  const appUrl = process.env.APP_URL || 'http://localhost:3000';
  const wrappedUrl = `${appUrl}/wrapped/${tokenRecord.token}?lang=${locale}`;

  // Generate subject with i18n
  const { i18n } = require('../services/i18n.service');
  const emailSubject = i18n.t('email.subject', locale, { year: targetYear });

  // Create email log
  const emailLog = await EmailLogModel.create({
    user_id: user.id,
    generation_id: null,
    email_to: user.email,
    email_subject: emailSubject,
  });

  try {
    // Create SMTP transporter
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
    });

    // Send email
    const info = await transporter.sendMail({
      from: `"${process.env.SMTP_FROM_NAME}" <${process.env.SMTP_FROM_EMAIL}>`,
      to: user.email,
      subject: emailSubject,
      html: generateEmailHTML(user, stats, wrappedUrl, locale),
      text: generateEmailText(user, stats, wrappedUrl, locale),
    });

    // Mark as sent
    await EmailLogModel.markSent(emailLog.id, info.messageId, info.response);
    logger.info(`Email sent to ${user.email}`);

    res.json({
      success: true,
      message: 'Email sent successfully',
      email: user.email,
    });
  } catch (error: any) {
    // Mark as failed
    await EmailLogModel.markFailed(emailLog.id, error.message);
    logger.error(`Failed to send email to ${user.email}:`, error);
    throw createError(`Failed to send email: ${error.message}`, 500);
  }
}));

/**
 * GET /api/admin/preview/:userId/:year
 * Preview user's wrapped stats (for TEST_MODE)
 */
router.get('/preview/:userId/:year', asyncHandler(async (req, res) => {
  const userId = parseInt(req.params.userId, 10);
  const year = parseInt(req.params.year, 10);

  const user = await UserModel.findById(userId);
  if (!user) {
    throw createError('User not found', 404);
  }

  const stats = await UserWrappedStatsModel.findByUserAndYear(userId, year);
  if (!stats) {
    throw createError('Stats not found for this user and year', 404);
  }

  const token = await AccessTokenModel.findByWrappedStatsId(stats.id);

  // Get user's preferred language for preview URL
  const locale = user.preferred_language || 'en';

  res.json({
    user: {
      id: user.id,
      username: user.username,
      friendly_name: user.friendly_name,
      email: user.email,
    },
    stats,
    token: token?.token || null,
    previewUrl: token ? `${process.env.APP_URL}/wrapped/${token.token}?lang=${locale}` : null,
  });
}));

/**
 * POST /api/admin/generate
 * Trigger wrapped generation
 */
router.post('/generate', asyncHandler(async (req, res) => {
  const { year, userIds } = req.body;
  const targetYear = year || parseInt(process.env.TARGET_YEAR || '2025', 10);

  logger.info(`Starting wrapped generation for year ${targetYear}`);

  // Create generation record
  const generation = await WrappedGenerationModel.create({
    year: targetYear,
    triggered_by: req.user?.username || 'admin',
    config: { userIds },
  });

  // Start generation process (async)
  generateWrappedStats(generation.id, targetYear, userIds).catch((error) => {
    logger.error('Generation failed:', error);
  });

  res.json({
    success: true,
    message: 'Generation started',
    generation,
  });
}));

/**
 * Background job to generate wrapped stats
 */
async function generateWrappedStats(generationId: number, year: number, userIds?: number[]) {
  try {
    await WrappedGenerationModel.update(generationId, {
      status: 'processing',
      started_at: new Date(),
    });

    // Get users to process
    let users = userIds
      ? await Promise.all(userIds.map(id => UserModel.findById(id)))
      : await UserModel.findAll();

    users = users.filter(u => u !== null) as any[];

    await WrappedGenerationModel.update(generationId, {
      total_users: users.length,
    });

    const calculator = new StatsCalculator();
    let successful = 0;
    let failed = 0;

    // Process each user
    for (const user of users) {
      try {
        logger.info(`Processing user ${user.id} (${user.username})`);
        const startTime = Date.now();

        // Calculate stats
        const stats = await calculator.calculateUserStats(user.plex_user_id, year);
        const processingTime = Math.round((Date.now() - startTime) / 1000);

        // Save stats
        const savedStats = await UserWrappedStatsModel.create({
          user_id: user.id,
          generation_id: generationId,
          year,
          stats,
          processing_time_seconds: processingTime,
        });

        // Generate access token
        await AccessTokenModel.create({
          user_wrapped_stats_id: savedStats.id,
          user_id: user.id,
          year,
          created_by: 'generation',
        });

        successful++;
        await WrappedGenerationModel.incrementProcessed(generationId, true);

        logger.info(`Successfully processed user ${user.id}`);
      } catch (error: any) {
        logger.error(`Failed to process user ${user.id}:`, error);
        failed++;
        await WrappedGenerationModel.incrementProcessed(generationId, false);
      }
    }

    // Mark as completed
    await WrappedGenerationModel.update(generationId, {
      status: 'completed',
      completed_at: new Date(),
      successful_users: successful,
      failed_users: failed,
    });

    logger.info(`Generation ${generationId} completed: ${successful} successful, ${failed} failed`);
  } catch (error: any) {
    logger.error(`Generation ${generationId} failed:`, error);
    await WrappedGenerationModel.update(generationId, {
      status: 'failed',
      completed_at: new Date(),
      error_log: error.message,
    });
  }
}

/**
 * GET /api/admin/generations
 * List all generations
 */
router.get('/generations', asyncHandler(async (req, res) => {
  const limit = parseInt(req.query.limit as string, 10) || 50;
  const generations = await WrappedGenerationModel.findAll(limit);

  res.json(generations);
}));

/**
 * GET /api/admin/generations/:id
 * Get specific generation with status
 */
router.get('/generations/:id', asyncHandler(async (req, res) => {
  const generationId = parseInt(req.params.id, 10);
  const generation = await WrappedGenerationModel.findById(generationId);

  if (!generation) {
    throw createError('Generation not found', 404);
  }

  const stats = await UserWrappedStatsModel.findByGeneration(generationId);

  res.json({
    generation,
    stats: {
      total: stats.length,
      list: stats,
    },
  });
}));

/**
 * POST /api/admin/emails/send
 * Send emails to users
 */
router.post('/emails/send', asyncHandler(async (req, res) => {
  const { generationId, userIds, testMode } = req.body;
  const isTestMode = testMode !== undefined ? testMode : process.env.TEST_MODE === 'true';

  if (isTestMode) {
    logger.info('TEST_MODE is enabled - emails will NOT be sent');
    return res.json({
      success: true,
      message: 'TEST_MODE enabled - no emails sent',
      testMode: true,
    });
  }

  logger.info(`Starting email send process for generation ${generationId}`);

  // Get generation
  const generation = await WrappedGenerationModel.findById(generationId);
  if (!generation) {
    throw createError('Generation not found', 404);
  }

  // Get stats for generation
  let stats = await UserWrappedStatsModel.findByGeneration(generationId);

  // Filter by userIds if provided
  if (userIds && userIds.length > 0) {
    stats = stats.filter(s => userIds.includes(s.user_id));
  }

  // Start sending emails (async)
  sendEmails(stats, generation.id).catch((error) => {
    logger.error('Email sending failed:', error);
  });

  res.json({
    success: true,
    message: `Started sending emails to ${stats.length} users`,
    count: stats.length,
  });
}));

/**
 * Background job to send emails
 */
async function sendEmails(statsList: any[], generationId: number) {
  // Create SMTP transporter
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
  });

  const rateLimit = parseInt(process.env.EMAIL_RATE_LIMIT || '10', 10);
  const delayMs = (60 * 1000) / rateLimit; // Delay between emails

  for (const stats of statsList) {
    try {
      const user = await UserModel.findById(stats.user_id);
      if (!user || !user.email) {
        logger.warn(`User ${stats.user_id} has no email, skipping`);
        continue;
      }

      // Get token
      const tokenRecord = await AccessTokenModel.findByWrappedStatsId(stats.id);
      if (!tokenRecord) {
        logger.error(`No token found for stats ${stats.id}`);
        continue;
      }

      // Get user's preferred language (defaults to 'en' if not set)
      const locale = user.preferred_language || 'en';

      // Build wrapped URL with language parameter
      const wrappedUrl = `${process.env.APP_URL}/wrapped/${tokenRecord.token}?lang=${locale}`;

      // Generate subject with i18n
      const { i18n } = require('../services/i18n.service');
      const emailSubject = i18n.t('email.subject', locale, { year: stats.year });

      // Create email log
      const emailLog = await EmailLogModel.create({
        user_id: user.id,
        generation_id: generationId,
        email_to: user.email,
        email_subject: emailSubject,
      });

      // Send email
      const info = await transporter.sendMail({
        from: `"${process.env.SMTP_FROM_NAME}" <${process.env.SMTP_FROM_EMAIL}>`,
        to: user.email,
        subject: emailSubject,
        html: generateEmailHTML(user, stats, wrappedUrl, locale),
        text: generateEmailText(user, stats, wrappedUrl, locale),
      });

      // Mark as sent
      await EmailLogModel.markSent(emailLog.id, info.messageId, info.response);
      logger.info(`Email sent to ${user.email}`);

      // Rate limiting delay
      await new Promise(resolve => setTimeout(resolve, delayMs));
    } catch (error: any) {
      logger.error(`Failed to send email:`, error);
    }
  }

  logger.info('Email sending completed');
}

/**
 * Generate email HTML
 */
function generateEmailHTML(user: any, stats: any, url: string, locale: string = 'en'): string {
  const hours = Math.floor(stats.total_watch_time_minutes / 60);
  const { i18n } = require('../services/i18n.service');
  const t = (key: string, params?: any) => i18n.t(key, locale, params);

  const name = user.friendly_name || user.username;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #e5a00d 0%, #cc8900 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f7f7f7; padding: 30px; }
        .stats { background: white; padding: 20px; margin: 20px 0; border-radius: 5px; }
        .button { display: inline-block; background: #e5a00d; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>${t('email.title', { year: stats.year })}</h1>
          <p>${t('email.greeting', { name })}</p>
        </div>
        <div class="content">
          <p>${t('email.intro')}</p>

          <div class="stats">
            <h2>${t('email.quickPeek.title')}</h2>
            <ul>
              <li><strong>${t('email.quickPeek.hoursWatched', { hours })}</strong></li>
              <li><strong>${t('email.quickPeek.totalPlays', { plays: stats.total_plays })}</strong></li>
              <li><strong>${t('email.quickPeek.daysActive', { days: stats.days_active })}</strong></li>
            </ul>
          </div>

          <p>${t('email.description')}</p>

          <center>
            <a href="${url}" class="button">${t('email.button', { year: stats.year })}</a>
          </center>

          <p style="color: #666; font-size: 14px;">${t('email.linkExpiry')}</p>
        </div>
        <div class="footer">
          <p>${t('email.footer.generated')}</p>
          <p>${t('email.footer.ignore')}</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Generate email text (plain text fallback)
 */
function generateEmailText(user: any, stats: any, url: string, locale: string = 'en'): string {
  const hours = Math.floor(stats.total_watch_time_minutes / 60);
  const { i18n } = require('../services/i18n.service');
  const t = (key: string, params?: any) => i18n.t(key, locale, params);

  const name = user.friendly_name || user.username;

  return `
${t('email.plainText.title', { year: stats.year })}

${t('email.greeting', { name })}

${t('email.intro')}

${t('email.plainText.quickPeek')}
${t('email.plainText.hoursWatched', { hours })}
${t('email.plainText.totalPlays', { plays: stats.total_plays })}
${t('email.plainText.daysActive', { days: stats.days_active })}

${t('email.plainText.viewHere')}
${url}

${t('email.linkExpiry')}

${t('email.plainText.separator')}
${t('email.plainText.generated')}
${t('email.footer.ignore')}
  `.trim();
}

/**
 * GET /api/admin/emails
 * List email logs
 */
router.get('/emails', asyncHandler(async (req, res) => {
  const limit = parseInt(req.query.limit as string, 10) || 100;
  const logs = await EmailLogModel.findAll(limit);

  res.json(logs);
}));

/**
 * GET /api/admin/emails/:generationId
 * Get emails for specific generation
 */
router.get('/emails/:generationId', asyncHandler(async (req, res) => {
  const generationId = parseInt(req.params.generationId, 10);
  const logs = await EmailLogModel.findByGeneration(generationId);
  const stats = await EmailLogModel.getStatsByGeneration(generationId);

  res.json({
    logs,
    stats,
  });
}));

/**
 * GET /api/admin/logs/email
 * Get email logs with optional filtering
 */
router.get('/logs/email', asyncHandler(async (req, res) => {
  const limit = parseInt(req.query.limit as string, 10) || 100;
  const status = req.query.status as string;

  let logs;
  if (status) {
    logs = await db.manyOrNone(
      'SELECT * FROM email_logs WHERE status = $1 ORDER BY created_at DESC LIMIT $2',
      [status, limit]
    );
  } else {
    logs = await EmailLogModel.findAll(limit);
  }

  res.json(logs);
}));

/**
 * GET /api/admin/logs/application
 * Get application logs from log files
 */
router.get('/logs/application', asyncHandler(async (req, res) => {
  const fs = require('fs').promises;
  const path = require('path');
  const logDir = process.env.LOG_FILE_PATH || '/app/logs';
  const limit = parseInt(req.query.limit as string, 10) || 100;
  const level = req.query.level as string; // error, warn, info, etc.

  try {
    // Get today's log file
    const today = new Date().toISOString().split('T')[0];
    const logFile = path.join(logDir, `combined-${today}.log`);

    // Read the log file
    const fileContent = await fs.readFile(logFile, 'utf-8');
    const lines = fileContent.trim().split('\n').filter(line => line.length > 0);

    // Parse JSON logs and filter
    let logs = lines
      .map(line => {
        try {
          return JSON.parse(line);
        } catch {
          return null;
        }
      })
      .filter(log => log !== null);

    // Filter by level if specified
    if (level) {
      logs = logs.filter(log => log.level === level);
    }

    // Return most recent logs
    logs = logs.reverse().slice(0, limit);

    res.json({
      logs,
      file: `combined-${today}.log`,
      total: lines.length,
    });
  } catch (error: any) {
    logger.error('Failed to read application logs:', error);
    res.json({
      logs: [],
      error: 'Failed to read log file',
      message: error.message,
    });
  }
}));

/**
 * GET /api/admin/logs/files
 * List available log files
 */
router.get('/logs/files', asyncHandler(async (req, res) => {
  const fs = require('fs').promises;
  const path = require('path');
  const logDir = process.env.LOG_FILE_PATH || '/app/logs';

  try {
    const files = await fs.readdir(logDir);
    const logFiles = files.filter(f => f.endsWith('.log'));

    const fileStats = await Promise.all(
      logFiles.map(async (file) => {
        const filePath = path.join(logDir, file);
        const stats = await fs.stat(filePath);
        return {
          name: file,
          size: stats.size,
          modified: stats.mtime,
        };
      })
    );

    // Sort by modified date, newest first
    fileStats.sort((a, b) => new Date(b.modified).getTime() - new Date(a.modified).getTime());

    res.json(fileStats);
  } catch (error: any) {
    logger.error('Failed to list log files:', error);
    res.json([]);
  }
}));

export default router;
