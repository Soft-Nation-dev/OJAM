# User Data Migration Guide

This guide walks you through setting up user-specific data for settings, favorites, and downloads.

## 📋 Overview

Three new tables have been created:

- **user_settings** - Syncs app settings across devices
- **user_favorites** - Tracks favorited sermons
- **user_downloads** - Tracks downloaded sermons for offline playback

## 🚀 Step 1: Apply Database Migrations

Apply the migrations to your Supabase project in this order:

### 1. User Settings Table

```bash
# Navigate to Supabase SQL Editor
# Copy and paste the contents of:
database/migrations/create_user_settings.sql
```

This creates:

- `user_settings` table with RLS policies
- Auto-trigger to create settings for new users
- Theme, audio, and feature toggle columns

### 2. User Favorites Table

```bash
# Copy and paste the contents of:
database/migrations/create_user_favorites.sql
```

This creates:

- `user_favorites` table with RLS policies
- Triggers to auto-increment/decrement `sermons.favorites` count
- Indexes for fast lookups

### 3. User Downloads Table

```bash
# Copy and paste the contents of:
database/migrations/create_user_downloads.sql
```

This creates:

- `user_downloads` table with RLS policies
- `user_download_stats` view for aggregated statistics
- Support for multiple audio quality downloads

## 🔐 Step 2: Enable Supabase Auth

You need to configure authentication to use these features.

### Option A: Email/Password Auth

```typescript
// In your login screen
const { data, error } = await supabase.auth.signUp({
  email: "user@example.com",
  password: "password",
});
```

### Option B: Social Auth (Google, Apple, etc.)

Follow [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)

## 🔧 Step 3: Integrate with Your App

### Settings Sync

Update your `SettingsContext` to sync with Supabase:

```typescript
import {
  loadSettingsFromSupabase,
  syncSettingsToSupabase,
} from "@/lib/user-settings";

// On app launch (after user logs in)
const cloudSettings = await loadSettingsFromSupabase();
if (cloudSettings) {
  // Merge with local settings
  updateSettings(cloudSettings);
}

// When settings change
await syncSettingsToSupabase({
  theme_mode: settings.themeMode,
  text_size: settings.textSize,
  // ... other settings
});
```

### Favorites Integration

Add favorite functionality to sermon cards:

```typescript
import { toggleFavorite, isSermonFavorited } from "@/lib/user-favorites";

// Check if favorited
const [isFavorited, setIsFavorited] = useState(false);

useEffect(() => {
  isSermonFavorited(sermon.id).then(setIsFavorited);
}, [sermon.id]);

// Toggle favorite
const handleFavorite = async () => {
  const success = await toggleFavorite(sermon.id);
  if (success) setIsFavorited(!isFavorited);
};
```

### Downloads Tracking

Track downloads when users download sermons:

```typescript
import { trackDownload, isSermonDownloaded } from "@/lib/user-downloads";

// After successful download
const fileInfo = await FileSystem.getInfoAsync(localPath);
await trackDownload(sermon.id, localPath, fileInfo.size, settings.audioQuality);

// Check if downloaded
const isDownloaded = await isSermonDownloaded(sermon.id);
```

## 📊 Step 4: Update UI Components

### Library Page - Add Favorites Section

```typescript
import { fetchFavoriteSermons } from "@/lib/user-favorites";

const [favorites, setFavorites] = useState<Sermon[]>([]);

useEffect(() => {
  fetchFavoriteSermons().then(setFavorites);
}, []);
```

### Library Page - Add Downloads Section

```typescript
import { fetchDownloadedSermons } from "@/lib/user-downloads";

const [downloads, setDownloads] = useState<Sermon[]>([]);

useEffect(() => {
  fetchDownloadedSermons().then(setDownloads);
}, []);
```

## 🎯 Next Steps

1. **Authentication Screens**
   - Create login/signup screens
   - Add auth state management
   - Handle auth session persistence

2. **UI Updates**
   - Add favorite button to sermon cards
   - Add download button with progress tracking
   - Show favorite/download indicators
   - Add favorites/downloads sections to Library

3. **Offline Functionality**
   - Implement actual file downloads using expo-file-system
   - Play downloaded files from local storage
   - Sync download status with Supabase

4. **Settings Sync**
   - Auto-sync settings on change
   - Pull settings on login
   - Handle conflicts (cloud vs local)

## 🔍 Testing

### Test RLS Policies

```sql
-- Login as a test user in Supabase
-- Try to access another user's data (should fail)
SELECT * FROM user_favorites WHERE user_id != auth.uid();
```

### Test Triggers

```sql
-- Add a favorite
INSERT INTO user_favorites (user_id, sermon_id)
VALUES (auth.uid(), 'some-sermon-id');

-- Check if sermons.favorites incremented
SELECT favorites FROM sermons WHERE id = 'some-sermon-id';
```

## 📁 File Structure

```
lib/
  ├── user-settings.ts    # Settings sync functions
  ├── user-favorites.ts   # Favorites CRUD operations
  └── user-downloads.ts   # Downloads tracking

database/migrations/
  ├── create_user_settings.sql
  ├── create_user_favorites.sql
  └── create_user_downloads.sql
```

## 🛡️ Security Notes

- All tables have Row Level Security (RLS) enabled
- Users can only access their own data
- Auth triggers auto-create user_settings on signup
- Sermon favorites/downloads counts are atomic (no race conditions)

## 🐛 Troubleshooting

**Issue: RLS policies blocking queries**

- Ensure user is authenticated: `supabase.auth.getUser()`
- Check RLS policies are applied correctly
- Verify auth.uid() matches user_id in queries

**Issue: Settings not syncing**

- Check network connectivity
- Verify user is logged in
- Check Supabase logs for errors

**Issue: Favorites count not updating**

- Ensure triggers are created
- Check sermons table has `favorites` column
- Verify trigger functions exist
