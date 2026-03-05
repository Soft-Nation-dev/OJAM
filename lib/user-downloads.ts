import { Sermon } from "@/types/sermon";
import { supabase } from "./supabase";
import { AudioQuality } from "./user-settings";

export interface UserDownload {
  id: string;
  user_id: string;
  sermon_id: string;
  download_path: string;
  file_size: number;
  audio_quality: AudioQuality;
  downloaded_at: string;
}

export interface DownloadStats {
  total_downloads: number;
  total_bytes: number;
  last_download_at: string | null;
}

/**
 * Check if a sermon is downloaded by the current user
 */
export async function isSermonDownloaded(
  sermonId: string,
  quality?: AudioQuality,
): Promise<boolean> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return false;

  let query = supabase
    .from("user_downloads")
    .select("id")
    .eq("user_id", user.id)
    .eq("sermon_id", sermonId);

  if (quality) {
    query = query.eq("audio_quality", quality);
  }

  const { data, error } = await query.single();

  if (error) return false;
  return data !== null;
}

/**
 * Track a downloaded sermon
 */
export async function trackDownload(
  sermonId: string,
  downloadPath: string,
  fileSize: number,
  quality: AudioQuality = "high",
): Promise<boolean> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return false;

  const { error } = await supabase.from("user_downloads").insert({
    user_id: user.id,
    sermon_id: sermonId,
    download_path: downloadPath,
    file_size: fileSize,
    audio_quality: quality,
  });

  if (error) {
    console.error("Error tracking download:", error);
    return false;
  }

  return true;
}

/**
 * Remove a download record (when user deletes downloaded file)
 */
export async function removeDownload(
  sermonId: string,
  quality?: AudioQuality,
): Promise<boolean> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return false;

  let query = supabase
    .from("user_downloads")
    .delete()
    .eq("user_id", user.id)
    .eq("sermon_id", sermonId);

  if (quality) {
    query = query.eq("audio_quality", quality);
  }

  const { error } = await query;

  if (error) {
    console.error("Error removing download:", error);
    return false;
  }

  return true;
}

/**
 * Fetch all downloaded sermons for the current user
 */
export async function fetchDownloadedSermons(): Promise<Sermon[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  const { data, error } = await supabase
    .from("user_downloads")
    .select(
      `
      downloaded_at,
      sermon_id,
      audio_quality,
      sermons (*)
    `,
    )
    .eq("user_id", user.id)
    .order("downloaded_at", { ascending: false });

  if (error) {
    console.error("Error fetching downloaded sermons:", error);
    return [];
  }

  if (!data) return [];

  return data
    .filter((item: any) => item.sermons)
    .map((item: any) => {
      const sermon = item.sermons;
      return {
        id: sermon.id,
        title: sermon.title || "Untitled Sermon",
        preacher: sermon.preacher || "Unknown",
        date: sermon.date || sermon.created_at,
        duration: sermon.duration || 0,
        audioUrl: sermon.audio_key
          ? `https://sermon-sync.ojam.workers.dev/audio/${encodeURIComponent(sermon.audio_key)}`
          : "",
        imageUrl: sermon.image_key
          ? `https://sermon-sync.ojam.workers.dev/images/${encodeURIComponent(sermon.image_key)}`
          : undefined,
        description: sermon.description || "",
        category: sermon.category || "sunday",
        genre: sermon.genre || "General Teaching",
        plays: sermon.plays || 0,
        favorites: sermon.favorites || 0,
        likes: sermon.likes || 0,
      } as Sermon;
    });
}

/**
 * Get download statistics for the current user
 */
export async function getDownloadStats(): Promise<DownloadStats | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data, error } = await supabase
    .from("user_download_stats")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    console.error("Error fetching download stats:", error);
    return null;
  }

  // If no downloads yet, return default stats
  if (!data) {
    return {
      total_downloads: 0,
      total_bytes: 0,
      last_download_at: null,
    };
  }

  return data;
}

/**
 * Get all sermon IDs that are downloaded by the current user
 * Useful for checking download status in bulk
 */
export async function getDownloadedSermonIds(): Promise<Set<string>> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return new Set();

  const { data, error } = await supabase
    .from("user_downloads")
    .select("sermon_id")
    .eq("user_id", user.id);

  if (error) {
    console.error("Error fetching downloaded sermon IDs:", error);
    return new Set();
  }

  return new Set(data?.map((item) => item.sermon_id) || []);
}

/**
 * Update download path (if file is moved)
 */
export async function updateDownloadPath(
  sermonId: string,
  newPath: string,
  quality?: AudioQuality,
): Promise<boolean> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return false;

  let query = supabase
    .from("user_downloads")
    .update({ download_path: newPath })
    .eq("user_id", user.id)
    .eq("sermon_id", sermonId);

  if (quality) {
    query = query.eq("audio_quality", quality);
  }

  const { error } = await query;

  if (error) {
    console.error("Error updating download path:", error);
    return false;
  }

  return true;
}
