-- ============================================================================
-- SERMON GENRE AUTO-GENERATION MIGRATION
-- ============================================================================
-- 
-- This migration adds automatic genre generation to the sermons table.
-- Genres are generated based on sermon title keywords.
-- 
-- STATUS: ✅ APPLIED TO SUPABASE
-- DATE APPLIED: February 11, 2026
-- 
-- ============================================================================

-- Create function to generate genre based on sermon title
CREATE OR REPLACE FUNCTION generate_sermon_genre(title TEXT)
RETURNS TEXT AS $$
DECLARE
  genre TEXT;
  title_lower TEXT;
BEGIN
  title_lower := LOWER(title);
  
  -- Define genre based on keywords found in title
  -- Priority order: check most specific genres first
  
  CASE
    -- Faith & Belief
    WHEN title_lower LIKE '%faith%' OR title_lower LIKE '%belief%' OR title_lower LIKE '%trust%' THEN
      genre := 'Faith & Belief';
    
    -- Prayer & Worship
    WHEN title_lower LIKE '%prayer%' OR title_lower LIKE '%worship%' OR title_lower LIKE '%praise%' THEN
      genre := 'Prayer & Worship';
    
    -- Healing & Miracles
    WHEN title_lower LIKE '%healing%' OR title_lower LIKE '%miracle%' OR title_lower LIKE '%heal%' OR title_lower LIKE '%sick%' THEN
      genre := 'Healing & Miracles';
    
    -- Prosperity & Blessings
    WHEN title_lower LIKE '%prosperity%' OR title_lower LIKE '%blessing%' OR title_lower LIKE '%abundance%' OR title_lower LIKE '%increase%' THEN
      genre := 'Prosperity & Blessings';
    
    -- Salvation & Redemption
    WHEN title_lower LIKE '%salvation%' OR title_lower LIKE '%redemption%' OR title_lower LIKE '%saved%' OR title_lower LIKE '%born%again%' THEN
      genre := 'Salvation & Redemption';
    
    -- Love & Relationships
    WHEN title_lower LIKE '%love%' OR title_lower LIKE '%relationship%' OR title_lower LIKE '%marriage%' OR title_lower LIKE '%family%' THEN
      genre := 'Love & Relationships';
    
    -- Christian Life & Living
    WHEN title_lower LIKE '%christian%' OR title_lower LIKE '%godly%' OR title_lower LIKE '%holy%' OR title_lower LIKE '%righteous%' THEN
      genre := 'Christian Life';
    
    -- Discipleship & Growth
    WHEN title_lower LIKE '%disciple%' OR title_lower LIKE '%growth%' OR title_lower LIKE '%mature%' OR title_lower LIKE '%develop%' THEN
      genre := 'Discipleship & Growth';
    
    -- Overcoming & Victory
    WHEN title_lower LIKE '%overcome%' OR title_lower LIKE '%victory%' OR title_lower LIKE '%conquer%' OR title_lower LIKE '%tribulation%' THEN
      genre := 'Overcoming & Victory';
    
    -- Bible Study & Teaching
    WHEN title_lower LIKE '%study%' OR title_lower LIKE '%lesson%' OR title_lower LIKE '%teach%' OR title_lower LIKE '%exposition%' THEN
      genre := 'Bible Study';
    
    -- Church & Community
    WHEN title_lower LIKE '%church%' OR title_lower LIKE '%community%' OR title_lower LIKE '%fellowship%' OR title_lower LIKE '%congregation%' THEN
      genre := 'Church & Community';
    
    -- Repentance & Forgiveness
    WHEN title_lower LIKE '%repent%' OR title_lower LIKE '%forgive%' OR title_lower LIKE '%confession%' OR title_lower LIKE '%sin%' THEN
      genre := 'Repentance & Forgiveness';
    
    -- Wisdom & Knowledge
    WHEN title_lower LIKE '%wisdom%' OR title_lower LIKE '%knowledge%' OR title_lower LIKE '%understand%' OR title_lower LIKE '%truth%' THEN
      genre := 'Wisdom & Knowledge';
    
    -- Holiness & Sanctification
    WHEN title_lower LIKE '%holy%' OR title_lower LIKE '%sanctif%' OR title_lower LIKE '%pure%' OR title_lower LIKE '%clean%' THEN
      genre := 'Holiness & Sanctification';
    
    -- Spiritual Warfare
    WHEN title_lower LIKE '%warfare%' OR title_lower LIKE '%spiritual%' OR title_lower LIKE '%demon%' OR title_lower LIKE '%evil%' OR title_lower LIKE '%battle%' THEN
      genre := 'Spiritual Warfare';
    
    -- Prophecy & Revelation
    WHEN title_lower LIKE '%prophecy%' OR title_lower LIKE '%revelation%' OR title_lower LIKE '%prophetic%' OR title_lower LIKE '%vision%' THEN
      genre := 'Prophecy & Revelation';
    
    -- Hope & Encouragement
    WHEN title_lower LIKE '%hope%' OR title_lower LIKE '%encourage%' OR title_lower LIKE '%comfort%' OR title_lower LIKE '%peace%' THEN
      genre := 'Hope & Encouragement';
    
    -- Default genre
    ELSE
      genre := 'General Teaching';
  END CASE;
  
  RETURN genre;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically set genre on INSERT
CREATE OR REPLACE FUNCTION trigger_set_sermon_genre()
RETURNS TRIGGER AS $$
BEGIN
  -- Only set genre if it's empty
  IF NEW.genre IS NULL OR NEW.genre = '' THEN
    NEW.genre := generate_sermon_genre(NEW.title);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on INSERT
DROP TRIGGER IF EXISTS sermon_genre_insert ON sermons;

CREATE TRIGGER sermon_genre_insert
BEFORE INSERT ON sermons
FOR EACH ROW
EXECUTE FUNCTION trigger_set_sermon_genre();

-- Create trigger on UPDATE (optional - to update genre if title changes)
DROP TRIGGER IF EXISTS sermon_genre_update ON sermons;

CREATE TRIGGER sermon_genre_update
BEFORE UPDATE ON sermons
FOR EACH ROW
WHEN (OLD.title IS DISTINCT FROM NEW.title)
EXECUTE FUNCTION trigger_set_sermon_genre();

-- Update existing sermons that don't have a genre set
UPDATE sermons
SET genre = generate_sermon_genre(title)
WHERE genre IS NULL OR genre = '';

-- ============================================================================
-- RESULTS
-- ============================================================================
-- ✅ Function generate_sermon_genre() created/updated
-- ✅ Function trigger_set_sermon_genre() created/updated
-- ✅ Trigger sermon_genre_insert created on sermons table
-- ✅ Trigger sermon_genre_update created on sermons table
-- ✅ Existing sermons updated with auto-generated genres
-- 
-- Genres are now automatically assigned to new sermons based on title keywords.
-- ============================================================================

