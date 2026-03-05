import { useEffect, useState } from "react";
import { useColorScheme as useRNColorScheme } from "react-native";

import { useSettings } from "@/contexts/SettingsContext";

/**
 * To support static rendering, this value needs to be re-calculated on the client side for web
 */
export function useColorScheme() {
  const [hasHydrated, setHasHydrated] = useState(false);
  const { settings } = useSettings();

  useEffect(() => {
    setHasHydrated(true);
  }, []);

  const colorScheme = useRNColorScheme();

  if (!hasHydrated) return "light";
  if (settings.themeMode === "light") return "light";
  if (settings.themeMode === "dark") return "dark";
  return colorScheme ?? "light";
}
