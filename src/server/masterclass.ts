/** Masterclass data shared by the home block and /masterclass: the video (if set) and the FIRST100 offer (if live). */
import "server-only";
import { SITE } from "@/config/site";
import { db } from "@/lib/db";
import { parseQualities, videoEmbed, type VideoEmbed } from "@/lib/video-embed";
import { listProducts } from "@/server/catalog";
import type { Settings } from "@/server/settings";

export async function getMasterclass(settings: Pick<Settings, "masterclassVideoUrl" | "masterclassVideoQualities">) {
  const code = SITE.masterclassCoupon.code;
  const [products, coupon] = await Promise.all([listProducts(), db.coupon.findUnique({ where: { code } })]);
  const entry = products.find((p) => p.product.kind === "COURSE_TIER");
  const now = new Date();
  const live =
    !!coupon && coupon.active && !coupon.partnerId && (!coupon.startsAt || coupon.startsAt <= now) && (!coupon.endsAt || coupon.endsAt > now) && (coupon.maxUses == null || coupon.usedCount < coupon.maxUses);
  return {
    video: withQualities(videoEmbed(settings.masterclassVideoUrl), settings.masterclassVideoQualities),
    offer: live ? { code, pct: coupon!.kind === "PERCENT" ? coupon!.value / 100 : SITE.masterclassCoupon.percent, left: coupon!.maxUses != null ? coupon!.maxUses - coupon!.usedCount : null } : null,
    checkoutHref: entry ? `/checkout/${entry.product.slug}${live ? `?coupon=${code}` : ""}` : "/#pricing",
  };
}

/** For an .mp4 masterclass: main file = "HD", plus any smaller versions from Settings → masterclassVideoQualities. */
function withQualities(video: VideoEmbed | null, extra: string): VideoEmbed | null {
  if (!video || video.kind !== "file") return video;
  const more = parseQualities(extra).filter((q) => q.src !== video.src);
  return more.length ? { ...video, qualities: [{ label: "HD", src: video.src }, ...more] } : video;
}
