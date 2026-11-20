/** EXPLORE — everything Get Udaan sells, marked Owned / Upgrade / New for this student. New courses appear here automatically. */
import type { Metadata } from "next";
import { AppFrame } from "@/components/app/app-frame";
import { CatalogCard } from "@/components/app/catalog-card";
import { EmptyState, Highlight } from "@/components/ui/basics";
import t from "@/content/hi-Latn/student.json";
import { requireUser } from "@/server/auth";
import { getSettings, supportWhatsappHref } from "@/server/settings";
import { getCatalogFor } from "@/server/student-app";

export const metadata: Metadata = { title: "Explore", robots: { index: false } };

const ORDER = { upgrade: 0, new: 1, owned: 2 } as const;

export default async function Explore() {
  const user = await requireUser("/dashboard/explore");
  const [catalog, settings] = await Promise.all([getCatalogFor(user.id), getSettings()]);
  const items = [...catalog].sort((a, b) => ORDER[a.state] - ORDER[b.state]);
  const e = t.explore;
  return (
    <AppFrame user={user} mode="student" active="explore" supportHref={supportWhatsappHref(settings)}>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-1">
          <h1 className="type-heading text-ink">
            <Highlight text={e.title} />
          </h1>
          <p className="text-ink-muted">{e.sub}</p>
        </div>
        {items.length === 0 ? (
          <EmptyState text={e.empty} />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((c) => (
              <CatalogCard key={c.slug} item={c} />
            ))}
          </div>
        )}
      </div>
    </AppFrame>
  );
}
