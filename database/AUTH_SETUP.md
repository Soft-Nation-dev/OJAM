# Supabase Authentication Setup Guide

This guide will help you set up email/password and Google OAuth authentication in your Ojam app.

## 📋 Prerequisites

- Supabase project already created
- Supabase URL and anon key configured in `lib/supabase.ts`

## 🔐 Step 1: Enable Email/Password Authentication

1. Go to your [Supabase Dashboard](https://app.supabase.com)
2. Navigate to **Authentication** → **Providers**
3. Enable **Email** provider
4. Configure email settings:
   - **Enable email confirmations**: Toggle ON if you want users to verify email
   - **Secure email change**: Toggle ON for better security
   - **Enable email signups**: Toggle ON

### Email Templates (Optional)

Customize email templates in **Authentication** → **Email Templates**:

- Confirmation email
- Magic link
- Password reset
- Email change

## 📧 Step 2: Configure Email Service (Recommended for Production)

By default, Supabase sends emails from their servers (limited). For production, configure your own SMTP:

1. Go to **Project Settings** → **Auth**
2. Scroll to **SMTP Settings**
3. Configure your SMTP provider (SendGrid, AWS SES, etc.):
   ```
   Host: smtp.your-provider.com
   Port: 587
   Username: your-smtp-username
   Password: your-smtp-password
   Sender email: noreply@yourdomain.com
   ```

## 🔵 Step 3: Set Up Google OAuth

### 3.1 Create Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Navigate to **APIs & Services** → **Credentials**
4. Click **Create Credentials** → **OAuth client ID**
5. Configure OAuth consent screen if prompted:
   - User Type: **External**
   - App name: **Ojam**
   - User support email: Your email
   - Developer contact: Your email
   - Add scopes: `email`, `profile`, `openid`

### 3.2 Create OAuth Client IDs

You need to create OAuth clients for each platform:

#### For Android:

1. Application type: **Android**
2. Name: `Ojam Android`
3. Package name: Get from `app.json` → `expo.android.package` (or `com.yourcompany.ojam`)
4. SHA-1 certificate fingerprint: Get from Expo by running:

   ```bash
   # For development
   cd android && ./gradlew signingReport

   # Or use Expo's debug keystore
   keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android
   ```

#### For iOS:

1. Application type: **iOS**
2. Name: `Ojam iOS`
3. Bundle ID: Get from `app.json` → `expo.ios.bundleIdentifier` (or `com.yourcompany.ojam`)
4. App Store ID: Not required for development

#### For Web (Development):

1. Application type: **Web application**
2. Name: `Ojam Web`
3. Authorized redirect URIs:
   ```
   https://YOUR_SUPABASE_PROJECT_REF.supabase.co/auth/v1/callback
   ```

### 3.3 Configure Supabase

1. Go to your Supabase Dashboard
2. Navigate to **Authentication** → **Providers**
3. Enable **Google** provider
4. Add your Google OAuth credentials:
   - **Client ID**: From Google Cloud Console (Web application)
   - **Client Secret**: From Google Cloud Console (Web application)
5. Copy the **Callback URL** shown (you'll need this for Google Console)
6. **Additional User Metadata**: Toggle ON to get user profile data

### 3.4 Update Google Console Redirect URIs

Go back to Google Cloud Console and add Supabase's callback URL:

```
https://YOUR_SUPABASE_PROJECT_REF.supabase.co/auth/v1/callback
```

## 📱 Step 4: Configure Expo App

### Update app.json

Replace `YOUR_GOOGLE_CLIENT_ID_HERE` in `app.json` with your Web OAuth Client ID:

```json
{
  "expo": {
    "extra": {
      "googleClientId": "1234567890-abcdefghijklmnop.apps.googleusercontent.com"
    }
  }
}
```

### iOS Configuration (if building for iOS)

Add to `app.json`:

```json
{
  "expo": {
    "ios": {
      "bundleIdentifier": "com.yourcompany.ojam",
      "config": {
        "googleSignIn": {
          "reservedClientId": "YOUR_IOS_CLIENT_ID_HERE"
        }
      }
    }
  }
}
```

### Android Configuration (if building for Android)

Add to `app.json`:

```json
{
  "expo": {
    "android": {
      "package": "com.yourcompany.ojam",
      "googleServicesFile": "./google-services.json"
    }
  }
}
```

Download `google-services.json` from Firebase Console (if using Firebase) or create manually.

## 🧪 Step 5: Test Authentication

### Test Email/Password Signup

1. Run your app: `npx expo start`
2. Open the app and go to Library tab
3. Click **Login** button
4. Switch to **Sign Up** tab
5. Enter name, email, and password
6. Click **Create Account**
7. Check your email for verification (if enabled)
8. Login with the credentials

### Test Google Login

1. Click **Continue with Google**
2. Browser should open with Google login
3. Select your Google account
4. Grant permissions
5. Should redirect back to app and log you in

## 🔍 Troubleshooting

### Email Not Sending

- Check SMTP configuration in Supabase
- Verify sender email is verified
- Check spam folder
- Use Supabase's default email for testing

### Google Login Not Working

- Verify OAuth client IDs match your package names
- Check redirect URIs are correct
- Ensure Google provider is enabled in Supabase
- Check app.json has correct scheme: `"scheme": "ojam"`

### "Invalid redirect URI" Error

- Add all redirect URIs to Google Cloud Console
- Include Supabase callback URL
- Include expo redirect: `ojam://auth-callback`

### User Not Appearing After Login

- Check AuthContext is properly wrapped in \_layout.tsx
- Verify supabase client is initialized correctly
- Check browser console/logs for errors

## 📊 Step 6: User Management

### View Users

Go to **Authentication** → **Users** in Supabase Dashboard to see all registered users.

### User Metadata

Access user info in your app:

```typescript
const { user } = useAuth();
console.log(user?.email);
console.log(user?.user_metadata?.full_name);
console.log(user?.id);
```

### Update User Profile

```typescript
const { data, error } = await supabase.auth.updateUser({
  data: { full_name: "New Name" },
});
```

## 🎯 Next Steps

1. Apply database migrations for user_settings, user_favorites, user_downloads
2. Integrate settings sync on login
3. Add forgot password functionality
4. Add email verification reminder
5. Implement social auth for Apple (for iOS App Store requirement)

## 🔐 Security Best Practices

- Never commit OAuth secrets to version control
- Use environment variables for sensitive data
- Enable Row Level Security (RLS) on all user tables
- Implement rate limiting for auth endpoints
- Use Supabase's built-in JWT for API authentication
- Enable email verification for production
- Add reCAPTCHA for signup forms in production
