import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Application from "expo-application";
import Constants from "expo-constants";
import * as Updates from "expo-updates";
import { Linking, Platform } from "react-native";

type OtaUpdateStatus = {
  available: boolean;
  enabled: boolean;
};

type StoreUpdateStatus = {
  available: boolean;
  version: string | null;
  url: string | null;
};

export type UpdateStatus = {
  otaAvailable: boolean;
  storeUpdateAvailable: boolean;
  storeVersion: string | null;
};

type UpdateConfigResponse = {
  latestVersion?: string;
  minVersion?: string;
  storeUrl?: string;
};

const UPDATE_PROMPT_KEY = "@update_prompt_last_shown";
const UPDATE_PROMPT_COOLDOWN_MS = 1000 * 60 * 60 * 24;
const UPDATE_CONFIG_URL =
  Constants.expoConfig?.extra?.updateConfigUrl ??
  process.env.EXPO_PUBLIC_UPDATE_CONFIG_URL ??
  "";

const getAndroidPackageName = () =>
  Constants.expoConfig?.android?.package ?? "";

export const getAppVersion = () =>
  Application.nativeApplicationVersion ??
  Constants.expoConfig?.version ??
  "0.0.0";

export const getBuildVersion = () =>
  Application.nativeBuildVersion ??
  Constants.expoConfig?.android?.versionCode?.toString() ??
  "";

export const openPlayStore = async () => {
  const pkg = getAndroidPackageName();

  if (!pkg) return false;

  const storeUrl = `https://play.google.com/store/apps/details?id=${pkg}`;

  try {
    await Linking.openURL(storeUrl);
    return true;
  } catch (error) {
    console.warn("[Updates] Failed to open Play Store", error);
    return false;
  }
};

const cleanVersion = (value: string) =>
  value.trim().split(/\s+/)[0] || value.trim();

const parseVersionParts = (value: string) =>
  cleanVersion(value)
    .split(".")
    .map((part) => {
      const parsed = Number.parseInt(part.replace(/[^0-9].*$/, ""), 10);
      return Number.isFinite(parsed) ? parsed : 0;
    });

const compareVersions = (a: string, b: string) => {
  const aParts = parseVersionParts(a);
  const bParts = parseVersionParts(b);
  const maxLen = Math.max(aParts.length, bParts.length);

  for (let i = 0; i < maxLen; i++) {
    const left = aParts[i] ?? 0;
    const right = bParts[i] ?? 0;
    if (left > right) return 1;
    if (left < right) return -1;
  }

  return 0;
};

const fetchUpdateConfig = async (): Promise<UpdateConfigResponse | null> => {
  if (!UPDATE_CONFIG_URL) return null;

  try {
    const response = await fetch(UPDATE_CONFIG_URL, {
      headers: { Accept: "application/json" },
    });

    if (!response.ok) return null;

    const data = (await response.json()) as UpdateConfigResponse | null;
    if (!data || typeof data !== "object") return null;

    return data;
  } catch (error) {
    console.warn("[Updates] Failed to fetch update config", error);
    return null;
  }
};

const parsePlayStoreVersion = (html: string) => {
  const softwareMatch = html.match(/"softwareVersion"\s*:\s*"([^"]+)"/);
  if (softwareMatch?.[1]) return softwareMatch[1].trim();

  const currentMatch = html.match(
    /Current Version<\/div>\s*<span[^>]*>\s*<div[^>]*>\s*<span[^>]*>([^<]+)<\/span>/i,
  );
  if (currentMatch?.[1]) return currentMatch[1].trim();

  return null;
};

const fetchPlayStoreVersion = async (pkg: string) => {
  if (!pkg) return null;

  const url = `https://play.google.com/store/apps/details?id=${pkg}&hl=en&gl=US`;

  try {
    const response = await fetch(url);
    if (!response.ok) return null;

    const html = await response.text();
    return parsePlayStoreVersion(html);
  } catch (error) {
    console.warn("[Updates] Failed to fetch Play Store version", error);
    return null;
  }
};

const checkForOtaUpdate = async (): Promise<OtaUpdateStatus> => {
  if (!Updates.isEnabled) {
    return {
      available: false,
      enabled: false,
    };
  }

  try {
    const result = await Updates.checkForUpdateAsync();

    return {
      available: Boolean(result.isAvailable),
      enabled: true,
    };
  } catch (error) {
    console.warn("[Updates] OTA update check failed", error);

    return {
      available: false,
      enabled: true,
    };
  }
};

const checkForStoreUpdate = async (): Promise<StoreUpdateStatus> => {
  if (Platform.OS !== "android") {
    return { available: false, version: null, url: null };
  }

  const pkg = getAndroidPackageName();
  const currentVersion = getAppVersion();
  const config = await fetchUpdateConfig();

  const storeUrl =
    config?.storeUrl ||
    (pkg ? `https://play.google.com/store/apps/details?id=${pkg}` : null);

  const latestVersion =
    config?.latestVersion ?? (pkg ? await fetchPlayStoreVersion(pkg) : null);

  if (!latestVersion) {
    return { available: false, version: null, url: storeUrl };
  }

  const isNewer = compareVersions(latestVersion, currentVersion) > 0;

  return {
    available: isNewer,
    version: latestVersion,
    url: storeUrl,
  };
};

export const checkForUpdates = async (): Promise<UpdateStatus> => {
  const [ota, store] = await Promise.all([
    checkForOtaUpdate(),
    checkForStoreUpdate(),
  ]);

  return {
    otaAvailable: ota.available,
    storeUpdateAvailable: store.available,
    storeVersion: store.version,
  };
};

export const startStoreUpdate = async (
  mode: "flexible" | "immediate" = "flexible",
) => {
  void mode;
  return openPlayStore();
};

export const applyOtaUpdate = async () => {
  if (!Updates.isEnabled) return false;

  try {
    const result = await Updates.fetchUpdateAsync();

    if (result.isNew) {
      await Updates.reloadAsync();
      return true;
    }
  } catch (error) {
    console.warn("[Updates] OTA apply failed", error);
  }

  return false;
};

export const shouldShowUpdatePrompt = async () => {
  try {
    const last = await AsyncStorage.getItem(UPDATE_PROMPT_KEY);

    if (!last) return true;

    const lastShown = Number(last);

    if (!Number.isFinite(lastShown)) return true;

    return Date.now() - lastShown >= UPDATE_PROMPT_COOLDOWN_MS;
  } catch {
    return true;
  }
};

export const markUpdatePromptShown = async () => {
  try {
    await AsyncStorage.setItem(
      UPDATE_PROMPT_KEY,
      String(Date.now()),
    );
  } catch {
    // Ignore failures
  }
};
