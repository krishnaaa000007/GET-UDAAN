// CSV exports for accounting (admin only). /api/admin/export/orders | /api/admin/export/payouts
import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/server/auth";
import { formatIST } from "@/lib/time";

function csv(rows: (string | number | null | undefined)[][]): string {
  const cell = (v: string | number | null | undefined) => {
    const s = v == null ? "" : String(v);
    // Quote, and neutralise spreadsheet formula injection (=, +, -, @)
    const safe = /^[=+\-@]/.test(s) ? `'${s}` : s;
    return `"${safe.replace(/"/g, '""')}"`;
  };
  return "﻿" + rows.map((r) => r.map(cell).join(",")).join("\r\n");
}
const rs = (p: number | null | undefined) => (p == null ? "" : (p / 100).toFixed(2));

export async function GET(req: NextRequest, ctx: RouteContext<"/api/admin/export/[kind]">) {
  const user = await getCurrentUser();
  if (!user?.roles.includes("ADMIN")) return new NextResponse("Forbidden", { status: 403 });
  const { kind } = await ctx.params;
  let body: string;

  if (kind === "orders") {
    const orders = await db.order.findMany({ where: { status: { not: "CREATED" } }, orderBy: { number: "asc" }, include: { items: true, partner: true, coupon: true, commissions: true } });
    body = csv([
      ["Order #", "Paid at (IST)", "Status", "Name", "Email", "Phone", "Items", "Subtotal ₹", "Discount ₹", "Coupon", "GST ₹", "Total ₹", "Gateway fee ₹", "Partner", "Attribution", "Campaign", "Commission ₹", "Commission status", "Payment ID"],
      ...orders.map((o) => [o.number, o.paidAt ? formatIST(o.paidAt) : "", o.status, o.name, o.email, o.phone, o.items.map((i) => i.name).join(" + "), rs(o.subtotalPaise), rs(o.discountPaise), o.coupon?.code, rs(o.taxPaise), rs(o.totalPaise), rs(o.gatewayFeePaise), o.partner?.code, o.attributionSource, o.campaign, rs(o.commissions[0]?.amountPaise), o.commissions[0]?.status, o.gatewayPaymentId]),
    ]);
  } else if (kind === "payouts") {
    const month = req.nextUrl.searchParams.get("month"); // YYYY-MM (IST)
    const range = month ? { gte: new Date(`${month}-01T00:00:00+05:30`), lt: new Date(new Date(`${month}-01T00:00:00+05:30`).setMonth(new Date(`${month}-01T00:00:00+05:30`).getMonth() + 1)) } : undefined;
    const payouts = await db.payout.findMany({ where: range ? { requestedAt: range } : {}, orderBy: { requestedAt: "asc" }, include: { partner: true } });
    body = csv([
      ["Requested (IST)", "Partner", "Instagram", "Status", "Gross ₹", "TDS %", "TDS ₹", "Net ₹", "Method", "UPI / Account", "IFSC", "Reference (UTR)", "Paid at (IST)"],
      ...payouts.map((p) => {
        const m = p.method as { type: string; upiId?: string; account?: string; ifsc?: string };
        return [formatIST(p.requestedAt), p.partner.displayName, p.partner.instagramHandle, p.status, rs(p.grossPaise), (p.tdsBps / 100).toFixed(2), rs(p.tdsPaise), rs(p.netPaise), m.type, m.upiId ?? m.account, m.ifsc, p.reference, p.paidAt ? formatIST(p.paidAt) : ""];
      }),
    ]);
  } else return new NextResponse("Not found", { status: 404 });

  return new NextResponse(body, {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="reelbhai-${kind}-${new Date().toISOString().slice(0, 10)}.csv"`, "Cache-Control": "no-store" },
  });
}
