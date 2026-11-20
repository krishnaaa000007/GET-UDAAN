/**
 * /auth/google/start?next=/foo → redirect to Google's consent screen.
 * Only works when GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET are set; otherwise send the person back to
 * the normal login page so they aren't stuck on a blank error.
 */
import { NextResponse, type NextRequest } from "next/server";
import { buildAuthUrl, googleEnabled } from "@/server/google-oauth";

export async function GET(req: NextRequest) {
  const nextRaw = req.nextUrl.searchParams.get("next") ?? "/dashboard";
  const next = nextRaw.startsWith("/") && !nextRaw.startsWith("//") ? nextRaw : "/dashboard";
  if (!googleEnabled()) return NextResponse.redirect(new URL(`/login?next=${encodeURIComponent(next)}`, req.url));
  const url = await buildAuthUrl(next);
  return NextResponse.redirect(url);
}
