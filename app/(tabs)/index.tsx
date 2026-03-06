import LatestMessages from "@/components/latest-messages";
import { PlaylistCard } from "@/components/playlist-card";
import Reminder from "@/components/reminder";
import { SeeAllCard } from "@/components/see-all-card";
import { ThemedText } from "@/components/themed-text";
import TabMenu from "@/components/ui/tab-menu";
import { Colors } from "@/constants/theme";
import { useAudioPlayer } from "@/contexts/AudioPlayerContext";
import { useSermons } from "@/contexts/SermonsContext";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useNotifications } from "@/hooks/use-notifications";
import { fetchPlaylists } from "@/lib/playlists";
import { Playlist, Sermon } from "@/types/sermon";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
    FlatList,
    Image,
    RefreshControl,
    StatusBar,
    StyleSheet,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type TabType = "all" | "friday" | "sunday" | "tuesday";

const HOME_TABS: { id: TabType; label: string }[] = [
  { id: "all", label: "All" },
  { id: "friday", label: "Friday LSTS Messages" },
  { id: "sunday", label: "Sunday Messages" },
  { id: "tuesday", label: "Tuesday Messages" },
];

type HomeBlock =
  | "reminder"
  | "tabs"
  | "latest"
  | "seriesForYou"
  | "trendingSeries"
  | "intro";

const HOME_BLOCKS: HomeBlock[] = [
  "reminder",
  "tabs",
  "latest",
  "seriesForYou",
  "trendingSeries",
  "intro",
];

export default function HomeScreen() {
  const { notifications } = useNotifications();
  const unreadCount = React.useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications],
  );
  const colorScheme = useColorScheme();
  const router = useRouter();
  const { playFromList } = useAudioPlayer();
  const {
    sermons,
    loading: sermonsLoading,
    refresh: refreshSermons,
  } = useSermons();
  const [activeTab, setActiveTab] = useState<TabType>("all");
  const [refreshing, setRefreshing] = useState(false);

  const [playlistsLoading, setPlaylistsLoading] = useState(true);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);

  const loadPlaylists = useCallback(async (forceRefresh = false) => {
    const fetchedPlaylists = await fetchPlaylists({
      forceRefresh,
      includeSermons: false,
    });
    setPlaylists(fetchedPlaylists);
  }, []);

  useEffect(() => {
    const init = async () => {
      try {
        await loadPlaylists();
      } finally {
        setPlaylistsLoading(false);
      }
    };
    void init();
  }, [loadPlaylists]);

  const loading = sermonsLoading || playlistsLoading;

  const filteredSermons = React.useMemo(() => {
    switch (activeTab) {
      case "all":
        return sermons;
      case "friday":
        return sermons.filter((s) => s.category === "friday");
      case "sunday":
        return sermons.filter((s) => s.category === "sunday");
      case "tuesday":
        return sermons.filter((s) => s.category === "tuesday");
      default:
        return sermons;
    }
  }, [activeTab, sermons]);

  const sortedFilteredSermons = React.useMemo(
    () =>
      [...filteredSermons].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
      ),
    [filteredSermons],
  );

  const latestSermons = React.useMemo(
    () => sortedFilteredSermons.slice(0, 6),
    [sortedFilteredSermons],
  );

  const queueSermons = React.useMemo(
    () => sortedFilteredSermons,
    [sortedFilteredSermons],
  );

  const recommendedPlaylists = React.useMemo(
    () => playlists.slice(0, 4),
    [playlists],
  );

  const trendingPlaylists = React.useMemo(
    () => playlists.slice(0, 4),
    [playlists],
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([refreshSermons(true), loadPlaylists(true)]);
    } finally {
      setRefreshing(false);
    }
  }, [loadPlaylists, refreshSermons]);

  const handleOpenNotifications = useCallback(() => {
    router.push("/notifications" as any);
  }, [router]);

  const handleOpenSettings = useCallback(() => {
    router.push("/settings" as any);
  }, [router]);

  const handleOpenPlaylist = useCallback(
    (playlistId: string) => {
      router.push(`/playlist/${playlistId}` as any);
    },
    [router],
  );

  const handleSermonPress = useCallback(
    (sermon: Sermon) => {
      void playFromList(queueSermons, sermon.id)
        .then(() => {
          router.push("/player");
        })
        .catch((error) => {
          console.error("[Home] Failed to start playback", error);
          router.push("/player");
        });
    },
    [playFromList, queueSermons, router],
  );

  const handleSeeAllLatest = useCallback(() => {
    router.push({
      pathname: "/see-all/latest",
      params: { category: activeTab },
    } as any);
  }, [activeTab, router]);

  const renderHomeBlock = useCallback(
    ({ item }: { item: HomeBlock }) => {
      switch (item) {
        case "reminder":
          return <Reminder />;
        case "tabs":
          return (
            <TabMenu
              tabs={HOME_TABS}
              activeTab={activeTab}
              onTabPress={setActiveTab}
            />
          );
        case "latest":
          return loading ? (
            <View style={styles.loadingContainer}>
              <ThemedText type="default">Loading sermons...</ThemedText>
            </View>
          ) : (
            <LatestMessages
              sermons={latestSermons}
              totalCount={filteredSermons.length}
              onSermonPress={handleSermonPress}
              onSeeAllPress={handleSeeAllLatest}
            />
          );
        case "seriesForYou":
          return (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <ThemedText type="subtitle" style={styles.sectionTitle}>
                  Series for You
                </ThemedText>
              </View>
              <FlatList
                data={recommendedPlaylists}
                keyExtractor={(item) => item.id}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.playlistScroll}
                initialNumToRender={3}
                maxToRenderPerBatch={4}
                windowSize={3}
                removeClippedSubviews
                renderItem={({ item: playlist }) => (
                  <PlaylistCard
                    playlist={playlist}
                    onPress={() => handleOpenPlaylist(playlist.id)}
                  />
                )}
                ListFooterComponent={
                  <SeeAllCard
                    title="See all series"
                    subtitle="Explore every collection"
                    count={playlists.length}
                    onPress={() => router.push("/see-all/series" as any)}
                  />
                }
              />
            </View>
          );
        case "trendingSeries":
          return (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <ThemedText type="subtitle" style={styles.sectionTitle}>
                  Trending Series
                </ThemedText>
              </View>
              <FlatList
                data={trendingPlaylists}
                keyExtractor={(item) => item.id}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.playlistScroll}
                initialNumToRender={3}
                maxToRenderPerBatch={4}
                windowSize={3}
                removeClippedSubviews
                renderItem={({ item: playlist }) => (
                  <PlaylistCard
                    playlist={playlist}
                    onPress={() => handleOpenPlaylist(playlist.id)}
                  />
                )}
                ListFooterComponent={
                  <SeeAllCard
                    title="See trending"
                    subtitle="What listeners love"
                    count={playlists.length}
                    onPress={() => router.push("/see-all/trending" as any)}
                  />
                }
              />
            </View>
          );
        case "intro":
          return (
            <View
              style={[
                styles.introSection,
                {
                  backgroundColor: Colors[colorScheme ?? "light"].tint + "10",
                  borderColor: Colors[colorScheme ?? "light"].tint + "30",
                },
              ]}
            >
              <MaterialIcons
                name="info"
                size={24}
                color={Colors[colorScheme ?? "light"].tint}
                style={styles.introIcon}
              />
              <ThemedText type="subtitle" style={styles.introTitle}>
                Welcome to Ojam
              </ThemedText>
              <ThemedText type="default" style={styles.introText}>
                Your spiritual companion for streaming messages from Oluchi
                Japhat Aniagwu. Discover inspiring content, immerse yourself in
                messages inspired by God through Our Father in the Lord, create
                playlists, and grow in faith wherever you are. Download sermons
                for offline listening and never miss a message.
              </ThemedText>
            </View>
          );
        default:
          return null;
      }
    },
    [
      activeTab,
      colorScheme,
      filteredSermons.length,
      handleOpenPlaylist,
      handleSeeAllLatest,
      handleSermonPress,
      latestSermons,
      loading,
      playlists.length,
      recommendedPlaylists,
      router,
      trendingPlaylists,
    ],
  );

  const keyExtractor = useCallback((item: HomeBlock) => item, []);

  return (
    <SafeAreaView
      style={[
        styles.container,
        {
          backgroundColor: Colors[colorScheme ?? "light"].background,
        },
      ]}
      edges={["top"]}
    >
      <StatusBar
        barStyle={colorScheme === "dark" ? "light-content" : "dark-content"}
      />

      {/* Header */}
      <View
        style={[
          styles.header,
          {
            borderBottomColor:
              Colors[colorScheme ?? "light"].tabIconDefault + "20",
          },
        ]}
      >
        <View style={styles.headerLeft}>
          <View
            style={[
              styles.logoContainer,
              {
                backgroundColor: Colors[colorScheme ?? "light"].tint,
              },
            ]}
          >
            <Image
              source={require("@/assets/images/icon.png")}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>
          <ThemedText type="title" style={styles.logoText}>
            Ojam
          </ThemedText>
        </View>
        <View style={styles.headerRight}>
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

      <FlatList
        data={HOME_BLOCKS}
        keyExtractor={keyExtractor}
        renderItem={renderHomeBlock}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        initialNumToRender={4}
        maxToRenderPerBatch={4}
        windowSize={5}
        removeClippedSubviews
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[Colors[colorScheme ?? "light"].tint]}
            tintColor={Colors[colorScheme ?? "light"].tint}
            progressBackgroundColor={Colors[colorScheme ?? "light"].background}
            titleColor={Colors[colorScheme ?? "light"].text}
          />
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
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
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  logoContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  logoImage: {
    width: "100%",
    height: "100%",
  },
  logoText: {
    fontSize: 24,
    fontWeight: "bold",
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  iconButton: {
    padding: 8,
  },
  content: {
    paddingBottom: 120,
  },
  loadingContainer: {
    padding: 16,
    alignItems: "center",
  },
  playlistScroll: {
    paddingHorizontal: 16,
    paddingRight: 32,
    gap: 16,
  },
  introSection: {
    margin: 16,
    padding: 10,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
  },
  introIcon: {
    marginBottom: 12,
  },
  introTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 8,
    textAlign: "center",
  },
  introText: {
    fontSize: 14,
    lineHeight: 22,
    textAlign: "center",
    opacity: 0.8,
  },
  section: {
    marginTop: 24,
  },

  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    marginBottom: 12,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
});
