-- Add resume column to users table
-- This allows users to upload and store a resume in their profile
-- instead of uploading a fresh resume for each job application

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS resume_url TEXT,
ADD COLUMN IF NOT EXISTS resume_filename VARCHAR(255),
ADD COLUMN IF NOT EXISTS resume_public_id VARCHAR(255);

-- Add comments for documentation
COMMENT ON COLUMN users.resume_url IS 'URL to the uploaded resume file';
COMMENT ON COLUMN users.resume_filename IS 'Original filename of the uploaded resume';
COMMENT ON COLUMN users.resume_public_id IS 'Public ID for the resume file in storage service';
