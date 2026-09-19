import Constants from "expo-constants";

export type UpdateStatus = {
  otaAvailable: boolean;
  storeUpdateAvailable: boolean;
  storeUpdateRequired: boolean;
  storeVersion: string | null;
};

const UPDATE_PROMPT_KEY = "@update_prompt_last_shown";
const UPDATE_PROMPT_COOLDOWN_MS = 1000 * 60 * 60 * 24;

export const getAppVersion = (): string =>
  Constants.expoConfig?.version ?? "web";

export const getBuildVersion = (): string => "web";

export const openPlayStore = async (): Promise<boolean> => false;

const getRegistration = async () => {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
    return null;
  }
  return navigator.serviceWorker.getRegistration();
};

const waitForInstalledWorker = async (
  registration: ServiceWorkerRegistration,
): Promise<void> => {
  const worker = registration.installing;
  if (!worker || registration.waiting) return;

  await new Promise<void>((resolve) => {
    const timeout = window.setTimeout(resolve, 8000);
    const finish = () => {
      if (worker.state !== "installed" && worker.state !== "redundant") return;
      window.clearTimeout(timeout);
      worker.removeEventListener("statechange", finish);
      resolve();
    };
    worker.addEventListener("statechange", finish);
    finish();
  });
};

export const checkForUpdates = async (): Promise<UpdateStatus> => {
  const registration = await getRegistration();
  if (!registration) {
    return {
      otaAvailable: false,
      storeUpdateAvailable: false,
      storeUpdateRequired: false,
      storeVersion: null,
    };
  }

  try {
    await registration.update();
    await waitForInstalledWorker(registration);
  } catch (error) {
    console.warn("[Updates] PWA update check failed", error);
  }

  return {
    otaAvailable: Boolean(registration.waiting),
    storeUpdateAvailable: false,
    storeUpdateRequired: false,
    storeVersion: null,
  };
};

export const startStoreUpdate = async (): Promise<boolean> => false;

export const applyOtaUpdate = async (): Promise<boolean> => {
  const registration = await getRegistration();
  if (!registration?.waiting) {
    if (typeof window !== "undefined") window.location.reload();
    return true;
  }

  await new Promise<void>((resolve) => {
    let resolved = false;
    const finish = () => {
      if (resolved) return;
      resolved = true;
      resolve();
    };
    navigator.serviceWorker.addEventListener("controllerchange", finish, {
      once: true,
    });
    registration.waiting?.postMessage({ type: "SKIP_WAITING" });
    window.setTimeout(finish, 3000);
  });
  window.location.reload();
  return true;
};

export const shouldShowUpdatePrompt = async (): Promise<boolean> => {
  try {
    const last = Number(window.localStorage.getItem(UPDATE_PROMPT_KEY));
    return !Number.isFinite(last) || Date.now() - last >= UPDATE_PROMPT_COOLDOWN_MS;
  } catch {
    return true;
  }
};

export const markUpdatePromptShown = async (): Promise<void> => {
  try {
    window.localStorage.setItem(UPDATE_PROMPT_KEY, String(Date.now()));
  } catch {}
};
