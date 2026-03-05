import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useDownloads } from "@/hooks/use-downloads";
import { useFavorites } from "@/hooks/use-favorites";
import { Playlist } from "@/types/sermon";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Image as ExpoImage } from "expo-image";
import React, { useMemo } from "react";
import {
  StyleProp,
  StyleSheet,
  TouchableOpacity,
  View,
  ViewStyle,
} from "react-native";
import { ThemedText } from "./themed-text";

interface PlaylistCardProps {
  playlist: Playlist;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

function PlaylistCardComponent({
  playlist,
  onPress,
  style,
}: PlaylistCardProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];
  const tint = colors.tint;

  const favoritesCtx = useFavorites();
  const downloadsCtx = useDownloads();
  const sermons = useMemo(() => playlist?.sermons ?? [], [playlist?.sermons]);
  const coverSource = useMemo(
    () => (playlist?.imageUrl ? { uri: playlist.imageUrl } : null),
    [playlist?.imageUrl],
  );
  const emptyIdSet = useMemo(() => new Set<string>(), []);

  // SAFE FALLBACKS — prevents .has crash
  const favoritedIds = useMemo(
    () => favoritesCtx?.favoritedIds ?? new Set<string>(),
    [favoritesCtx?.favoritedIds],
  );
  const downloadedIds = downloadsCtx?.downloadedIds ?? emptyIdSet;
  const downloadingIds = downloadsCtx?.downloadingIds ?? emptyIdSet;

  // ❤️ Any favorited?
  const isAnyFavorited = useMemo(() => {
    if (!sermons.length) return false;
    return sermons.some((s: any) => favoritedIds.has(s.id));
  }, [sermons, favoritedIds]);

  // ✅ All completed?
  const isAllDownloaded = useMemo(() => {
    if (!sermons.length) return false;
    return sermons.every((s: any) => downloadedIds.has(s.id));
  }, [sermons, downloadedIds]);

  // 🔄 Any currently downloading?
  const isAnyDownloading = useMemo(() => {
    if (!sermons.length) return false;
    return sermons.some((s: any) => downloadingIds.has(s.id));
  }, [sermons, downloadingIds]);

  return (
    <TouchableOpacity
      style={[styles.container, style]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.imageWrapper}>
        {coverSource ? (
          <ExpoImage
            source={coverSource}
            style={styles.image}
            contentFit="cover"
            cachePolicy="disk"
            recyclingKey={`playlist-cover-${playlist.id}`}
          />
        ) : (
          <View
            style={[
              styles.image,
              {
                backgroundColor: tint + "15",
                justifyContent: "center",
                alignItems: "center",
              },
            ]}
          >
            <MaterialIcons name="headphones" size={64} color={colors.text} />
          </View>
        )}

        {/* ❤️ Favorite Badge */}
        {isAnyFavorited && (
          <View style={styles.favoriteBadge}>
            <MaterialIcons name="favorite" size={18} color="#fff" />
          </View>
        )}

        {/* 🔄 Downloading Badge */}
        {!isAllDownloaded && isAnyDownloading && (
          <View style={styles.downloadingBadge}>
            <MaterialIcons name="downloading" size={18} color="#fff" />
          </View>
        )}

        {/* ✅ Completed Badge */}
        {isAllDownloaded && (
          <View style={styles.downloadBadge}>
            <MaterialIcons name="download-done" size={18} color="#fff" />
          </View>
        )}

        {/* 🎵 Queue Count */}
        <View style={styles.queueBadge}>
          <MaterialIcons name="queue-music" size={18} color="#fff" />
          <ThemedText style={styles.queueCount}>{sermons.length}</ThemedText>
        </View>
      </View>

      <ThemedText type="defaultSemiBold" numberOfLines={2} style={styles.title}>
        {playlist?.name}
      </ThemedText>

      {playlist?.description && (
        <ThemedText type="default" numberOfLines={1} style={styles.description}>
          {playlist.description}
        </ThemedText>
      )}
    </TouchableOpacity>
  );
}

export const PlaylistCard = React.memo(PlaylistCardComponent, (prev, next) => {
  const prevPlaylist = prev.playlist;
  const nextPlaylist = next.playlist;

  return (
    prevPlaylist.id === nextPlaylist.id &&
    prevPlaylist.name === nextPlaylist.name &&
    prevPlaylist.description === nextPlaylist.description &&
    prevPlaylist.imageUrl === nextPlaylist.imageUrl &&
    prevPlaylist.sermons.length === nextPlaylist.sermons.length &&
    prev.style === next.style
  );
});

const styles = StyleSheet.create({
  container: {
    flexBasis: "47%",
    maxWidth: 200,
    minWidth: 140,
    flexGrow: 1,
    marginBottom: 16,
  },

  imageWrapper: {
    position: "relative",
    marginBottom: 12,
  },

  image: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: 12,
  },

  favoriteBadge: {
    position: "absolute",
    top: 6,
    left: 6,
    backgroundColor: "#FF6B6B",
    borderRadius: 12,
    width: 26,
    height: 26,
    justifyContent: "center",
    alignItems: "center",
    elevation: 3,
    zIndex: 3,
  },

  downloadBadge: {
    position: "absolute",
    top: 6,
    right: 6,
    backgroundColor: "#4CAF50",
    borderRadius: 12,
    width: 26,
    height: 26,
    justifyContent: "center",
    alignItems: "center",
    elevation: 3,
    zIndex: 3,
  },

  downloadingBadge: {
    position: "absolute",
    top: 6,
    right: 6,
    backgroundColor: "#2063FA",
    borderRadius: 12,
    width: 26,
    height: 26,
    justifyContent: "center",
    alignItems: "center",
    elevation: 3,
    zIndex: 3,
  },

  queueBadge: {
    position: "absolute",
    bottom: 8,
    right: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#2063FA",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 14,
  },

  queueCount: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },

  title: {
    fontSize: 14,
    marginBottom: 4,
  },

  description: {
    fontSize: 12,
    opacity: 0.7,
  },
});
