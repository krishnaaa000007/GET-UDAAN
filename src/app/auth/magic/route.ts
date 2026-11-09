// Magic login link from the purchase email: /auth/magic?token=...&next=/dashboard
import { NextResponse, type NextRequest } from "next/server";
import { consumeMagicLink } from "@/server/auth";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token") ?? "";
  const nextRaw = req.nextUrl.searchParams.get("next") ?? "/dashboard";
  const next = nextRaw.startsWith("/") && !nextRaw.startsWith("//") ? nextRaw : "/dashboard";
  const userId = token ? await consumeMagicLink(token) : null;
  return NextResponse.redirect(new URL(userId ? next : "/login?reason=expired", req.url));
}
