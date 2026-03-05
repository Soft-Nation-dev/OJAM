-- ============================================================================
-- ADD FAVORITES COLUMN TO SERMONS TABLE
-- ============================================================================
-- 
-- This migration adds a favorites column to the sermons table to track
-- how many users have favorited each sermon.
-- 
-- Run this BEFORE create_user_favorites.sql
-- 
-- ============================================================================

-- Add favorites column to sermons table (if it doesn't exist)
ALTER TABLE sermons 
ADD COLUMN IF NOT EXISTS favorites INTEGER DEFAULT 0;

-- Create index for faster queries on popular sermons
CREATE INDEX IF NOT EXISTS idx_sermons_favorites ON sermons(favorites DESC);

-- Update existing sermons to have 0 favorites if NULL
UPDATE sermons 
SET favorites = 0 
WHERE favorites IS NULL;

COMMENT ON COLUMN sermons.favorites IS 'Number of users who have favorited this sermon';
