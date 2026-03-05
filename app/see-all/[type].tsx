import { PlaylistCard } from "@/components/playlist-card";
import { SeeAllCard } from "@/components/see-all-card";
import { SermonRowCard } from "@/components/sermon-row-card";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Colors } from "@/constants/theme";
import { useAudioPlayer } from "@/contexts/AudioPlayerContext";
import { useSermons } from "@/contexts/SermonsContext";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { fetchPlaylists } from "@/lib/playlists";
import { Playlist, Sermon } from "@/types/sermon";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { FlatList, StyleSheet, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const TITLES: Record<string, { title: string; subtitle: string }> = {
  latest: {
    title: "Latest Messages",
    subtitle: "Freshly added sermons",
  },
  series: {
    title: "Series for You",
    subtitle: "Curated collections",
  },
  trending: {
    title: "Trending Series",
    subtitle: "Popular right now",
  },
};

export default function SeeAllScreen() {
  const { type, category } = useLocalSearchParams<{
    type: string;
    category?: string;
  }>();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const { playFromList } = useAudioPlayer();
  const { sermons, loading: sermonsLoading } = useSermons();
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [playlistsLoading, setPlaylistsLoading] = useState(true);

  const typeKey = Array.isArray(type) ? type[0] : type;
  const categoryKey = Array.isArray(category) ? category[0] : category;
  const header = TITLES[typeKey] || {
    title: "See All",
    subtitle: "Browse everything",
  };
  const subtitle =
    typeKey === "latest" && categoryKey && categoryKey !== "all"
      ? `${categoryKey.charAt(0).toUpperCase() + categoryKey.slice(1)} messages`
      : header.subtitle;

  useEffect(() => {
    const load = async () => {
      const fetchedPlaylists = await fetchPlaylists({ includeSermons: false });
      setPlaylists(fetchedPlaylists ?? []);
      setPlaylistsLoading(false);
    };
    load();
  }, []);

  const loading = sermonsLoading || playlistsLoading;

  // Dynamically get all unique genres from sermons
  const allGenres = useMemo(() => {
    const genreSet = new Set<string>();
    sermons.forEach((sermon) => {
      if (sermon.genre) genreSet.add(sermon.genre.toLowerCase());
    });
    return Array.from(genreSet);
  }, [sermons]);

  const latestSermons = useMemo(() => {
    const sorted = [...sermons].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );

    if (categoryKey && categoryKey !== "all") {
      // If the categoryKey matches any genre, filter by genre
      if (allGenres.includes(categoryKey.toLowerCase())) {
        return sorted.filter(
          (sermon) =>
            sermon.genre &&
            sermon.genre.toLowerCase() === categoryKey.toLowerCase(),
        );
      } else {
        // Otherwise, filter by category
        return sorted.filter((sermon) => sermon.category === categoryKey);
      }
    }

    return sorted;
  }, [sermons, categoryKey, allGenres]);

  const trendingPlaylists = useMemo(
    () =>
      [...playlists].sort(
        (a, b) => (b.sermons.length || 0) - (a.sermons.length || 0),
      ),
    [playlists],
  );

  const seriesList = typeKey === "trending" ? trendingPlaylists : playlists;

  const renderLatestItem = useCallback(
    ({ item }: { item: Sermon }) => (
      <SermonRowCard
        sermon={item}
        onPress={() => {
          playFromList(latestSermons, item.id);
          router.push("/player");
        }}
      />
    ),
    [latestSermons, playFromList, router],
  );

  const renderSeriesItem = useCallback(
    ({ item }: { item: Playlist }) => (
      <View style={styles.gridItem}>
        <PlaylistCard
          playlist={item}
          onPress={() => router.push(`/playlist/${item.id}`)}
          style={styles.gridCard}
        />
      </View>
    ),
    [router],
  );

  const keyExtractorLatest = useCallback((item: Sermon) => item.id, []);
  const keyExtractorSeries = useCallback((item: Playlist) => item.id, []);

  const footer = useMemo(
    () => (
      <View style={styles.footerCard}>
        <SeeAllCard
          title="Back to Home"
          subtitle="Keep exploring"
          onPress={() => router.push("/")}
          size="full"
        />
      </View>
    ),
    [router],
  );

  const seriesEmpty = useMemo(
    () =>
      (typeKey === "series" || typeKey === "trending") &&
      seriesList.length === 0 ? (
        <View style={styles.emptyState}>
          <MaterialIcons
            name="queue-music"
            size={44}
            color={Colors[colorScheme ?? "light"].tabIconDefault}
          />
          <ThemedText type="default" style={styles.emptyText}>
            No series found.
          </ThemedText>
        </View>
      ) : null,
    [colorScheme, seriesList.length, typeKey],
  );

  return (
    <SafeAreaView
      style={[
        styles.safeArea,
        { backgroundColor: Colors[colorScheme ?? "light"].background },
      ]}
      edges={["top", "bottom"]}
    >
      <ThemedView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <MaterialIcons
              name="arrow-back"
              size={24}
              color={Colors[colorScheme ?? "light"].text}
            />
          </TouchableOpacity>
          <View style={styles.headerText}>
            <ThemedText type="title" style={styles.title}>
              {header.title}
            </ThemedText>
            <ThemedText type="default" style={styles.subtitle}>
              {subtitle}
            </ThemedText>
          </View>
          <View style={styles.headerSpacer} />
        </View>

        {loading ? (
          <View style={styles.content}>
            <ThemedText type="default">Loading...</ThemedText>
          </View>
        ) : typeKey === "latest" ? (
          <FlatList
            data={latestSermons}
            keyExtractor={keyExtractorLatest}
            renderItem={renderLatestItem}
            contentContainerStyle={[styles.content, styles.listSection]}
            initialNumToRender={10}
            maxToRenderPerBatch={10}
            windowSize={7}
            removeClippedSubviews
            ListFooterComponent={footer}
          />
        ) : (
          <FlatList
            data={seriesList}
            keyExtractor={keyExtractorSeries}
            renderItem={renderSeriesItem}
            numColumns={2}
            columnWrapperStyle={styles.gridColumn}
            contentContainerStyle={[styles.content, styles.grid]}
            initialNumToRender={8}
            maxToRenderPerBatch={8}
            windowSize={7}
            removeClippedSubviews
            ListEmptyComponent={seriesEmpty}
            ListFooterComponent={footer}
          />
        )}
      </ThemedView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },
  backButton: {
    padding: 8,
  },
  headerText: {
    flex: 1,
  },
  headerSpacer: {
    width: 40,
  },
  title: {
    fontSize: 20,
  },
  subtitle: {
    fontSize: 13,
    opacity: 0.7,
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  listSection: {
    marginTop: 12,
  },
  grid: {
    marginTop: 8,
  },
  gridColumn: {
    justifyContent: "space-between",
  },
  gridItem: {
    width: "48%",
    marginBottom: 16,
  },
  gridCard: {
    width: "100%",
    marginRight: 0,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 32,
    width: "100%",
  },
  emptyText: {
    marginTop: 12,
    opacity: 0.7,
  },
  footerCard: {
    marginTop: 16,
  },
});
