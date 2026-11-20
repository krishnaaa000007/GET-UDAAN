/**
 * DEMO DATA — so every dashboard has something to show.
 *   npm run db:seed        (safe to re-run: it wipes and recreates demo data)
 *
 * Creates: admin (ADMIN_EMAIL), 1 course (7 modules / 40 lessons), Basic/Pro/Done-with-you
 * tiers + an order-bump add-on, 2 partners (1 approved with sales, 1 pending),
 * leads, paid/refunded orders with commissions in every state, and an abandoned cart.
 *
 * NOTE: demo orders/students are clearly fake (@example.com). Never seed fake
 * testimonials — the landing page only shows real ones you add in Admin.
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { computeOrderCommission } from "../src/server/commission";

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });
const DAY = 86_400_000;
const ago = (days: number) => new Date(Date.now() - days * DAY);

const CURRICULUM: { title: string; minTier?: "BASIC" | "PRO"; lessons: string[]; upsellAfterLast?: string }[] = [
  { title: "Shuruaat: Viral AI Reels ka game", lessons: ["Welcome! Course kaise use karein", "AI animal gangster reels kyun viral hoti hain", "Free tools ki list (sab phone pe)", "Apna niche aur character chuno", "Pehli reel ka plan — 10 minute mein"] },
  { title: "Character design: Apna 'Bhai' banao", lessons: ["Character ka look: face, outfit, attitude", "Image prompts — basics se pro tak", "Ek hi character har image mein same kaise rakhein", "Side characters aur villain", "Background aur mood (mafia, city, jungle)", "Thumbnail-worthy poses"] },
  { title: "Story likhna: Hook se climax tak", lessons: ["3-second hook formula", "Mafia/action story templates", "Dialogue likhna (Hinglish punchlines)", "Cliffhanger se series banana", "AI se script likhwana — sahi prompt", "Comment bait bina cringe ke"] },
  { title: "Animation: Images ko video banao", lessons: ["Free image-to-video tools", "Camera movement prompts", "Lip-sync aur expressions", "Action scenes (chase, fight) safely", "Common errors aur fix", "Phone pe poora workflow"] },
  { title: "Voice, music aur editing", lessons: ["AI voiceover — free options", "Bhai wali deep voice setup", "Background music aur copyright", "CapCut editing — fast cuts", "Subtitles jo retention badhaye", "Export settings (720p/1080p) for Instagram"] },
  { title: "Posting aur growth", lessons: ["Best posting time aur frequency", "Captions, hashtags, cover", "Series strategy: followers wapas aate hain", "Analytics padhna — kya kaam kar raha hai", "Collab aur shoutouts", "Shadowban myths vs reality"] },
  { title: "Kamai: Brand deals, monetization, clients", upsellAfterLast: "pro", lessons: ["Kamai ke tarike (honest — results vary)", "Brand sponsorship: rate card aur pitch DM", "YouTube Shorts / Facebook monetization basics", "Client work: dusron ke liye reels banao", "Aage kya? Apna system banao"] },
];

async function wipe() {
  // Order matters (foreign keys). Only demo-ish tables; settings & content are kept.
  await db.partnerLedger.deleteMany();
  await db.payout.deleteMany();
  await db.commission.deleteMany();
  await db.refund.deleteMany();
  await db.invoice.deleteMany();
  await db.orderItem.deleteMany();
  await db.order.deleteMany();
  await db.checkout.deleteMany();
  await db.click.deleteMany();
  await db.coupon.deleteMany();
  await db.partnerCommissionRate.deleteMany();
  await db.partner.deleteMany();
  await db.lead.deleteMany();
  await db.funnelEvent.deleteMany();
  await db.visitor.deleteMany();
  await db.playbackEvent.deleteMany();
  await db.lessonProgress.deleteMany();
  await db.enrollment.deleteMany();
  await db.asset.deleteMany();
  await db.lesson.deleteMany();
  await db.module.deleteMany();
  await db.price.deleteMany();
  await db.product.deleteMany();
  await db.course.deleteMany();
  await db.session.deleteMany();
  await db.loginToken.deleteMany();
  await db.userRole.deleteMany();
  await db.user.deleteMany();
  await db.webhookEvent.deleteMany();
  await db.messageLog.deleteMany();
  await db.rateLimit.deleteMany();
}

async function main() {
  console.log("Seeding demo data…");
  await wipe();

  // ── Admin ──
  const adminEmail = (process.env.ADMIN_EMAIL || "admin@example.com").toLowerCase();
  const admin = await db.user.create({ data: { email: adminEmail, name: "Admin", roles: { create: [{ role: "ADMIN" }] } } });

  // ── Course ──
  const course = await db.course.create({
    data: {
      slug: "ai-reels-masterclass",
      title: "AI Animal Reels Masterclass",
      subtitle: "Phone se, free AI tools se — viral 'Bhai' reels banana seekho",
      description: "40 video lessons (~320 min), 300+ prompts, PDF guide, story templates aur income module.",
      published: true,
    },
  });
  let lessonCount = 0;
  for (const [mi, m] of CURRICULUM.entries()) {
    const mod = await db.module.create({ data: { courseId: course.id, title: m.title, position: mi + 1, minTier: m.minTier ?? "BASIC" } });
    for (const [li, title] of m.lessons.entries()) {
      lessonCount++;
      const isLast = li === m.lessons.length - 1;
      await db.lesson.create({
        data: {
          moduleId: mod.id,
          title,
          position: li + 1,
          durationSec: 360 + ((lessonCount * 37) % 240),
          isFreePreview: lessonCount === 1 || lessonCount === 2,
          videoProvider: "mux",
          videoRef: null, // add your Mux playback ID in Admin → Courses
          body: lessonCount === 1 ? "Is lesson ke neeche downloads section mein PDF guide aur prompt pack milega." : null,
          upsellProductSlug: isLast && m.upsellAfterLast ? m.upsellAfterLast : null,
        },
      });
    }
  }
  await db.asset.createMany({
    data: [
      { courseId: course.id, kind: "PDF", title: "Get Udaan PDF Guide", storageKey: "course/guide.pdf", minTier: "BASIC" },
      { courseId: course.id, kind: "PROMPTS", title: "300+ Prompt Pack", storageKey: "course/prompts.txt", minTier: "BASIC" },
      { courseId: course.id, kind: "TEMPLATE", title: "Story Templates", storageKey: "course/story-templates.txt", minTier: "BASIC" },
      { courseId: course.id, kind: "PROMPTS", title: "Pro: Monthly Prompt Update (Nov)", storageKey: "course/pro-prompts-nov.txt", minTier: "PRO" },
    ],
  });

  // ── Products & prices (paise) ──
  const mk = async (p: { slug: string; name: string; kind: "COURSE_TIER" | "SERVICE" | "ADDON"; tier?: "BASIC" | "PRO" | "DONE_WITH_YOU"; price: number; commission: number; position: number; tagline: string; features: string[] }) =>
    db.product.create({
      data: {
        slug: p.slug,
        name: p.name,
        kind: p.kind,
        tier: p.tier,
        courseId: p.kind === "ADDON" ? null : course.id,
        tagline: p.tagline,
        features: p.features,
        position: p.position,
        defaultCommissionBps: p.commission,
        prices: { create: [{ amountPaise: p.price, startsAt: ago(60) }] },
      },
    });
  const basic = await mk({ slug: "basic", name: "Pro", kind: "COURSE_TIER", tier: "BASIC", price: 49900, commission: 5000, position: 1, tagline: "Seekhna shuru karo", features: ["40 video lessons (~320 min)", "300+ prompt pack", "PDF guide + story templates", "Income module", "Lifetime access"] });
  const pro = await mk({ slug: "pro", name: "Done-for-you", kind: "COURSE_TIER", tier: "PRO", price: 149900, commission: 5000, position: 2, tagline: "Team ke saath page grow karo", features: ["Pro ka sab kuch", "Humari team ke saath page grow karo", "Aapke content ka analysis + feedback", "Content refine karne mein madad", "Private community (Telegram)", "Har mahine naye prompts", "Monthly live Q&A"] });
  const dwy = await mk({ slug: "done-with-you", name: "Done-with-you", kind: "SERVICE", tier: "DONE_WITH_YOU", price: 1499900, commission: 2500, position: 3, tagline: "Humari team aapka page banayegi", features: ["Pro ka sab kuch", "Character design by our team", "Pehli 5 videos saath mein", "Page setup + 30-din growth plan", "2 one-on-one calls"] });
  // The Rs 14,999 service is no longer sold (2026-11-20); kept switched off so old demo orders still make sense.
  await db.product.update({ where: { id: dwy.id }, data: { active: false } });
  const bump = await mk({ slug: "advanced-prompts", name: "Advanced Prompt Pack", kind: "ADDON", price: 14900, commission: 5000, position: 10, tagline: "150 extra cinematic prompts", features: ["150 cinematic prompts", "Action + emotion scenes"] });
  void pro;

  // ── Partners ──
  const p1User = await db.user.create({ data: { email: "lionbhai.partner@example.com", name: "Lion Bhai Official", phone: "9876500001", roles: { create: [{ role: "PARTNER" }] } } });
  const p1 = await db.partner.create({
    data: { userId: p1User.id, status: "APPROVED", code: "LIONBHAI", displayName: "Lion Bhai Official", instagramHandle: "lionbhai.official", followers: 420000, niche: "AI animal gangster", phone: "9876500001", upiId: "lionbhai@okaxis", approvedAt: ago(40) },
  });
  await db.coupon.create({ data: { code: "LIONBHAI", kind: "PERCENT", value: 1000, partnerId: p1.id } });
  const p2User = await db.user.create({ data: { email: "tigerdon.partner@example.com", name: "Tiger Don Reels", phone: "9876500002" } });
  await db.partner.create({ data: { userId: p2User.id, status: "PENDING", displayName: "Tiger Don Reels", instagramHandle: "tigerdon.reels", followers: 85000, niche: "AI action", phone: "9876500002" } });
  await db.coupon.create({ data: { code: "WELCOME50", kind: "FLAT", value: 5000 } });

  // ── Clicks (last 30 days) ──
  const campaigns = ["reel23", "reel24", "story1", null];
  const clicks = Array.from({ length: 260 }, (_, i) => ({
    id: `seedclick${i}`,
    partnerId: p1.id,
    campaign: campaigns[i % campaigns.length],
    landingPath: "/",
    visitorId: `seedvisitor${i}`,
    isDuplicate: i % 17 === 0,
    createdAt: new Date(Date.now() - ((i * 7919) % (30 * 24)) * 3600_000),
  }));
  await db.click.createMany({ data: clicks });
  for (let i = 0; i < 260; i += 3)
    await db.funnelEvent.create({ data: { name: "page_view", visitorId: `seedvisitor${i}`, partnerId: p1.id, campaign: campaigns[i % 4], path: "/", createdAt: clicks[i].createdAt } });

  // ── Leads ──
  for (let i = 0; i < 24; i++) {
    await db.lead.create({
      data: {
        email: `lead${i}@example.com`,
        phone: `98${String(10000000 + i * 7331).slice(0, 8)}`,
        name: `Lead ${i}`,
        partnerId: i % 2 === 0 ? p1.id : null,
        campaign: i % 2 === 0 ? campaigns[i % 3] : null,
        consentAt: ago(i),
        createdAt: ago(i),
        status: i < 4 ? "CONVERTED" : "NEW",
      },
    });
  }

  // ── Orders ──
  // [daysAgo, product, partner?, coupon?, withBump, status]
  const plan: [number, typeof basic, boolean, boolean, boolean, "PAID" | "REFUNDED"][] = [
    [1, basic, true, true, false, "PAID"], [2, basic, true, false, true, "PAID"], [3, basic, false, false, false, "PAID"],
    [5, basic, true, true, false, "PAID"], [8, basic, true, false, false, "PAID"], [9, basic, true, true, true, "PAID"],
    [12, dwy, true, false, false, "PAID"], [15, basic, true, false, false, "REFUNDED"], [18, basic, false, false, false, "PAID"],
    [22, basic, true, true, false, "PAID"], [26, basic, true, false, false, "PAID"], [4, pro, false, false, false, "PAID"],
  ];
  const lionCoupon = await db.coupon.findUniqueOrThrow({ where: { code: "LIONBHAI" } });
  let n = 0;
  for (const [days, product, viaPartner, withCoupon, withBump, status] of plan) {
    n++;
    const paidAt = ago(days);
    const price = (await db.price.findFirstOrThrow({ where: { productId: product.id } })).amountPaise;
    const bumpPrice = 14900;
    const subtotal = price + (withBump ? bumpPrice : 0);
    const discount = withCoupon ? Math.floor(price * 0.1) : 0;
    const total = subtotal - discount;
    const fee = Math.round(total * 0.0236); // ~2% + GST on fee
    const email = `student${n}@example.com`;
    const user = await db.user.create({ data: { email, name: `Demo Student ${n}`, phone: `90000000${String(n).padStart(2, "0")}`, roles: { create: [{ role: "STUDENT" }, ...(product.kind === "SERVICE" ? [{ role: "SERVICE_CLIENT" as const }] : [])] } } });
    const order = await db.order.create({
      data: {
        userId: user.id, email, phone: user.phone!, name: user.name!, status, subtotalPaise: subtotal, discountPaise: discount, totalPaise: total,
        gatewayFeePaise: fee, gatewayOrderId: `order_seed_${n}`, gatewayPaymentId: `pay_seed_${n}`, paidAt, createdAt: paidAt,
        couponId: withCoupon ? lionCoupon.id : null, partnerId: viaPartner ? p1.id : null,
        attributionSource: viaPartner ? (withCoupon ? "COUPON" : "COOKIE") : "NONE", campaign: viaPartner ? campaigns[n % 3] : null,
        city: ["Pune", "Jaipur", "Lucknow", "Patna", "Indore", "Surat"][n % 6],
        items: { create: [{ productId: product.id, name: product.name, unitPaise: price, kind: "MAIN" }, ...(withBump ? [{ productId: bump.id, name: bump.name, unitPaise: bumpPrice, kind: "BUMP" as const }] : [])] },
      },
    });
    await db.enrollment.create({ data: { userId: user.id, courseId: course.id, tier: product.tier!, orderId: order.id, revokedAt: status === "REFUNDED" ? ago(days - 2) : null } });
    if (status === "REFUNDED") await db.refund.create({ data: { orderId: order.id, amountPaise: total, status: "processed", gatewayRefundId: `rfnd_seed_${n}`, reason: "Demo refund" } });

    if (viaPartner) {
      const c = computeOrderCommission({
        items: [{ unitPaise: price, rateBps: product.defaultCommissionBps }, ...(withBump ? [{ unitPaise: bumpPrice, rateBps: bump.defaultCommissionBps }] : [])],
        subtotalPaise: subtotal, totalPaise: total, taxPaise: 0, gatewayFeePaise: fee,
      });
      const availableAt = new Date(paidAt.getTime() + 7 * DAY);
      const matured = availableAt <= new Date();
      const cStatus = status === "REFUNDED" ? "REVERSED" : matured ? "APPROVED" : "PENDING";
      const com = await db.commission.create({
        data: { partnerId: p1.id, orderId: order.id, basePaise: c.basePaise, rateBps: c.effectiveRateBps, amountPaise: c.amountPaise, status: cStatus, availableAt, approvedAt: cStatus === "APPROVED" ? availableAt : null, reversedAt: cStatus === "REVERSED" ? ago(days - 2) : null, createdAt: paidAt },
      });
      if (cStatus === "APPROVED") await db.partnerLedger.create({ data: { partnerId: p1.id, type: "COMMISSION_APPROVED", amountPaise: c.amountPaise, commissionId: com.id, createdAt: availableAt } });
    }
    await db.funnelEvent.create({ data: { name: "checkout_start", partnerId: viaPartner ? p1.id : null, props: { orderId: order.id }, createdAt: new Date(paidAt.getTime() - 120_000) } });
    await db.funnelEvent.create({ data: { name: "payment_success", userId: user.id, partnerId: viaPartner ? p1.id : null, props: { orderId: order.id }, createdAt: paidAt } });
  }

  // One paid withdrawal + one open request so the withdrawal screens have data
  const paidOut = await db.payout.create({
    data: { partnerId: p1.id, status: "PAID", grossPaise: 50000, netPaise: 50000, method: { type: "upi", upiId: "lionbhai@okaxis" }, reference: "UTR-DEMO-123456", requestedAt: ago(6), approvedAt: ago(5), paidAt: ago(5), decidedById: admin.id },
  });
  await db.partnerLedger.create({ data: { partnerId: p1.id, type: "WITHDRAWAL_PAID", amountPaise: -50000, payoutId: paidOut.id, createdAt: ago(5) } });

  // Extra checkouts that never paid (realistic funnel drop-off)
  for (let i = 0; i < 9; i++) await db.funnelEvent.create({ data: { name: "checkout_start", partnerId: i % 2 ? p1.id : null, createdAt: ago(i * 3) } });

  // ── Abandoned cart ──
  await db.checkout.create({ data: { email: "abandoned@example.com", phone: "9123456780", name: "Abandoned Demo", productSlug: "basic", status: "ABANDONED", createdAt: ago(0.1), updatedAt: ago(0.1) } });
  await db.checkout.create({ data: { email: "open@example.com", phone: "9123456781", name: "Open Checkout", productSlug: "pro", status: "OPEN" } });

  // ── Demo student with progress (log in with this email to see the student view) ──
  const demo = await db.user.create({ data: { email: "student@example.com", name: "Demo Student", phone: "9876543210", roles: { create: [{ role: "STUDENT" }] } } });
  await db.enrollment.create({ data: { userId: demo.id, courseId: course.id, tier: "BASIC" } });
  const firstLessons = await db.lesson.findMany({ where: { module: { courseId: course.id } }, orderBy: [{ module: { position: "asc" } }, { position: "asc" }], take: 4 });
  for (const [i, l] of firstLessons.entries()) {
    await db.lessonProgress.create({ data: { userId: demo.id, lessonId: l.id, positionSec: i < 3 ? l.durationSec : 120, completedAt: i < 3 ? ago(1) : null } });
  }

  console.log(`✅ Seeded: ${lessonCount} lessons, 4 products, 2 partners, ${plan.length} orders, 24 leads, 2 checkouts.`);
  console.log(`   Admin login: ${adminEmail}`);
  console.log("   Partner login: lionbhai.partner@example.com   Student login: student@example.com");
  console.log("   (Login codes are printed in the dev-server terminal and saved in .local-mail/)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
