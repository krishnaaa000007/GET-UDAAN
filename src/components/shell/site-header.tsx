// Public site header (64px). See-through at the top of the page, solid with a border after scrolling.
import Link from "next/link";
import { Logo } from "@/components/logo";
import shell from "@/content/hi-Latn/shell.json";
import { AccountLinks } from "./account-links";
import { HeaderFrame } from "./header-frame";

export function SiteHeader() {
  const h = shell.header;
  return (
    <HeaderFrame>
      <div className="container-page flex h-16 items-center justify-between gap-3">
        <Logo priority />
        <nav aria-label={h.navLabel} className="hidden items-center gap-1 lg:flex">
          {h.nav.map((n) => (
            <Link key={n.href} href={n.href} className="inline-flex min-h-12 items-center rounded-sm px-3 text-[15px] font-semibold text-ink-muted transition-colors duration-150 hover:text-ink">
              {n.label}
            </Link>
          ))}
        </nav>
        <AccountLinks />
      </div>
    </HeaderFrame>
  );
}
