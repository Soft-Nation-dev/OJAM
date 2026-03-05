import { ThemedText } from "@/components/themed-text";
import { Colors } from "@/constants/theme";
import { useAudioPlayer } from "@/contexts/AudioPlayerContext";
import { useAuth } from "@/contexts/AuthContext";
import { usePlaylists } from "@/contexts/PlaylistsContext";
import { useSermons } from "@/contexts/SermonsContext";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useDownloads } from "@/hooks/use-downloads";
import { useFavorites } from "@/hooks/use-favorites";
import { useNotifications } from "@/hooks/use-notifications";
import { Sermon } from "@/types/sermon";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Image as ExpoImage } from "expo-image";
import { useRouter } from "expo-router";
import React, { useCallback } from "react";
import {
  ScrollView,
  StatusBar,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

function LibraryScreenInner() {
  const colorScheme = useColorScheme();
  const { currentSermon, history } = useAudioPlayer();
  const { user, signOut } = useAuth();
  const { count: favoritesCount } = useFavorites();
  const {
    downloadedSermons,
    getProgress,
    count: downloadsCount,
  } = useDownloads();
  const { loading } = useSermons();
  // Calculate downloads in progress (same logic as downloads page)
  const downloadsInProgress = downloadedSermons.filter((item) => {
    const status = getProgress(item.sermon.id)?.status;
    return status === "downloading" || status === "pending";
  }).length;
  const { playlists: userPlaylists } = usePlaylists();
  const router = useRouter();
  const { notifications } = useNotifications();
  const unreadCount = React.useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications],
  );

  const handleOpenNotifications = useCallback(() => {
    router.push("/notifications" as any);
  }, [router]);

  const handleOpenSettings = useCallback(() => {
    router.push("/settings" as any);
  }, [router]);

  const handleAuthPress = useCallback(() => {
    if (user) {
      signOut();
      return;
    }

    router.push("/auth" as any);
  }, [router, signOut, user]);

  const handleOpenDownloads = useCallback(() => {
    router.push("/downloads");
  }, [router]);

  const handleOpenFavorites = useCallback(() => {
    router.push("/favorites");
  }, [router]);

  const handleOpenPlaylists = useCallback(() => {
    router.push("/playlists");
  }, [router]);

  const handleOpenSermon = useCallback(
    (sermonId: string) => {
      router.push(`/sermon/${sermonId}` as any);
    },
    [router],
  );

  // Show last 10 unique recently played sermons (excluding current if already in history)
  const recentSermons = React.useMemo(() => {
    const safeHistory = Array.isArray(history) ? history : [];
    const all = [...safeHistory].reverse();
    if (currentSermon && !all.find((s) => s.id === currentSermon.id)) {
      all.unshift(currentSermon);
    }
    const unique: Sermon[] = [];
    const seen = new Set();
    for (const s of all) {
      if (!seen.has(s.id)) {
        unique.push(s);
        seen.add(s.id);
      }
      if (unique.length >= 10) break;
    }
    return unique;
  }, [currentSermon, history]);

  return (
    <SafeAreaView
      style={[
        styles.container,
        { backgroundColor: Colors[colorScheme ?? "light"].background },
      ]}
      edges={["top"]}
    >
      <StatusBar
        barStyle={colorScheme === "dark" ? "light-content" : "dark-content"}
      />
      <View style={styles.header}>
        <View>
          <ThemedText type="title" style={styles.title}>
            My Library
          </ThemedText>
          <ThemedText type="default" style={styles.subtitle}>
            Your saved content
          </ThemedText>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={handleOpenNotifications}
          >
            <MaterialIcons
              name={unreadCount > 0 ? "notifications" : "notifications-none"}
              size={24}
              color={Colors[colorScheme ?? "light"].text}
            />
            {unreadCount > 0 ? (
              <View
                style={[
                  styles.notificationBadge,
                  { backgroundColor: Colors[colorScheme ?? "light"].tint },
                ]}
              >
                <ThemedText
                  style={[
                    styles.notificationBadgeText,
                    { color: colorScheme === "dark" ? "red" : "white" },
                  ]}
                >
                  {unreadCount}
                </ThemedText>
              </View>
            ) : null}
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={handleOpenSettings}
          >
            <MaterialIcons
              name="settings"
              size={24}
              color={Colors[colorScheme ?? "light"].text}
            />
          </TouchableOpacity>
        </View>
      </View>
      <View
        style={[
          styles.profileCard,
          { backgroundColor: Colors[colorScheme ?? "light"].tint + "10" },
        ]}
      >
        <ExpoImage
          source={require("@/assets/images/icon.png")}
          style={styles.profileImage}
          contentFit="cover"
        />
        <View style={styles.profileInfo}>
          <ThemedText type="defaultSemiBold" style={styles.profileName}>
            {user
              ? user.user_metadata?.full_name || user.email
              : "Guest Account"}
          </ThemedText>
          <ThemedText type="default" style={styles.profileId}>
            ID: {user ? user.id.slice(0, 8) : "000000"}
          </ThemedText>
        </View>
        <TouchableOpacity
          style={styles.loginButton}
          onPress={handleAuthPress}
          activeOpacity={0.8}
        >
          <ThemedText type="defaultSemiBold" style={styles.loginText}>
            {user ? "Logout" : "Login"}
          </ThemedText>
        </TouchableOpacity>
      </View>

      <View style={styles.quickList}>
        <TouchableOpacity
          style={styles.quickItem}
          onPress={handleOpenDownloads}
          activeOpacity={0.8}
        >
          <View style={styles.quickIconWrap}>
            <MaterialIcons
              name="download"
              size={20}
              color={Colors[colorScheme ?? "light"].text}
            />
          </View>
          <View style={styles.quickInfo}>
            <ThemedText type="defaultSemiBold" style={styles.quickTitle}>
              Downloads
            </ThemedText>
            <ThemedText type="default" style={styles.quickMeta}>
              {downloadsCount} messages
            </ThemedText>
            {downloadsInProgress > 0 && (
              <ThemedText
                style={{ fontSize: 15, color: "#2063FA", marginTop: 2 }}
              >
                {downloadsInProgress} message
                {downloadsInProgress > 1 ? "s" : ""} downloading
              </ThemedText>
            )}
          </View>
          <MaterialIcons
            name="chevron-right"
            size={20}
            color={Colors[colorScheme ?? "light"].tabIconDefault}
          />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.quickItem}
          onPress={handleOpenFavorites}
          activeOpacity={0.8}
        >
          <View style={styles.quickIconWrap}>
            <MaterialIcons
              name="favorite"
              size={20}
              color={Colors[colorScheme ?? "light"].text}
            />
          </View>
          <View style={styles.quickInfo}>
            <ThemedText type="defaultSemiBold" style={styles.quickTitle}>
              Favorites
            </ThemedText>
            <ThemedText type="default" style={styles.quickMeta}>
              {favoritesCount} saved
            </ThemedText>
          </View>
          <MaterialIcons
            name="chevron-right"
            size={20}
            color={Colors[colorScheme ?? "light"].tabIconDefault}
          />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.quickItem}
          onPress={handleOpenPlaylists}
          activeOpacity={0.8}
        >
          <View style={styles.quickIconWrap}>
            <MaterialIcons
              name="queue-music"
              size={20}
              color={Colors[colorScheme ?? "light"].text}
            />
          </View>
          <View style={styles.quickInfo}>
            <ThemedText type="defaultSemiBold" style={styles.quickTitle}>
              Playlists
            </ThemedText>
            <ThemedText type="default" style={styles.quickMeta}>
              {Array.isArray(userPlaylists) ? userPlaylists.length : 0} lists
            </ThemedText>
          </View>
          <MaterialIcons
            name="chevron-right"
            size={20}
            color={Colors[colorScheme ?? "light"].tabIconDefault}
          />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.section}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Recently Played
          </ThemedText>
          {loading ? (
            <ThemedText type="default" style={styles.loadingText}>
              Loading...
            </ThemedText>
          ) : recentSermons.length === 0 ? (
            <ThemedText type="default" style={styles.emptyText}>
              No recent plays yet.
            </ThemedText>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.recentRail}
            >
              {recentSermons.slice(0, 10).map((sermon) => (
                <TouchableOpacity
                  key={sermon.id}
                  style={styles.recentCard}
                  onPress={() => handleOpenSermon(sermon.id)}
                  activeOpacity={0.8}
                >
                  <View style={styles.recentImageWrap}>
                    {sermon.imageUrl ? (
                      <ExpoImage
                        source={{ uri: sermon.imageUrl }}
                        style={styles.recentImage}
                        contentFit="cover"
                      />
                    ) : (
                      <View
                        style={[
                          styles.recentImage,
                          {
                            backgroundColor:
                              Colors[colorScheme ?? "light"].tint + "20",
                          },
                        ]}
                      >
                        <MaterialIcons
                          name="headphones"
                          size={28}
                          color={Colors[colorScheme ?? "light"].tint}
                        />
                      </View>
                    )}
                  </View>
                  <ThemedText
                    type="default"
                    style={styles.recentTitle}
                    numberOfLines={2}
                  >
                    {sermon.title || "Untitled"}
                  </ThemedText>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

export default function LibraryScreen(props: any) {
  return <LibraryScreenInner {...props} />;
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
  },
  subtitle: {
    fontSize: 14,
    opacity: 0.6,
    marginTop: 2,
  },
  headerActions: {
    flexDirection: "row",
    gap: 8,
  },
  iconButton: {
    padding: 8,
  },
  profileCard: {
    marginHorizontal: 16,
    borderRadius: 18,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  profileImage: {
    width: 56,
    height: 56,
    borderRadius: 16,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 16,
  },
  profileId: {
    fontSize: 12,
    opacity: 0.7,
    marginTop: 2,
  },
  loginButton: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: "rgba(0,0,0,0.08)",
  },
  loginText: {
    fontSize: 12,
  },
  quickList: {
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 20,
    gap: 12,
  },
  quickItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: "rgba(0,0,0,0.04)",
    gap: 12,
  },
  quickIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: "rgba(0,0,0,0.06)",
    justifyContent: "center",
    alignItems: "center",
  },
  quickInfo: {
    flex: 1,
  },
  quickTitle: {
    fontSize: 14,
  },
  quickMeta: {
    fontSize: 12,
    opacity: 0.6,
    marginTop: 2,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingBottom: 100,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  emptyText: {
    opacity: 0.6,
    fontSize: 14,
    textAlign: "center",
    paddingHorizontal: 16,
  },
  loadingText: {
    opacity: 0.6,
    fontSize: 14,
    paddingHorizontal: 16,
  },
  recentRail: {
    paddingHorizontal: 16,
    gap: 12,
  },
  recentCard: {
    width: 120,
  },
  recentImageWrap: {
    width: 120,
    height: 120,
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 8,
  },
  recentImage: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  recentTitle: {
    fontSize: 12,
  },
  notificationBadge: {
    position: "absolute",
    top: 1,
    right: 3,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "rgba(0,0,0,0.8)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1,
  },
  notificationBadgeText: {
    fontSize: 12,
    fontWeight: "bold",
  },
});
