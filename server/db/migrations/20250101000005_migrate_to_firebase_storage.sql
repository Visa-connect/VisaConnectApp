-- Migration: Migrate from Cloudinary to Firebase Storage
-- This migration updates the database schema to support Firebase Storage
-- and adds any missing fields for the new storage system

-- Add comments to existing photo fields to clarify they now store Firebase Storage data
COMMENT ON COLUMN users.profile_photo_url IS 'Firebase Storage URL for profile photo';
COMMENT ON COLUMN users.profile_photo_public_id IS 'Firebase Storage file name for profile photo deletion';

COMMENT ON COLUMN meetups.photo_url IS 'Firebase Storage URL for meetup photo';
COMMENT ON COLUMN meetups.photo_public_id IS 'Firebase Storage file name for meetup photo deletion';

COMMENT ON COLUMN tips_trips_advice_photos.photo_url IS 'Firebase Storage URL for tips photo';
COMMENT ON COLUMN tips_trips_advice_photos.photo_public_id IS 'Firebase Storage file name for tips photo deletion';

-- Add business logo fields to businesses table if they don't exist
DO $$ 
BEGIN
    -- Check if business_logo_url column exists, if not add it
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'businesses' 
        AND column_name = 'business_logo_url'
    ) THEN
        ALTER TABLE businesses ADD COLUMN business_logo_url VARCHAR(500);
        COMMENT ON COLUMN businesses.business_logo_url IS 'Firebase Storage URL for business logo';
    END IF;

    -- Check if business_logo_file_name column exists, if not add it
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'businesses' 
        AND column_name = 'business_logo_file_name'
    ) THEN
        ALTER TABLE businesses ADD COLUMN business_logo_file_name VARCHAR(255);
        COMMENT ON COLUMN businesses.business_logo_file_name IS 'Firebase Storage file name for business logo deletion';
    END IF;
END $$;

-- Create indexes for new business logo fields
CREATE INDEX IF NOT EXISTS idx_businesses_business_logo_url ON businesses(business_logo_url);
CREATE INDEX IF NOT EXISTS idx_businesses_business_logo_file_name ON businesses(business_logo_file_name);

-- Update job_applications table to use Firebase Storage terminology
-- The resume_url and resume_filename fields are already correct for Firebase Storage
COMMENT ON COLUMN job_applications.resume_url IS 'Firebase Storage URL for resume file';
COMMENT ON COLUMN job_applications.resume_filename IS 'Original filename of uploaded resume';

-- Add indexes for job application resume fields if they don't exist
CREATE INDEX IF NOT EXISTS idx_job_applications_resume_url ON job_applications(resume_url);
CREATE INDEX IF NOT EXISTS idx_job_applications_resume_filename ON job_applications(resume_filename);

-- Create a function to clean up old Cloudinary URLs (optional - for future cleanup)
CREATE OR REPLACE FUNCTION cleanup_old_cloudinary_urls()
RETURNS TABLE(
    table_name TEXT,
    column_name TEXT,
    old_url TEXT,
    new_url TEXT
) AS $$
BEGIN
    -- This function can be used to identify and clean up old Cloudinary URLs
    -- when migrating existing data to Firebase Storage
    -- For now, it's a placeholder for future cleanup operations
    
    RETURN QUERY
    SELECT 
        'users'::TEXT as table_name,
        'profile_photo_url'::TEXT as column_name,
        ''::TEXT as old_url,
        ''::TEXT as new_url
    WHERE FALSE; -- Return empty result for now
END;
$$ LANGUAGE plpgsql;

-- Add a view to help monitor Firebase Storage usage
CREATE OR REPLACE VIEW firebase_storage_usage AS
SELECT 
    'users' as table_name,
    'profile_photos' as file_type,
    COUNT(*) as total_files,
    COUNT(CASE WHEN profile_photo_url IS NOT NULL THEN 1 END) as files_with_urls,
    COUNT(CASE WHEN profile_photo_public_id IS NOT NULL THEN 1 END) as files_with_names
FROM users
UNION ALL
SELECT 
    'meetups' as table_name,
    'meetup_photos' as file_type,
    COUNT(*) as total_files,
    COUNT(CASE WHEN photo_url IS NOT NULL THEN 1 END) as files_with_urls,
    COUNT(CASE WHEN photo_public_id IS NOT NULL THEN 1 END) as files_with_names
FROM meetups
UNION ALL
SELECT 
    'businesses' as table_name,
    'business_logos' as file_type,
    COUNT(*) as total_files,
    COUNT(CASE WHEN business_logo_url IS NOT NULL THEN 1 END) as files_with_urls,
    COUNT(CASE WHEN business_logo_file_name IS NOT NULL THEN 1 END) as files_with_names
FROM businesses
UNION ALL
SELECT 
    'tips_trips_advice_photos' as table_name,
    'tips_photos' as file_type,
    COUNT(*) as total_files,
    COUNT(CASE WHEN photo_url IS NOT NULL THEN 1 END) as files_with_urls,
    COUNT(CASE WHEN photo_public_id IS NOT NULL THEN 1 END) as files_with_names
FROM tips_trips_advice_photos
UNION ALL
SELECT 
    'job_applications' as table_name,
    'resumes' as file_type,
    COUNT(*) as total_files,
    COUNT(CASE WHEN resume_url IS NOT NULL THEN 1 END) as files_with_urls,
    COUNT(CASE WHEN resume_filename IS NOT NULL THEN 1 END) as files_with_names
FROM job_applications;

-- Add comments to the view
COMMENT ON VIEW firebase_storage_usage IS 'View to monitor Firebase Storage usage across all tables';

-- Create a function to validate Firebase Storage URLs
CREATE OR REPLACE FUNCTION is_valid_firebase_storage_url(url TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    -- Check if URL is a valid Firebase Storage URL
    RETURN url ~ '^https://storage\.googleapis\.com/[^/]+/.*$' OR 
           url ~ '^https://firebasestorage\.googleapis\.com/v0/b/[^/]+/o/.*$';
END;
$$ LANGUAGE plpgsql;

-- Add comments to the function
COMMENT ON FUNCTION is_valid_firebase_storage_url(TEXT) IS 'Validates if a URL is a valid Firebase Storage URL';

-- Create a function to extract file name from Firebase Storage URL
CREATE OR REPLACE FUNCTION extract_firebase_file_name(url TEXT)
RETURNS TEXT AS $$
BEGIN
    -- Extract file name from Firebase Storage URL
    -- This function can be used to extract file names from URLs for deletion
    IF url IS NULL OR url = '' THEN
        RETURN NULL;
    END IF;
    
    -- Handle different Firebase Storage URL formats
    IF url ~ '^https://storage\.googleapis\.com/[^/]+/(.*)$' THEN
        RETURN (regexp_split_to_array(url, '/'))[array_length(regexp_split_to_array(url, '/'), 1)];
    ELSIF url ~ '^https://firebasestorage\.googleapis\.com/v0/b/[^/]+/o/(.*)$' THEN
        RETURN (regexp_split_to_array(url, '/'))[array_length(regexp_split_to_array(url, '/'), 1)];
    ELSE
        RETURN NULL;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Add comments to the function
COMMENT ON FUNCTION extract_firebase_file_name(TEXT) IS 'Extracts file name from Firebase Storage URL for deletion purposes';

-- Create migration_log table if it doesn't exist
CREATE TABLE IF NOT EXISTS migration_log (
    id SERIAL PRIMARY KEY,
    migration_name VARCHAR(255) UNIQUE NOT NULL,
    applied_at TIMESTAMP DEFAULT NOW(),
    description TEXT
);

-- Log the migration
INSERT INTO migration_log (migration_name, applied_at, description) 
VALUES (
    '005_migrate_to_firebase_storage', 
    NOW(), 
    'Migrated database schema to support Firebase Storage instead of Cloudinary'
) ON CONFLICT DO NOTHING;

-- Add index for migration log
CREATE INDEX IF NOT EXISTS idx_migration_log_name ON migration_log(migration_name);
CREATE INDEX IF NOT EXISTS idx_migration_log_applied_at ON migration_log(applied_at);
