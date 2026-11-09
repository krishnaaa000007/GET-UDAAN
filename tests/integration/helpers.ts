import { db } from "@/lib/db";
import { signWebhook } from "@/server/payments/gateway";
import { handleRazorpayWebhook } from "@/server/payments/fulfil";

export async function resetDb() {
  const tables = await db.$queryRaw<{ tablename: string }[]>`SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename <> '_prisma_migrations'`;
  await db.$executeRawUnsafe(`TRUNCATE ${tables.map((t) => `"${t.tablename}"`).join(", ")} RESTART IDENTITY CASCADE`);
}

export const SECRET = "test-webhook-secret";

export async function sendWebhook(event: string, payload: object, eventId = `evt_${Math.random().toString(36).slice(2)}`, secret = SECRET) {
  const body = JSON.stringify({ entity: "event", event, payload });
  return handleRazorpayWebhook(body, signWebhook(body, secret), eventId, SECRET);
}

export async function makeCatalog() {
  const course = await db.course.create({ data: { slug: "c1", title: "Course", published: true } });
  const mod = await db.module.create({ data: { courseId: course.id, title: "M1", position: 1 } });
  await db.lesson.create({ data: { moduleId: mod.id, title: "L1", position: 1, durationSec: 100 } });
  const basic = await db.product.create({ data: { slug: "basic", name: "Basic", kind: "COURSE_TIER", tier: "BASIC", courseId: course.id, defaultCommissionBps: 5000, prices: { create: { amountPaise: 49900 } } } });
  const pro = await db.product.create({ data: { slug: "pro", name: "Pro", kind: "COURSE_TIER", tier: "PRO", courseId: course.id, defaultCommissionBps: 5000, prices: { create: { amountPaise: 199900 } } } });
  return { course, basic, pro };
}

export async function makePartner(code: string, email: string) {
  const user = await db.user.create({ data: { email, name: code } });
  return db.partner.create({ data: { userId: user.id, status: "APPROVED", code, displayName: code, instagramHandle: code.toLowerCase(), phone: "9999999999", upiId: `${code.toLowerCase()}@upi` } });
}

export async function makeOrder(p: { productId: string; price: number; email: string; partnerId?: string; gatewayOrderId: string }) {
  return db.order.create({
    data: {
      email: p.email,
      phone: "9876543210",
      name: "Buyer",
      subtotalPaise: p.price,
      totalPaise: p.price,
      partnerId: p.partnerId ?? null,
      attributionSource: p.partnerId ? "COOKIE" : "NONE",
      gatewayOrderId: p.gatewayOrderId,
      items: { create: [{ productId: p.productId, name: "Basic", unitPaise: p.price }] },
    },
  });
}

export const payment = (orderId: string, amount: number, id = `pay_${Math.random().toString(36).slice(2)}`, fee = 1178) => ({
  payment: { entity: { id, order_id: orderId, amount, fee, tax: 180, status: "captured" } },
});
