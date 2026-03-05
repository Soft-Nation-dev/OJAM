import { Playlist, Sermon } from "@/types/sermon";
import { fetchSermons } from "./sermons";
import { supabase, WORKER_URL } from "./supabase";

type FetchPlaylistsOptions = {
  forceRefresh?: boolean;
  includeSermons?: boolean;
};

const PLAYLISTS_CACHE_TTL_MS = 5 * 60 * 1000;
type PlaylistCacheEntry = { data: Playlist[]; timestamp: number };
let playlistsCacheCompact: PlaylistCacheEntry | null = null;
let playlistsCacheFull: PlaylistCacheEntry | null = null;
let inFlightPlaylistsRequestCompact: Promise<Playlist[]> | null = null;
let inFlightPlaylistsRequestFull: Promise<Playlist[]> | null = null;

export function invalidatePlaylistsCache() {
  playlistsCacheCompact = null;
  playlistsCacheFull = null;
}

const mapPlaylistSermonRow = (item: any): Sermon => ({
  id: item.id,
  title: item.title || "Untitled Sermon",
  preacher: item.preacher || "Unknown",
  date: item.date || item.created_at || "",
  duration: item.duration || 0,
  audioUrl: item.audio_key
    ? `${WORKER_URL}/audio/${encodeURIComponent(item.audio_key)}`
    : "",
  imageUrl: item.image_key
    ? `${WORKER_URL}/images/${encodeURIComponent(item.image_key)}`
    : undefined,
  category: ["sunday", "tuesday", "friday"].includes(
    String(item.category || "").toLowerCase(),
  )
    ? (String(item.category).toLowerCase() as "sunday" | "tuesday" | "friday")
    : "sunday",
  genre: item.genre || "General Teaching",
  plays: item.plays ?? item.play_count ?? 0,
  favorites: item.favorites ?? item.favorite_count ?? 0,
  likes: item.likes ?? item.like_count ?? 0,
});

export async function fetchPlaylists(
  options?: FetchPlaylistsOptions,
): Promise<Playlist[]> {
  const forceRefresh = options?.forceRefresh === true;
  const includeSermons = options?.includeSermons !== false;
  const now = Date.now();
  const targetCache = includeSermons
    ? playlistsCacheFull
    : playlistsCacheCompact;
  const inFlightPlaylistsRequest = includeSermons
    ? inFlightPlaylistsRequestFull
    : inFlightPlaylistsRequestCompact;

  if (
    !forceRefresh &&
    targetCache &&
    now - targetCache.timestamp < PLAYLISTS_CACHE_TTL_MS
  ) {
    return targetCache.data;
  }

  if (!forceRefresh && inFlightPlaylistsRequest) {
    return inFlightPlaylistsRequest;
  }

  const request = (async () => {
    try {
      const { data: playlistsData, error: playlistsError } = await supabase
        .from("playlists")
        .select("*")
        .order("created_at", { ascending: false });

      if (playlistsError) {
        console.warn(
          "Playlists table not found, returning no playlists:",
          playlistsError.message,
        );
        return [];
      }

      const encodeR2Key = (key: string) =>
        key
          .split("/")
          .map((segment) => encodeURIComponent(segment))
          .join("/");

      const playlists: Playlist[] = (playlistsData || []).map((item: any) => ({
        id: item.id,
        name: item.name || "Untitled Playlist",
        description: item.description || "",
        sermons: [], // Will populate below
        imageUrl: item.image_key
          ? `${WORKER_URL}/images/${encodeR2Key(item.image_key)}`
          : undefined,
      }));

      const { data: itemsData, error: itemsError } = await supabase
        .from("playlist_items")
        .select("playlist_id, sermon_id, position");

      if (itemsError) {
        console.warn(
          "Playlist items table not found, returning no playlists:",
          itemsError.message,
        );
        return [];
      }

      let sermonsById: Map<string, Sermon> | null = null;
      if (includeSermons) {
        const allSermons = await fetchSermons();
        sermonsById = new Map<string, Sermon>(
          allSermons.map((sermon) => [sermon.id, sermon]),
        );
      }

      const itemsByPlaylist = new Map<
        string,
        { sermonId: string; position: number }[]
      >();
      (itemsData || []).forEach((item: any) => {
        const list = itemsByPlaylist.get(item.playlist_id) || [];
        list.push({ sermonId: item.sermon_id, position: item.position ?? 0 });
        itemsByPlaylist.set(item.playlist_id, list);
      });

      playlists.forEach((playlist) => {
        const items = itemsByPlaylist.get(playlist.id) || [];
        const ordered = items.sort((a, b) => a.position - b.position);

        if (includeSermons && sermonsById) {
          playlist.sermons = ordered
            .map((item) => sermonsById?.get(item.sermonId))
            .filter(Boolean) as Sermon[];
          return;
        }

        playlist.sermons = ordered.map((item) => ({
          id: item.sermonId,
          title: "",
          preacher: "",
          date: "",
          duration: 0,
          audioUrl: "",
        }));
      });

      const nextCache = {
        data: playlists,
        timestamp: Date.now(),
      };

      if (includeSermons) {
        playlistsCacheFull = nextCache;
      } else {
        playlistsCacheCompact = nextCache;
      }

      return playlists;
    } catch (err) {
      console.warn("Error fetching playlists, returning no playlists:", err);
      if (targetCache) {
        return targetCache.data;
      }
      return [];
    }
  })();

  if (includeSermons) {
    inFlightPlaylistsRequestFull = request;
  } else {
    inFlightPlaylistsRequestCompact = request;
  }

  try {
    return await request;
  } finally {
    if (includeSermons) {
      inFlightPlaylistsRequestFull = null;
    } else {
      inFlightPlaylistsRequestCompact = null;
    }
  }
}

export async function fetchPlaylistById(
  id: string,
  options?: FetchPlaylistsOptions,
): Promise<Playlist | null> {
  if (!id) return null;

  const includeSermons = options?.includeSermons !== false;

  const cached = includeSermons ? playlistsCacheFull : playlistsCacheCompact;
  const cachedPlaylist = cached?.data.find((playlist) => playlist.id === id);
  if (cachedPlaylist) {
    return cachedPlaylist;
  }

  const { data: playlistData, error: playlistError } = await supabase
    .from("playlists")
    .select("id,name,description,image_key")
    .eq("id", id)
    .maybeSingle();

  if (playlistError || !playlistData) {
    if (playlistError) {
      console.warn("Error fetching playlist by id:", playlistError.message);
    }
    return null;
  }

  const encodeR2Key = (key: string) =>
    key
      .split("/")
      .map((segment) => encodeURIComponent(segment))
      .join("/");

  const playlist: Playlist = {
    id: playlistData.id,
    name: playlistData.name || "Untitled Playlist",
    description: playlistData.description || "",
    sermons: [],
    imageUrl: playlistData.image_key
      ? `${WORKER_URL}/images/${encodeR2Key(playlistData.image_key)}`
      : undefined,
  };

  const { data: itemsData, error: itemsError } = await supabase
    .from("playlist_items")
    .select("sermon_id, position")
    .eq("playlist_id", id);

  if (itemsError) {
    console.warn(
      "Error fetching playlist items by playlist id:",
      itemsError.message,
    );
    return playlist;
  }

  const orderedItems = [...(itemsData || [])].sort(
    (a: any, b: any) => (a.position ?? 0) - (b.position ?? 0),
  );

  if (!orderedItems.length) {
    return playlist;
  }

  if (!includeSermons) {
    playlist.sermons = orderedItems.map((item: any) => ({
      id: item.sermon_id,
      title: "",
      preacher: "",
      date: "",
      duration: 0,
      audioUrl: "",
    }));
    return playlist;
  }

  const sermonIds = orderedItems
    .map((item: any) => item.sermon_id)
    .filter((sermonId: any) => typeof sermonId === "string");

  if (!sermonIds.length) {
    return playlist;
  }

  const { data: sermonsData, error: sermonsError } = await supabase
    .from("sermons")
    .select(
      "id,title,preacher,date,duration,audio_key,image_key,category,genre,created_at",
    )
    .in("id", sermonIds);

  if (sermonsError) {
    console.warn(
      "Error fetching playlist sermons by ids:",
      sermonsError.message,
    );
    return playlist;
  }

  const sermonsById = new Map<string, Sermon>(
    (sermonsData || []).map((row: any) => [row.id, mapPlaylistSermonRow(row)]),
  );

  playlist.sermons = sermonIds
    .map((sermonId) => sermonsById.get(sermonId))
    .filter(Boolean) as Sermon[];

  return playlist;
}
