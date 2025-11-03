-- Add email change columns to users table
-- Migration: add_email_change_columns.sql

-- Add columns for email change functionality
ALTER TABLE users ADD COLUMN IF NOT EXISTS pending_email VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_change_token VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_change_requested_at TIMESTAMP;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_pending_email ON users(pending_email);
CREATE INDEX IF NOT EXISTS idx_users_email_change_token ON users(email_change_token);
CREATE INDEX IF NOT EXISTS idx_users_email_change_requested_at ON users(email_change_requested_at);

-- Add comments for documentation
COMMENT ON COLUMN users.pending_email IS 'Email address pending verification during email change process';
COMMENT ON COLUMN users.email_change_token IS 'Verification token for email change process';
COMMENT ON COLUMN users.email_change_requested_at IS 'Timestamp when email change was requested';
