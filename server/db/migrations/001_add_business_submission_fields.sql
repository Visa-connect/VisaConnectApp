-- Migration to add missing business fields for business submission form
-- This migration adds fields needed for the AddBusinessScreen form

-- Add new columns to businesses table
ALTER TABLE businesses 
ADD COLUMN IF NOT EXISTS year_formed INTEGER,
ADD COLUMN IF NOT EXISTS owner_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS mission_statement TEXT,
ADD COLUMN IF NOT EXISTS logo_url VARCHAR(500),
ADD COLUMN IF NOT EXISTS logo_public_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
ADD COLUMN IF NOT EXISTS admin_notes TEXT,
ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMP DEFAULT NOW();

-- Add indexes for new fields
CREATE INDEX IF NOT EXISTS idx_businesses_year_formed ON businesses(year_formed);
CREATE INDEX IF NOT EXISTS idx_businesses_owner_name ON businesses(owner_name);
CREATE INDEX IF NOT EXISTS idx_businesses_status ON businesses(status);
CREATE INDEX IF NOT EXISTS idx_businesses_submitted_at ON businesses(submitted_at);
CREATE INDEX IF NOT EXISTS idx_businesses_logo_url ON businesses(logo_url);
CREATE INDEX IF NOT EXISTS idx_businesses_logo_public_id ON businesses(logo_public_id);

-- Add comments for new fields
COMMENT ON COLUMN businesses.year_formed IS 'Year the business was formed';
COMMENT ON COLUMN businesses.owner_name IS 'Name of the business owner';
COMMENT ON COLUMN businesses.mission_statement IS 'Business mission statement';
COMMENT ON COLUMN businesses.logo_url IS 'URL to the business logo';
COMMENT ON COLUMN businesses.logo_public_id IS 'Cloudinary public ID for logo deletion';
COMMENT ON COLUMN businesses.status IS 'Business verification status: pending, approved, rejected';
COMMENT ON COLUMN businesses.admin_notes IS 'Admin notes for business verification';
COMMENT ON COLUMN businesses.submitted_at IS 'When the business was submitted for verification';
