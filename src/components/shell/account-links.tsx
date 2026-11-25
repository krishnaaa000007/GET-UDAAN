"use client";

/**
 * Right side of the public header. The landing page is cached for speed, so the server can't know who is
 * logged in; this reads the harmless gu_in marker cookie in the browser instead:
 *  - logged out: Login + Join (as before)
 *  - logged in:  one "Mera account" button into the app
 * Before the browser has checked (first paint), it shows the logged-out version, which is also the
 * version search engines see.
 */
import Link from "next/link";
import { useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import shell from "@/content/hi-Latn/shell.json";

const subscribe = () => () => {};
const loggedIn = () => /(?:^|; )gu_in=1/.test(document.cookie);

export function AccountLinks() {
  const h = shell.header;
  const isIn = useSyncExternalStore(subscribe, loggedIn, () => false);
  if (isIn)
    return (
      <Button href="/dashboard/profile" variant="secondary" size="sm" className="whitespace-nowrap" data-cta="header_account">
        {h.account}
      </Button>
    );
  return (
    <div className="flex items-center gap-1 sm:gap-2">
      <Link href="/login" className="inline-flex min-h-12 items-center rounded-sm px-2 text-[15px] font-semibold text-ink transition-colors duration-150 hover:text-gold-text sm:px-3">
        {h.login}
      </Link>
      <span aria-hidden className="h-6 w-px bg-line" />
      {/* Small gold pill (reference look). It is smaller than the page's main CTA so that one still leads. */}
      <Button href="/#pricing" size="sm" arrow data-cta="header_join" className="ml-1 !min-h-10 px-4 text-[15px] sm:ml-2 sm:px-5">
        {h.join}
      </Button>
    </div>
  );
}
