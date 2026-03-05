import { Sermon } from "@/types/sermon";
import { supabase } from "./supabase";

export interface UserFavorite {
  id: string;
  user_id: string;
  sermon_id: string;
  created_at: string;
}

/**
 * Check if a sermon is favorited by the current user
 */
export async function isSermonFavorited(sermonId: string): Promise<boolean> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return false;

  const { data, error } = await supabase
    .from("user_favorites")
    .select("id")
    .eq("user_id", user.id)
    .eq("sermon_id", sermonId)
    .single();

  if (error) return false;
  return data !== null;
}

/**
 * Add a sermon to user's favorites
 */
export async function addFavorite(sermonId: string): Promise<boolean> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return false;

  // Check if already favorited to avoid duplicate key error
  const { data: existing, error: selectError } = await supabase
    .from("user_favorites")
    .select("id")
    .eq("user_id", user.id)
    .eq("sermon_id", sermonId)
    .maybeSingle();

  if (existing) {
    // Already favorited, treat as success
    return true;
  }

  const { error } = await supabase
    .from("user_favorites")
    .insert({ user_id: user.id, sermon_id: sermonId });

  if (error) {
    // If duplicate key error, treat as success (idempotent)
    if (
      error.code === "23505" ||
      (error.message && error.message.includes("duplicate key"))
    ) {
      return true;
    }
    console.error("Error adding favorite:", error);
    return false;
  }

  return true;
}

/**
 * Remove a sermon from user's favorites
 */
export async function removeFavorite(sermonId: string): Promise<boolean> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return false;

  const { error } = await supabase
    .from("user_favorites")
    .delete()
    .eq("user_id", user.id)
    .eq("sermon_id", sermonId);

  if (error) {
    console.error("Error removing favorite:", error);
    return false;
  }

  return true;
}

/**
 * Toggle favorite status for a sermon
 */
export async function toggleFavorite(sermonId: string): Promise<boolean> {
  const isFavorited = await isSermonFavorited(sermonId);

  if (isFavorited) {
    return await removeFavorite(sermonId);
  } else {
    return await addFavorite(sermonId);
  }
}

/**
 * Fetch all favorited sermons for the current user
 * Returns sermons with full details
 */
export async function fetchFavoriteSermons(): Promise<Sermon[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  const { data, error } = await supabase
    .from("user_favorites")
    .select(
      `
      created_at,
      sermon_id,
      sermons (*)
    `,
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching favorite sermons:", error);
    return [];
  }

  if (!data) return [];

  // Transform the data to match Sermon type
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
 * Get all sermon IDs that are favorited by the current user
 * Useful for checking favorite status in bulk
 */
export async function getFavoritedSermonIds(): Promise<Set<string>> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return new Set();

  const { data, error } = await supabase
    .from("user_favorites")
    .select("sermon_id")
    .eq("user_id", user.id);

  if (error) {
    console.error("Error fetching favorited sermon IDs:", error);
    return new Set();
  }

  return new Set(data?.map((item) => item.sermon_id) || []);
}
