"use client";

/**
 * PARTNER APPLY FORM — 3 short steps with a progress bar.
 * Step 3 is the invite code (team): pre-filled from ?invite=, /j/CODE (cookie gu_invite) or localStorage,
 * shown as "Aapko X ne invite kiya" with a Change link, and checked live. Payout details come after approval.
 * All fields stay inside ONE form (hidden steps are only hidden, not removed), so nothing typed is lost
 * and the server receives everything in one go.
 */
import { CircleAlert, CircleCheck } from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { ProgressBar } from "@/components/ui/data";
import { Input, PhoneInput } from "@/components/ui/form";
import { PARTNER_RULES } from "@/config/partners";
import t from "@/content/hi-Latn/partner.json";
import { applyAction, checkInviteAction } from "./actions";

const a = t.apply;
type Errors = Partial<Record<"name" | "email" | "phone" | "handle" | "followers" | "invite", string>>;
type Invite = { code: string; name: string };

const INVITE_KEY = "gu_invite";
const INVITE_MS = PARTNER_RULES.inviteCookieDays * 86_400_000;

/** Invite code from the URL, then the cookie set by the proxy, then localStorage (30 days). */
function savedInviteCode(): string | null {
  try {
    const fromUrl = new URLSearchParams(window.location.search).get("invite");
    if (fromUrl) return fromUrl;
    const fromCookie = document.cookie.match(/(?:^|; )gu_invite=([^;]+)/)?.[1];
    if (fromCookie) return decodeURIComponent(fromCookie);
    const raw = localStorage.getItem(INVITE_KEY);
    if (raw) {
      const v = JSON.parse(raw) as { code: string; at: number };
      if (Date.now() - v.at < INVITE_MS) return v.code;
      localStorage.removeItem(INVITE_KEY);
    }
  } catch {
    /* storage blocked: no pre-fill */
  }
  return null;
}

export function ApplyForm() {
  const [state, setState] = useState<{ ok: boolean; error?: string }>({ ok: false });
  const [pending, start] = useTransition();
  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState<Errors>({});
  const [handle, setHandle] = useState("");
  const form = useRef<HTMLFormElement>(null);
  // Invite: the confirmed inviter, what is typed in the box, and the live check result.
  const [invite, setInvite] = useState<Invite | null>(null);
  const [editing, setEditing] = useState(false);
  const [typed, setTyped] = useState("");
  const [check, setCheck] = useState<"idle" | "checking" | "found" | "notFound">("idle");
  const [found, setFound] = useState<Invite | null>(null);

  // Pre-fill once, after load (browser-only data).
  useEffect(() => {
    const code = savedInviteCode();
    if (!code) return;
    checkInviteAction(code).then((r) => {
      if (!r) return;
      setInvite(r);
      try {
        localStorage.setItem(INVITE_KEY, JSON.stringify({ code: r.code, at: Date.now() }));
      } catch {
        /* ignore */
      }
    });
  }, []);

  // Live check while typing (debounced).
  useEffect(() => {
    if (!editing) return;
    const code = typed.trim();
    if (!code) return;
    const id = setTimeout(() => {
      setCheck("checking");
      checkInviteAction(code).then((r) => {
        setFound(r);
        setCheck(r ? "found" : "notFound");
      });
    }, 400);
    return () => clearTimeout(id);
  }, [typed, editing]);

  // The code that is actually sent.
  const inviteCode = editing ? (check === "found" && found ? found.code : "") : (invite?.code ?? "");

  if (state.ok)
    return (
      <div role="status" className="flex flex-col items-center gap-3 rounded-lg border border-line bg-surface-raised p-6 text-center">
        <CircleCheck aria-hidden className="size-14 text-success" strokeWidth={1.5} />
        <h3 className="type-heading text-ink">{a.success.title}</h3>
        <p className="text-ink-muted">{a.success.text.replace("{approval}", PARTNER_RULES.approvalTargetHours)}</p>
        <Button href="/free-lesson" variant="secondary">
          {a.success.cta}
        </Button>
      </div>
    );

  const value = (name: string) => String(new FormData(form.current ?? undefined).get(name) ?? "").trim();

  // Check only the fields of the step being left, so errors show right where the person is.
  function next() {
    const e: Errors = {};
    if (step === 0) {
      if (value("name").length < 2) e.name = a.errors.name;
      if (!/^\S+@\S+\.\S+$/.test(value("email"))) e.email = a.errors.email;
      if (!/^[6-9]\d{9}$/.test(value("phone"))) e.phone = a.errors.phone;
    } else if (step === 1) {
      if (!/^[a-zA-Z0-9._]{1,30}$/.test(handle)) e.handle = a.errors.handle;
      if (!/^\d+$/.test(value("followers"))) e.followers = a.errors.followers;
    }
    setErrors(e);
    if (Object.keys(e).length === 0) setStep((s) => Math.min(2, s + 1));
  }

  return (
    <form
      ref={form}
      // Sent by hand (not via the form "action") so the browser never clears what was typed if the server finds a problem.
      onSubmit={(e) => {
        e.preventDefault();
        if (pending || step < 2) return;
        if (editing && typed.trim() && check !== "found") {
          setErrors({ invite: a.invite.notFound });
          return;
        }
        const data = new FormData(e.currentTarget);
        start(async () => setState(await applyAction(null, data)));
      }}
      noValidate className="flex flex-col gap-5 rounded-lg border border-line bg-surface-raised p-4 md:p-6">
      <div className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between gap-3">
          <span className="type-label text-gold-text">{a.step.replace("{n}", String(step + 1))}</span>
          <span className="type-title text-ink">{a.steps[step]}</span>
        </div>
        <ProgressBar value={((step + 1) / 3) * 100} label={a.step.replace("{n}", String(step + 1))} showLabel={false} />
      </div>

      {/* Step 1 */}
      <div hidden={step !== 0} className="flex flex-col gap-4">
        <Input label={a.name} name="name" autoComplete="name" required error={errors.name} />
        <Input label={a.email} name="email" type="email" inputMode="email" autoComplete="email" required hint={a.emailHint} error={errors.email} />
        <PhoneInput label={a.phone} name="phone" required error={errors.phone} />
      </div>

      {/* Step 2 */}
      <div hidden={step !== 1} className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <label htmlFor="apply-handle" className="font-semibold text-ink">
            {a.handle}
          </label>
          <div className={`flex min-h-[52px] items-stretch overflow-hidden rounded-input border bg-surface-raised-2 focus-within:border-gold ${errors.handle ? "border-fire" : "border-line"}`}>
            <span aria-hidden className="grid place-items-center border-r border-line px-3 font-semibold text-ink-muted">
              @
            </span>
            <input
              id="apply-handle"
              name="instagramHandle"
              value={handle}
              // Live formatting: strips "@", spaces and a pasted instagram.com link down to the handle.
              onChange={(e) =>
                setHandle(
                  e.target.value
                    .replace(/^https?:\/\/(www\.)?instagram\.com\//i, "")
                    .replace(/[/?].*$/, "")
                    .replace(/[^a-zA-Z0-9._]/g, "")
                    .slice(0, 30),
                )
              }
              placeholder={a.handlePlaceholder}
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              aria-invalid={errors.handle ? true : undefined}
              className="min-w-0 flex-1 bg-transparent px-4 text-[16px] text-ink placeholder:text-ink-muted"
            />
          </div>
          {errors.handle && (
            <p role="alert" className="type-small flex items-center gap-1 text-fire">
              <CircleAlert aria-hidden className="size-4 flex-none" />
              {errors.handle}
            </p>
          )}
        </div>
        <Input label={a.followers} name="followers" inputMode="numeric" pattern="[0-9]*" placeholder={a.followersPlaceholder} required error={errors.followers} />
        <Input label={a.niche} name="niche" placeholder={a.nichePlaceholder} />
      </div>

      {/* Step 3: invite code (optional) */}
      <div hidden={step !== 2} className="flex flex-col gap-4">
        <input type="hidden" name="inviteCode" value={inviteCode} />
        {invite && !editing ? (
          <div className="flex items-center justify-between gap-3 rounded-md border border-gold bg-surface p-4">
            <p className="text-ink">{a.invite.invitedBy.split("{name}")[0]}<b>{invite.name}</b>{a.invite.invitedBy.split("{name}")[1]}</p>
            <button
              type="button"
              onClick={() => {
                setEditing(true);
                setTyped(invite.code);
              }}
              className="min-h-11 shrink-0 px-2 font-semibold text-gold-text underline underline-offset-4">
              {a.invite.change}
            </button>
          </div>
        ) : (
          <Input
            label={a.invite.label}
            value={typed}
            onChange={(e) => {
              const v = e.target.value.replace(/[^a-zA-Z0-9_-]/g, "").toUpperCase().slice(0, 40);
              setTyped(v);
              setErrors((x) => ({ ...x, invite: undefined }));
              if (!v) setCheck("idle");
              if (!editing) setEditing(true);
            }}
            placeholder={a.invite.placeholder}
            autoCapitalize="characters"
            autoCorrect="off"
            spellCheck={false}
            hint={check === "checking" ? a.invite.checking : check === "found" && found ? a.invite.found.replace("{name}", found.name) : a.invite.hint}
            error={errors.invite ?? (check === "notFound" ? a.invite.notFound : undefined)}
          />
        )}
        <p className="type-small text-ink-muted">{a.invite.payoutLater}</p>
      </div>

      {state.error && (
        <p role="alert" className="flex items-start gap-2 rounded-sm border border-fire bg-surface p-3 text-ink">
          <CircleAlert aria-hidden className="mt-0.5 size-5 flex-none text-fire" />
          {state.error}
        </p>
      )}

      <div className="flex flex-col-reverse gap-3 sm:flex-row">
        {step > 0 && (
          <Button variant="ghost" onClick={() => setStep((s) => s - 1)}>
            {a.back}
          </Button>
        )}
        {step < 2 ? (
          // Separate keys: React must not turn this same button into the submit button mid-click
          // (the browser would then submit the form straight from step 2).
          <Button key="next" variant="secondary" arrow onClick={next} className="sm:flex-1">
            {a.next}
          </Button>
        ) : (
          <Button key="submit" type="submit" arrow loading={pending} className="sm:flex-1" data-cta="partner_apply_submit">
            {a.submit}
          </Button>
        )}
      </div>
    </form>
  );
}
