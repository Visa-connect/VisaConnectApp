-- Add stay_in_us column to users table
-- Migration: add_stay_in_us_column.sql
-- This column tracks whether the user plans to stay in the U.S. long-term or return to their country

-- Add column for stay_in_us (boolean: true = yes, false = no)
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS stay_in_us BOOLEAN;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_users_stay_in_us ON users(stay_in_us);

-- Add comment for documentation
COMMENT ON COLUMN users.stay_in_us IS 'Whether the user plans to stay in the U.S. long-term (true) or return to their country (false)';

