import { Colors } from "@/constants/theme";
import { useAudioPlayer } from "@/contexts/AudioPlayerContext";
import { useColorScheme } from "@/hooks/use-color-scheme";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Image as ExpoImage } from "expo-image";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { Modal, StyleSheet, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CircularSeekBar } from "./circular-seek-bar";
import { QueueDisplay } from "./queue-display";
import { ThemedText } from "./themed-text";

type MiniPlayerProps = {
  bottomOffset?: number;
};

export function MiniPlayer({ bottomOffset = 60 }: MiniPlayerProps) {
  const {
    currentSermon,
    isPlaying,
    position,
    duration,
    pause,
    resume,
    seekTo,
    playNext,
    queue,
    currentIndex,
    repeat,
  } = useAudioPlayer();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const insets = useSafeAreaInsets();
  const [showQueue, setShowQueue] = useState(false);

  if (!currentSermon) {
    return null;
  }

  const progress = duration > 0 ? (position / duration) * 100 : 0;
  const hasNext =
    queue.length > 1 &&
    (currentIndex < queue.length - 1 || repeat === "all");

  const handleSeek = (value: number) => {
    seekTo(value);
  };

  return (
    <>
      <View
        style={[
          styles.container,
          {
            backgroundColor: Colors[colorScheme ?? "light"].background,
            borderTopColor:
              Colors[colorScheme ?? "light"].tabIconDefault + "30",
            bottom: bottomOffset + insets.bottom,
          },
        ]}
      >
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              {
                backgroundColor: Colors[colorScheme ?? "light"].tint,
                width: `${progress}%`,
              },
            ]}
          />
        </View>
        <View style={styles.content}>
          <TouchableOpacity
            style={styles.trackButton}
            onPress={() => router.push("/player")}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel={`Open player for ${currentSermon.title}`}
          >
            {currentSermon.imageUrl ? (
              <ExpoImage
                source={{ uri: currentSermon.imageUrl }}
                style={styles.image}
                contentFit="cover"
                cachePolicy={typeof document !== "undefined" ? "none" : "disk"}
                recyclingKey={`mini-player-artwork-${currentSermon.id}`}
              />
            ) : (
              <View
                style={[
                  styles.image,
                  styles.circularImage,
                  {
                    backgroundColor: Colors[colorScheme ?? "light"].tint + "20",
                    justifyContent: "center",
                    alignItems: "center",
                  },
                ]}
              >
                <MaterialIcons
                  name="headphones"
                  size={24}
                  color={Colors[colorScheme ?? "light"].tint}
                />
              </View>
            )}
            <View style={styles.info}>
              <ThemedText
                type="defaultSemiBold"
                numberOfLines={1}
                style={styles.title}
              >
                {currentSermon.title}
              </ThemedText>
              <ThemedText
                type="default"
                numberOfLines={1}
                style={styles.preacher}
              >
                {currentSermon.preacher}
              </ThemedText>
            </View>
          </TouchableOpacity>
          <View style={styles.controls}>
            <CircularSeekBar
              size={54}
              strokeWidth={3}
              progress={duration > 0 ? position / duration : 0}
              onSeek={(nextProgress) => handleSeek(nextProgress * duration)}
              isPlaying={isPlaying}
              onPlayPause={() => void (isPlaying ? pause() : resume())}
            />
            <TouchableOpacity
              style={styles.iconButton}
              onPress={() => void playNext()}
              disabled={!hasNext}
              accessibilityRole="button"
              accessibilityLabel="Next message"
              accessibilityState={{ disabled: !hasNext }}
            >
              <MaterialIcons
                name="skip-next"
                size={24}
                color={Colors[colorScheme ?? "light"].tabIconDefault}
                style={!hasNext && { opacity: 0.35 }}
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.iconButton}
              onPress={() => setShowQueue(true)}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={`Open queue, ${queue.length} messages`}
            >
              <MaterialIcons
                name="queue-music"
                size={24}
                color={Colors[colorScheme ?? "light"].tabIconDefault}
              />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <Modal
        visible={showQueue}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowQueue(false)}
      >
        <QueueDisplay onClose={() => setShowQueue(false)} />
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: 1,
    paddingBottom: 8,
    paddingTop: 8,
    paddingHorizontal: 12,
  },
  progressBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: "transparent",
  },
  progressFill: {
    height: "100%",
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  trackButton: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  image: {
    width: 50,
    height: 50,
    borderRadius: 6,
  },
  circularImage: {
    borderRadius: 25, // Make it circular
  },
  info: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    marginBottom: 2,
  },
  preacher: {
    fontSize: 12,
    opacity: 0.7,
  },
  controls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  iconButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
});
