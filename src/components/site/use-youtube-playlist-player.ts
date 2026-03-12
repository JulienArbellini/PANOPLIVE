"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export type DreamPlayerState = "loading" | "ready" | "playing" | "paused" | "error";

type YTPlayer = {
  playVideo: () => void;
  pauseVideo: () => void;
  nextVideo: () => void;
  previousVideo: () => void;
  destroy: () => void;
  getVideoData?: () => { title?: string };
};

declare global {
  interface Window {
    YT?: {
      Player: new (elementId: string, options: Record<string, unknown>) => YTPlayer;
      PlayerState?: {
        ENDED: number;
        PLAYING: number;
        PAUSED: number;
        BUFFERING: number;
        CUED: number;
      };
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

let youtubeApiPromise: Promise<void> | null = null;

function loadYouTubeApi(): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("YouTube API disponible uniquement côté client."));
  }

  if (window.YT?.Player) return Promise.resolve();
  if (youtubeApiPromise) return youtubeApiPromise;

  youtubeApiPromise = new Promise((resolve, reject) => {
    let settled = false;

    const done = () => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeout);
      window.clearInterval(interval);
      resolve();
    };

    const fail = (message: string) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeout);
      window.clearInterval(interval);
      youtubeApiPromise = null;
      reject(new Error(message));
    };

    const onReady = () => {
      if (window.YT?.Player) done();
    };

    const previousCallback = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previousCallback?.();
      onReady();
    };

    let script = document.getElementById("yt-iframe-api") as HTMLScriptElement | null;
    if (!script) {
      script = document.createElement("script");
      script.id = "yt-iframe-api";
      script.src = "https://www.youtube.com/iframe_api";
      script.async = true;
      script.onerror = () => fail("Impossible de charger l'API YouTube.");
      document.head.appendChild(script);
    }

    const interval = window.setInterval(() => {
      if (window.YT?.Player) done();
    }, 120);

    const timeout = window.setTimeout(() => {
      fail("Timeout de chargement de l'API YouTube.");
    }, 10000);
  });

  return youtubeApiPromise;
}

export function useYouTubePlaylistPlayer(playlistId: string) {
  const playerRef = useRef<YTPlayer | null>(null);
  const [state, setState] = useState<DreamPlayerState>("loading");
  const [trackTitle, setTrackTitle] = useState("");
  const [attempt, setAttempt] = useState(0);

  const containerId = useMemo(() => {
    const clean = playlistId.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 32) || "playlist";
    return `yt-dream-${clean}`;
  }, [playlistId]);

  const syncTitle = useCallback(() => {
    const title = playerRef.current?.getVideoData?.().title?.trim();
    if (title) setTrackTitle(title);
  }, []);

  useEffect(() => {
    let disposed = false;

    async function initPlayer() {
      try {
        await loadYouTubeApi();
        if (disposed || !window.YT?.Player) return;

        const player = new window.YT.Player(containerId, {
          width: "1",
          height: "1",
          playerVars: {
            autoplay: 0,
            controls: 0,
            disablekb: 1,
            fs: 0,
            modestbranding: 1,
            playsinline: 1,
            rel: 0,
            listType: "playlist",
            list: playlistId,
          },
          events: {
            onReady: () => {
              if (disposed) return;
              setState("ready");
              syncTitle();
            },
            onStateChange: (event: { data: number }) => {
              if (disposed) return;

              const ytState = window.YT?.PlayerState;
              if (event.data === ytState?.PLAYING) {
                setState("playing");
              } else if (event.data === ytState?.PAUSED) {
                setState("paused");
              } else if (event.data === ytState?.CUED) {
                setState("ready");
              } else if (event.data === ytState?.BUFFERING) {
                setState((previous) => (previous === "playing" ? "playing" : "loading"));
              } else if (event.data === ytState?.ENDED) {
                setState("paused");
              }

              syncTitle();
            },
            onError: () => {
              if (!disposed) setState("error");
            },
          },
        });

        playerRef.current = player;
      } catch {
        if (!disposed) setState("error");
      }
    }

    void initPlayer();

    return () => {
      disposed = true;
      playerRef.current?.destroy();
      playerRef.current = null;
    };
  }, [attempt, containerId, playlistId, syncTitle]);

  const playPause = useCallback(() => {
    if (!playerRef.current) return;
    if (state === "playing") playerRef.current.pauseVideo();
    else playerRef.current.playVideo();
  }, [state]);

  const next = useCallback(() => {
    playerRef.current?.nextVideo();
    window.setTimeout(syncTitle, 240);
  }, [syncTitle]);

  const previous = useCallback(() => {
    playerRef.current?.previousVideo();
    window.setTimeout(syncTitle, 240);
  }, [syncTitle]);

  const retry = useCallback(() => {
    setState("loading");
    setTrackTitle("");
    setAttempt((value) => value + 1);
  }, []);

  return {
    containerId,
    state,
    trackTitle,
    isPlaying: state === "playing",
    playPause,
    next,
    previous,
    retry,
  };
}
