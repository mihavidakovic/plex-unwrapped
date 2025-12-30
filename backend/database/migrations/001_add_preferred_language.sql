-- Migration: Add preferred_language column to users table
-- Date: 2025-12-30
-- Description: Add language preference support for i18n

-- Add preferred_language column to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS preferred_language VARCHAR(10) DEFAULT 'en';

-- Add comment
COMMENT ON COLUMN users.preferred_language IS 'Language preference for wrapped page and emails (en, es, fr, de, sl)';

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_users_preferred_language ON users(preferred_language);

-- Update existing users to have English as default (if null somehow)
UPDATE users SET preferred_language = 'en' WHERE preferred_language IS NULL;
