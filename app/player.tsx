import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { QueueDisplay } from "@/components/queue-display";
import { IconSymbol } from "@/components/ui/icon-symbol";
import SermonMenu from "@/components/ui/sermon-menu";
import { Colors } from "@/constants/theme";
import { useAudioPlayer } from "@/contexts/AudioPlayerContext";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useFavorites } from "@/hooks/use-favorites";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import Slider from "@react-native-community/slider";
import { Image as ExpoImage } from "expo-image";
import { useRouter } from "expo-router";
import React from "react";
import {
  ActivityIndicator,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function PlayerScreen() {
  const {
    currentSermon,
    isPlaying,
    isBuffering,
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
    repeat,
    setRepeat,
    queue,
    currentIndex,
  } = useAudioPlayer();

  const [isSliding, setIsSliding] = React.useState(false);
  const [slidingValue, setSlidingValue] = React.useState(0);
  const [showQueue, setShowQueue] = React.useState(false);

  const colorScheme = useColorScheme();
  const router = useRouter();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const artworkWidth = Math.min(windowWidth - 32, 390);
  const artworkHeight = Math.min(artworkWidth * 1.06, windowHeight * 0.46);
  const [resolvedImageUri, setResolvedImageUri] = React.useState<string | null>(null);

  React.useEffect(() => {
    let isMounted = true;
    const resolveImage = async () => {
      if (Platform.OS !== "web" && currentSermon?.localImagePath) {
        try {
          const FileSystem = require("expo-file-system");
          const fileInfo = await FileSystem.getInfoAsync(currentSermon.localImagePath);
          if (fileInfo.exists) {
            if (isMounted) {
              setResolvedImageUri(currentSermon.localImagePath);
            }
            return;
          }
        } catch (e) {
          console.log("Player local image check failed:", e);
        }
      }
      if (isMounted) {
        setResolvedImageUri(currentSermon?.imageUrl || null);
      }
    };
    void resolveImage();
    return () => {
      isMounted = false;
    };
  }, [currentSermon?.localImagePath, currentSermon?.imageUrl]);
  const { isFavorited, toggleFavorite } = useFavorites();
  const themeColors = Colors[colorScheme ?? "light"];
  const accent = colorScheme === "dark" ? "#FF9F68" : "#FF6B4A";

  // Use context-based queue navigation
  const hasNext =
    queue.length > 1 &&
    (currentIndex < queue.length - 1 || repeat === "all");
  const hasPrevious =
    position > 5 || currentIndex > 0 || (repeat === "all" && queue.length > 1);
  const upNextTitle =
    currentIndex < queue.length - 1
      ? queue[currentIndex + 1]?.title
      : repeat === "all"
        ? queue[0]?.title
        : null;

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

  const cycleRepeat = () => {
    const next = repeat === "off" ? "all" : repeat === "all" ? "one" : "off";
    void setRepeat(next);
  };

  const seekRelative = (seconds: number) => {
    const target = Math.max(
      0,
      duration > 0 ? Math.min(duration, position + seconds) : position + seconds,
    );
    void seekTo(target);
  };

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: themeColors.background }]}
    >
      <ThemedView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Close player"
          >
            <MaterialIcons name="keyboard-arrow-down" size={30} color={themeColors.text} />
          </TouchableOpacity>
          <ThemedText type="defaultSemiBold">Now Playing</ThemedText>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => setShowQueue(true)}
            accessibilityRole="button"
            accessibilityLabel={`Open queue, ${queue.length} messages`}
          >
            <MaterialIcons name="queue-music" size={24} color={themeColors.text} />
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.artworkContainer}>
            <View
              style={[
                styles.artworkFrame,
                { width: artworkWidth, height: artworkHeight },
              ]}
            >
              {resolvedImageUri ? (
                <ExpoImage
                  source={{ uri: resolvedImageUri }}
                  style={styles.artwork}
                  contentFit="cover"
                  cachePolicy={
                    typeof document !== "undefined" ? "none" : "disk"
                  }
                  recyclingKey={`player-artwork-${currentSermon.id}`}
                />
              ) : (
                <View style={[styles.artwork, styles.artworkFallback]}>
                  <IconSymbol
                    name="music.note"
                    size={80}
                    color={themeColors.tint}
                  />
                </View>
              )}
            </View>
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
                  accessibilityRole="button"
                  accessibilityLabel={`Playback speed ${playbackRate} times`}
                  accessibilityHint="Cycles through playback speeds"
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
                  onPress={handleToggleFavorite}
                  accessibilityRole="button"
                  accessibilityLabel={
                    isFavorited(currentSermon.id)
                      ? "Remove from favorites"
                      : "Add to favorites"
                  }
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

            {/* Description (playlists only) */}
            {false && !!currentSermon.description && (
              <ThemedText style={styles.description}>
                {currentSermon.description}
              </ThemedText>
            )}
          </View>

          <View style={styles.progressContainer}>
            <Slider
              accessibilityLabel="Playback position"
              minimumValue={0}
              maximumValue={duration || 1}
              value={isSliding ? slidingValue : position}
              onSlidingStart={(val) => {
                setIsSliding(true);
                setSlidingValue(val);
              }}
              onValueChange={(val) => {
                setSlidingValue(val);
              }}
              onSlidingComplete={async (val) => {
                await seekTo(val);
                setTimeout(() => {
                  setIsSliding(false);
                }, 500);
              }}
              minimumTrackTintColor={accent}
              maximumTrackTintColor="#999"
              thumbTintColor={accent}
            />
            <View style={styles.timeRow}>
              <ThemedText>
                {formatTime(isSliding ? slidingValue : position)}
              </ThemedText>
              <ThemedText>{formatTime(duration)}</ThemedText>
            </View>
            {isBuffering && (
              <View style={styles.bufferingRow}>
                <ActivityIndicator size="small" color={accent} />
                <ThemedText style={styles.bufferingText}>
                  Loading audio...
                </ThemedText>
              </View>
            )}
          </View>

          <View style={styles.controls}>
            <TouchableOpacity
              style={styles.controlButton}
              onPress={() => void playPrevious()}
              disabled={!hasPrevious}
              accessibilityRole="button"
              accessibilityLabel={position > 5 ? "Restart message" : "Previous message"}
              accessibilityState={{ disabled: !hasPrevious }}
            >
              <MaterialIcons
                name="skip-previous"
                size={34}
                color={accent}
                style={!hasPrevious && { opacity: 0.4 }}
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.controlButton}
              onPress={() => seekRelative(-10)}
              accessibilityRole="button"
              accessibilityLabel="Rewind 10 seconds"
            >
              <MaterialIcons name="replay-10" size={32} color={accent} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.playButton}
              onPress={() => void (isPlaying ? pause() : resume())}
              accessibilityRole="button"
              accessibilityLabel={isPlaying ? "Pause" : "Play"}
            >
              <MaterialIcons
                name={isPlaying ? "pause" : "play-arrow"}
                size={40}
                color="#fff"
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.controlButton}
              onPress={() => seekRelative(30)}
              accessibilityRole="button"
              accessibilityLabel="Forward 30 seconds"
            >
              <MaterialIcons name="forward-30" size={32} color={accent} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.controlButton}
              onPress={() => void playNext()}
              disabled={!hasNext}
              accessibilityRole="button"
              accessibilityLabel="Next message"
              accessibilityState={{ disabled: !hasNext }}
            >
              <MaterialIcons
                name="skip-next"
                size={34}
                color={accent}
                style={!hasNext && { opacity: 0.4 }}
              />
            </TouchableOpacity>
          </View>

          <View style={styles.modeControls}>
            <TouchableOpacity
              style={[
                styles.modeButton,
                shuffle && { backgroundColor: `${themeColors.tint}20` },
              ]}
              onPress={() => void toggleShuffle("full")}
              accessibilityRole="button"
              accessibilityLabel={shuffle ? "Turn shuffle off" : "Turn shuffle on"}
              accessibilityState={{ selected: shuffle }}
            >
              <MaterialIcons
                name="shuffle"
                size={20}
                color={shuffle ? themeColors.tint : themeColors.tabIconDefault}
              />
              <ThemedText style={styles.modeLabel}>Shuffle</ThemedText>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.modeButton,
                repeat !== "off" && { backgroundColor: `${themeColors.tint}20` },
              ]}
              onPress={cycleRepeat}
              accessibilityRole="button"
              accessibilityLabel={`Repeat ${repeat}`}
              accessibilityHint="Cycles between off, all, and one"
            >
              <MaterialIcons
                name={repeat === "one" ? "repeat-one" : "repeat"}
                size={20}
                color={repeat !== "off" ? themeColors.tint : themeColors.tabIconDefault}
              />
              <ThemedText style={styles.modeLabel}>
                {repeat === "off" ? "Repeat off" : repeat === "all" ? "Repeat all" : "Repeat one"}
              </ThemedText>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modeButton}
              onPress={() => setShowQueue(true)}
              accessibilityRole="button"
              accessibilityLabel={`Open queue, ${queue.length} messages`}
            >
              <MaterialIcons name="queue-music" size={20} color={themeColors.tabIconDefault} />
              <ThemedText style={styles.modeLabel}>Queue {queue.length}</ThemedText>
            </TouchableOpacity>
          </View>

          {upNextTitle && (
            <TouchableOpacity
              style={[styles.queueContainer, { borderTopColor: themeColors.border }]}
              onPress={() => setShowQueue(true)}
              accessibilityRole="button"
              accessibilityLabel={`Up next: ${upNextTitle}. Open queue`}
            >
              <ThemedText type="subtitle">Up Next</ThemedText>
              <ThemedText numberOfLines={1}>{upNextTitle}</ThemedText>
            </TouchableOpacity>
          )}
        </ScrollView>
      </ThemedView>

      <Modal
        visible={showQueue}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowQueue(false)}
      >
        <QueueDisplay onClose={() => setShowQueue(false)} />
      </Modal>
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
    paddingVertical: 8,
  },
  headerButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  headerSpacer: {
    width: 40,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 72,
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
    // marginTop: 100,
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
    width: "100%",
    alignItems: "center",
    paddingVertical: 8,
    marginBottom: 16,
  },
  artworkFrame: {
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  artwork: {
    width: "100%",
    height: "100%",
    borderRadius: 16,
  },
  artworkFallback: {
    backgroundColor: "#e0e0e0",
    alignItems: "center",
    justifyContent: "center",
  },
  infoContainer: {
    alignItems: "center",
    marginBottom: 8,
  },
  title: {
    fontSize: 19,
    textAlign: "center",
    marginBottom: 3,
  },
  preacher: {
    fontSize: 14,
    opacity: 0.7,
    marginBottom: 5,
  },
  tagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 6,
    marginBottom: 6,
  },
  tag: {
    paddingHorizontal: 9,
    paddingVertical: 4,
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
    marginTop: 3,
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  metaGroup: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
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
    marginBottom: 8,
  },
  bufferingRow: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  bufferingText: {
    fontSize: 12,
    opacity: 0.75,
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
    gap: 4,
    marginBottom: 8,
  },
  controlButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
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
  modeControls: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 6,
    marginBottom: 8,
  },
  modeButton: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 10,
    borderRadius: 22,
  },
  modeLabel: {
    fontSize: 12,
    fontWeight: "600",
  },
  queueContainer: {
    marginTop: 2,
    paddingVertical: 10,
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
