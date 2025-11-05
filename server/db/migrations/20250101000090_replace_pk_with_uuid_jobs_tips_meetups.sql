-- Migration to replace integer primary keys with UUIDs for:
-- jobs, job_applications, tips_trips_advice, meetups, and their related tables
-- 
-- This is a complex migration that requires careful ordering:
-- 1. Add UUID columns to parent tables
-- 2. Generate UUIDs for existing rows
-- 3. Update foreign key columns in child tables
-- 4. Drop old foreign key constraints
-- 5. Replace primary keys
-- 6. Recreate foreign key constraints with UUIDs
-- 7. Update indexes
--
-- WARNING: This migration is wrapped in a transaction. If it fails, all changes will be rolled back.
-- Ensure you have a database backup before running this in production.
--
-- Note: CREATE EXTENSION must run outside a transaction, so it's done first.

-- Ensure pgcrypto extension is enabled
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Helper function to safely rename a column and optionally set NOT NULL
-- This function is idempotent and can be called multiple times safely
-- Note: CREATE FUNCTION must run outside a transaction, so it's done before BEGIN
CREATE OR REPLACE FUNCTION safe_rename_column(
    p_table_name TEXT,
    p_old_column_name TEXT,
    p_new_column_name TEXT,
    p_set_not_null BOOLEAN DEFAULT TRUE
) RETURNS VOID AS $$
BEGIN
    -- Only rename if old column exists and new column doesn't exist
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = p_table_name AND column_name = p_old_column_name
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = p_table_name AND column_name = p_new_column_name
    ) THEN
        EXECUTE format('ALTER TABLE %I RENAME COLUMN %I TO %I', 
            p_table_name, p_old_column_name, p_new_column_name);
    END IF;
    
    -- Set NOT NULL if requested and column exists
    IF p_set_not_null AND EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = p_table_name AND column_name = p_new_column_name
    ) THEN
        EXECUTE format('ALTER TABLE %I ALTER COLUMN %I SET NOT NULL', 
            p_table_name, p_new_column_name);
    END IF;
END;
$$ LANGUAGE plpgsql;

BEGIN;

-- ============================================================================
-- STEP 1: MEETUPS TABLE
-- ============================================================================

-- Add new UUID column
ALTER TABLE meetups ADD COLUMN IF NOT EXISTS id_new UUID;

-- Generate UUIDs for existing rows
UPDATE meetups SET id_new = gen_random_uuid() WHERE id_new IS NULL;

-- Make it NOT NULL and add unique constraint
ALTER TABLE meetups ALTER COLUMN id_new SET NOT NULL;
ALTER TABLE meetups DROP CONSTRAINT IF EXISTS meetups_id_new_unique CASCADE;
ALTER TABLE meetups ADD CONSTRAINT meetups_id_new_unique UNIQUE (id_new);

-- Add temporary UUID columns to child tables
ALTER TABLE meetup_interests ADD COLUMN IF NOT EXISTS meetup_id_new UUID;
ALTER TABLE meetup_reports ADD COLUMN IF NOT EXISTS meetup_id_new UUID;

-- Update foreign key references in child tables using the new UUID column
UPDATE meetup_interests mi
SET meetup_id_new = (SELECT m.id_new FROM meetups m WHERE m.id = mi.meetup_id)
WHERE EXISTS (SELECT 1 FROM meetups m WHERE m.id = mi.meetup_id);

UPDATE meetup_reports mr
SET meetup_id_new = (SELECT m.id_new FROM meetups m WHERE m.id = mr.meetup_id)
WHERE EXISTS (SELECT 1 FROM meetups m WHERE m.id = mr.meetup_id);

-- Drop old foreign key constraints
ALTER TABLE meetup_interests DROP CONSTRAINT IF EXISTS meetup_interests_meetup_id_fkey;
ALTER TABLE meetup_reports DROP CONSTRAINT IF EXISTS meetup_reports_meetup_id_fkey;

-- Drop old columns and rename new ones
ALTER TABLE meetup_interests DROP COLUMN IF EXISTS meetup_id;
SELECT safe_rename_column('meetup_interests', 'meetup_id_new', 'meetup_id');

ALTER TABLE meetup_reports DROP COLUMN IF EXISTS meetup_id;
SELECT safe_rename_column('meetup_reports', 'meetup_id_new', 'meetup_id');

-- Update reports table for meetups (while old integer id still exists)
-- Note: reports.target_id is VARCHAR(255), so we need to cast the integer id to text for comparison
UPDATE reports r
SET target_id = (SELECT m.id_new::text FROM meetups m WHERE m.id::text = r.target_id)
WHERE r.target_type = 'meetup' AND r.target_id ~ '^[0-9]+$'
  AND EXISTS (SELECT 1 FROM meetups m WHERE m.id::text = r.target_id);

-- Drop old primary key and rename new column
ALTER TABLE meetups DROP CONSTRAINT IF EXISTS meetups_pkey;
ALTER TABLE meetups DROP COLUMN IF EXISTS id;
SELECT safe_rename_column('meetups', 'id_new', 'id', FALSE);
-- Only add primary key if it doesn't already exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'meetups_pkey' 
        AND conrelid = 'meetups'::regclass
    ) THEN
        ALTER TABLE meetups ADD PRIMARY KEY (id);
    END IF;
END $$;

-- Recreate foreign key constraints with UUIDs
ALTER TABLE meetup_interests DROP CONSTRAINT IF EXISTS meetup_interests_meetup_id_fkey;
ALTER TABLE meetup_interests 
  ADD CONSTRAINT meetup_interests_meetup_id_fkey 
  FOREIGN KEY (meetup_id) REFERENCES meetups(id) ON DELETE CASCADE;

ALTER TABLE meetup_reports DROP CONSTRAINT IF EXISTS meetup_reports_meetup_id_fkey;
ALTER TABLE meetup_reports 
  ADD CONSTRAINT meetup_reports_meetup_id_fkey 
  FOREIGN KEY (meetup_id) REFERENCES meetups(id) ON DELETE CASCADE;

-- ============================================================================
-- STEP 2: TIPS_TRIPS_ADVICE TABLE
-- ============================================================================

-- Add new UUID column
ALTER TABLE tips_trips_advice ADD COLUMN IF NOT EXISTS id_new UUID;

-- Generate UUIDs for existing rows
UPDATE tips_trips_advice SET id_new = gen_random_uuid() WHERE id_new IS NULL;

-- Make it NOT NULL and add unique constraint
ALTER TABLE tips_trips_advice ALTER COLUMN id_new SET NOT NULL;
ALTER TABLE tips_trips_advice DROP CONSTRAINT IF EXISTS tips_trips_advice_id_new_unique CASCADE;
ALTER TABLE tips_trips_advice ADD CONSTRAINT tips_trips_advice_id_new_unique UNIQUE (id_new);

-- Add temporary UUID columns to child tables
ALTER TABLE tips_trips_advice_photos ADD COLUMN IF NOT EXISTS post_id_new UUID;
ALTER TABLE tips_trips_advice_comments ADD COLUMN IF NOT EXISTS post_id_new UUID;
ALTER TABLE tips_trips_advice_likes ADD COLUMN IF NOT EXISTS post_id_new UUID;

-- Update foreign key references in child tables
UPDATE tips_trips_advice_photos ttap
SET post_id_new = (SELECT tta.id_new FROM tips_trips_advice tta WHERE tta.id = ttap.post_id)
WHERE EXISTS (SELECT 1 FROM tips_trips_advice tta WHERE tta.id = ttap.post_id);

UPDATE tips_trips_advice_comments ttac
SET post_id_new = (SELECT tta.id_new FROM tips_trips_advice tta WHERE tta.id = ttac.post_id)
WHERE EXISTS (SELECT 1 FROM tips_trips_advice tta WHERE tta.id = ttac.post_id);

UPDATE tips_trips_advice_likes ttal
SET post_id_new = (SELECT tta.id_new FROM tips_trips_advice tta WHERE tta.id = ttal.post_id)
WHERE EXISTS (SELECT 1 FROM tips_trips_advice tta WHERE tta.id = ttal.post_id);

-- Drop old foreign key constraints
ALTER TABLE tips_trips_advice_photos DROP CONSTRAINT IF EXISTS tips_trips_advice_photos_post_id_fkey;
ALTER TABLE tips_trips_advice_comments DROP CONSTRAINT IF EXISTS tips_trips_advice_comments_post_id_fkey;
ALTER TABLE tips_trips_advice_likes DROP CONSTRAINT IF EXISTS tips_trips_advice_likes_post_id_fkey;

-- Drop old columns and rename new ones
ALTER TABLE tips_trips_advice_photos DROP COLUMN IF EXISTS post_id;
SELECT safe_rename_column('tips_trips_advice_photos', 'post_id_new', 'post_id');

ALTER TABLE tips_trips_advice_comments DROP COLUMN IF EXISTS post_id;
SELECT safe_rename_column('tips_trips_advice_comments', 'post_id_new', 'post_id');

ALTER TABLE tips_trips_advice_likes DROP COLUMN IF EXISTS post_id;
SELECT safe_rename_column('tips_trips_advice_likes', 'post_id_new', 'post_id');

-- Drop old primary key and rename new column
ALTER TABLE tips_trips_advice DROP CONSTRAINT IF EXISTS tips_trips_advice_pkey;
ALTER TABLE tips_trips_advice DROP COLUMN IF EXISTS id;
SELECT safe_rename_column('tips_trips_advice', 'id_new', 'id', FALSE);
-- Only add primary key if it doesn't already exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'tips_trips_advice_pkey' 
        AND conrelid = 'tips_trips_advice'::regclass
    ) THEN
        ALTER TABLE tips_trips_advice ADD PRIMARY KEY (id);
    END IF;
END $$;

-- Recreate foreign key constraints with UUIDs
ALTER TABLE tips_trips_advice_photos DROP CONSTRAINT IF EXISTS tips_trips_advice_photos_post_id_fkey;
ALTER TABLE tips_trips_advice_photos 
  ADD CONSTRAINT tips_trips_advice_photos_post_id_fkey 
  FOREIGN KEY (post_id) REFERENCES tips_trips_advice(id) ON DELETE CASCADE;

ALTER TABLE tips_trips_advice_comments DROP CONSTRAINT IF EXISTS tips_trips_advice_comments_post_id_fkey;
ALTER TABLE tips_trips_advice_comments 
  ADD CONSTRAINT tips_trips_advice_comments_post_id_fkey 
  FOREIGN KEY (post_id) REFERENCES tips_trips_advice(id) ON DELETE CASCADE;

ALTER TABLE tips_trips_advice_likes DROP CONSTRAINT IF EXISTS tips_trips_advice_likes_post_id_fkey;
ALTER TABLE tips_trips_advice_likes 
  ADD CONSTRAINT tips_trips_advice_likes_post_id_fkey 
  FOREIGN KEY (post_id) REFERENCES tips_trips_advice(id) ON DELETE CASCADE;

-- ============================================================================
-- STEP 3: JOBS TABLE
-- ============================================================================

-- Add new UUID column
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS id_new UUID;

-- Generate UUIDs for existing rows
UPDATE jobs SET id_new = gen_random_uuid() WHERE id_new IS NULL;

-- Make it NOT NULL and add unique constraint
ALTER TABLE jobs ALTER COLUMN id_new SET NOT NULL;
ALTER TABLE jobs DROP CONSTRAINT IF EXISTS jobs_id_new_unique CASCADE;
ALTER TABLE jobs ADD CONSTRAINT jobs_id_new_unique UNIQUE (id_new);

-- Add temporary UUID column to child table
ALTER TABLE job_applications ADD COLUMN IF NOT EXISTS job_id_new UUID;

-- Update foreign key references in child tables
UPDATE job_applications ja
SET job_id_new = (SELECT j.id_new FROM jobs j WHERE j.id = ja.job_id)
WHERE EXISTS (SELECT 1 FROM jobs j WHERE j.id = ja.job_id);

-- Drop old foreign key constraint
ALTER TABLE job_applications DROP CONSTRAINT IF EXISTS job_applications_job_id_fkey;

-- Update reports table for jobs (while old integer id still exists)
-- Note: reports.target_id is VARCHAR(255), so we need to cast the integer id to text for comparison
UPDATE reports r
SET target_id = (SELECT j.id_new::text FROM jobs j WHERE j.id::text = r.target_id)
WHERE r.target_type = 'job' AND r.target_id ~ '^[0-9]+$'
  AND EXISTS (SELECT 1 FROM jobs j WHERE j.id::text = r.target_id);

-- Drop old column and rename new one
ALTER TABLE job_applications DROP COLUMN IF EXISTS job_id;
SELECT safe_rename_column('job_applications', 'job_id_new', 'job_id');

-- Drop old primary key and rename new column
ALTER TABLE jobs DROP CONSTRAINT IF EXISTS jobs_pkey;
ALTER TABLE jobs DROP COLUMN IF EXISTS id;
SELECT safe_rename_column('jobs', 'id_new', 'id', FALSE);
-- Only add primary key if it doesn't already exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'jobs_pkey' 
        AND conrelid = 'jobs'::regclass
    ) THEN
        ALTER TABLE jobs ADD PRIMARY KEY (id);
    END IF;
END $$;

-- Recreate foreign key constraints with UUIDs
ALTER TABLE job_applications DROP CONSTRAINT IF EXISTS job_applications_job_id_fkey;
ALTER TABLE job_applications 
  ADD CONSTRAINT job_applications_job_id_fkey 
  FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE;

-- ============================================================================
-- STEP 4: JOB_APPLICATIONS TABLE
-- ============================================================================

-- Add new UUID column
ALTER TABLE job_applications ADD COLUMN IF NOT EXISTS id_new UUID;

-- Generate UUIDs for existing rows
UPDATE job_applications SET id_new = gen_random_uuid() WHERE id_new IS NULL;

-- Make it NOT NULL and add unique constraint
ALTER TABLE job_applications ALTER COLUMN id_new SET NOT NULL;
ALTER TABLE job_applications DROP CONSTRAINT IF EXISTS job_applications_id_new_unique CASCADE;
ALTER TABLE job_applications ADD CONSTRAINT job_applications_id_new_unique UNIQUE (id_new);

-- Drop old primary key and rename new column
ALTER TABLE job_applications DROP CONSTRAINT IF EXISTS job_applications_pkey;
ALTER TABLE job_applications DROP COLUMN IF EXISTS id;
SELECT safe_rename_column('job_applications', 'id_new', 'id', FALSE);
-- Only add primary key if it doesn't already exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'job_applications_pkey' 
        AND conrelid = 'job_applications'::regclass
    ) THEN
        ALTER TABLE job_applications ADD PRIMARY KEY (id);
    END IF;
END $$;

-- ============================================================================
-- STEP 5: UPDATE INDEXES AND CONSTRAINTS
-- ============================================================================

-- Recreate indexes that might have been affected
CREATE INDEX IF NOT EXISTS idx_jobs_business_id ON jobs(business_id);
CREATE INDEX IF NOT EXISTS idx_job_applications_job_id ON job_applications(job_id);
CREATE INDEX IF NOT EXISTS idx_meetup_interests_meetup_id ON meetup_interests(meetup_id);
CREATE INDEX IF NOT EXISTS idx_meetup_reports_meetup_id ON meetup_reports(meetup_id);
CREATE INDEX IF NOT EXISTS idx_tips_trips_advice_photos_post_id ON tips_trips_advice_photos(post_id);
CREATE INDEX IF NOT EXISTS idx_tips_comments_post_id ON tips_trips_advice_comments(post_id);
CREATE INDEX IF NOT EXISTS idx_tips_likes_post_id ON tips_trips_advice_likes(post_id);

-- Reports table has been updated during the migration steps above
-- Note: reports.target_id is VARCHAR(255), so it can store UUIDs
-- The updates happened before dropping the old integer id columns

COMMIT;

