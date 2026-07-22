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
  adminInsertPlaylistItem,
  adminUpdatePlaylist,
  adminUpdatePlaylistItem,
  adminUpdateSermon,
  fetchAdminPlaylists,
  fetchAdminSermons,
  getAdminErrorMessage,
} from "@/lib/admin";
import {
  fetchPlaylistItemsWithSermons,
  PlaylistItemWithSermon,
} from "@/lib/playlists";
import { pickSermonAudio, uploadSermonAudio } from "@/lib/sermon-upload";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type Section = "sermons" | "playlists";

type DeleteTarget =
  | { kind: "sermon"; id: string; label: string }
  | { kind: "playlist"; id: string; label: string };

type SermonDraft = {
  id?: string;
  title: string;
  preacher: string;
  date: string;
  duration: string;
  audioKey: string;
  imageKey: string;
  category: string;
  genre: string;
};

type PlaylistDraft = {
  id?: string;
  name: string;
  description: string;
  imageKey: string;
};

const emptyPlaylist: PlaylistDraft = {
  name: "",
  description: "",
  imageKey: "",
};

const optionalText = (value: string) => value.trim() || null;

export default function AdminScreen() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? "light"];
  const { user } = useAuth();
  const { isAdmin, loading: adminLoading, error: adminError } = useAdmin();
  const { showToast } = useToast();
  const { refresh: refreshSermons } = useSermons();
  const { refreshRemotePlaylists } = usePlaylists();
  const scrollViewRef = useRef<ScrollView>(null);
  const sermonTitleInputRef = useRef<TextInput>(null);
  const [section, setSection] = useState<Section>("sermons");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadFileName, setUploadFileName] = useState("");
  const [sermons, setSermons] = useState<AdminSermon[]>([]);
  const [playlists, setPlaylists] = useState<AdminPlaylist[]>([]);
  const [sermonDraft, setSermonDraft] = useState<SermonDraft | null>(null);
  const [playlistDraft, setPlaylistDraft] = useState<PlaylistDraft | null>(null);
  const [managedPlaylist, setManagedPlaylist] = useState<AdminPlaylist | null>(
    null,
  );
  const [playlistItems, setPlaylistItems] = useState<
    PlaylistItemWithSermon[]
  >([]);
  const [search, setSearch] = useState("");
  const [playlistSearch, setPlaylistSearch] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);

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
    }, [loadContent]),
  );

  const filteredSermons = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return sermons;
    return sermons.filter((sermon) =>
      [sermon.title, sermon.preacher, sermon.genre].some((value) =>
        String(value ?? "")
          .toLowerCase()
          .includes(query),
      ),
    );
  }, [search, sermons]);

  const filteredPlaylists = useMemo(() => {
    const query = playlistSearch.trim().toLowerCase();
    if (!query) return playlists;
    return playlists.filter((playlist) =>
      playlist.name.toLowerCase().includes(query),
    );
  }, [playlistSearch, playlists]);

  const itemBySermonId = useMemo(
    () => new Map(playlistItems.map((item) => [item.sermon_id, item])),
    [playlistItems],
  );

  const runMutation = async (operation: () => Promise<void>) => {
    setSaving(true);
    try {
      await operation();
      await Promise.all([
        loadContent(),
        refreshSermons(true),
        refreshRemotePlaylists(true),
      ]);
    } catch (error) {
      showToast(getAdminErrorMessage(error), "error", 3200);
    } finally {
      setSaving(false);
    }
  };

  const saveSermon = async () => {
    if (!sermonDraft?.id || !sermonDraft.title.trim() || !sermonDraft.audioKey.trim()) {
      showToast("Title and audio key are required.", "error");
      return;
    }

    const parsedDuration = Number(sermonDraft.duration);
    const payload = {
      title: sermonDraft.title.trim(),
      audio_key: sermonDraft.audioKey.trim(),
      preacher: optionalText(sermonDraft.preacher),
      date: optionalText(sermonDraft.date),
      duration: Number.isFinite(parsedDuration) ? parsedDuration : 0,
      image_key: optionalText(sermonDraft.imageKey),
      category: optionalText(sermonDraft.category),
      genre: optionalText(sermonDraft.genre),
    };

    await runMutation(async () => {
      await adminUpdateSermon(sermonDraft.id!, payload);
      setSermonDraft(null);
      showToast("Sermon updated.");
    });
  };

  const addSermonAudio = async () => {
    if (uploading) return;

    try {
      const asset = await pickSermonAudio();
      if (!asset) return;

      setUploading(true);
      setUploadProgress(0);
      setUploadFileName(asset.name);
      await uploadSermonAudio(asset, setUploadProgress);
      await Promise.all([
        loadContent(),
        refreshSermons(true),
        refreshRemotePlaylists(true),
      ]);
      showToast("Audio uploaded and sermon published.", "success", 3000);
    } catch (error) {
      showToast(getAdminErrorMessage(error), "error", 4000);
    } finally {
      setUploading(false);
      setUploadProgress(0);
      setUploadFileName("");
    }
  };

  const editSermon = (sermon: AdminSermon) => {
    setSermonDraft({
      id: sermon.id,
      title: sermon.title,
      preacher: sermon.preacher ?? "",
      date: sermon.date ?? "",
      duration: String(sermon.duration ?? 0),
      audioKey: sermon.audio_key ?? "",
      imageKey: sermon.image_key ?? "",
      category: sermon.category ?? "other",
      genre: sermon.genre ?? "",
    });

    requestAnimationFrame(() => {
      scrollViewRef.current?.scrollTo({ y: 110, animated: true });
      setTimeout(() => sermonTitleInputRef.current?.focus(), 350);
    });
  };

  const savePlaylist = async () => {
    if (!playlistDraft?.name.trim()) {
      showToast("Playlist name is required.", "error");
      return;
    }

    const payload = {
      name: playlistDraft.name.trim(),
      description: optionalText(playlistDraft.description),
      image_key: optionalText(playlistDraft.imageKey),
    };

    await runMutation(async () => {
      if (playlistDraft.id) {
        await adminUpdatePlaylist(playlistDraft.id, payload);
      } else {
        await adminInsertPlaylist(payload);
      }
      setPlaylistDraft(null);
      showToast(playlistDraft.id ? "Playlist updated." : "Playlist published.");
    });
  };

  const openPlaylistItems = async (playlist: AdminPlaylist) => {
    setManagedPlaylist(playlist);
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

  const togglePlaylistSermon = async (sermonId: string) => {
    if (!managedPlaylist) return;
    const existing = itemBySermonId.get(sermonId);

    await runMutation(async () => {
      if (existing) {
        await adminDeletePlaylistItem(existing.id);
      } else {
        await adminInsertPlaylistItem(managedPlaylist.id, sermonId);
      }
      setPlaylistItems(
        await fetchPlaylistItemsWithSermons(managedPlaylist.id),
      );
      showToast(existing ? "Removed from playlist." : "Added to playlist.");
    });
  };

  const removePlaylistItem = async (item: PlaylistItemWithSermon) => {
    if (!managedPlaylist) return;
    await runMutation(async () => {
      await adminDeletePlaylistItem(item.id);
      setPlaylistItems(
        await fetchPlaylistItemsWithSermons(managedPlaylist.id),
      );
      showToast("Removed from playlist.");
    });
  };

  const movePlaylistItem = async (index: number, direction: -1 | 1) => {
    if (!managedPlaylist) return;
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= playlistItems.length) return;

    const reordered = [...playlistItems];
    [reordered[index], reordered[targetIndex]] = [
      reordered[targetIndex],
      reordered[index],
    ];

    await runMutation(async () => {
      await Promise.all(
        reordered.map((item, position) =>
          adminUpdatePlaylistItem(item.id, { position }),
        ),
      );
      setPlaylistItems(
        await fetchPlaylistItemsWithSermons(managedPlaylist.id),
      );
      showToast("Playlist order updated.");
    });
  };

  const confirmDeleteSermon = (sermon: AdminSermon) => {
    setDeleteTarget({ kind: "sermon", id: sermon.id, label: sermon.title });
  };

  const confirmDeletePlaylist = (playlist: AdminPlaylist) => {
    setDeleteTarget({ kind: "playlist", id: playlist.id, label: playlist.name });
  };

  const deleteSelectedContent = async () => {
    if (!deleteTarget || saving) return;
    const target = deleteTarget;

    await runMutation(async () => {
      if (target.kind === "sermon") {
        await adminDeleteSermon(target.id);
        showToast("Sermon deleted.");
      } else {
        await adminDeletePlaylist(target.id);
        showToast("Playlist deleted.");
      }
      setDeleteTarget(null);
    });
  };

  if (adminLoading) {
    return (
      <CenteredState background={theme.background}>
        <ActivityIndicator color={theme.tint} size="large" />
        <ThemedText>Checking administrator access…</ThemedText>
      </CenteredState>
    );
  }

  if (!user || !isAdmin) {
    return (
      <CenteredState background={theme.background}>
        <MaterialIcons name="admin-panel-settings" size={52} color={theme.icon} />
        <ThemedText type="title">
          {user ? "Admin access required" : "Sign in required"}
        </ThemedText>
        <ThemedText style={styles.centeredCopy}>
          {adminError ||
            (user
              ? "This account is not authorized to manage published content."
              : "Sign in with an administrator account to continue.")}
        </ThemedText>
        {!user && (
          <ActionButton label="Sign in" onPress={() => router.push("/auth")} />
        )}
        <TouchableOpacity onPress={() => router.back()}>
          <ThemedText style={{ color: theme.tint }}>Go back</ThemedText>
        </TouchableOpacity>
      </CenteredState>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconButton}>
          <MaterialIcons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <View style={styles.headerCopy}>
          <ThemedText type="title" style={styles.headerTitle}>
            Content admin
          </ThemedText>
          <ThemedText style={styles.headerSubtitle}>Published library</ThemedText>
        </View>
        <TouchableOpacity onPress={() => void loadContent()} style={styles.iconButton}>
          <MaterialIcons name="refresh" size={24} color={theme.text} />
        </TouchableOpacity>
      </View>

      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.segmented, { backgroundColor: theme.border + "70" }]}>
          {(["sermons", "playlists"] as const).map((value) => (
            <TouchableOpacity
              key={value}
              onPress={() => {
                setSection(value);
                setSermonDraft(null);
                setPlaylistDraft(null);
                setManagedPlaylist(null);
                setSearch("");
                setPlaylistSearch("");
              }}
              style={[
                styles.segment,
                section === value && { backgroundColor: theme.background },
              ]}
            >
              <ThemedText type="defaultSemiBold">
                {value === "sermons" ? `Sermons (${sermons.length})` : `Playlists (${playlists.length})`}
              </ThemedText>
            </TouchableOpacity>
          ))}
        </View>

        {loading && <ActivityIndicator color={theme.tint} style={styles.loader} />}

        {section === "sermons" && (
          <>
            <SectionHeading
              title="Published sermons"
              actionLabel={uploading ? "Uploading…" : "Upload sermon"}
              onAction={() => void addSermonAudio()}
              disabled={uploading}
            />
            {uploading && (
              <View style={[styles.uploadCard, { borderColor: theme.border }]}>
                <View style={styles.uploadCopy}>
                  <MaterialIcons name="cloud-upload" size={24} color={theme.tint} />
                  <View style={styles.rowCopy}>
                    <ThemedText type="defaultSemiBold" numberOfLines={1}>
                      {uploadFileName}
                    </ThemedText>
                    <ThemedText style={styles.rowSubtitle}>
                      Uploading to Cloudflare… {uploadProgress}%
                    </ThemedText>
                  </View>
                </View>
                <View style={[styles.progressTrack, { backgroundColor: theme.border }]}>
                  <View
                    style={[
                      styles.progressFill,
                      { width: `${uploadProgress}%`, backgroundColor: theme.tint },
                    ]}
                  />
                </View>
              </View>
            )}
            <SearchInput value={search} onChangeText={setSearch} theme={theme} />
            {sermonDraft && (
              <View style={[styles.formCard, { borderColor: theme.border }]}>
                <ThemedText type="subtitle">
                  Edit sermon
                </ThemedText>
                <Field inputRef={sermonTitleInputRef} label="Title *" value={sermonDraft.title} onChange={(title) => setSermonDraft({ ...sermonDraft, title })} theme={theme} />
                <Field label="Audio key *" value={sermonDraft.audioKey} onChange={(audioKey) => setSermonDraft({ ...sermonDraft, audioKey })} theme={theme} autoCapitalize="none" />
                <Field label="Preacher" value={sermonDraft.preacher} onChange={(preacher) => setSermonDraft({ ...sermonDraft, preacher })} theme={theme} />
                <Field label="Date" value={sermonDraft.date} onChange={(date) => setSermonDraft({ ...sermonDraft, date })} theme={theme} autoCapitalize="none" />
                <Field label="Duration in seconds" value={sermonDraft.duration} onChange={(duration) => setSermonDraft({ ...sermonDraft, duration })} theme={theme} keyboardType="numeric" />
                <Field label="Image key" value={sermonDraft.imageKey} onChange={(imageKey) => setSermonDraft({ ...sermonDraft, imageKey })} theme={theme} autoCapitalize="none" />
                <Field label="Category" value={sermonDraft.category} onChange={(category) => setSermonDraft({ ...sermonDraft, category })} theme={theme} autoCapitalize="none" />
                <Field label="Genre" value={sermonDraft.genre} onChange={(genre) => setSermonDraft({ ...sermonDraft, genre })} theme={theme} />
                <FormActions saving={saving} onCancel={() => setSermonDraft(null)} onSave={() => void saveSermon()} />
              </View>
            )}
            {filteredSermons.map((sermon) => (
              <ContentRow
                key={sermon.id}
                title={sermon.title}
                subtitle={[sermon.preacher, sermon.category].filter(Boolean).join(" • ")}
                theme={theme}
                onEdit={() => editSermon(sermon)}
                onDelete={() => confirmDeleteSermon(sermon)}
              />
            ))}
          </>
        )}

        {section === "playlists" && !managedPlaylist && (
          <>
            <SectionHeading
              title="Published playlists"
              actionLabel="New playlist"
              onAction={() => setPlaylistDraft({ ...emptyPlaylist })}
            />
            <SearchInput
              value={playlistSearch}
              onChangeText={setPlaylistSearch}
              placeholder="Search playlists by name"
              theme={theme}
            />
            {playlistDraft && (
              <View style={[styles.formCard, { borderColor: theme.border }]}>
                <ThemedText type="subtitle">
                  {playlistDraft.id ? "Edit playlist" : "New playlist"}
                </ThemedText>
                <Field label="Name *" value={playlistDraft.name} onChange={(name) => setPlaylistDraft({ ...playlistDraft, name })} theme={theme} />
                <Field label="Description" value={playlistDraft.description} onChange={(description) => setPlaylistDraft({ ...playlistDraft, description })} theme={theme} multiline />
                <Field label="Image key" value={playlistDraft.imageKey} onChange={(imageKey) => setPlaylistDraft({ ...playlistDraft, imageKey })} theme={theme} autoCapitalize="none" />
                <FormActions saving={saving} onCancel={() => setPlaylistDraft(null)} onSave={() => void savePlaylist()} />
              </View>
            )}
            {filteredPlaylists.map((playlist) => (
              <ContentRow
                key={playlist.id}
                title={playlist.name}
                subtitle={playlist.description || "No description"}
                theme={theme}
                extraAction={{ label: "Messages", onPress: () => void openPlaylistItems(playlist) }}
                onEdit={() =>
                  setPlaylistDraft({
                    id: playlist.id,
                    name: playlist.name,
                    description: playlist.description ?? "",
                    imageKey: playlist.image_key ?? "",
                  })
                }
                onDelete={() => confirmDeletePlaylist(playlist)}
              />
            ))}
          </>
        )}

        {section === "playlists" && managedPlaylist && (
          <>
            <TouchableOpacity onPress={() => setManagedPlaylist(null)} style={styles.inlineBack}>
              <MaterialIcons name="arrow-back" size={20} color={theme.tint} />
              <ThemedText style={{ color: theme.tint }}>All playlists</ThemedText>
            </TouchableOpacity>
            <ThemedText type="subtitle">{managedPlaylist.name}</ThemedText>
            <ThemedText style={styles.helperText}>
              Reorder or remove current messages, then search by title to add
              another sermon. All changes target UUIDs.
            </ThemedText>
            <ThemedText type="defaultSemiBold" style={styles.listLabel}>
              Current order ({playlistItems.length})
            </ThemedText>
            {playlistItems.length === 0 && (
              <ThemedText style={styles.emptyInline}>
                This playlist has no sermons yet.
              </ThemedText>
            )}
            {playlistItems.map((item, index) => (
              <View
                key={item.id}
                style={[styles.itemPickerRow, { borderColor: theme.border }]}
              >
                <ThemedText style={styles.positionText}>
                  {index + 1}
                </ThemedText>
                <View style={styles.rowCopy}>
                  <ThemedText type="defaultSemiBold">
                    {item.sermon.title}
                  </ThemedText>
                  <ThemedText style={styles.rowSubtitle}>
                    {item.sermon.preacher}
                  </ThemedText>
                </View>
                <View style={styles.orderActions}>
                  <TouchableOpacity
                    disabled={saving || index === 0}
                    onPress={() => void movePlaylistItem(index, -1)}
                    style={[
                      styles.orderButton,
                      (saving || index === 0) && styles.disabled,
                    ]}
                  >
                    <MaterialIcons name="arrow-upward" size={19} color={theme.text} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    disabled={saving || index === playlistItems.length - 1}
                    onPress={() => void movePlaylistItem(index, 1)}
                    style={[
                      styles.orderButton,
                      (saving || index === playlistItems.length - 1) &&
                        styles.disabled,
                    ]}
                  >
                    <MaterialIcons name="arrow-downward" size={19} color={theme.text} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    disabled={saving}
                    onPress={() => void removePlaylistItem(item)}
                    style={styles.orderButton}
                  >
                    <MaterialIcons name="delete-outline" size={21} color="#dc2626" />
                  </TouchableOpacity>
                </View>
              </View>
            ))}

            <ThemedText type="defaultSemiBold" style={styles.listLabel}>
              Add a sermon
            </ThemedText>
            <SearchInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search sermons by title"
              theme={theme}
            />
            {filteredSermons
              .filter((sermon) => !itemBySermonId.has(sermon.id))
              .map((sermon) => {
              return (
                <View key={sermon.id} style={[styles.itemPickerRow, { borderColor: theme.border }]}>
                  <View style={styles.rowCopy}>
                    <ThemedText type="defaultSemiBold">{sermon.title}</ThemedText>
                    <ThemedText style={styles.rowSubtitle}>{sermon.preacher}</ThemedText>
                  </View>
                  <TouchableOpacity
                    disabled={saving}
                    onPress={() => void togglePlaylistSermon(sermon.id)}
                    style={[styles.toggleButton, { backgroundColor: theme.tint }]}
                  >
                    <ThemedText style={styles.lightButtonText}>Add</ThemedText>
                  </TouchableOpacity>
                </View>
              );
            })}
          </>
        )}
      </ScrollView>

      <Modal
        animationType="fade"
        transparent
        visible={Boolean(deleteTarget)}
        onRequestClose={() => !saving && setDeleteTarget(null)}
      >
        <View style={styles.modalBackdrop}>
          <View
            style={[
              styles.deleteModal,
              { backgroundColor: theme.background, borderColor: theme.border },
            ]}
          >
            <View style={styles.deleteIcon}>
              <MaterialIcons name="delete-outline" size={30} color="#dc2626" />
            </View>
            <ThemedText type="subtitle">
              Delete {deleteTarget?.kind === "sermon" ? "sermon" : "playlist"}?
            </ThemedText>
            <ThemedText style={styles.deleteMessage}>
              “{deleteTarget?.label}”{deleteTarget?.kind === "sermon"
                ? " will also be removed from published playlists."
                : " and its playlist items will be deleted."}
            </ThemedText>
            <View style={styles.modalActions}>
              <TouchableOpacity
                disabled={saving}
                onPress={() => setDeleteTarget(null)}
                style={styles.secondaryButton}
              >
                <ThemedText>Cancel</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                disabled={saving}
                onPress={() => void deleteSelectedContent()}
                style={[styles.deleteButton, saving && styles.disabled]}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <ThemedText style={styles.lightButtonText}>Delete</ThemedText>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function CenteredState({ children, background }: { children: React.ReactNode; background: string }) {
  return <SafeAreaView style={[styles.centered, { backgroundColor: background }]}>{children}</SafeAreaView>;
}

function ActionButton({ label, onPress }: { label: string; onPress: () => void }) {
  return <TouchableOpacity style={styles.primaryButton} onPress={onPress}><ThemedText style={styles.lightButtonText}>{label}</ThemedText></TouchableOpacity>;
}

function SectionHeading({ title, actionLabel, onAction, disabled = false }: { title: string; actionLabel: string; onAction: () => void; disabled?: boolean }) {
  return (
    <View style={styles.sectionHeading}>
      <ThemedText type="subtitle">{title}</ThemedText>
      <TouchableOpacity disabled={disabled} style={[styles.smallPrimaryButton, disabled && styles.disabled]} onPress={onAction}>
        <MaterialIcons name="add" size={18} color="#fff" />
        <ThemedText style={styles.lightButtonText}>{actionLabel}</ThemedText>
      </TouchableOpacity>
    </View>
  );
}

function SearchInput({ value, onChangeText, placeholder = "Search sermons", theme }: { value: string; onChangeText: (value: string) => void; placeholder?: string; theme: (typeof Colors)["light"] }) {
  return <TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor={theme.icon} style={[styles.searchInput, { color: theme.text, borderColor: theme.border }]} />;
}

function Field({ inputRef, label, value, onChange, theme, ...inputProps }: { inputRef?: React.Ref<TextInput>; label: string; value: string; onChange: (value: string) => void; theme: (typeof Colors)["light"] } & Pick<React.ComponentProps<typeof TextInput>, "autoCapitalize" | "keyboardType" | "multiline">) {
  return (
    <View style={styles.field}>
      <ThemedText style={styles.fieldLabel}>{label}</ThemedText>
      <TextInput ref={inputRef} value={value} onChangeText={onChange} placeholderTextColor={theme.icon} style={[styles.input, inputProps.multiline && styles.multiline, { color: theme.text, borderColor: theme.border }]} {...inputProps} />
    </View>
  );
}

function FormActions({ saving, onCancel, onSave }: { saving: boolean; onCancel: () => void; onSave: () => void }) {
  return (
    <View style={styles.formActions}>
      <TouchableOpacity onPress={onCancel} style={styles.secondaryButton}><ThemedText>Cancel</ThemedText></TouchableOpacity>
      <TouchableOpacity disabled={saving} onPress={onSave} style={[styles.primaryButton, saving && styles.disabled]}>
        {saving ? <ActivityIndicator color="#fff" /> : <ThemedText style={styles.lightButtonText}>Save</ThemedText>}
      </TouchableOpacity>
    </View>
  );
}

function ContentRow({ title, subtitle, theme, onEdit, onDelete, extraAction }: { title: string; subtitle: string; theme: (typeof Colors)["light"]; onEdit: () => void; onDelete: () => void; extraAction?: { label: string; onPress: () => void } }) {
  return (
    <View style={[styles.contentRow, { borderColor: theme.border }]}>
      <View style={styles.rowCopy}>
        <ThemedText type="defaultSemiBold">{title}</ThemedText>
        <ThemedText style={styles.rowSubtitle} numberOfLines={2}>{subtitle}</ThemedText>
      </View>
      <View style={styles.rowActions}>
        {extraAction && <TouchableOpacity onPress={extraAction.onPress}><ThemedText style={{ color: theme.tint }}>{extraAction.label}</ThemedText></TouchableOpacity>}
        <TouchableOpacity onPress={onEdit}><MaterialIcons name="edit" size={21} color={theme.tint} /></TouchableOpacity>
        <TouchableOpacity onPress={onDelete}><MaterialIcons name="delete-outline" size={22} color="#dc2626" /></TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", gap: 16, padding: 28 },
  centeredCopy: { textAlign: "center", opacity: 0.72, lineHeight: 22 },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  headerCopy: { flex: 1 },
  headerTitle: { fontSize: 22 },
  headerSubtitle: { fontSize: 13, opacity: 0.65 },
  iconButton: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  content: { padding: 16, paddingBottom: 56, gap: 12 },
  segmented: { flexDirection: "row", borderRadius: 12, padding: 4 },
  segment: { flex: 1, alignItems: "center", paddingVertical: 10, borderRadius: 9 },
  loader: { marginVertical: 8 },
  sectionHeading: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 4 },
  smallPrimaryButton: { backgroundColor: "#0a7ea4", borderRadius: 9, paddingHorizontal: 12, paddingVertical: 8, flexDirection: "row", alignItems: "center", gap: 4 },
  primaryButton: { minWidth: 96, backgroundColor: "#0a7ea4", borderRadius: 10, paddingHorizontal: 18, paddingVertical: 12, alignItems: "center" },
  secondaryButton: { minWidth: 96, borderRadius: 10, paddingHorizontal: 18, paddingVertical: 12, alignItems: "center" },
  lightButtonText: { color: "#fff", fontWeight: "600" },
  disabled: { opacity: 0.55 },
  searchInput: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 11 },
  uploadCard: { borderWidth: 1, borderRadius: 12, padding: 13, gap: 10 },
  uploadCopy: { flexDirection: "row", alignItems: "center", gap: 10 },
  progressTrack: { height: 7, overflow: "hidden", borderRadius: 999 },
  progressFill: { height: "100%", borderRadius: 999 },
  formCard: { borderWidth: 1, borderRadius: 14, padding: 14, gap: 11 },
  field: { gap: 5 },
  fieldLabel: { fontSize: 13, opacity: 0.72 },
  input: { borderWidth: 1, borderRadius: 9, paddingHorizontal: 12, paddingVertical: 10 },
  multiline: { minHeight: 84, textAlignVertical: "top" },
  formActions: { flexDirection: "row", justifyContent: "flex-end", alignItems: "center", gap: 8, marginTop: 4 },
  contentRow: { borderWidth: 1, borderRadius: 12, padding: 13, flexDirection: "row", alignItems: "center", gap: 10 },
  rowCopy: { flex: 1, gap: 3 },
  rowSubtitle: { fontSize: 13, opacity: 0.68 },
  rowActions: { flexDirection: "row", alignItems: "center", gap: 14 },
  inlineBack: { alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 6 },
  helperText: { opacity: 0.7, marginTop: -6 },
  listLabel: { marginTop: 8 },
  emptyInline: { opacity: 0.65, paddingVertical: 8 },
  positionText: { width: 24, textAlign: "center", opacity: 0.6 },
  orderActions: { flexDirection: "row", alignItems: "center", gap: 4 },
  orderButton: { width: 34, height: 34, alignItems: "center", justifyContent: "center" },
  itemPickerRow: { borderBottomWidth: StyleSheet.hairlineWidth, paddingVertical: 11, flexDirection: "row", alignItems: "center", gap: 12 },
  toggleButton: { minWidth: 72, borderRadius: 8, alignItems: "center", paddingHorizontal: 10, paddingVertical: 8 },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.55)", alignItems: "center", justifyContent: "center", padding: 24 },
  deleteModal: { width: "100%", maxWidth: 440, borderWidth: 1, borderRadius: 16, padding: 20, alignItems: "center", gap: 12 },
  deleteIcon: { width: 54, height: 54, borderRadius: 27, backgroundColor: "rgba(220,38,38,0.12)", alignItems: "center", justifyContent: "center" },
  deleteMessage: { textAlign: "center", opacity: 0.75, lineHeight: 21 },
  modalActions: { width: "100%", flexDirection: "row", justifyContent: "flex-end", alignItems: "center", gap: 8, marginTop: 6 },
  deleteButton: { minWidth: 96, backgroundColor: "#dc2626", borderRadius: 10, paddingHorizontal: 18, paddingVertical: 12, alignItems: "center" },
});
