/**
 * DONE-WITH-YOU CLIENT TRACKER — one project per paid Done-with-you order.
 * SECURITY: every function takes the user from the session (client) or is called only after requireAdmin (team).
 * A client can only ever read or write THEIR OWN project.
 */
import "server-only";
import dwy from "@/content/hi-Latn/done-with-you.json";
import student from "@/content/hi-Latn/student.json";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { audit } from "@/server/audit";
import { notify } from "@/server/notify";
import { rateLimit } from "@/server/rate-limit";
import { getSettings } from "@/server/settings";

/** Stage names + descriptions come from the Done-with-you page content, so both always match. */
export const SERVICE_STAGES = dwy.process.steps;
export const STAGE_DONE = SERVICE_STAGES.length; // stage value meaning "everything finished"

const E = student.project.email;
const trackerUrl = () => `${env.appUrl}/dashboard/project`;
const include = { files: { orderBy: { createdAt: "asc" as const } }, messages: { orderBy: { createdAt: "asc" as const } } };

/**
 * The logged-in client's project (newest first). If they paid for Done-with-you before the tracker existed,
 * the project is created now from that paid order.
 */
export async function getClientProject(userId: string) {
  const existing = await db.serviceProject.findFirst({ where: { userId }, orderBy: { createdAt: "desc" }, include });
  if (existing) return existing;
  const order = await db.order.findFirst({ where: { userId, status: "PAID", items: { some: { product: { kind: "SERVICE" } } } }, orderBy: { paidAt: "desc" }, select: { id: true } });
  if (!order) return null;
  await db.serviceProject.upsert({ where: { orderId: order.id }, create: { orderId: order.id, userId }, update: {} });
  return db.serviceProject.findFirst({ where: { userId }, orderBy: { createdAt: "desc" }, include });
}

/** A message from the CLIENT to the team. Emails the support address so nobody has to keep checking the admin page. */
export async function addClientMessage(user: { id: string; name: string | null; email: string }, body: string): Promise<{ ok: true } | { ok: false; error: "empty" | "rate" | "generic" }> {
  const text = body.trim().slice(0, 2000);
  if (!text) return { ok: false, error: "empty" };
  if (!(await rateLimit(`svcmsg:${user.id}`, 20, 3600)).ok) return { ok: false, error: "rate" };
  const project = await getClientProject(user.id);
  if (!project) return { ok: false, error: "generic" };
  await db.serviceMessage.create({ data: { projectId: project.id, authorId: user.id, fromTeam: false, body: text } });
  const settings = await getSettings();
  const teamInbox = settings.supportEmail || env.adminEmail;
  if (teamInbox) await notify(teamInbox, "serviceUpdate", {
    name: "team",
    title: `Done-with-you: new message from ${user.name ?? user.email}`,
    text,
    url: `${env.appUrl}/admin/projects`,
    cta: "Open projects",
  });
  return { ok: true };
}

// ───────────── Team (admin) side — call only after requireAdmin() ─────────────

export async function listProjectsForAdmin() {
  const projects = await db.serviceProject.findMany({ orderBy: { updatedAt: "desc" }, include });
  const [users, orders] = await Promise.all([
    db.user.findMany({ where: { id: { in: projects.map((p) => p.userId) } }, select: { id: true, name: true, email: true, phone: true } }),
    db.order.findMany({ where: { id: { in: projects.map((p) => p.orderId) } }, select: { id: true, number: true, paidAt: true, status: true } }),
  ]);
  const userById = new Map(users.map((u) => [u.id, u]));
  const orderById = new Map(orders.map((o) => [o.id, o]));
  return projects.map((p) => ({ ...p, client: userById.get(p.userId) ?? null, order: orderById.get(p.orderId) ?? null }));
}

async function clientOf(projectId: string) {
  const project = await db.serviceProject.findUnique({ where: { id: projectId } });
  if (!project) return null;
  const client = await db.user.findUnique({ where: { id: project.userId }, select: { name: true, email: true } });
  return client ? { project, client } : null;
}

export async function setProjectStage(adminId: string, projectId: string, stage: number) {
  if (!Number.isInteger(stage) || stage < 0 || stage > STAGE_DONE) return { ok: false as const, error: "Invalid stage" };
  const found = await clientOf(projectId);
  if (!found) return { ok: false as const, error: "Project not found" };
  if (found.project.stage === stage) return { ok: true as const };
  await db.serviceProject.update({ where: { id: projectId }, data: { stage } });
  await audit({ actorId: adminId, action: "service.stage", entity: "ServiceProject", entityId: projectId, before: { stage: found.project.stage }, after: { stage } });
  const name = stage < STAGE_DONE ? SERVICE_STAGES[stage].title : "";
  await notify(found.client.email, "serviceUpdate", {
    name: found.client.name ?? "",
    title: stage < STAGE_DONE ? E.stageTitle.replace("{stage}", name) : E.doneTitle,
    text: stage < STAGE_DONE ? E.stageText.replace("{stage}", name) : E.doneText,
    url: trackerUrl(),
    cta: E.cta,
  });
  return { ok: true as const };
}

export async function addProjectFile(adminId: string, projectId: string, input: { stage: number; title: string; url: string }) {
  const title = input.title.trim().slice(0, 120);
  const url = input.url.trim().slice(0, 500);
  if (!title) return { ok: false as const, error: "Give the file a title" };
  if (!/^https:\/\/\S+$/.test(url)) return { ok: false as const, error: "Link must start with https://" };
  if (!Number.isInteger(input.stage) || input.stage < 0 || input.stage >= STAGE_DONE) return { ok: false as const, error: "Invalid stage" };
  const found = await clientOf(projectId);
  if (!found) return { ok: false as const, error: "Project not found" };
  const file = await db.serviceFile.create({ data: { projectId, stage: input.stage, title, url } });
  await db.serviceProject.update({ where: { id: projectId }, data: { updatedAt: new Date() } });
  await audit({ actorId: adminId, action: "service.file_add", entity: "ServiceFile", entityId: file.id, after: { title } });
  await notify(found.client.email, "serviceUpdate", { name: found.client.name ?? "", title: E.fileTitle, text: E.fileText.replace("{title}", title), url: trackerUrl(), cta: E.cta });
  return { ok: true as const };
}

export async function removeProjectFile(adminId: string, fileId: string) {
  const file = await db.serviceFile.findUnique({ where: { id: fileId } });
  if (!file) return;
  await db.serviceFile.delete({ where: { id: fileId } });
  await audit({ actorId: adminId, action: "service.file_remove", entity: "ServiceFile", entityId: fileId, before: { title: file.title } });
}

export async function addTeamMessage(adminId: string, projectId: string, body: string) {
  const text = body.trim().slice(0, 2000);
  if (!text) return { ok: false as const, error: "Message is empty" };
  const found = await clientOf(projectId);
  if (!found) return { ok: false as const, error: "Project not found" };
  await db.serviceMessage.create({ data: { projectId, authorId: adminId, fromTeam: true, body: text } });
  await db.serviceProject.update({ where: { id: projectId }, data: { updatedAt: new Date() } });
  await notify(found.client.email, "serviceUpdate", { name: found.client.name ?? "", title: E.messageTitle, text, url: trackerUrl(), cta: E.cta });
  return { ok: true as const };
}
