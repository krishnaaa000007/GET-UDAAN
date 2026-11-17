/**
 * CERTIFICATE (DESIGN.md 7.6) — also the public "verify" page that the QR code opens.
 * Day theme, stacked logo, student name in Anton, course, date, certificate ID, QR.
 * A certificate exists only when every lesson of the course is completed (checked live, never stored as a claim).
 */
import type { Metadata } from "next";
import QRCode from "qrcode";
import { MessageCircle, ShieldCheck } from "lucide-react";
import { Logo } from "@/components/logo";
import { Highlight, SpeedTrails } from "@/components/ui/basics";
import { Button, buttonClass } from "@/components/ui/button";
import t from "@/content/hi-Latn/student.json";
import { env } from "@/lib/env";
import { formatIST } from "@/lib/time";
import { getCurrentUser } from "@/server/auth";
import { getCertificate } from "@/server/learning";
import { PrintButton } from "./print-button";

export const metadata: Metadata = { title: "Certificate", robots: { index: false } };

const c = t.certificate;

/** QR code drawn as plain SVG squares so it uses our own ink colour (no image download). */
function QrCode({ value, label }: { value: string; label: string }) {
  const qr = QRCode.create(value, { errorCorrectionLevel: "M" });
  const n = qr.modules.size;
  let path = "";
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (qr.modules.get(x, y)) path += `M${x} ${y}h1v1h-1z`;
  return (
    <svg viewBox={`-2 -2 ${n + 4} ${n + 4}`} role="img" aria-label={label} className="size-24 flex-none rounded-sm bg-surface-raised">
      <path d={path} className="fill-ink" />
    </svg>
  );
}

function Message({ title, text, cta }: { title: string; text: string; cta: { href: string; label: string } }) {
  return (
    <main className="container-page flex min-h-dvh flex-col items-center justify-center gap-6 py-12 text-center">
      <Logo />
      <SpeedTrails className="h-10 w-12" />
      <h1 className="type-display text-ink">
        <Highlight text={title} />
      </h1>
      <p className="type-body-lg max-w-reading text-ink-muted">{text}</p>
      <Button href={cta.href} arrow>
        {cta.label}
      </Button>
    </main>
  );
}

export default async function CertificatePage({ params }: PageProps<"/certificate/[id]">) {
  const { id } = await params;
  const [cert, viewer] = await Promise.all([getCertificate(id), getCurrentUser()]);
  const isOwner = !!cert && viewer?.id === cert.ownerId;

  // Not finished yet: the owner sees their progress; everyone else just sees "not found".
  if (cert && !cert.complete && isOwner) return <Message title={c.notYet.title} text={c.notYet.text.replace("{percent}", String(cert.percent))} cta={{ href: "/dashboard", label: c.notYet.cta }} />;
  if (!cert || !cert.complete || !cert.completedOn) return <Message title={c.notFound.title} text={c.notFound.text} cta={{ href: "/", label: c.notFound.cta }} />;

  const url = `${env.appUrl}/certificate/${id}`;
  const shareHref = `https://wa.me/?text=${encodeURIComponent(`${c.shareMessage} ${url}`)}`;

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-8 print:max-w-none print:p-0">
      {/* The certificate itself — always the light "day" theme, also on paper */}
      <article data-theme="day" className="flex flex-col items-center gap-6 rounded-lg border-2 border-gold p-6 text-center md:p-10 print:rounded-none print:border-0">
        <Logo href={null} variant="stacked-on-light" className="h-24" priority />
        <p className="type-label text-gold-text">{c.eyebrow}</p>
        <div className="flex flex-col items-center gap-2">
          <p className="text-ink-muted">{c.certifies}</p>
          <h1 className="type-display break-words text-ink">{cert.studentName}</h1>
          <p className="text-ink-muted">{c.for}</p>
          <p className="type-title text-ink">{cert.course.title}</p>
        </div>
        <SpeedTrails className="h-8 w-9" />
        <div className="flex w-full flex-col items-center justify-between gap-6 border-t border-line pt-6 sm:flex-row sm:text-left">
          <dl className="flex flex-col gap-3">
            <div>
              <dt className="type-label text-ink-muted">{c.date}</dt>
              <dd className="font-semibold text-ink">{formatIST(cert.completedOn, "date")}</dd>
            </div>
            <div>
              <dt className="type-label text-ink-muted">{c.id}</dt>
              <dd className="font-semibold text-ink">{cert.certificateId}</dd>
            </div>
          </dl>
          <div className="flex flex-col items-center gap-2">
            <QrCode value={url} label={c.verify} />
            <p className="type-small text-ink-muted">{c.verify}</p>
          </div>
        </div>
      </article>

      <p className="flex items-start gap-2 text-success print:hidden">
        <ShieldCheck aria-hidden className="mt-0.5 size-5 flex-none" />
        {c.verified}
      </p>

      {/* Actions only for the student who earned it */}
      {isOwner && (
        <div className="flex flex-col gap-3 print:hidden">
          <a href={shareHref} target="_blank" rel="noopener" className={buttonClass({ variant: "primary", block: true })}>
            <MessageCircle aria-hidden className="size-5" />
            {c.share}
          </a>
          <PrintButton label={c.print} />
          <Button href="/dashboard" variant="ghost" className="self-center">
            {c.back}
          </Button>
        </div>
      )}
    </main>
  );
}
