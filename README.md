# Get Udaan

A course-selling platform built as a sales engine: landing page → checkout (Razorpay, UPI first) → protected course player, plus a partner (affiliate) program with a live dashboard and withdrawals.

**Status: Phase 1 ("Start selling") is complete.** Phase 2 and 3 are listed at the bottom.

---

## 1. Run it on your computer (about 10 minutes)

You need **Node.js 20.9+** (you have 22). Nothing else: the database runs from `node_modules`, payments and emails have built-in test modes.

```bash
npm install
cp .env.example .env          # then open .env and set APP_SECRET (see the comment there)
```

**Terminal 1 — the database (leave it running):**

```bash
npm run db:start
```

**Terminal 2 — set up tables + demo data, then start the site:**

```bash
npx prisma migrate deploy
npm run db:seed
npm run dev
```

Open http://localhost:3000.

### Logging in while developing
There are no passwords. You type an email and get a 6-digit code. In development, emails are **not sent**. They are printed in the `npm run dev` terminal and saved as files in `.local-mail/` (open them in a browser).

| Demo login | What you see |
|---|---|
| `admin@example.com` (or your `ADMIN_EMAIL`) | Admin panel `/admin` |
| `lionbhai.partner@example.com` | Partner dashboard `/partner` (has sales, earnings, a paid withdrawal) |
| `student@example.com` | Student dashboard with some progress |

### Test a full purchase (no Razorpay account needed)
1. Open `http://localhost:3000/?ref=LIONBHAI&c=reel23` (that's what a partner's reel link looks like).
2. Click **Course join karo**. The partner coupon is applied automatically.
3. Fill name/phone/email and pay. With `PAYMENTS_MODE=mock` you get a **TEST payment page**. Click "payment successful".
4. That page sends a properly signed webhook to our own webhook endpoint, exactly like Razorpay does. You land on the thank-you page, then in Lesson 1.
5. Log in as the partner: the sale appears (buyer masked).

### Test on your phone (same Wi-Fi)
1. Find your PC's IP: `ipconfig` → "IPv4 Address" (e.g. `192.168.1.5`).
2. In `.env` set `APP_URL=http://192.168.1.5:3000` and restart `npm run dev`.
3. On the phone open `http://192.168.1.5:3000`.
   (If Windows Firewall asks, allow Node.js on private networks.)

---

## 2. Tests

```bash
npm test            # 40 unit + integration tests (money, attribution, webhook, withdrawals, refunds, data isolation)
npm run test:e2e    # browser tests: buy → lesson 1 → partner sees sale; 2-device limit; admin protection
```

Unit/integration tests use a separate `reelbhai_test` database. Run this once (and after schema changes):

```bash
npm run test:setup
```

E2E tests use the dev database (run `npm run db:seed` first). On Windows they use your installed Microsoft Edge, so no browser download is needed.

---

## 3. Environment variables

All variables are in `.env.example` with comments. Summary:

| Variable | Needed for | Notes |
|---|---|---|
| `APP_URL` | always | Your site URL, e.g. `https://yourdomain.com` |
| `APP_SECRET` | always | Long random string, used to hash OTPs, sessions and IPs. **Never change it after launch** (it logs everyone out). |
| `ADMIN_EMAIL` | seed + alerts | Gets ADMIN role from the seed; receives "new partner application" emails |
| `DATABASE_URL`, `DIRECT_URL` | always | Supabase: pooler (6543) and direct (5432) connection strings |
| `PAYMENTS_MODE` | always | `mock` locally, `razorpay` in production (mock is blocked in production) |
| `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET` | payments | From Razorpay Dashboard → API Keys / Webhooks |
| `MUX_TOKEN_ID`, `MUX_TOKEN_SECRET`, `MUX_SIGNING_KEY_ID`, `MUX_SIGNING_KEY_PRIVATE` | videos | Without these, lessons play a public demo video |
| `MUX_PLAYBACK_RESTRICTION_ID` | optional | Locks playback to your domain (Mux → Playback restrictions) |
| `R2_*` | downloads | Cloudflare R2 bucket. Without it, files are served from `./storage` |
| `RESEND_API_KEY`, `EMAIL_FROM` | email | Without it, emails go to `.local-mail/` |
| `NEXT_PUBLIC_META_PIXEL_ID`, `META_CAPI_ACCESS_TOKEN`, `NEXT_PUBLIC_GA4_ID`, `GA4_API_SECRET` | tracking | IDs can also be set in Admin → Settings |
| `CRON_SECRET` | scheduled jobs | Protects `/api/cron/run` |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Sign in with Google (optional) | Hidden on the login page until both are set. Create at console.cloud.google.com → APIs & Services → Credentials → OAuth client (Web). The Authorized redirect URI must be exactly `${APP_URL}/auth/google/callback`. |

---

## 4. Deploy (Supabase + Vercel)

1. **Supabase**: create a project (Mumbai region). Copy the two connection strings into `DATABASE_URL` (Transaction pooler, add `?pgbouncer=true`) and `DIRECT_URL` (Session pooler / direct).
2. Create the tables from your PC:
   ```bash
   npx prisma migrate deploy
   ```
   (with the Supabase `DIRECT_URL` in `.env`). Optionally run `npm run db:seed` on a **staging** project only, because the seed deletes data.
   Row Level Security is turned on for every table, so Supabase's public API keys can't read anything.
3. **Vercel**: import the GitHub repo, add all env vars, deploy. Build command: `npm run build`.
   ⚠️ Vercel's free Hobby plan is for **non-commercial** use. Move to Pro (~$20/month) before taking real payments.
4. **Razorpay**:
   - Activate the account. The site already has the required Terms, Privacy, Refund and Contact pages at `/legal/*`; fill in Admin → Settings (legal name, address, support email/WhatsApp) first.
   - Add a webhook: URL `https://yourdomain.com/api/webhooks/razorpay`, events `payment.captured`, `order.paid`, `payment.failed`, `refund.processed`, secret = `RAZORPAY_WEBHOOK_SECRET`.
   - Set `PAYMENTS_MODE=razorpay`. Test with Razorpay **test keys** first.
5. **Scheduled job** (releases commissions 1 hour after the sale, marks abandoned carts). **Staging already has this** (Supabase job `getudaan-release`, every 5 minutes). For a new database: in the Supabase SQL editor enable `pg_cron` and `pg_net`, keep the secret in Vault, then schedule:
   ```sql
   select vault.create_secret('YOUR_CRON_SECRET', 'getudaan_cron_secret');
   select cron.schedule('getudaan-release', '*/5 * * * *', $$
     select net.http_post(url := 'https://yourdomain.com/api/cron/run',
       headers := jsonb_build_object('Authorization', 'Bearer ' ||
         (select decrypted_secret from vault.decrypted_secrets where name = 'getudaan_cron_secret'))) $$);
   ```
   When the domain changes, re-run `cron.schedule('getudaan-release', …)` with the new URL (same name replaces the job). If you change `CRON_SECRET` in Vercel, update the Vault secret too (`vault.update_secret`).
   (Commissions are also released whenever a partner or admin opens their dashboard.)
6. **Resend**: verify your domain, then set `RESEND_API_KEY` and `EMAIL_FROM`. The free plan sends about 100 emails/day.
7. Log in with `ADMIN_EMAIL`. If that user doesn't exist in production, sign in once, then in Supabase SQL:
   ```sql
   insert into "UserRole"(id,"userId",role) select gen_random_uuid(), id, 'ADMIN' from "User" where email='you@domain.com';
   ```

---

## 5. Commission formula (shown to partners too)

```
base       = amount the buyer paid − GST included in it − Razorpay fee (incl. GST on the fee)
commission = floor(base × rate)
```

- **Rate**: the partner's override for that product (Admin → Partners), otherwise the product default (course 50%, done-with-you 25%).
- **Multi-item orders** (course + order bump): deductions are shared in proportion to item price, and each item uses its own rate.
- **Example**: ₹499 course, partner coupon 10% (₹49) → ₹450 paid, not GST-registered, fee ₹10.62 → base ₹439.38 → 50% = **₹219.69**.
- **Lifecycle**:
  1. **Pending** during the refund window (Settings → `refundWindowDays`, default 7).
  2. Then **Approved**, which adds it to the partner's wallet ledger.
  3. A **refund** reverses it. If the money was already withdrawn, the wallet goes negative and is recovered from future sales.
- **Who gets credit**:
  1. A partner coupon always wins.
  2. Otherwise the last click within `attributionWindowDays` (default 30).
  3. Otherwise the partner who brought the person in as a lead.
  4. Self-referrals earn nothing. Only approved partners earn.
- **Withdrawals**:
  1. The partner requests an amount (≥ `minWithdrawalPaise`, ≤ available).
  2. Admin approves it, pays manually by UPI/bank, then marks it paid with the UTR.
  3. TDS (`tdsBps`) is deducted and shown. Changing payout details blocks withdrawals for 24 hours.

Code: `src/server/commission.ts`, `src/server/attribution.ts`, `src/server/partners.ts`. Tests: `tests/unit/attribution-commission.test.ts`, `tests/integration/purchase-flow.test.ts`.

---

## 6. How to add a new course

Courses, modules and lessons are database rows. Today you create them with a small script; a full course editor UI is planned for Phase 2.

1. Upload each video to **Mux** with playback policy **signed**. Copy each video's *playback ID*.
2. Copy `prisma/seed.ts` → `scripts/add-course.ts` and keep only the "Course" part:
   - set the `slug`, `title`, modules and lesson titles
   - remove the `wipe()` call (very important: it deletes data)
3. Run `npx tsx scripts/add-course.ts`.
4. In **Admin → Courses**, paste each lesson's Mux playback ID, set the duration, and tick **Free** for preview lessons.
5. In **Admin → Pricing**, create a product for the course. Today this is a script or SQL insert; the UI is in Phase 2.
6. Upload PDFs/prompt packs to R2 (`course/<file>`) and add `Asset` rows with that `storageKey`.

---

## 7. Where things are

```
prisma/schema.prisma         database tables (money in paise, times in UTC)
prisma/seed.ts               demo data
src/proxy.ts                 captures ?ref= / ?c= / UTM → referral cookie + click record
src/server/                  business logic (testable, no UI)
  attribution.ts commission.ts pricing.ts   ← pure money/credit rules
  checkout.ts payments/                     ← order creation, Razorpay, webhook fulfilment
  auth.ts                                   ← email OTP, magic links, sessions, 2-device limit
  learning.ts video/provider.ts storage.ts  ← access checks, Mux signed playback, signed downloads
  partners.ts partner-dashboard.ts          ← applications, clicks, commissions, wallet, withdrawals
  notify/                                   ← email templates (WhatsApp-ready interface)
src/content/landing.ts       all landing-page copy (Hinglish), overridable from Admin
src/app/(public)             landing, free preview, partner program, legal
src/app/(checkout)           checkout, mock payment, thank-you
src/app/dashboard, learn     student area
src/app/partner              partner dashboard
src/app/admin                admin panel
```

### Decisions worth knowing
- **Login uses our own sessions** (email code), not Supabase Auth. This lets every request enforce "max 2 devices" exactly, at zero cost. Supabase is used as the Postgres database.
- **Purchases are confirmed only by the signed Razorpay webhook.** The browser never confirms a payment, and the webhook is idempotent: duplicates, retries and simultaneous events can't double-enrol or double-pay.
- **Video protection is layered, not absolute.** The layers are HLS only, 4-hour signed tokens, domain restriction, the moving watermark, the device limit, and playback logs (Admin → Students flags many IPs). Screen recording can't be fully prevented; the watermark identifies who leaked. Mux DRM can be added later by giving the player a DRM token.

---

## 8. What's next

**Phase 2 — Sales engine:**
- lead magnet bottom sheet and follow-up email sequence
- abandoned-cart recovery emails (abandoned carts are already detected and counted)
- refund button in admin (via the Razorpay API)
- GST-ready invoices
- promo kit for partners
- custom date ranges
- course and product editor UI

**Phase 3 — Scale:**
- A/B tests
- student referrals
- real-purchase notifications
- certificates
- done-with-you project tracker
- partner leaderboard
- WhatsApp channel
- Lighthouse/SEO polish
