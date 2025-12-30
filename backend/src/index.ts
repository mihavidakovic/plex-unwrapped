import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import dotenv from 'dotenv';
import logger from './utils/logger';
import { testConnection, closeDatabase } from './config/database';
import { createRedisClient, closeRedis } from './config/redis';
import { errorHandler, notFoundHandler } from './middleware/error.middleware';
import { skipHealthCheck } from './middleware/request-logger.middleware';

// Import routes
import healthRoutes from './routes/health.routes';
import wrappedRoutes from './routes/wrapped.routes';
import adminRoutes from './routes/admin.routes';

// Load environment variables
dotenv.config();

// Create Express app
const app: Application = express();
const PORT = process.env.APP_PORT || 3001;

// Trust proxy (important for rate limiting and IP detection)
app.set('trust proxy', 1);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false, // Disable for API
  crossOriginEmbedderPolicy: false,
}));

// CORS configuration
const corsOrigins = process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'];
app.use(cors({
  origin: corsOrigins,
  credentials: true,
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Compression
app.use(compression());

// Request logging (skip health checks)
app.use(skipHealthCheck);

// Mount routes
app.use('/api/health', healthRoutes);
app.use('/api/wrapped', wrappedRoutes);
app.use('/api/admin', adminRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'Unwrapped for Plex API',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      health: '/api/health',
      wrapped: '/api/wrapped/:token',
      admin: '/api/admin',
    },
    docs: 'https://github.com/yourusername/unwrapped-for-plex',
  });
});

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

// Initialize services and start server
async function startServer() {
  try {
    logger.info('Starting Unwrapped for Plex Backend...');

    // Test database connection
    logger.info('Connecting to database...');
    const dbConnected = await testConnection();
    if (!dbConnected) {
      throw new Error('Failed to connect to database');
    }

    // Initialize Redis
    logger.info('Connecting to Redis...');
    await createRedisClient();

    // Test external services (optional, won't fail startup)
    try {
      const { getTautulliService } = await import('./services/tautulli.service');
      const tautulli = getTautulliService();
      const tautulliHealth = await tautulli.healthCheck();
      if (tautulliHealth.healthy) {
        logger.info(`Tautulli connected: ${tautulliHealth.message}`);
      } else {
        logger.warn(`Tautulli connection issue: ${tautulliHealth.message}`);
      }
    } catch (error: any) {
      logger.warn('Tautulli connection failed:', error.message);
    }

    try {
      const { getOverseerrService } = await import('./services/overseerr.service');
      const overseerr = getOverseerrService();
      if (overseerr.isEnabled()) {
        const overseerrHealth = await overseerr.healthCheck();
        if (overseerrHealth.healthy) {
          logger.info(`Overseerr connected: ${overseerrHealth.message}`);
        } else {
          logger.warn(`Overseerr connection issue: ${overseerrHealth.message}`);
        }
      } else {
        logger.info('Overseerr integration is disabled');
      }
    } catch (error: any) {
      logger.warn('Overseerr connection check failed:', error.message);
    }

    // Start Express server
    const server = app.listen(PORT, () => {
      logger.info(`🚀 Server started on port ${PORT}`);
      logger.info(`   Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`   Health check: http://localhost:${PORT}/api/health`);
      logger.info(`   Test mode: ${process.env.TEST_MODE === 'true' ? 'ENABLED' : 'disabled'}`);
    });

    // Graceful shutdown
    const gracefulShutdown = async (signal: string) => {
      logger.info(`${signal} received, starting graceful shutdown...`);

      server.close(async () => {
        logger.info('HTTP server closed');

        try {
          await closeDatabase();
          await closeRedis();
          logger.info('All connections closed');
          process.exit(0);
        } catch (error: any) {
          logger.error('Error during shutdown:', error);
          process.exit(1);
        }
      });

      // Force close after 10 seconds
      setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
      }, 10000);
    };

    // Handle shutdown signals
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // Handle uncaught errors
    process.on('uncaughtException', (error: Error) => {
      logger.error('Uncaught Exception:', error);
      gracefulShutdown('uncaughtException');
    });

    process.on('unhandledRejection', (reason: any) => {
      logger.error('Unhandled Rejection:', reason);
      gracefulShutdown('unhandledRejection');
    });

  } catch (error: any) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
startServer();

export default app;
