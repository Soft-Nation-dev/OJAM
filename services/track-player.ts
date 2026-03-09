import Constants from "expo-constants";
import { Platform } from "react-native";

let setupPromise: Promise<void> | null = null;

const isExpoGo = Constants.executionEnvironment === "storeClient";
export const isTrackPlayerSupported = Platform.OS !== "web" && !isExpoGo;

type TrackPlayerModule = typeof import("react-native-track-player");

let cachedTrackPlayerModule: TrackPlayerModule | null = null;

export function getTrackPlayerModule(): TrackPlayerModule | null {
  if (!isTrackPlayerSupported) {
    return null;
  }

  if (!cachedTrackPlayerModule) {
    try {
      cachedTrackPlayerModule = require("react-native-track-player");
    } catch (e) {
      console.warn("Failed to load react-native-track-player:", e);
      return null;
    }
  }

  return cachedTrackPlayerModule;
}

export function initializeTrackPlayer() {
  const trackPlayerModule = getTrackPlayerModule();
  if (!trackPlayerModule) {
    return Promise.resolve();
  }

  const TrackPlayer = trackPlayerModule.default;
  const { AndroidAudioContentType, AppKilledPlaybackBehavior, Capability } =
    trackPlayerModule;

  if (!setupPromise) {
    setupPromise = (async () => {
      await TrackPlayer.setupPlayer({
        autoHandleInterruptions: true,
        minBuffer: 15,
        maxBuffer: 120,
        playBuffer: 5,
        maxCacheSize: 102400,
        androidAudioContentType: AndroidAudioContentType.Speech,
      });

      await TrackPlayer.updateOptions({
        capabilities: [
          Capability.Play,
          Capability.Pause,
          Capability.SkipToNext,
          Capability.SkipToPrevious,
          Capability.SeekTo,
          Capability.Stop,
        ],
        progressUpdateEventInterval: 2,
        android: {
          appKilledPlaybackBehavior:
            AppKilledPlaybackBehavior.StopPlaybackAndRemoveNotification,
        },
      });
    })().catch((error) => {
      throw error;
    });
  }

  return setupPromise;
}
