// Phone mockup (brief §5.3): 9:16 frame, 36px radius, 10px dark bezel, gold edge glow.
// It ALWAYS shows a real reel. With no video + poster it renders nothing at all — never an empty phone.
import { cn } from "@/lib/cn";
import { ReelPlayer } from "./interactive";

type Props = {
  src?: string | null;
  webmSrc?: string | null;
  poster?: string | null;
  /** What the reel shows, for screen readers */
  label: string;
  /** Degrees; the hero uses -4 */
  tilt?: number;
  float?: boolean;
  className?: string;
};

export function PhoneMockup({ src, webmSrc, poster, label, tilt = 0, float = false, className }: Props) {
  if (!src || !poster) return null;
  return (
    <div className={cn("phone-frame", float && "float-slow", className)} style={{ "--tilt": `${tilt}deg`, transform: float ? undefined : `rotate(${tilt}deg)` } as React.CSSProperties}>
      <div className="h-full overflow-hidden rounded-[26px] bg-surface-sunken">
        <ReelPlayer src={src} webmSrc={webmSrc ?? undefined} poster={poster} label={label} className="h-full rounded-none" />
      </div>
    </div>
  );
}
