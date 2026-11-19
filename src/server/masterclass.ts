/** Masterclass data shared by the home block and /masterclass: the video (if set) and the FIRST100 offer (if live). */
import "server-only";
import { SITE } from "@/config/site";
import { db } from "@/lib/db";
import { videoEmbed } from "@/lib/video-embed";
import { listProducts } from "@/server/catalog";
import type { Settings } from "@/server/settings";

export async function getMasterclass(settings: Pick<Settings, "masterclassVideoUrl">) {
  const code = SITE.masterclassCoupon.code;
  const [products, coupon] = await Promise.all([listProducts(), db.coupon.findUnique({ where: { code } })]);
  const entry = products.find((p) => p.product.kind === "COURSE_TIER");
  const now = new Date();
  const live =
    !!coupon && coupon.active && !coupon.partnerId && (!coupon.startsAt || coupon.startsAt <= now) && (!coupon.endsAt || coupon.endsAt > now) && (coupon.maxUses == null || coupon.usedCount < coupon.maxUses);
  return {
    video: videoEmbed(settings.masterclassVideoUrl),
    offer: live ? { code, pct: coupon!.kind === "PERCENT" ? coupon!.value / 100 : SITE.masterclassCoupon.percent, left: coupon!.maxUses != null ? coupon!.maxUses - coupon!.usedCount : null } : null,
    checkoutHref: entry ? `/checkout/${entry.product.slug}${live ? `?coupon=${code}` : ""}` : "/#pricing",
  };
}
