import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useDownloads } from "@/hooks/use-downloads";
import { useFavorites } from "@/hooks/use-favorites";
import { Playlist } from "@/types/sermon";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Image as ExpoImage } from "expo-image";
import * as FileSystem from "expo-file-system/legacy";
import React from "react";
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

  const [coverSource, setCoverSource] = React.useState<any>(null);

  // ✅ REAL FIX: verify local file exists before using it
  React.useEffect(() => {
    let isMounted = true;

    const resolveImage = async () => {
      // 1. Try local file ONLY if it exists
      if (playlist?.localImagePath) {
        try {
          const fileInfo = await FileSystem.getInfoAsync(
            playlist.localImagePath
          );

          if (fileInfo.exists) {
            if (isMounted) {
              setCoverSource({ uri: playlist.localImagePath });
            }
            return;
          }
        } catch (e) {
          console.log("Local image check failed:", e);
        }
      }

      // 2. Fallback to network
      if (playlist?.imageUrl) {
        if (isMounted) {
          setCoverSource({ uri: playlist.imageUrl });
        }
        return;
      }

      // 3. Nothing available
      if (isMounted) {
        setCoverSource(null);
      }
    };

    resolveImage();

    return () => {
      isMounted = false;
    };
  }, [playlist?.localImagePath, playlist?.imageUrl]);

  const sermons = React.useMemo(() => playlist?.sermons ?? [], [playlist?.sermons]);

  const emptyIdSet = React.useMemo(() => new Set<string>(), []);

  const favoritedIds = React.useMemo(
    () => favoritesCtx?.favoritedIds ?? new Set<string>(),
    [favoritesCtx?.favoritedIds]
  );

  const downloadedIds = downloadsCtx?.downloadedIds ?? emptyIdSet;
  const downloadingIds = downloadsCtx?.downloadingIds ?? emptyIdSet;

  const isAnyFavorited = React.useMemo(() => {
    if (!sermons.length) return false;
    return sermons.some((s: any) => favoritedIds.has(s.id));
  }, [sermons, favoritedIds]);

  const isAllDownloaded = React.useMemo(() => {
    if (!sermons.length) return false;
    return sermons.every((s: any) => downloadedIds.has(s.id));
  }, [sermons, downloadedIds]);

  const isAnyDownloading = React.useMemo(() => {
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
            cachePolicy="none" // ✅ disable caching issues
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

        {isAnyFavorited && (
          <View style={styles.favoriteBadge}>
            <MaterialIcons name="favorite" size={18} color="#fff" />
          </View>
        )}

        {!isAllDownloaded && isAnyDownloading && (
          <View style={styles.downloadingBadge}>
            <MaterialIcons name="downloading" size={18} color="#fff" />
          </View>
        )}

        {isAllDownloaded && (
          <View style={styles.downloadBadge}>
            <MaterialIcons name="download-done" size={18} color="#fff" />
          </View>
        )}

        <View style={styles.queueBadge}>
          <MaterialIcons name="queue-music" size={18} color="#fff" />
          <ThemedText style={styles.queueCount}>
            {sermons.length}
          </ThemedText>
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

export const PlaylistCard = React.memo(PlaylistCardComponent);

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