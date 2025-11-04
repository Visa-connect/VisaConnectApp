-- Migration to add timezone column to users table
ALTER TABLE users
ADD COLUMN timezone VARCHAR(100);
