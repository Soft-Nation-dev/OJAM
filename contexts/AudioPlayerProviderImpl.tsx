import {
    getTrackPlayerModule,
    initializeTrackPlayer,
    isTrackPlayerSupported,
} from "@/services/track-player";
import { Sermon } from "@/types/sermon";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";

const trackPlayerModule = getTrackPlayerModule();
const TrackPlayer = trackPlayerModule?.default as any;
const Event = trackPlayerModule?.Event as any;
const RepeatMode = trackPlayerModule?.RepeatMode as any;

const AUDIO_REPEAT_MODE_KEY = "audio_repeat_mode";
const AUDIO_SHUFFLE_MODE_KEY = "audio_shuffle_mode";
const PROGRESS_UPDATE_MIN_INTERVAL_MS = 500;
const PROGRESS_EPSILON_SECONDS = 0.25;

interface AudioPlayerContextType {
  currentSermon: Sermon | null;
  history: Sermon[];
  queue: Sermon[];
  currentIndex: number;
  isPlaying: boolean;
  position: number;
  duration: number;
  playbackRate: number;
  repeat: "off" | "one" | "all";
  shuffle: boolean;

  playSermon: (sermon: Sermon) => Promise<void>;
  playFromList: (sermons: Sermon[], startId?: string) => Promise<void>;
  pause: () => Promise<void>;
  resume: () => Promise<void>;
  seekTo: (seconds: number) => Promise<void>;
  playNext: () => Promise<void>;
  playPrevious: () => Promise<void>;
  setPlaybackRate: (rate: number) => Promise<void>;
  setRepeat: (mode: "off" | "one" | "all") => Promise<void>;
  toggleShuffle: () => Promise<void>;
  addToQueue: (sermon: Sermon) => void;
  addToQueueNext: (sermon: Sermon) => void;
  reorderQueue: (newQueue: Sermon[]) => void;
  removeFromQueue: (indexOrId: number | string) => void;
}

const AudioPlayerContext = createContext<AudioPlayerContextType | undefined>(
  undefined,
);

const normalizeAudioUrl = (sermon: Sermon) => {
  const source = (sermon.localPath || sermon.audioUrl || "").trim();
  if (!source) return "";

  if (source.startsWith("http://") || source.startsWith("https://")) {
    // URLs are normalized when built from data sources; avoid double encoding here.
    return source;
  }

  if (source.startsWith("file://")) return source;
  if (source.startsWith("content://")) return source;

  if (source.startsWith("/")) {
    return `file://${source}`;
  }

  if (/^[A-Za-z]:\\/.test(source))
    return `file:///${source.replace(/\\/g, "/")}`;

  return source;
};

const toTrack = (sermon: Sermon) => ({
  id: sermon.id,
  url: normalizeAudioUrl(sermon),
  title: sermon.title,
  artist: sermon.preacher,
  artwork: sermon.imageUrl,
  duration: sermon.duration,
  description: sermon.description,
  genre: sermon.genre,
  date: sermon.date,
});

const toRetainedSermon = (sermon: Sermon): Sermon => ({
  id: sermon.id,
  title: sermon.title,
  preacher: sermon.preacher,
  date: sermon.date,
  duration: sermon.duration,
  audioUrl: sermon.audioUrl,
  imageUrl: sermon.imageUrl,
  category: sermon.category,
  genre: sermon.genre,
  plays: sermon.plays,
  likes: sermon.likes,
  favorites: sermon.favorites,
  localPath: sermon.localPath,
});

const shuffleArray = <T,>(items: T[]) => {
  const next = [...items];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
};

const mapRepeatToTrackMode = (mode: "off" | "one" | "all") => {
  if (!RepeatMode) return undefined;
  if (mode === "one") return RepeatMode.Track;
  if (mode === "all") return RepeatMode.Queue;
  return RepeatMode.Off;
};

export function AudioPlayerProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [queue, setQueue] = useState<Sermon[]>([]);
  const [history, setHistory] = useState<Sermon[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(-1);
  const [currentSermon, setCurrentSermon] = useState<Sermon | null>(null);
  const [progress, setProgress] = useState({ position: 0, duration: 0 });
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackRate, setPlaybackRateState] = useState(1);
  const [repeat, setRepeatState] = useState<"off" | "one" | "all">("off");
  const [shuffle, setShuffle] = useState(false);
  const [isRepeatHydrated, setIsRepeatHydrated] = useState(false);
  const [isShuffleHydrated, setIsShuffleHydrated] = useState(false);

  const busyRef = useRef(false);
  const queueRef = useRef<Sermon[]>([]);
  const currentIndexRef = useRef(-1);
  const currentSermonRef = useRef<Sermon | null>(null);
  const repeatRef = useRef<"off" | "one" | "all">("off");
  const shuffleRef = useRef(false);
  const unshuffledQueueRef = useRef<Sermon[] | null>(null);
  const progressRef = useRef({ position: 0, duration: 0 });
  const lastProgressCommitTsRef = useRef(0);
  const isPlayingRef = useRef(false);
  const playbackRateRef = useRef(1);

  useEffect(() => {
    queueRef.current = queue;
  }, [queue]);

  useEffect(() => {
    currentIndexRef.current = currentIndex;
  }, [currentIndex]);

  useEffect(() => {
    currentSermonRef.current = currentSermon;
  }, [currentSermon]);

  useEffect(() => {
    repeatRef.current = repeat;
  }, [repeat]);

  useEffect(() => {
    shuffleRef.current = shuffle;
  }, [shuffle]);

  useEffect(() => {
    progressRef.current = progress;
  }, [progress]);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  useEffect(() => {
    playbackRateRef.current = playbackRate;
  }, [playbackRate]);

  useEffect(() => {
    const loadRepeatMode = async () => {
      try {
        const stored = await AsyncStorage.getItem(AUDIO_REPEAT_MODE_KEY);
        if (stored === "off" || stored === "one" || stored === "all") {
          setRepeatState(stored);
        }
      } finally {
        setIsRepeatHydrated(true);
      }
    };

    const loadShuffleMode = async () => {
      try {
        const stored = await AsyncStorage.getItem(AUDIO_SHUFFLE_MODE_KEY);
        if (stored === "true") {
          setShuffle(true);
        } else if (stored === "false") {
          setShuffle(false);
        }
      } finally {
        setIsShuffleHydrated(true);
      }
    };

    void loadRepeatMode();
    void loadShuffleMode();
  }, []);

  useEffect(() => {
    if (!isRepeatHydrated) return;
    AsyncStorage.setItem(AUDIO_REPEAT_MODE_KEY, repeat).catch(() => {});
  }, [repeat, isRepeatHydrated]);

  useEffect(() => {
    if (!isShuffleHydrated) return;
    AsyncStorage.setItem(AUDIO_SHUFFLE_MODE_KEY, String(shuffle)).catch(
      () => {},
    );
  }, [shuffle, isShuffleHydrated]);

  const waitForIdle = async () => {
    while (busyRef.current) {
      await new Promise((resolve) => setTimeout(resolve, 25));
    }
  };

  const syncActiveFromIndex = (index: number) => {
    currentIndexRef.current = index;
    setCurrentIndex(index);

    const active = index >= 0 ? (queueRef.current[index] ?? null) : null;
    currentSermonRef.current = active;
    setCurrentSermon(active);

    if (active) {
      const retained = toRetainedSermon(active);
      setHistory((prev) => {
        const deduped = prev.filter((item) => item.id !== retained.id);
        const next = [...deduped, retained];
        return next.slice(-10);
      });
    }
  };

  const setQueueAndPlayer = async (
    nextQueue: Sermon[],
    activeIndex: number,
    options?: { play?: boolean; position?: number },
  ) => {
    const shouldPlay = options?.play ?? isPlayingRef.current;
    const initialPosition = options?.position ?? 0;

    queueRef.current = nextQueue;
    setQueue(nextQueue);
    syncActiveFromIndex(activeIndex);

    if (!isTrackPlayerSupported) {
      console.warn(
        "[AudioPlayer] TrackPlayer unsupported in current runtime (likely Expo Go).",
      );
      setProgress((prev) => ({ ...prev, position: initialPosition }));
      if (typeof options?.play === "boolean") {
        setIsPlaying(options.play);
      }
      return;
    }

    await initializeTrackPlayer();

    const preparedQueue = nextQueue
      .map((sermon, index) => ({
        index,
        track: toTrack(sermon),
      }))
      .filter((item) => Boolean(item.track.url));

    if (!preparedQueue.length) {
      console.warn("[AudioPlayer] No playable sermon URL found in queue.");
      await TrackPlayer.stop();
      setIsPlaying(false);
      setProgress({ position: 0, duration: 0 });
      return;
    }

    if (preparedQueue.length !== nextQueue.length) {
      console.warn(
        `[AudioPlayer] Skipping ${nextQueue.length - preparedQueue.length} sermon(s) with invalid audio URLs.`,
      );
    }

    await TrackPlayer.setQueue(preparedQueue.map((item) => item.track));

    const mappedActiveIndex = preparedQueue.findIndex(
      (item) => item.index === activeIndex,
    );

    if (mappedActiveIndex >= 0 && nextQueue[activeIndex]) {
      const activeTrack = nextQueue[activeIndex];
      const isStreaming = !activeTrack.localPath && activeTrack.audioUrl;

      await TrackPlayer.skip(mappedActiveIndex, initialPosition);
      await TrackPlayer.setRate(playbackRateRef.current);

      if (shouldPlay) {
        // Give streaming URLs a moment to buffer before playing
        if (isStreaming) {
          await new Promise((resolve) => setTimeout(resolve, 300));
        }
        await TrackPlayer.play();
        console.log("[AudioPlayer] Playback started", {
          id: activeTrack.id,
          url: normalizeAudioUrl(activeTrack),
        });
      } else {
        await TrackPlayer.pause();
      }
    } else {
      await TrackPlayer.stop();
      setIsPlaying(false);
      setProgress({ position: 0, duration: 0 });
    }
  };

  const syncProgress = useCallback(async () => {
    if (!isTrackPlayerSupported) return;
    try {
      const next = await TrackPlayer.getProgress();
      const nextPosition = Number.isFinite(next.position) ? next.position : 0;
      const nextDuration = Number.isFinite(next.duration) ? next.duration : 0;
      setProgress((prev) => {
        if (prev.position === nextPosition && prev.duration === nextDuration) {
          return prev;
        }

        return {
          position: nextPosition,
          duration: nextDuration,
        };
      });
    } catch {
      setProgress((prev) => prev);
    }
  }, []);

  useEffect(() => {
    if (!isTrackPlayerSupported) return;

    let isMounted = true;

    const setup = async () => {
      await initializeTrackPlayer();
      await TrackPlayer.setRepeatMode(mapRepeatToTrackMode(repeatRef.current));
      await TrackPlayer.setRate(playbackRateRef.current);
      const ready = await TrackPlayer.getPlayWhenReady();
      if (isMounted) setIsPlaying(ready);
      await syncProgress();
    };

    void setup().catch((error) => {
      console.error("[AudioPlayer] Setup failed", error);
    });

    const progressSub = TrackPlayer.addEventListener(
      Event.PlaybackProgressUpdated,
      (event) => {
        const nextPosition = Number.isFinite(event.position)
          ? event.position
          : 0;
        const nextDuration = Number.isFinite(event.duration)
          ? event.duration
          : 0;

        setProgress((prev) => {
          const positionDelta = Math.abs(prev.position - nextPosition);
          const durationDelta = Math.abs(prev.duration - nextDuration);
          const now = Date.now();
          const shouldCommitByInterval =
            now - lastProgressCommitTsRef.current >=
            PROGRESS_UPDATE_MIN_INTERVAL_MS;
          const hasMeaningfulDelta =
            positionDelta >= PROGRESS_EPSILON_SECONDS ||
            durationDelta >= PROGRESS_EPSILON_SECONDS;

          if (!hasMeaningfulDelta || !shouldCommitByInterval) {
            return prev;
          }

          lastProgressCommitTsRef.current = now;
          return {
            position: nextPosition,
            duration: nextDuration,
          };
        });
      },
    );

    const playWhenReadySub = TrackPlayer.addEventListener(
      Event.PlaybackPlayWhenReadyChanged,
      (event) => {
        setIsPlaying(!!event.playWhenReady);
      },
    );

    const activeTrackSub = TrackPlayer.addEventListener(
      Event.PlaybackActiveTrackChanged,
      (event) => {
        if (typeof event.index === "number") {
          syncActiveFromIndex(event.index);
          setProgress({ position: 0, duration: 0 });
          return;
        }

        syncActiveFromIndex(-1);
        setProgress({ position: 0, duration: 0 });
        setIsPlaying(false);
      },
    );

    const queueEndedSub = TrackPlayer.addEventListener(
      Event.PlaybackQueueEnded,
      async () => {
        if (repeatRef.current === "off") {
          setIsPlaying(false);
        }
      },
    );

    const errorSub = TrackPlayer.addEventListener(
      Event.PlaybackError,
      (event) => {
        console.error("[AudioPlayer] Playback error", event);
      },
    );

    return () => {
      isMounted = false;
      progressSub.remove();
      playWhenReadySub.remove();
      activeTrackSub.remove();
      queueEndedSub.remove();
      errorSub.remove();
    };
  }, [syncProgress]);

  useEffect(() => {
    if (!isTrackPlayerSupported) return;
    void initializeTrackPlayer()
      .then(() => TrackPlayer.setRepeatMode(mapRepeatToTrackMode(repeat)))
      .catch((error) => {
        console.error("[AudioPlayer] Failed setting repeat mode", error);
      });
  }, [repeat]);

  const loadAndPlaySermon = async (
    sermon: Sermon,
    targetQueue?: Sermon[],
    targetIndex?: number,
  ) => {
    let nextQueue = queueRef.current;
    let nextIndex = queueRef.current.findIndex((s) => s.id === sermon.id);

    if (targetQueue && typeof targetIndex === "number") {
      nextQueue = targetQueue;
      nextIndex = targetIndex;
    } else if (nextIndex === -1) {
      nextQueue = [sermon];
      nextIndex = 0;
    }

    await setQueueAndPlayer(nextQueue, nextIndex, { play: true, position: 0 });
  };

  const playSermon = async (sermon: Sermon) => {
    if (busyRef.current) {
      await waitForIdle();
    }
    busyRef.current = true;
    try {
      await loadAndPlaySermon(sermon);
    } finally {
      busyRef.current = false;
    }
  };

  const playFromList = async (sermons: Sermon[], startId?: string) => {
    if (busyRef.current) {
      await waitForIdle();
    }
    busyRef.current = true;
    try {
      if (!sermons.length) return;

      let nextQueue = [...sermons];
      let startIndex = 0;

      if (startId) {
        const idx = nextQueue.findIndex((s) => s.id === startId);
        if (idx >= 0) startIndex = idx;
      }

      if (shuffleRef.current) {
        const startSermon = nextQueue[startIndex];
        const rest = nextQueue.filter((s) => s.id !== startSermon.id);
        nextQueue = [startSermon, ...shuffleArray(rest)];
        startIndex = 0;
      }

      await setQueueAndPlayer(nextQueue, startIndex, {
        play: true,
        position: 0,
      });
    } finally {
      busyRef.current = false;
    }
  };

  const pause = async () => {
    if (!isTrackPlayerSupported) {
      setIsPlaying(false);
      return;
    }

    await initializeTrackPlayer();
    await TrackPlayer.pause();
    setIsPlaying(false);
  };

  const resume = async () => {
    if (!isTrackPlayerSupported) {
      setIsPlaying(true);
      return;
    }

    await initializeTrackPlayer();
    await TrackPlayer.play();
    setIsPlaying(true);
  };

  const seekTo = async (seconds: number) => {
    const nextPosition = Math.max(0, seconds);
    if (!isTrackPlayerSupported) {
      setProgress((prev) => ({ ...prev, position: nextPosition }));
      return;
    }

    await initializeTrackPlayer();
    await TrackPlayer.seekTo(nextPosition);
    setProgress((prev) => ({ ...prev, position: nextPosition }));
  };

  const playNext = async () => {
    if (!isTrackPlayerSupported) return;
    await initializeTrackPlayer();
    await TrackPlayer.skipToNext();
    await TrackPlayer.play();
  };

  const playPrevious = async () => {
    if (!isTrackPlayerSupported) return;
    await initializeTrackPlayer();
    await TrackPlayer.skipToPrevious();
    await TrackPlayer.play();
  };

  const setPlaybackRate = async (rate: number) => {
    if (isTrackPlayerSupported) {
      await initializeTrackPlayer();
      await TrackPlayer.setRate(rate);
    }
    setPlaybackRateState(rate);
  };

  const setRepeat = async (mode: "off" | "one" | "all") => {
    setRepeatState(mode);
    if (!isTrackPlayerSupported) return;

    await initializeTrackPlayer();
    await TrackPlayer.setRepeatMode(mapRepeatToTrackMode(mode));
  };

  const toggleShuffle = async () => {
    const currentQueue = queueRef.current;
    if (!currentQueue.length) {
      setShuffle((prev) => !prev);
      return;
    }

    const current = currentSermonRef.current;
    const playing = isPlayingRef.current;
    const currentPosition = progressRef.current.position;

    if (!shuffleRef.current) {
      unshuffledQueueRef.current = [...currentQueue];
      const currentId = current?.id;
      const pinned = currentId
        ? (currentQueue.find((item) => item.id === currentId) ?? null)
        : null;
      const shuffledQueue = pinned
        ? [
            pinned,
            ...shuffleArray(
              currentQueue.filter((item) => item.id !== pinned.id),
            ),
          ]
        : shuffleArray(currentQueue);
      const nextIndex = pinned ? 0 : -1;

      setShuffle(true);
      await setQueueAndPlayer(shuffledQueue, nextIndex, {
        play: playing,
        position: currentPosition,
      });
      return;
    }

    const restoredQueue = unshuffledQueueRef.current ?? currentQueue;
    const restoredIndex = current
      ? restoredQueue.findIndex((item) => item.id === current.id)
      : -1;

    setShuffle(false);
    unshuffledQueueRef.current = null;

    await setQueueAndPlayer([...restoredQueue], restoredIndex, {
      play: playing,
      position: currentPosition,
    });
  };

  const addToQueue = (sermon: Sermon) => {
    void (async () => {
      if (queueRef.current.some((item) => item.id === sermon.id)) return;

      const nextQueue = [...queueRef.current, sermon];
      queueRef.current = nextQueue;
      setQueue(nextQueue);

      if (shuffleRef.current) {
        unshuffledQueueRef.current = null;
      }

      if (!isTrackPlayerSupported) return;

      await initializeTrackPlayer();
      await TrackPlayer.add(toTrack(sermon));
    })();
  };

  const addToQueueNext = (sermon: Sermon) => {
    void (async () => {
      const base = [...queueRef.current];
      const existingIndex = base.findIndex((item) => item.id === sermon.id);
      let nextCurrentIndex = currentIndexRef.current;

      if (existingIndex >= 0) {
        base.splice(existingIndex, 1);
        if (existingIndex < nextCurrentIndex) {
          nextCurrentIndex -= 1;
        }
      }

      const insertIndex =
        nextCurrentIndex >= 0 ? Math.min(nextCurrentIndex + 1, base.length) : 0;
      base.splice(insertIndex, 0, sermon);

      if (shuffleRef.current) {
        unshuffledQueueRef.current = null;
      }

      await setQueueAndPlayer(base, nextCurrentIndex, {
        play: isPlayingRef.current,
        position: progressRef.current.position,
      });
    })();
  };

  const reorderQueue = (newQueue: Sermon[]) => {
    void (async () => {
      const newIndex = currentSermonRef.current
        ? newQueue.findIndex((s) => s.id === currentSermonRef.current?.id)
        : -1;

      if (shuffleRef.current) {
        unshuffledQueueRef.current = null;
      }

      await setQueueAndPlayer(newQueue, newIndex, {
        play: isPlayingRef.current,
        position: progressRef.current.position,
      });
    })();
  };

  const removeFromQueue = (indexOrId: number | string) => {
    void (async () => {
      const base = [...queueRef.current];
      const index =
        typeof indexOrId === "number"
          ? indexOrId
          : base.findIndex((item) => item.id === indexOrId);

      if (index < 0 || index >= base.length) return;

      const updated = base.filter((_, i) => i !== index);
      let nextIndex = currentIndexRef.current;

      if (index === currentIndexRef.current) {
        nextIndex = updated.length ? Math.min(index, updated.length - 1) : -1;
      } else if (index < currentIndexRef.current) {
        nextIndex = currentIndexRef.current - 1;
      }

      if (shuffleRef.current) {
        unshuffledQueueRef.current = null;
      }

      await setQueueAndPlayer(updated, nextIndex, {
        play: nextIndex >= 0 ? isPlayingRef.current : false,
        position:
          index === currentIndexRef.current ? 0 : progressRef.current.position,
      });
    })();
  };

  const contextValue = useMemo(
    () => ({
      currentSermon,
      history,
      queue,
      currentIndex,
      isPlaying,
      position: progress.position,
      duration: progress.duration,
      playbackRate,
      repeat,
      shuffle,
      playSermon,
      playFromList,
      pause,
      resume,
      seekTo,
      playNext,
      playPrevious,
      setPlaybackRate,
      setRepeat,
      toggleShuffle,
      addToQueue,
      addToQueueNext,
      reorderQueue,
      removeFromQueue,
    }),
    [
      currentSermon,
      history,
      queue,
      currentIndex,
      isPlaying,
      progress.position,
      progress.duration,
      playbackRate,
      repeat,
      shuffle,
    ],
  );

  return (
    <AudioPlayerContext.Provider value={contextValue}>
      {children}
    </AudioPlayerContext.Provider>
  );
}

export function useAudioPlayer() {
  const context = useContext(AudioPlayerContext);
  if (!context) {
    throw new Error("useAudioPlayer must be used inside AudioPlayerProvider");
  }
  return context;
}
