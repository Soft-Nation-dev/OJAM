import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Image as ExpoImage } from "expo-image";
import React, { useCallback } from "react";
import {
  ActivityIndicator,
  LayoutAnimation,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import DraggableFlatList, {
  RenderItemParams,
} from "react-native-draggable-flatlist";
import ReanimatedSwipeable from "react-native-gesture-handler/ReanimatedSwipeable";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Colors } from "@/constants/theme";
import { useAudioPlayer } from "@/contexts/AudioPlayerContext";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { ThemedText } from "./themed-text";
import { ThemedView } from "./themed-view";

interface QueueDisplayProps {
  onClose: () => void;
}

interface QueueRowProps {
  item: any;
  index: number;
  isCurrent: boolean;
  showEqualizer: boolean;
  isActive: boolean;
  backgroundColor: string;
  tintColor: string;
  tabIconDefaultColor: string;
  onDrag: () => void;
  onPressItem: (itemId: string) => void;
  onRemove: (itemId: string) => void;
}

const QueueRow = React.memo(function QueueRow({
  item,
  index,
  isCurrent,
  showEqualizer,
  isActive,
  backgroundColor,
  tintColor,
  tabIconDefaultColor,
  onDrag,
  onPressItem,
  onRemove,
}: QueueRowProps) {
  return (
    <View>
      <ReanimatedSwipeable
        friction={1}
        rightThreshold={28}
        dragOffsetFromRightEdge={8}
        overshootRight={false}
        renderRightActions={() => (
          <TouchableOpacity
            style={styles.swipeDelete}
            onPress={() => onRemove(item.id)}
            accessibilityRole="button"
            accessibilityLabel={`Remove ${item.title} from queue`}
          >
            <MaterialIcons name="delete" size={22} color="#fff" />
          </TouchableOpacity>
        )}
      >
        <TouchableOpacity
          activeOpacity={0.85}
          style={[
            styles.queueItem,
            {
              backgroundColor,
            },
            isActive && { opacity: 0.9 },
          ]}
          onPress={() => onPressItem(item.id)}
          accessibilityRole="button"
          accessibilityLabel={`Play ${item.title}, queue position ${index + 1}`}
          accessibilityState={{ selected: isCurrent }}
        >
          <View style={styles.itemContent}>
            {item.imageUrl ? (
              <ExpoImage
                source={{ uri: item.imageUrl }}
                style={styles.itemImage}
                contentFit="cover"
                cachePolicy="disk"
                recyclingKey={`queue-artwork-${item.id}`}
              />
            ) : (
              <ThemedView style={[styles.placeholder, { backgroundColor }]}>
                <MaterialIcons name="headphones" size={18} color={tintColor} />
              </ThemedView>
            )}

            <View style={styles.itemInfo}>
              <ThemedText
                numberOfLines={1}
                style={[
                  styles.itemTitle,
                  isCurrent && {
                    color: tintColor,
                    fontWeight: "600",
                  },
                ]}
              >
                {item.title}
              </ThemedText>

              <ThemedText numberOfLines={1} style={styles.itemPreacher}>
                {item.preacher}
              </ThemedText>
            </View>

            {showEqualizer && (
              <MaterialIcons name="equalizer" size={20} color={tintColor} />
            )}

            <TouchableOpacity
              style={styles.dragHandle}
              onLongPress={onDrag}
              delayLongPress={150}
              accessibilityRole="button"
              accessibilityLabel={`Reorder ${item.title}`}
              accessibilityHint="Press and hold, then drag to a new position"
            >
              <MaterialIcons
                name="drag-handle"
                size={22}
                color={tabIconDefaultColor}
              />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </ReanimatedSwipeable>
    </View>
  );
});

export function QueueDisplay({ onClose }: QueueDisplayProps) {
  const colorScheme = useColorScheme();
  const insets = useSafeAreaInsets();
  const theme = Colors[colorScheme ?? "light"];

  const {
    queue,
    reorderQueue,
    removeFromQueue,
    playFromList,
    currentSermon,
    currentIndex,
    isPlaying,
    pause,
    resume,
    shuffle,
    repeat,
    toggleShuffle,
    setRepeat,
  } = useAudioPlayer();

  const activeIndex = currentSermon ? currentIndex : -1;

  const queueRef = React.useRef(queue);
  React.useEffect(() => {
    queueRef.current = queue;
  }, [queue]);

  const [queueBusy, setQueueBusy] = React.useState(false);

  const runQueueAction = useCallback(
    (action: () => Promise<void> | void) => {
      if (queueBusy) return;
      setQueueBusy(true);
      Promise.resolve(action())
        .catch((error) => {
          console.error("[Queue] Action failed", error);
        })
        .finally(() => {
          setQueueBusy(false);
        });
    },
    [queueBusy],
  );

  const handleReorder = (data: any[]) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    reorderQueue(data);
  };

  const handleRemove = useCallback(
    (itemId: string) => {
      const index = queueRef.current.findIndex((entry) => entry.id === itemId);
      if (index < 0) return;
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      removeFromQueue(index);
    },
    [removeFromQueue],
  );

  const handlePlayFromQueue = useCallback(
    (itemId: string) => {
      void playFromList(queueRef.current, itemId).catch((error) => {
        console.error("[Queue] Failed to play selected item", error);
      });
    },
    [playFromList],
  );

  const keyExtractor = useCallback((item: any) => item.id, []);

  const renderItem = useCallback(
    ({ item, drag, isActive, getIndex }: RenderItemParams<any>) => {
      const index = getIndex() ?? 0;
      const isCurrent = index === activeIndex;

      return (
        <View>
          <QueueRow
            item={item}
            index={index}
            isCurrent={isCurrent}
            showEqualizer={isCurrent && isPlaying}
            isActive={isActive}
            backgroundColor={isCurrent ? theme.tint + "15" : theme.background}
            tintColor={theme.tint}
            tabIconDefaultColor={theme.tabIconDefault}
            onDrag={drag}
            onPressItem={handlePlayFromQueue}
            onRemove={handleRemove}
          />

          {index === activeIndex && (
            <View style={styles.separatorContainer}>
              <View
                style={[
                  styles.separatorLine,
                  { backgroundColor: theme.border },
                ]}
              />
              <ThemedText style={styles.separatorText}>Up Next</ThemedText>
              <View
                style={[
                  styles.separatorLine,
                  { backgroundColor: theme.border },
                ]}
              />
            </View>
          )}
        </View>
      );
    },
    [activeIndex, handlePlayFromQueue, handleRemove, isPlaying, theme],
  );

  return (
    <ThemedView style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View style={styles.headerTopRow}>
          <TouchableOpacity
            style={styles.headerIconButton}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Close queue"
          >
            <MaterialIcons
              name="keyboard-arrow-down"
              size={28}
              color={theme.text}
            />
          </TouchableOpacity>

          <View style={styles.headerTitleBlock}>
            <ThemedText type="subtitle">Current Queue</ThemedText>
            <ThemedText style={styles.queueCount}>
              {queue.length} {queue.length === 1 ? "message" : "messages"}
            </ThemedText>
          </View>

          <TouchableOpacity
            style={styles.headerIconButton}
            onPress={() => void (isPlaying ? pause() : resume())}
            accessibilityRole="button"
            accessibilityLabel={isPlaying ? "Pause" : "Play"}
          >
            <MaterialIcons
              name={isPlaying ? "pause-circle-filled" : "play-circle-filled"}
              size={32}
              color={theme.tint}
            />
          </TouchableOpacity>
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity
            style={[
              styles.stateButton,
              shuffle && { backgroundColor: `${theme.tint}20` },
            ]}
            onPress={() => runQueueAction(() => toggleShuffle("full"))}
            disabled={queueBusy}
            accessibilityRole="button"
            accessibilityLabel={shuffle ? "Turn shuffle off" : "Turn shuffle on"}
            accessibilityState={{ selected: shuffle, disabled: queueBusy }}
          >
            <MaterialIcons
              name="shuffle"
              size={20}
              color={shuffle ? theme.tint : theme.tabIconDefault}
            />
            <ThemedText style={styles.stateButtonText}>Shuffle</ThemedText>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.stateButton,
              repeat !== "off" && { backgroundColor: `${theme.tint}20` },
            ]}
            onPress={() =>
              runQueueAction(() => {
                const next =
                  repeat === "off" ? "all" : repeat === "all" ? "one" : "off";
                return setRepeat(next);
              })
            }
            disabled={queueBusy}
            accessibilityRole="button"
            accessibilityLabel={`Repeat ${repeat}`}
            accessibilityHint="Cycles between off, all, and one"
            accessibilityState={{ selected: repeat !== "off", disabled: queueBusy }}
          >
            <View style={styles.repeatControl}>
              <MaterialIcons
                name={repeat === "one" ? "repeat-one" : "repeat"}
                size={22}
                color={repeat !== "off" ? theme.tint : theme.tabIconDefault}
              />
              <ThemedText
                style={[
                  styles.repeatLabel,
                  {
                    color: repeat !== "off" ? theme.tint : theme.tabIconDefault,
                  },
                ]}
              >
                {repeat === "off"
                  ? "Repeat off"
                  : repeat === "all"
                    ? "Repeat all"
                    : "Repeat one"}
              </ThemedText>
            </View>
          </TouchableOpacity>

          {queueBusy && (
            <ActivityIndicator size="small" color={theme.tabIconDefault} />
          )}
        </View>
      </View>

      <DraggableFlatList
        data={queue}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        onDragEnd={({ data }) => handleReorder(data)}
        initialNumToRender={8}
        maxToRenderPerBatch={8}
        updateCellsBatchingPeriod={50}
        windowSize={7}
        removeClippedSubviews
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MaterialIcons name="queue-music" size={34} color={theme.tabIconDefault} />
            <ThemedText style={styles.emptyTitle}>Your queue is empty</ThemedText>
            <ThemedText style={styles.emptyText}>
              Add a message from its menu to listen later.
            </ThemedText>
          </View>
        }
        contentContainerStyle={{
          padding: 16,
          paddingBottom: insets.bottom + 40,
        }}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    gap: 10,
  },
  headerTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerIconButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitleBlock: {
    flex: 1,
    alignItems: "center",
  },
  queueCount: {
    fontSize: 12,
    opacity: 0.65,
  },
  headerActions: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  stateButton: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 14,
    borderRadius: 22,
  },
  stateButtonText: {
    fontSize: 12,
    fontWeight: "600",
  },
  repeatControl: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  repeatLabel: {
    fontSize: 12,
    fontWeight: "600",
  },
  queueItem: {
    padding: 14,
    borderRadius: 10,
    marginBottom: 8,
  },
  itemContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  itemImage: {
    width: 40,
    height: 40,
    borderRadius: 6,
  },
  placeholder: {
    width: 40,
    height: 40,
    borderRadius: 6,
    justifyContent: "center",
    alignItems: "center",
  },
  itemInfo: {
    flex: 1,
  },
  dragHandle: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    marginVertical: -2,
    marginRight: -8,
  },
  itemTitle: {
    fontSize: 14,
  },
  itemPreacher: {
    fontSize: 12,
    opacity: 0.7,
  },
  swipeDelete: {
    backgroundColor: "#FF3B30",
    justifyContent: "center",
    alignItems: "center",
    width: 70,
    borderRadius: 10,
    marginBottom: 8,
  },
  separatorContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 8,
  },
  separatorLine: {
    flex: 1,
    height: 1,
  },
  separatorText: {
    marginHorizontal: 8,
    fontSize: 12,
    opacity: 0.6,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 100,
    paddingHorizontal: 24,
  },
  emptyTitle: {
    marginTop: 12,
    fontWeight: "600",
  },
  emptyText: {
    marginTop: 6,
    opacity: 0.65,
    textAlign: "center",
  },
});
