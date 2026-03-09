import Constants from "expo-constants";
import "expo-router/entry";

if (Constants.executionEnvironment !== "storeClient") {
  try {
    const TrackPlayer = require("react-native-track-player").default;
    const playbackService = require("./services/playback-service").default;
    TrackPlayer.registerPlaybackService(() => playbackService);
  } catch (e) {
    console.warn("TrackPlayer registration skipped:", e);
  }
}
