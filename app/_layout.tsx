import {
    DarkTheme,
    DefaultTheme,
    ThemeProvider,
} from "@react-navigation/native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { Platform } from "react-native";
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
    startStoreUpdate,
} from "@/services/app-updates";
import {
    initializeTrackPlayer,
    isTrackPlayerSupported,
} from "@/services/track-player";
import { useEffect, useState } from "react";

import { Alert } from "react-native";
import IOSInstallBanner from "@/components/ios-install-banner";

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

function LayoutShell() {
  const colorScheme = useColorScheme();

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
        if (!status.storeUpdateAvailable && !status.otaAvailable) return;

        await markUpdatePromptShown();

        if (status.storeUpdateAvailable) {
          const message = status.storeVersion
            ? `Version ${status.storeVersion} is available on the Play Store.`
            : "A new version is available on the Play Store.";

          Alert.alert("Update available", message, [
            { text: "Later", style: "cancel" },
            {
              text: "Update",
              onPress: () => {
                void startStoreUpdate("flexible");
              },
            },
          ]);

          return;
        }

        Alert.alert("Update ready", "A new update is ready to install.", [
          { text: "Later", style: "cancel" },
          {
            text: "Update",
            onPress: async () => {
              await applyOtaUpdate();
            },
          },
        ]);
      } catch (error) {
        console.warn("Update check failed", error);
      }
    };

    const timeout = setTimeout(() => {
      void runUpdateCheck();
    }, 10000);

    return () => clearTimeout(timeout);
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
                          <IOSInstallBanner />
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

function WebLayout() {
  return <LayoutShell />;
}

function MobileStack() {
  return <LayoutShell />;
}

export default function RootLayout() {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return null;
  }

  return Platform.OS === "web" ? <WebLayout /> : <MobileStack />;
}
