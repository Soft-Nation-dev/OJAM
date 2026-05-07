import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Application from "expo-application";
import Constants from "expo-constants";
import * as Updates from "expo-updates";
import { Linking } from "react-native";

type OtaUpdateStatus = {
  available: boolean;
  enabled: boolean;
};

export type UpdateStatus = {
  otaAvailable: boolean;
};

const UPDATE_PROMPT_KEY = "@update_prompt_last_shown";
const UPDATE_PROMPT_COOLDOWN_MS = 1000 * 60 * 60 * 24;

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

export const checkForUpdates = async (): Promise<UpdateStatus> => {
  const ota = await checkForOtaUpdate();

  return {
    otaAvailable: ota.available,
  };
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