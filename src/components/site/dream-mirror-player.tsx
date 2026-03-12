"use client";

import { useEffect, useMemo, useRef, useState, type PointerEventHandler } from "react";
import { useYouTubePlaylistPlayer, type DreamPlayerState } from "@/components/site/use-youtube-playlist-player";

type Props = {
  playlistId: string;
};

type GestureHint = "play" | "pause" | "next" | "previous" | null;

function statusLabel(state: DreamPlayerState) {
  if (state === "loading") return "Le miroir s'accorde à ta fréquence...";
  if (state === "ready") return "Touchez l'orbe pour ouvrir le rêve.";
  if (state === "playing") return "En immersion.";
  if (state === "paused") return "Le reflet retient son souffle.";
  return "Le miroir se trouble.";
}

function hintLabel(hint: GestureHint) {
  if (hint === "play") return "Lecture";
  if (hint === "pause") return "Pause";
  if (hint === "next") return "Vision suivante";
  if (hint === "previous") return "Vision précédente";
  return "";
}

export function DreamMirrorPlayer({ playlistId }: Props) {
  const { containerId, state, trackTitle, isPlaying, playPause, next, previous, retry } = useYouTubePlaylistPlayer(playlistId);

  const [isMobile, setIsMobile] = useState(false);
  const [gestureHint, setGestureHint] = useState<GestureHint>(null);
  const hintTimeoutRef = useRef<number | null>(null);
  const pointerRef = useRef<{ id: number; startX: number; startY: number } | null>(null);

  useEffect(() => {
    const query = window.matchMedia("(max-width: 768px)");
    const update = () => setIsMobile(query.matches);
    update();

    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    return () => {
      if (hintTimeoutRef.current) window.clearTimeout(hintTimeoutRef.current);
    };
  }, []);

  const swipeThreshold = isMobile ? 44 : 56;

  const showHint = (hint: GestureHint) => {
    setGestureHint(hint);
    if (hintTimeoutRef.current) window.clearTimeout(hintTimeoutRef.current);
    hintTimeoutRef.current = window.setTimeout(() => setGestureHint(null), 850);
  };

  const onPointerDown: PointerEventHandler<HTMLDivElement> = (event) => {
    pointerRef.current = {
      id: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onPointerUp: PointerEventHandler<HTMLDivElement> = (event) => {
    const gesture = pointerRef.current;
    if (!gesture || gesture.id !== event.pointerId) return;

    const dx = event.clientX - gesture.startX;
    const dy = event.clientY - gesture.startY;
    const absX = Math.abs(dx);
    const absY = Math.abs(dy);

    if (absX > swipeThreshold && absX > absY) {
      if (dx < 0) {
        next();
        showHint("next");
      } else {
        previous();
        showHint("previous");
      }
    } else if (absX < 12 && absY < 12) {
      playPause();
      showHint(isPlaying ? "pause" : "play");
    }

    pointerRef.current = null;
  };

  const onPointerCancel: PointerEventHandler<HTMLDivElement> = () => {
    pointerRef.current = null;
  };

  const shellClass = useMemo(
    () =>
      `dream-mirror-shell ${isMobile ? "is-mobile" : ""} ${isPlaying ? "is-playing" : ""} ${state === "error" ? "is-error" : ""}`,
    [isMobile, isPlaying, state],
  );

  return (
    <div className="dream-mirror-player w-full max-w-xl">
      <div id={containerId} className="h-0 w-0 overflow-hidden" />

      <div
        className={shellClass}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        style={{ touchAction: "pan-y" }}
      >
        <div className="dream-mirror-backglow" />
        <div className="dream-mirror-ring dream-mirror-ring-outer" />
        <div className="dream-mirror-ring dream-mirror-ring-inner" />

        <div className="dream-mirror-orb">
          <div className="dream-mirror-orb-reflection" />
          <div className="dream-mirror-orb-fracture" />
          <div className="dream-mirror-orb-core">{isPlaying ? "II" : "▶"}</div>
        </div>

        <div className="dream-mirror-gesture dream-mirror-gesture-left">←</div>
        <div className="dream-mirror-gesture dream-mirror-gesture-right">→</div>

        {gestureHint ? <div className="dream-mirror-gesture-hint">{hintLabel(gestureHint)}</div> : null}
      </div>

      <div className="mt-4 space-y-1">
        <p className="text-[10px] tracking-[0.35em] text-cyan-200 uppercase">Miroir Liquide</p>
        <p className="line-clamp-1 text-sm text-white/85">{trackTitle || "L'espace entre les secondes"}</p>
        <p className="text-xs text-white/55">{statusLabel(state)}</p>
      </div>

      {state === "error" ? (
        <button
          type="button"
          onClick={retry}
          className="mt-3 rounded border border-cyan-300/40 bg-cyan-500/15 px-4 py-2 text-[11px] tracking-[0.2em] text-cyan-100 uppercase hover:bg-cyan-500/25"
        >
          Réessayer
        </button>
      ) : null}

      <div className="mt-4 flex items-center gap-2">
        <button
          type="button"
          onClick={previous}
          className="rounded border border-white/20 px-2 py-1 text-[10px] text-white/70 uppercase hover:bg-white/10"
        >
          Prev
        </button>
        <button
          type="button"
          onClick={playPause}
          className="rounded border border-white/20 px-2 py-1 text-[10px] text-white/70 uppercase hover:bg-white/10"
        >
          {isPlaying ? "Pause" : "Play"}
        </button>
        <button
          type="button"
          onClick={next}
          className="rounded border border-white/20 px-2 py-1 text-[10px] text-white/70 uppercase hover:bg-white/10"
        >
          Next
        </button>
      </div>
    </div>
  );
}
