/**
 * Notifications. Every message goes through `notify()` so that a WhatsApp channel
 * can be plugged in later without touching the callers.
 *
 * Dev (no RESEND_API_KEY): emails are printed to the console and saved as
 * .html files in ./.local-mail so you can open them in a browser.
 */
import "server-only";
import fs from "node:fs/promises";
import path from "node:path";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { templates, type TemplateName, type TemplateData } from "./templates";

export interface Channel {
  name: "email" | "whatsapp";
  send(to: string, subject: string, html: string, text: string): Promise<{ providerId?: string }>;
}

const resendChannel: Channel = {
  name: "email",
  async send(to, subject, html, text) {
    const { Resend } = await import("resend");
    const resend = new Resend(env.resendKey!);
    const r = await resend.emails.send({ from: env.emailFrom, to, subject, html, text });
    if (r.error) throw new Error(r.error.message);
    return { providerId: r.data?.id };
  },
};

const devMailChannel: Channel = {
  name: "email",
  async send(to, subject, html, text) {
    const dir = path.resolve(process.cwd(), ".local-mail");
    await fs.mkdir(dir, { recursive: true });
    const file = `${Date.now()}-${to.replace(/[^a-z0-9]/gi, "_")}.html`;
    await fs.writeFile(path.join(dir, file), `<!-- to: ${to} | subject: ${subject} -->\n${html}`);
    if (!process.env.MAIL_SILENT) console.log(`\n📧 [dev email] to=${to}\n   subject: ${subject}\n${text}\n   (saved: .local-mail/${file})\n`);
    return { providerId: `dev:${file}` };
  },
};

function emailChannel(): Channel {
  return env.resendKey ? resendChannel : devMailChannel;
}

/** Sends one email and logs it. Never throws; returns false when the email could not be sent (callers that depend on it, like login codes, can tell the user). */
export async function notify<T extends TemplateName>(to: string, template: T, data: TemplateData<T>): Promise<boolean> {
  const { subject, html, text } = templates[template](data as never);
  const channel = emailChannel();
  try {
    const r = await channel.send(to, subject, html, text);
    await db.messageLog.create({ data: { channel: channel.name, to, template, status: "sent", providerId: r.providerId } });
    return true;
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e);
    console.error(`notify(${template}) failed:`, error);
    await db.messageLog.create({ data: { channel: channel.name, to, template, status: "failed", error } });
    return false;
  }
}
