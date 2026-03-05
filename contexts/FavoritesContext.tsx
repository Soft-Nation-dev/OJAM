import { useNotifications } from "@/hooks/use-notifications";
import { addFavorite, removeFavorite } from "@/lib/user-favorites";
import { Sermon } from "@/types/sermon";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useSermons } from "./SermonsContext";

interface FavoritesContextProps {
  favoriteSermons: Sermon[];
  favoritedIds: Set<string>;
  loading: boolean;
  isFavorited: (sermonId: string) => boolean;
  toggleFavorite: (sermon: Sermon) => Promise<boolean>;
  count: number;
}

const FavoritesContext = createContext<FavoritesContextProps | undefined>(
  undefined,
);

export const FavoritesProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const FAVORITES_KEY = "@favorite_ids_v1";
  const { sermons } = useSermons();
  const [favoritedIds, setFavoritedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const { addNotification } = useNotifications();

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const stored = await AsyncStorage.getItem(FAVORITES_KEY);
        if (stored) {
          const parsed = JSON.parse(stored) as string[];
          const ids = Array.isArray(parsed) ? parsed : [];
          setFavoritedIds(new Set(ids));
        }
      } catch {}
      setLoading(false);
    })();
  }, []);

  const favoriteSermons = useMemo(() => {
    if (!favoritedIds.size || !sermons.length) return [];

    const sermonsById = new Map(sermons.map((sermon) => [sermon.id, sermon]));
    const ordered: Sermon[] = [];

    favoritedIds.forEach((id) => {
      const sermon = sermonsById.get(id);
      if (sermon) {
        ordered.push(sermon);
      }
    });

    return ordered;
  }, [favoritedIds, sermons]);

  const saveFavoriteIds = async (ids: string[]) => {
    setFavoritedIds(new Set(ids));
    await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(ids));
  };

  const toggleFavorite = useCallback(
    async (sermon: Sermon) => {
      if (!sermon || !sermon.id) {
        console.warn("toggleFavorite called with invalid sermon", sermon);
        return false;
      }
      const sermonId = sermon.id;
      const isAlreadyFavorited = favoritedIds.has(sermonId);
      const currentIds = Array.from(favoritedIds);
      let updatedIds: string[];
      if (isAlreadyFavorited) {
        updatedIds = currentIds.filter((id) => id !== sermonId);
        addNotification({
          title: "Removed from Favorites",
          message: `Removed '${sermon.title}' from favorites`,
          type: "reminder",
        });
      } else {
        updatedIds = [sermonId, ...currentIds.filter((id) => id !== sermonId)];
        addNotification({
          title: "Added to Favorites",
          message: `Added '${sermon.title}' to favorites`,
          type: "reminder",
        });
      }
      await saveFavoriteIds(updatedIds);
      // Sync in background
      (async () => {
        try {
          if (isAlreadyFavorited) {
            await removeFavorite(sermonId);
          } else {
            await addFavorite(sermonId);
          }
        } catch {}
      })();
      return true;
    },
    [addNotification, favoritedIds],
  );

  const isFavorited = useCallback(
    (sermonId: string) => favoritedIds.has(sermonId),
    [favoritedIds],
  );

  return (
    <FavoritesContext.Provider
      value={{
        favoriteSermons,
        favoritedIds,
        loading,
        isFavorited,
        toggleFavorite,
        count: favoritedIds.size,
      }}
    >
      {children}
    </FavoritesContext.Provider>
  );
};

export function useFavoritesContext() {
  const ctx = useContext(FavoritesContext);
  if (!ctx)
    throw new Error(
      "useFavoritesContext must be used within a FavoritesProvider",
    );
  return ctx;
}
