import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Tabs } from "expo-router";
import React from "react";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { HapticTab } from "@/components/haptic-tab";
import { MiniPlayer } from "@/components/mini-player";
import { Colors } from "@/constants/theme";
import { useAudioPlayer } from "@/contexts/AudioPlayerContext";
import { useColorScheme } from "@/hooks/use-color-scheme";

export default function TabLayout() {
  return <TabLayoutInner />;
}

function TabLayoutInner() {
  const colorScheme = useColorScheme();
  const { currentSermon } = useAudioPlayer();
  const insets = useSafeAreaInsets();

  const TAB_BAR_HEIGHT = 60; // fixed tab bar height
  const MINI_PLAYER_HEIGHT = 72; // height of your mini player

  const tabBarPaddingBottom = 10 + insets.bottom;

  return (
    <View style={styles.container}>
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: Colors[colorScheme ?? "light"].tint,
          tabBarInactiveTintColor:
            Colors[colorScheme ?? "light"].tabIconDefault,
          headerShown: false,
          tabBarButton: HapticTab,
          tabBarStyle: {
            paddingBottom: tabBarPaddingBottom,
            paddingTop: 8,
            height: TAB_BAR_HEIGHT + insets.bottom, // fixed height
            backgroundColor: colorScheme === "dark" ? "#1a1a1a" : "#ffffff",
            borderTopWidth: 0,
            elevation: 20,
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: "Home",
            tabBarIcon: ({ color }) => (
              <MaterialIcons name="home" size={30} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="search"
          options={{
            title: "Search",
            tabBarIcon: ({ color }) => (
              <MaterialIcons name="search" size={30} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="explore"
          options={{
            title: "Explore",
            tabBarIcon: ({ color }) => (
              <MaterialIcons name="explore" size={30} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="library"
          options={{
            title: "My Library",
            tabBarIcon: ({ color }) => (
              <MaterialIcons name="video-library" size={30} color={color} />
            ),
          }}
        />
        <Tabs.Screen name="downloads" options={{ href: null }} />
        <Tabs.Screen name="favorites" options={{ href: null }} />
        <Tabs.Screen name="playlists" options={{ href: null }} />
      </Tabs>

      {currentSermon && (
        <View
          pointerEvents="box-none"
          style={[
            styles.miniPlayerContainer,
            {
              bottom: 0,
              height: MINI_PLAYER_HEIGHT,
              zIndex: 10,
            },
          ]}
        >
          <MiniPlayer />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  miniPlayerContainer: {
    position: "absolute",
    left: 0,
    right: 0,
  },
});
