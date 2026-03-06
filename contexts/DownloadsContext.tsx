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
import * as FileSystem from "expo-file-system";
import * as FileSystemLegacy from "expo-file-system/legacy";
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
  progress: number; // 0 - 100
  localPath?: string;
}

interface PersistedDownloadItem {
  sermonId: string;
  localPath: string;
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

const PROGRESS_FLUSH_INTERVAL_MS = 800;
const PROGRESS_FLUSH_DELTA_PERCENT = 10;

export const DownloadsProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const STORAGE_KEY = "@downloads_v2";
  const { sermons } = useSermons();
  const [downloads, setDownloads] = useState<Map<string, DownloadItem>>(
    new Map(),
  );
  const [loading, setLoading] = useState(false);
  const progressTrackerRef = useRef<
    Map<string, { time: number; progress: number }>
  >(new Map());
  const sermonsByIdRef = useRef<Map<string, Sermon>>(new Map());
  const downloadsRef = useRef<Map<string, DownloadItem>>(new Map());

  useEffect(() => {
    sermonsByIdRef.current = new Map(
      sermons.map((sermon) => [sermon.id, sermon]),
    );
  }, [sermons]);

  useEffect(() => {
    downloadsRef.current = downloads;
  }, [downloads]);

  const downloadedSermons = useMemo(
    () => Array.from(downloads.values()),
    [downloads],
  );

  const downloadedIds = useMemo(
    () =>
      new Set(
        downloadedSermons
          .filter((item) => item.status === "completed")
          .map((item) => item.sermon.id),
      ),
    [downloadedSermons],
  );

  const downloadingIds = useMemo(
    () =>
      new Set(
        downloadedSermons
          .filter(
            (item) =>
              item.status === "downloading" || item.status === "pending",
          )
          .map((item) => item.sermon.id),
      ),
    [downloadedSermons],
  );

  const persistCompletedDownloads = useCallback(
    async (map: Map<string, DownloadItem>) => {
      const completed: PersistedDownloadItem[] = Array.from(map.values())
        .filter((item) => item.status === "completed" && !!item.localPath)
        .map((item) => ({
          sermonId: item.sermon.id,
          localPath: item.localPath as string,
        }));

      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(completed));
    },
    [STORAGE_KEY],
  );

  const getFallbackSermon = useCallback(
    (sermonId: string): Sermon => ({
      id: sermonId,
      title: "Downloaded Message",
      preacher: "Unknown",
      date: "",
      duration: 0,
      audioUrl: "",
    }),
    [],
  );

  /* ---------------- LOAD DOWNLOADS ---------------- */
  const loadDownloads = useCallback(async () => {
    setLoading(true);
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      const map = new Map<string, DownloadItem>();

      // Load stored completed downloads
      if (stored) {
        const parsed = JSON.parse(stored) as Array<
          PersistedDownloadItem | DownloadItem
        >;
        for (const item of parsed) {
          const sermonId = "sermonId" in item ? item.sermonId : item.sermon?.id;
          const localPath = "localPath" in item ? item.localPath : undefined;

          if (!sermonId || !localPath) continue;

          const info = await FileSystemLegacy.getInfoAsync(localPath);
          if (!info.exists) continue;

          map.set(sermonId, {
            sermon:
              "sermon" in item && item.sermon
                ? item.sermon
                : getFallbackSermon(sermonId),
            status: "completed",
            progress: 100,
            localPath,
          });
        }
      }

      // --- Use new Expo FileSystem Directory/File API for reconciliation ---
      const { Directory } = FileSystem as any;
      const { Paths } = FileSystem as any;
      const sermonsDir = new Directory(Paths.document, "sermons");

      const sermonsById = sermonsByIdRef.current;

      // Hydrate stored entries with fetched metadata
      for (const [sermonId, item] of map.entries()) {
        const hydrated = sermonsById.get(sermonId);
        if (!hydrated) continue;

        map.set(sermonId, {
          ...item,
          sermon: hydrated,
        });
      }

      if (sermonsDir.exists) {
        const files = sermonsDir.list();
        for (const file of files) {
          if (!LOCAL_AUDIO_EXTENSION_PATTERN.test(file.name)) continue;
          // Auto-healing: remove phantom or corrupted files
          if (!file.exists || !file.size || file.size < 50 * 1024) {
            await file.delete({ idempotent: true });
            continue;
          }
          const sermonId = file.name.replace(LOCAL_AUDIO_EXTENSION_PATTERN, "");
          if (!map.has(sermonId)) {
            let sermon: Sermon | undefined = sermonsById.get(sermonId);
            if (!sermon) {
              sermon = getFallbackSermon(sermonId);
            }
            map.set(sermonId, {
              sermon,
              status: "completed",
              progress: 100,
              localPath: file.uri,
            });
          }
        }
      }

      await persistCompletedDownloads(map);

      setDownloads(map);
      console.log(
        "[DownloadsContext] Loaded downloads and reconciled local files",
      );
    } catch (e) {
      console.error("Failed to load downloads:", e);
    } finally {
      setLoading(false);
    }
  }, [getFallbackSermon, persistCompletedDownloads]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      void persistCompletedDownloads(downloadsRef.current);
    }, 200);

    return () => clearTimeout(timeoutId);
  }, [downloads, persistCompletedDownloads]);

  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => {
      void loadDownloads();
    });

    return () => {
      task.cancel();
    };
  }, [loadDownloads]);

  useEffect(() => {
    if (!sermons.length || !downloads.size) return;

    const sermonsById = new Map(sermons.map((sermon) => [sermon.id, sermon]));

    setDownloads((prev) => {
      let changed = false;
      const next = new Map(prev);

      for (const [id, item] of next.entries()) {
        const hydrated = sermonsById.get(id);
        if (!hydrated || item.sermon === hydrated) continue;
        next.set(id, { ...item, sermon: hydrated });
        changed = true;
      }

      return changed ? next : prev;
    });
  }, [downloads.size, sermons]);

  /* ---------------- HELPERS ---------------- */
  const isDownloaded = useCallback(
    (sermonId: string) => downloads.get(sermonId)?.status === "completed",
    [downloads],
  );
  const isDownloading = useCallback(
    (sermonId: string) => {
      const status = downloads.get(sermonId)?.status;
      return status === "downloading" || status === "pending";
    },
    [downloads],
  );
  const getProgress = useCallback(
    (sermonId: string) => downloads.get(sermonId),
    [downloads],
  );

  /* ---------------- START DOWNLOAD ---------------- */
  const startDownload = useCallback(async (sermon: Sermon) => {
    const existing = downloadsRef.current.get(sermon.id);
    if (existing?.status === "downloading" || existing?.status === "pending") {
      return;
    }

    setDownloads((prev) => {
      const next = new Map(prev);
      next.set(sermon.id, { sermon, status: "pending", progress: 0 });
      return next;
    });

    try {
      const fileUri = await downloadSermon(sermon, (progress) => {
        const tracker = progressTrackerRef.current.get(sermon.id);
        const now = Date.now();
        const shouldFlushProgress =
          progress.status === "completed" ||
          progress.status === "error" ||
          progress.status === "canceled" ||
          !tracker ||
          now - tracker.time >= PROGRESS_FLUSH_INTERVAL_MS ||
          Math.abs(progress.progress - tracker.progress) >=
            PROGRESS_FLUSH_DELTA_PERCENT;

        if (!shouldFlushProgress) {
          return;
        }

        progressTrackerRef.current.set(sermon.id, {
          time: now,
          progress: progress.progress,
        });

        setDownloads((prev) => {
          const next = new Map(prev);
          const existing = next.get(sermon.id);
          if (!existing) return prev;

          const updated: DownloadItem = {
            ...existing,
            progress: progress.progress,
            status:
              progress.status === "completed"
                ? "completed"
                : progress.status === "canceled"
                  ? "canceled"
                  : progress.status === "error"
                    ? "error"
                    : progress.status === "pending"
                      ? "pending"
                      : "downloading",
            localPath:
              progress.status === "completed"
                ? getSermonFilePath(sermon.id, sermon.audioUrl)
                : existing.localPath,
          };

          if (
            existing.progress === updated.progress &&
            existing.status === updated.status &&
            existing.localPath === updated.localPath
          ) {
            return prev;
          }

          next.set(sermon.id, updated);
          return next;
        });
      });
      // If fileUri is returned and file exists, mark as completed
      if (fileUri) {
        const fileInfo = await FileSystemLegacy.getInfoAsync(fileUri);
        if (fileInfo.exists) {
          progressTrackerRef.current.delete(sermon.id);
          setDownloads((prev) => {
            const next = new Map(prev);
            next.set(sermon.id, {
              sermon,
              status: "completed",
              progress: 100,
              localPath: fileUri,
            });
            return next;
          });

          await trackDownload(sermon.id, fileUri, fileInfo.size || 0);
        }
      }
    } catch (e) {
      progressTrackerRef.current.delete(sermon.id);
      setDownloads((prev) => {
        const next = new Map(prev);
        const existing = next.get(sermon.id);
        if (existing)
          next.set(sermon.id, { ...existing, status: "error", progress: 0 });
        return next;
      });
      console.error(`[DownloadsContext] Download failed for ${sermon.id}:`, e);
    }
  }, []);

  /* ---------------- DELETE ---------------- */
  const deleteDownload = useCallback(async (sermonId: string) => {
    progressTrackerRef.current.delete(sermonId);
    setDownloads((prev) => {
      const next = new Map(prev);
      next.delete(sermonId);
      return next;
    });

    try {
      await deleteSermonFile(sermonId);
      await removeUserDownload(sermonId);
    } catch (e) {
      console.error("Failed to delete file:", e);
    }
  }, []);

  /* ---------------- CANCEL ---------------- */
  const cancelDownload = useCallback(async (sermonId: string) => {
    try {
      await cancelSermonDownload(sermonId);
      await removeUserDownload(sermonId);
    } catch (e) {
      console.warn("Failed to cancel download:", e);
    }
    setDownloads((prev) => {
      const next = new Map(prev);
      next.delete(sermonId);
      return next;
    });
    progressTrackerRef.current.delete(sermonId);
  }, []);

  /* ---------------- CLEAR ALL ---------------- */
  const clearAllDownloads = useCallback(async () => {
    try {
      console.log("[DownloadsContext] Clearing ALL downloads...");
      for (const item of downloads.values()) {
        try {
          await deleteSermonFile(item.sermon.id);
          await removeUserDownload(item.sermon.id);
        } catch (e) {
          console.error("Failed deleting file:", item.sermon.id, e);
        }
      }
      await AsyncStorage.removeItem(STORAGE_KEY);
      setDownloads(new Map());
      progressTrackerRef.current.clear();
      console.log("[DownloadsContext] All downloads cleared.");
    } catch (e) {
      console.error("Failed clearing downloads:", e);
    }
  }, [downloads]);

  const count = useMemo(
    () =>
      Array.from(downloads.values()).filter(
        (item) => item.status === "completed",
      ).length,
    [downloads],
  );

  const contextValue = useMemo(
    () => ({
      downloads,
      downloadedSermons,
      downloadedIds,
      downloadingIds,
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
    }),
    [
      downloads,
      downloadedSermons,
      downloadedIds,
      downloadingIds,
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
    ],
  );

  return (
    <DownloadsContext.Provider value={contextValue}>
      {children}
    </DownloadsContext.Provider>
  );
};

export function useDownloadsContext() {
  const ctx = useContext(DownloadsContext);
  if (!ctx)
    throw new Error(
      "useDownloadsContext must be used within a DownloadsProvider",
    );
  return ctx;
}
