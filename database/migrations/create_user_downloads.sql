-- ============================================================================
-- USER DOWNLOADS TABLE MIGRATION
-- ============================================================================
-- 
-- This migration creates the user_downloads table to track which sermons
-- users have downloaded for offline playback.
-- 
-- STATUS: ⏳ PENDING
-- 
-- ============================================================================

-- Create user_downloads table
CREATE TABLE IF NOT EXISTS user_downloads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  sermon_id UUID REFERENCES sermons(id) ON DELETE CASCADE NOT NULL,
  
  -- Download metadata
  download_path TEXT NOT NULL, -- Local file path on device
  file_size BIGINT NOT NULL, -- Size in bytes
  audio_quality TEXT NOT NULL DEFAULT 'high' CHECK (audio_quality IN ('low', 'medium', 'high')),
  
  -- Timestamps
  downloaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure a user can only download a sermon once (per quality)
  UNIQUE(user_id, sermon_id, audio_quality)
);

-- Create indexes for faster lookups
CREATE INDEX idx_user_downloads_user_id ON user_downloads(user_id);
CREATE INDEX idx_user_downloads_sermon_id ON user_downloads(sermon_id);
CREATE INDEX idx_user_downloads_downloaded_at ON user_downloads(downloaded_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE user_downloads ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view their own downloads
CREATE POLICY "Users can view own downloads"
  ON user_downloads
  FOR SELECT
  USING (auth.uid() = user_id);

-- RLS Policy: Users can insert their own downloads
CREATE POLICY "Users can insert own downloads"
  ON user_downloads
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Users can update their own downloads
CREATE POLICY "Users can update own downloads"
  ON user_downloads
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Users can delete their own downloads
CREATE POLICY "Users can delete own downloads"
  ON user_downloads
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create view for download statistics
CREATE OR REPLACE VIEW user_download_stats AS
SELECT 
  user_id,
  COUNT(*) as total_downloads,
  SUM(file_size) as total_bytes,
  MAX(downloaded_at) as last_download_at
FROM user_downloads
GROUP BY user_id;

COMMENT ON TABLE user_downloads IS 'Tracks which sermons users have downloaded for offline playback';
COMMENT ON VIEW user_download_stats IS 'Aggregated download statistics per user';
