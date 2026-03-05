import { supabase } from "./supabase";

export type ThemeMode = "system" | "light" | "dark";
export type TextSize = "small" | "medium" | "large";
export type AudioQuality = "low" | "medium" | "high";
export type PlaybackSpeed = "0.75x" | "1x" | "1.25x" | "1.5x" | "2x";

export interface UserSettings {
  id: string;
  user_id: string;
  theme_mode: ThemeMode;
  text_size: TextSize;
  audio_quality: AudioQuality;
  playback_speed: PlaybackSpeed;
  notifications_enabled: boolean;
  auto_download_enabled: boolean;
  wifi_only: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserSettingsUpdate {
  theme_mode?: ThemeMode;
  text_size?: TextSize;
  audio_quality?: AudioQuality;
  playback_speed?: PlaybackSpeed;
  notifications_enabled?: boolean;
  email_notifications?: boolean;
  auto_download_enabled?: boolean;
  wifi_only?: boolean;
}

/**
 * Fetch user settings from Supabase
 * Returns null if user is not authenticated or settings don't exist
 */
export async function fetchUserSettings(): Promise<UserSettings | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data, error } = await supabase
    .from("user_settings")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (error) {
    console.error("Error fetching user settings:", error);
    return null;
  }

  return data;
}

/**
 * Update user settings in Supabase
 * Creates settings if they don't exist
 */
export async function updateUserSettings(
  settings: UserSettingsUpdate,
): Promise<UserSettings | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  // Try to update first
  const { data, error } = await supabase
    .from("user_settings")
    .update(settings)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) {
    // If update fails (settings don't exist), try to insert
    const { data: insertData, error: insertError } = await supabase
      .from("user_settings")
      .insert({ user_id: user.id, ...settings })
      .select()
      .single();

    if (insertError) {
      console.error("Error updating user settings:", insertError);
      return null;
    }

    return insertData;
  }

  return data;
}

/**
 * Sync local settings to Supabase
 * Call this when user logs in or when settings change
 */
export async function syncSettingsToSupabase(
  localSettings: UserSettingsUpdate,
): Promise<boolean> {
  const result = await updateUserSettings(localSettings);
  return result !== null;
}

/**
 * Load settings from Supabase and merge with local settings
 * Returns the merged settings (Supabase takes precedence)
 */
export async function loadSettingsFromSupabase(): Promise<UserSettingsUpdate | null> {
  const settings = await fetchUserSettings();

  if (!settings) return null;

  return {
    theme_mode: settings.theme_mode,
    text_size: settings.text_size,
    audio_quality: settings.audio_quality,
    playback_speed: settings.playback_speed,
    notifications_enabled: settings.notifications_enabled,
    email_notifications: (settings as any).email_notifications,
    auto_download_enabled: settings.auto_download_enabled,
    wifi_only: settings.wifi_only,
  };
}
