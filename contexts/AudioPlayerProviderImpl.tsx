import {
    getTrackPlayerModule,
    initializeTrackPlayer,
    isTrackPlayerSupported,
} from "@/services/track-player";
import { Sermon } from "@/types/sermon";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
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
const State = trackPlayerModule?.State as any;

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
  isBuffering: boolean;
  position: number;
  duration: number;
  playbackRate: number;
  repeat: "off" | "one" | "all";
  shuffle: boolean;
  shuffleMode: "full" | "quick";

  playSermon: (sermon: Sermon) => Promise<void>;
  playFromList: (sermons: Sermon[], startId?: string) => Promise<void>;
  pause: () => Promise<void>;
  resume: () => Promise<void>;
  seekTo: (seconds: number) => Promise<void>;
  playNext: () => Promise<void>;
  playPrevious: () => Promise<void>;
  setPlaybackRate: (rate: number) => Promise<void>;
  setRepeat: (mode: "off" | "one" | "all") => Promise<void>;
  toggleShuffle: (mode?: "full" | "quick") => Promise<void>;
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
  // description: sermon.description, // playlists only
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
  // description: sermon.description, // playlists only
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

const isLoadingPlaybackState = (playbackState: any) => {
  const state = playbackState?.state;
  const buffering = State?.Buffering ?? "buffering";
  const loading = State?.Loading ?? "loading";
  return state === buffering || state === loading;
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
  const [isBuffering, setIsBuffering] = useState(false);
  const [playbackRate, setPlaybackRateState] = useState(1);
  const [repeat, setRepeatState] = useState<"off" | "one" | "all">("off");
  const [shuffle, setShuffle] = useState(false);
  const [shuffleMode, setShuffleMode] = useState<"full" | "quick">("full");
  const [isRepeatHydrated, setIsRepeatHydrated] = useState(false);
  const [isShuffleHydrated, setIsShuffleHydrated] = useState(false);

  const busyRef = useRef(false);
  const queueOpsRef = useRef(Promise.resolve());
  const queueRef = useRef<Sermon[]>([]);
  const currentIndexRef = useRef(-1);
  const currentSermonRef = useRef<Sermon | null>(null);
  const repeatRef = useRef<"off" | "one" | "all">("off");
  const shuffleRef = useRef(false);
  const shuffleModeRef = useRef<"full" | "quick">("full");
  const unshuffledQueueRef = useRef<Sermon[] | null>(null);
  const progressRef = useRef({ position: 0, duration: 0 });
  const lastProgressCommitTsRef = useRef(0);
  const lastProgressSaveTsRef = useRef(0);
  const isPlayingRef = useRef(false);
  const isBufferingRef = useRef(false);
  const playbackRateRef = useRef(1);
  const webAudioRef = useRef<HTMLAudioElement | null>(null);

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
    shuffleModeRef.current = shuffleMode;
  }, [shuffleMode]);

  useEffect(() => {
    progressRef.current = progress;
  }, [progress]);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  useEffect(() => {
    isBufferingRef.current = isBuffering;
  }, [isBuffering]);

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

  useEffect(() => {
    return () => {
      if (Platform.OS === "web" && webAudioRef.current) {
        webAudioRef.current.pause();
        webAudioRef.current = null;
      }
    };
  }, []);

  const waitForIdle = async () => {
    while (busyRef.current) {
      await new Promise((resolve) => setTimeout(resolve, 25));
    }
  };

  const runQueueOperation = (operation: () => Promise<void>) => {
    const run = async () => {
      if (busyRef.current) {
        await waitForIdle();
      }
      await operation();
    };

    queueOpsRef.current = queueOpsRef.current.then(run, run).catch((error) => {
      console.error("[AudioPlayer] Queue operation failed", error);
    });

    return queueOpsRef.current;
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
      if (Platform.OS === "web") {
        if (webAudioRef.current) {
          webAudioRef.current.pause();
          webAudioRef.current = null;
        }

        if (activeIndex >= 0 && nextQueue[activeIndex]) {
          const activeTrack = nextQueue[activeIndex];
          const sourceUrl = normalizeAudioUrl(activeTrack);
          if (!sourceUrl) {
            setIsPlaying(false);
            setIsBuffering(false);
            setProgress({ position: 0, duration: 0 });
            return;
          }

          const audio = new Audio(sourceUrl);
          webAudioRef.current = audio;
          audio.playbackRate = playbackRateRef.current;
          // Preload metadata so Safari knows the duration before canplay
          audio.preload = "metadata";

          setProgress({ position: initialPosition, duration: activeTrack.duration || 0 });

          // --- iOS Safari Fix ---
          // Safari breaks the user-gesture chain after ANY await. We must call
          // audio.play() synchronously here (within the gesture), then seek
          // to the saved position inside the 'canplay' event once media is ready.
          let didSeek = false;
          const onCanPlay = () => {
            if (didSeek) return;
            didSeek = true;

            // Load saved progress and seek without an await that would break gesture chain
            AsyncStorage.getItem(`@sermon_progress_${activeTrack.id}`)
              .then((saved) => {
                let seekTo = initialPosition;
                if (seekTo === 0 && saved) {
                  try {
                    const { position: savedPos } = JSON.parse(saved);
                    if (savedPos > 5 && savedPos < (activeTrack.duration ?? 999999) - 10) {
                      seekTo = savedPos;
                      console.log(`[AudioPlayer] Web Audio Resuming at position ${seekTo}`);
                    }
                  } catch {}
                }
                if (seekTo > 0) {
                  audio.currentTime = seekTo;
                  setProgress((prev) => ({ ...prev, position: seekTo }));
                }
              })
              .catch(() => {});

            audio.removeEventListener("canplay", onCanPlay);
          };
          audio.addEventListener("canplay", onCanPlay);

          audio.addEventListener("timeupdate", () => {
            setProgress((prev) => {
              const now = Date.now();
              if (audio.currentTime > 5 && audio.currentTime < audio.duration - 10) {
                if (now - lastProgressSaveTsRef.current >= 5000) {
                  lastProgressSaveTsRef.current = now;
                  AsyncStorage.setItem(
                    `@sermon_progress_${activeTrack.id}`,
                    JSON.stringify({ position: audio.currentTime, timestamp: now })
                  ).catch(() => {});
                }
              }
              return {
                ...prev,
                position: audio.currentTime,
              };
            });
          });

          audio.addEventListener("durationchange", () => {
            setProgress((prev) => ({
              ...prev,
              duration: audio.duration || 0,
            }));
          });

          audio.addEventListener("waiting", () => {
            setIsBuffering(true);
          });

          audio.addEventListener("playing", () => {
            setIsBuffering(false);
            setIsPlaying(true);
          });

          audio.addEventListener("pause", () => {
            setIsPlaying(false);
          });

          audio.addEventListener("ended", () => {
            setIsPlaying(false);
            setIsBuffering(false);
            AsyncStorage.removeItem(`@sermon_progress_${activeTrack.id}`).catch(() => {});
            void playNext();
          });

          audio.addEventListener("error", (e) => {
            console.error("[AudioPlayer] Web Audio Error", e);
            setIsPlaying(false);
            setIsBuffering(false);
          });

          // Play immediately within the user-gesture — before any await
          if (shouldPlay) {
            setIsBuffering(true);
            audio.play().catch((err) => {
              console.warn("[AudioPlayer] Autoplay blocked or failed", err);
              setIsPlaying(false);
              setIsBuffering(false);
            });
          }
        } else {
          setIsPlaying(false);
          setIsBuffering(false);
          setProgress({ position: 0, duration: 0 });
        }
      } else {
        console.warn(
          "[AudioPlayer] TrackPlayer unsupported in current runtime (likely Expo Go).",
        );
        setProgress((prev) => ({ ...prev, position: initialPosition }));
        setIsBuffering(false);
        if (typeof options?.play === "boolean") {
          setIsPlaying(options.play);
        }
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
      setIsBuffering(false);
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

      let resumePosition = initialPosition;
      if (initialPosition === 0) {
        try {
          const saved = await AsyncStorage.getItem(`@sermon_progress_${activeTrack.id}`);
          if (saved) {
            const { position: savedPos } = JSON.parse(saved);
            if (savedPos > 5 && savedPos < (activeTrack.duration ?? 999999) - 10) {
              resumePosition = savedPos;
              console.log(`[AudioPlayer] Resuming sermon ${activeTrack.id} at position ${resumePosition}`);
            }
          }
        } catch (e) {
          console.warn("[AudioPlayer] Failed to load saved progress:", e);
        }
      }

      await TrackPlayer.skip(mappedActiveIndex, resumePosition);
      await TrackPlayer.setRate(playbackRateRef.current);

      if (shouldPlay) {
        setIsBuffering(true);
        // Give streaming URLs a moment to buffer before playing
        if (isStreaming) {
          await new Promise((resolve) => setTimeout(resolve, 300));
        }
        await TrackPlayer.play();
      } else {
        await TrackPlayer.pause();
        setIsBuffering(false);
      }
    } else {
      await TrackPlayer.stop();
      setIsPlaying(false);
      setIsBuffering(false);
      setProgress({ position: 0, duration: 0 });
    }
  };

  const applyQueueOrder = async (nextQueue: Sermon[], nextIndex: number) => {
    const previousQueue = queueRef.current;

    queueRef.current = nextQueue;
    setQueue(nextQueue);
    if (nextIndex !== currentIndexRef.current) {
      syncActiveFromIndex(nextIndex);
    }

    if (!isTrackPlayerSupported) return;

    await initializeTrackPlayer();

    if (typeof TrackPlayer.move !== "function") {
      await setQueueAndPlayer(nextQueue, nextIndex, {
        play: isPlayingRef.current,
        position: progressRef.current.position,
      });
      return;
    }

    try {
      let working = [...previousQueue];
      for (let toIndex = 0; toIndex < nextQueue.length; toIndex += 1) {
        const targetId = nextQueue[toIndex].id;
        const fromIndex = working.findIndex((item) => item.id === targetId);
        if (fromIndex === -1 || fromIndex === toIndex) continue;

        const [moved] = working.splice(fromIndex, 1);
        working.splice(toIndex, 0, moved);
        await TrackPlayer.move(fromIndex, toIndex);
      }
    } catch (error) {
      console.error("[AudioPlayer] Failed to apply queue order", error);
      await setQueueAndPlayer(nextQueue, nextIndex, {
        play: isPlayingRef.current,
        position: progressRef.current.position,
      });
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
      const playbackState = await TrackPlayer.getPlaybackState();
      if (isMounted) {
        setIsBuffering(isLoadingPlaybackState(playbackState));
      }
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

        if (isBufferingRef.current && nextPosition > 0) {
          setIsBuffering(false);
        }

        const currentSermon = currentSermonRef.current;
        if (currentSermon && nextPosition > 5 && nextPosition < nextDuration - 10) {
          const now = Date.now();
          if (now - lastProgressSaveTsRef.current >= 5000) {
            lastProgressSaveTsRef.current = now;
            AsyncStorage.setItem(
              `@sermon_progress_${currentSermon.id}`,
              JSON.stringify({ position: nextPosition, timestamp: now })
            ).catch(() => {});
          }
        }

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

    const playbackStateSub = TrackPlayer.addEventListener(
      Event.PlaybackState,
      (event) => {
        setIsBuffering(isLoadingPlaybackState(event));
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
        setIsBuffering(false);
      },
    );

    const queueEndedSub = TrackPlayer.addEventListener(
      Event.PlaybackQueueEnded,
      async () => {
        const current = currentSermonRef.current;
        if (current) {
          AsyncStorage.removeItem(`@sermon_progress_${current.id}`).catch(() => {});
        }
        if (repeatRef.current === "off") {
          setIsPlaying(false);
          setIsBuffering(false);
        }
      },
    );

    const errorSub = TrackPlayer.addEventListener(
      Event.PlaybackError,
      (event) => {
        console.error("[AudioPlayer] Playback error", event);
        setIsPlaying(false);
        setIsBuffering(false);
      },
    );

    return () => {
      isMounted = false;
      progressSub.remove();
      playWhenReadySub.remove();
      playbackStateSub.remove();
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
      if (Platform.OS === "web" && webAudioRef.current) {
        webAudioRef.current.pause();
      }
      setIsPlaying(false);
      setIsBuffering(false);

      const current = currentSermonRef.current;
      const pos = progressRef.current.position;
      const dur = progressRef.current.duration;
      if (current && pos > 5 && pos < dur - 10) {
        AsyncStorage.setItem(
          `@sermon_progress_${current.id}`,
          JSON.stringify({ position: pos, timestamp: Date.now() })
        ).catch(() => {});
      }
      return;
    }

    await initializeTrackPlayer();
    await TrackPlayer.pause();
    setIsPlaying(false);
    setIsBuffering(false);

    const current = currentSermonRef.current;
    const pos = progressRef.current.position;
    const dur = progressRef.current.duration;
    if (current && pos > 5 && pos < dur - 10) {
      AsyncStorage.setItem(
        `@sermon_progress_${current.id}`,
        JSON.stringify({ position: pos, timestamp: Date.now() })
      ).catch(() => {});
    }
  };

  const resume = async () => {
    if (!isTrackPlayerSupported) {
      if (Platform.OS === "web" && webAudioRef.current) {
        webAudioRef.current.play().catch((err) => {
          console.warn("[AudioPlayer] Web Audio Resume failed", err);
        });
      }
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
      if (Platform.OS === "web" && webAudioRef.current) {
        webAudioRef.current.currentTime = nextPosition;
      }
      setProgress((prev) => ({ ...prev, position: nextPosition }));
      setIsBuffering(false);
      return;
    }

    await initializeTrackPlayer();
    setIsBuffering(true);
    await TrackPlayer.seekTo(nextPosition);
    setProgress((prev) => ({ ...prev, position: nextPosition }));
    try {
      const playbackState = await TrackPlayer.getPlaybackState();
      setIsBuffering(isLoadingPlaybackState(playbackState));
    } catch {
      setIsBuffering(false);
    }
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
    } else if (Platform.OS === "web" && webAudioRef.current) {
      webAudioRef.current.playbackRate = rate;
    }
    setPlaybackRateState(rate);
  };

  const setRepeat = async (mode: "off" | "one" | "all") => {
    setRepeatState(mode);
    if (!isTrackPlayerSupported) return;

    await initializeTrackPlayer();
    await TrackPlayer.setRepeatMode(mapRepeatToTrackMode(mode));
  };

  const toggleShuffle = async (mode: "full" | "quick" = "full") => {
    await runQueueOperation(async () => {
      const currentQueue = queueRef.current;
      if (!currentQueue.length) {
        setShuffle((prev) => !prev);
        if (!shuffleRef.current) {
          setShuffleMode(mode);
        }
        return;
      }

      const current = currentSermonRef.current;
      const playing = isPlayingRef.current;
      const currentPosition = progressRef.current.position;

      if (!shuffleRef.current) {
        const selectedMode = mode;
        setShuffleMode(selectedMode);
        shuffleModeRef.current = selectedMode;
        unshuffledQueueRef.current = [...currentQueue];

        if (selectedMode === "quick") {
          const activeIndex = currentIndexRef.current;
          let shuffledQueue: Sermon[] = [];
          let nextIndex = -1;

          if (activeIndex >= 0) {
            const before = currentQueue.slice(0, activeIndex + 1);
            const after = shuffleArray(currentQueue.slice(activeIndex + 1));
            shuffledQueue = [...before, ...after];
            nextIndex = activeIndex;
          } else {
            shuffledQueue = shuffleArray(currentQueue);
            nextIndex = current
              ? shuffledQueue.findIndex((item) => item.id === current.id)
              : -1;
          }

          setShuffle(true);
          await applyQueueOrder(shuffledQueue, nextIndex);
          return;
        }

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

      if (shuffleModeRef.current === "quick") {
        await applyQueueOrder([...restoredQueue], restoredIndex);
        return;
      }

      await setQueueAndPlayer([...restoredQueue], restoredIndex, {
        play: playing,
        position: currentPosition,
      });
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
    void runQueueOperation(async () => {
      const base = [...queueRef.current];
      const hasActive =
        currentIndexRef.current >= 0 && Boolean(currentSermonRef.current);

      if (!hasActive) {
        await setQueueAndPlayer([sermon], 0, { play: true, position: 0 });
        return;
      }

      const existingIndex = base.findIndex((item) => item.id === sermon.id);
      if (existingIndex === currentIndexRef.current) return;

      let nextCurrentIndex = currentIndexRef.current;

      if (existingIndex >= 0) {
        base.splice(existingIndex, 1);
        if (existingIndex < nextCurrentIndex) {
          nextCurrentIndex -= 1;
        }
      }

      const insertIndex = Math.min(nextCurrentIndex + 1, base.length);
      base.splice(insertIndex, 0, sermon);

      if (shuffleRef.current) {
        unshuffledQueueRef.current = null;
      }

      queueRef.current = base;
      setQueue(base);
      if (nextCurrentIndex !== currentIndexRef.current) {
        syncActiveFromIndex(nextCurrentIndex);
      }

      if (!isTrackPlayerSupported) return;

      await initializeTrackPlayer();

      try {
        let adjustedInsertIndex = insertIndex;
        if (existingIndex >= 0) {
          await TrackPlayer.remove(existingIndex);
          if (existingIndex < insertIndex) {
            adjustedInsertIndex -= 1;
          }
        }

        await TrackPlayer.add(toTrack(sermon), adjustedInsertIndex);

        const refreshedQueue = await TrackPlayer.getQueue();
        const actualIndex = refreshedQueue.findIndex(
          (item: any) => item.id === sermon.id,
        );
        if (actualIndex !== adjustedInsertIndex) {
          throw new Error("Track insertion index not supported");
        }
      } catch (error) {
        console.error("[AudioPlayer] Failed to insert next", error);
        await setQueueAndPlayer(base, nextCurrentIndex, {
          play: isPlayingRef.current,
          position: progressRef.current.position,
        });
      }
    });
  };

  const reorderQueue = (newQueue: Sermon[]) => {
    void runQueueOperation(async () => {
      const nextQueue = [...newQueue];
      const newIndex = currentSermonRef.current
        ? nextQueue.findIndex((s) => s.id === currentSermonRef.current?.id)
        : -1;

      if (shuffleRef.current) {
        unshuffledQueueRef.current = null;
      }
      await applyQueueOrder(nextQueue, newIndex);
    });
  };

  const removeFromQueue = (indexOrId: number | string) => {
    void runQueueOperation(async () => {
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

        if (shuffleRef.current) {
          unshuffledQueueRef.current = null;
        }

        await setQueueAndPlayer(updated, nextIndex, {
          play: nextIndex >= 0 ? isPlayingRef.current : false,
          position: 0,
        });
        return;
      }

      if (index < currentIndexRef.current) {
        nextIndex = currentIndexRef.current - 1;
      }

      if (shuffleRef.current) {
        unshuffledQueueRef.current = null;
      }

      queueRef.current = updated;
      setQueue(updated);
      if (nextIndex !== currentIndexRef.current) {
        syncActiveFromIndex(nextIndex);
      }

      if (!isTrackPlayerSupported) return;

      await initializeTrackPlayer();

      try {
        await TrackPlayer.remove(index);
      } catch (error) {
        console.error("[AudioPlayer] Failed to remove from queue", error);
        await setQueueAndPlayer(updated, nextIndex, {
          play: nextIndex >= 0 ? isPlayingRef.current : false,
          position: progressRef.current.position,
        });
      }
    });
  };

  const contextValue = useMemo(
    () => ({
      currentSermon,
      history,
      queue,
      currentIndex,
      isPlaying,
      isBuffering,
      position: progress.position,
      duration: progress.duration,
      playbackRate,
      repeat,
      shuffle,
      shuffleMode,
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
      isBuffering,
      progress.position,
      progress.duration,
      playbackRate,
      repeat,
      shuffle,
      shuffleMode,
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
