-- Add admin column to users table
-- This allows certain users to have admin privileges for business management

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS admin BOOLEAN DEFAULT FALSE;

-- Create index for admin queries
CREATE INDEX IF NOT EXISTS idx_users_admin ON users(admin);

-- Add comment for documentation
COMMENT ON COLUMN users.admin IS 'Indicates if user has admin privileges for business management';
