"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Opens the phone/computer print screen — choose "Save as PDF" there to keep a copy. */
export function PrintButton({ label }: { label: string }) {
  return (
    <Button variant="secondary" block onClick={() => window.print()}>
      <span className="inline-flex items-center gap-2">
        <Printer aria-hidden className="size-5" />
        {label}
      </span>
    </Button>
  );
}
