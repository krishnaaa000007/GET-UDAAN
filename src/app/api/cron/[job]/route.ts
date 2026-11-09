/**
 * Scheduled jobs. Call every 5–15 min from Supabase pg_cron (free) or cron-job.org:
 *   POST https://yourdomain.com/api/cron/run   with header  Authorization: Bearer <CRON_SECRET>
 * Phase 1: approve matured commissions + mark abandoned checkouts. Phase 2 adds message sequences.
 */
import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { safeEqual } from "@/lib/crypto";
import { approveDueCommissions } from "@/server/partners";

export async function POST(req: NextRequest, ctx: RouteContext<"/api/cron/[job]">) {
  const auth = req.headers.get("authorization") ?? "";
  const secret = process.env.CRON_SECRET ?? "";
  if (!secret || !safeEqual(auth, `Bearer ${secret}`)) return new NextResponse("Unauthorized", { status: 401 });
  const { job } = await ctx.params;
  if (job !== "run") return new NextResponse("Unknown job", { status: 404 });

  const approved = await approveDueCommissions();
  const abandoned = await db.checkout.updateMany({ where: { status: "OPEN", updatedAt: { lt: new Date(Date.now() - 30 * 60_000) } }, data: { status: "ABANDONED" } });
  await db.rateLimit.deleteMany({ where: { windowStart: { lt: new Date(Date.now() - 86_400_000) } } });
  return NextResponse.json({ approvedCommissions: approved, markedAbandoned: abandoned.count });
}
