import { Sermon } from "@/types/sermon";
import * as FileSystem from "expo-file-system";
import * as FileSystemLegacy from "expo-file-system/legacy";

export interface DownloadProgress {
  sermonId: string;
  progress: number; // 0-100
  totalBytes: number;
  downloadedBytes: number;
  status: "pending" | "downloading" | "completed" | "canceled" | "error";
  error?: string;
}

type ProgressCallback = (progress: DownloadProgress) => void;

const activeDownloads = new Map<string, FileSystemLegacy.DownloadResumable>();
const activeDownloadPaths = new Map<string, string>();
const canceledDownloads = new Set<string>();
const progressCallbacks = new Map<string, ProgressCallback[]>();

const SUPPORTED_EXTENSIONS = ["mp3", "m4a", "wav", "aac", "ogg"];

function inferAudioExtension(audioUrl?: string): string {
  if (!audioUrl) return "mp3";
  const match = audioUrl.match(/\.([a-zA-Z0-9]+)(?:$|[?#])/);
  const ext = match?.[1]?.toLowerCase();
  return ext && SUPPORTED_EXTENSIONS.includes(ext) ? ext : "mp3";
}

function emitProgress(
  progress: DownloadProgress,
  onProgress?: ProgressCallback,
) {
  if (onProgress) onProgress(progress);
  const callbacks = progressCallbacks.get(progress.sermonId);
  if (callbacks) callbacks.forEach((cb) => cb(progress));
}

/**
 * Get the local file path for a downloaded sermon (new API)
 */
export function getSermonFilePath(sermonId: string, audioUrl?: string): string {
  const { File, Directory, Paths } = FileSystem as any;
  const directory = new Directory(Paths.document, "sermons");
  const extension = inferAudioExtension(audioUrl);
  return new File(directory, `${sermonId}.${extension}`).uri;
}

/**
 * Ensure the sermons directory exists (new API)
 */
async function ensureDirectoryExists() {
  const { Directory, Paths } = FileSystem as any;
  const sermonsDir = new Directory(Paths.document, "sermons");
  if (!sermonsDir.exists) {
    sermonsDir.create({ intermediates: true, idempotent: true });
  }
}

/**
 * Download a sermon with progress tracking
 */
export async function downloadSermon(
  sermon: Sermon,
  onProgress?: ProgressCallback,
): Promise<string | null> {
  const sermonId = sermon.id;
  const audioUrl = sermon.audioUrl;
  if (!audioUrl) {
    throw new Error("Sermon has no audio URL");
  }
  const fileUri = getSermonFilePath(sermonId, audioUrl);
  // Check if already downloading
  if (activeDownloads.has(sermonId)) {
    emitProgress(
      {
        sermonId,
        progress: 0,
        totalBytes: 0,
        downloadedBytes: 0,
        status: "downloading",
      },
      onProgress,
    );
    return null;
  }
  await ensureDirectoryExists();
  const { File } = FileSystem as any;
  const file = new File(fileUri);
  if (file.exists) {
    return fileUri;
  }

  const handleProgress = (
    progressEvent: FileSystemLegacy.DownloadProgressData,
  ) => {
    const progress: DownloadProgress = {
      sermonId,
      progress: progressEvent.totalBytesExpectedToWrite
        ? Math.round(
            (progressEvent.totalBytesWritten /
              progressEvent.totalBytesExpectedToWrite) *
              100,
          )
        : 0,
      totalBytes: progressEvent.totalBytesExpectedToWrite || 0,
      downloadedBytes: progressEvent.totalBytesWritten || 0,
      status: "downloading",
    };
    emitProgress(progress, onProgress);
  };

  try {
    emitProgress(
      {
        sermonId,
        progress: 0,
        totalBytes: 0,
        downloadedBytes: 0,
        status: "pending",
      },
      onProgress,
    );

    const resumable = FileSystemLegacy.createDownloadResumable(
      audioUrl,
      fileUri,
      {},
      handleProgress,
    );

    activeDownloads.set(sermonId, resumable);
    activeDownloadPaths.set(sermonId, fileUri);
    const downloadResult = await resumable.downloadAsync();

    if (canceledDownloads.has(sermonId)) {
      canceledDownloads.delete(sermonId);
      return null;
    }

    if (!downloadResult?.uri) {
      throw new Error("Download failed");
    }

    const completeProgress: DownloadProgress = {
      sermonId,
      progress: 100,
      totalBytes: downloadResult.totalBytesWritten || 0,
      downloadedBytes: downloadResult.totalBytesWritten || 0,
      status: "completed",
    };
    emitProgress(completeProgress, onProgress);
    return fileUri;
  } catch (error) {
    if (canceledDownloads.has(sermonId)) {
      canceledDownloads.delete(sermonId);
      return null;
    }

    const errorProgress: DownloadProgress = {
      sermonId,
      progress: 0,
      totalBytes: 0,
      downloadedBytes: 0,
      status: "error",
      error: error instanceof Error ? error.message : "Download failed",
    };
    emitProgress(errorProgress, onProgress);
    throw error;
  } finally {
    activeDownloads.delete(sermonId);
    activeDownloadPaths.delete(sermonId);
  }
}

/**
 * Cancel an active download
 */
export async function cancelDownload(sermonId: string): Promise<void> {
  const resumable = activeDownloads.get(sermonId);
  if (!resumable) return;

  canceledDownloads.add(sermonId);
  try {
    await resumable.pauseAsync();
  } catch {}

  try {
    const activePath = activeDownloadPaths.get(sermonId);
    const fallbackPath = getSermonFilePath(sermonId);
    await FileSystemLegacy.deleteAsync(activePath || fallbackPath, {
      idempotent: true,
    });
  } catch {}

  const canceledProgress: DownloadProgress = {
    sermonId,
    progress: 0,
    totalBytes: 0,
    downloadedBytes: 0,
    status: "canceled",
  };
  emitProgress(canceledProgress);

  activeDownloads.delete(sermonId);
  activeDownloadPaths.delete(sermonId);
  progressCallbacks.delete(sermonId);
}

/**
 * Check if a sermon is currently downloading
 */
export function isDownloading(sermonId: string): boolean {
  return activeDownloads.has(sermonId);
}

/**
 * Delete a downloaded sermon file
 */
export async function deleteSermonFile(sermonId: string): Promise<void> {
  const { File } = FileSystem as any;

  for (const extension of SUPPORTED_EXTENSIONS) {
    const file = new File(getSermonFilePath(sermonId, `x.${extension}`));
    if (file.exists) {
      file.delete();
    }
  }
}

/**
 * Check if a sermon file exists locally
 */
export async function isSermonDownloaded(sermonId: string): Promise<boolean> {
  const { File } = FileSystem as any;

  for (const extension of SUPPORTED_EXTENSIONS) {
    const file = new File(getSermonFilePath(sermonId, `x.${extension}`));
    if (file.exists) return true;
  }

  return false;
}
