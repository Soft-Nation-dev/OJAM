import { useDownloadsContext } from "@/contexts/DownloadsContext";

export function useDownloads() {
  return useDownloadsContext();
}
