# Authentication Quick Start

## ✅ What's Been Implemented

### 1. **Auth Context** (`contexts/AuthContext.tsx`)

- Email/password sign in and sign up
- Google OAuth integration
- Session management
- Auto-login on app restart
- Sign out functionality

### 2. **Auth Screen** (`app/auth.tsx`)

- Beautiful modal design with tabs (Login/Sign Up)
- Email and password inputs with show/hide password
- Full name field for sign up
- Google sign-in button
- Forgot password link
- Form validation and error handling

### 3. **Library Integration** (`app/(tabs)/library.tsx`)

- Shows user's name (or email) when logged in
- Displays user ID (first 8 characters)
- "Guest Account" when not logged in
- Login button opens auth modal
- Logout button when authenticated

### 4. **App Configuration**

- AuthProvider wraps entire app
- Auth modal route configured
- Google OAuth redirect scheme: `ojam://auth-callback`

## 🚀 How to Use

### For Users (App Flow)

1. **Sign Up**:
   - Tap "Login" button in Library tab
   - Switch to "Sign Up" tab
   - Enter name, email, password
   - Tap "Create Account"
   - Check email for verification (if enabled in Supabase)

2. **Sign In**:
   - Tap "Login" button
   - Enter email and password
   - Tap "Login"
   - User info displays in Library

3. **Google Sign In**:
   - Tap "Continue with Google"
   - Select Google account
   - Grant permissions
   - Automatically signed in

4. **Sign Out**:
   - Tap "Logout" button in Library
   - Returns to Guest Account

## ⚙️ Setup Required

### 1. Supabase Configuration

**Enable Email Auth:**

1. Supabase Dashboard → Authentication → Providers
2. Enable "Email" provider
3. Configure confirmations (optional)

**Enable Google OAuth:**

1. Create Google OAuth credentials (see [AUTH_SETUP.md](./AUTH_SETUP.md))
2. Supabase Dashboard → Authentication → Providers → Google
3. Add Client ID and Secret from Google Console
4. Add callback URL to Google Console

### 2. App Configuration

**Update Google Client ID:**
In `app.json`, replace:

```json
"googleClientId": "YOUR_GOOGLE_CLIENT_ID_HERE"
```

with your actual Google Web Client ID.

### 3. Test the Integration

```bash
# Start the app
npx expo start

# Test signup and login flows
# Check Supabase Dashboard → Authentication → Users
```

## 📝 User Data Available

Once logged in, access user data anywhere in the app:

```typescript
import { useAuth } from "@/contexts/AuthContext";

function MyComponent() {
  const { user, session, loading } = useAuth();

  console.log(user?.email); // user@example.com
  console.log(user?.id); // uuid
  console.log(user?.user_metadata?.full_name); // John Doe
  console.log(session?.access_token); // JWT token
}
```

## 🔗 Integration Points

Now that auth is set up, you can:

1. **Sync Settings** - Update SettingsContext to sync with `user_settings` table
2. **Save Favorites** - Use `user_favorites` table with authenticated user
3. **Track Downloads** - Store in `user_downloads` table per user
4. **User Playlists** - Create personal playlists linked to user ID
5. **Listening History** - Track per-user playback history

## 🎨 UI Components

**Auth Modal Features:**

- ✅ Tab switcher (Login/Sign Up)
- ✅ Input validation
- ✅ Loading states
- ✅ Error handling with alerts
- ✅ Show/hide password toggle
- ✅ Google OAuth button
- ✅ Forgot password link
- ✅ Responsive keyboard handling
- ✅ Dark mode support

**Library Profile Card:**

- ✅ User name/email display
- ✅ User ID (shortened)
- ✅ Login/Logout button
- ✅ Profile image placeholder
- ✅ Guest mode fallback

## 🐛 Common Issues

**"Invalid email or password"**

- Check credentials are correct
- Verify email is confirmed (if required)
- Check Supabase logs

**Google login opens but doesn't redirect back**

- Verify `scheme: "ojam"` in app.json
- Check redirect URI in Google Console
- Ensure callback URL matches Supabase

**User shows as null after login**

- Check AuthProvider wraps the app
- Verify supabase client is initialized
- Check network connectivity

For detailed setup instructions, see [AUTH_SETUP.md](./AUTH_SETUP.md)
