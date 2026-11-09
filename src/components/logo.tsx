import Link from "next/link";

export function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="flex items-center gap-2" aria-label="ReelBhai Academy home">
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-gold text-lg font-black text-ink">🦁</span>
      <span className="font-display text-xl text-white">
        Reel<span className="text-gold">Bhai</span>
      </span>
    </Link>
  );
}
