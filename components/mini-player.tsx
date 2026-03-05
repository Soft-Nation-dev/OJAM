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

export function MiniPlayer() {
  const {
    currentSermon,
    isPlaying,
    position,
    duration,
    pause,
    resume,
    seekTo,
  } = useAudioPlayer();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const insets = useSafeAreaInsets();
  const [showQueue, setShowQueue] = useState(false);

  if (!currentSermon) {
    return null;
  }

  const progress = duration > 0 ? (position / duration) * 100 : 0;

  const handleSeek = (value: number) => {
    seekTo(value);
  };

  return (
    <>
      <TouchableOpacity
        style={[
          styles.container,
          {
            backgroundColor: Colors[colorScheme ?? "light"].background,
            borderTopColor:
              Colors[colorScheme ?? "light"].tabIconDefault + "30",
            bottom: 60 + insets.bottom,
          },
        ]}
        onPress={() => router.push("/player")}
        activeOpacity={0.9}
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
          {currentSermon.imageUrl ? (
            <ExpoImage
              source={{ uri: currentSermon.imageUrl }}
              style={styles.image}
              contentFit="cover"
              cachePolicy="disk"
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
          <View style={styles.controls}>
            <CircularSeekBar
              size={70}
              strokeWidth={4}
              progress={duration > 0 ? position / duration : 0}
              onSeek={(progress) => handleSeek(progress * duration)}
              isPlaying={isPlaying}
              onPlayPause={() => (isPlaying ? pause() : resume())}
            />
            <TouchableOpacity
              style={styles.queueButton}
              onPress={() => setShowQueue(true)}
              activeOpacity={0.7}
            >
              <MaterialIcons
                name="queue-music"
                size={24}
                color={Colors[colorScheme ?? "light"].tabIconDefault}
              />
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>

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
  queueButton: {
    padding: 8,
  },
});
