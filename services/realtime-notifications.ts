import AsyncStorage from "@react-native-async-storage/async-storage";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { Platform } from "react-native";

export type RealtimeAppNotification = {
  title: string;
  message: string;
  type: "new_sermon" | "update";
  eventKey: string;
};

type Cursors = {
  sermons: string;
  updates: string;
};

type SermonRow = {
  id: string;
  title?: string | null;
  preacher?: string | null;
  created_at?: string | null;
};

type UpdateRow = {
  id: string;
  title?: string | null;
  message?: string | null;
  version?: string | null;
  platform?: string | null;
  published_at?: string | null;
  active?: boolean | null;
};

const CURSORS_KEY = "@realtime_notification_cursors_v1";
const CATCH_UP_LIMIT = 50;

const isRelevantPlatform = (platform?: string | null) =>
  !platform || platform === "all" || platform === Platform.OS;

const sermonNotification = (row: SermonRow): RealtimeAppNotification | null => {
  if (!row?.id) return null;
  const title = row.title?.trim() || "New message";
  const preacher = row.preacher?.trim();

  return {
    title: "New message available",
    message: preacher ? `${title} — ${preacher}` : title,
    type: "new_sermon",
    eventKey: `sermon:${row.id}`,
  };
};

const updateNotification = (row: UpdateRow): RealtimeAppNotification | null => {
  if (!row?.id || row.active === false || !isRelevantPlatform(row.platform)) {
    return null;
  }

  const versionSuffix = row.version?.trim() ? ` (${row.version.trim()})` : "";
  return {
    title: row.title?.trim() || `Ojam update available${versionSuffix}`,
    message:
      row.message?.trim() || "A new version of Ojam is ready to install.",
    type: "update",
    eventKey: `update:${row.id}`,
  };
};

const loadCursors = async (): Promise<Cursors | null> => {
  try {
    const stored = await AsyncStorage.getItem(CURSORS_KEY);
    if (!stored) return null;
    const parsed = JSON.parse(stored) as Partial<Cursors>;
    if (!parsed.sermons || !parsed.updates) return null;
    return { sermons: parsed.sermons, updates: parsed.updates };
  } catch {
    return null;
  }
};

const saveCursors = async (cursors: Cursors) => {
  try {
    await AsyncStorage.setItem(CURSORS_KEY, JSON.stringify(cursors));
  } catch {
    // Realtime still works if cursor persistence is unavailable.
  }
};

export const subscribeToRealtimeNotifications = async (
  onNotification: (notification: RealtimeAppNotification) => void,
) => {
  if (!isSupabaseConfigured) return () => {};

  let stopped = false;
  let cursors = await loadCursors();

  // A new installation starts from now so it is not flooded with old content.
  if (!cursors) {
    const now = new Date().toISOString();
    cursors = { sermons: now, updates: now };
    await saveCursors(cursors);
  }

  const advanceCursor = (kind: keyof Cursors, value?: string | null) => {
    if (!value || value <= cursors![kind]) return;
    cursors = { ...cursors!, [kind]: value };
    void saveCursors(cursors);
  };

  const deliverSermon = (row: SermonRow) => {
    advanceCursor("sermons", row.created_at);
    const notification = sermonNotification(row);
    if (!stopped && notification) onNotification(notification);
  };

  const deliverUpdate = (row: UpdateRow) => {
    advanceCursor("updates", row.published_at);
    const notification = updateNotification(row);
    if (!stopped && notification) onNotification(notification);
  };

  const catchUp = async () => {
    const snapshot = cursors!;
    const [sermonsResult, updatesResult] = await Promise.all([
      supabase
        .from("sermons")
        .select("id,title,preacher,created_at")
        .gt("created_at", snapshot.sermons)
        .order("created_at", { ascending: true })
        .limit(CATCH_UP_LIMIT),
      supabase
        .from("app_update_announcements")
        .select("id,title,message,version,platform,published_at,active")
        .gt("published_at", snapshot.updates)
        .order("published_at", { ascending: true })
        .limit(CATCH_UP_LIMIT),
    ]);

    if (!stopped && !sermonsResult.error) {
      (sermonsResult.data ?? []).forEach(deliverSermon);
    }
    if (!stopped && !updatesResult.error) {
      (updatesResult.data ?? []).forEach(deliverUpdate);
    }
  };

  const channel = supabase
    .channel("ojam-live-notifications")
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "sermons" },
      (payload: { new: SermonRow }) => deliverSermon(payload.new),
    )
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "app_update_announcements",
      },
      (payload: { new: UpdateRow }) => deliverUpdate(payload.new),
    )
    .subscribe((status: string) => {
      if (status === "SUBSCRIBED") void catchUp();
    });

  return () => {
    stopped = true;
    void supabase.removeChannel(channel);
  };
};
