"use client";

/**
 * Masterclass player: a YouTube privacy-mode iframe, or a plain <video> for a file on Cloudflare R2.
 *  - No download button (controlsList="nodownload") and no right-click "Save video as" menu.
 *    This only removes the easy ways; a file that plays in a browser can always be fetched by someone
 *    determined. That is fine for a free masterclass.
 *  - `#t=0.1` makes phones (iOS Safari) show the first frame instead of a black box; preload="metadata"
 *    keeps the page light, so the video only downloads when someone presses play.
 */
import { cn } from "@/lib/cn";
import type { VideoEmbed } from "@/lib/video-embed";

export function MasterclassVideo({ video, title, className }: { video: VideoEmbed; title: string; className?: string }) {
  return (
    <div className={cn("aspect-video w-full overflow-hidden rounded-lg border border-line bg-surface-sunken", className)}>
      {video.kind === "youtube" ? (
        <iframe src={video.src} title={title} className="size-full" allow="accelerometer; encrypted-media; gyroscope; picture-in-picture" allowFullScreen loading="lazy" />
      ) : (
        <video
          src={`${video.src}#t=0.1`}
          controls
          playsInline
          preload="metadata"
          controlsList="nodownload"
          onContextMenu={(e) => e.preventDefault()}
          aria-label={title}
          className="size-full bg-black object-contain"
          data-cta="masterclass_video"
        />
      )}
    </div>
  );
}
