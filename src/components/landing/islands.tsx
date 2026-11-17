"use client";

// Small browser-side pieces for the landing page: funnel tracking + the free-lesson opt-in sheet.
import { useRouter } from "next/navigation";
import { useActionState, useCallback, useEffect, useRef, useState } from "react";
import { submitLeadAction, type LeadResult } from "@/app/(public)/lead-actions";
import { Button } from "@/components/ui/button";
import { Checkbox, Input, PhoneInput } from "@/components/ui/form";
import { BottomSheet } from "@/components/ui/interactive";
import shell from "@/content/hi-Latn/shell.json";
import { track } from "@/lib/track";

/**
 * Records one page_view, plus a cta_click for any link/button that has a data-cta="name" attribute.
 * One listener for the whole page keeps the JavaScript tiny.
 */
export function FunnelTracker() {
  useEffect(() => {
    track("page_view");
    const onClick = (e: MouseEvent) => {
      const el = (e.target as Element | null)?.closest?.("[data-cta]");
      if (el) track("cta_click", { id: el.getAttribute("data-cta"), href: el.getAttribute("href") });
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);
  return null;
}

const SEEN_KEY = "gu_lead_sheet_seen";
const wasSeen = () => {
  try {
    return sessionStorage.getItem(SEEN_KEY) === "1";
  } catch {
    return false;
  }
};
const markSeen = () => {
  try {
    sessionStorage.setItem(SEEN_KEY, "1");
  } catch {
    /* private mode: fine */
  }
};

/**
 * Free-lesson opt-in. Opens at most ONCE per visit, when the visitor:
 *  - taps any "free lesson" link (links to /free-lesson or /preview/...), or
 *  - scrolls 60% of the page, or
 *  - (desktop) moves the mouse out of the top of the window.
 * After they submit OR close it, free-lesson links simply open the lesson — never a dead end.
 */
export function LeadSheet({ freeLessonHref }: { freeLessonHref: string }) {
  const t = shell.leadSheet;
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const target = useRef(freeLessonHref);
  const [state, action, pending] = useActionState<LeadResult, FormData>(submitLeadAction, null);

  const show = useCallback((trigger: string, href?: string) => {
    if (wasSeen()) return false;
    markSeen();
    if (href) target.current = href;
    setOpen(true);
    track("cta_click", { id: "lead_sheet_open", trigger });
    return true;
  }, []);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const a = (e.target as Element | null)?.closest?.('a[href^="/preview/"], a[href="/free-lesson"]');
      if (a && show("free_lesson_link", a.getAttribute("href") ?? undefined)) e.preventDefault();
    };
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      if (max <= 0 || window.scrollY / max < 0.6) return;
      // Never pop up over a buy button: wait while pricing or the final CTA is on screen.
      const buying = ["pricing", "final-cta"].some((id) => {
        const r = document.getElementById(id)?.getBoundingClientRect();
        return r && r.top < window.innerHeight && r.bottom > 0;
      });
      if (!buying) show("scroll_60");
    };
    const onLeave = (e: MouseEvent) => {
      if (e.clientY <= 0 && window.matchMedia("(pointer: fine)").matches) show("exit_intent");
    };
    document.addEventListener("click", onClick, true);
    window.addEventListener("scroll", onScroll, { passive: true });
    document.documentElement.addEventListener("mouseleave", onLeave);
    return () => {
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("scroll", onScroll);
      document.documentElement.removeEventListener("mouseleave", onLeave);
    };
  }, [show]);

  useEffect(() => {
    if (state?.ok) {
      track("lead_optin");
      router.push(target.current);
    }
  }, [state, router]);

  const err = state && !state.ok ? state.errors : {};
  const typed = state && !state.ok ? state.values : null;
  return (
    <BottomSheet open={open} onClose={() => setOpen(false)} title={t.title}>
      <form action={action} className="flex flex-col gap-4" noValidate>
        <p className="text-ink-muted">{t.text}</p>
        <Input label={t.name} name="name" autoComplete="name" placeholder={t.namePlaceholder} defaultValue={typed?.name} error={err.name} required />
        <PhoneInput label={t.phone} name="phone" defaultValue={typed?.phone} error={err.phone} required />
        <div>
          <Checkbox name="consent" label={t.consent} defaultChecked={typed?.consent} />
          {err.consent && (
            <p role="alert" className="type-small text-fire">
              {err.consent}
            </p>
          )}
        </div>
        {err.form && (
          <p role="alert" className="type-small text-fire">
            {err.form}
          </p>
        )}
        <Button type="submit" block loading={pending || state?.ok === true}>
          {t.cta}
        </Button>
        <p className="type-small text-center text-ink-muted">{t.noSpam}</p>
      </form>
    </BottomSheet>
  );
}
