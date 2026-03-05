-- ============================================================================
-- USER SETTINGS TABLE MIGRATION
-- ============================================================================
-- 
-- This migration creates the user_settings table to store per-user app
-- preferences that sync across devices.
-- 
-- STATUS: ⏳ PENDING
-- 
-- ============================================================================

-- Create user_settings table
CREATE TABLE IF NOT EXISTS user_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  
  -- Appearance settings
  theme_mode TEXT NOT NULL DEFAULT 'system' CHECK (theme_mode IN ('system', 'light', 'dark')),
  text_size TEXT NOT NULL DEFAULT 'medium' CHECK (text_size IN ('small', 'medium', 'large')),
  
  -- Audio settings
  audio_quality TEXT NOT NULL DEFAULT 'high' CHECK (audio_quality IN ('low', 'medium', 'high')),
  playback_speed TEXT NOT NULL DEFAULT '1x' CHECK (playback_speed IN ('0.75x', '1x', '1.25x', '1.5x', '2x')),
  
  -- Feature toggles
  notifications_enabled BOOLEAN NOT NULL DEFAULT true,
  auto_download_enabled BOOLEAN NOT NULL DEFAULT false,
  wifi_only BOOLEAN NOT NULL DEFAULT true,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on user_id for faster lookups
CREATE INDEX idx_user_settings_user_id ON user_settings(user_id);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_settings_updated_at
  BEFORE UPDATE ON user_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only view their own settings
CREATE POLICY "Users can view own settings"
  ON user_settings
  FOR SELECT
  USING (auth.uid() = user_id);

-- RLS Policy: Users can insert their own settings
CREATE POLICY "Users can insert own settings"
  ON user_settings
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Users can update their own settings
CREATE POLICY "Users can update own settings"
  ON user_settings
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Users can delete their own settings
CREATE POLICY "Users can delete own settings"
  ON user_settings
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create function to auto-create settings for new users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_settings (user_id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create settings when a new user signs up
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

COMMENT ON TABLE user_settings IS 'Stores per-user application settings that sync across devices';
