import { Sermon } from "@/types/sermon";
import { supabase, WORKER_URL } from "./supabase";

type FetchSermonsOptions = {
  forceRefresh?: boolean;
};

const SERMONS_CACHE_TTL_MS = 5 * 60 * 1000;
type SermonsCacheEntry = { data: Sermon[]; timestamp: number };
let sermonsCacheLight: SermonsCacheEntry | null = null;
let inFlightRequestLight: Promise<Sermon[]> | null = null;
const SERMON_DETAIL_CACHE_TTL_MS = 10 * 60 * 1000;
const sermonDetailCache = new Map<
  string,
  { data: Sermon; timestamp: number }
>();

const SERMON_SELECT_LIGHT =
  "id,title,preacher,date,duration,audio_key,image_key,category,genre,created_at";
const SERMON_SELECT_WITH_DESCRIPTION =
  "id,title,preacher,date,duration,audio_key,image_key,description,category,genre,created_at";

export function invalidateSermonsCache() {
  sermonsCacheLight = null;
  sermonDetailCache.clear();
}

export async function fetchSermons(
  options?: FetchSermonsOptions,
): Promise<Sermon[]> {
  const forceRefresh = options?.forceRefresh === true;
  const now = Date.now();
  const targetCache = sermonsCacheLight;
  const inFlightRequest = inFlightRequestLight;

  if (
    !forceRefresh &&
    targetCache &&
    now - targetCache.timestamp < SERMONS_CACHE_TTL_MS
  ) {
    return targetCache.data;
  }

  if (!forceRefresh && inFlightRequest) {
    return inFlightRequest;
  }

  const request = (async () => {
    const { data, error } = await supabase
      .from("sermons")
      .select(SERMON_SELECT_LIGHT)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching sermons:", error);
      if (targetCache) {
        return targetCache.data;
      }
      return [];
    }

    const encodeR2Key = (key: string) =>
      key
        .split("/")
        .map((segment) => encodeURIComponent(segment))
        .join("/");

    const normalizeCategory = (value?: string) => {
      if (!value) return undefined;
      const lowered = value.toLowerCase();
      if (
        lowered === "sunday" ||
        lowered === "tuesday" ||
        lowered === "friday"
      ) {
        return lowered;
      }
      return undefined;
    };

    const mapped = (data || []).map((item: any) => ({
      id: item.id,
      title: item.title || "Untitled Sermon",
      preacher: item.preacher || "Unknown",
      date: item.date || item.created_at,
      duration: item.duration || 0,
      audioUrl: item.audio_key
        ? `${WORKER_URL}/audio/${encodeR2Key(item.audio_key)}`
        : "",
      imageUrl: item.image_key
        ? `${WORKER_URL}/images/${encodeR2Key(item.image_key)}`
        : undefined,
      description: undefined,
      category: normalizeCategory(item.category) || "sunday",
      genre: item.genre || "General Teaching",
      plays: item.plays ?? item.play_count ?? 0,
      favorites: item.favorites ?? item.favorite_count ?? 0,
      likes: item.likes ?? item.like_count ?? 0,
    }));

    const nextCache = {
      data: mapped,
      timestamp: Date.now(),
    };

    sermonsCacheLight = nextCache;

    return mapped;
  })();

  inFlightRequestLight = request;

  try {
    return await request;
  } finally {
    inFlightRequestLight = null;
  }
}

export async function fetchSermonById(id: string): Promise<Sermon | null> {
  if (!id) return null;

  const now = Date.now();
  const cachedDetail = sermonDetailCache.get(id);
  if (
    cachedDetail &&
    now - cachedDetail.timestamp < SERMON_DETAIL_CACHE_TTL_MS
  ) {
    return cachedDetail.data;
  }

  if (sermonsCacheLight) {
    const lightCached = sermonsCacheLight.data.find((item) => item.id === id);
    if (lightCached?.description) {
      sermonDetailCache.set(id, { data: lightCached, timestamp: now });
      return lightCached;
    }
  }

  const { data, error } = await supabase
    .from("sermons")
    .select(SERMON_SELECT_WITH_DESCRIPTION)
    .eq("id", id)
    .maybeSingle();

  if (error || !data) {
    if (error) console.error("Error fetching sermon by id:", error);
    return null;
  }

  const encodeR2Key = (key: string) =>
    key
      .split("/")
      .map((segment) => encodeURIComponent(segment))
      .join("/");

  const normalizeCategory = (value?: string) => {
    if (!value) return undefined;
    const lowered = value.toLowerCase();
    if (lowered === "sunday" || lowered === "tuesday" || lowered === "friday") {
      return lowered;
    }
    return undefined;
  };

  const sermon = {
    id: data.id,
    title: data.title || "Untitled Sermon",
    preacher: data.preacher || "Unknown",
    date: data.date || data.created_at,
    duration: data.duration || 0,
    audioUrl: data.audio_key
      ? `${WORKER_URL}/audio/${encodeR2Key(data.audio_key)}`
      : "",
    imageUrl: data.image_key
      ? `${WORKER_URL}/images/${encodeR2Key(data.image_key)}`
      : undefined,
    description: data.description || "",
    category: normalizeCategory(data.category) || "sunday",
    genre: data.genre || "General Teaching",
    plays: data.plays ?? data.play_count ?? 0,
    favorites: data.favorites ?? data.favorite_count ?? 0,
    likes: data.likes ?? data.like_count ?? 0,
  };

  sermonDetailCache.set(id, { data: sermon, timestamp: now });
  return sermon;
}
