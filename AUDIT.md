# Get Udaan — Functionality Audit (before building)

Date: 2026-11-18 · Scope: the "Functionality Audit + Build Prompt" brief · Code: commit `1abab01` (staging)

Legend: ✅ done · ⚠️ partly · ❌ missing. Nothing has been changed yet; this file is the "before" state.

---

## A. Things to know before reading the table

1. **One referenced brief is missing.** `GETUDAAN_WEBSITE_UPGRADE_PROMPT.md` is not in the repo or in Downloads. The home-page order in §7 (masterclass block, "Udaan system" steps named Trend / Character / Brand-friendly Theme / Teen Income / Scale, testimonial videos, mentor + example pages) comes from it. Without it, section §7 can only be built from the one-line descriptions in this brief.
2. **One setting does two jobs today.** `refundWindowDays = 7` is both the buyer's refund guarantee (shown on home, checkout, refund policy) and the partner commission waiting period. The new rule (commission released after 1 hour, buyer refund guarantee stays 7 days) means splitting it into two settings.
3. **The refund rule is reversed today.** A refund currently reverses the partner's commission (and pushes the wallet negative if already paid), and pending commissions on refunded orders are never released. The new rule ("Get Udaan absorbs refunds") is the opposite. This is a deliberate money decision, so it is in the decisions list below.
4. **The 1-hour release needs a scheduler.** The release job exists (`/api/cron/run`) but nothing calls it on staging. Vercel's free plan only runs scheduled jobs once a day; the plan in the README (Supabase `pg_cron`, free, every 5 minutes) fits. Commissions are also released whenever a partner or admin opens their dashboard.
5. **Settings live in the database today, not in `config/*.ts`.** Rules that admin may change (refund days, minimum withdrawal, TDS, coupon discount) are in the `Setting` table with code defaults in `src/server/settings.ts`; commission rates are per product in the database. Plan: fixed rules in `config/partners.ts` + `config/site.ts`, admin-changeable values stay in Settings with config as the default.

---

## B. Audit checklist (brief §8)

| Area | Item | Status | Notes | Files |
|---|---|---|---|---|
| Config | All numbers in config, no "7 days" left | ❌ | Numbers split across `settings.ts` defaults, product rows (commission %) and `proxy.ts` (cookie 90 days). "7 days" commission wording on `/partners` (payout steps + FAQ), partner dashboard ("7-din refund window", formula box), Terms ("pending during the refund window"), admin settings label. *Keep*: "login link 7 din valid hai" (unrelated) and the buyer's 7-day refund. | `src/server/settings.ts`, `src/proxy.ts`, `src/content/hi-Latn/partner.json`, `src/app/partner/page.tsx`, `src/app/(public)/legal/[page]/page.tsx`, `src/app/admin/settings/page.tsx`, `src/server/payments/fulfil.ts` |
| Attribution | `?ref` 30-day cookie, coupon wins, last click, self-purchase blocked | ⚠️ | Cookie lives 90 days but only clicks within `attributionWindowDays` (30) count at checkout, so behaviour = 30 days ✅. Partner coupon wins ✅. Last click ✅, lead fallback ✅. Self-purchase blocked only by same user account or same email — **not** phone, payment method or device. | `src/server/attribution.ts`, `src/server/checkout.ts`, `src/proxy.ts` |
| Attribution | FIRST100 keeps partner credit | ⚠️ | Logic already correct: only coupons that belong to a partner override the cookie, so a non-partner coupon keeps the click's credit. But the `FIRST100` coupon does not exist yet. | `src/server/attribution.ts`, `src/server/checkout.ts` |
| Approval | Instant admin alert, 1-tap approve, waiting timer | ⚠️ | Admin **email** alert ✅ (only if `ADMIN_EMAIL` set). No WhatsApp alert (no WhatsApp provider connected). No signed one-tap Approve/Reject links. Admin list is newest-first, no waiting timer. Applicant copy says "48 ghante", not "1–2 ghante". Approval email ✅ (link + coupon), no invite link. | `src/server/partners.ts`, `src/app/admin/partners/page.tsx`, `src/server/notify/templates.ts`, `partner.json` |
| Commission | Created on webhook (idempotent), release after 60 min, job idempotent | ⚠️ | Created only from the verified webhook, idempotent (event id + order status flip + unique order/partner) ✅. Release after **7 days**, not 60 min ❌. Release job idempotent ✅ (status-guarded update + ledger row). Job not scheduled ❌. No countdown on pending rows (shows a date). | `src/server/payments/fulfil.ts`, `src/server/partners.ts`, `src/app/api/cron/[job]/route.ts` |
| Refund | Refund does not reverse released commission/bonus | ❌ | Opposite today: refunds reverse commissions (ledger −amount) and refunded orders' pending commissions are never released. | `src/server/partners.ts` (`reverseCommissionsForRefund`, `approveDueCommissions`), `src/server/payments/fulfil.ts` |
| Fraud | Self-purchase block, refund-rate flag, freeze, ledger | ⚠️ | Self-purchase: email/account only ⚠️. Refund-rate flag ❌. Freeze ❌: a `SUSPENDED` status exists in the database but nothing in the app uses it, and suspended partners would *lose* new commissions rather than have them held. Ledger ✅: `PartnerLedger` is append-only with type, amount, commission/payout id; admin actions also go to `AuditLog`. | `prisma/schema.prisma`, `src/server/partners.ts`, `src/server/attribution.ts` |
| Team | `referred_by` + `team_l1`/`team_l2`, no cycles, no bonus-on-bonus | ❌ | Nothing exists. Note: commissions are unique per (order, partner) and have no `type`; the schema change must add `type` + `source_commission_id` and relax that rule. | `prisma/schema.prisma` |
| Invite | `?invite=` / `/j/CODE`, cookie, auto-filled referral field, change link | ❌ | Nothing exists. Partner code = coupon code today, so the invite code can reuse it. | — |
| Dashboard | Overview, Sales, Team, Wallet, Formula, payout details after approval | ⚠️ | One long page (not tabs) with earnings, quick actions, stats, chart, campaigns, sales (masked buyer), milestones, promo kit, withdraw, payout details, formula ✅. Team ❌. Wallet not split by sale/team ❌. Payout details are **also** asked in step 3 of the application ⚠️ (brief wants them only after approval). | `src/app/partner/*`, `src/server/partner-dashboard.ts`, `src/app/(public)/partners/apply-form.tsx` |
| Withdraw | Min ₹500, UPI/bank, payout history, TDS | ✅ | Minimum ₹500, UPI or bank, history with status + reference (UTR), TDS shown when the rate is set (now 0%). Frozen-partner block ❌ (no freeze yet). | `src/server/partners.ts`, `src/app/partner/*` |
| Admin | Queue, partners + tree, payouts CSV, ledger, refunds report | ⚠️ | Applications queue ✅ (newest first, no timer). Per-partner rate override ✅. Payouts queue + CSV export ✅ (orders + payouts). Team tree ❌. Ledger viewer ❌. Refunds-per-partner report ❌. Freeze/unfreeze ❌. | `src/app/admin/partners`, `src/app/admin/payouts`, `src/app/api/admin/export/[kind]` |
| Home | All sections in §7 order, real media, no empty boxes | ⚠️ | Built: hero, (reel wall when media exists), problem, ways to earn + disclaimer, 5 steps (old names), curriculum, bonuses, testimonials (hidden < 3), founder block (hidden until filled), pricing, guarantee, FAQ, partner block, final CTA, sticky bar. Missing: masterclass block, FIRST100 chip, testimonial-video section, mentor + example pages, quote above pricing, new step names. No real media uploaded (no empty boxes are shown — they hide). | `src/app/(public)/page.tsx`, `src/content/hi-Latn/landing.json` |
| Masterclass | `/masterclass` + home block + FIRST100 auto-apply | ❌ | Not built. `?coupon=` auto-apply at checkout already works ✅ (cookie → prefilled + applied). | `src/proxy.ts`, `src/app/(checkout)/checkout/[slug]/page.tsx` |
| Testimonials | Section, CMS, ≥3 rule, consent, disclaimer | ⚠️ | Section + admin publish/hide ✅, hidden until 3 ✅, students can submit their own (unpublished, consent recorded in the audit log) ✅, income disclaimer when money is mentioned ✅. Admin-added testimonials have no consent date or proof field ❌. No video testimonials ❌. | `prisma/schema.prisma` (`Testimonial`), `src/app/admin/content`, `src/app/dashboard/share-result.tsx` |
| Free lesson | Form gate, video, prompts | ⚠️ | Video + 20 prompts + download ✅. The lead form is an optional pop-up on the home page, **not a gate**: `/free-lesson` opens without it. | `src/components/free-lesson/*`, `src/components/landing/islands.tsx` |
| Legal | Real contact details, refund policy, partner terms with team bonus | ⚠️ | Terms, Privacy, Refund, Contact pages ✅. Contact details are placeholders (`+91 90000 00000`, `support@yourdomain.com`, empty address). Partner terms are one paragraph inside Terms; no separate partner terms, no team-bonus clause. | `src/app/(public)/legal/[page]/page.tsx`, `src/server/settings.ts` |
| SEO/Share | OG images incl. invite links | ❌ | No share images at all (only a basic site name/description). | `src/app/layout.tsx` |

---

## C. Decisions only you can make (please confirm before I build)

1. **Refunds absorbed by Get Udaan.** Today a refund takes the commission back. The brief flips that: commissions and team bonuses are paid even when the buyer is refunded, including refunds inside the first hour. Combined with a 1-hour release, a partner (or a partner + friend) could buy, get paid, then refund. The fraud guard (freeze, refund-rate flag, self-purchase checks) reduces this but cannot stop it. Confirm you accept this cost.
2. **Team bonus and Indian law — please get it checked.** Paying partners a % of what the partners they recruited earn is a multi-level scheme. India regulates these (Consumer Protection (Direct Selling) Rules, 2021, and the Prize Chits and Money Circulation Schemes (Banning) Act, 1978). The brief's design keeps to the safer side: no joining fee, bonus only from real course sales, paid by Get Udaan on top, 2 levels. But I'm not a lawyer, and the Direct Selling Rules can bring their own obligations (for example written terms with each partner, a grievance officer, no misleading income claims). Please have a CA/lawyer confirm before the team bonus goes live. I can build it switched **off** until you confirm.
3. **Self-purchase signals.** Phone and email: easy. Payment method: Razorpay sends the UPI ID / card token in the payment webhook, so the same UPI ID as the partner's payout UPI can be blocked. "Device fingerprint" in the strict sense means tracking scripts that need a privacy-policy update; I suggest the visitor cookie + IP hash we already store instead.
4. **The missing website-upgrade brief.** Send `GETUDAAN_WEBSITE_UPGRADE_PROMPT.md`, or confirm I should build §7 from this brief alone.
5. **Real media.** The masterclass video, testimonial videos and mentor section need real files and real people. Until they exist, those blocks stay hidden (no fake content).

---

## D. Every `[FILL]` still missing (I will not invent these)

| Key | Where it's used |
|---|---|
| Team bonus paid by Get Udaan on top — confirm | Team bonus logic, partner terms, `/partners` |
| No joining fee — confirm | Partner terms, `/partners` FAQ |
| Payout time (e.g. 1–2 working days) | `/partners`, dashboard, terms |
| TDS rate and threshold (from your CA) | Withdrawals, dashboard, terms |
| Refund-rate flag threshold (e.g. 15% over 20+ sales) | Fraud flag |
| Invite code format (default: same as partner/coupon code) | Invite links |
| Legal name, address, support WhatsApp, support email | Footer, legal pages, emails, checkout |
| Masterclass video, testimonial videos, mentor details | Home + `/masterclass` |

---

## E. Proposed build order (after your go-ahead)

1. Config files + split "buyer refund days" from "commission release" + remove the commission "7 days" wording.
2. Partner rules: 1-hour release + scheduler, refunds absorbed (if confirmed), approval alerts + one-tap links + waiting timer, freeze, refund-rate flag, wider self-purchase check.
3. Team bonus (database migration, calculation, guardrails) — switched off until legal check.
4. Invite links (`?invite=`, `/j/CODE`, cookie, pre-filled apply form, move payout details out of the application).
5. Dashboard tabs (Overview, Sales, Team, Wallet) + admin (tree, ledger viewer, refund report, freeze).
6. Pages: FIRST100 coupon, `/masterclass`, home order, legal/partner terms, share images.
7. Tests from §9, plus Playwright end to end.

Each step: its own commit, tests run, checked at 375px and 1440px.
