-- Migration: Add photo_url field to meetups table
-- This script adds a photo_url field to store meetup images

-- Add photo_url column to meetups table
ALTER TABLE meetups 
ADD COLUMN IF NOT EXISTS photo_url VARCHAR(500),
ADD COLUMN IF NOT EXISTS photo_public_id VARCHAR(255);

-- Create index on photo_url for faster lookups
CREATE INDEX IF NOT EXISTS idx_meetups_photo_url ON meetups(photo_url);

-- Create index on photo_public_id for Cloudinary management
CREATE INDEX IF NOT EXISTS idx_meetups_photo_public_id ON meetups(photo_public_id);

-- Add comment to document the new fields
COMMENT ON COLUMN meetups.photo_url IS 'URL to the meetup photo/image';
COMMENT ON COLUMN meetups.photo_public_id IS 'Cloudinary public ID for photo deletion';
