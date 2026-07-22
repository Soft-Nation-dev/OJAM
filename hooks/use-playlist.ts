import { fetchPlaylistMetadataById } from "@/lib/playlists";
import { Playlist } from "@/types/sermon";
import { useCallback, useEffect, useState } from "react";

export function usePlaylist(playlistId: string | null | undefined) {
  const [playlist, setPlaylist] = useState<Playlist | null>(null);
  const [loading, setLoading] = useState(Boolean(playlistId));
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    if (!playlistId) {
      setPlaylist(null);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      setPlaylist(await fetchPlaylistMetadataById(playlistId));
    } catch (caught) {
      setPlaylist(null);
      setError(
        caught instanceof Error ? caught : new Error("Unable to load playlist."),
      );
    } finally {
      setLoading(false);
    }
  }, [playlistId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { playlist, loading, error, refresh };
}
