"use client";

// Interactive demos for the /design style guide (dev only).
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox, CouponField, Input, PhoneInput } from "@/components/ui/form";
import { BottomSheet, toast, ToastRegion } from "@/components/ui/interactive";

export function SheetDemo() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)}>
        Free Lesson Dekho
      </Button>
      <BottomSheet open={open} onClose={() => setOpen(false)} title="Pehla lesson FREE + 20 prompts">
        <form className="flex flex-col gap-4" onSubmit={(e) => e.preventDefault()}>
          <Input label="Aapka naam" name="name" autoComplete="name" />
          <PhoneInput label="WhatsApp number" name="phone" />
          <Checkbox label="Haan, mujhe WhatsApp pe lesson aur updates bhejo." />
          <Button variant="secondary" block type="submit">
            Free Lesson Pao
          </Button>
          <p className="type-small text-center text-ink-muted">Spam nahi karenge.</p>
        </form>
      </BottomSheet>
    </>
  );
}

export function ToastDemo() {
  return (
    <div className="flex flex-wrap gap-3">
      <ToastRegion />
      <Button variant="secondary" onClick={() => toast.success("Link copy ho gaya")}>
        Success Toast
      </Button>
      <Button variant="secondary" onClick={() => toast.error("Internet check karke dobara try karo")}>
        Error Toast
      </Button>
      <Button variant="secondary" onClick={() => toast.info("Naya lesson aa gaya hai")}>
        Info Toast
      </Button>
    </div>
  );
}

export function FormDemo() {
  return (
    <div className="flex max-w-md flex-col gap-4">
      <Input label="Aapka naam" name="name" autoComplete="name" placeholder="Jaise: Rahul Sharma" />
      <PhoneInput label="WhatsApp number" name="phone" hint="Isi number pe course ka link aayega." />
      <Input label="Email" name="email" type="email" autoComplete="email" defaultValue="rahul@" error="Email sahi nahi lag raha — ek baar check karo" />
      <Checkbox label="Haan, Advanced Prompt Pack bhi add karo — ₹149" />
      <CouponField onApply={async (code) => (code === "UDAAN" ? { ok: true, message: "Coupon lag gaya" } : { ok: false, message: "Ye code galat hai ya expire ho gaya" })} />
      <p className="type-small text-ink-muted">Demo: the code “UDAAN” works, anything else fails.</p>
    </div>
  );
}

export function LoadingButtonDemo() {
  const [busy, setBusy] = useState(false);
  return (
    <Button
      variant="secondary"
      loading={busy}
      onClick={() => {
        setBusy(true);
        setTimeout(() => setBusy(false), 2000);
      }}
    >
      Payment Karo
    </Button>
  );
}
