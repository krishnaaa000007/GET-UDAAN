/**
 * ONE-PAGE CHECKOUT: name, phone, email → pay. Nothing else.
 * Coupon auto-fills from ?coupon= or the partner's referral cookie.
 */
import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getProductWithPrice, listProducts } from "@/server/catalog";
import { getSettings } from "@/server/settings";
import { getCurrentUser } from "@/server/auth";
import { decodeRefCookie } from "@/server/attribution";
import { CheckoutForm } from "./checkout-form";

export const metadata: Metadata = { title: "Checkout", robots: { index: false } };

export default async function CheckoutPage({ params }: PageProps<"/checkout/[slug]">) {
  const { slug } = await params;
  const item = await getProductWithPrice(slug);
  if (!item || item.product.kind === "ADDON") notFound();

  const [settings, user, all] = await Promise.all([getSettings(), getCurrentUser(), listProducts()]);
  const jar = await cookies();

  // Coupon prefill: explicit ?coupon= first, else the referring partner's coupon.
  let coupon = jar.get("rb_coupon")?.value ?? "";
  if (!coupon) {
    const ref = decodeRefCookie(jar.get("rb_ref")?.value);
    if (ref) {
      const p = await db.partner.findUnique({ where: { code: ref.code }, include: { coupons: { where: { active: true }, take: 1 } } });
      if (p?.status === "APPROVED" && p.coupons[0]) coupon = p.coupons[0].code;
    }
  }

  // Order bump: only for course tiers (not for the done-with-you service).
  const bumps =
    item.product.kind === "COURSE_TIER"
      ? all.filter((p) => p.product.kind === "ADDON").map((p) => ({ slug: p.product.slug, name: p.product.name, tagline: p.product.tagline ?? "", pricePaise: p.price.amountPaise }))
      : [];
  const features = Array.isArray(item.product.features) ? (item.product.features as string[]) : [];

  return (
    <main className="mx-auto max-w-xl px-4 pt-5 pb-16">
      <CheckoutForm
        product={{ slug: item.product.slug, name: item.product.name, kind: item.product.kind, pricePaise: item.price.amountPaise, features: features.slice(0, 4) }}
        bumps={bumps}
        initialCoupon={coupon}
        prefill={{ name: user?.name ?? "", email: user?.email ?? "", phone: user?.phone ?? "" }}
        refundDays={settings.refundWindowDays}
        supportWhatsapp={settings.supportWhatsapp}
      />
    </main>
  );
}
