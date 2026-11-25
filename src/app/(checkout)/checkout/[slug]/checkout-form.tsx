"use client";

/**
 * CHECKOUT FORM (DESIGN.md 7.4). ONE action: pay.
 * Phone order: order summary → name → WhatsApp → email → order bump → coupon → Pay → trust → help.
 * Desktop: form on the left, summary stays visible on the right.
 * Prices, coupons and totals shown here are only a preview — the server always re-computes them.
 */
import Link from "next/link";
import { useRouter } from "next/navigation";
import landingCopy from "@/content/hi-Latn/landing.json";
import { Check, CircleAlert, MessageCircle, UserRound, ShieldCheck } from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";
import { HandUnderline, TrustRow } from "@/components/ui/basics";
import { Button } from "@/components/ui/button";
import { CouponField, Input, PhoneInput } from "@/components/ui/form";
import t from "@/content/hi-Latn/checkout.json";
import { cn } from "@/lib/cn";
import { formatINR } from "@/lib/money";
import { track } from "@/lib/track";
import { previewCouponAction, startCheckoutAction } from "./actions";

type Props = {
  product: { slug: string; name: string; kind: string; pricePaise: number; features: string[] };
  bumps: { slug: string; name: string; tagline: string; pricePaise: number }[];
  initialCoupon: string;
  prefill: { name: string; email: string; phone: string };
  refundDays: number;
  supportWhatsapp: string;
  /** True when the visitor comes back from a failed payment */
  initialFailed: boolean;
  /** One real, published student testimonial (or null) */
  testimonial: { name: string; city: string | null; quote: string } | null;
  /** Logged-in owner of a lower tier: product.pricePaise is already the upgrade price; this explains it. */
  upgrade?: { fromName: string; creditPaise: number; fullPaise: number } | null;
  /** Upgrades go to the logged-in account, so its email can't be changed here. */
  lockEmail?: boolean;
};

type RazorpayOptions = Record<string, unknown> & { handler: () => void; modal: { ondismiss: () => void } };
declare global {
  interface Window {
    Razorpay?: new (o: RazorpayOptions) => { open(): void; on(ev: string, cb: (r: unknown) => void): void };
  }
}

function loadRazorpay(): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

// Razorpay's own window needs a plain colour value, so we read our gold token from the page.
const brandGold = () => getComputedStyle(document.documentElement).getPropertyValue("--gold").trim();

/** "Get Udaan Done-for-you": the brand in navy, the plan name in gold with a hand-drawn underline. */
function ProductTitle({ name }: { name: string }) {
  const m = name.match(/^(Get Udaan)\s+(.+)$/);
  if (!m) return <>{name}</>;
  return (
    <>
      {m[1]}{" "}
      <span className="relative inline-block text-saffron">
        {m[2]}
        <HandUnderline className="-bottom-1.5 h-2" />
      </span>
    </>
  );
}

const heroPhoto: string = landingCopy.hero.personUrl;

export function CheckoutForm({ product, bumps, initialCoupon, prefill, refundDays, supportWhatsapp, initialFailed, testimonial, upgrade = null, lockEmail = false }: Props) {
  const router = useRouter();
  const [form, setForm] = useState(prefill);
  const [bumpOn, setBumpOn] = useState<Record<string, boolean>>({});
  const [coupon, setCoupon] = useState<{ code: string; discountPaise: number } | null>(null);
  const [error, setError] = useState<{ msg: string; field?: string } | null>(null);
  const [failed, setFailed] = useState(initialFailed);
  const [pending, start] = useTransition();
  const [paying, setPaying] = useState(false);
  const payRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    track("checkout_view", { product: product.slug });
  }, [product.slug]);

  async function applyCoupon(code: string) {
    const r = await previewCouponAction(product.slug, code);
    if (r.ok) {
      setCoupon({ code: r.code, discountPaise: r.discountPaise });
      return { ok: true, message: t.coupon.applied.replace("{code}", r.code).replace("{off}", formatINR(r.discountPaise)) };
    }
    setCoupon(null);
    return { ok: false, message: r.reason };
  }

  const activeBumps = bumps.filter((b) => bumpOn[b.slug]);
  const total = product.pricePaise - (coupon?.discountPaise ?? 0) + activeBumps.reduce((s, b) => s + b.pricePaise, 0);
  const busy = pending || paying; // while busy the Pay button is locked, so nobody can pay twice
  const waDigits = supportWhatsapp.replace(/\D/g, "");
  const wa = waDigits.length >= 10 ? `https://wa.me/${waDigits}` : undefined;
  const fieldErr = (f: string) => (error?.field === f ? error.msg : undefined);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setError(null);
    setFailed(false);
    start(async () => {
      const r = await startCheckoutAction({
        productSlug: product.slug,
        name: form.name,
        phone: form.phone,
        email: form.email,
        coupon: coupon?.code ?? "",
        bumpSlugs: activeBumps.map((b) => b.slug),
      });
      if (!r.ok) {
        const field = "field" in r ? r.field : undefined;
        setError({ msg: r.error, field });
        // Jump to the field that needs fixing (it may be off-screen on a phone).
        if (field) document.querySelector<HTMLInputElement>(`form [name="${field}"]`)?.focus();
        return;
      }
      if (r.mode === "mock") {
        router.push(`/pay/mock/${r.orderId}`);
        return;
      }
      setPaying(true);
      const loaded = await loadRazorpay();
      if (!loaded || !window.Razorpay) {
        setPaying(false);
        setError({ msg: t.errors.load });
        return;
      }
      const rz = new window.Razorpay({
        key: r.keyId,
        amount: r.amountPaise,
        currency: "INR",
        order_id: r.gatewayOrderId,
        name: "Get Udaan",
        description: r.description,
        prefill: r.prefill,
        notes: { orderId: r.orderId },
        theme: { color: brandGold() },
        // UPI first (intent apps on mobile, QR on desktop), then everything else.
        config: {
          display: {
            blocks: { upi: { name: "UPI se pay karein", instruments: [{ method: "upi" }] } },
            sequence: ["block.upi"],
            preferences: { show_default_blocks: true },
          },
        },
        // The browser callback only NAVIGATES. The order is confirmed by the verified webhook.
        handler: () => router.push(`/thank-you/${r.orderId}`),
        modal: { ondismiss: () => setPaying(false) },
      });
      rz.on("payment.failed", () => {
        setPaying(false);
        setFailed(true);
      });
      rz.open();
    });
  }

  return (
    <form onSubmit={submit} noValidate className="grid items-start gap-6 md:grid-cols-[1fr_360px] md:gap-8">
      {/* Payment did not go through: calm message, retry, WhatsApp */}
      {failed && (
        <div role="alert" className="flex flex-col gap-3 rounded-md border border-line bg-surface-raised p-4 md:col-span-2 md:p-6 shadow-card">
          <div className="flex items-start gap-3">
            <CircleAlert aria-hidden className="mt-1 size-6 flex-none text-fire" />
            <div className="flex flex-col gap-1">
              <h2 className="type-title text-ink">{t.failed.title}</h2>
              <p className="text-ink-muted">{t.failed.text}</p>
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              variant="secondary"
              onClick={() => {
                setFailed(false);
                payRef.current?.scrollIntoView({ block: "center" });
              }}
            >
              {t.failed.retry}
            </Button>
            {wa && (
              <a href={wa} target="_blank" rel="noopener" className="type-button inline-flex min-h-12 items-center justify-center gap-2 rounded-md px-4 text-gold-text underline underline-offset-4">
              <MessageCircle aria-hidden className="size-5" />
              {t.failed.whatsapp}
            </a>
            )}
          </div>
        </div>
      )}

      {/* Order summary — first on phones, sticky on the right on desktop */}
      <aside className="relative rounded-lg border border-gold/50 bg-gradient-to-b from-surface-raised to-gold-soft/60 p-5 md:sticky md:top-6 md:order-last md:p-6 shadow-card">
        {/* The creator photo peeks in at the top-right, on a soft gold disc (reference look). Decorative. */}
        {heroPhoto && (
          <div aria-hidden className="pointer-events-none absolute top-2 right-2 w-28 sm:w-36">
            <span className="absolute inset-x-[8%] top-[14%] bottom-[4%] rounded-pill bg-gold/45" />
            {/* eslint-disable-next-line @next/next/no-img-element -- small decorative image, already optimised webp */}
            <img src={heroPhoto} alt="" className="relative h-auto w-full mix-blend-multiply [mask-image:radial-gradient(closest-side,#000_70%,transparent)]" />
          </div>
        )}
        <p className="type-label relative inline-flex rounded-pill bg-gold-chip px-4 py-1.5 text-on-gold">{t.summary.eyebrow}</p>
        <h1 className="type-heading relative mt-3 pr-24 text-ink sm:pr-32">
          <ProductTitle name={product.kind === "SERVICE" ? product.name : t.summary.product.replace("{name}", product.name)} />
        </h1>
        <ul className="mt-4 flex flex-col gap-2.5">
          {product.features.map((f) => (
            <li key={f} className="flex gap-3 text-ink">
              <span aria-hidden className="mt-0.5 grid size-6 flex-none place-items-center rounded-pill bg-gold-chip text-on-gold">
                <Check className="size-4" strokeWidth={3} />
              </span>
              {f}
            </li>
          ))}
        </ul>
        <dl className="mt-4 flex flex-col gap-2 border-t border-line pt-4">
          {upgrade ? (
            <>
              <div className="flex justify-between gap-3">
                <dt className="text-ink-muted">{product.name}</dt>
                <dd className="text-ink">{formatINR(upgrade.fullPaise)}</dd>
              </div>
              <div className="flex justify-between gap-3 text-success">
                <dt className="flex items-center gap-1">
                  <Check aria-hidden className="size-4" strokeWidth={3} />
                  {t.summary.upgrade.replace("{name}", upgrade.fromName)}
                </dt>
                <dd>−{formatINR(upgrade.creditPaise)}</dd>
              </div>
            </>
          ) : (
            <div className="flex justify-between gap-3">
              <dt className="text-ink-muted">{product.name}</dt>
              <dd className="text-ink">{formatINR(product.pricePaise)}</dd>
            </div>
          )}
          {activeBumps.map((b) => (
            <div key={b.slug} className="flex justify-between gap-3">
              <dt className="text-ink-muted">{b.name}</dt>
              <dd className="text-ink">{formatINR(b.pricePaise)}</dd>
            </div>
          ))}
          {coupon && (
            <div className="flex justify-between gap-3 text-success">
              <dt className="flex items-center gap-1">
                <Check aria-hidden className="size-4" strokeWidth={3} />
                {t.summary.coupon.replace("{code}", coupon.code)}
              </dt>
              <dd>−{formatINR(coupon.discountPaise)}</dd>
            </div>
          )}
          <div className="mt-1 flex items-center justify-between gap-3 rounded-md bg-gold-chip px-4 py-3">
            <dt className="type-title text-on-gold">{t.summary.total}</dt>
            <dd aria-live="polite" className="type-price text-on-gold">
              {formatINR(total)}
            </dd>
          </div>
        </dl>
        <p className="type-small mt-3 flex items-center gap-2 text-ink">
          <ShieldCheck aria-hidden className="size-5 flex-none text-ink" />
          {t.summary.oneTime}
        </p>
      </aside>

      <div className="flex flex-col gap-5">
        {/* "Aapki details" = a navy tab attached to the white card that holds the fields (reference look). */}
        <div className="relative mt-6 flex flex-col gap-5 rounded-lg border border-line bg-surface-raised px-4 pt-12 pb-5 shadow-card md:px-6">
        <h2 data-theme="night" className="type-title absolute -top-6 -left-px inline-flex items-center gap-3 rounded-t-lg rounded-br-lg px-5 py-3 text-ink">
          <UserRound aria-hidden className="size-6 fill-current text-gold-text" />
          {t.fields.title}
        </h2>
        {/* The only 3 fields */}
        <Input label={t.fields.name} name="name" required autoComplete="name" placeholder={t.fields.namePlaceholder} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} error={fieldErr("name")} />
        <PhoneInput label={t.fields.phone} name="phone" required placeholder={t.fields.phonePlaceholder} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} error={fieldErr("phone")} />
        <Input
          label={t.fields.email}
          name="email"
          type="email"
          inputMode="email"
          required
          autoComplete="email"
          placeholder={t.fields.emailPlaceholder}
          hint={lockEmail ? t.fields.emailLocked : t.fields.emailHint}
          value={form.email}
          readOnly={lockEmail}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          error={fieldErr("email")}
        />
        </div>

        {/* Order bump */}
        {bumps.map((b) => (
          <label key={b.slug} className={cn("flex min-h-12 cursor-pointer gap-3 rounded-md bg-gold-soft p-4", bumpOn[b.slug] ? "border-2 border-gold" : "border-2 border-transparent")}>
            <input type="checkbox" className="mt-0.5 size-6 flex-none accent-gold" checked={!!bumpOn[b.slug]} onChange={(e) => setBumpOn({ ...bumpOn, [b.slug]: e.target.checked })} />
            <span className="flex flex-col">
              <span className="font-semibold text-gold-text">{t.bump.replace("{name}", b.name).replace("{price}", formatINR(b.pricePaise))}</span>
              {b.tagline && <span className="type-small text-ink-muted">{b.tagline}</span>}
            </span>
          </label>
        ))}

        <div>
          <CouponField defaultValue={initialCoupon} autoApply onApply={applyCoupon} onEdit={() => setCoupon(null)} />
          {fieldErr("coupon") && (
            <p role="alert" className="type-small mt-2 text-fire">
              {fieldErr("coupon")}
            </p>
          )}
        </div>

        {error && !error.field && (
          <p role="alert" className="flex items-start gap-2 rounded-sm border border-fire bg-surface-raised p-3 text-ink">
            <CircleAlert aria-hidden className="mt-0.5 size-5 flex-none text-fire" />
            {error.msg}
          </p>
        )}

        <div ref={payRef} className="flex flex-col gap-4">
          <Button type="submit" size="lg" block arrow loading={busy}>
            {busy ? t.paying : t.pay.replace("{total}", formatINR(total))}
          </Button>
          <TrustRow />
          <p className="type-small text-ink-muted">{t.refund.replace("{days}", String(refundDays))}</p>
          {wa && (
            <a href={wa} target="_blank" rel="noopener" className="type-small inline-flex min-h-12 items-center gap-2 self-start text-gold-text underline underline-offset-4">
            <MessageCircle aria-hidden className="size-5" />
            {t.help.replace("{number}", supportWhatsapp)}
          </a>
          )}
          {testimonial && (
            <figure className="flex flex-col gap-2 rounded-md border border-line bg-surface-raised p-4 shadow-card">
              <p className="type-label text-gold-text">{t.proof.eyebrow}</p>
              <blockquote className="text-ink">“{testimonial.quote}”</blockquote>
              <figcaption className="type-small text-ink-muted">
                — {testimonial.name}
                {testimonial.city ? `, ${testimonial.city}` : ""} · {t.proof.resultsVary}
              </figcaption>
            </figure>
          )}
          <p className="type-small text-ink-muted">
            {t.terms.before}{" "}
            <Link href="/legal/terms" className="underline underline-offset-4">
              {t.terms.terms}
            </Link>{" "}
            {t.terms.and}{" "}
            <Link href="/legal/refund" className="underline underline-offset-4">
              {t.terms.refund}
            </Link>{" "}
            {t.terms.after}
          </p>
        </div>
      </div>
    </form>
  );
}
