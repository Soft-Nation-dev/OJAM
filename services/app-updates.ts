import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Application from "expo-application";
import Constants from "expo-constants";
import * as Updates from "expo-updates";
import { Linking } from "react-native";

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

const openPlayStore = async () => {
  const pkg = getAndroidPackageName();
  if (!pkg) return false;

  const storeUrl = `https://play.google.com/store/apps/details?id=${pkg}`;

  try {
    await Linking.openURL(storeUrl);
    return true;
  } catch {
    return false;
  }
};

export const checkForUpdates = async (): Promise<UpdateStatus> => {
  if (!Updates.isEnabled) {
    return { otaAvailable: false };
  }

  try {
    const result = await Updates.checkForUpdateAsync();

    return {
      otaAvailable: Boolean(result.isAvailable),
    };
  } catch (error) {
    console.warn("[Updates] OTA check failed", error);
    return { otaAvailable: false };
  }
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

export const startStoreUpdate = async () => {
  return openPlayStore();
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
    await AsyncStorage.setItem(UPDATE_PROMPT_KEY, String(Date.now()));
  } catch {
    // ignore
  }
};