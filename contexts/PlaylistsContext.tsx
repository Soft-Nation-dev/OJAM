import { Playlist } from "@/types/sermon";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { InteractionManager } from "react-native";
import { useSermons } from "./SermonsContext";

const PLAYLISTS_KEY = "user.playlists";

type StoredUserPlaylist = {
  id: string;
  name: string;
  description?: string;
  imageUrl?: string;
  sermonIds: string[];
};

interface PlaylistsContextType {
  playlists: Playlist[];
  addPlaylist: (playlist: Playlist) => void;
  updatePlaylist: (playlist: Playlist) => void;
  removePlaylist: (id: string) => void;
  setPlaylists: (playlists: Playlist[]) => void;
  userPlaylists: Playlist[];
  remotePlaylists: Playlist[];
}

const PlaylistsContext = createContext<PlaylistsContextType | undefined>(
  undefined,
);

export const PlaylistsProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { sermons } = useSermons();
  const [userPlaylistsState, setUserPlaylistsState] = useState<
    StoredUserPlaylist[]
  >([]);
  const [remotePlaylists, setRemotePlaylists] = useState<Playlist[]>([]);

  const toStoredUserPlaylist = useCallback(
    (playlist: Playlist): StoredUserPlaylist => {
      const seen = new Set<string>();
      const sermonIds: string[] = [];

      for (const sermon of playlist.sermons ?? []) {
        if (!sermon?.id || seen.has(sermon.id)) continue;
        seen.add(sermon.id);
        sermonIds.push(sermon.id);
      }

      return {
        id: playlist.id,
        name: playlist.name,
        description: playlist.description,
        imageUrl: playlist.imageUrl,
        sermonIds,
      };
    },
    [],
  );

  const normalizeStoredUserPlaylists = useCallback(
    (value: unknown): StoredUserPlaylist[] => {
      if (!Array.isArray(value)) return [];

      return value
        .filter((item) => item && typeof item === "object")
        .map((item: any) => {
          const sermonIds = Array.isArray(item.sermonIds)
            ? item.sermonIds.filter((id: unknown) => typeof id === "string")
            : Array.isArray(item.sermons)
              ? item.sermons
                  .map((sermon: any) => sermon?.id)
                  .filter((id: unknown) => typeof id === "string")
              : [];

          return {
            id: String(item.id),
            name: String(item.name || "Untitled Playlist"),
            description:
              typeof item.description === "string" ? item.description : "",
            imageUrl:
              typeof item.imageUrl === "string" ? item.imageUrl : undefined,
            sermonIds,
          };
        })
        .filter((playlist) => playlist.id);
    },
    [],
  );

  useEffect(() => {
    AsyncStorage.getItem(PLAYLISTS_KEY).then((stored) => {
      if (!stored) return;

      try {
        const parsed = JSON.parse(stored);
        setUserPlaylistsState(normalizeStoredUserPlaylists(parsed));
      } catch {
        setUserPlaylistsState([]);
      }
    });

    const task = InteractionManager.runAfterInteractions(() => {
      import("@/lib/playlists").then(({ fetchPlaylists }) => {
        fetchPlaylists({ includeSermons: false }).then((data) =>
          setRemotePlaylists(data),
        );
      });
    });

    return () => {
      task.cancel();
    };
  }, [normalizeStoredUserPlaylists]);

  useEffect(() => {
    AsyncStorage.setItem(PLAYLISTS_KEY, JSON.stringify(userPlaylistsState));
  }, [userPlaylistsState]);

  const sermonsById = useMemo(
    () => new Map(sermons.map((sermon) => [sermon.id, sermon])),
    [sermons],
  );

  const userPlaylists = useMemo<Playlist[]>(() => {
    return userPlaylistsState.map((playlist) => ({
      id: playlist.id,
      name: playlist.name,
      description: playlist.description,
      imageUrl: playlist.imageUrl,
      sermons: playlist.sermonIds
        .map(
          (sermonId) =>
            sermonsById.get(sermonId) ?? {
              id: sermonId,
              title: "",
              preacher: "",
              date: "",
              duration: 0,
              audioUrl: "",
            },
        )
        .filter(Boolean),
    }));
  }, [sermonsById, userPlaylistsState]);

  const addPlaylist = (playlist: Playlist) => {
    setUserPlaylistsState((prev) => [toStoredUserPlaylist(playlist), ...prev]);
  };

  const updatePlaylist = (playlist: Playlist) => {
    const stored = toStoredUserPlaylist(playlist);
    setUserPlaylistsState((prev) =>
      prev.map((p) => (p.id === stored.id ? stored : p)),
    );
  };

  const removePlaylist = (id: string) => {
    setUserPlaylistsState((prev) => prev.filter((p) => p.id !== id));
  };

  const setPlaylists = useCallback(
    (playlists: Playlist[]) => {
      setUserPlaylistsState(playlists.map(toStoredUserPlaylist));
    },
    [toStoredUserPlaylist],
  );

  const playlists = useMemo(() => {
    const userIds = new Set(userPlaylists.map((p) => p.id));
    return [
      ...userPlaylists,
      ...remotePlaylists.filter((p) => !userIds.has(p.id)),
    ];
  }, [userPlaylists, remotePlaylists]);

  return (
    <PlaylistsContext.Provider
      value={{
        playlists,
        addPlaylist,
        updatePlaylist,
        removePlaylist,
        setPlaylists,
        userPlaylists,
        remotePlaylists,
      }}
    >
      {children}
    </PlaylistsContext.Provider>
  );
};

export const usePlaylists = () => {
  const ctx = useContext(PlaylistsContext);
  if (!ctx) {
    throw new Error("usePlaylists must be used within PlaylistsProvider");
  }
  return ctx;
};
