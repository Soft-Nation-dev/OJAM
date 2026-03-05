import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { IconSymbol } from "@/components/ui/icon-symbol";
import SermonMenu from "@/components/ui/sermon-menu";
import { Colors } from "@/constants/theme";
import { useAudioPlayer } from "@/contexts/AudioPlayerContext";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useFavorites } from "@/hooks/use-favorites";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import Slider from "@react-native-community/slider";
import { Image as ExpoImage } from "expo-image";
import React from "react";
import { ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function PlayerScreen() {
  const {
    currentSermon,
    isPlaying,
    position,
    duration,
    pause,
    resume,
    seekTo,
    playNext,
    playPrevious,
    playbackRate,
    setPlaybackRate,
    shuffle,
    toggleShuffle,
    queue,
    currentIndex,
  } = useAudioPlayer();

  const colorScheme = useColorScheme();
  const { isFavorited, toggleFavorite } = useFavorites();
  const themeColors = Colors[colorScheme ?? "light"];
  const accent = colorScheme === "dark" ? "#FF9F68" : "#FF6B4A";

  // Use context-based queue navigation
  const hasNext = queue && currentIndex >= 0 && currentIndex < queue.length - 1;
  const hasPrevious = queue && currentIndex > 0;
  const upNextTitle = hasNext ? queue[currentIndex + 1]?.title : null;

  if (!currentSermon) {
    return (
      <SafeAreaView
        style={[styles.safeArea, { backgroundColor: themeColors.background }]}
      >
        <ThemedView style={styles.container}>
          <ThemedText>No sermon playing</ThemedText>
        </ThemedView>
      </SafeAreaView>
    );
  }

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}:${secs.toString().padStart(2, "0")}`;
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds || seconds <= 0) return "0:00";
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, "0")}:${secs
        .toString()
        .padStart(2, "0")}`;
    }
    return `${minutes}:${secs.toString().padStart(2, "0")}`;
  };

  const cyclePlaybackRate = () => {
    const rates = [1, 1.25, 1.5, 2];
    const current = rates.indexOf(playbackRate);
    const next = rates[(current + 1) % rates.length];
    setPlaybackRate(next);
  };

  const metaTags = [currentSermon.category, currentSermon.genre].filter(
    Boolean,
  );

  const handleToggleFavorite = async () => {
    await toggleFavorite(currentSermon);
  };

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: themeColors.background }]}
    >
      <ThemedView style={styles.container}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.artworkContainer}>
            {currentSermon.imageUrl ? (
              <ExpoImage
                source={{ uri: currentSermon.imageUrl }}
                style={styles.artwork}
                contentFit="cover"
                cachePolicy="disk"
                recyclingKey={`player-artwork-${currentSermon.id}`}
              />
            ) : (
              <View style={styles.artworkFallback}>
                <IconSymbol
                  name="music.note"
                  size={80}
                  color={themeColors.tint}
                />
              </View>
            )}
          </View>

          <View style={styles.infoContainer}>
            <ThemedText type="title" style={styles.title}>
              {currentSermon.title}
            </ThemedText>
            <ThemedText type="default" style={styles.preacher}>
              {currentSermon.preacher}
            </ThemedText>

            {metaTags.length > 0 && (
              <View style={styles.tagsRow}>
                {metaTags.map((tag) => (
                  <View
                    key={String(tag)}
                    style={[
                      styles.tag,
                      { backgroundColor: `${themeColors.tint}20` },
                    ]}
                  >
                    <ThemedText style={styles.tagText}>{tag}</ThemedText>
                  </View>
                ))}
              </View>
            )}

            <View style={styles.metaRow}>
              <View style={styles.metaGroup}>
                <View style={styles.metaItemInline}>
                  <MaterialIcons
                    name="schedule"
                    size={16}
                    color={themeColors.tabIconDefault}
                  />
                  <ThemedText style={styles.metaText}>
                    {formatDuration(currentSermon.duration)}
                  </ThemedText>
                </View>

                <View style={styles.metaItemInline}>
                  <MaterialIcons
                    name="play-circle-outline"
                    size={16}
                    color={themeColors.tabIconDefault}
                  />
                  <ThemedText style={styles.metaText}>
                    {(currentSermon.plays ?? 0).toLocaleString()} plays
                  </ThemedText>
                </View>
              </View>

              <View style={styles.metaActions}>
                <TouchableOpacity
                  style={styles.metaToggle}
                  onPress={cyclePlaybackRate}
                >
                  <MaterialIcons
                    name="speed"
                    size={18}
                    color={themeColors.tint}
                  />
                  <ThemedText style={styles.metaText}>
                    {playbackRate}x
                  </ThemedText>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.metaToggle}
                  onPress={toggleShuffle}
                >
                  <MaterialIcons
                    name="shuffle"
                    size={18}
                    color={
                      shuffle ? themeColors.tint : themeColors.tabIconDefault
                    }
                  />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.metaToggle}
                  onPress={handleToggleFavorite}
                >
                  <MaterialIcons
                    name={
                      isFavorited(currentSermon.id)
                        ? "favorite"
                        : "favorite-border"
                    }
                    size={18}
                    color={
                      isFavorited(currentSermon.id)
                        ? "#FF6B6B"
                        : themeColors.tint
                    }
                  />
                </TouchableOpacity>

                <View style={styles.metaMenuWrapper}>
                  <SermonMenu sermon={currentSermon} />
                </View>
              </View>
            </View>

            {!!currentSermon.description && (
              <ThemedText style={styles.description}>
                {currentSermon.description}
              </ThemedText>
            )}
          </View>

          <View style={styles.progressContainer}>
            <Slider
              minimumValue={0}
              maximumValue={duration || 1}
              value={position}
              onSlidingComplete={seekTo}
              minimumTrackTintColor={accent}
              maximumTrackTintColor="#999"
              thumbTintColor={accent}
            />
            <View style={styles.timeRow}>
              <ThemedText>{formatTime(position)}</ThemedText>
              <ThemedText>{formatTime(duration)}</ThemedText>
            </View>
          </View>

          <View style={styles.controls}>
            <TouchableOpacity onPress={playPrevious} disabled={!hasPrevious}>
              <MaterialIcons
                name="skip-previous"
                size={48}
                color={accent}
                style={!hasPrevious && { opacity: 0.4 }}
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.playButton}
              onPress={() => (isPlaying ? pause() : resume())}
            >
              <MaterialIcons
                name={isPlaying ? "pause" : "play-arrow"}
                size={40}
                color="#fff"
              />
            </TouchableOpacity>

            <TouchableOpacity onPress={playNext} disabled={!hasNext}>
              <MaterialIcons
                name="skip-next"
                size={48}
                color={accent}
                style={!hasNext && { opacity: 0.4 }}
              />
            </TouchableOpacity>
          </View>

          {upNextTitle && (
            <View style={styles.queueContainer}>
              <ThemedText type="subtitle">Up Next</ThemedText>
              <ThemedText>{upNextTitle}</ThemedText>
            </View>
          )}
        </ScrollView>
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
  background: {
    ...StyleSheet.absoluteFillObject,
    overflow: "hidden",
  },
  blob: {
    position: "absolute",
    width: 260,
    height: 260,
    borderRadius: 130,
    opacity: 0.2,
  },
  blobTop: {
    top: -120,
    right: -60,
  },
  blobMid: {
    top: 140,
    left: -120,
  },
  blobBottom: {
    bottom: -140,
    right: -100,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    // paddingTop: 10,
    // paddingBottom: 8,
  },
  closeButton: {
    // padding: 8,
  },
  headerSpacer: {
    width: 40,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  hero: {
    alignItems: "center",
  },
  nowPlayingBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    marginBottom: 10,
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 12,
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  artworkContainer: {
    alignItems: "center",
    marginBottom: 20,
  },
  artwork: {
    width: 380,
    height: 380,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  artworkFallback: {
    width: 380,
    height: 380,
    borderRadius: 16,
    backgroundColor: "#e0e0e0",
    alignItems: "center",
    justifyContent: "center",
  },
  infoContainer: {
    alignItems: "center",
    marginBottom: 20,
    // justifyContent: "center",
  },
  title: {
    fontSize: 22,
    textAlign: "center",
    marginBottom: 6,
  },
  preacher: {
    fontSize: 14,
    opacity: 0.7,
    marginBottom: 8,
  },
  tagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 8,
    marginBottom: 10,
  },
  tag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  tagText: {
    fontSize: 12,
    opacity: 0.85,
  },
  description: {
    fontSize: 14,
    opacity: 0.8,
    textAlign: "center",
    lineHeight: 20,
  },
  metaRow: {
    width: "100%",
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 30,
  },
  metaGroup: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 26,
  },
  metaItemInline: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    justifyContent: "center",
  },
  metaToggle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    minWidth: 36,
    minHeight: 36,
    paddingHorizontal: 6,
    borderRadius: 18,
  },
  metaActions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  metaMenuWrapper: {
    minWidth: 36,
    minHeight: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  metaText: {
    fontSize: 12,
    opacity: 0.7,
  },
  favoriteOutlineStack: {
    position: "relative",
    width: 20,
    height: 20,
  },
  favoriteOutlineBack: {
    position: "absolute",
    top: -1,
    left: -1,
  },
  favoriteOutlineFront: {
    position: "absolute",
    top: 0,
    left: 0,
  },
  progressContainer: {
    marginBottom: 20,
  },
  slider: {
    width: "100%",
    height: 40,
  },
  timeContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
  },
  time: {
    fontSize: 12,
    opacity: 0.6,
  },
  controls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 24,
    marginBottom: 20,
  },
  controlButton: {
    padding: 8,
  },
  playButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FF6B4A",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  playPauseButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  queueContainer: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
  },
  queueTitle: {
    marginBottom: 8,
  },
  queueItem: {
    opacity: 0.7,
  },
  timeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
  },
});
