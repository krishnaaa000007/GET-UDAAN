// Public site footer: logo, tagline, links, support, socials, honesty line.
import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { Logo } from "@/components/logo";
import { IncomeDisclaimer } from "@/components/ui/basics";
import shell from "@/content/hi-Latn/shell.json";
import { supportWhatsappHref, type Settings } from "@/server/settings";

const link = "inline-flex min-h-12 items-center rounded-sm text-ink-muted underline-offset-4 hover:text-ink hover:underline";

export function SiteFooter({ settings }: { settings: Settings }) {
  const f = shell.footer;
  const wa = supportWhatsappHref(settings);
  return (
    // Extra bottom space on mobile so the sticky buy bar never covers the footer.
    <footer id="site-footer" className="border-t border-line bg-surface-raised pt-16 pb-32 md:pb-16">
      <div className="container-page grid gap-8 md:grid-cols-[1.4fr_1fr_1fr]">
        <div className="flex flex-col items-start gap-3">
          <Logo />
          <p className="type-title text-ink">{f.tagline}</p>
        </div>
        <nav aria-label={f.linksLabel}>
          <h2 className="type-label mb-2 text-ink-muted">{f.linksLabel}</h2>
          <ul className="grid grid-cols-2 gap-x-4 md:grid-cols-1">
            {f.links.map((l) => (
              <li key={l.label}>
                <Link href={l.href} className={link}>
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div>
          <h2 className="type-label mb-2 text-ink-muted">{f.supportLabel}</h2>
          <ul>
            {wa && (
            <li>
              <a href={wa} target="_blank" rel="noopener" className={`${link} gap-2`}>
                <MessageCircle aria-hidden className="size-5" />
                {f.whatsapp.replace("{number}", settings.supportWhatsapp)}
              </a>
            </li>
            )}
            {settings.supportEmail && (
            <li>
              <a href={`mailto:${settings.supportEmail}`} className={link}>
                {settings.supportEmail}
              </a>
            </li>
            )}
            {settings.instagramUrl && (
              <li>
                <a href={settings.instagramUrl} target="_blank" rel="noopener" className={link}>
                  {f.instagram}
                </a>
              </li>
            )}
            {settings.youtubeUrl && (
              <li>
                <a href={settings.youtubeUrl} target="_blank" rel="noopener" className={link}>
                  {f.youtube}
                </a>
              </li>
            )}
          </ul>
        </div>
      </div>
      <div className="container-page mt-8 flex flex-col gap-4">
        <IncomeDisclaimer />
        <p className="type-small text-ink-muted">
          {f.copyright.replace("{year}", String(new Date().getFullYear()))}
          {settings.sellerLegalName && settings.sellerLegalName !== "Get Udaan" ? ` · ${f.legalName.replace("{name}", settings.sellerLegalName)}` : ""} · {f.trademarks}
        </p>
      </div>
    </footer>
  );
}
