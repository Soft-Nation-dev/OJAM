import { Platform } from "react-native";
import TrackPlayer, {
    AndroidAudioContentType,
    AppKilledPlaybackBehavior,
    Capability,
} from "react-native-track-player";

let setupPromise: Promise<void> | null = null;

export function initializeTrackPlayer() {
  if (Platform.OS === "web") {
    return Promise.resolve();
  }

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
        compactCapabilities: [
          Capability.Play,
          Capability.Pause,
          Capability.SkipToNext,
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
