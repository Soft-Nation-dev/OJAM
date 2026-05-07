import {
    DarkTheme,
    DefaultTheme,
    ThemeProvider,
} from "@react-navigation/native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import "react-native-reanimated";

import {
    AudioPlayerProvider,
    useAudioPlayer,
} from "@/contexts/AudioPlayerContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { DownloadsProvider } from "@/contexts/DownloadsContext";
import { FavoritesProvider } from "@/contexts/FavoritesContext";
import { NotificationProvider } from "@/contexts/NotificationContext";
import { PlaylistsProvider } from "@/contexts/PlaylistsContext";
import { SermonsProvider } from "@/contexts/SermonsContext";
import { SettingsProvider, useSettings } from "@/contexts/SettingsContext";
import { ToastProvider } from "@/contexts/ToastContext";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { runCacheMaintenance } from "@/lib/clear-cache";
import {
    applyOtaUpdate,
    checkForUpdates,
    markUpdatePromptShown,
    shouldShowUpdatePrompt,
} from "@/services/app-updates";
import {
    initializeTrackPlayer,
    isTrackPlayerSupported,
} from "@/services/track-player";
import { useEffect } from "react";

import { Alert } from "react-native";

export const unstable_settings = {
  anchor: "(tabs)",
};

function PlaybackSettingsSync() {
  const { settings } = useSettings();
  const { setPlaybackRate } = useAudioPlayer();

  useEffect(() => {
    void setPlaybackRate(settings.playbackSpeed).catch(() => {});
    // setPlaybackRate identity is recreated by context; speed is the real trigger.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.playbackSpeed]);

  return null;
}

export default function RootLayout() {
  const colorScheme = useColorScheme();

  // Debug: Check Supabase URL at runtime
  useEffect(() => {
    // This will show exactly what the production app "sees"
    const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
    if (!url) {
      Alert.alert("Config Error", "Supabase URL is missing in this build!");
    } else {
      console.log("Supabase connected to:", url);
    }
  }, []);

  useEffect(() => {
    if (!isTrackPlayerSupported) return;
    void initializeTrackPlayer().catch(() => {});
    // Run cache maintenance (clear old files and enforce size limit) on app start
    void runCacheMaintenance();
  }, []);

 useEffect(() => {
  const runUpdateCheck = async () => {
    try {
      const canPrompt = await shouldShowUpdatePrompt();
      if (!canPrompt) return;

      const status = await checkForUpdates();
      if (!status.otaAvailable) return;

      await markUpdatePromptShown();

      Alert.alert(
        "Update available",
        "A new version is ready to install.",
        [
          { text: "Later", style: "cancel" },
          {
            text: "Update",
            onPress: async () => {
              await applyOtaUpdate();
            },
          },
        ]
      );
    } catch (error) {
      console.warn("Update check failed", error);
    }
  };

  void runUpdateCheck();
 }, []);
  
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AudioPlayerProvider>
        <ToastProvider>
          <NotificationProvider>
            <AuthProvider>
              <SettingsProvider>
                <SermonsProvider>
                  <FavoritesProvider>
                    <DownloadsProvider>
                      <PlaylistsProvider>
                        <PlaybackSettingsSync />
                        <ThemeProvider
                          value={
                            colorScheme === "dark" ? DarkTheme : DefaultTheme
                          }
                        >
                          <Stack>
                            <Stack.Screen
                              name="(tabs)"
                              options={{ headerShown: false }}
                            />
                            <Stack.Screen
                              name="player"
                              options={{
                                presentation: "modal",
                                headerShown: false,
                              }}
                            />
                            <Stack.Screen
                              name="sermon/[id]"
                              options={{ headerShown: false }}
                            />
                            <Stack.Screen
                              name="sermon/related/[id]"
                              options={{ headerShown: false }}
                            />
                            <Stack.Screen
                              name="playlist/[id]"
                              options={{ headerShown: false }}
                            />
                            <Stack.Screen
                              name="see-all/[type]"
                              options={{ headerShown: false }}
                            />
                            <Stack.Screen
                              name="notifications"
                              options={{ headerShown: false }}
                            />
                            <Stack.Screen
                              name="settings"
                              options={{ headerShown: false }}
                            />
                            <Stack.Screen
                              name="NetworkTest"
                              options={{
                                headerShown: true,
                                title: "Network Test",
                              }}
                            />
                            <Stack.Screen
                              name="auth"
                              options={{
                                presentation: "modal",
                                headerShown: false,
                              }}
                            />
                          </Stack>

                          <StatusBar style="auto" />
                        </ThemeProvider>
                      </PlaylistsProvider>
                    </DownloadsProvider>
                  </FavoritesProvider>
                </SermonsProvider>
              </SettingsProvider>
            </AuthProvider>
          </NotificationProvider>
        </ToastProvider>
      </AudioPlayerProvider>
    </GestureHandlerRootView>
  );
}
