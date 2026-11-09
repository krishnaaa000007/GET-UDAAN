"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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

export function CheckoutForm({ product, bumps, initialCoupon, prefill, refundDays, supportWhatsapp }: Props) {
  const router = useRouter();
  const [form, setForm] = useState(prefill);
  const [bumpOn, setBumpOn] = useState<Record<string, boolean>>({});
  const [couponOpen, setCouponOpen] = useState(!!initialCoupon);
  const [couponInput, setCouponInput] = useState(initialCoupon);
  const [coupon, setCoupon] = useState<{ code: string; discountPaise: number } | null>(null);
  const [couponMsg, setCouponMsg] = useState<string | null>(null);
  const [error, setError] = useState<{ msg: string; field?: string } | null>(null);
  const [pending, start] = useTransition();
  const [paying, setPaying] = useState(false);

  // Auto-apply a prefilled (partner) coupon once.
  useEffect(() => {
    if (initialCoupon) void applyCoupon(initialCoupon);
    track("checkout_view", { product: product.slug });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function applyCoupon(code: string) {
    setCouponMsg(null);
    const r = await previewCouponAction(product.slug, code);
    if (r.ok) {
      setCoupon({ code: r.code, discountPaise: r.discountPaise });
      setCouponMsg(`✓ ${r.code} laga — ${formatINR(r.discountPaise)} ki bachat`);
    } else {
      setCoupon(null);
      setCouponMsg(r.reason);
    }
  }

  const bumpTotal = bumps.filter((b) => bumpOn[b.slug]).reduce((s, b) => s + b.pricePaise, 0);
  const total = product.pricePaise - (coupon?.discountPaise ?? 0) + bumpTotal;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    start(async () => {
      const r = await startCheckoutAction({
        productSlug: product.slug,
        name: form.name,
        phone: form.phone,
        email: form.email,
        coupon: coupon?.code ?? "",
        bumpSlugs: Object.keys(bumpOn).filter((k) => bumpOn[k]),
      });
      if (!r.ok) {
        setError({ msg: r.error, field: "field" in r ? r.field : undefined });
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
        setError({ msg: "Payment window load nahi hua. Internet check karke dobara try karein." });
        return;
      }
      const rz = new window.Razorpay({
        key: r.keyId,
        amount: r.amountPaise,
        currency: "INR",
        order_id: r.gatewayOrderId,
        name: "ReelBhai Academy",
        description: r.description,
        prefill: r.prefill,
        notes: { orderId: r.orderId },
        theme: { color: "#ffb627" },
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
      rz.on("payment.failed", () => setError({ msg: "Payment fail ho gaya. Koi paisa kata ho to 5–7 din mein wapas aa jayega. Dobara try karein." }));
      rz.open();
    });
  }

  const busy = pending || paying;
  const fieldErr = (f: string) => (error?.field === f ? <p className="mt-1 text-sm text-bad">{error.msg}</p> : null);
  const wa = supportWhatsapp.replace(/\D/g, "");

  return (
    <form onSubmit={submit} className="space-y-5">
      {/* Order summary */}
      <div className="card p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs text-gold">Aap join kar rahe hain</p>
            <h1 className="font-display text-2xl">{product.name === "Done-with-you" ? "Done-with-you" : `ReelBhai ${product.name}`}</h1>
          </div>
          <span className="text-xl font-bold">{formatINR(product.pricePaise)}</span>
        </div>
        <ul className="mt-3 space-y-1 text-sm text-muted">
          {product.features.map((f) => (
            <li key={f}>✓ {f}</li>
          ))}
        </ul>
      </div>

      {/* The only 3 fields */}
      <div className="space-y-3">
        <label className="block">
          <span className="mb-1 block text-sm text-muted">Poora naam</span>
          <input className="field" required autoComplete="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Rahul Kumar" />
          {fieldErr("name")}
        </label>
        <label className="block">
          <span className="mb-1 block text-sm text-muted">WhatsApp number</span>
          <div className="flex gap-2">
            <span className="field flex w-16 shrink-0 items-center justify-center px-0 text-muted">+91</span>
            <input className="field" required inputMode="numeric" autoComplete="tel-national" maxLength={14} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="98765 43210" />
          </div>
          {fieldErr("phone")}
        </label>
        <label className="block">
          <span className="mb-1 block text-sm text-muted">Email (course login yahin aayega)</span>
          <input className="field" required type="email" inputMode="email" autoComplete="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="aap@gmail.com" />
          {fieldErr("email")}
        </label>
      </div>

      {/* Order bump */}
      {bumps.map((b) => (
        <label key={b.slug} className={`card flex cursor-pointer gap-3 border-dashed p-4 ${bumpOn[b.slug] ? "border-gold bg-gold/5" : ""}`}>
          <input type="checkbox" className="mt-1 h-5 w-5 accent-[#ffb627]" checked={!!bumpOn[b.slug]} onChange={(e) => setBumpOn({ ...bumpOn, [b.slug]: e.target.checked })} />
          <span>
            <span className="font-semibold text-gold">Haan, {b.name} bhi add karo — {formatINR(b.pricePaise)}</span>
            <span className="block text-sm text-muted">{b.tagline}</span>
          </span>
        </label>
      ))}

      {/* Coupon */}
      <div>
        {!couponOpen ? (
          <button type="button" className="text-sm text-gold underline" onClick={() => setCouponOpen(true)}>
            Coupon code hai?
          </button>
        ) : (
          <div>
            <div className="flex gap-2">
              <input className="field uppercase" value={couponInput} onChange={(e) => setCouponInput(e.target.value)} placeholder="COUPON" aria-label="Coupon code" />
              <button type="button" className="btn-ghost shrink-0" onClick={() => applyCoupon(couponInput)}>
                Apply
              </button>
            </div>
            {couponMsg && <p className={`mt-1 text-sm ${coupon ? "text-good" : "text-bad"}`}>{couponMsg}</p>}
            {fieldErr("coupon")}
          </div>
        )}
      </div>

      {/* Total */}
      <div className="card space-y-1 p-4 text-sm">
        <div className="flex justify-between">
          <span className="text-muted">{product.name}</span>
          <span>{formatINR(product.pricePaise)}</span>
        </div>
        {bumps
          .filter((b) => bumpOn[b.slug])
          .map((b) => (
            <div key={b.slug} className="flex justify-between">
              <span className="text-muted">{b.name}</span>
              <span>{formatINR(b.pricePaise)}</span>
            </div>
          ))}
        {coupon && (
          <div className="flex justify-between text-good">
            <span>Coupon {coupon.code}</span>
            <span>−{formatINR(coupon.discountPaise)}</span>
          </div>
        )}
        <div className="flex justify-between border-t border-line pt-2 text-lg font-bold">
          <span>Total</span>
          <span>{formatINR(total)}</span>
        </div>
      </div>

      {error && !error.field && <p className="rounded-xl border border-bad/40 bg-bad/10 p-3 text-sm text-bad">{error.msg}</p>}

      <button className="btn-gold w-full text-lg" disabled={busy}>
        {busy ? "Payment khul raha hai…" : `${formatINR(total)} Pay karein →`}
      </button>

      {/* Trust */}
      <div className="space-y-2 text-center text-xs text-muted">
        <p>🔒 Razorpay secure payment • UPI (GPay, PhonePe, Paytm) • Cards • Netbanking</p>
        <p>🛡️ {refundDays}-din refund policy — pasand na aaye to poora paisa wapas</p>
        <p>
          Madad chahiye?{" "}
          <a className="text-gold underline" href={`https://wa.me/${wa}`} target="_blank" rel="noopener">
            WhatsApp {supportWhatsapp}
          </a>
        </p>
        <p>
          Pay karke aap humari <Link href="/legal/terms" className="underline">Terms</Link> aur <Link href="/legal/refund" className="underline">Refund policy</Link> se agree karte hain.
        </p>
      </div>
    </form>
  );
}
