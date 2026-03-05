import { useColorScheme as useRNColorScheme } from "react-native";

import { useSettings } from "@/contexts/SettingsContext";

export function useColorScheme() {
  const systemScheme = useRNColorScheme();
  const { settings } = useSettings();

  if (settings.themeMode === "light") return "light";
  if (settings.themeMode === "dark") return "dark";
  return systemScheme ?? "light";
}
