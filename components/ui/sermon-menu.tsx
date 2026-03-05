import { Colors } from "@/constants/theme";
import { useAudioPlayer } from "@/contexts/AudioPlayerContext";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useDownloads } from "@/hooks/use-downloads";
import { useFavorites } from "@/hooks/use-favorites";
import { Sermon } from "@/types/sermon";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useNavigation } from "@react-navigation/native";
import { Image as ExpoImage } from "expo-image";
import { useRouter } from "expo-router";
import React, { useRef, useState } from "react";
import {
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  ToastAndroid,
  TouchableOpacity,
  View,
} from "react-native";
import { ThemedText } from "../themed-text";

interface SermonMenuProps {
  sermon: Sermon;
  onMoreLikeThis?: () => void;
  onAddToQueue?: () => void;
  onRemoveFromQueue?: () => void;
  onPlayNext?: () => void;
  onAddToPlaylist?: () => void;
  onMoreInfo?: () => void;

  // ✅ NEW
  onRemoveFromPlaylist?: () => void;
  showRemoveFromPlaylist?: boolean;
}

export default function SermonMenu({
  sermon,
  showRemoveFromPlaylist = false,
  ...props
}: SermonMenuProps) {
  const [visible, setVisible] = useState(false);

  const colorScheme = useColorScheme();
  const router = useRouter();
  const navigation = useNavigation();
  const shouldReopenRef = useRef(false);

  const {
    isDownloaded,
    getProgress,
    startDownload,
    cancelDownload,
    deleteDownload,
    loadDownloads,
  } = useDownloads();

  const { isFavorited, toggleFavorite } = useFavorites();
  const { addToQueue, addToQueueNext, removeFromQueue } = useAudioPlayer();

  // Reopen modal instantly before paint when coming back
  React.useEffect(() => {
    const unsubscribe = navigation.addListener("state", () => {
      if (!shouldReopenRef.current) return;
      setVisible(true);
      shouldReopenRef.current = false;
    });
    return unsubscribe;
  }, [navigation]);

  const progress = getProgress(sermon.id);
  const downloading =
    progress?.status === "downloading" || progress?.status === "pending";
  const isError = progress?.status === "error";
  const downloaded = !downloading && !isError && isDownloaded(sermon.id);
  const favorited = isFavorited(sermon.id);
  const previousDownloadStatusRef = useRef(progress?.status);

  const showToast = (message: string, type: "success" | "error" | "info") => {
    if (Platform.OS === "android") {
      ToastAndroid.show(
        message,
        type === "error" ? ToastAndroid.LONG : ToastAndroid.SHORT,
      );
    }
  };

  React.useEffect(() => {
    const previousStatus = previousDownloadStatusRef.current;
    const currentStatus = progress?.status;

    if (previousStatus !== "completed" && currentStatus === "completed") {
      showToast("Download completed", "success");
    }

    if (
      (previousStatus === "downloading" || previousStatus === "pending") &&
      currentStatus === "error"
    ) {
      showToast("Download failed", "error");
    }

    previousDownloadStatusRef.current = currentStatus;
  }, [progress?.status]);

  const handleDownloadAction = async () => {
    try {
      if (downloading) {
        await cancelDownload(sermon.id);
        showToast("Download canceled", "info");
        return;
      }

      // Already downloaded → delete
      if (downloaded) {
        await deleteDownload(sermon.id);
        await loadDownloads();
        showToast("Download deleted", "success");
        return;
      }

      // Failed previously → retry
      if (isError) {
        showToast("Retrying download...", "info");
        void startDownload(sermon);
        return;
      }

      // Start fresh download
      showToast("Download started", "success");
      void startDownload(sermon);
    } catch (error: any) {
      showToast(
        error?.message ? `Error: ${error.message}` : "Operation failed",
        "error",
      );
    }
  };

  const getDownloadLabel = () => {
    if (downloading) return "Cancel Download";
    if (isError) return "Retry Download";
    if (downloaded) return "Delete Download";
    return "Download";
  };

  const getDownloadIcon = () => {
    if (downloading) return "close";
    if (isError) return "refresh";
    if (downloaded) return "delete";
    return "download";
  };

  const handleMoreInfo = () => {
    setVisible(false);
    if (props.onMoreInfo) {
      props.onMoreInfo();
      return;
    }
    if (!sermon.id) return;
    shouldReopenRef.current = true;
    router.push(`/sermon/${sermon.id}`);
  };

  const menuItems = [
    {
      label: "More messages like this",
      icon: "queue-music",
      action: () => {
        if (props.onMoreLikeThis) {
          props.onMoreLikeThis();
          return;
        }
        if (sermon.genre) {
          setVisible(false);
          router.push({
            pathname: "/see-all/latest",
            params: { category: sermon.genre.toLowerCase() },
          } as any);
        } else {
          showToast("No genre found for this message", "info");
        }
      },
    },
    {
      label: getDownloadLabel(),
      icon: getDownloadIcon(),
      action: handleDownloadAction,
      downloading,
      progress,
    },
    {
      label: "Play next",
      icon: "skip-next",
      action: () => {
        if (props.onPlayNext) {
          props.onPlayNext();
        } else {
          addToQueueNext(sermon);
        }
        showToast("Will play next", "success");
      },
    },
    {
      label: "Add to queue",
      icon: "queue",
      action: () => {
        if (props.onAddToQueue) {
          props.onAddToQueue();
        } else {
          addToQueue(sermon);
        }
        showToast("Added to queue", "success");
      },
    },
    {
      label: "Remove from queue",
      icon: "queue-play-next",
      action: () => {
        if (props.onRemoveFromQueue) {
          props.onRemoveFromQueue();
        } else {
          removeFromQueue(sermon.id);
        }
        showToast("Removed from queue", "success");
      },
    },
    {
      label: favorited ? "Remove from favourite" : "Add to favourite",
      icon: favorited ? "favorite" : "favorite-border",
      action: async () => {
        try {
          const wasFavorited = favorited;
          const success = await toggleFavorite(sermon);
          if (success) {
            showToast(
              wasFavorited ? "Removed from favourites" : "Added to favourites",
              "success",
            );
          } else showToast("Failed to update favourites", "error");
        } catch {
          showToast("Failed to update favourites", "error");
        }
      },
    },
    // Only show remove from playlist if prop is true
    ...(showRemoveFromPlaylist
      ? [
          {
            label: "Remove from playlist",
            icon: "playlist-remove",
            action: () => {
              props.onRemoveFromPlaylist?.();
            },
          },
        ]
      : []),
    { label: "More info", icon: "info", action: handleMoreInfo },
  ];

  return (
    <View>
      <TouchableOpacity onPress={() => setVisible(true)} hitSlop={10}>
        <MaterialIcons
          name="more-vert"
          size={26}
          color={Colors[colorScheme ?? "light"].text}
        />
      </TouchableOpacity>

      <Modal
        visible={visible}
        animationType="fade"
        presentationStyle="fullScreen"
        onRequestClose={() => setVisible(false)}
      >
        <View
          style={[
            styles.modalContainer,
            { backgroundColor: Colors[colorScheme ?? "light"].background },
          ]}
        >
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setVisible(false)}>
              <MaterialIcons
                name="close"
                size={24}
                color={Colors[colorScheme ?? "light"].text}
              />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.modalContent}>
            <View style={styles.menuTop}>
              {sermon.imageUrl ? (
                <ExpoImage
                  source={{ uri: sermon.imageUrl }}
                  style={styles.menuImage}
                  contentFit="cover"
                  cachePolicy="disk"
                  recyclingKey={`sermon-menu-artwork-${sermon.id}`}
                />
              ) : (
                <View style={[styles.menuImage, styles.placeholder]}>
                  <MaterialIcons name="headphones" size={50} color="#888" />
                </View>
              )}

              <View style={styles.menuInfo}>
                <ThemedText type="defaultSemiBold" numberOfLines={2}>
                  {sermon.title}
                </ThemedText>
                <ThemedText style={{ opacity: 0.7 }}>
                  {sermon.preacher}
                </ThemedText>
              </View>
            </View>

            <View style={styles.menuDivider} />

            {menuItems.map((item, index) => (
              <View key={index} style={styles.menuItem}>
                <TouchableOpacity style={styles.menuRow} onPress={item.action}>
                  <MaterialIcons
                    name={item.icon as any}
                    size={24}
                    color="#2063FA"
                  />
                  <ThemedText style={styles.menuText}>{item.label}</ThemedText>

                  {/* No progress bar in menu, just icon and label */}
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  modalContainer: { flex: 1 },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "flex-end",
    padding: 16,
  },
  modalContent: { paddingHorizontal: 20, paddingBottom: 40 },
  menuTop: { flexDirection: "row", paddingBottom: 20 },
  menuImage: { width: 80, height: 80, borderRadius: 12, marginRight: 16 },
  placeholder: {
    backgroundColor: "#eee",
    justifyContent: "center",
    alignItems: "center",
  },
  menuInfo: { flex: 1, justifyContent: "center" },
  menuDivider: { height: 1, backgroundColor: "#ddd", marginBottom: 16 },
  menuItem: { paddingVertical: 16 },
  menuRow: { flexDirection: "row", alignItems: "center" },
  menuText: { fontSize: 16 },
});
