-- Add is_volunteer column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_volunteer BOOLEAN DEFAULT FALSE;
