"use client";

// Form fields: Input, PhoneInput (+91), Checkbox, CouponField.
// All are 48px tall, label above, sunken background, error text below in Hinglish.
import { CircleAlert, CircleCheck } from "lucide-react";
import { useEffect, useId, useState, type ComponentProps, type ReactNode } from "react";
import ui from "@/content/hi-Latn/ui.json";
import { cn } from "@/lib/cn";
import { cleanIndianMobile } from "@/lib/phone";
import { Button } from "./button";

const fieldBox =
  "min-h-12 w-full rounded-sm border bg-surface-sunken px-4 text-[16px] text-ink placeholder:text-ink-muted/70 transition-colors duration-150 focus:border-gold";

type FieldProps = {
  label: string;
  /** Helper text under the field */
  hint?: string;
  /** Error message (Hinglish). When set, the field is marked invalid. */
  error?: string;
};

function FieldShell({ id, label, hint, error, children }: FieldProps & { id: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="font-semibold text-ink">
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${id}-msg`} role="alert" className="type-small flex items-center gap-1 text-fire">
          <CircleAlert aria-hidden className="size-4 flex-none" />
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-msg`} className="type-small text-ink-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function Input({ label, hint, error, className, id: idProp, ...rest }: FieldProps & ComponentProps<"input">) {
  const auto = useId();
  const id = idProp ?? auto;
  return (
    <FieldShell id={id} label={label} hint={hint} error={error}>
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={error || hint ? `${id}-msg` : undefined}
        className={cn(fieldBox, error ? "border-fire" : "border-line", className)}
        {...rest}
      />
    </FieldShell>
  );
}

/** Indian mobile number: fixed +91, number keypad, 10 digits only. */
export function PhoneInput({ label, hint, error, className, id: idProp, onChange, ...rest }: FieldProps & ComponentProps<"input">) {
  const auto = useId();
  const id = idProp ?? auto;
  return (
    <FieldShell id={id} label={label} hint={hint} error={error}>
      <div className={cn("flex min-h-12 items-stretch overflow-hidden rounded-sm border bg-surface-sunken focus-within:border-gold", error ? "border-fire" : "border-line")}>
        <span aria-hidden className="grid place-items-center border-r border-line px-3 font-semibold text-ink-muted">
          {ui.form.phonePrefix}
        </span>
        <input
          id={id}
          type="tel"
          inputMode="numeric"
          autoComplete="tel-national"
          pattern="[6-9][0-9]{9}"
          aria-invalid={error ? true : undefined}
          aria-describedby={error || hint ? `${id}-msg` : undefined}
          className={cn("min-w-0 flex-1 bg-transparent px-4 text-[16px] text-ink placeholder:text-ink-muted/70", className)}
          onChange={(e) => {
            e.target.value = cleanIndianMobile(e.target.value);
            onChange?.(e);
          }}
          {...rest}
        />
      </div>
    </FieldShell>
  );
}

export function Checkbox({ label, className, id: idProp, ...rest }: { label: ReactNode } & Omit<ComponentProps<"input">, "type">) {
  const auto = useId();
  const id = idProp ?? auto;
  return (
    <label htmlFor={id} className={cn("flex min-h-12 cursor-pointer items-start gap-3 py-2", className)}>
      <input id={id} type="checkbox" className="mt-0.5 size-6 flex-none rounded-sm accent-gold" {...rest} />
      <span className="text-ink">{label}</span>
    </label>
  );
}

/**
 * Coupon box. `onApply` checks the code on the server and returns
 * { ok: true, message: "₹100 off lag gaya" } or { ok: false, message: "Ye code galat hai" }.
 */
export function CouponField({
  defaultValue = "",
  name = "coupon",
  onApply,
  onEdit,
  autoApply = false,
  className,
}: {
  defaultValue?: string;
  name?: string;
  onApply: (code: string) => Promise<{ ok: boolean; message: string }>;
  /** Called when the user changes the code after applying (so the page can remove the old discount). */
  onEdit?: () => void;
  /** Apply the pre-filled code once when the field appears (partner coupons). */
  autoApply?: boolean;
  className?: string;
}) {
  const id = useId();
  const [code, setCode] = useState(defaultValue);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  async function apply() {
    if (!code.trim() || busy) return;
    setBusy(true);
    try {
      setResult(await onApply(code.trim().toUpperCase()));
    } finally {
      setBusy(false);
    }
  }

  // Pre-filled partner coupon: apply it once, straight away.
  useEffect(() => {
    if (!autoApply || !defaultValue.trim()) return;
    const timer = setTimeout(() => void apply(), 0);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <label htmlFor={id} className="font-semibold text-ink">
        {ui.form.couponLabel}
      </label>
      <div className="flex gap-2">
        <input
          id={id}
          name={name}
          value={code}
          onChange={(e) => {
            setCode(e.target.value.toUpperCase());
            if (result) onEdit?.();
            setResult(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void apply();
            }
          }}
          placeholder={ui.form.couponPlaceholder}
          autoCapitalize="characters"
          autoComplete="off"
          aria-describedby={result ? `${id}-msg` : undefined}
          aria-invalid={result && !result.ok ? true : undefined}
          className={cn(fieldBox, "min-w-0 flex-1 uppercase placeholder:normal-case", result && !result.ok ? "border-fire" : "border-line")}
        />
        <Button variant="secondary" loading={busy} onClick={apply}>
          {ui.form.couponApply}
        </Button>
      </div>
      {result && (
        <p id={`${id}-msg`} role="status" className={cn("type-small flex items-center gap-1", result.ok ? "text-success" : "text-fire")}>
          {result.ok ? <CircleCheck aria-hidden className="size-4 flex-none" /> : <CircleAlert aria-hidden className="size-4 flex-none" />}
          {result.message}
        </p>
      )}
    </div>
  );
}
