"use client";

/**
 * Masterclass player for a plain .mp4 (Cloudflare R2), with our own controls:
 *  - ⟲ 10s / 10s ⟳ buttons, plus double-tap on the left / right half of the video (phones) and ← / → keys.
 *  - Quality menu when smaller versions exist (Settings → masterclassVideoQualities). Switching keeps the
 *    position and play state. With only one file there is no menu (nothing to switch to).
 *  - Play / pause, seek bar, time, mute, fullscreen. Controls fade out while playing and come back on touch/move.
 *  - No download button and no right-click "Save video as" (same as before).
 *  - `#t=0.1` shows the first frame on iOS instead of a black box; preload="metadata" keeps the page light.
 */
import { Check, Maximize, Minimize, Pause, Play, RotateCcw, RotateCw, Settings2, Volume2, VolumeX } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import type { VideoQuality } from "@/lib/video-embed";

const SKIP = 10;

const fmt = (s: number) => {
  if (!Number.isFinite(s) || s < 0) s = 0;
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${String(sec).padStart(2, "0")}`;
};

export function MasterclassPlayer({ src, qualities, title, className }: { src: string; qualities?: VideoQuality[]; title: string; className?: string }) {
  const box = useRef<HTMLDivElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const lastTap = useRef<{ t: number; side: "left" | "right" } | null>(null);
  const resumeAt = useRef<{ time: number; play: boolean } | null>(null);

  const list = qualities && qualities.length > 1 ? qualities : null;
  const [current, setCurrent] = useState(list?.[0]?.src ?? src);
  const [playing, setPlaying] = useState(false);
  const [started, setStarted] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [muted, setMuted] = useState(false);
  const [full, setFull] = useState(false);
  const [showUi, setShowUi] = useState(true);
  const [menu, setMenu] = useState(false);
  const [flash, setFlash] = useState<{ side: "left" | "right"; key: number } | null>(null);

  const poke = useCallback(() => {
    setShowUi(true);
    clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => {
      if (!video.current?.paused) setShowUi(false);
    }, 2800);
  }, []);

  useEffect(() => () => clearTimeout(hideTimer.current), []);
  // The video may load its length before React is ready to listen, so read it once on mount too.
  useEffect(() => {
    const v = video.current;
    if (v && Number.isFinite(v.duration)) setDuration(v.duration);
  }, []);
  useEffect(() => {
    const onFs = () => setFull(document.fullscreenElement === box.current);
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  const toggle = () => {
    const v = video.current;
    if (!v) return;
    if (v.paused) void v.play().catch(() => {});
    else v.pause();
    poke();
  };

  const skip = (by: number) => {
    const v = video.current;
    if (!v) return;
    v.currentTime = Math.max(0, Math.min((v.duration || 0) - 0.5, v.currentTime + by));
    setTime(v.currentTime);
    setFlash({ side: by < 0 ? "left" : "right", key: Date.now() });
    poke();
  };

  const toggleFull = () => {
    const el = box.current;
    if (!el) return;
    if (document.fullscreenElement) void document.exitFullscreen();
    else if (el.requestFullscreen) void el.requestFullscreen();
    else (video.current as HTMLVideoElement & { webkitEnterFullscreen?: () => void })?.webkitEnterFullscreen?.(); // iPhone
  };

  const pickQuality = (q: VideoQuality) => {
    const v = video.current;
    setMenu(false);
    if (!v || q.src === current) return;
    resumeAt.current = { time: v.currentTime, play: !v.paused };
    setCurrent(q.src);
  };

  /** Tap on the video: phones get double-tap-to-skip on each half; a single tap shows the controls / plays. */
  const onSurfaceTap = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === "mouse") return toggle();
    const rect = e.currentTarget.getBoundingClientRect();
    const side = e.clientX - rect.left < rect.width / 2 ? "left" : "right";
    const now = Date.now();
    if (lastTap.current && now - lastTap.current.t < 300 && lastTap.current.side === side) {
      lastTap.current = null;
      skip(side === "left" ? -SKIP : SKIP);
      return;
    }
    lastTap.current = { t: now, side };
    if (!started) return toggle();
    if (!showUi) return poke();
    setTimeout(() => {
      if (lastTap.current && lastTap.current.t === now) toggle();
    }, 280);
  };

  const onKey = (e: React.KeyboardEvent) => {
    if ((e.target as HTMLElement).tagName === "INPUT") return;
    const actions: Record<string, () => void> = { ArrowLeft: () => skip(-SKIP), ArrowRight: () => skip(SKIP), " ": toggle, k: toggle };
    const run = actions[e.key];
    if (!run) return;
    e.preventDefault();
    run();
  };

  const label = list?.find((q) => q.src === current)?.label;
  const pct = duration ? (time / duration) * 100 : 0;
  const btn = "grid size-10 flex-none place-items-center rounded-pill text-white transition-colors hover:bg-white/15 focus-visible:outline-2 focus-visible:outline-gold sm:size-11";

  return (
    <div
      ref={box}
      onKeyDown={onKey}
      onMouseMove={poke}
      onContextMenu={(e) => e.preventDefault()}
      className={cn("group/player relative aspect-video w-full overflow-hidden bg-black select-none", full && "aspect-auto h-full", className)}
      data-cta="masterclass_video"
    >
      <video
        ref={video}
        src={`${current}#t=0.1`}
        playsInline
        preload="metadata"
        controlsList="nodownload"
        disablePictureInPicture
        aria-label={title}
        className="size-full object-contain"
        onPlay={() => {
          setPlaying(true);
          setStarted(true);
          poke();
        }}
        onPause={() => {
          setPlaying(false);
          setShowUi(true);
        }}
        onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => {
          const v = e.currentTarget;
          setDuration(v.duration);
          const r = resumeAt.current;
          if (r) {
            v.currentTime = r.time;
            if (r.play) void v.play().catch(() => {});
            resumeAt.current = null;
          }
        }}
        onDurationChange={(e) => setDuration(e.currentTarget.duration)}
        onVolumeChange={(e) => setMuted(e.currentTarget.muted)}
      />

      {/* Tap / click surface (sits under the control bar). */}
      <div className="absolute inset-0" onPointerUp={onSurfaceTap} aria-hidden />

      {/* "−10s / +10s" bubble after a skip. */}
      {flash && (
        <span
          key={flash.key}
          aria-hidden
          className={cn(
            "pointer-events-none absolute top-1/2 flex -translate-y-1/2 items-center gap-1.5 rounded-pill bg-black/60 px-4 py-2 text-sm font-bold text-white animate-[skip-flash_900ms_ease-out_forwards]",
            flash.side === "left" ? "left-[12%]" : "right-[12%]",
          )}
        >
          {flash.side === "left" ? <RotateCcw className="size-4" /> : <RotateCw className="size-4" />}
          {flash.side === "left" ? `−${SKIP}s` : `+${SKIP}s`}
        </span>
      )}

      {/* Big centre buttons: ⟲10  ▶  10⟳ */}
      <div className={cn("pointer-events-none absolute inset-0 flex items-center justify-center gap-6 transition-opacity duration-200 sm:gap-10", showUi || !playing ? "opacity-100" : "opacity-0")}>
        {started && (
          <button type="button" onClick={() => skip(-SKIP)} aria-label={`${SKIP} second peeche`} className="pointer-events-auto relative grid size-12 place-items-center rounded-pill bg-black/45 text-white hover:bg-black/65 sm:size-14">
            <RotateCcw className="size-7" />
            <span className="absolute text-[10px] font-bold">{SKIP}</span>
          </button>
        )}
        <button
          type="button"
          onClick={toggle}
          aria-label={playing ? "Pause" : "Play"}
          className="pointer-events-auto grid size-16 place-items-center rounded-pill bg-gold text-on-gold shadow-glow-gold transition-transform hover:scale-105 sm:size-20"
        >
          {playing ? <Pause className="size-8" fill="currentColor" /> : <Play className="size-8 translate-x-0.5" fill="currentColor" />}
        </button>
        {started && (
          <button type="button" onClick={() => skip(SKIP)} aria-label={`${SKIP} second aage`} className="pointer-events-auto relative grid size-12 place-items-center rounded-pill bg-black/45 text-white hover:bg-black/65 sm:size-14">
            <RotateCw className="size-7" />
            <span className="absolute text-[10px] font-bold">{SKIP}</span>
          </button>
        )}
      </div>

      {/* Bottom control bar */}
      <div
        className={cn(
          "absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent px-2 pt-10 pb-1.5 transition-opacity duration-200 sm:px-3 sm:pb-2",
          showUi || !playing ? "opacity-100" : "pointer-events-none opacity-0",
          !started && "opacity-0",
        )}
      >
        <input
          type="range"
          min={0}
          max={duration || 0}
          step={0.1}
          value={time}
          onChange={(e) => {
            const v = video.current;
            if (v) v.currentTime = Number(e.target.value);
            setTime(Number(e.target.value));
            poke();
          }}
          aria-label="Video position"
          className="block h-1.5 w-full cursor-pointer appearance-none rounded-pill accent-gold"
          style={{ background: `linear-gradient(to right, var(--gold) ${pct}%, rgba(255,255,255,.3) ${pct}%)` }}
        />
        <div className="mt-1 flex items-center gap-0.5 sm:gap-1">
          <button type="button" onClick={toggle} aria-label={playing ? "Pause" : "Play"} className={btn}>
            {playing ? <Pause className="size-5" fill="currentColor" /> : <Play className="size-5" fill="currentColor" />}
          </button>
          <button type="button" onClick={() => skip(-SKIP)} aria-label={`${SKIP} second peeche`} className={cn(btn, "relative max-sm:hidden")}>
            <RotateCcw className="size-5" />
            <span className="absolute text-[8px] font-bold">{SKIP}</span>
          </button>
          <button type="button" onClick={() => skip(SKIP)} aria-label={`${SKIP} second aage`} className={cn(btn, "relative max-sm:hidden")}>
            <RotateCw className="size-5" />
            <span className="absolute text-[8px] font-bold">{SKIP}</span>
          </button>
          <button type="button" onClick={() => video.current && (video.current.muted = !video.current.muted)} aria-label={muted ? "Unmute" : "Mute"} className={btn}>
            {muted ? <VolumeX className="size-5" /> : <Volume2 className="size-5" />}
          </button>
          <span className="ml-1 text-xs font-medium whitespace-nowrap text-white tabular-nums sm:text-sm">
            {fmt(time)} / {fmt(duration)}
          </span>
          <span className="flex-1" />
          {list && (
            <div className="relative">
              <button type="button" onClick={() => setMenu((m) => !m)} aria-haspopup="menu" aria-expanded={menu} aria-label="Video quality" className={cn(btn, "flex w-auto gap-1.5 px-2.5")}>
                <Settings2 className="size-5" />
                <span className="text-xs font-bold whitespace-nowrap">{label}</span>
              </button>
              {menu && (
                <ul role="menu" className="absolute right-0 bottom-12 min-w-36 overflow-hidden rounded-md border border-white/15 bg-black/90 py-1 text-sm text-white shadow-lift">
                  <li className="px-3 py-1.5 text-xs text-white/60">Quality</li>
                  {list.map((q) => (
                    <li key={q.src}>
                      <button type="button" role="menuitemradio" aria-checked={q.src === current} onClick={() => pickQuality(q)} className="flex w-full items-center justify-between gap-4 px-3 py-2 text-left hover:bg-white/10">
                        {q.label}
                        {q.src === current && <Check className="size-4 text-gold" />}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
          <button type="button" onClick={toggleFull} aria-label={full ? "Exit fullscreen" : "Fullscreen"} className={btn}>
            {full ? <Minimize className="size-5" /> : <Maximize className="size-5" />}
          </button>
        </div>
      </div>
    </div>
  );
}
