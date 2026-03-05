import { PlaylistCard } from "@/components/playlist-card";
import { SermonRowCard } from "@/components/sermon-row-card";
import { ThemedText } from "@/components/themed-text";
import { Colors } from "@/constants/theme";
import { useAudioPlayer } from "@/contexts/AudioPlayerContext";
import { useSermons } from "@/contexts/SermonsContext";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { fetchPlaylists } from "@/lib/playlists";
import { Playlist } from "@/types/sermon";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  FlatList,
  RefreshControl,
  StatusBar,
  StyleSheet,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

type CategoryType = {
  id: string;
  name: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  color: string;
};

const EXPLORE_CATEGORIES: CategoryType[] = [
  { id: "all", name: "All Messages", icon: "grid-view", color: "#3b82f6" },
  { id: "friday", name: "Friday LSTS", icon: "event", color: "#8b5cf6" },
  { id: "sunday", name: "Sunday Service", icon: "church", color: "#ec4899" },
  {
    id: "tuesday",
    name: "Tuesday",
    icon: "calendar-today",
    color: "#f59e0b",
  },
  { id: "worship", name: "Worship", icon: "music-note", color: "#10b981" },
  { id: "prayer", name: "Prayer", icon: "favorite", color: "#ef4444" },
];

const DAY_CATEGORIES = new Set(["friday", "sunday", "tuesday"]);

type ExploreBlock = "categories" | "topMessages" | "featuredSeries";

const EXPLORE_BLOCKS: ExploreBlock[] = [
  "categories",
  "topMessages",
  "featuredSeries",
];

export default function ExploreScreen() {
  const colorScheme = useColorScheme();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { currentSermon } = useAudioPlayer();
  const { sermons, refresh: refreshSermons } = useSermons();

  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const MINI_PLAYER_HEIGHT = 72;

  const loadData = useCallback(async (forceRefresh = false) => {
    const fetchedPlaylists = await fetchPlaylists({
      forceRefresh,
      includeSermons: false,
    });
    setPlaylists(fetchedPlaylists);
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([loadData(true), refreshSermons(true)]);
    } finally {
      setRefreshing(false);
    }
  }, [loadData, refreshSermons]);

  const topSermons = useMemo(
    () =>
      [...sermons].sort((a, b) => (b.plays || 0) - (a.plays || 0)).slice(0, 6),
    [sermons],
  );

  const categoryCounts = useMemo(() => {
    const counts = new Map<string, number>();
    sermons.forEach((sermon) => {
      // Count by category for day-based, by genre for genre-based
      if (sermon.category) {
        counts.set(sermon.category, (counts.get(sermon.category) ?? 0) + 1);
      }
      if (sermon.genre) {
        const genreKey = sermon.genre.toLowerCase();
        counts.set(genreKey, (counts.get(genreKey) ?? 0) + 1);
      }
    });
    return counts;
  }, [sermons]);

  const cardSize = useMemo(() => (width - 48) / 2, [width]);
  const categoryCardWidth = useMemo(() => Math.round(width * 0.72), [width]);

  const dynamicBottomPadding = useMemo(
    () => 24 + insets.bottom + (currentSermon ? MINI_PLAYER_HEIGHT : 0),
    [currentSermon, insets.bottom],
  );

  const handleOpenCategory = useCallback(
    (categoryId: string) => {
      router.push({
        pathname: "/see-all/latest",
        params: { category: categoryId },
      } as any);
    },
    [router],
  );

  const handleOpenSeeAllLatest = useCallback(() => {
    router.push("/see-all/latest" as any);
  }, [router]);

  const handleOpenSeeAllSeries = useCallback(() => {
    router.push("/see-all/series" as any);
  }, [router]);

  const handleOpenSermon = useCallback(
    (sermonId: string) => {
      router.push(`/sermon/${sermonId}` as any);
    },
    [router],
  );

  const handleOpenPlaylist = useCallback(
    (playlistId: string) => {
      router.push(`/playlist/${playlistId}` as any);
    },
    [router],
  );

  const renderExploreBlock = useCallback(
    ({ item }: { item: ExploreBlock }) => {
      switch (item) {
        case "categories":
          return (
            <View style={styles.section}>
              <View style={styles.sectionHeaderBlock}>
                <ThemedText type="subtitle" style={styles.sectionTitle}>
                  Browse by Category
                </ThemedText>
                <ThemedText type="default" style={styles.sectionSubtitle}>
                  Curated lanes to jump straight in
                </ThemedText>
              </View>

              <FlatList
                data={EXPLORE_CATEGORIES}
                keyExtractor={(item) => item.id}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.categoryRail}
                initialNumToRender={3}
                maxToRenderPerBatch={4}
                windowSize={3}
                removeClippedSubviews
                renderItem={({ item: category }) => (
                  <TouchableOpacity
                    style={[
                      styles.categoryCard,
                      {
                        backgroundColor: category.color + "12",
                        borderColor: category.color + "30",
                        width: categoryCardWidth,
                      },
                    ]}
                    onPress={() => handleOpenCategory(category.id)}
                  >
                    <View style={styles.categoryHeader}>
                      <View
                        style={[
                          styles.categoryIcon,
                          { backgroundColor: category.color },
                        ]}
                      >
                        <MaterialIcons
                          name={category.icon}
                          size={22}
                          color="#fff"
                        />
                      </View>

                      <View
                        style={[
                          styles.categoryBadge,
                          { borderColor: category.color + "55" },
                        ]}
                      >
                        <ThemedText style={styles.categoryBadgeText}>
                          {category.id === "all"
                            ? sermons.length
                            : DAY_CATEGORIES.has(category.id)
                              ? (categoryCounts.get(category.id) ?? 0)
                              : (categoryCounts.get(
                                  category.name.toLowerCase(),
                                ) ?? 0)}{" "}
                          messages
                        </ThemedText>
                      </View>
                    </View>

                    <ThemedText type="title" style={styles.categoryName}>
                      {category.name}
                    </ThemedText>

                    <View style={styles.categoryFooter}>
                      <ThemedText
                        type="defaultSemiBold"
                        style={styles.categoryCta}
                      >
                        Explore
                      </ThemedText>
                      <MaterialIcons
                        name="arrow-forward"
                        size={18}
                        color={Colors[colorScheme ?? "light"].text}
                      />
                    </View>
                  </TouchableOpacity>
                )}
              />
            </View>
          );
        case "topMessages":
          return (
            <View style={styles.section}>
              <View style={styles.sectionHeaderRow}>
                <ThemedText type="subtitle" style={styles.sectionTitle}>
                  Top Messages
                </ThemedText>
                <TouchableOpacity onPress={handleOpenSeeAllLatest}>
                  <ThemedText
                    type="link"
                    style={{ color: Colors[colorScheme ?? "light"].tint }}
                  >
                    See All
                  </ThemedText>
                </TouchableOpacity>
              </View>

              <FlatList
                data={topSermons}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <SermonRowCard
                    sermon={item}
                    onPress={() => handleOpenSermon(item.id)}
                  />
                )}
                scrollEnabled={false}
                removeClippedSubviews
                initialNumToRender={6}
                maxToRenderPerBatch={6}
                windowSize={5}
                contentContainerStyle={styles.sermonsList}
              />
            </View>
          );
        case "featuredSeries":
          return (
            <View style={styles.section}>
              <View style={styles.sectionHeaderRow}>
                <ThemedText type="subtitle" style={styles.sectionTitle}>
                  Featured Series
                </ThemedText>
                <TouchableOpacity onPress={handleOpenSeeAllSeries}>
                  <ThemedText
                    type="link"
                    style={{ color: Colors[colorScheme ?? "light"].tint }}
                  >
                    See All
                  </ThemedText>
                </TouchableOpacity>
              </View>

              <FlatList
                data={playlists}
                keyExtractor={(item) => item.id}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.horizontalScroll}
                initialNumToRender={4}
                maxToRenderPerBatch={5}
                windowSize={3}
                removeClippedSubviews
                renderItem={({ item: playlist }) => (
                  <View style={{ width: cardSize }}>
                    <PlaylistCard
                      playlist={playlist}
                      onPress={() => handleOpenPlaylist(playlist.id)}
                    />
                  </View>
                )}
              />
            </View>
          );
        default:
          return null;
      }
    },
    [
      cardSize,
      categoryCardWidth,
      categoryCounts,
      colorScheme,
      handleOpenCategory,
      handleOpenPlaylist,
      handleOpenSeeAllLatest,
      handleOpenSeeAllSeries,
      handleOpenSermon,
      playlists,
      sermons.length,
      topSermons,
    ],
  );

  const keyExtractor = useCallback((item: ExploreBlock) => item, []);

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
        <ThemedText type="title" style={styles.title}>
          Explore
        </ThemedText>
        <ThemedText type="default" style={styles.subtitle}>
          Discover messages & series
        </ThemedText>
      </View>

      <FlatList
        style={styles.scrollView}
        data={EXPLORE_BLOCKS}
        keyExtractor={keyExtractor}
        renderItem={renderExploreBlock}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: dynamicBottomPadding },
        ]}
        showsVerticalScrollIndicator={false}
        initialNumToRender={3}
        maxToRenderPerBatch={3}
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
  container: { flex: 1 },

  header: {
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
    marginTop: 4,
  },

  scrollView: { flex: 1 },

  content: {},

  section: { marginBottom: 32 },

  sectionHeaderBlock: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },

  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    marginBottom: 16,
  },

  sectionTitle: {
    fontSize: 20,
    fontWeight: "600",
  },

  sectionSubtitle: {
    fontSize: 13,
    opacity: 0.6,
    marginTop: 4,
  },

  categoryRail: {
    paddingHorizontal: 16,
    paddingTop: 14,
    gap: 14,
  },

  categoryCard: {
    padding: 18,
    borderRadius: 20,
    borderWidth: 1,
    gap: 12,
    minHeight: 170,
    justifyContent: "space-between",
  },

  categoryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  categoryIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },

  categoryBadge: {
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },

  categoryBadgeText: {
    fontSize: 11,
    opacity: 0.75,
  },

  categoryName: {
    fontSize: 18,
  },

  categoryFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  categoryCta: {
    fontSize: 13,
  },

  horizontalScroll: {
    paddingHorizontal: 16,
    gap: 12,
  },

  sermonsList: {
    paddingHorizontal: 16,
  },
});
