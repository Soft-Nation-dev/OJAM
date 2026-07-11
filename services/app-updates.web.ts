/**
 * Web stub for app-updates service.
 *
 * Metro automatically resolves *.web.ts files over *.ts when bundling
 * for the web platform. This file replaces the native implementation
 * (which depends on sp-react-native-in-app-updates and expo-updates —
 * both of which are Android/iOS only) with safe no-ops so the web
 * export succeeds without errors.
 */

export type UpdateStatus = {
  otaAvailable: boolean;
  storeUpdateAvailable: boolean;
  storeVersion: string | null;
};

export const getAppVersion = (): string => "web";

export const getBuildVersion = (): string => "web";

export const openPlayStore = async (): Promise<boolean> => false;

export const checkForUpdates = async (): Promise<UpdateStatus> => ({
  otaAvailable: false,
  storeUpdateAvailable: false,
  storeVersion: null,
});

export const startStoreUpdate = async (
  _mode?: "flexible" | "immediate",
): Promise<boolean> => false;

export const applyOtaUpdate = async (): Promise<boolean> => false;

export const shouldShowUpdatePrompt = async (): Promise<boolean> => false;

export const markUpdatePromptShown = async (): Promise<void> => {};
