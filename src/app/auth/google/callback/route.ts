/**
 * /auth/google/callback?code=&state= — Google sends the user back here after they tap Continue.
 * On success we log the person in and send them on. If they have no phone yet, we route through
 * /auth/complete first so partners/payouts/alerts have the number.
 */
import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/server/auth";
import { handleCallback } from "@/server/google-oauth";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  // Google adds ?error=... when the user cancels on their side.
  const googleError = req.nextUrl.searchParams.get("error");
  if (googleError) return NextResponse.redirect(new URL("/login?reason=google_cancelled", req.url));

  const r = await handleCallback(code, state);
  if (!r.ok) return NextResponse.redirect(new URL(`/login?reason=google_failed`, req.url));

  const u = await getCurrentUser();
  if (!u) return NextResponse.redirect(new URL("/login?reason=google_failed", req.url));
  const row = await db.user.findUniqueOrThrow({ where: { id: u.id }, select: { phone: true } });
  if (!row.phone) return NextResponse.redirect(new URL(`/auth/complete?next=${encodeURIComponent(r.next)}`, req.url));
  return NextResponse.redirect(new URL(r.next, req.url));
}
