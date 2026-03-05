import CreatePlaylistModal from "@/components/CreatePlaylistModal";
import { PlaylistCard } from "@/components/playlist-card";
import SelectPlaylistMessagesModal from "@/components/SelectPlaylistMessagesModal";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Colors } from "@/constants/theme";
import { usePlaylists } from "@/contexts/PlaylistsContext";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useNotifications } from "@/hooks/use-notifications";
import { useFocusEffect, useRouter } from "expo-router";

import React, { useState } from "react";
import {
  BackHandler,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

function PlaylistsScreenInner() {
  const router = useRouter();
  const { userPlaylists, remotePlaylists, addPlaylist } = usePlaylists();
  const { addNotification } = useNotifications();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showSelectModal, setShowSelectModal] = useState(false);
  const [pendingPlaylistName, setPendingPlaylistName] = useState<string | null>(
    null,
  );

  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? "light"];

  useFocusEffect(
    React.useCallback(() => {
      const onBackPress = () => {
        router.replace("/library");
        return true;
      };
      const sub = BackHandler.addEventListener(
        "hardwareBackPress",
        onBackPress,
      );
      return () => sub.remove();
    }, [router]),
  );

  const handleCreatePlaylist = (name: string) => {
    setPendingPlaylistName(name);
    setShowCreateModal(false);
    setShowSelectModal(true);
  };

  const handleSelectMessages = (sermons: import("@/types/sermon").Sermon[]) => {
    if (!pendingPlaylistName) return;

    let imageUrl: string | undefined;
    const sermonWithImage = sermons.filter((s) => s.imageUrl);
    if (sermonWithImage.length > 0) {
      const random = Math.floor(Math.random() * sermonWithImage.length);
      imageUrl = sermonWithImage[random].imageUrl;
    }

    addPlaylist({
      id: `user-${Date.now()}`,
      name: pendingPlaylistName,
      sermons,
      description: `${sermons.length} messages • ${formatDuration(
        sermons.reduce((sum, s) => sum + (s.duration || 0), 0),
      )}`,
      imageUrl,
    });

    addNotification({
      title: "Playlist Created",
      message: `Playlist '${pendingPlaylistName}' created with ${sermons.length} messages`,
      type: "playlist",
    });

    setPendingPlaylistName(null);
    setShowSelectModal(false);
  };

  const handleCancelSelect = () => {
    setPendingPlaylistName(null);
    setShowSelectModal(false);
  };

  return (
    <ThemedView
      style={[styles.container, { backgroundColor: themeColors.background }]}
    >
      <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
        <View>
          <ThemedText style={[styles.title, { color: themeColors.text }]}>
            Playlists
          </ThemedText>

          <TouchableOpacity
            style={[
              styles.addButton,
              {
                backgroundColor: themeColors.tint,
                alignSelf: "flex-start",
                marginLeft: 16,
                marginTop: 16,
                marginBottom: 8,
              },
            ]}
            onPress={() => setShowCreateModal(true)}
          >
            <ThemedText
              style={[styles.addButtonText, { color: themeColors.background }]}
            >
              + Create Playlist
            </ThemedText>
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <ThemedText
            style={[styles.sectionTitle, { color: themeColors.text }]}
          >
            Your Playlists
          </ThemedText>

          {Array.isArray(userPlaylists) && userPlaylists.length === 0 ? (
            <View style={styles.userEmptyContainer}>
              <ThemedText
                style={[styles.emptyText, { color: themeColors.text }]}
              >
                No custom playlists yet.
              </ThemedText>
            </View>
          ) : (
            <View style={styles.grid}>
              {userPlaylists.map((playlist) => (
                <PlaylistCard
                  key={playlist.id}
                  playlist={playlist}
                  onPress={() =>
                    router.push({
                      pathname: `/playlist/${playlist.id}` as any,
                      params: { user: "1" },
                    })
                  }
                />
              ))}
            </View>
          )}

          <ThemedText
            style={[styles.sectionTitle, { color: themeColors.text }]}
          >
            Other Playlists
          </ThemedText>

          {remotePlaylists.length === 0 ? (
            <ThemedText style={[styles.emptyText, { color: themeColors.text }]}>
              No playlists yet.
            </ThemedText>
          ) : (
            <View style={styles.grid}>
              {remotePlaylists.map((playlist) => (
                <PlaylistCard
                  key={playlist.id}
                  playlist={playlist}
                  onPress={() => router.push(`/playlist/${playlist.id}` as any)}
                />
              ))}
            </View>
          )}
        </ScrollView>

        <CreatePlaylistModal
          visible={showCreateModal}
          onDone={handleCreatePlaylist}
          onCancel={() => setShowCreateModal(false)}
        />

        <SelectPlaylistMessagesModal
          visible={showSelectModal}
          onDone={handleSelectMessages}
          onCancel={handleCancelSelect}
        />
      </SafeAreaView>
    </ThemedView>
  );
}

export default PlaylistsScreenInner;

function formatDuration(seconds: number) {
  if (!seconds || seconds <= 0) return "0:00";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0)
    return `${h}:${m.toString().padStart(2, "0")}:${s
      .toString()
      .padStart(2, "0")}`;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  title: { fontSize: 32, fontWeight: "bold", margin: 16, paddingTop: 3 },
  scrollView: { flex: 1 },
  content: { padding: 16 },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginTop: 16,
    marginBottom: 8,
  },
  loadingText: { marginTop: 32, textAlign: "center" },
  emptyText: { marginTop: 8, textAlign: "center", opacity: 0.7 },
  userEmptyContainer: { alignItems: "center", marginBottom: 16 },
  addButton: {
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  addButtonText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "flex-start",
    gap: 12,
  },
});
