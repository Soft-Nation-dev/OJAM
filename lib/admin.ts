import { invalidatePlaylistsCache } from "@/lib/playlists";
import { invalidateSermonsCache } from "@/lib/sermons";
import { supabase } from "@/lib/supabase";

export type AdminPlaylist = {
  id: string;
  name: string;
  description: string | null;
  image_key: string | null;
  created_at: string;
};

export type AdminPlaylistItem = {
  id: string;
  playlist_id: string;
  sermon_id: string;
  position: number;
  created_at: string;
};

export type AdminSermon = {
  id: string;
  title: string;
  preacher: string | null;
  date: string | null;
  duration: number | null;
  audio_key: string;
  image_key: string | null;
  category: string | null;
  genre: string | null;
  created_at: string;
  [key: string]: unknown;
};

export type PlaylistInput = {
  name: string;
  description?: string | null;
  image_key?: string | null;
};

export type SermonInput = {
  title: string;
  audio_key: string;
  preacher?: string | null;
  date?: string | null;
  duration?: number | null;
  image_key?: string | null;
  category?: string | null;
  genre?: string | null;
};

type SupabaseLikeError = { code?: string; message?: string };

function throwIfError(error: SupabaseLikeError | null) {
  if (error) throw error;
}

export function getAdminErrorMessage(error: unknown) {
  const candidate = error as SupabaseLikeError | undefined;
  if (
    candidate?.code === "42501" ||
    candidate?.message?.toLowerCase().includes("row-level security")
  ) {
    return "You are not allowed to perform this action.";
  }
  return candidate?.message || "The content change could not be completed.";
}

export async function isAdminUser(userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("admin_users")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();
  throwIfError(error);
  return Boolean(data);
}

export async function fetchAdminPlaylists(): Promise<AdminPlaylist[]> {
  const { data, error } = await supabase
    .from("playlists")
    .select("id,name,description,image_key,created_at")
    .order("created_at", { ascending: false });
  throwIfError(error);
  return data ?? [];
}

export async function fetchAdminSermons(): Promise<AdminSermon[]> {
  const { data, error } = await supabase
    .from("sermons")
    .select("*")
    .order("created_at", { ascending: false });
  throwIfError(error);
  return data ?? [];
}

export async function fetchAdminPlaylistItems(
  playlistId: string,
): Promise<AdminPlaylistItem[]> {
  const { data, error } = await supabase
    .from("playlist_items")
    .select("id,playlist_id,sermon_id,position,created_at")
    .eq("playlist_id", playlistId)
    .order("position", { ascending: true });
  throwIfError(error);
  return data ?? [];
}

export async function adminInsertPlaylist(payload: PlaylistInput) {
  const { data, error } = await supabase
    .from("playlists")
    .insert(payload)
    .select("id,name,description,image_key,created_at")
    .single();
  throwIfError(error);
  invalidatePlaylistsCache();
  return data as AdminPlaylist;
}

export async function adminUpdatePlaylist(
  playlistId: string,
  payload: Partial<PlaylistInput>,
) {
  const { data, error } = await supabase
    .from("playlists")
    .update(payload)
    .eq("id", playlistId)
    .select("id,name,description,image_key,created_at")
    .single();
  throwIfError(error);
  invalidatePlaylistsCache();
  return data as AdminPlaylist;
}

export async function adminDeletePlaylist(playlistId: string) {
  const { error } = await supabase
    .from("playlists")
    .delete()
    .eq("id", playlistId);
  throwIfError(error);
  invalidatePlaylistsCache();
}

export async function adminInsertSermon(payload: SermonInput) {
  const { data, error } = await supabase
    .from("sermons")
    .insert(payload)
    .select("*")
    .single();
  throwIfError(error);
  invalidateSermonsCache();
  invalidatePlaylistsCache();
  return data as AdminSermon;
}

export async function adminUpdateSermon(
  sermonId: string,
  payload: Partial<SermonInput>,
) {
  const { data, error } = await supabase
    .from("sermons")
    .update(payload)
    .eq("id", sermonId)
    .select("*")
    .single();
  throwIfError(error);
  invalidateSermonsCache();
  invalidatePlaylistsCache();
  return data as AdminSermon;
}

export async function adminDeleteSermon(sermonId: string) {
  const { error } = await supabase.from("sermons").delete().eq("id", sermonId);
  throwIfError(error);
  invalidateSermonsCache();
  invalidatePlaylistsCache();
}

export async function adminInsertPlaylistItem(
  playlistId: string,
  sermonId: string,
  position?: number,
) {
  let nextPosition = position;
  if (nextPosition === undefined) {
    const items = await fetchAdminPlaylistItems(playlistId);
    nextPosition =
      items.reduce((highest, item) => Math.max(highest, item.position), -1) + 1;
  }

  const { data, error } = await supabase
    .from("playlist_items")
    .insert({
      playlist_id: playlistId,
      sermon_id: sermonId,
      position: nextPosition,
    })
    .select("id,playlist_id,sermon_id,position,created_at")
    .single();
  throwIfError(error);
  invalidatePlaylistsCache();
  return data as AdminPlaylistItem;
}

export async function adminUpdatePlaylistItem(
  itemId: string,
  payload: Partial<Pick<AdminPlaylistItem, "sermon_id" | "position">>,
) {
  const { data, error } = await supabase
    .from("playlist_items")
    .update(payload)
    .eq("id", itemId)
    .select("id,playlist_id,sermon_id,position,created_at")
    .single();
  throwIfError(error);
  invalidatePlaylistsCache();
  return data as AdminPlaylistItem;
}

export async function adminDeletePlaylistItem(itemId: string) {
  const { error } = await supabase
    .from("playlist_items")
    .delete()
    .eq("id", itemId);
  throwIfError(error);
  invalidatePlaylistsCache();
}
