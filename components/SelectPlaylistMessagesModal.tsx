import { Colors } from "@/constants/theme";
import { useSermons } from "@/contexts/SermonsContext";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useDownloads } from "@/hooks/use-downloads";
import { Sermon } from "@/types/sermon";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import NetInfo from "@react-native-community/netinfo";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  BackHandler,
  FlatList,
  Modal,
  Platform,
  StyleSheet,
  TextInput,
  ToastAndroid,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ThemedText } from "./themed-text";

interface SelectPlaylistMessagesModalProps {
  visible: boolean;
  onDone: (selected: Sermon[]) => void;
  onCancel: () => void;
  existingSermonIds?: string[];
}

export default function SelectPlaylistMessagesModal({
  visible,
  onDone,
  onCancel,
  existingSermonIds = [],
}: SelectPlaylistMessagesModalProps) {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? "light"];
  const {
    sermons: sharedSermons,
    loading: sharedSermonsLoading,
    refresh: refreshSharedSermons,
  } = useSermons();

  const { downloads } = useDownloads();

  const downloadedSermons = useMemo(() => {
    return Array.from(downloads.values())
      .filter((item) => item.status === "completed")
      .map((item) => ({ ...item.sermon, localPath: item.localPath }));
  }, [downloads]);

  const [allSermons, setAllSermons] = useState<Sermon[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(true);

  const [modalExistingIds, setModalExistingIds] = useState<string[]>([]);
  const [selected, setSelected] = useState<Sermon[]>([]);
  const [search, setSearch] = useState("");

  // Fetch sermons and setup modal
  useEffect(() => {
    if (!visible) return;

    // Capture existing IDs once when modal opens
    setModalExistingIds(existingSermonIds);
    setSelected([]); // clear selection
    setSearch("");
    setLoading(true);

    NetInfo.fetch().then((state) => {
      const connected = state.isConnected ?? false;
      setIsOnline(connected);

      if (!connected) {
        if (Platform.OS === "android") {
          ToastAndroid.show(
            "Offline: Only downloaded messages are available.",
            ToastAndroid.LONG,
          );
        }
        setAllSermons(downloadedSermons);
        setLoading(false);
      } else {
        setAllSermons(sharedSermons);
        setLoading(sharedSermonsLoading);
        if (!sharedSermons.length && !sharedSermonsLoading) {
          void refreshSharedSermons();
        }
      }
    });
  }, [
    visible,
    downloadedSermons,
    existingSermonIds,
    sharedSermons,
    sharedSermonsLoading,
    refreshSharedSermons,
  ]);

  useEffect(() => {
    if (!visible || !isOnline) return;
    setAllSermons(sharedSermons);
    setLoading(sharedSermonsLoading);
  }, [isOnline, sharedSermons, sharedSermonsLoading, visible]);

  useEffect(() => {
    if (!visible) return;

    const onBackPress = () => {
      onCancel();
      return true;
    };

    const sub = BackHandler.addEventListener("hardwareBackPress", onBackPress);
    return () => sub.remove();
  }, [visible, onCancel]);

  const filtered = useMemo(() => {
    if (!search.trim()) return allSermons;
    const q = search.trim().toLowerCase();
    return allSermons.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        s.preacher?.toLowerCase().includes(q) ||
        s.description?.toLowerCase().includes(q),
    );
  }, [allSermons, search]);

  const totalDuration = useMemo(
    () => selected.reduce((sum, s) => sum + (s.duration || 0), 0),
    [selected],
  );

  const toggleSelect = (sermon: Sermon) => {
    if (modalExistingIds.includes(sermon.id)) return; // prevent re-select
    setSelected((prev) =>
      prev.some((s) => s.id === sermon.id)
        ? prev.filter((s) => s.id !== sermon.id)
        : [...prev, sermon],
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onCancel}
    >
      <SafeAreaView
        style={[styles.container, { backgroundColor: themeColors.background }]}
      >
        <View style={[styles.header, { borderColor: themeColors.border }]}>
          <ThemedText style={[styles.headerTitle, { color: themeColors.text }]}>
            Select Messages
          </ThemedText>

          <ThemedText style={[styles.headerCount, { color: themeColors.tint }]}>
            {modalExistingIds.length + selected.length} messages •{" "}
            {formatDuration(totalDuration)}
          </ThemedText>

          <TouchableOpacity onPress={onCancel} style={styles.closeButton}>
            <MaterialIcons name="close" size={28} color={themeColors.text} />
          </TouchableOpacity>
        </View>

        <TextInput
          style={[
            styles.search,
            {
              backgroundColor: themeColors.background,
              color: themeColors.text,
              borderColor: themeColors.border,
            },
          ]}
          placeholder={
            isOnline
              ? "Search all messages..."
              : "Search downloaded messages..."
          }
          placeholderTextColor={themeColors.text + "99"}
          value={search}
          onChangeText={setSearch}
        />

        {loading ? (
          <ActivityIndicator
            size="large"
            style={{ marginTop: 32 }}
            color={themeColors.tint}
          />
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => {
              const isExisting = modalExistingIds.includes(item.id);
              const isSelected =
                selected.some((s) => s.id === item.id) || isExisting;
              return (
                <TouchableOpacity
                  style={[
                    styles.sermonRow,
                    { borderColor: themeColors.border },
                    isSelected && { backgroundColor: themeColors.tint + "15" },
                  ]}
                  onPress={() => toggleSelect(item)}
                  activeOpacity={isExisting ? 0.5 : 0.7}
                  disabled={isExisting}
                >
                  <View style={styles.sermonInfo}>
                    <ThemedText
                      style={[
                        styles.sermonTitle,
                        { color: themeColors.text },
                        isExisting && { opacity: 0.4 },
                      ]}
                      numberOfLines={1}
                    >
                      {item.title}
                    </ThemedText>
                    <ThemedText
                      style={[
                        styles.sermonMeta,
                        { color: themeColors.text + "99" },
                        isExisting && { opacity: 0.4 },
                      ]}
                      numberOfLines={1}
                    >
                      {item.preacher} • {formatDuration(item.duration)}
                    </ThemedText>
                  </View>
                  {isSelected && (
                    <MaterialIcons
                      name="check-circle"
                      size={24}
                      color={themeColors.tint}
                    />
                  )}
                </TouchableOpacity>
              );
            }}
            style={{ flex: 1, marginTop: 8 }}
            ListEmptyComponent={
              <ThemedText
                style={{
                  textAlign: "center",
                  marginTop: 32,
                  color: themeColors.text,
                }}
              >
                No messages found.
              </ThemedText>
            }
          />
        )}

        <TouchableOpacity
          style={[
            styles.doneButton,
            {
              backgroundColor: themeColors.tint,
              opacity: selected.length === 0 ? 0.5 : 1,
            },
          ]}
          onPress={() => selected.length > 0 && onDone(selected)}
          disabled={selected.length === 0}
        >
          <ThemedText
            style={[styles.doneButtonText, { color: themeColors.background }]}
          >
            Done
          </ThemedText>
        </TouchableOpacity>
      </SafeAreaView>
    </Modal>
  );
}

function formatDuration(seconds: number) {
  if (!seconds || seconds <= 0) return "0:00";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0)
    return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 20, fontWeight: "bold", flex: 1 },
  headerCount: { fontSize: 14, marginLeft: 8 },
  closeButton: { marginLeft: 8, padding: 4 },
  search: {
    margin: 16,
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    fontSize: 16,
  },
  sermonRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderBottomWidth: 1,
  },
  sermonInfo: { flex: 1 },
  sermonTitle: { fontSize: 16, fontWeight: "600" },
  sermonMeta: { fontSize: 13 },
  doneButton: {
    margin: 16,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: "center",
  },
  doneButtonText: { fontWeight: "bold", fontSize: 16 },
});
