// Download a course file: checks enrolment + tier, then redirects to a 10-minute signed URL.
import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/server/auth";
import { getAssetDownloadUrl } from "@/server/learning";

export async function GET(req: NextRequest, ctx: RouteContext<"/api/assets/[id]">) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.redirect(new URL("/login?next=/dashboard", req.url));
  const { id } = await ctx.params;
  const url = await getAssetDownloadUrl(id, user.id);
  if (!url) return new NextResponse("Not allowed", { status: 403 });
  return NextResponse.redirect(new URL(url, req.url));
}
