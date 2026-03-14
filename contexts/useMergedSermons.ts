import { Sermon } from "@/types/sermon";
import { useMemo } from "react";
import { useDownloadsContext } from "./DownloadsContext";
import { useSermons } from "./SermonsContext";

export function useMergedSermons(): {
  sermons: Sermon[];
  loading: boolean;
  refresh: (forceRefresh?: boolean) => Promise<void>;
} {
  const { sermons, loading, refresh } = useSermons();
  const { downloadedSermons } = useDownloadsContext();

  const localPathMap = useMemo(() => {
    const map = new Map();
    downloadedSermons.forEach((item) => {
      if (item.status === "completed" && item.localPath) {
        map.set(item.sermon.id, item.localPath);
      }
    });
    return map;
  }, [downloadedSermons]);

  const mergedSermons = useMemo(
    () =>
      sermons.map((sermon) =>
        localPathMap.has(sermon.id)
          ? { ...sermon, localPath: localPathMap.get(sermon.id) }
          : sermon,
      ),
    [sermons, localPathMap],
  );

  return { sermons: mergedSermons, loading, refresh };
}
