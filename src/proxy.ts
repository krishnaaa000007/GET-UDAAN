/**
 * Runs before every page request (Next.js 16 "proxy", formerly middleware).
 *  1. Gives each browser an anonymous visitor id (rb_vid) for funnel tracking.
 *  2. Captures partner referrals: /?ref=CODE&c=reel23 → records the click and sets
 *     the last-click cookie (rb_ref). Unknown/unapproved codes are ignored, so they
 *     can't overwrite a real partner's cookie.
 *  3. Saves UTM tags with the visitor; remembers ?coupon=CODE for checkout prefill.
 */
import { NextResponse, type NextFetchEvent, type NextRequest } from "next/server";
import { encodeRefCookie, normalizeCode } from "@/server/attribution";
import { recordClick } from "@/server/clicks";
import { db } from "@/lib/db";

const YEAR = 365 * 86_400;
const REF_COOKIE_DAYS = 90; // cookie lives long; the admin "attribution window" is enforced at checkout

export async function proxy(req: NextRequest, event: NextFetchEvent) {
  const url = req.nextUrl;
  const res = NextResponse.next();
  const secure = process.env.NODE_ENV === "production";

  let vid = req.cookies.get("rb_vid")?.value;
  const isNewVisitor = !vid;
  if (!vid) {
    vid = crypto.randomUUID();
    res.cookies.set("rb_vid", vid, { maxAge: YEAR, httpOnly: true, sameSite: "lax", secure, path: "/" });
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  const code = normalizeCode(url.searchParams.get("ref"));
  if (code) {
    const clickId = crypto.randomUUID().replace(/-/g, "");
    const campaign = (url.searchParams.get("c") ?? "").replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 40) || null;
    try {
      const partnerId = await recordClick({ code, clickId, campaign, landingPath: url.pathname, visitorId: vid, ip, userAgent: req.headers.get("user-agent") });
      if (partnerId) {
        res.cookies.set("rb_ref", encodeRefCookie({ code, clickId, at: new Date(), campaign }), { maxAge: REF_COOKIE_DAYS * 86_400, httpOnly: true, sameSite: "lax", secure, path: "/" });
      }
    } catch (e) {
      console.error("click tracking failed", e);
    }
  }

  const coupon = normalizeCode(url.searchParams.get("coupon"));
  if (coupon) res.cookies.set("rb_coupon", coupon, { maxAge: 30 * 86_400, sameSite: "lax", secure, path: "/" });

  if (isNewVisitor || url.searchParams.has("utm_source")) {
    const p = url.searchParams;
    const visitorId = vid;
    event.waitUntil(
      db.visitor
        .upsert({
          where: { id: visitorId },
          create: {
            id: visitorId,
            landingPath: url.pathname.slice(0, 200),
            referrer: req.headers.get("referer")?.slice(0, 300) ?? null,
            utmSource: p.get("utm_source")?.slice(0, 100),
            utmMedium: p.get("utm_medium")?.slice(0, 100),
            utmCampaign: p.get("utm_campaign")?.slice(0, 100),
            utmContent: p.get("utm_content")?.slice(0, 100),
            utmTerm: p.get("utm_term")?.slice(0, 100),
          },
          update: p.has("utm_source")
            ? { utmSource: p.get("utm_source")?.slice(0, 100), utmMedium: p.get("utm_medium")?.slice(0, 100), utmCampaign: p.get("utm_campaign")?.slice(0, 100) }
            : {},
        })
        .catch((e) => console.error("visitor upsert failed", e)),
    );
  }
  return res;
}

export const config = {
  // Pages only — skip API, Next internals and static files.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|webp|avif|mp4|webm|txt|xml|ico)$).*)"],
};
