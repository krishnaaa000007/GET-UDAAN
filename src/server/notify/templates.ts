/**
 * Email templates (plain HTML strings — light, render well in Gmail on phones).
 * Hinglish for students/leads/partners. Edit copy here.
 */
import { formatINR } from "@/lib/money";

const BRAND = "Get Udaan";

function layout(title: string, body: string): string {
  return `<!doctype html><html><body style="margin:0;background:#f4f1ea;font-family:Poppins,Arial,sans-serif;color:#111">
<div style="max-width:520px;margin:0 auto;padding:24px 16px">
  <div style="background:#0b0b0f;color:#ffb627;font-weight:800;font-size:20px;padding:16px 20px;border-radius:12px 12px 0 0;letter-spacing:.5px">${BRAND}</div>
  <div style="background:#fff;padding:24px 20px;border-radius:0 0 12px 12px">
    <h1 style="font-size:20px;margin:0 0 12px">${title}</h1>
    ${body}
  </div>
  <p style="font-size:12px;color:#666;text-align:center;margin-top:16px">${BRAND} · Ye email aapko isliye mila kyunki aapne humari website use ki.</p>
</div></body></html>`;
}

function button(href: string, label: string): string {
  return `<p style="margin:20px 0"><a href="${href}" style="display:inline-block;background:#ffb627;color:#111;font-weight:700;padding:14px 22px;border-radius:10px;text-decoration:none">${label}</a></p>`;
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

type Rendered = { subject: string; html: string; text: string };

export const templates = {
  loginOtp: (d: { code: string }): Rendered => ({
    subject: `${d.code} — aapka login code`,
    html: layout("Aapka login code", `<p>Ye code 10 minute tak valid hai:</p><p style="font-size:32px;font-weight:800;letter-spacing:8px">${d.code}</p><p style="color:#666;font-size:13px">Agar aapne login try nahi kiya, is email ko ignore karein.</p>`),
    text: `Aapka login code: ${d.code} (10 minute valid)`,
  }),

  purchaseConfirmation: (d: { name: string; orderNumber: number; items: string[]; totalPaise: number; loginUrl: string; supportWhatsapp: string }): Rendered => ({
    subject: `Welcome ${d.name.split(" ")[0]}! Aapka course ready hai 🎬`,
    html: layout(
      `Payment successful — welcome to ${BRAND}! 🦁`,
      `<p>Namaste ${esc(d.name)},</p><p>Order #${d.orderNumber} confirm ho gaya:</p>
       <ul>${d.items.map((i) => `<li>${esc(i)}</li>`).join("")}</ul>
       <p><b>Total paid: ${formatINR(d.totalPaise)}</b></p>
       ${button(d.loginUrl, "Lesson 1 shuru karein →")}
       <p style="font-size:13px;color:#666">Ye login link 7 din valid hai. Baad mein apne email se kabhi bhi login kar sakte hain.</p>
       ${d.supportWhatsapp ? `<p style="font-size:13px">Koi problem? WhatsApp karein: ${esc(d.supportWhatsapp)}</p>` : ""}`,
    ),
    text: `Payment successful! Order #${d.orderNumber}. Total ${formatINR(d.totalPaise)}. Start learning: ${d.loginUrl}`,
  }),

  partnerApplicationReceived: (d: { name: string }): Rendered => ({
    subject: "Partner application mil gayi ✅",
    html: layout("Application received", `<p>Hi ${esc(d.name)}, aapki partner application humein mil gayi hai. Hum 24–48 ghante mein review karke aapko email karenge.</p>`),
    text: `Hi ${d.name}, aapki partner application mil gayi. 24–48 ghante mein update milega.`,
  }),

  partnerApproved: (d: { name: string; link: string; coupon: string; dashboardUrl: string; inviteLink?: string }): Rendered => ({
    subject: "Aap Get Udaan partner ban gaye! 🎉",
    html: layout(
      "Welcome, partner! 🦁",
      `<p>Hi ${esc(d.name)}, aapki application approve ho gayi.</p>
       <p><b>Aapka link:</b><br><code>${esc(d.link)}</code></p>
       <p><b>Aapka coupon:</b> <code>${esc(d.coupon)}</code></p>
       ${d.inviteLink ? `<p><b>Doosre creators ko partner banane ka invite link:</b><br><code>${esc(d.inviteLink)}</code></p>` : ""}
       ${button(d.dashboardUrl, "Partner dashboard kholein")}`,
    ),
    text: `Approved! Link: ${d.link} Coupon: ${d.coupon}${d.inviteLink ? ` Invite: ${d.inviteLink}` : ""} Dashboard: ${d.dashboardUrl}`,
  }),

  partnerRejected: (d: { name: string; reason: string }): Rendered => ({
    subject: "Partner application update",
    html: layout("Application update", `<p>Hi ${esc(d.name)}, abhi hum aapki application approve nahi kar paye.</p><p>${esc(d.reason)}</p>`),
    text: `Hi ${d.name}, application approve nahi hui: ${d.reason}`,
  }),

  payoutUpdate: (d: { name: string; subject: string; status: string; amountPaise: number; reference: string | null; reason: string | null }): Rendered => ({
    subject: d.subject,
    html: layout(
      d.subject,
      `<p>Hi ${esc(d.name)},</p><p>Aapki withdrawal request (<b>${formatINR(d.amountPaise)}</b>) ka status: <b>${esc(d.status)}</b></p>
       ${d.reference ? `<p>Payment reference (UTR): <code>${esc(d.reference)}</code></p>` : ""}
       ${d.reason ? `<p>Reason: ${esc(d.reason)}</p>` : ""}`,
    ),
    text: `${d.subject} — ${formatINR(d.amountPaise)} — ${d.status}${d.reference ? ` — Ref ${d.reference}` : ""}`,
  }),

  partnerNewSale:(d: { name: string; productName: string; commissionPaise: number; availableOn: string; dashboardUrl: string }): Rendered => ({
    subject: `Nayi sale! +${formatINR(d.commissionPaise)} 🔥`,
    html: layout(
      "Aapke link se nayi sale aayi! 🔥",
      `<p>Hi ${esc(d.name)},</p><p><b>${esc(d.productName)}</b> bika. Aapki commission: <b>${formatINR(d.commissionPaise)}</b></p>
       <p>Refund window ke baad (${esc(d.availableOn)}) ye withdraw ke liye available hogi.</p>${button(d.dashboardUrl, "Dashboard dekhein")}`,
    ),
    text: `Nayi sale! ${d.productName}. Commission ${formatINR(d.commissionPaise)}, available on ${d.availableOn}.`,
  }),

  adminNewPartnerApplication: (d: { name: string; instagram: string; followers: number; adminUrl: string }): Rendered => ({
    subject: `New partner application: @${d.instagram}`,
    html: layout("New partner application", `<p>${esc(d.name)} (@${esc(d.instagram)}, ${d.followers.toLocaleString("en-IN")} followers) applied.</p>${button(d.adminUrl, "Review")}`),
    text: `New partner application: ${d.name} @${d.instagram} (${d.followers} followers) ${d.adminUrl}`,
  }),

  serviceUpdate: (d: { name: string; title: string; text: string; url: string; cta: string }): Rendered => ({
    subject: d.title,
    html: layout(esc(d.title), `<p>Namaste ${esc(d.name)},</p><p style="white-space:pre-line">${esc(d.text)}</p>${button(d.url, esc(d.cta))}`),
    text: `${d.title}\n\n${d.text}\n\n${d.url}`,
  }),
};

export type TemplateName = keyof typeof templates;
export type TemplateData<T extends TemplateName> = Parameters<(typeof templates)[T]>[0];
