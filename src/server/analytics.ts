/**
 * Server-side conversion events (they work even when ad-blockers stop the browser pixel).
 *  - Meta Conversions API: Purchase, with event_id = order id so it de-duplicates with the browser Pixel.
 *  - GA4 Measurement Protocol: purchase.
 * Both are skipped silently when not configured.
 */
import "server-only";
import { sha256 } from "@/lib/crypto";
import { env } from "@/lib/env";
import { getSettings } from "@/server/settings";

type OrderLike = { id: string; email: string; phone: string; totalPaise: number; visitorId: string | null; items: { name: string; unitPaise: number }[] };

export async function sendServerPurchaseEvents(order: OrderLike) {
  const settings = await getSettings();
  const pixelId = settings.metaPixelId || env.metaPixelId;
  const value = order.totalPaise / 100;

  if (pixelId && env.metaCapiToken) {
    try {
      await fetch(`https://graph.facebook.com/v21.0/${pixelId}/events?access_token=${env.metaCapiToken}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          data: [
            {
              event_name: "Purchase",
              event_time: Math.floor(Date.now() / 1000),
              event_id: order.id,
              action_source: "website",
              user_data: { em: [sha256(order.email.trim().toLowerCase())], ph: [sha256(`91${order.phone}`)], country: [sha256("in")] },
              custom_data: { currency: "INR", value, content_type: "product", contents: order.items.map((i) => ({ id: i.name, quantity: 1, item_price: i.unitPaise / 100 })) },
            },
          ],
        }),
      });
    } catch (e) {
      console.error("Meta CAPI failed", e);
    }
  }

  const ga4 = settings.ga4Id || env.ga4Id;
  if (ga4 && env.ga4ApiSecret) {
    try {
      await fetch(`https://www.google-analytics.com/mp/collect?measurement_id=${ga4}&api_secret=${env.ga4ApiSecret}`, {
        method: "POST",
        body: JSON.stringify({
          client_id: order.visitorId ?? order.id,
          events: [{ name: "purchase", params: { transaction_id: order.id, currency: "INR", value, items: order.items.map((i) => ({ item_name: i.name, price: i.unitPaise / 100 })) } }],
        }),
      });
    } catch (e) {
      console.error("GA4 MP failed", e);
    }
  }
}
