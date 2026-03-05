import {
  loadSettingsFromSupabase,
  syncSettingsToSupabase,
  type UserSettingsUpdate,
} from "@/lib/user-settings";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useAuth } from "./AuthContext";

export type ThemeMode = "system" | "light" | "dark";
export type TextSize = "small" | "medium" | "large";
export type AudioQuality = "low" | "medium" | "high";
export type PlaybackSpeed = 0.75 | 1 | 1.25 | 1.5 | 2;

export type AppSettings = {
  themeMode: ThemeMode;
  textSize: TextSize;
  audioQuality: AudioQuality;
  playbackSpeed: PlaybackSpeed;
  notificationsEnabled: boolean;
  emailNotifications: boolean;
  autoDownload: boolean;
  wifiOnly: boolean;
};

type SettingsContextValue = {
  settings: AppSettings;
  setThemeMode: (mode: ThemeMode) => void;
  setTextSize: (size: TextSize) => void;
  setAudioQuality: (quality: AudioQuality) => void;
  setPlaybackSpeed: (speed: PlaybackSpeed) => void;
  setNotificationsEnabled: (enabled: boolean) => void;
  setEmailNotifications: (enabled: boolean) => void;
  setAutoDownload: (enabled: boolean) => void;
  setWifiOnly: (enabled: boolean) => void;
};

const STORAGE_KEY = "app.settings.v1";

const defaultSettings: AppSettings = {
  themeMode: "system",
  textSize: "medium",
  audioQuality: "high",
  playbackSpeed: 1,
  notificationsEnabled: true,
  emailNotifications: false,
  autoDownload: false,
  wifiOnly: true,
};

const SettingsContext = createContext<SettingsContextValue>({
  settings: defaultSettings,
  setThemeMode: () => {},
  setTextSize: () => {},
  setAudioQuality: () => {},
  setPlaybackSpeed: () => {},
  setNotificationsEnabled: () => {},
  setEmailNotifications: () => {},
  setAutoDownload: () => {},
  setWifiOnly: () => {},
});

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [loaded, setLoaded] = useState(false);
  const { user } = useAuth();

  // Load settings from AsyncStorage and Supabase (if logged in)
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        let parsed = stored ? (JSON.parse(stored) as Partial<AppSettings>) : {};
        // If logged in, load from Supabase and merge
        if (user) {
          const remote = await loadSettingsFromSupabase();
          if (remote) {
            const merged: Partial<AppSettings> = { ...parsed };
            if (remote.notifications_enabled !== undefined)
              merged.notificationsEnabled = remote.notifications_enabled;
            if (remote.theme_mode) merged.themeMode = remote.theme_mode;
            if (remote.text_size) merged.textSize = remote.text_size;
            if (remote.audio_quality)
              merged.audioQuality = remote.audio_quality;
            if (remote.playback_speed) {
              merged.playbackSpeed = (
                remote.playback_speed === "0.75x"
                  ? 0.75
                  : remote.playback_speed === "1x"
                    ? 1
                    : remote.playback_speed === "1.25x"
                      ? 1.25
                      : remote.playback_speed === "1.5x"
                        ? 1.5
                        : remote.playback_speed === "2x"
                          ? 2
                          : 1
              ) as PlaybackSpeed;
            }
            if (remote.auto_download_enabled !== undefined)
              merged.autoDownload = remote.auto_download_enabled;
            if (remote.wifi_only !== undefined)
              merged.wifiOnly = remote.wifi_only;
            if (remote.email_notifications !== undefined)
              merged.emailNotifications = remote.email_notifications;
            parsed = merged;
          }
        }
        setSettings((prev) => ({ ...prev, ...parsed }));
      } catch (error) {
        console.warn("Failed to load settings", error);
      } finally {
        setLoaded(true);
      }
    };
    loadSettings();
    // Only run on mount or when user changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Persist to AsyncStorage on change
  useEffect(() => {
    const persist = async () => {
      if (!loaded) return;
      try {
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
      } catch (error) {
        console.warn("Failed to save settings", error);
      }
    };
    persist();
  }, [loaded, settings]);

  // Sync push notification and email notification settings to Supabase when they change (if logged in)
  useEffect(() => {
    if (!loaded || !user) return;
    const payload: UserSettingsUpdate = {
      notifications_enabled: settings.notificationsEnabled,
      email_notifications: settings.emailNotifications,
    };
    syncSettingsToSupabase(payload);
  }, [
    settings.notificationsEnabled,
    settings.emailNotifications,
    loaded,
    user,
  ]);

  const value = useMemo(
    () => ({
      settings,
      setThemeMode: (mode: ThemeMode) =>
        setSettings((prev) => ({ ...prev, themeMode: mode })),
      setTextSize: (size: TextSize) =>
        setSettings((prev) => ({ ...prev, textSize: size })),
      setAudioQuality: (quality: AudioQuality) =>
        setSettings((prev) => ({ ...prev, audioQuality: quality })),
      setPlaybackSpeed: (speed: PlaybackSpeed) =>
        setSettings((prev) => ({ ...prev, playbackSpeed: speed })),
      setNotificationsEnabled: (enabled: boolean) =>
        setSettings((prev) => ({ ...prev, notificationsEnabled: enabled })),
      setEmailNotifications: (enabled: boolean) =>
        setSettings((prev) => ({ ...prev, emailNotifications: enabled })),
      setAutoDownload: (enabled: boolean) =>
        setSettings((prev) => ({ ...prev, autoDownload: enabled })),
      setWifiOnly: (enabled: boolean) =>
        setSettings((prev) => ({ ...prev, wifiOnly: enabled })),
    }),
    [settings],
  );

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  return useContext(SettingsContext);
}
