import SelectPlaylistMessagesModal from "@/components/SelectPlaylistMessagesModal";
import { SermonRowCard } from "@/components/sermon-row-card";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Colors } from "@/constants/theme";
import { useAudioPlayer } from "@/contexts/AudioPlayerContext";
import { usePlaylists } from "@/contexts/PlaylistsContext";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useNotifications } from "@/hooks/use-notifications";
import { fetchPlaylistById } from "@/lib/playlists";
import { Playlist, Sermon } from "@/types/sermon";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Image as ExpoImage } from "expo-image";
import {
  useGlobalSearchParams,
  useLocalSearchParams,
  useRouter,
} from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function PlaylistDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const globalParams = useGlobalSearchParams();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const { playFromList } = useAudioPlayer();
  const { userPlaylists, updatePlaylist, removePlaylist } = usePlaylists();

  const { addNotification } = useNotifications();

  const [sortOption, setSortOption] = useState<"recent" | "plays" | "title">(
    "recent",
  );
  const [showSelectModal, setShowSelectModal] = useState(false);
  const [remotePlaylist, setRemotePlaylist] = useState<Playlist | null>(null);
  const [loading, setLoading] = useState(true);

  const playlistId = Array.isArray(id) ? id[0] : id;
  const isUserPlaylist = globalParams.user === "1";

  const playlist = isUserPlaylist
    ? userPlaylists.find((p) => p.id === playlistId) || null
    : null;

  useEffect(() => {
    const loadPlaylist = async () => {
      if (!isUserPlaylist) {
        setLoading(true);
        const found = await fetchPlaylistById(playlistId);
        setRemotePlaylist(found);
        setLoading(false);
      } else {
        setLoading(false);
      }
    };
    loadPlaylist();
  }, [playlistId, isUserPlaylist, userPlaylists]);

  const currentPlaylist = isUserPlaylist ? playlist : remotePlaylist;
  const sermonCount = currentPlaylist?.sermons.length ?? 0;

  const totalDuration = useMemo(() => {
    if (!currentPlaylist) return 0;
    return currentPlaylist.sermons.reduce(
      (sum, sermon) => sum + (sermon.duration || 0),
      0,
    );
  }, [currentPlaylist]);

  const sortedSermons = useMemo(() => {
    if (!currentPlaylist) return [] as Sermon[];
    const list = [...currentPlaylist.sermons];
    switch (sortOption) {
      case "plays":
        return list.sort((a, b) => (b.plays || 0) - (a.plays || 0));
      case "title":
        return list.sort((a, b) =>
          (a.title || "").localeCompare(b.title || ""),
        );
      case "recent":
      default:
        return list.sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
        );
    }
  }, [currentPlaylist, sortOption]);

  const handlePlayAll = () => {
    if (!sortedSermons.length) return;
    playFromList(sortedSermons, sortedSermons[0]?.id);
    router.push("/player");
  };

  const handleAddMessages = () => setShowSelectModal(true);

  const handleSelectMessages = (sermons: Sermon[]) => {
    if (!currentPlaylist) return;
    const existingIds = new Set(currentPlaylist.sermons.map((s) => s.id));
    const newSermons = sermons.filter((s) => !existingIds.has(s.id));
    const updated = {
      ...currentPlaylist,
      sermons: [...currentPlaylist.sermons, ...newSermons],
    };
    if (isUserPlaylist) updatePlaylist(updated);
    else setRemotePlaylist(updated);
    setShowSelectModal(false);
  };

  const handleCancelSelect = () => setShowSelectModal(false);

  const handleDeletePlaylist = () => {
    if (!isUserPlaylist || !currentPlaylist) return;
    Alert.alert(
      "Delete Playlist",
      `Are you sure you want to delete '${currentPlaylist.name}'? This cannot be undone!`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            removePlaylist(currentPlaylist.id);
            addNotification({
              title: "Playlist Deleted",
              message: `Playlist '${currentPlaylist.name}' was deleted`,
              type: "playlist",
            });
            router.replace("/playlists");
          },
        },
      ],
      { cancelable: true },
    );
  };

  const handleRemoveSermon = (sermonId: string) => {
    if (!currentPlaylist) return;

    Alert.alert(
      "Remove Message",
      "Are you sure you want to remove this message from the playlist?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => {
            const updated = {
              ...currentPlaylist,
              sermons: currentPlaylist.sermons.filter((s) => s.id !== sermonId),
            };
            if (isUserPlaylist) {
              updatePlaylist(updated);
            } else {
              setRemotePlaylist(updated);
            }
          },
        },
      ],
      { cancelable: true },
    );
  };

  const renderSermonItem = ({ item: sermon }: { item: Sermon }) => (
    <SermonRowCard
      sermon={sermon}
      onPress={() => {
        playFromList(sortedSermons, sermon.id);
        router.push("/player");
      }}
      onRemoveFromPlaylist={() => handleRemoveSermon(sermon.id)}
      showRemoveFromPlaylist={true}
    />
  );

  if (loading) {
    return (
      <ThemedView style={{ flex: 1 }}>
        <ThemedText type="default">Loading...</ThemedText>
      </ThemedView>
    );
  }

  if (!currentPlaylist) {
    return (
      <ThemedView
        style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
      >
        <ThemedText type="default">Series not found.</ThemedText>
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ marginTop: 12 }}
        >
          <ThemedText type="default">Go back</ThemedText>
        </TouchableOpacity>
      </ThemedView>
    );
  }

  return (
    <SafeAreaView
      style={{
        flex: 1,
        backgroundColor: Colors[colorScheme ?? "light"].background,
      }}
      edges={["top", "bottom"]}
    >
      <ThemedView style={{ flex: 1 }}>
        {/* Header */}
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
          <ThemedText type="title" style={styles.headerTitle}>
            {currentPlaylist.name}
          </ThemedText>
          {isUserPlaylist ? (
            <TouchableOpacity
              onPress={handleDeletePlaylist}
              style={styles.headerSpacer}
              accessibilityLabel="Delete Playlist"
            >
              <MaterialIcons name="delete" size={24} color="#E53935" />
            </TouchableOpacity>
          ) : (
            <View style={styles.headerSpacer} />
          )}
        </View>

        <FlatList
          data={sortedSermons}
          keyExtractor={(item) => item.id}
          renderItem={renderSermonItem}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          removeClippedSubviews
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          windowSize={7}
          ListHeaderComponent={
            <View style={styles.hero}>
              {currentPlaylist.imageUrl ? (
                <ExpoImage
                  source={{ uri: currentPlaylist.imageUrl }}
                  style={styles.heroImage}
                  contentFit="cover"
                  cachePolicy="disk"
                  recyclingKey={`playlist-detail-artwork-${currentPlaylist.id}`}
                />
              ) : (
                <View
                  style={[
                    styles.heroImage,
                    {
                      backgroundColor:
                        Colors[colorScheme ?? "light"].tint + "15",
                      justifyContent: "center",
                      alignItems: "center",
                    },
                  ]}
                >
                  <MaterialIcons
                    name="queue-music"
                    size={64}
                    color={Colors[colorScheme ?? "light"].text}
                  />
                </View>
              )}

              {currentPlaylist.description && (
                <ThemedText type="default" style={styles.description}>
                  {currentPlaylist.description}
                </ThemedText>
              )}

              <View style={styles.metaRow}>
                <View style={styles.metaItem}>
                  <MaterialIcons
                    name="queue-music"
                    size={18}
                    color={Colors[colorScheme ?? "light"].text}
                  />
                  <ThemedText type="default" style={styles.metaText}>
                    {sermonCount} messages
                  </ThemedText>
                </View>
                <View style={styles.metaItem}>
                  <MaterialIcons
                    name="schedule"
                    size={18}
                    color={Colors[colorScheme ?? "light"].text}
                  />
                  <ThemedText type="default" style={styles.metaText}>
                    {formatDuration(totalDuration)}
                  </ThemedText>
                </View>
              </View>

              <View style={styles.actionsRow}>
                <TouchableOpacity
                  style={styles.playAllButton}
                  onPress={handlePlayAll}
                >
                  <MaterialIcons name="play-arrow" size={20} color="#FFFFFF" />
                  <ThemedText type="defaultSemiBold" style={styles.playAllText}>
                    Play All
                  </ThemedText>
                </TouchableOpacity>

                <View style={styles.sortRow}>
                  {["recent", "plays", "title"].map((option) => (
                    <TouchableOpacity
                      key={option}
                      style={[
                        styles.sortChip,
                        sortOption === option && styles.sortChipActive,
                      ]}
                      onPress={() =>
                        setSortOption(option as "recent" | "plays" | "title")
                      }
                    >
                      <ThemedText
                        type="default"
                        style={[
                          styles.sortChipText,
                          sortOption === option && styles.sortChipTextActive,
                        ]}
                      >
                        {option.charAt(0).toUpperCase() + option.slice(1)}
                      </ThemedText>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <MaterialIcons
                name="queue-music"
                size={44}
                color={Colors[colorScheme ?? "light"].tabIconDefault}
              />
              <ThemedText type="default" style={styles.emptyText}>
                No messages in this series yet.
              </ThemedText>
            </View>
          }
        />

        {/* Add messages FAB */}
        {isUserPlaylist && (
          <TouchableOpacity style={styles.fab} onPress={handleAddMessages}>
            <MaterialIcons name="add" size={32} color="#fff" />
          </TouchableOpacity>
        )}

        {/* Modal */}
        <SelectPlaylistMessagesModal
          visible={showSelectModal}
          onDone={handleSelectMessages}
          onCancel={handleCancelSelect}
          existingSermonIds={currentPlaylist?.sermons.map((s) => s.id) || []}
        />
      </ThemedView>
    </SafeAreaView>
  );
}

// Helpers
function formatDuration(seconds: number) {
  if (!seconds || seconds <= 0) return "0:00";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  if (hours > 0)
    return `${hours}:${minutes.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  return `${minutes}:${secs.toString().padStart(2, "0")}`;
}

// Styles
const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },
  backButton: { padding: 8 },
  headerTitle: { flex: 1, fontSize: 18, textAlign: "center" },
  headerSpacer: { width: 40 },
  content: { paddingHorizontal: 16, paddingBottom: 24 },
  hero: { marginBottom: 16 },
  heroImage: { width: "100%", height: 400, borderRadius: 16 },
  description: { marginTop: 12, opacity: 0.8 },
  metaRow: { flexDirection: "row", marginTop: 12 },
  metaItem: { flexDirection: "row", alignItems: "center", marginRight: 16 },
  metaText: { fontSize: 12, opacity: 0.7, marginLeft: 6 },
  actionsRow: { marginTop: 14 },
  playAllButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "#2063FA",
  },
  playAllText: { color: "#FFFFFF" },
  sortRow: { flexDirection: "row", flexWrap: "wrap", marginTop: 8 },
  sortChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(0,0,0,0.06)",
    marginRight: 8,
    marginBottom: 8,
  },
  sortChipActive: { backgroundColor: "#2063FA" },
  sortChipText: { fontSize: 12, opacity: 0.8 },
  sortChipTextActive: { color: "#FFFFFF", opacity: 1 },
  listSection: { marginTop: 12 },
  emptyState: { alignItems: "center", paddingVertical: 32 },
  emptyText: { marginTop: 12, opacity: 0.7 },
  fab: {
    position: "absolute",
    right: 24,
    bottom: 32,
    backgroundColor: Colors.light.tint,
    borderRadius: 28,
    width: 56,
    height: 56,
    alignItems: "center",
    justifyContent: "center",
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    zIndex: 10,
  },
});
