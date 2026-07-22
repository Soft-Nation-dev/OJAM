import {
    cancelDownload as cancelSermonDownload,
    deleteSermonFile,
    downloadSermon,
} from "@/lib/download-service";
import {
    removeDownload as removeUserDownload,
    trackDownload,
} from "@/lib/user-downloads";
import { Sermon } from "@/types/sermon";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system/legacy";
import * as ImageManipulator from "expo-image-manipulator";
import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import { InteractionManager, Platform } from "react-native";
import { useSermons } from "./SermonsContext";

type DownloadStatus =
  | "pending"
  | "downloading"
  | "completed"
  | "canceled"
  | "error";

export interface DownloadItem {
  sermon: Sermon;
  status: DownloadStatus;
  progress: number;
  localPath?: string;
  localImagePath?: string; // ✅ store downloaded image
}

const LOCAL_AUDIO_EXTENSION_PATTERN = /\.(mp3|m4a|wav|aac|ogg)$/i;

interface DownloadsContextProps {
  downloads: Map<string, DownloadItem>;
  downloadedSermons: DownloadItem[];
  downloadedIds: Set<string>;
  downloadingIds: Set<string>;
  loading: boolean;
  isDownloaded: (sermonId: string) => boolean;
  isDownloading: (sermonId: string) => boolean;
  getProgress: (sermonId: string) => DownloadItem | undefined;
  startDownload: (sermon: Sermon) => Promise<void>;
  deleteDownload: (sermonId: string) => Promise<void>;
  cancelDownload: (sermonId: string) => Promise<void>;
  loadDownloads: () => Promise<void>;
  count: number;
  clearAllDownloads: () => Promise<void>;
}

const DownloadsContext = createContext<DownloadsContextProps | undefined>(
  undefined,
);

/* ---------------- IMAGE DOWNLOAD HELPER ---------------- */
// Downloads and stores image locally
const downloadImage = async (sermon: Sermon) => {
  try {
    if (!sermon.imageUrl) return null;

    const dir = FileSystem.documentDirectory + "images/";

    const dirInfo = await FileSystem.getInfoAsync(dir);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
    }

    const fileUri = `${dir}${sermon.id}.jpg`;

    const result = await FileSystem.downloadAsync(sermon.imageUrl, fileUri);

    const manipResult = await ImageManipulator.manipulateAsync(
      result.uri,
      [{ resize: { width: 400 } }], // Example: resize to width 400px
      { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG },
    );

    if (manipResult.uri !== fileUri) {
      await FileSystem.deleteAsync(fileUri, { idempotent: true });

      try {
        await FileSystem.moveAsync({ from: manipResult.uri, to: fileUri });
      } catch {
        return manipResult.uri;
      }
    }

    return fileUri;
  } catch (e) {
    console.log("Image download failed:", e);
    return null;
  }
};

const resolveLocalImagePath = async (
  sermonId: string,
  storedPath?: string,
): Promise<string | undefined> => {
  if (storedPath) {
    try {
      const storedInfo = await FileSystem.getInfoAsync(storedPath);
      if (storedInfo.exists) return storedPath;
    } catch {
      // fall through to conventional location check
    }
  }

  const conventionalPath =
    FileSystem.documentDirectory + `images/${sermonId}.jpg`;

  try {
    const conventionalInfo = await FileSystem.getInfoAsync(conventionalPath);
    if (conventionalInfo.exists) return conventionalPath;
  } catch {
    // no-op
  }

  return undefined;
};

const backfillMissingImages = async (map: Map<string, DownloadItem>) => {
  let updated = false;

  for (const [sermonId, item] of map) {
    if (item.localImagePath || !item.sermon.imageUrl) continue;

    try {
      const imageUri = await downloadImage(item.sermon);
      if (!imageUri) continue;

      map.set(sermonId, {
        ...item,
        localImagePath: imageUri,
      });

      updated = true;
    } catch {
      // Ignore failures (offline or network errors)
    }
  }

  return updated;
};

export const DownloadsProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const INDEX_KEY = "@downloads_index_v2";
  const { sermons } = useSermons();

  const [downloads, setDownloads] = useState<Map<string, DownloadItem>>(
    new Map(),
  );
  const [loading, setLoading] = useState(false);

  const sermonsByIdRef = useRef<Map<string, Sermon>>(new Map());

  useEffect(() => {
    sermonsByIdRef.current = new Map(sermons.map((s) => [s.id, s]));
  }, [sermons]);

  const getFallbackSermon = useCallback(
    (id: string): Sermon => ({
      id,
      title: "Downloaded Message",
      preacher: "Unknown",
      date: "",
      duration: 0,
      audioUrl: "",
    }),
    [],
  );

  /* ---------------- LOAD ---------------- */
  const loadDownloads = useCallback(async () => {
    if (Platform.OS === "web") {
      setDownloads(new Map());
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const map = new Map<string, DownloadItem>();

      const indexRaw = await AsyncStorage.getItem(INDEX_KEY);

      // ✅ LOAD FROM STORAGE INDEX
      if (indexRaw) {
        const ids: string[] = JSON.parse(indexRaw);
        const keys = ids.map((id) => `@download_${id}`);
        const items = await AsyncStorage.multiGet(keys);

        for (const [, value] of items) {
          if (!value) continue;

          const parsed = JSON.parse(value);
          const sermonId = parsed.sermonId;
          const localPath = parsed.localPath;

          if (!sermonId || !localPath) continue;

          const info = await FileSystem.getInfoAsync(localPath);
          if (!info.exists) continue;

          const resolvedLocalImagePath = await resolveLocalImagePath(
            sermonId,
            parsed.localImagePath,
          );

          map.set(sermonId, {
            sermon:
              sermonsByIdRef.current.get(sermonId) ??
              parsed.sermon ??
              getFallbackSermon(sermonId),
            status: "completed",
            progress: 100,
            localPath,
            localImagePath: resolvedLocalImagePath,
          });
        }
      }

      // ✅ LEGACY FILE RECOVERY
      const dir = FileSystem.documentDirectory + "sermons/";
      const dirInfo = await FileSystem.getInfoAsync(dir);

      if (dirInfo.exists) {
        const files = await FileSystem.readDirectoryAsync(dir);

        for (const name of files) {
          if (!LOCAL_AUDIO_EXTENSION_PATTERN.test(name)) continue;

          const uri = dir + name;
          const info = await FileSystem.getInfoAsync(uri);

          if (!info.exists || !info.size) continue;

          const sermonId = name.replace(LOCAL_AUDIO_EXTENSION_PATTERN, "");

          if (!map.has(sermonId)) {
            const stored = await AsyncStorage.getItem(`@download_${sermonId}`);
            const parsedStored = stored ? JSON.parse(stored) : null;
            const resolvedLocalImagePath = await resolveLocalImagePath(
              sermonId,
              parsedStored?.localImagePath,
            );

            map.set(sermonId, {
              sermon:
                sermonsByIdRef.current.get(sermonId) ??
                parsedStored?.sermon ??
                getFallbackSermon(sermonId),
              status: "completed",
              progress: 100,
              localPath: uri,
              localImagePath: resolvedLocalImagePath,
            });
          }
        }
      }

      const didBackfill = await backfillMissingImages(map);

      setDownloads(map);

      await persistCompletedDownloads(map);
    } catch (e) {
      console.error("loadDownloads error:", e);
    } finally {
      setLoading(false);
    }
  }, [getFallbackSermon]);

  /* ---------------- PERSIST ---------------- */
  const persistCompletedDownloads = useCallback(
    async (map: Map<string, DownloadItem>) => {
      const index: string[] = [];

      for (const item of map.values()) {
        if (item.status !== "completed" || !item.localPath) continue;

        const s = item.sermon;

        await AsyncStorage.setItem(
          `@download_${s.id}`,
          JSON.stringify({
            sermonId: s.id,
            localPath: item.localPath,
            localImagePath: item.localImagePath,
            sermon: {
              id: s.id,
              title: s.title,
              preacher: s.preacher,
              duration: s.duration,
              imageUrl: s.imageUrl,
            },
          }),
        );

        index.push(s.id);
      }

      await AsyncStorage.setItem(INDEX_KEY, JSON.stringify(index));
    },
    [],
  );

  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => {
      loadDownloads();
    });

    return () => task.cancel();
  }, [loadDownloads]);

  useEffect(() => {
    if (sermons.length === 0) return;
    void loadDownloads();
  }, [sermons.length, loadDownloads]);

  /* ---------------- START DOWNLOAD ---------------- */
  const startDownload = useCallback(
    async (sermon: Sermon) => {
      setDownloads((prev) => {
        const next = new Map(prev);
        next.set(sermon.id, {
          sermon,
          status: "pending",
          progress: 0,
        });
        return next;
      });

      try {
        const uri = await downloadSermon(sermon, (progress) => {
          setDownloads((prev) => {
            const next = new Map(prev);
            const existing = next.get(sermon.id);
            if (!existing) return prev;

            next.set(sermon.id, {
              ...existing,
              progress: progress.progress,
              status: progress.status,
            });

            return next;
          });
        });

        if (uri) {
          const info = await FileSystem.getInfoAsync(uri);

          if (info.exists) {
            // ✅ download image alongside audio
            const imageUri = await downloadImage(sermon);

            setDownloads((prev) => {
              const next = new Map(prev);
              next.set(sermon.id, {
                sermon,
                status: "completed",
                progress: 100,
                localPath: uri,
                localImagePath: imageUri || undefined,
              });
              return next;
            });

            await trackDownload(sermon.id, uri, info.size || 0);
          }
        }
      } catch (e) {
        console.error("download error:", e);
      }
    },
    [trackDownload],
  );

  /* ---------------- DELETE ---------------- */
  const deleteDownload = useCallback(async (id: string) => {
    setDownloads((prev) => {
      const next = new Map(prev);
      next.delete(id);
      return next;
    });

    await deleteSermonFile(id);
    await removeUserDownload(id);

    // ✅ delete image too
    const imagePath = FileSystem.documentDirectory + `images/${id}.jpg`;
    await FileSystem.deleteAsync(imagePath, { idempotent: true });

    await AsyncStorage.removeItem(`@download_${id}`);
  }, []);

  /* ---------------- CANCEL ---------------- */
  const cancelDownload = useCallback(async (id: string) => {
    await cancelSermonDownload(id);
    await removeUserDownload(id);

    // Delete local image file if it exists
    const imagePath = FileSystem.documentDirectory + `images/${id}.jpg`;
    await FileSystem.deleteAsync(imagePath, { idempotent: true });

    setDownloads((prev) => {
      const next = new Map(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const count = useMemo(
    () =>
      Array.from(downloads.values()).filter((i) => i.status === "completed")
        .length,
    [downloads],
  );

  return (
    <DownloadsContext.Provider
      value={{
        downloads,
        downloadedSermons: Array.from(downloads.values()),
        downloadedIds: new Set(
          Array.from(downloads.values())
            .filter((i) => i.status === "completed")
            .map((i) => i.sermon.id),
        ),
        downloadingIds: new Set(
          Array.from(downloads.values())
            .filter((i) => i.status === "pending" || i.status === "downloading")
            .map((i) => i.sermon.id),
        ),
        loading,
        isDownloaded: (id) => downloads.get(id)?.status === "completed",
        isDownloading: (id) => {
          const s = downloads.get(id)?.status;
          return s === "pending" || s === "downloading";
        },
        getProgress: (id) => downloads.get(id),
        startDownload,
        deleteDownload,
        cancelDownload,
        loadDownloads,
        count,
        clearAllDownloads: async () => {}, // optional
      }}
    >
      {children}
    </DownloadsContext.Provider>
  );
};

export function useDownloadsContext() {
  const ctx = useContext(DownloadsContext);
  if (!ctx) {
    throw new Error("Must be used inside DownloadsProvider");
  }
  return ctx;
}
