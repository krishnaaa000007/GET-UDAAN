"use client";

import Link from "next/link";
import { useState } from "react";
import { ProtectedPlayer } from "@/components/player/protected-player";

type Props = React.ComponentProps<typeof ProtectedPlayer> & { nextHref: string | null };

export function LessonPlayer({ nextHref, ...player }: Props) {
  const [done, setDone] = useState(false);
  return (
    <div>
      <ProtectedPlayer {...player} onComplete={() => setDone(true)} />
      {done && (
        <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-good/40 bg-good/10 p-3 text-sm">
          <span className="text-good">✓ Lesson complete! Shabaash 🦁</span>
          {nextHref && (
            <Link href={nextHref} className="font-semibold text-gold">
              Next lesson →
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
