"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/server/auth";
import { addProjectFile, addTeamMessage, removeProjectFile, setProjectStage } from "@/server/service";

type Result = { ok: boolean; error?: string };
const refresh = () => {
  revalidatePath("/admin/projects");
  revalidatePath("/dashboard/project");
};

export async function setStageAction(_: Result, form: FormData): Promise<Result> {
  const admin = await requireAdmin();
  const r = await setProjectStage(admin.id, String(form.get("projectId")), Number(form.get("stage")));
  if (r.ok) refresh();
  return r;
}

export async function addFileAction(_: Result, form: FormData): Promise<Result> {
  const admin = await requireAdmin();
  const r = await addProjectFile(admin.id, String(form.get("projectId")), { stage: Number(form.get("stage")), title: String(form.get("title") ?? ""), url: String(form.get("url") ?? "") });
  if (r.ok) refresh();
  return r;
}

export async function removeFileAction(form: FormData) {
  const admin = await requireAdmin();
  await removeProjectFile(admin.id, String(form.get("fileId")));
  refresh();
}

export async function replyAction(_: Result, form: FormData): Promise<Result> {
  const admin = await requireAdmin();
  const r = await addTeamMessage(admin.id, String(form.get("projectId")), String(form.get("body") ?? ""));
  if (r.ok) refresh();
  return r;
}
