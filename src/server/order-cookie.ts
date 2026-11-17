/** Is this browser the one that started this order? (signed cookie set at checkout) */
import "server-only";
import { cookies } from "next/headers";
import { hmac } from "@/lib/crypto";

export async function browserOwnsOrder(orderId: string): Promise<boolean> {
  const v = (await cookies()).get("rb_order")?.value ?? "";
  const [id, sig] = v.split(".");
  return id === orderId && sig === hmac(`order:${orderId}`).slice(0, 24);
}

/** The id of the order this browser last started (verified), or null. */
export async function ownedOrderId(): Promise<string | null> {
  const v = (await cookies()).get("rb_order")?.value ?? "";
  const [id, sig] = v.split(".");
  return id && sig === hmac(`order:${id}`).slice(0, 24) ? id : null;
}
