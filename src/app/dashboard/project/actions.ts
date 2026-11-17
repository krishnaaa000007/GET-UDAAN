"use server";

import { revalidatePath } from "next/cache";
import t from "@/content/hi-Latn/student.json";
import { getCurrentUser } from "@/server/auth";
import { addClientMessage } from "@/server/service";

export type MessageState = { ok: boolean; error?: string; draft?: string };

/** Client sends a message to the team. The project is always found from the logged-in user — never from the form. */
export async function sendMessageAction(_prev: MessageState, form: FormData): Promise<MessageState> {
  const draft = String(form.get("body") ?? "");
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: t.project.errors.generic, draft };
  try {
    const r = await addClientMessage(user, draft);
    if (!r.ok) return { ok: false, error: t.project.errors[r.error], draft };
    revalidatePath("/dashboard/project");
    return { ok: true };
  } catch (e) {
    console.error("client message failed", e);
    return { ok: false, error: t.project.errors.generic, draft };
  }
}
