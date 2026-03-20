import {
  cancelDownload as cancelSermonDownload,
  deleteSermonFile,
  downloadSermon,
  getSermonFilePath,
} from "@/lib/download-service";
import {
  removeDownload as removeUserDownload,
  trackDownload,
} from "@/lib/user-downloads";
import { Sermon } from "@/types/sermon";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system/legacy";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { InteractionManager } from "react-native";
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

export const DownloadsProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const INDEX_KEY = "@downloads_index_v2";
  const { sermons } = useSermons();

  const [downloads, setDownloads] = useState<Map<string, DownloadItem>>(
    new Map(),
  );
  const [loading, setLoading] = useState(false);

  const downloadsRef = useRef(downloads);
  const sermonsByIdRef = useRef<Map<string, Sermon>>(new Map());

  useEffect(() => {
    downloadsRef.current = downloads;
  }, [downloads]);

  useEffect(() => {
    sermonsByIdRef.current = new Map(
      sermons.map((s) => [s.id, s]),
    );
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
    setLoading(true);

    try {
      const map = new Map<string, DownloadItem>();

      const indexRaw = await AsyncStorage.getItem(INDEX_KEY);

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

          map.set(sermonId, {
            sermon:
              sermonsByIdRef.current.get(sermonId) ??
              getFallbackSermon(sermonId),
            status: "completed",
            progress: 100,
            localPath,
          });
        }
      }

      // 🔥 Reconcile directory (LEGACY)
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
            map.set(sermonId, {
              sermon:
                sermonsByIdRef.current.get(sermonId) ??
                getFallbackSermon(sermonId),
              status: "completed",
              progress: 100,
              localPath: uri,
            });
          }
        }
      }

      setDownloads(map);

      // persist AFTER UI update
      await persistCompletedDownloads(map);
    } catch (e) {
      console.error("loadDownloads error:", e);
    } finally {
      setLoading(false);
    }
  }, [getFallbackSermon]);

  /* ---------------- PERSIST ---------------- */
  const persistCompletedDownloads = useCallback(async (map: Map<string, DownloadItem>) => {
    const index: string[] = [];

    for (const item of map.values()) {
      if (item.status !== "completed" || !item.localPath) continue;

      const s = item.sermon;

      await AsyncStorage.setItem(
        `@download_${s.id}`,
        JSON.stringify({
          sermonId: s.id,
          localPath: item.localPath,
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
  }, []);

  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => {
      loadDownloads();
    });

    return () => task.cancel();
  }, [loadDownloads]);

  /* ---------------- HELPERS ---------------- */
  const isDownloaded = useCallback(
    (id: string) => downloads.get(id)?.status === "completed",
    [downloads],
  );

  const isDownloading = useCallback(
    (id: string) => {
      const s = downloads.get(id)?.status;
      return s === "pending" || s === "downloading";
    },
    [downloads],
  );

  const getProgress = useCallback(
    (id: string) => downloads.get(id),
    [downloads],
  );

  /* ---------------- START ---------------- */
  const startDownload = useCallback(
    async (sermon: Sermon) => {
      if (isDownloading(sermon.id)) return;

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
              status: progress.status === "completed"
                ? "completed"
                : progress.status,
            });

            return next;
          });
        });

        if (uri) {
          const info = await FileSystem.getInfoAsync(uri);

          if (info.exists) {
            setDownloads((prev) => {
              const next = new Map(prev);
              next.set(sermon.id, {
                sermon,
                status: "completed",
                progress: 100,
                localPath: uri,
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
    [downloadSermon, trackDownload, isDownloading],
  );

  /* ---------------- DELETE ---------------- */
  const deleteDownload = useCallback(
    async (id: string) => {
      setDownloads((prev) => {
        const next = new Map(prev);
        next.delete(id);
        return next;
      });

      await deleteSermonFile(id);
      await removeUserDownload(id);
      await AsyncStorage.removeItem(`@download_${id}`);
    },
    [deleteSermonFile, removeUserDownload],
  );

  /* ---------------- CANCEL ---------------- */
  const cancelDownload = useCallback(
    async (id: string) => {
      await cancelSermonDownload(id);
      await removeUserDownload(id);

      setDownloads((prev) => {
        const next = new Map(prev);
        next.delete(id);
        return next;
      });
    },
    [cancelSermonDownload, removeUserDownload],
  );

  /* ---------------- CLEAR ---------------- */
  const clearAllDownloads = useCallback(async () => {
    for (const item of downloads.values()) {
      await deleteSermonFile(item.sermon.id);
      await removeUserDownload(item.sermon.id);
    }

    await AsyncStorage.clear();
    setDownloads(new Map());
  }, [downloads, deleteSermonFile, removeUserDownload]);

  const count = useMemo(
    () =>
      Array.from(downloads.values()).filter(
        (i) => i.status === "completed",
      ).length,
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
        isDownloaded,
        isDownloading,
        getProgress,
        startDownload,
        deleteDownload,
        cancelDownload,
        loadDownloads,
        count,
        clearAllDownloads,
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