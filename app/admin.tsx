import { ThemedText } from "@/components/themed-text";
import { Colors } from "@/constants/theme";
import { useAuth } from "@/contexts/AuthContext";
import { usePlaylists } from "@/contexts/PlaylistsContext";
import { useSermons } from "@/contexts/SermonsContext";
import { useToast } from "@/contexts/ToastContext";
import { useAdmin } from "@/hooks/use-admin";
import { useColorScheme } from "@/hooks/use-color-scheme";
import {
  AdminPlaylist,
  AdminSermon,
  adminDeletePlaylist,
  adminDeletePlaylistItem,
  adminDeleteSermon,
  adminInsertPlaylist,
  adminInsertPlaylistItems,
  adminSavePlaylistOrder,
  adminUpdatePlaylist,
  adminUpdateSermon,
  fetchAdminPlaylists,
  fetchAdminSermons,
  getAdminErrorMessage,
} from "@/lib/admin";
import {
  PendingSermonUpload,
  SermonUploadMetadata,
  SermonUploadProgress,
  clearPendingSermonUpload,
  getPendingSermonUpload,
  pickSermonAudio,
  titleFromAudioFile,
  uploadSermonAudio,
} from "@/lib/sermon-upload";
import {
  PlaylistItemWithSermon,
  fetchPlaylistItemsWithSermons,
} from "@/lib/playlists";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useNavigation, usePreventRemove } from "@react-navigation/native";
import type { DocumentPickerAsset } from "expo-document-picker";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import DraggableFlatList, { ScaleDecorator } from "react-native-draggable-flatlist";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

type Theme = (typeof Colors)["light"];
type Section = "sermons" | "playlists";
type SortMode = "newest" | "title" | "missing";
type PlaylistMode = "current" | "add";
type MessageCategory = SermonUploadMetadata["category"];

type DeleteTarget =
  | { kind: "sermon"; id: string; label: string }
  | { kind: "playlist"; id: string; label: string };

type ActionTarget =
  | { kind: "sermon"; item: AdminSermon }
  | { kind: "playlist"; item: AdminPlaylist }
  | null;

type SermonDraft = {
  id: string;
  title: string;
  preacher: string;
  date: string;
  duration: string;
  audioKey: string;
  imageKey: string;
  category: MessageCategory;
  genre: string;
};

type PlaylistDraft = {
  id?: string;
  name: string;
  description: string;
  imageKey: string;
};

const PAGE_SIZE = 60;
const MESSAGE_CATEGORIES: MessageCategory[] = [
  "tuesday",
  "friday",
  "sunday",
  "other",
];
const emptyPlaylist: PlaylistDraft = { name: "", description: "", imageKey: "" };
const optionalText = (value: string) => value.trim() || null;
const normalizeCategory = (value?: string | null): MessageCategory =>
  MESSAGE_CATEGORIES.includes(value as MessageCategory)
    ? (value as MessageCategory)
    : "other";
const defaultMetadata = (fileName: string): SermonUploadMetadata => ({
  title: titleFromAudioFile(fileName),
  preacher: "Pastor Oluchi Japhat Aniagwu",
  date: new Date().toISOString().slice(0, 10),
  category: "other",
  genre: "",
  imageKey: "",
});

export default function AdminScreen() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? "light"];
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { user } = useAuth();
  const { isAdmin, loading: adminLoading, error: adminError } = useAdmin();
  const { showToast } = useToast();
  const { refresh: refreshSermons } = useSermons();
  const { refreshRemotePlaylists } = usePlaylists();

  const [section, setSection] = useState<Section>("sermons");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sermons, setSermons] = useState<AdminSermon[]>([]);
  const [playlists, setPlaylists] = useState<AdminPlaylist[]>([]);
  const [search, setSearch] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("newest");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [sermonDraft, setSermonDraft] = useState<SermonDraft | null>(null);
  const [playlistDraft, setPlaylistDraft] = useState<PlaylistDraft | null>(null);
  const [managedPlaylist, setManagedPlaylist] = useState<AdminPlaylist | null>(null);
  const [playlistMode, setPlaylistMode] = useState<PlaylistMode>("current");
  const [playlistItems, setPlaylistItems] = useState<PlaylistItemWithSermon[]>([]);
  const [orderDirty, setOrderDirty] = useState(false);
  const [selectedSermonIds, setSelectedSermonIds] = useState<Set<string>>(new Set());
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [actionTarget, setActionTarget] = useState<ActionTarget>(null);

  const [selectedAsset, setSelectedAsset] = useState<DocumentPickerAsset | null>(null);
  const [uploadMetadata, setUploadMetadata] = useState<SermonUploadMetadata | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<SermonUploadProgress | null>(null);
  const [uploadError, setUploadError] = useState("");
  const [pendingUpload, setPendingUpload] = useState<PendingSermonUpload | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const refreshConsumerData = useCallback(() => {
    void Promise.all([refreshSermons(true), refreshRemotePlaylists(true)]);
  }, [refreshRemotePlaylists, refreshSermons]);

  const loadContent = useCallback(async () => {
    if (!isAdmin) return;
    setLoading(true);
    try {
      const [nextSermons, nextPlaylists] = await Promise.all([
        fetchAdminSermons(),
        fetchAdminPlaylists(),
      ]);
      setSermons(nextSermons);
      setPlaylists(nextPlaylists);
    } catch (error) {
      showToast(getAdminErrorMessage(error), "error", 3000);
    } finally {
      setLoading(false);
    }
  }, [isAdmin, showToast]);

  useFocusEffect(
    useCallback(() => {
      void loadContent();
      void getPendingSermonUpload().then(setPendingUpload);
    }, [loadContent]),
  );

  useEffect(() => {
    if (Platform.OS !== "web" || !uploading) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [uploading]);

  usePreventRemove(uploading, ({ data }) => {
    Alert.alert(
      "Upload in progress",
      "Stay here to finish, or cancel the upload before leaving.",
      [
        { text: "Keep uploading", style: "cancel" },
        {
          text: "Cancel and leave",
          style: "destructive",
          onPress: () => {
            abortControllerRef.current?.abort();
            setUploading(false);
            navigation.dispatch(data.action);
          },
        },
      ],
    );
  });

  const filteredSermons = useMemo(() => {
    const query = search.trim().toLowerCase();
    const filtered = sermons.filter((sermon) => {
      const matchesSearch = !query || [sermon.title, sermon.preacher, sermon.genre]
        .some((value) => String(value ?? "").toLowerCase().includes(query));
      const matchesCategory = categoryFilter === "all" || sermon.category === categoryFilter;
      const matchesMissing = sortMode !== "missing" || !sermon.preacher || !sermon.date || !sermon.category;
      return matchesSearch && matchesCategory && matchesMissing;
    });
    if (sortMode === "title") {
      return filtered.sort((a, b) => a.title.localeCompare(b.title));
    }
    return filtered.sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
  }, [categoryFilter, search, sermons, sortMode]);

  const visibleSermons = filteredSermons.slice(0, visibleCount);
  const availablePlaylistSermons = filteredSermons.filter(
    (sermon) => !playlistItems.some((item) => item.sermon_id === sermon.id),
  );

  const saveSermon = async () => {
    if (!sermonDraft?.title.trim() || !sermonDraft.audioKey.trim()) {
      showToast("Title and audio key are required.", "error");
      return;
    }
    setSaving(true);
    try {
      const parsedDuration = Number(sermonDraft.duration);
      const updated = await adminUpdateSermon(sermonDraft.id, {
        title: sermonDraft.title.trim(),
        audio_key: sermonDraft.audioKey.trim(),
        preacher: optionalText(sermonDraft.preacher),
        date: optionalText(sermonDraft.date),
        duration: Number.isFinite(parsedDuration) ? parsedDuration : 0,
        image_key: optionalText(sermonDraft.imageKey),
        category: optionalText(sermonDraft.category),
        genre: optionalText(sermonDraft.genre),
      });
      setSermons((current) => current.map((item) => item.id === updated.id ? updated : item));
      setSermonDraft(null);
      refreshConsumerData();
      showToast("Message updated.");
    } catch (error) {
      showToast(getAdminErrorMessage(error), "error", 3200);
    } finally {
      setSaving(false);
    }
  };

  const savePlaylist = async () => {
    if (!playlistDraft?.name.trim()) {
      showToast("Playlist name is required.", "error");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: playlistDraft.name.trim(),
        description: optionalText(playlistDraft.description),
        image_key: optionalText(playlistDraft.imageKey),
      };
      const saved = playlistDraft.id
        ? await adminUpdatePlaylist(playlistDraft.id, payload)
        : await adminInsertPlaylist(payload);
      setPlaylists((current) => playlistDraft.id
        ? current.map((item) => item.id === saved.id ? saved : item)
        : [saved, ...current]);
      setPlaylistDraft(null);
      refreshConsumerData();
      showToast(playlistDraft.id ? "Playlist updated." : "Playlist published.");
    } catch (error) {
      showToast(getAdminErrorMessage(error), "error", 3200);
    } finally {
      setSaving(false);
    }
  };

  const chooseAudio = async () => {
    try {
      const asset = await pickSermonAudio();
      if (!asset) return;
      setSelectedAsset(asset);
      setUploadMetadata(defaultMetadata(asset.name));
      setUploadError("");
    } catch (error) {
      showToast(getAdminErrorMessage(error), "error", 4000);
    }
  };

  const runUpload = async (
    asset: DocumentPickerAsset,
    metadata: SermonUploadMetadata,
    resume?: PendingSermonUpload | null,
  ) => {
    if (!metadata.title.trim()) {
      showToast("Message title is required.", "error");
      return;
    }
    setSelectedAsset(null);
    setUploadMetadata(null);
    setUploading(true);
    setUploadError("");
    setUploadProgress({ stage: "preparing", percent: 0, uploadedBytes: 0, totalBytes: asset.size ?? 0, partNumber: 0, totalParts: 0 });
    const controller = new AbortController();
    abortControllerRef.current = controller;
    try {
      await uploadSermonAudio(asset, {
        metadata,
        resume,
        signal: controller.signal,
        onProgress: setUploadProgress,
      });
      setPendingUpload(null);
      await loadContent();
      refreshConsumerData();
      showToast("Audio uploaded and message published.", "success", 3000);
      setTimeout(() => setUploadProgress(null), 5000);
    } catch (error) {
      const message = (error as Error)?.name === "AbortError"
        ? "Upload cancelled."
        : getAdminErrorMessage(error);
      setUploadProgress(null);
      setUploadError(message);
      setPendingUpload(await getPendingSermonUpload());
      showToast(message, (error as Error)?.name === "AbortError" ? "info" : "error", 4000);
    } finally {
      abortControllerRef.current = null;
      setUploading(false);
    }
  };

  const resumeUpload = async () => {
    if (!pendingUpload) return;
    await runUpload(
      pendingUpload.asset as DocumentPickerAsset,
      pendingUpload.metadata,
      pendingUpload,
    );
  };

  const discardPendingUpload = async () => {
    await clearPendingSermonUpload();
    setPendingUpload(null);
    setUploadError("");
  };

  const openPlaylist = async (playlist: AdminPlaylist) => {
    setManagedPlaylist(playlist);
    setPlaylistMode("current");
    setSelectedSermonIds(new Set());
    setSearch("");
    setLoading(true);
    try {
      setPlaylistItems(await fetchPlaylistItemsWithSermons(playlist.id));
    } catch (error) {
      showToast(getAdminErrorMessage(error), "error", 3000);
    } finally {
      setLoading(false);
    }
  };

  const savePlaylistOrder = async () => {
    setSaving(true);
    try {
      await adminSavePlaylistOrder(playlistItems);
      setOrderDirty(false);
      refreshConsumerData();
      showToast("Message order saved.");
    } catch (error) {
      showToast(getAdminErrorMessage(error), "error", 3200);
    } finally {
      setSaving(false);
    }
  };

  const removePlaylistItem = async (item: PlaylistItemWithSermon) => {
    const previous = playlistItems;
    setPlaylistItems((current) => current.filter((entry) => entry.id !== item.id));
    try {
      await adminDeletePlaylistItem(item.id);
      refreshConsumerData();
    } catch (error) {
      setPlaylistItems(previous);
      showToast(getAdminErrorMessage(error), "error", 3200);
    }
  };

  const addSelectedMessages = async () => {
    if (!managedPlaylist || !selectedSermonIds.size) return;
    setSaving(true);
    try {
      await adminInsertPlaylistItems(
        managedPlaylist.id,
        [...selectedSermonIds],
        playlistItems.length,
      );
      setPlaylistItems(await fetchPlaylistItemsWithSermons(managedPlaylist.id));
      setSelectedSermonIds(new Set());
      setPlaylistMode("current");
      refreshConsumerData();
      showToast("Messages added to playlist.");
    } catch (error) {
      showToast(getAdminErrorMessage(error), "error", 3200);
    } finally {
      setSaving(false);
    }
  };

  const deleteSelected = async () => {
    if (!deleteTarget) return;
    const target = deleteTarget;
    setDeleteTarget(null);
    setSaving(true);
    try {
      if (target.kind === "sermon") {
        await adminDeleteSermon(target.id);
        setSermons((current) => current.filter((item) => item.id !== target.id));
      } else {
        await adminDeletePlaylist(target.id);
        setPlaylists((current) => current.filter((item) => item.id !== target.id));
      }
      refreshConsumerData();
      showToast(target.kind === "sermon" ? "Message deleted." : "Playlist deleted.");
    } catch (error) {
      showToast(getAdminErrorMessage(error), "error", 3200);
    } finally {
      setSaving(false);
    }
  };

  const editSermon = (sermon: AdminSermon) => {
    setActionTarget(null);
    setSermonDraft({
      id: sermon.id,
      title: sermon.title,
      preacher: sermon.preacher ?? "",
      date: sermon.date ?? "",
      duration: String(sermon.duration ?? 0),
      audioKey: sermon.audio_key,
      imageKey: sermon.image_key ?? "",
      category: normalizeCategory(sermon.category),
      genre: sermon.genre ?? "",
    });
  };

  if (adminLoading) {
    return <CenteredState background={theme.background}><ActivityIndicator color={theme.tint} size="large" /><ThemedText>Checking administrator access…</ThemedText></CenteredState>;
  }

  if (!user || !isAdmin) {
    return (
      <CenteredState background={theme.background}>
        <MaterialIcons name="admin-panel-settings" size={52} color={theme.icon} />
        <ThemedText type="title">{user ? "Admin access required" : "Sign in required"}</ThemedText>
        <ThemedText style={styles.centeredCopy}>{adminError || (user ? "This account is not authorized to manage published content." : "Sign in with an administrator account to continue.")}</ThemedText>
        {!user && <ActionButton label="Sign in" onPress={() => router.push("/auth")} />}
        <TouchableOpacity onPress={() => router.back()}><ThemedText style={{ color: theme.tint }}>Go back</ThemedText></TouchableOpacity>
      </CenteredState>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <AdminHeader theme={theme} uploading={uploading} onRefresh={() => void loadContent()} />

      {!managedPlaylist && (
        <View style={[styles.segmentedWrap, { borderBottomColor: theme.border }]}>
          <View style={[styles.segmented, { backgroundColor: theme.border + "70" }]}>
            {(["sermons", "playlists"] as Section[]).map((value) => (
              <TouchableOpacity
                key={value}
                accessibilityRole="tab"
                accessibilityState={{ selected: section === value }}
                onPress={() => {
                  setSection(value);
                  setSearch("");
                  setVisibleCount(PAGE_SIZE);
                  setSermonDraft(null);
                  setPlaylistDraft(null);
                }}
                style={[styles.segment, section === value && { backgroundColor: theme.background }]}
              >
                <ThemedText type="defaultSemiBold">{value === "sermons" ? `Messages (${sermons.length})` : `Playlists (${playlists.length})`}</ThemedText>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      <UploadStatusCard
        theme={theme}
        progress={uploadProgress}
        error={uploadError}
        pending={pendingUpload}
        uploading={uploading}
        onCancel={() => abortControllerRef.current?.abort()}
        onResume={() => void resumeUpload()}
        onDiscard={() => void discardPendingUpload()}
      />

      {loading && <ActivityIndicator color={theme.tint} style={styles.loader} />}

      {!managedPlaylist && section === "sermons" && (
        <View style={styles.flex}>
          <View style={[styles.toolbar, { borderBottomColor: theme.border }]}>
            <SectionHeading title="Published messages" actionLabel={uploading ? "Uploading…" : "Upload"} onAction={() => void chooseAudio()} disabled={uploading} />
            <SearchInput value={search} onChangeText={(value) => { setSearch(value); setVisibleCount(PAGE_SIZE); }} placeholder="Search messages" theme={theme} />
            <FilterRow theme={theme} sortMode={sortMode} setSortMode={setSortMode} category={categoryFilter} setCategory={setCategoryFilter} />
          </View>
          <FlatList
            data={visibleSermons}
            keyExtractor={(item) => item.id}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={[
              styles.listContent,
              { paddingBottom: 90 + insets.bottom },
            ]}
            onEndReached={() => setVisibleCount((count) => Math.min(count + PAGE_SIZE, filteredSermons.length))}
            onEndReachedThreshold={0.4}
            ListEmptyComponent={<EmptyState text="No messages match these filters." />}
            renderItem={({ item }) => (
              <CompactRow
                title={item.title}
                subtitle={[item.preacher, item.category, formatDate(item.date)].filter(Boolean).join(" • ")}
                theme={theme}
                onMenu={() => setActionTarget({ kind: "sermon", item })}
              />
            )}
          />
        </View>
      )}

      {!managedPlaylist && section === "playlists" && (
        <View style={styles.flex}>
          <View style={[styles.toolbar, { borderBottomColor: theme.border }]}>
            <SectionHeading title="Published playlists" actionLabel="New" onAction={() => setPlaylistDraft({ ...emptyPlaylist })} />
            <SearchInput value={search} onChangeText={setSearch} placeholder="Search playlists" theme={theme} />
          </View>
          <FlatList
            data={playlists.filter((item) => item.name.toLowerCase().includes(search.trim().toLowerCase()))}
            keyExtractor={(item) => item.id}
            contentContainerStyle={[
              styles.listContent,
              { paddingBottom: 90 + insets.bottom },
            ]}
            ListEmptyComponent={<EmptyState text="No playlists found." />}
            renderItem={({ item }) => (
              <CompactRow title={item.name} subtitle={item.description || "No description"} theme={theme} onPress={() => void openPlaylist(item)} onMenu={() => setActionTarget({ kind: "playlist", item })} />
            )}
          />
        </View>
      )}

      {managedPlaylist && (
        <View style={styles.flex}>
          <View style={[styles.playlistHeader, { borderBottomColor: theme.border }]}>
            <TouchableOpacity accessibilityRole="button" accessibilityLabel="Back to playlists" onPress={() => setManagedPlaylist(null)} style={styles.backRow}>
              <MaterialIcons name="arrow-back" size={21} color={theme.tint} />
              <ThemedText style={{ color: theme.tint }}>All playlists</ThemedText>
            </TouchableOpacity>
            <ThemedText type="subtitle" numberOfLines={1}>{managedPlaylist.name}</ThemedText>
            <View style={[styles.miniSegmented, { backgroundColor: theme.border + "70" }]}>
              {(["current", "add"] as PlaylistMode[]).map((mode) => (
                <TouchableOpacity key={mode} onPress={() => { setPlaylistMode(mode); setSearch(""); }} style={[styles.miniSegment, playlistMode === mode && { backgroundColor: theme.background }]}>
                  <ThemedText type="defaultSemiBold">{mode === "current" ? `Current (${playlistItems.length})` : "Add messages"}</ThemedText>
                </TouchableOpacity>
              ))}
            </View>
            {playlistMode === "add" && <SearchInput value={search} onChangeText={setSearch} placeholder="Search messages to add" theme={theme} />}
          </View>

          {playlistMode === "current" ? (
            <DraggableFlatList
              data={playlistItems}
              keyExtractor={(item) => item.id}
              contentContainerStyle={[
                styles.listContent,
                { paddingBottom: 90 + insets.bottom },
              ]}
              onDragEnd={({ data }) => { setPlaylistItems(data); setOrderDirty(true); }}
              ListEmptyComponent={<EmptyState text="This playlist has no messages." />}
              renderItem={({ item, drag, isActive, getIndex }) => (
                <ScaleDecorator>
                  <View style={[styles.playlistItem, { borderBottomColor: theme.border }, isActive && { backgroundColor: theme.border + "50" }]}>
                    <TouchableOpacity onLongPress={drag} accessibilityLabel={`Drag ${item.sermon.title}`} style={styles.dragHandle}>
                      <MaterialIcons name="drag-handle" size={24} color={theme.icon} />
                    </TouchableOpacity>
                    <ThemedText style={styles.position}>{(getIndex?.() ?? 0) + 1}</ThemedText>
                    <View style={styles.rowCopy}>
                      <ThemedText type="defaultSemiBold" numberOfLines={1}>{item.sermon.title}</ThemedText>
                      <ThemedText style={styles.rowSubtitle} numberOfLines={1}>{[item.sermon.preacher, formatDuration(item.sermon.duration)].filter(Boolean).join(" • ")}</ThemedText>
                    </View>
                    <TouchableOpacity accessibilityLabel={`Remove ${item.sermon.title}`} onPress={() => void removePlaylistItem(item)} style={styles.iconButton}>
                      <MaterialIcons name="remove-circle-outline" size={23} color="#dc2626" />
                    </TouchableOpacity>
                  </View>
                </ScaleDecorator>
              )}
            />
          ) : (
            <FlatList
              data={availablePlaylistSermons.slice(0, visibleCount)}
              keyExtractor={(item) => item.id}
              contentContainerStyle={[
                styles.listContent,
                { paddingBottom: 110 + insets.bottom },
              ]}
              onEndReached={() => setVisibleCount((count) => count + PAGE_SIZE)}
              renderItem={({ item }) => {
                const selected = selectedSermonIds.has(item.id);
                return (
                  <TouchableOpacity
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: selected }}
                    onPress={() => setSelectedSermonIds((current) => {
                      const next = new Set(current);
                      if (selected) next.delete(item.id);
                      else next.add(item.id);
                      return next;
                    })}
                    style={[styles.selectRow, { borderBottomColor: theme.border }]}
                  >
                    <MaterialIcons name={selected ? "check-box" : "check-box-outline-blank"} size={24} color={selected ? theme.tint : theme.icon} />
                    <View style={styles.rowCopy}>
                      <ThemedText type="defaultSemiBold" numberOfLines={1}>{item.title}</ThemedText>
                      <ThemedText style={styles.rowSubtitle} numberOfLines={1}>{[item.preacher, item.category].filter(Boolean).join(" • ")}</ThemedText>
                    </View>
                  </TouchableOpacity>
                );
              }}
            />
          )}

          {playlistMode === "current" && orderDirty && (
            <StickyAction label={saving ? "Saving…" : "Save new order"} disabled={saving} bottomInset={insets.bottom} onPress={() => void savePlaylistOrder()} />
          )}
          {playlistMode === "add" && selectedSermonIds.size > 0 && (
            <StickyAction label={saving ? "Adding…" : `Add ${selectedSermonIds.size} selected`} disabled={saving} bottomInset={insets.bottom} onPress={() => void addSelectedMessages()} />
          )}
        </View>
      )}

      <UploadReviewModal asset={selectedAsset} metadata={uploadMetadata} setMetadata={setUploadMetadata} theme={theme} onClose={() => { setSelectedAsset(null); setUploadMetadata(null); }} onUpload={() => selectedAsset && uploadMetadata && void runUpload(selectedAsset, uploadMetadata)} />
      <SermonEditModal draft={sermonDraft} setDraft={setSermonDraft} saving={saving} onSave={() => void saveSermon()} theme={theme} />
      <PlaylistEditModal draft={playlistDraft} setDraft={setPlaylistDraft} saving={saving} onSave={() => void savePlaylist()} theme={theme} />
      <ActionMenu target={actionTarget} theme={theme} onClose={() => setActionTarget(null)} onManage={(playlist) => { setActionTarget(null); void openPlaylist(playlist); }} onEditSermon={editSermon} onEditPlaylist={(playlist) => { setActionTarget(null); setPlaylistDraft({ id: playlist.id, name: playlist.name, description: playlist.description ?? "", imageKey: playlist.image_key ?? "" }); }} onDelete={(target) => { setActionTarget(null); setDeleteTarget(target); }} />
      <DeleteModal target={deleteTarget} saving={saving} theme={theme} onCancel={() => setDeleteTarget(null)} onConfirm={() => void deleteSelected()} />
    </SafeAreaView>
  );
}

function AdminHeader({ theme, uploading, onRefresh }: { theme: Theme; uploading: boolean; onRefresh: () => void }) {
  return (
    <View style={[styles.header, { borderBottomColor: theme.border }]}>
      <TouchableOpacity accessibilityRole="button" accessibilityLabel="Go back" onPress={() => router.back()} style={styles.headerButton}><MaterialIcons name="arrow-back" size={24} color={theme.text} /></TouchableOpacity>
      <View style={styles.headerCopy}><ThemedText type="title" style={styles.headerTitle}>Content admin</ThemedText><ThemedText style={styles.headerSubtitle}>{uploading ? "Upload in progress" : "Published library"}</ThemedText></View>
      <TouchableOpacity accessibilityRole="button" accessibilityLabel="Refresh content" onPress={onRefresh} style={styles.headerButton}><MaterialIcons name="refresh" size={24} color={theme.text} /></TouchableOpacity>
    </View>
  );
}

function UploadStatusCard({ theme, progress, error, pending, uploading, onCancel, onResume, onDiscard }: { theme: Theme; progress: SermonUploadProgress | null; error: string; pending: PendingSermonUpload | null; uploading: boolean; onCancel: () => void; onResume: () => void; onDiscard: () => void }) {
  if (!progress && !error && !pending) return null;
  const label = progress?.stage === "preparing" ? "Preparing audio…" : progress?.stage === "uploading" ? `Uploading part ${progress.partNumber} of ${progress.totalParts}` : progress?.stage === "processing" ? "Processing and publishing…" : progress?.stage === "published" ? "Published successfully" : error || "Interrupted upload";
  return (
    <View style={[styles.uploadCard, { borderBottomColor: theme.border, backgroundColor: theme.background }]} accessibilityRole="progressbar">
      <View style={styles.uploadTopRow}>
        {(uploading || progress?.stage === "processing") ? <ActivityIndicator color={theme.tint} /> : <MaterialIcons name={error ? "error-outline" : progress?.stage === "published" ? "check-circle" : "cloud-upload"} size={23} color={error ? "#dc2626" : theme.tint} />}
        <View style={styles.rowCopy}>
          <ThemedText type="defaultSemiBold" numberOfLines={1}>{label}</ThemedText>
          {progress && <ThemedText style={styles.rowSubtitle}>{formatBytes(progress.uploadedBytes)} / {formatBytes(progress.totalBytes)} • {progress.percent}%</ThemedText>}
          {!progress && pending && <ThemedText style={styles.rowSubtitle} numberOfLines={1}>{pending.asset.name}</ThemedText>}
        </View>
        {uploading ? <TouchableOpacity onPress={onCancel} style={styles.textButton}><ThemedText style={{ color: "#dc2626" }}>Cancel</ThemedText></TouchableOpacity> : pending ? <><TouchableOpacity onPress={onResume} style={styles.textButton}><ThemedText style={{ color: theme.tint }}>Resume</ThemedText></TouchableOpacity><TouchableOpacity onPress={onDiscard} style={styles.iconButton}><MaterialIcons name="close" size={20} color={theme.icon} /></TouchableOpacity></> : null}
      </View>
      {progress && <View style={[styles.progressTrack, { backgroundColor: theme.border }]}><View style={[styles.progressFill, { width: `${Math.max(progress.percent, 3)}%`, backgroundColor: progress.stage === "published" ? "#16a34a" : theme.tint }]} /></View>}
    </View>
  );
}

function FilterRow({ theme, sortMode, setSortMode, category, setCategory }: { theme: Theme; sortMode: SortMode; setSortMode: (value: SortMode) => void; category: string; setCategory: (value: string) => void }) {
  const options = [
    { value: "newest", label: "Newest" }, { value: "title", label: "A–Z" }, { value: "missing", label: "Missing info" },
    { value: "all", label: "All categories", category: true }, { value: "tuesday", label: "Tuesday", category: true }, { value: "friday", label: "Friday", category: true }, { value: "sunday", label: "Sunday", category: true }, { value: "other", label: "Other", category: true },
  ];
  return <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>{options.map((option) => { const selected = option.category ? category === option.value : sortMode === option.value; return <TouchableOpacity key={`${option.category ? "c" : "s"}-${option.value}`} onPress={() => option.category ? setCategory(option.value) : setSortMode(option.value as SortMode)} style={[styles.chip, { borderColor: selected ? theme.tint : theme.border, backgroundColor: selected ? theme.tint + "18" : "transparent" }]}><ThemedText style={[styles.chipText, selected && { color: theme.tint, fontWeight: "700" }]}>{option.label}</ThemedText></TouchableOpacity>; })}</ScrollView>;
}

function UploadReviewModal({ asset, metadata, setMetadata, theme, onClose, onUpload }: { asset: DocumentPickerAsset | null; metadata: SermonUploadMetadata | null; setMetadata: (value: SermonUploadMetadata) => void; theme: Theme; onClose: () => void; onUpload: () => void }) {
  if (!metadata) return null;
  return (
    <Modal visible={Boolean(asset)} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <SafeAreaView edges={["bottom"]} style={styles.modalSafeArea}>
          <View style={[styles.sheet, { backgroundColor: theme.background }]}>
            <View style={styles.sheetHandle} />
            <ThemedText type="subtitle">Review message details</ThemedText>
            <ThemedText style={styles.fileName} numberOfLines={1}>{asset?.name} • {formatBytes(asset?.size ?? 0)}</ThemedText>
            <ScrollView contentContainerStyle={styles.formFields} keyboardShouldPersistTaps="handled">
              <Field label="Title *" value={metadata.title} onChange={(title) => setMetadata({ ...metadata, title })} theme={theme} />
              <Field label="Preacher" value={metadata.preacher} onChange={(preacher) => setMetadata({ ...metadata, preacher })} theme={theme} />
              <Field label="Date" value={metadata.date} onChange={(date) => setMetadata({ ...metadata, date })} theme={theme} />
              <CategorySelector
                value={metadata.category}
                onChange={(category) => setMetadata({ ...metadata, category })}
                theme={theme}
              />
              <Field label="Series / genre" value={metadata.genre} onChange={(genre) => setMetadata({ ...metadata, genre })} theme={theme} />
              <Field label="Artwork key (optional)" value={metadata.imageKey} onChange={(imageKey) => setMetadata({ ...metadata, imageKey })} theme={theme} />
            </ScrollView>
            <View style={styles.formActions}>
              <TouchableOpacity onPress={onClose} style={styles.secondaryButton}><ThemedText>Cancel</ThemedText></TouchableOpacity>
              <TouchableOpacity onPress={onUpload} style={styles.primaryButton}><ThemedText style={styles.lightButtonText}>Upload & publish</ThemedText></TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

function CategorySelector({ value, onChange, theme }: { value: MessageCategory; onChange: (value: MessageCategory) => void; theme: Theme }) {
  return (
    <View style={styles.field}>
      <ThemedText style={styles.fieldLabel}>Category</ThemedText>
      <View style={styles.categoryRow}>
        {MESSAGE_CATEGORIES.map((category) => {
          const selected = value === category;
          return (
            <TouchableOpacity
              key={category}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
              onPress={() => onChange(category)}
              style={[
                styles.categoryButton,
                {
                  borderColor: selected ? theme.tint : theme.border,
                  backgroundColor: selected ? theme.tint + "18" : "transparent",
                },
              ]}
            >
              <ThemedText style={selected ? { color: theme.tint, fontWeight: "700" } : undefined}>
                {category.charAt(0).toUpperCase() + category.slice(1)}
              </ThemedText>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

function SermonEditModal({ draft, setDraft, saving, onSave, theme }: { draft: SermonDraft | null; setDraft: (value: SermonDraft | null) => void; saving: boolean; onSave: () => void; theme: Theme }) {
  if (!draft) return null;
  const close = () => { if (!saving) setDraft(null); };
  return (
    <Modal visible transparent animationType="slide" onRequestClose={close}>
      <View style={styles.modalBackdrop}>
        <SafeAreaView edges={["bottom"]} style={styles.modalSafeArea}>
          <View style={[styles.sheet, { backgroundColor: theme.background }]}>
            <View style={styles.sheetHandle} />
            <View style={styles.modalTitleRow}>
              <ThemedText type="subtitle">Edit message</ThemedText>
              <TouchableOpacity accessibilityRole="button" accessibilityLabel="Close editor" onPress={close} style={styles.iconButton}>
                <MaterialIcons name="close" size={23} color={theme.icon} />
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={styles.formFields} keyboardShouldPersistTaps="handled">
              <Field label="Title *" value={draft.title} onChange={(title) => setDraft({ ...draft, title })} theme={theme} />
              <Field label="Audio key *" value={draft.audioKey} onChange={(audioKey) => setDraft({ ...draft, audioKey })} theme={theme} />
              <Field label="Preacher" value={draft.preacher} onChange={(preacher) => setDraft({ ...draft, preacher })} theme={theme} />
              <Field label="Date" value={draft.date} onChange={(date) => setDraft({ ...draft, date })} theme={theme} />
              <Field label="Duration in seconds" value={draft.duration} onChange={(duration) => setDraft({ ...draft, duration })} theme={theme} keyboardType="numeric" />
              <Field label="Artwork key" value={draft.imageKey} onChange={(imageKey) => setDraft({ ...draft, imageKey })} theme={theme} />
              <CategorySelector value={draft.category} onChange={(category) => setDraft({ ...draft, category })} theme={theme} />
              <Field label="Series / genre" value={draft.genre} onChange={(genre) => setDraft({ ...draft, genre })} theme={theme} />
            </ScrollView>
            <FormActions saving={saving} onCancel={close} onSave={onSave} />
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

function PlaylistEditModal({ draft, setDraft, saving, onSave, theme }: { draft: PlaylistDraft | null; setDraft: (value: PlaylistDraft | null) => void; saving: boolean; onSave: () => void; theme: Theme }) {
  if (!draft) return null;
  const close = () => { if (!saving) setDraft(null); };
  return (
    <Modal visible transparent animationType="slide" onRequestClose={close}>
      <View style={styles.modalBackdrop}>
        <SafeAreaView edges={["bottom"]} style={styles.modalSafeArea}>
          <View style={[styles.sheet, { backgroundColor: theme.background }]}>
            <View style={styles.sheetHandle} />
            <View style={styles.modalTitleRow}>
              <ThemedText type="subtitle">{draft.id ? "Edit playlist" : "New playlist"}</ThemedText>
              <TouchableOpacity accessibilityRole="button" accessibilityLabel="Close editor" onPress={close} style={styles.iconButton}>
                <MaterialIcons name="close" size={23} color={theme.icon} />
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={styles.formFields} keyboardShouldPersistTaps="handled">
              <Field label="Name *" value={draft.name} onChange={(name) => setDraft({ ...draft, name })} theme={theme} />
              <Field label="Description" value={draft.description} onChange={(description) => setDraft({ ...draft, description })} theme={theme} multiline />
              <Field label="Artwork key" value={draft.imageKey} onChange={(imageKey) => setDraft({ ...draft, imageKey })} theme={theme} />
            </ScrollView>
            <FormActions saving={saving} onCancel={close} onSave={onSave} />
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

function ActionMenu({ target, theme, onClose, onManage, onEditSermon, onEditPlaylist, onDelete }: { target: ActionTarget; theme: Theme; onClose: () => void; onManage: (item: AdminPlaylist) => void; onEditSermon: (item: AdminSermon) => void; onEditPlaylist: (item: AdminPlaylist) => void; onDelete: (target: DeleteTarget) => void }) {
  const edit = () => {
    if (!target) return;
    if (target.kind === "sermon") onEditSermon(target.item);
    else onEditPlaylist(target.item);
  };
  return (
    <Modal visible={Boolean(target)} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity activeOpacity={1} onPress={onClose} style={styles.modalBackdrop}>
        <SafeAreaView edges={["bottom"]} style={styles.modalSafeArea}>
          <View style={[styles.actionSheet, { backgroundColor: theme.background }]}>
            {target?.kind === "playlist" && <ActionMenuItem icon="playlist-play" label="Manage messages" color={theme.tint} onPress={() => onManage(target.item)} />}
            <ActionMenuItem icon="edit" label="Edit" color={theme.tint} onPress={edit} />
            <ActionMenuItem icon="delete-outline" label="Delete" color="#dc2626" onPress={() => target && onDelete({ kind: target.kind, id: target.item.id, label: target.kind === "sermon" ? target.item.title : target.item.name })} />
          </View>
        </SafeAreaView>
      </TouchableOpacity>
    </Modal>
  );
}

function ActionMenuItem({ icon, label, color, onPress }: { icon: keyof typeof MaterialIcons.glyphMap; label: string; color: string; onPress: () => void }) { return <TouchableOpacity accessibilityRole="button" onPress={onPress} style={styles.actionMenuItem}><MaterialIcons name={icon} size={23} color={color} /><ThemedText style={{ color }}>{label}</ThemedText></TouchableOpacity>; }

function DeleteModal({ target, saving, theme, onCancel, onConfirm }: { target: DeleteTarget | null; saving: boolean; theme: Theme; onCancel: () => void; onConfirm: () => void }) {
  return (
    <Modal visible={Boolean(target)} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.modalBackdrop}>
        <SafeAreaView edges={["bottom"]} style={styles.modalSafeArea}>
          <View style={[styles.deleteModal, { backgroundColor: theme.background, borderColor: theme.border }]}>
            <View style={styles.deleteIcon}><MaterialIcons name="delete-outline" size={30} color="#dc2626" /></View>
            <ThemedText type="subtitle">Delete {target?.kind === "sermon" ? "message" : "playlist"}?</ThemedText>
            <ThemedText style={styles.deleteMessage}>“{target?.label}” will be permanently removed.</ThemedText>
            <View style={styles.formActions}>
              <TouchableOpacity onPress={onCancel} style={styles.secondaryButton}><ThemedText>Cancel</ThemedText></TouchableOpacity>
              <TouchableOpacity disabled={saving} onPress={onConfirm} style={styles.deleteButton}>{saving ? <ActivityIndicator color="#fff" /> : <ThemedText style={styles.lightButtonText}>Delete</ThemedText>}</TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

function CompactRow({ title, subtitle, theme, onMenu, onPress }: { title: string; subtitle: string; theme: Theme; onMenu: () => void; onPress?: () => void }) { return <TouchableOpacity disabled={!onPress} activeOpacity={onPress ? 0.65 : 1} onPress={onPress} style={[styles.compactRow, { borderBottomColor: theme.border }]}><View style={styles.rowCopy}><ThemedText type="defaultSemiBold" numberOfLines={1}>{title}</ThemedText><ThemedText style={styles.rowSubtitle} numberOfLines={1}>{subtitle}</ThemedText></View>{onPress && <MaterialIcons name="chevron-right" size={20} color={theme.icon} />}<TouchableOpacity accessibilityRole="button" accessibilityLabel={`More actions for ${title}`} onPress={onMenu} hitSlop={8} style={styles.iconButton}><MaterialIcons name="more-vert" size={23} color={theme.icon} /></TouchableOpacity></TouchableOpacity>; }

function SearchInput({ value, onChangeText, placeholder, theme }: { value: string; onChangeText: (value: string) => void; placeholder: string; theme: Theme }) { return <View style={[styles.searchWrap, { borderColor: theme.border }]}><MaterialIcons name="search" size={20} color={theme.icon} /><TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor={theme.icon} style={[styles.searchInput, { color: theme.text }]} /></View>; }
function Field({ label, value, onChange, theme, ...props }: { label: string; value: string; onChange: (value: string) => void; theme: Theme } & Pick<React.ComponentProps<typeof TextInput>, "keyboardType" | "multiline">) { return <View style={styles.field}><ThemedText style={styles.fieldLabel}>{label}</ThemedText><TextInput value={value} onChangeText={onChange} placeholderTextColor={theme.icon} style={[styles.input, props.multiline && styles.multiline, { color: theme.text, borderColor: theme.border }]} {...props} /></View>; }
function FormActions({ saving, onCancel, onSave }: { saving: boolean; onCancel: () => void; onSave: () => void }) { return <View style={styles.formActions}><TouchableOpacity onPress={onCancel} style={styles.secondaryButton}><ThemedText>Cancel</ThemedText></TouchableOpacity><TouchableOpacity disabled={saving} onPress={onSave} style={[styles.primaryButton, saving && styles.disabled]}>{saving ? <ActivityIndicator color="#fff" /> : <ThemedText style={styles.lightButtonText}>Save</ThemedText>}</TouchableOpacity></View>; }
function SectionHeading({ title, actionLabel, onAction, disabled = false }: { title: string; actionLabel: string; onAction: () => void; disabled?: boolean }) { return <View style={styles.sectionHeading}><ThemedText type="subtitle" numberOfLines={1} style={styles.sectionHeadingTitle}>{title}</ThemedText><TouchableOpacity accessibilityRole="button" disabled={disabled} onPress={onAction} style={[styles.smallPrimaryButton, disabled && styles.disabled]}><MaterialIcons name="add" size={18} color="#fff" /><ThemedText style={styles.lightButtonText}>{actionLabel}</ThemedText></TouchableOpacity></View>; }
function StickyAction({ label, disabled, bottomInset, onPress }: { label: string; disabled: boolean; bottomInset: number; onPress: () => void }) { return <View style={[styles.stickyAction, { paddingBottom: Math.max(12, bottomInset) }]}><TouchableOpacity disabled={disabled} onPress={onPress} style={[styles.stickyButton, disabled && styles.disabled]}><ThemedText style={styles.lightButtonText}>{label}</ThemedText></TouchableOpacity></View>; }
function EmptyState({ text }: { text: string }) { return <View style={styles.emptyState}><MaterialIcons name="inbox" size={34} color="#98a2b3" /><ThemedText style={styles.centeredCopy}>{text}</ThemedText></View>; }
function CenteredState({ children, background }: { children: React.ReactNode; background: string }) { return <SafeAreaView style={[styles.centered, { backgroundColor: background }]}>{children}</SafeAreaView>; }
function ActionButton({ label, onPress }: { label: string; onPress: () => void }) { return <TouchableOpacity style={styles.primaryButton} onPress={onPress}><ThemedText style={styles.lightButtonText}>{label}</ThemedText></TouchableOpacity>; }

const formatBytes = (bytes: number) => { if (!bytes) return "0 MB"; const mb = bytes / (1024 * 1024); return `${mb >= 10 ? mb.toFixed(0) : mb.toFixed(1)} MB`; };
const formatDuration = (seconds?: number | null) => { if (!seconds) return ""; const minutes = Math.floor(seconds / 60); return `${minutes}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`; };
const formatDate = (value?: string | null) => { if (!value) return ""; const date = new Date(value); return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }); };

const styles = StyleSheet.create({
  safeArea: { flex: 1, overflow: "hidden" }, flex: { flex: 1 }, centered: { flex: 1, alignItems: "center", justifyContent: "center", gap: 16, padding: 28 }, centeredCopy: { textAlign: "center", opacity: 0.68, lineHeight: 21 },
  header: { flexDirection: "row", alignItems: "center", minHeight: 62, paddingHorizontal: 8, borderBottomWidth: StyleSheet.hairlineWidth }, headerButton: { width: 44, height: 44, alignItems: "center", justifyContent: "center" }, headerCopy: { flex: 1 }, headerTitle: { fontSize: 21 }, headerSubtitle: { fontSize: 12, opacity: 0.62 },
  segmentedWrap: { paddingHorizontal: 12, paddingVertical: 9, borderBottomWidth: StyleSheet.hairlineWidth }, segmented: { flexDirection: "row", borderRadius: 11, padding: 3 }, segment: { flex: 1, alignItems: "center", paddingVertical: 8, borderRadius: 8 },
  toolbar: { padding: 12, gap: 10, borderBottomWidth: StyleSheet.hairlineWidth }, sectionHeading: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 10 }, sectionHeadingTitle: { flex: 1 }, smallPrimaryButton: { flexShrink: 0, minHeight: 40, backgroundColor: "#0a7ea4", borderRadius: 9, paddingHorizontal: 12, flexDirection: "row", alignItems: "center", gap: 4 },
  searchWrap: { height: 44, borderWidth: 1, borderRadius: 10, paddingHorizontal: 11, flexDirection: "row", alignItems: "center", gap: 8 }, searchInput: { flex: 1, height: "100%", outlineStyle: "none" } as any,
  filterRow: { gap: 7, paddingRight: 18 }, chip: { height: 34, borderRadius: 17, borderWidth: 1, paddingHorizontal: 12, alignItems: "center", justifyContent: "center" }, chipText: { fontSize: 12 },
  listContent: { paddingHorizontal: 12, paddingBottom: 90 }, compactRow: { minHeight: 62, flexDirection: "row", alignItems: "center", gap: 6, borderBottomWidth: StyleSheet.hairlineWidth, paddingVertical: 8 }, rowCopy: { flex: 1, minWidth: 0, gap: 2 }, rowSubtitle: { fontSize: 12, opacity: 0.65 }, iconButton: { width: 44, height: 44, flexShrink: 0, alignItems: "center", justifyContent: "center" }, textButton: { minHeight: 40, flexShrink: 0, justifyContent: "center", paddingHorizontal: 6 }, loader: { marginVertical: 7 },
  uploadCard: { zIndex: 50, borderBottomWidth: StyleSheet.hairlineWidth, paddingHorizontal: 13, paddingVertical: 10, gap: 8 }, uploadTopRow: { flexDirection: "row", alignItems: "center", gap: 9 }, progressTrack: { height: 7, overflow: "hidden", borderRadius: 999 }, progressFill: { height: "100%", borderRadius: 999 },
  formCard: { borderWidth: 1, borderRadius: 13, padding: 13, marginVertical: 10, gap: 10 }, field: { gap: 5 }, fieldLabel: { fontSize: 12, opacity: 0.72 }, input: { minHeight: 43, borderWidth: 1, borderRadius: 9, paddingHorizontal: 11, paddingVertical: 9 }, multiline: { minHeight: 80, textAlignVertical: "top" }, formFields: { gap: 10, paddingBottom: 10 }, formActions: { width: "100%", flexDirection: "row", flexWrap: "wrap", justifyContent: "flex-end", alignItems: "center", gap: 8, marginTop: 4 },
  primaryButton: { minWidth: 100, minHeight: 44, backgroundColor: "#0a7ea4", borderRadius: 10, paddingHorizontal: 16, alignItems: "center", justifyContent: "center" }, secondaryButton: { minWidth: 90, minHeight: 44, borderRadius: 10, paddingHorizontal: 14, alignItems: "center", justifyContent: "center" }, lightButtonText: { color: "#fff", fontWeight: "700" }, disabled: { opacity: 0.5 },
  playlistHeader: { padding: 12, gap: 9, borderBottomWidth: StyleSheet.hairlineWidth }, backRow: { minHeight: 40, alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 5 }, miniSegmented: { flexDirection: "row", padding: 3, borderRadius: 10 }, miniSegment: { flex: 1, alignItems: "center", paddingVertical: 8, borderRadius: 8 }, playlistItem: { minHeight: 62, flexDirection: "row", alignItems: "center", borderBottomWidth: StyleSheet.hairlineWidth }, dragHandle: { width: 42, height: 48, alignItems: "center", justifyContent: "center" }, position: { width: 24, textAlign: "center", opacity: 0.6, fontVariant: ["tabular-nums"] }, selectRow: { minHeight: 62, flexDirection: "row", alignItems: "center", gap: 10, borderBottomWidth: StyleSheet.hairlineWidth, paddingHorizontal: 4 },
  stickyAction: { position: "absolute", left: 0, right: 0, bottom: 0, padding: 12, backgroundColor: "rgba(16,24,40,0.94)" }, stickyButton: { minHeight: 48, borderRadius: 11, backgroundColor: "#0a7ea4", alignItems: "center", justifyContent: "center" },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.58)", justifyContent: "flex-end", paddingHorizontal: 12, paddingTop: 12 }, modalSafeArea: { width: "100%", alignSelf: "center" }, sheet: { width: "100%", maxWidth: 560, maxHeight: "90%", alignSelf: "center", borderRadius: 20, padding: 16, gap: 10 }, sheetHandle: { width: 42, height: 4, borderRadius: 2, backgroundColor: "#98a2b3", alignSelf: "center", marginBottom: 5 }, modalTitleRow: { minHeight: 44, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 }, fileName: { fontSize: 12, opacity: 0.65 }, categoryRow: { flexDirection: "row", flexWrap: "wrap", gap: 7 }, categoryButton: { minHeight: 40, minWidth: 82, flexGrow: 1, borderWidth: 1, borderRadius: 9, paddingHorizontal: 11, paddingVertical: 8, alignItems: "center", justifyContent: "center" },
  actionSheet: { width: "100%", maxWidth: 500, alignSelf: "center", borderRadius: 16, padding: 8 }, actionMenuItem: { minHeight: 52, flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 12 }, deleteModal: { width: "100%", maxWidth: 440, alignSelf: "center", borderWidth: 1, borderRadius: 16, padding: 20, alignItems: "center", gap: 12, marginBottom: "50%" }, deleteIcon: { width: 54, height: 54, borderRadius: 27, backgroundColor: "rgba(220,38,38,0.12)", alignItems: "center", justifyContent: "center" }, deleteMessage: { textAlign: "center", opacity: 0.72 }, deleteButton: { minWidth: 96, minHeight: 44, backgroundColor: "#dc2626", borderRadius: 10, paddingHorizontal: 16, alignItems: "center", justifyContent: "center" },
  emptyState: { paddingVertical: 50, alignItems: "center", gap: 8 },
});
