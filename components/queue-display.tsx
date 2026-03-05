import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Image as ExpoImage } from "expo-image";
import React, { useCallback } from "react";
import {
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
        onSwipeableOpen={(direction) => {
          if (direction === "right") {
            onRemove(item.id);
          }
        }}
        renderRightActions={() => (
          <TouchableOpacity
            style={styles.swipeDelete}
            onPress={() => onRemove(item.id)}
          >
            <MaterialIcons name="delete" size={22} color="#fff" />
          </TouchableOpacity>
        )}
      >
        <TouchableOpacity
          onLongPress={onDrag}
          delayLongPress={200}
          activeOpacity={0.85}
          style={[
            styles.queueItem,
            {
              backgroundColor,
            },
            isActive && { opacity: 0.9 },
          ]}
          onPress={() => onPressItem(item.id)}
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

            <MaterialIcons
              name="drag-handle"
              size={20}
              color={tabIconDefaultColor}
            />
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
    isPlaying,
    pause,
    resume,
    shuffle,
    repeat,
    toggleShuffle,
    setRepeat,
  } = useAudioPlayer();

  const activeIndex = queue.findIndex((item) => item.id === currentSermon?.id);

  const queueRef = React.useRef(queue);
  React.useEffect(() => {
    queueRef.current = queue;
  }, [queue]);

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
      playFromList(queueRef.current, itemId);
    },
    [playFromList],
  );

  const keyExtractor = useCallback((item: any) => item.id, []);

  const getItemLayout = useCallback(
    (_: any, index: number) => ({
      length: 72,
      offset: 72 * index,
      index,
    }),
    [],
  );

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

  if (queue.length === 0) {
    return (
      <ThemedView style={[styles.emptyContainer, { paddingTop: insets.top }]}>
        <ThemedText style={{ opacity: 0.6 }}>Your queue is empty.</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose}>
          <MaterialIcons
            name="keyboard-arrow-down"
            size={28}
            color={theme.text}
          />
        </TouchableOpacity>

        <ThemedText type="subtitle">Current Queue</ThemedText>

        <View style={styles.headerActions}>
          <TouchableOpacity onPress={toggleShuffle}>
            <MaterialIcons
              name="shuffle"
              size={22}
              color={shuffle ? theme.tint : theme.tabIconDefault}
            />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              const next =
                repeat === "off" ? "all" : repeat === "all" ? "one" : "off";
              setRepeat(next);
            }}
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
                {repeat === "off" ? "OFF" : repeat === "all" ? "ALL" : "ONE"}
              </ThemedText>
            </View>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => (isPlaying ? pause() : resume())}>
            <MaterialIcons
              name={isPlaying ? "pause-circle-filled" : "play-circle-filled"}
              size={28}
              color={theme.tint}
            />
          </TouchableOpacity>
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
        getItemLayout={getItemLayout}
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
  },
  headerActions: {
    flexDirection: "row",
    gap: 14,
  },
  repeatControl: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  repeatLabel: {
    fontSize: 11,
    fontWeight: "700",
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
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
