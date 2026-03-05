import * as FileSystem from "expo-file-system";

// This script deletes all files in the sermons directory (use with caution!)
export async function clearAllDownloadedSermons() {
  try {
    const { Directory, Paths } = FileSystem as any;
    const sermonsDir = new Directory(Paths.document, "sermons");
    if (sermonsDir.exists) {
      const files = sermonsDir.list();
      for (const file of files) {
        try {
          file.delete();
        } catch (err) {
          console.warn("Failed to delete", file.uri, err);
        }
      }
      console.log("All sermon files deleted.");
    } else {
      console.log("Sermons directory does not exist.");
    }
  } catch (error) {
    console.error("Error clearing downloaded sermons:", error);
  }
}

// To use: import and call clearAllDownloadedSermons() from a dev/test screen or useEffect.
