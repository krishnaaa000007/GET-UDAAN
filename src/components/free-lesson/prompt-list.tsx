"use client";

// The 20 free prompts: each one in a sunken "prompt box" with a Copy button.
// The first few are visible; the rest open with one tap so the page stays short on a phone.
import { Copy } from "lucide-react";
import { toast, ToastRegion } from "@/components/ui/interactive";
import t from "@/content/hi-Latn/free-lesson.json";
import { track } from "@/lib/track";

const VISIBLE = 3;

function PromptRow({ n, text }: { n: number; text: string }) {
  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(t.prompts.copied);
      track("cta_click", { id: "free_prompt_copy", n });
    } catch {
      toast.error(t.prompts.copyFailed);
    }
  }
  return (
    <li className="flex flex-col rounded-sm border border-line bg-surface-sunken px-4 pt-2 sm:flex-row sm:items-start sm:gap-3 sm:pr-2 sm:pb-2">
      <span aria-hidden className="type-heading flex-none pt-2 text-gold-text sm:w-7">
        {n}
      </span>
      {/* Prompts are English (AI tools understand English best), so tell screen readers. */}
      <p lang="en" className="flex-1 py-2 text-ink select-all">
        {text}
      </p>
      <button type="button" onClick={copy} aria-label={t.prompts.copyLabel.replace("{n}", String(n))} className="type-small inline-flex min-h-12 flex-none items-center gap-1 self-end rounded-sm px-3 font-semibold text-gold-text sm:self-start">
        <Copy aria-hidden className="size-5" />
        {t.prompts.copy}
      </button>
    </li>
  );
}

export function PromptList() {
  const items = t.prompts.items;
  return (
    <>
      <ToastRegion />
      <ol className="flex flex-col gap-2">
        {items.slice(0, VISIBLE).map((p, i) => (
          <PromptRow key={i} n={i + 1} text={p} />
        ))}
      </ol>
      {items.length > VISIBLE && (
        <details className="accordion-item group mt-2">
          <summary className="type-button flex min-h-12 cursor-pointer items-center justify-center rounded-md border-2 border-ink px-6 text-ink group-open:hidden">{t.prompts.showAll}</summary>
          <ol start={VISIBLE + 1} className="flex flex-col gap-2">
            {items.slice(VISIBLE).map((p, i) => (
              <PromptRow key={i} n={VISIBLE + i + 1} text={p} />
            ))}
          </ol>
        </details>
      )}
    </>
  );
}
