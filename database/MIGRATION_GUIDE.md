# Database Migration Guide

## Overview

This guide will help you apply all the database migrations to enable user authentication, favorites, downloads, and settings.

## Prerequisites

- Supabase project already set up
- Sermons, images, playlist, and playlist_item tables already exist

## Migration Order

### Step 1: Add Favorites Column to Sermons Table

**File**: `add_favorites_column.sql`  
**Purpose**: Adds the `favorites` column to track favorite counts

1. Go to your Supabase Dashboard
2. Navigate to **SQL Editor**
3. Copy and paste the contents of `database/migrations/add_favorites_column.sql`
4. Click **Run**

### Step 2: Create User Settings Table

**File**: `create_user_settings.sql`  
**Purpose**: Store user preferences (theme, audio quality, notifications)

1. In SQL Editor, copy and paste the contents of `database/migrations/create_user_settings.sql`
2. Click **Run**

### Step 3: Create User Favorites Table

**File**: `create_user_favorites.sql`  
**Purpose**: Track which sermons users have favorited

1. In SQL Editor, copy and paste the contents of `database/migrations/create_user_favorites.sql`
2. Click **Run**

### Step 4: Create User Downloads Table

**File**: `create_user_downloads.sql`  
**Purpose**: Track downloaded sermons for offline playback

1. In SQL Editor, copy and paste the contents of `database/migrations/create_user_downloads.sql`
2. Click **Run**

## Post-Migration Setup

### Disable Email Confirmation (for auto-login)

1. Go to **Authentication** → **Providers** in Supabase Dashboard
2. Click on **Email** provider
3. Scroll down to **Confirm email**
4. Toggle it **OFF**
5. Click **Save**

## Verification

After running all migrations, verify in the Supabase Dashboard → **Table Editor**:

✅ `sermons` table has a `favorites` column  
✅ `user_settings` table exists  
✅ `user_favorites` table exists  
✅ `user_downloads` table exists

## Rollback (if needed)

If you need to remove the changes:

```sql
-- Remove favorites column
ALTER TABLE sermons DROP COLUMN IF EXISTS favorites;

-- Drop tables (this will delete all user data!)
DROP TABLE IF EXISTS user_downloads CASCADE;
DROP TABLE IF EXISTS user_favorites CASCADE;
DROP TABLE IF EXISTS user_settings CASCADE;
```

## Troubleshooting

### Error: "column 'favorites' does not exist"

- You skipped Step 1. Run `add_favorites_column.sql` first.

### Error: "relation 'user_favorites' already exists"

- Migration already applied. Check Table Editor to confirm.

### Favorites count not updating

- Check that triggers were created: `on_favorite_added` and `on_favorite_removed`
- Run `SELECT * FROM pg_trigger WHERE tgname LIKE '%favorite%';` to verify

## Next Steps

After migrations are applied:

1. Test signup/login in the app
2. Test favoriting sermons
3. Verify favorites count updates in Library page
4. Check that favorites persist after app restart
