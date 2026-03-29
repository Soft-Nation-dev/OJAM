import { Colors } from "@/constants/theme";
import { useAudioPlayer } from "@/contexts/AudioPlayerContext";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useDownloads } from "@/hooks/use-downloads";
import { useFavorites } from "@/hooks/use-favorites";
import { Sermon } from "@/types/sermon";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Image as ExpoImage } from "expo-image";
import * as FileSystem from "expo-file-system/legacy";
import React from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { ThemedText } from "./themed-text";
import SermonMenu from "./ui/sermon-menu";

interface SermonCardProps {
  sermon: Sermon;
  onPress?: () => void;
}

export function SermonCard({ sermon, onPress }: SermonCardProps) {
  const colorScheme = useColorScheme();
  const { addToQueue, addToQueueNext, removeFromQueue } = useAudioPlayer();
  const { isFavorited } = useFavorites();
  const { isDownloaded, isDownloading, getProgress } = useDownloads();

  const downloading = isDownloading(sermon.id);
  const downloaded = isDownloaded(sermon.id);
  const progress = getProgress(sermon.id);

  const [coverSource, setCoverSource] = React.useState<any>(null);

  // ✅ REAL FIX: verify file exists
  React.useEffect(() => {
    let isMounted = true;

    const resolveImage = async () => {
      // 1. Try local ONLY if it exists
      if (sermon.localImagePath) {
        try {
          const fileInfo = await FileSystem.getInfoAsync(
            sermon.localImagePath
          );

          if (fileInfo.exists) {
            if (isMounted) {
              setCoverSource({ uri: sermon.localImagePath });
            }
            return;
          }
        } catch (e) {
          console.log("Local image check failed:", e);
        }
      }

      // 2. fallback to network
      if (sermon.imageUrl) {
        if (isMounted) {
          setCoverSource({ uri: sermon.imageUrl });
        }
        return;
      }

      // 3. fallback to null
      if (isMounted) {
        setCoverSource(null);
      }
    };

    resolveImage();

    return () => {
      isMounted = false;
    };
  }, [sermon.localImagePath, sermon.imageUrl]);

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}:${minutes.toString().padStart(2, "0")}`;
    return `${minutes}:${(seconds % 60).toString().padStart(2, "0")}`;
  };

  const getDayBadgeSource = (category?: string) => {
    switch (category) {
      case "sunday":
        return require("@/assets/images/SS.jpg");
      case "tuesday":
        return require("@/assets/images/T.jpg");
      case "friday":
        return require("@/assets/images/F.jpg");
      default:
        return null;
    }
  };

  const dayBadgeSource = getDayBadgeSource(sermon.category);

  return (
    <TouchableOpacity
      style={[
        styles.card,
        { backgroundColor: Colors[colorScheme ?? "light"].background },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.imageContainer}>
        <View style={styles.thumbnailWrapper}>
          {coverSource ? (
            <ExpoImage
              source={coverSource}
              style={styles.image}
              contentFit="cover"
              cachePolicy="none" // ✅ prevents stale cache issues
            />
          ) : (
            <View
              style={[
                styles.image,
                {
                  backgroundColor:
                    Colors[colorScheme ?? "light"].tint + "20",
                  justifyContent: "center",
                  alignItems: "center",
                },
              ]}
            >
              <MaterialIcons
                name="headphones"
                size={40}
                color={Colors[colorScheme ?? "light"].tint}
              />
            </View>
          )}

          {isFavorited(sermon.id) && (
            <View style={styles.thumbnailHeart}>
              <MaterialIcons name="favorite" size={12} color="#fff" />
            </View>
          )}

          {downloading ? (
            <View
              style={[
                styles.favoriteBadge,
                styles.downloadBadge,
                { backgroundColor: "#2063FA" },
              ]}
            >
              <MaterialIcons name="downloading" size={16} color="#FFFFFF" />
            </View>
          ) : downloaded ? (
            <View style={[styles.favoriteBadge, styles.downloadBadge]}>
              <MaterialIcons name="download-done" size={16} color="#FFFFFF" />
            </View>
          ) : null}

          {downloading && (
            <View style={styles.progressBarWrapper}>
              <View style={styles.progressBarBg}>
                <View
                  style={[
                    styles.progressBarFill,
                    { width: `${progress?.progress || 0}%` },
                  ]}
                />
              </View>
              <ThemedText style={styles.progressText}>
                Downloading... {Math.round(progress?.progress || 0)}%
              </ThemedText>
            </View>
          )}
        </View>
      </View>

      <View style={styles.info}>
        <View style={styles.titleRow}>
          {dayBadgeSource && (
            <ExpoImage
              source={dayBadgeSource}
              style={styles.indicatorImage}
              contentFit="cover"
              cachePolicy="none"
            />
          )}
          <ThemedText
            type="defaultSemiBold"
            numberOfLines={2}
            style={styles.title}
          >
            {sermon.title || "Untitled Sermon"}
          </ThemedText>
        </View>

        <ThemedText type="default" style={styles.preacher} numberOfLines={1}>
          {sermon.preacher || "Unknown"}
        </ThemedText>

        <View style={styles.meta}>
          <ThemedText type="default" style={styles.metaText}>
            {formatDuration(sermon.duration)}
          </ThemedText>

          {sermon.plays != null &&
            Number.isFinite(sermon.plays) &&
            sermon.plays > 0 && (
              <>
                <ThemedText type="default" style={styles.metaText}>
                  •
                </ThemedText>
                <ThemedText type="default" style={styles.metaText}>
                  {sermon.plays.toLocaleString()} plays
                </ThemedText>
              </>
            )}
        </View>
      </View>

      <SermonMenu
        sermon={sermon}
        onAddToQueue={() => addToQueue(sermon)}
        onPlayNext={() => addToQueueNext(sermon)}
        onRemoveFromQueue={() => removeFromQueue(sermon.id)}
        onAddToPlaylist={() =>
          console.log("Add to playlist", sermon.id)
        }
      />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  imageContainer: { position: "relative", marginRight: 12 },
  image: { width: 80, height: 80, borderRadius: 10 },
  thumbnailWrapper: { position: "relative", width: 80, height: 80 },
  thumbnailHeart: {
    position: "absolute",
    top: 2,
    right: 2,
    backgroundColor: "#FF6B6B",
    borderRadius: 8,
    width: 16,
    height: 16,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  favoriteBadge: {
    position: "absolute",
    top: 4,
    right: 4,
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  downloadBadge: { top: 32, backgroundColor: "#4CAF50" },
  progressBarWrapper: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: -18,
    alignItems: "center",
  },
  progressBarBg: {
    width: 70,
    height: 6,
    backgroundColor: "#E0E0E0",
    borderRadius: 3,
    overflow: "hidden",
    marginBottom: 2,
  },
  progressBarFill: {
    height: 6,
    backgroundColor: "#2063FA",
    borderRadius: 3,
  },
  progressText: { fontSize: 10, color: "#2063FA" },
  info: { flex: 1 },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  indicatorImage: { width: 16, height: 16, borderRadius: 4 },
  title: { fontSize: 16, marginBottom: 4, flex: 1 },
  preacher: { fontSize: 14, opacity: 0.7, marginBottom: 4 },
  meta: { flexDirection: "row", alignItems: "center", gap: 6 },
  metaText: { fontSize: 12, opacity: 0.6 },
});