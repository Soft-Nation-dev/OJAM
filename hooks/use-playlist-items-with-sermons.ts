import {
  fetchPlaylistItemsWithSermons,
  PlaylistItemWithSermon,
} from "@/lib/playlists";
import { useCallback, useEffect, useState } from "react";

export function usePlaylistItemsWithSermons(
  playlistId: string | null | undefined,
) {
  const [items, setItems] = useState<PlaylistItemWithSermon[]>([]);
  const [loading, setLoading] = useState(Boolean(playlistId));
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    if (!playlistId) {
      setItems([]);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      setItems(await fetchPlaylistItemsWithSermons(playlistId));
    } catch (caught) {
      setItems([]);
      setError(
        caught instanceof Error
          ? caught
          : new Error("Unable to load playlist messages."),
      );
    } finally {
      setLoading(false);
    }
  }, [playlistId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { items, loading, error, refresh };
}
