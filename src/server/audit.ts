import "server-only";
import { db, type Tx } from "@/lib/db";

/** Record a sensitive action (commission change, refund, payout, price change, approvals). */
export async function audit(
  entry: { actorId: string | null; action: string; entity: string; entityId?: string | null; before?: unknown; after?: unknown },
  tx: Tx | typeof db = db,
) {
  await tx.auditLog.create({
    data: {
      actorId: entry.actorId,
      action: entry.action,
      entity: entry.entity,
      entityId: entry.entityId ?? null,
      before: (entry.before ?? undefined) as never,
      after: (entry.after ?? undefined) as never,
    },
  });
}
