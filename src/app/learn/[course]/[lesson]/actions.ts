"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/server/auth";
import { setLessonCompletion } from "@/server/learning";

/** "Mark complete" toggle. Returns the new state, or ok:false if it could not be saved. */
export async function setLessonCompleteAction(lessonId: string, complete: boolean) {
  const user = await getCurrentUser();
  if (!user) return { ok: false as const };
  const r = await setLessonCompletion(user.id, lessonId, complete);
  if (r.ok) revalidatePath("/dashboard");
  return r;
}
