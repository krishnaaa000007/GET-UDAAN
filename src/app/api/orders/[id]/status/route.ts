// Thank-you page polls this while waiting for the webhook. Returns status only (no personal data).
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(_: Request, ctx: RouteContext<"/api/orders/[id]/status">) {
  const { id } = await ctx.params;
  const o = await db.order.findUnique({ where: { id }, select: { status: true } });
  return NextResponse.json({ status: o?.status ?? "UNKNOWN" }, { headers: { "Cache-Control": "no-store" } });
}
