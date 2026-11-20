/** A course/service from the catalog, marked Owned / Upgrade / New for this student. Used on Home and Explore. */
import { Check } from "lucide-react";
import { Badge } from "@/components/ui/basics";
import { Button } from "@/components/ui/button";
import t from "@/content/hi-Latn/student.json";
import { formatINR } from "@/lib/money";
import type { CatalogItem } from "@/server/student-app";

export function CatalogCard({ item, compact = false }: { item: CatalogItem; compact?: boolean }) {
  const e = t.explore;
  const owned = item.state === "owned";
  return (
    <article className="flex flex-col gap-3 rounded-lg border border-line bg-surface-raised p-4 md:p-5">
      <div className="flex items-start justify-between gap-3">
        <h3 className="type-title text-ink">{item.name}</h3>
        <Badge tone={owned ? "neutral" : "gold"}>{owned ? e.owned : item.state === "upgrade" ? e.upgrade : e.fresh}</Badge>
      </div>
      {item.tagline && <p className="type-small text-ink-muted">{item.tagline}</p>}
      {!compact && item.features.length > 0 && (
        <ul className="flex flex-col gap-1.5">
          {item.features.slice(0, 4).map((f) => (
            <li key={f} className="type-small flex items-start gap-2 text-ink">
              <Check aria-hidden className="mt-0.5 size-4 flex-none text-success" strokeWidth={2.5} />
              {f}
            </li>
          ))}
        </ul>
      )}
      <div className="mt-auto flex items-center justify-between gap-3 pt-1">
        {!owned && <span className="type-title text-ink tabular-nums">{formatINR(item.pricePaise)}</span>}
        {owned ? (
          <Button href={item.kind === "SERVICE" ? "/dashboard/project" : "/dashboard/courses"} variant="ghost" arrow>
            {e.open}
          </Button>
        ) : (
          <Button href={item.href} variant="secondary" arrow data-cta={`explore_${item.slug}`}>
            {item.state === "upgrade" ? e.upgradeCta : item.kind === "SERVICE" ? e.details : e.join}
          </Button>
        )}
      </div>
    </article>
  );
}
