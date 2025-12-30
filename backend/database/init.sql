-- =============================================================================
-- Unwrapped for Plex Database Schema
-- PostgreSQL 16+
-- =============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Set timezone
SET timezone = 'UTC';

-- =============================================================================
-- Users Table
-- Stores Plex users synced from Tautulli
-- =============================================================================
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    plex_user_id INTEGER UNIQUE NOT NULL,
    username VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    friendly_name VARCHAR(255),
    thumb VARCHAR(500),
    is_admin BOOLEAN DEFAULT false,
    is_home_user BOOLEAN DEFAULT true,
    is_allow_sync BOOLEAN DEFAULT false,
    is_restricted BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_seen TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_users_plex_id ON users(plex_user_id);
CREATE INDEX idx_users_email ON users(email) WHERE email IS NOT NULL;
CREATE INDEX idx_users_username ON users(username);

-- =============================================================================
-- Wrapped Generations Table
-- Tracks each wrapped generation run
-- =============================================================================
CREATE TABLE wrapped_generations (
    id SERIAL PRIMARY KEY,
    year INTEGER NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    -- Status: pending, processing, completed, failed, cancelled
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    total_users INTEGER DEFAULT 0,
    processed_users INTEGER DEFAULT 0,
    successful_users INTEGER DEFAULT 0,
    failed_users INTEGER DEFAULT 0,
    error_log TEXT,
    triggered_by VARCHAR(255),
    config JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled'))
);

CREATE INDEX idx_wrapped_generations_year ON wrapped_generations(year);
CREATE INDEX idx_wrapped_generations_status ON wrapped_generations(status);
CREATE INDEX idx_wrapped_generations_created ON wrapped_generations(created_at DESC);

-- =============================================================================
-- User Wrapped Stats Table
-- Stores processed statistics for each user per year
-- =============================================================================
CREATE TABLE user_wrapped_stats (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    generation_id INTEGER REFERENCES wrapped_generations(id) ON DELETE SET NULL,
    year INTEGER NOT NULL,

    -- Overall stats
    total_watch_time_minutes INTEGER DEFAULT 0,
    total_plays INTEGER DEFAULT 0,
    total_movies INTEGER DEFAULT 0,
    total_tv_episodes INTEGER DEFAULT 0,
    unique_movies INTEGER DEFAULT 0,
    unique_shows INTEGER DEFAULT 0,
    days_active INTEGER DEFAULT 0,

    -- Viewing patterns
    most_active_month VARCHAR(20),
    most_active_day_of_week VARCHAR(20),
    most_active_hour INTEGER,
    longest_streak_days INTEGER DEFAULT 0,
    longest_binge_minutes INTEGER DEFAULT 0,
    longest_binge_show VARCHAR(255),

    -- Top content (stored as JSONB for flexibility)
    top_movies JSONB DEFAULT '[]'::jsonb,
    -- [{"title", "year", "plays", "duration_minutes", "thumb", "rating_key"}]

    top_shows JSONB DEFAULT '[]'::jsonb,
    -- [{"title", "plays", "episodes", "duration_minutes", "thumb", "rating_key", "seasons_completed"}]

    top_episodes JSONB DEFAULT '[]'::jsonb,
    -- [{"title", "show", "season", "episode", "plays", "thumb"}]

    top_genres JSONB DEFAULT '[]'::jsonb,
    -- [{"genre", "count", "minutes", "percentage"}]

    top_actors JSONB DEFAULT '[]'::jsonb,
    -- [{"name", "count", "titles": []}]

    top_directors JSONB DEFAULT '[]'::jsonb,
    -- [{"name", "count", "titles": []}]

    -- Device and platform stats
    top_devices JSONB DEFAULT '[]'::jsonb,
    -- [{"device", "platform", "plays", "minutes"}]

    top_platforms JSONB DEFAULT '[]'::jsonb,
    -- [{"platform", "plays", "minutes"}]

    -- Quality stats
    quality_stats JSONB DEFAULT '{}'::jsonb,
    -- {"sd": minutes, "hd": minutes, "4k": minutes}

    -- Monthly breakdown
    monthly_stats JSONB DEFAULT '[]'::jsonb,
    -- [{"month": "January", "plays": 100, "minutes": 5000}]

    -- Sharing stats (if applicable)
    content_shared_with INTEGER DEFAULT 0,

    -- Fun stats and achievements
    percentage_of_library_watched DECIMAL(5,2) DEFAULT 0,
    total_seasons_completed INTEGER DEFAULT 0,
    rewatches INTEGER DEFAULT 0,
    first_watch_title VARCHAR(255),
    first_watch_date TIMESTAMP WITH TIME ZONE,
    last_watch_title VARCHAR(255),
    last_watch_date TIMESTAMP WITH TIME ZONE,
    most_memorable_day_date DATE,
    most_memorable_day_minutes INTEGER,

    -- Fun facts and badges
    fun_facts JSONB DEFAULT '[]'::jsonb,
    -- ["Marathon Master", "Night Owl", "Completionist", etc.]

    badges JSONB DEFAULT '[]'::jsonb,
    -- [{"name": "Marathon Master", "description": "...", "icon": "..."}]

    -- Raw data cache (for future reprocessing if needed)
    raw_data JSONB,

    -- Metadata
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_public BOOLEAN DEFAULT false,
    processing_time_seconds INTEGER,

    -- Constraints
    UNIQUE(user_id, year),
    CHECK (year >= 2000 AND year <= 2100),
    CHECK (total_watch_time_minutes >= 0),
    CHECK (percentage_of_library_watched >= 0 AND percentage_of_library_watched <= 100)
);

CREATE INDEX idx_user_wrapped_stats_user ON user_wrapped_stats(user_id);
CREATE INDEX idx_user_wrapped_stats_year ON user_wrapped_stats(year);
CREATE INDEX idx_user_wrapped_stats_user_year ON user_wrapped_stats(user_id, year);
CREATE INDEX idx_user_wrapped_stats_generation ON user_wrapped_stats(generation_id);
CREATE INDEX idx_user_wrapped_stats_public ON user_wrapped_stats(is_public) WHERE is_public = true;

-- =============================================================================
-- Access Tokens Table
-- Secure tokens for sharing wrapped stats
-- =============================================================================
CREATE TABLE access_tokens (
    id SERIAL PRIMARY KEY,
    token VARCHAR(128) UNIQUE NOT NULL,
    token_hash VARCHAR(64) UNIQUE NOT NULL,
    -- Store hash of token for security

    user_wrapped_stats_id INTEGER NOT NULL REFERENCES user_wrapped_stats(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    year INTEGER NOT NULL,

    -- Token management
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE,
    last_accessed_at TIMESTAMP WITH TIME ZONE,
    access_count INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,

    -- Security tracking
    ip_addresses JSONB DEFAULT '[]'::jsonb,
    -- [{"ip", "timestamp", "user_agent"}]

    user_agents JSONB DEFAULT '[]'::jsonb,
    -- [{"user_agent", "count"}]

    -- Metadata
    created_by VARCHAR(50) DEFAULT 'system',
    revoked_at TIMESTAMP WITH TIME ZONE,
    revoked_by VARCHAR(255),
    revoked_reason TEXT,

    CHECK (access_count >= 0)
);

CREATE INDEX idx_access_tokens_token ON access_tokens(token) WHERE is_active = true;
CREATE INDEX idx_access_tokens_token_hash ON access_tokens(token_hash);
CREATE INDEX idx_access_tokens_user_year ON access_tokens(user_id, year);
CREATE INDEX idx_access_tokens_user_stats ON access_tokens(user_wrapped_stats_id);
CREATE INDEX idx_access_tokens_expires ON access_tokens(expires_at) WHERE expires_at IS NOT NULL;

-- =============================================================================
-- Email Logs Table
-- Track sent emails for audit and delivery monitoring
-- =============================================================================
CREATE TABLE email_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    generation_id INTEGER REFERENCES wrapped_generations(id) ON DELETE SET NULL,
    email_to VARCHAR(255) NOT NULL,
    email_subject VARCHAR(500),
    email_body TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    -- Status: pending, sent, failed, bounced, opened, clicked
    error_message TEXT,
    sent_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    opened_at TIMESTAMP WITH TIME ZONE,
    clicked_at TIMESTAMP WITH TIME ZONE,
    bounced_at TIMESTAMP WITH TIME ZONE,

    -- Email metadata
    message_id VARCHAR(255),
    smtp_response TEXT,

    -- Tracking
    open_count INTEGER DEFAULT 0,
    click_count INTEGER DEFAULT 0,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CHECK (status IN ('pending', 'sent', 'failed', 'bounced', 'opened', 'clicked'))
);

CREATE INDEX idx_email_logs_user ON email_logs(user_id);
CREATE INDEX idx_email_logs_generation ON email_logs(generation_id);
CREATE INDEX idx_email_logs_status ON email_logs(status);
CREATE INDEX idx_email_logs_email ON email_logs(email_to);
CREATE INDEX idx_email_logs_sent ON email_logs(sent_at DESC);

-- =============================================================================
-- Admin Users Table
-- Separate admin authentication (not Plex users)
-- =============================================================================
CREATE TABLE admin_users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    full_name VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    is_super_admin BOOLEAN DEFAULT false,
    last_login_at TIMESTAMP WITH TIME ZONE,
    last_login_ip VARCHAR(45),
    failed_login_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(255),

    CHECK (failed_login_attempts >= 0)
);

CREATE INDEX idx_admin_users_username ON admin_users(username);
CREATE INDEX idx_admin_users_active ON admin_users(is_active) WHERE is_active = true;

-- =============================================================================
-- System Configuration Table
-- Key-value store for system settings
-- =============================================================================
CREATE TABLE system_config (
    key VARCHAR(255) PRIMARY KEY,
    value TEXT,
    value_type VARCHAR(50) DEFAULT 'string',
    -- Types: string, number, boolean, json
    description TEXT,
    is_public BOOLEAN DEFAULT false,
    is_editable BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_by VARCHAR(255),

    CHECK (value_type IN ('string', 'number', 'boolean', 'json'))
);

CREATE INDEX idx_system_config_public ON system_config(is_public) WHERE is_public = true;

-- =============================================================================
-- Audit Log Table
-- Track important system events and changes
-- =============================================================================
CREATE TABLE audit_log (
    id SERIAL PRIMARY KEY,
    event_type VARCHAR(100) NOT NULL,
    -- Types: user_created, stats_generated, email_sent, admin_login, config_changed, etc.

    entity_type VARCHAR(100),
    -- Types: user, wrapped_stats, generation, email, admin, config

    entity_id INTEGER,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    admin_id INTEGER REFERENCES admin_users(id) ON DELETE SET NULL,

    action VARCHAR(50) NOT NULL,
    -- Actions: create, read, update, delete, login, logout, generate, send

    details JSONB,
    ip_address VARCHAR(45),
    user_agent TEXT,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CHECK (action IN ('create', 'read', 'update', 'delete', 'login', 'logout', 'generate', 'send', 'other'))
);

CREATE INDEX idx_audit_log_event_type ON audit_log(event_type);
CREATE INDEX idx_audit_log_entity ON audit_log(entity_type, entity_id);
CREATE INDEX idx_audit_log_user ON audit_log(user_id);
CREATE INDEX idx_audit_log_admin ON audit_log(admin_id);
CREATE INDEX idx_audit_log_created ON audit_log(created_at DESC);

-- =============================================================================
-- Functions and Triggers
-- =============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at trigger to relevant tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_wrapped_generations_updated_at BEFORE UPDATE ON wrapped_generations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_email_logs_updated_at BEFORE UPDATE ON email_logs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_admin_users_updated_at BEFORE UPDATE ON admin_users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_system_config_updated_at BEFORE UPDATE ON system_config
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- Initial Data
-- =============================================================================

-- Insert default system configuration
INSERT INTO system_config (key, value, value_type, description, is_public, is_editable) VALUES
    ('app_name', 'Unwrapped for Plex', 'string', 'Application name', true, true),
    ('app_version', '1.0.0', 'string', 'Application version', true, false),
    ('target_year', '2025', 'number', 'Target year for wrapped generation', true, true),
    ('enable_public_stats', 'true', 'boolean', 'Allow public viewing of stats', true, true),
    ('enable_share_images', 'true', 'boolean', 'Enable social share image generation', true, true),
    ('enable_email_tracking', 'false', 'boolean', 'Enable email open/click tracking', false, true),
    ('maintenance_mode', 'false', 'boolean', 'Enable maintenance mode', false, true),
    ('max_generations_per_day', '10', 'number', 'Maximum generations allowed per day', false, true),
    ('token_expiration_days', '90', 'number', 'Token expiration in days (0 = never)', false, true)
ON CONFLICT (key) DO NOTHING;

-- =============================================================================
-- Views
-- =============================================================================

-- View for active wrapped stats with user info
CREATE OR REPLACE VIEW v_active_wrapped_stats AS
SELECT
    uws.id,
    uws.year,
    u.username,
    u.email,
    u.friendly_name,
    uws.total_watch_time_minutes,
    uws.total_plays,
    uws.days_active,
    uws.generated_at,
    uws.is_public,
    COUNT(at.id) as token_count
FROM user_wrapped_stats uws
JOIN users u ON uws.user_id = u.id
LEFT JOIN access_tokens at ON uws.id = at.user_wrapped_stats_id AND at.is_active = true
GROUP BY uws.id, u.username, u.email, u.friendly_name;

-- View for generation statistics
CREATE OR REPLACE VIEW v_generation_stats AS
SELECT
    wg.id,
    wg.year,
    wg.status,
    wg.started_at,
    wg.completed_at,
    wg.total_users,
    wg.successful_users,
    wg.failed_users,
    EXTRACT(EPOCH FROM (wg.completed_at - wg.started_at)) as duration_seconds,
    COUNT(el.id) as emails_sent
FROM wrapped_generations wg
LEFT JOIN email_logs el ON wg.id = el.generation_id
GROUP BY wg.id;

-- =============================================================================
-- Permissions
-- =============================================================================

-- Revoke public access
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM PUBLIC;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM PUBLIC;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC;

-- Grant necessary permissions to the application user
-- Note: The application user is created by the POSTGRES_USER env variable

COMMENT ON DATABASE plexunwrapped IS 'Unwrapped for Plex - Year in Review Statistics for Plex Users';

-- =============================================================================
-- End of Schema
-- =============================================================================
