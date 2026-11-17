// Tells the partner banner which REAL coupon this visitor will get at checkout (or nothing).
// Same rule as the checkout page: an explicit ?coupon= first, else the referring partner's coupon.
import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { formatINR } from "@/lib/money";
import { decodeRefCookie, normalizeCode } from "@/server/attribution";
import { listProducts } from "@/server/catalog";
import { evaluateCoupon } from "@/server/pricing";

export const dynamic = "force-dynamic";

const none = () => new NextResponse(null, { status: 204, headers: { "Cache-Control": "no-store" } });

export async function GET(req: NextRequest) {
  const code = normalizeCode(req.cookies.get("rb_coupon")?.value);
  let coupon = code ? await db.coupon.findUnique({ where: { code }, include: { partner: { select: { status: true, instagramHandle: true } } } }) : null;

  if (!coupon) {
    const ref = decodeRefCookie(req.cookies.get("rb_ref")?.value);
    if (!ref) return none();
    const partner = await db.partner.findUnique({ where: { code: ref.code }, select: { status: true, instagramHandle: true, coupons: { where: { active: true }, take: 1 } } });
    if (partner?.status !== "APPROVED" || !partner.coupons[0]) return none();
    coupon = { ...partner.coupons[0], partner: { status: partner.status, instagramHandle: partner.instagramHandle } };
  }

  // Discount is worked out on the entry course price — the same price the landing page shows.
  const entry = (await listProducts()).find((p) => p.product.kind !== "ADDON");
  if (!entry) return none();
  const check = evaluateCoupon(coupon, entry.product.slug, entry.price.amountPaise);
  if (!check.ok || check.discountPaise <= 0) return none();

  const handle = coupon.partner?.status === "APPROVED" ? coupon.partner.instagramHandle.replace(/^@/, "") : null;
  return NextResponse.json({ handle, code: coupon.code, off: formatINR(check.discountPaise) }, { headers: { "Cache-Control": "no-store" } });
}
