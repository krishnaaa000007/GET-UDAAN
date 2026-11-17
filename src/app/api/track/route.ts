// Receives client funnel events (page_view, cta_click, …). Whitelisted names only, rate-limited.
import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { hashIp } from "@/lib/crypto";
import { rateLimit } from "@/server/rate-limit";
import { decodeRefCookie } from "@/server/attribution";

const ALLOWED = new Set(["page_view", "cta_click", "checkout_view", "lesson_started", "upsell_view", "upsell_click", "share_click", "lead_optin"]);

export async function POST(req: NextRequest) {
  let data: { name?: string; path?: string; props?: Record<string, unknown> };
  try {
    data = await req.json();
  } catch {
    return new NextResponse(null, { status: 204 });
  }
  if (!data.name || !ALLOWED.has(data.name)) return new NextResponse(null, { status: 204 });
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  const rl = await rateLimit(`track:${hashIp(ip) ?? "anon"}`, 120, 60);
  if (!rl.ok) return new NextResponse(null, { status: 204 });

  const ref = decodeRefCookie(req.cookies.get("rb_ref")?.value);
  const partner = ref ? await db.partner.findUnique({ where: { code: ref.code }, select: { id: true } }) : null;
  const propsJson = JSON.stringify(data.props ?? {});
  await db.funnelEvent.create({
    data: {
      name: data.name,
      visitorId: req.cookies.get("rb_vid")?.value ?? null,
      partnerId: partner?.id ?? null,
      campaign: ref?.campaign ?? null,
      path: String(data.path ?? "").slice(0, 200),
      props: propsJson.length < 2000 ? (data.props as never) : undefined,
    },
  });
  return new NextResponse(null, { status: 204 });
}
