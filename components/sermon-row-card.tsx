import { useAudioPlayer } from "@/contexts/AudioPlayerContext";
import { useDownloadsContext } from "@/contexts/DownloadsContext";
import { useFavorites } from "@/hooks/use-favorites";
import { Sermon } from "@/types/sermon";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Image as ExpoImage } from "expo-image";
import React, { useMemo } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { ThemedText } from "./themed-text";
import SermonMenu from "./ui/sermon-menu";

interface SermonRowCardProps {
  sermon: Sermon;
  onPress?: () => void;
  onRemoveFromPlaylist?: () => void; // ✅ callback for removing from playlist
  showRemoveFromPlaylist?: boolean; // ✅ controls visibility
}

function SermonRowCardComponent({
  sermon,
  onPress,
  onRemoveFromPlaylist,
  showRemoveFromPlaylist = false,
}: SermonRowCardProps) {
  const { addToQueue, addToQueueNext, removeFromQueue } = useAudioPlayer();
  const { isFavorited } = useFavorites();
  const { isDownloaded, isDownloading, getProgress } = useDownloadsContext();

  const downloaded = isDownloaded(sermon.id);
  const downloading = isDownloading(sermon.id);
  const progress = getProgress(sermon.id);

  const formatDuration = (seconds?: number) => {
    if (!seconds || seconds <= 0) return "0:00";
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return hours > 0
      ? `${hours}:${minutes.toString().padStart(2, "0")}:${secs
          .toString()
          .padStart(2, "0")}`
      : `${minutes}:${secs.toString().padStart(2, "0")}`;
  };

  const dayBadgeSource = useMemo(() => {
    switch (sermon.category) {
      case "sunday":
        return require("@/assets/images/SS.jpg");
      case "tuesday":
        return require("@/assets/images/T.jpg");
      case "friday":
        return require("@/assets/images/F.jpg");
      default:
        return null;
    }
  }, [sermon.category]);

  const getDefaultImage = useMemo(() => {
    if (sermon.imageUrl) return { uri: sermon.imageUrl };
    switch (sermon.category) {
      case "sunday":
        return require("@/assets/images/black-disk.png");
      case "friday":
        return require("@/assets/images/blue-disk.png");
      case "tuesday":
        return require("@/assets/images/music_disk.png");
      default:
        return require("@/assets/images/black-disk.png");
    }
  }, [sermon.imageUrl, sermon.category]);

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.imageContainer}>
        <View style={styles.thumbnailWrapper}>
          <ExpoImage
            source={getDefaultImage}
            style={styles.circularImage}
            contentFit="cover"
            cachePolicy="disk"
            recyclingKey={`sermon-row-cover-${sermon.id}`}
          />

          {isFavorited(sermon.id) && (
            <View style={styles.thumbnailHeart}>
              <MaterialIcons name="favorite" size={10} color="#fff" />
            </View>
          )}

          {/* Download badges */}
          {downloading ? (
            <View
              style={[
                styles.favoriteBadge,
                styles.downloadBadge,
                { backgroundColor: "#2063FA" },
              ]}
            >
              <MaterialIcons name="downloading" size={12} color="#fff" />
            </View>
          ) : downloaded ? (
            <View style={[styles.favoriteBadge, styles.downloadBadge]}>
              <MaterialIcons name="download-done" size={12} color="#fff" />
            </View>
          ) : null}

          {/* Progress bar (no text) */}
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
              cachePolicy="disk"
              recyclingKey={`sermon-row-badge-${sermon.id}`}
            />
          )}
          <ThemedText
            type="defaultSemiBold"
            numberOfLines={1}
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

      {/* Sermon Menu */}
      <SermonMenu
        sermon={sermon}
        onAddToQueue={() => addToQueue(sermon)}
        onPlayNext={() => addToQueueNext(sermon)}
        onRemoveFromQueue={() => removeFromQueue(sermon.id)}
        onRemoveFromPlaylist={onRemoveFromPlaylist}
        showRemoveFromPlaylist={showRemoveFromPlaylist}
      />
    </TouchableOpacity>
  );
}

export const SermonRowCard = React.memo(
  SermonRowCardComponent,
  (prev, next) => {
    const prevSermon = prev.sermon;
    const nextSermon = next.sermon;

    return (
      prevSermon.id === nextSermon.id &&
      prevSermon.title === nextSermon.title &&
      prevSermon.preacher === nextSermon.preacher &&
      prevSermon.duration === nextSermon.duration &&
      prevSermon.imageUrl === nextSermon.imageUrl &&
      prevSermon.category === nextSermon.category &&
      prevSermon.plays === nextSermon.plays &&
      prev.showRemoveFromPlaylist === next.showRemoveFromPlaylist
    );
  },
);

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  imageContainer: { position: "relative", marginRight: 12 },
  circularImage: { width: 60, height: 60, borderRadius: 10 },
  thumbnailWrapper: { position: "relative", width: 60, height: 60 },
  thumbnailHeart: {
    position: "absolute",
    top: 2,
    right: 2,
    backgroundColor: "#FF6B6B",
    borderRadius: 7,
    width: 14,
    height: 14,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  favoriteBadge: {
    position: "absolute",
    top: 2,
    right: 2,
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  downloadBadge: { top: 24, backgroundColor: "#4CAF50" },
  progressBarWrapper: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: -10,
    alignItems: "center",
    zIndex: 10,
  },
  progressBarBg: {
    width: 60,
    height: 5,
    backgroundColor: "#E0E0E0",
    borderRadius: 3,
    overflow: "hidden",
    marginBottom: 2,
  },
  progressBarFill: { height: 5, backgroundColor: "#2063FA", borderRadius: 3 },
  info: { flex: 1 },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  indicatorImage: { width: 16, height: 13, borderRadius: 4 },
  title: { fontSize: 15, flex: 1 },
  preacher: { fontSize: 13, opacity: 0.7, marginBottom: 4 },
  meta: { flexDirection: "row", alignItems: "center", gap: 6 },
  metaText: { fontSize: 11, opacity: 0.6 },
});
