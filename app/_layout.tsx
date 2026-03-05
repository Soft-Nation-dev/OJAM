import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import "react-native-reanimated";

import { AudioPlayerProvider } from "@/contexts/AudioPlayerContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { DownloadsProvider } from "@/contexts/DownloadsContext";
import { FavoritesProvider } from "@/contexts/FavoritesContext";
import { NotificationProvider } from "@/contexts/NotificationContext";
import { PlaylistsProvider } from "@/contexts/PlaylistsContext";
import { SermonsProvider } from "@/contexts/SermonsContext";
import { SettingsProvider } from "@/contexts/SettingsContext";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { initializeTrackPlayer } from "@/services/track-player";
import { useEffect } from "react";

export const unstable_settings = {
  anchor: "(tabs)",
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  useEffect(() => {
    void initializeTrackPlayer().catch(() => {});
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AudioPlayerProvider>
        <NotificationProvider>
          <AuthProvider>
            <SettingsProvider>
              <SermonsProvider>
                <FavoritesProvider>
                  <DownloadsProvider>
                    <PlaylistsProvider>
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
      </AudioPlayerProvider>
    </GestureHandlerRootView>
  );
}
