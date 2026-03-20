import * as FileSystem from "expo-file-system/legacy";

/* ---------------- CONFIG ---------------- */

const MAX_CACHE_MB = 50;
const MAX_FILE_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours

// Only delete these types (SAFE LIST)
const CACHE_FILE_PATTERN = /\.(mp3|m4a|aac|wav|ogg|tmp|cache)$/i;

// Skip system / expo internal files
const PROTECTED_PATTERNS = [
  "ExponentAsset",
  ".ttf",
  ".otf",
];

/* ---------------- HELPERS ---------------- */

// Recursively get ALL files
async function getAllFiles(dir: string): Promise<string[]> {
  let results: string[] = [];

  try {
    const items = await FileSystem.readDirectoryAsync(dir);

    for (const item of items) {
      const path = dir + item;
      const info = await FileSystem.getInfoAsync(path);

      if (!info.exists) continue;

      if (info.isDirectory) {
        results = results.concat(await getAllFiles(path + "/"));
      } else {
        results.push(path);
      }
    }
  } catch {
    // silently ignore permission issues
  }

  return results;
}

// Check if file is safe to delete
function isSafeToDelete(path: string) {
  if (!CACHE_FILE_PATTERN.test(path)) return false;

  for (const pattern of PROTECTED_PATTERNS) {
    if (path.includes(pattern)) return false;
  }

  return true;
}

/* ---------------- CORE: GET CACHE SIZE ---------------- */

export async function getCacheSizeMB(): Promise<number> {
  try {
    const dir = FileSystem.cacheDirectory!;
    const files = await getAllFiles(dir);

    let total = 0;

    for (const path of files) {
      const info = await FileSystem.getInfoAsync(path);
      if (info.exists && info.size) {
        total += info.size;
      }
    }

    return total / (1024 * 1024);
  } catch {
    return 0;
  }
}

/* ---------------- CORE: CLEAR OLD CACHE ---------------- */

export async function clearOldCache(currentPlayingUri?: string) {
  try {
    const dir = FileSystem.cacheDirectory!;
    const files = await getAllFiles(dir);

    for (const path of files) {
      if (currentPlayingUri && path === currentPlayingUri) continue;

      if (!isSafeToDelete(path)) continue;

      const info = await FileSystem.getInfoAsync(path);
      if (!info.exists) continue;

      const age = Date.now() - (info.modificationTime || 0) * 1000;

      if (age > MAX_FILE_AGE_MS) {
        try {
          await FileSystem.deleteAsync(path, { idempotent: true });
        } catch {
          // ignore delete errors (android quirks)
        }
      }
    }
  } catch (e) {
    console.log("clearOldCache failed:", e);
  }
}

/* ---------------- CORE: ENFORCE SIZE LIMIT ---------------- */

export async function enforceCacheLimit(
  maxSizeMB = MAX_CACHE_MB,
  currentPlayingUri?: string,
) {
  try {
    const dir = FileSystem.cacheDirectory!;
    const files = await getAllFiles(dir);

    let fileInfos: {
      path: string;
      size: number;
      time: number;
    }[] = [];

    for (const path of files) {
      if (!isSafeToDelete(path)) continue;

      const info = await FileSystem.getInfoAsync(path);

      if (info.exists && info.size) {
        fileInfos.push({
          path,
          size: info.size,
          time: info.modificationTime || 0,
        });
      }
    }

    // oldest first
    fileInfos.sort((a, b) => a.time - b.time);

    let totalSizeMB =
      fileInfos.reduce((sum, f) => sum + f.size, 0) / (1024 * 1024);

    for (const file of fileInfos) {
      if (totalSizeMB <= maxSizeMB) break;

      if (currentPlayingUri && file.path === currentPlayingUri) continue;

      try {
        await FileSystem.deleteAsync(file.path, { idempotent: true });

        totalSizeMB -= file.size / (1024 * 1024);
      } catch {
        // ignore delete failure
      }
    }
  } catch (e) {
    console.log("enforceCacheLimit failed:", e);
  }
}

/* ---------------- MASTER CLEANER ---------------- */

export async function runCacheMaintenance(
  currentPlayingUri?: string,
) {
  try {
    await clearOldCache(currentPlayingUri);
    await enforceCacheLimit(MAX_CACHE_MB, currentPlayingUri);
  } catch (e) {
    console.log("Cache maintenance failed:", e);
  }
}