-- ============================================================================
-- USER FAVORITES TABLE MIGRATION
-- ============================================================================
-- 
-- This migration creates the user_favorites table to track which sermons
-- users have marked as favorites.
-- 
-- PREREQUISITE: Run add_favorites_column.sql first!
-- 
-- STATUS: ⏳ PENDING
-- 
-- ============================================================================

-- Create user_favorites table
CREATE TABLE IF NOT EXISTS user_favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  sermon_id UUID REFERENCES sermons(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure a user can only favorite a sermon once
  UNIQUE(user_id, sermon_id)
);

-- Create indexes for faster lookups
CREATE INDEX idx_user_favorites_user_id ON user_favorites(user_id);
CREATE INDEX idx_user_favorites_sermon_id ON user_favorites(sermon_id);
CREATE INDEX idx_user_favorites_created_at ON user_favorites(created_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE user_favorites ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view their own favorites
CREATE POLICY "Users can view own favorites"
  ON user_favorites
  FOR SELECT
  USING (auth.uid() = user_id);

-- RLS Policy: Users can insert their own favorites
CREATE POLICY "Users can insert own favorites"
  ON user_favorites
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Users can delete their own favorites
CREATE POLICY "Users can delete own favorites"
  ON user_favorites
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create function to increment sermon favorites count
CREATE OR REPLACE FUNCTION increment_sermon_favorites()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE sermons
  SET favorites = COALESCE(favorites, 0) + 1
  WHERE id = NEW.sermon_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create function to decrement sermon favorites count
CREATE OR REPLACE FUNCTION decrement_sermon_favorites()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE sermons
  SET favorites = GREATEST(COALESCE(favorites, 0) - 1, 0)
  WHERE id = OLD.sermon_id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update sermon favorites count on insert
CREATE TRIGGER on_favorite_added
  AFTER INSERT ON user_favorites
  FOR EACH ROW
  EXECUTE FUNCTION increment_sermon_favorites();

-- Trigger to update sermon favorites count on delete
CREATE TRIGGER on_favorite_removed
  AFTER DELETE ON user_favorites
  FOR EACH ROW
  EXECUTE FUNCTION decrement_sermon_favorites();

COMMENT ON TABLE user_favorites IS 'Tracks which sermons users have marked as favorites';
