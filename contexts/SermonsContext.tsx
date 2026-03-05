import { fetchSermons } from "@/lib/sermons";
import { Sermon } from "@/types/sermon";
import React, {
    createContext,
    ReactNode,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
} from "react";

type SermonsContextValue = {
  sermons: Sermon[];
  loading: boolean;
  refresh: (forceRefresh?: boolean) => Promise<void>;
};

const SermonsContext = createContext<SermonsContextValue | undefined>(
  undefined,
);

export function SermonsProvider({ children }: { children: ReactNode }) {
  const [sermons, setSermons] = useState<Sermon[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async (forceRefresh = false) => {
    try {
      const data = await fetchSermons({ forceRefresh });
      setSermons(data ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const value = useMemo(
    () => ({
      sermons,
      loading,
      refresh,
    }),
    [sermons, loading, refresh],
  );

  return (
    <SermonsContext.Provider value={value}>{children}</SermonsContext.Provider>
  );
}

export function useSermons() {
  const context = useContext(SermonsContext);
  if (!context) {
    throw new Error("useSermons must be used within a SermonsProvider");
  }
  return context;
}
