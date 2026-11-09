"use client";

/**
 * Protected lesson player.
 *  - HLS streaming only (Mux signed tokens, 4h expiry) — no MP4 is ever exposed.
 *  - Moving watermark with the student's masked phone/email, repositioned every ~12s.
 *    Our own fullscreen button fullscreens the WRAPPER, so the watermark stays visible in fullscreen.
 *  - Right-click disabled; Mux Player has no download button.
 *  - Saves position every 15s, on pause and on leave → resumes where the student stopped.
 */
import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import { track } from "@/lib/track";

const MuxPlayer = dynamic(() => import("@mux/mux-player-react"), { ssr: false, loading: () => <div className="grid h-full place-items-center text-muted">Loading…</div> });

type Source =
  | { provider: "mux"; playbackId: string; tokens: { playback?: string; thumbnail?: string; storyboard?: string } }
  | { provider: "hls" | "demo"; src: string };

const SPOTS = [
  { top: "8%", left: "6%" },
  { top: "12%", left: "58%" },
  { top: "44%", left: "30%" },
  { top: "70%", left: "8%" },
  { top: "66%", left: "55%" },
  { top: "28%", left: "70%" },
];

export function ProtectedPlayer({
  lessonId,
  source,
  watermark,
  startAt,
  title,
  viewerId,
  saveProgress = true,
  onComplete,
}: {
  lessonId: string;
  source: Source;
  watermark: string;
  startAt: number;
  title: string;
  viewerId: string;
  saveProgress?: boolean;
  onComplete?: () => void;
}) {
  const wrap = useRef<HTMLDivElement>(null);
  const lastSaved = useRef(0);
  const pos = useRef({ t: startAt, d: 0 });
  const [spot, setSpot] = useState(0);
  const completed = useRef(false);

  // Move the watermark every 10–15 seconds.
  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    const move = () => {
      setSpot((s) => (s + 1 + Math.floor(Math.random() * (SPOTS.length - 1))) % SPOTS.length);
      t = setTimeout(move, 10_000 + Math.random() * 5_000);
    };
    t = setTimeout(move, 12_000);
    return () => clearTimeout(t);
  }, []);

  const save = useCallback(
    (force = false) => {
      if (!saveProgress) return;
      const { t, d } = pos.current;
      if (!force && Math.abs(t - lastSaved.current) < 15) return;
      lastSaved.current = t;
      const body = JSON.stringify({ lessonId, position: Math.floor(t), duration: Math.floor(d) });
      if (force && navigator.sendBeacon) navigator.sendBeacon("/api/progress", new Blob([body], { type: "application/json" }));
      else
        void fetch("/api/progress", { method: "POST", body, headers: { "Content-Type": "application/json" }, keepalive: true })
          .then((r) => r.json())
          .then((r) => {
            if (r?.newlyCompleted && !completed.current) {
              completed.current = true;
              onComplete?.();
            }
          })
          .catch(() => {});
    },
    [lessonId, saveProgress, onComplete],
  );

  useEffect(() => {
    const onHide = () => document.visibilityState === "hidden" && save(true);
    document.addEventListener("visibilitychange", onHide);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      save(true);
    };
  }, [save]);

  const toggleFullscreen = () => {
    const el = wrap.current;
    if (!el) return;
    if (document.fullscreenElement) void document.exitFullscreen();
    else {
      void el.requestFullscreen?.().then(() => {
        // Lock to landscape on phones when possible.
        const o = screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> };
        o.lock?.("landscape").catch(() => {});
      });
    }
  };

  const common = {
    streamType: "on-demand" as const,
    startTime: startAt || undefined,
    accentColor: "#ffb627",
    metadata: { video_id: lessonId, video_title: title, viewer_user_id: viewerId },
    style: { width: "100%", height: "100%", "--fullscreen-button": "none", "--pip-button": "none", "--cast-button": "none" } as React.CSSProperties & Record<`--${string}`, string>,
    onTimeUpdate: (e: Event) => {
      const v = e.target as HTMLMediaElement;
      pos.current = { t: v.currentTime, d: v.duration || 0 };
      save();
    },
    onPause: () => save(true),
    onEnded: () => save(true),
    onPlay: () => track("lesson_started", { lessonId }),
  };

  return (
    <div
      ref={wrap}
      className="relative aspect-video w-full overflow-hidden rounded-2xl bg-black select-none [&:fullscreen]:rounded-none"
      onContextMenu={(e) => e.preventDefault()}
    >
      {source.provider === "mux" ? (
        <MuxPlayer playbackId={source.playbackId} tokens={source.tokens} {...common} />
      ) : (
        <MuxPlayer src={source.src} {...common} />
      )}

      {/* Watermark — pointer-events none so it never blocks the controls */}
      <div
        aria-hidden
        className="pointer-events-none absolute z-10 rounded px-1.5 py-0.5 text-[11px] font-semibold tracking-wider text-white/35 transition-all duration-[1500ms] sm:text-sm"
        style={{ ...SPOTS[spot], textShadow: "0 0 2px rgba(0,0,0,.6)" }}
      >
        {watermark}
      </div>

      <button
        type="button"
        onClick={toggleFullscreen}
        className="absolute top-2 right-2 z-20 rounded-lg bg-black/50 px-2 py-1 text-xs text-white backdrop-blur hover:bg-black/70"
        aria-label="Fullscreen"
      >
        ⛶
      </button>
    </div>
  );
}
