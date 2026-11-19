/**
 * Short partner invite link: getudaan.com/j/CODE → /partners?invite=CODE#apply.
 * The proxy then checks the code and remembers it for 30 days (cookie gu_invite);
 * the apply form also keeps it in localStorage and pre-fills "Aapko X ne invite kiya".
 */
import { NextResponse, type NextRequest } from "next/server";
import { normalizeCode } from "@/server/attribution";

export async function GET(req: NextRequest, ctx: RouteContext<"/j/[code]">) {
  const { code } = await ctx.params;
  const clean = normalizeCode(code);
  const to = new URL(clean ? `/partners?invite=${encodeURIComponent(clean)}#apply` : "/partners", req.nextUrl.origin);
  return NextResponse.redirect(to, 307);
}
