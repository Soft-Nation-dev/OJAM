import "expo-router/entry";
import TrackPlayer from "react-native-track-player";
import playbackService from "./services/playback-service";

TrackPlayer.registerPlaybackService(() => playbackService);
