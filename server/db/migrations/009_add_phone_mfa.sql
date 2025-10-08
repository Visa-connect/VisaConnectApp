-- Migration: Add phone-based MFA support to users table
-- This migration adds phone number fields for multi-factor authentication
-- while preserving existing email/password authentication

-- Add phone number column (E.164 format, e.g., +14155552671)
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS phone_number VARCHAR(20) UNIQUE;

-- Add phone verification status
ALTER TABLE users
ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN DEFAULT FALSE;

-- Add MFA enrollment status (whether user has enabled MFA)
ALTER TABLE users
ADD COLUMN IF NOT EXISTS mfa_enabled BOOLEAN DEFAULT FALSE;

-- Add timestamp for when phone was verified
ALTER TABLE users
ADD COLUMN IF NOT EXISTS phone_verified_at TIMESTAMP WITH TIME ZONE;

-- Create index on phone_number for fast lookups
CREATE INDEX IF NOT EXISTS idx_users_phone_number ON users(phone_number) WHERE phone_number IS NOT NULL;

-- Create index on phone_verified for filtering
CREATE INDEX IF NOT EXISTS idx_users_phone_verified ON users(phone_verified);

-- Create index on mfa_enabled for filtering
CREATE INDEX IF NOT EXISTS idx_users_mfa_enabled ON users(mfa_enabled);

-- Add comments for documentation
COMMENT ON COLUMN users.phone_number IS 'User phone number in E.164 format (e.g., +14155552671)';
COMMENT ON COLUMN users.phone_verified IS 'Whether the phone number has been verified via SMS';
COMMENT ON COLUMN users.mfa_enabled IS 'Whether user has enrolled in phone-based MFA';
COMMENT ON COLUMN users.phone_verified_at IS 'Timestamp when phone number was verified';

-- Note: Email/password authentication remains functional
-- Users can optionally add phone MFA for additional security

