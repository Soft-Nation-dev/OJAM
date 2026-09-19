import Constants from "expo-constants";
import { Platform } from "react-native";

let setupPromise: Promise<void> | null = null;
let lastHealthCheckAt = 0;
const HEALTH_CHECK_INTERVAL_MS = 15_000;

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

export async function initializeTrackPlayer(
  options: { verify?: boolean } = {},
) {
  const trackPlayerModule = getTrackPlayerModule();
  if (!trackPlayerModule) {
    return;
  }

  const TrackPlayer = trackPlayerModule.default;

  if (setupPromise) {
    await setupPromise;

    if (options.verify === false) {
      return;
    }

    if (Date.now() - lastHealthCheckAt < HEALTH_CHECK_INTERVAL_MS) {
      return;
    }

    try {
      await TrackPlayer.getPlaybackState();
      lastHealthCheckAt = Date.now();
      return;
    } catch (e) {
      console.warn("[AudioPlayer] Native playback service is uninitialized or dead. Resetting setup promise.", e);
      setupPromise = null;
    }
  }

  if (!setupPromise) {
    const { AndroidAudioContentType, AppKilledPlaybackBehavior, Capability } =
      trackPlayerModule;

    setupPromise = (async () => {
      try {
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
          notificationCapabilities: [
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
        lastHealthCheckAt = Date.now();
      } catch (error: any) {
        if (
          error?.message?.includes("already") ||
          error?.code?.includes("already")
        ) {
          console.log("[AudioPlayer] TrackPlayer already initialized native-side.");
          lastHealthCheckAt = Date.now();
        } else {
          setupPromise = null;
          throw error;
        }
      }
    })();
  }

  return setupPromise;
}
