# GET UDAAN — Website Design Master Prompt (for Claude Code)

> Put this file in the project root as `DESIGN.md` next to `PROJECT_BRIEF.md`, and add one line to `CLAUDE.md`:
> "Read DESIGN.md before writing any UI. It overrides any default styling choices."
>
> The brand is now **GET UDAAN** (domain **getudaan.com**). Wherever `PROJECT_BRIEF.md` says "ReelBhai Academy", use "Get Udaan".

---

## 0. Your role and how to use this file

You are a senior product designer + direct-response marketer + front-end engineer building **getudaan.com**. `PROJECT_BRIEF.md` says WHAT to build (features, data, payments). This file says HOW EVERY SCREEN MUST LOOK, FEEL, READ AND CONVERT.

Rules for you:
1. Read this whole file before writing UI code. Every screen must follow it.
2. Before building any page, write a 5-line "page plan" in your reply: **the ONE action**, **who is on this page**, **their main doubt**, **how this page removes that doubt**, **what the primary CTA says**. Wait for my OK only for new pages, not for small changes.
3. Build the design system FIRST (tokens → Tailwind config → base components → page sections), never style pages ad hoc. No hardcoded hex colours, font sizes or spacing in pages — only tokens/classes from section 3.
4. Mobile first (360–414px). Check every screen at 360px, 414px, 768px and 1280px.
5. I am not a senior developer: after each page, tell me in simple words what you built and give me a phone-testing checklist.
6. When something here conflicts with honesty or the law (consumer protection, privacy), honesty wins — tell me.

---

## 1. The brand in one minute

- **Name:** GET UDAAN ("udaan" = flight). Always written "Get Udaan" in sentences, "GET UDAAN" in Anton headlines/logos.
- **What we sell:** courses that teach Indians to make viral AI-animated reels (lion "bhai" gangster stories etc.) using FREE AI tools, mostly from a phone. Plus a Pro tier and a Done-with-you service.
- **Tagline:** *Phone se Viral tak.* · **Sign-off:** *Udaan bharo.*
- **Promise:** "Sirf phone aur free AI tools se apna viral reel page banao — step by step, Hinglish mein."
- **Personality:** the confident big brother (bhai) who has already done it. Bold, street-smart, warm, never arrogant. Movie-trailer energy, zero hype-lies.
- **Three words:** Bold. Desi. Honest.
- **Audience:** 17–30, Hindi/Hinglish, 90%+ on Android phones, often slow 4G, pay by UPI, many buying an online course for the FIRST time. Their two fears: "Ye scam toh nahi?" and "Mujhse ho payega? Ye toh technical hoga."
- **Feeling every visitor must leave with:** "Ye log real hain, ye easy hai, aur main bhi kar sakta hoon — abhi start karta hoon."

**The look:** a dark cinematic world (like a movie trailer at night) with **Udaan Gold** as the light. Big UPPERCASE Anton headlines, clean Poppins text, gold CTAs that glow, real reel footage everywhere. Premium like Netflix/CRED, but desi and friendly, not cold.

---

## 2. Brand assets (I will put these in the repo)

Put the logo pack in `public/brand/`:

| File | Use |
|---|---|
| `getudaan-horizontal-on-dark.svg` | Default header logo, footer, video end cards |
| `getudaan-horizontal-on-light.svg` | Light pages: invoices, emails, certificate |
| `getudaan-horizontal-mono-white.svg` / `-mono-ink.svg` | Over photos / over gold / partner co-branding |
| `getudaan-stacked-on-dark.svg` / `-on-light.svg` | Square spaces: certificate, splash, loading screen |
| `getudaan-mark-gold.svg` | Mark only: video watermark, loaders, small spaces |
| `getudaan-app-icon.png` (512), `apple-touch-icon-180.png`, `favicon-32.png` | Favicon, PWA manifest, home-screen icon |
| `getudaan-profile-picture.png` | OG/social default avatar |

**The mark** = a rounded play triangle tilted 20° upward with three speed trails behind it (reels + flight). Use these SVG files as they are. Never retype the wordmark in a font, recolour it, stretch it, add shadows, or put the gold UDAAN wordmark on a light background.
Header logo height: 28px mobile, 36px desktop. Clear space around the logo = height of the letter U.

**Brand motif you may reuse in UI:** the "speed trails" (three short-long-short rounded bars, tilted −20°). Use them as section dividers, list bullets in hero areas, progress accents, and loading animation. Don't overuse: max one trail motif per screen section.

---

## 3. Design tokens (the single source of truth)

### 3.1 Colours — two themes

`night` is the DEFAULT for every public page, student area and partner dashboard. `day` is for invoices, emails, certificate PDF, print and the admin panel (admin may also use night; pick one and stay consistent).

| Token | Night (default) | Day | Use |
|---|---|---|---|
| `surface` | `#0d0d12` | `#fbf7ef` | Page background |
| `surface-raised` | `#17171f` | `#ffffff` | Cards, accordions, bottom sheets, sticky bar |
| `surface-sunken` | `#08080b` | `#f2ece0` | Inputs, prompt/code boxes, video letterbox |
| `line` | `#2a2a35` | `#e5ddcc` | Borders, dividers |
| `ink` | `#f6f1e7` | `#15131a` | Main text |
| `ink-muted` | `#a8a3b3` | `#5d5866` | Secondary text, captions, disclaimers |
| `gold` | `#ffb627` | `#ffb627` | FILL only: primary CTA, logo tile, progress bars, featured highlights |
| `gold-deep` | `#e89c00` | `#e89c00` | Hover/pressed gold |
| `on-gold` | `#15131a` | `#15131a` | Text/icons on gold. NEVER white on gold |
| `gold-text` | `#ffb627` | `#8a5b00` | Gold used AS TEXT: highlighted words, prices, links |
| `gold-soft` | `#2b2210` | `#fff1d1` | Tinted backgrounds: featured tier, bonus box |
| `fire` | `#ff6a45` | `#c2361a` | REAL urgency only (real countdown, LIVE), action accents in creatives |
| `on-fire` | `#15131a` | `#ffffff` | Text on fire |
| `success` | `#2dd4a7` | `#0b7a5c` | Paid, completed, approved — always with ✓ icon or word |
| `focus-ring` | `#ffb627` | `#ffb627` | 2px focus outline + 2px offset |

**Colour rules**
- 60-30-10: ~60% `surface`, ~30% `ink`/`surface-raised`, ~10% `gold`. Gold is precious — if everything is gold, nothing is.
- **ONE gold primary button visible per screen.** Everything else is secondary (ink outline) or ghost (gold-text link).
- All text pairs above pass WCAG AA (4.5:1). Don't invent new text colours.
- No blue/purple gradients, no glassmorphism, no rainbow. The only gradient allowed: a dark fade (`transparent → surface`) over video/images so text stays readable.

### 3.2 Typography

Fonts via `next/font/google` (self-hosted, `display: swap`, subsets `latin` + `devanagari` for Poppins):
- **Anton** 400 — headlines, prices, big numbers. ALWAYS UPPERCASE, letter-spacing 0.5px.
- **Poppins** 400/600/700 (+800 for Hindi-script headlines) — everything else. Anton has no Devanagari, so any Hindi-script heading uses Poppins 800.

| Style | Font | Mobile | Desktop | Line height | Use |
|---|---|---|---|---|---|
| `display-xl` | Anton | 48–56px | 80px | 0.95 | Hero headline (one per page) |
| `display` | Anton | 36–40px | 56px | 1.0 | Section headings |
| `heading` | Anton | 26–28px | 32px | 1.1 | Card titles, tier names, dashboard titles |
| `price` | Anton | 44px | 56px | 1.0 | Prices (28px in sticky bar) |
| `title` | Poppins 700 | 20px | 22px | 28px | Sub-headlines, lesson titles, modal titles |
| `body-lg` | Poppins 400 | 17px | 19px | 27px | Hero sub-headline, lead paragraphs |
| `body` | Poppins 400 | 15px | 16px | 24px | Default text. NEVER smaller on mobile |
| `small` | Poppins 400 | 13px | 13px | 20px | Disclaimers, helper text (minimum size) |
| `label` | Poppins 600 | 12px | 12px | 16px | UPPERCASE eyebrows, badges, letter-spacing 1.2px |
| `button` | Poppins 700 | 16px | 16px | 20px | Button labels, Title Case |

Use `clamp()` for display sizes. Headlines max 3 lines on mobile. Highlight 1–2 key words in `gold-text` (e.g. "PHONE SE **VIRAL** TAK").

### 3.3 Spacing, radius, shadow, motion

- Spacing scale (px): 4, 8, 12, 16, 24, 32, 48, 64. Mobile gutter 16px. Section padding 48px mobile / 64–96px desktop. Max content width 1120px; reading text max 640px.
- Radius: `sm` 8px (badges, inputs) · `md` 14px (buttons, cards, video) · `lg` 24px (pricing cards, bottom sheets) · `pill` 999px (stat chips, sticky CTA).
- Shadows: `glow-gold` = `0 8px 28px rgba(255,182,39,.35)` ONLY under the one primary CTA. `lift` = `0 12px 32px rgba(0,0,0,.5)` (night) for floating things (bottom sheet, sticky bar, dropdowns). Cards use a 1px `line` border, not shadows.
- Motion: UI transitions 150–250ms ease-out. Section reveal on scroll: 12px fade-up, once, only for headings/cards. Buttons: `scale(.98)` on press. Respect `prefers-reduced-motion` (turn all motion off). No parallax, no scroll-jacking, no autoplaying sound ever.

### 3.4 Implementation

- Define the tokens as CSS variables in `app/globals.css` under `:root, [data-theme="night"]` and `[data-theme="day"]`, then map them in `tailwind.config.ts` (`colors: { surface: 'var(--surface)', ... }`, `fontFamily: { display: [...], body: [...] }`, `borderRadius`, `boxShadow`).
- Create `/design` (dev-only route, hidden in production) that shows every token, type style and component in both themes — this is our living style guide. Keep it updated.
- Icons: **lucide-react** only, 2px stroke, 20px in UI / 24px in dashboards, coloured `ink` or `ink-muted` (`on-gold` inside gold buttons). No emoji as UI icons (emoji are allowed only inside Hinglish marketing copy, max one per line, never in buttons, headlines, invoices or admin).

---

## 4. Voice & copy (Hinglish)

Write like a big brother texting a younger cousin on WhatsApp: short lines, Roman-script Hinglish, English words that Indians actually use (reel, views, payment, prompt, lesson).

- **CTAs:** verb-first, Title Case, 2–4 words: *Abhi Join Karo*, *Free Lesson Dekho*, *Course Shuru Karo*, *Link Copy Karo*, *Payment Karo*. Put the price in the CTA when it removes a doubt: *₹499 mein Join Karo*.
- **Payments, refunds, support:** use respectful "aap". Never "tu/tum". The team speaks as "hum".
- **Numbers:** ₹ with Indian grouping (₹14,999; ₹1.2 lakh). Durations "5 min", "320+ min".
- **Admin panel:** plain English.
- Store ALL user-facing text in a content/i18n layer (`/content/hi-Latn/*.json` or CMS), never inline in components — we will add Hindi and English later.

**Copy bank (use and extend):**
- Hero: "PHONE SE **VIRAL** TAK" / "Sirf phone aur free AI tools se apna viral AI reel page banao — step by step, Hinglish mein."
- Doubt-killers: "Laptop nahi chahiye." · "Koi paid tool nahi." · "Editing nahi aati? Koi baat nahi." · "Slow internet pe bhi chalega." · "Lifetime access — jab chahe dobara dekho."
- Lead magnet: "Pehla lesson FREE + 20 prompts — abhi WhatsApp pe pao."
- Checkout trust: "100% secure payment • UPI, Card, Netbanking" · "[7]-din refund policy" · "Koi problem? WhatsApp karo: [number]"
- Honesty line (mandatory near ANY income talk): "**Results vary.** Income ki koi guarantee nahi — kamaai aapki mehnat, consistency aur content par depend karti hai."
- Partner: "Tumhara page, tumhari kamaai — har sale pe [50]% commission."

**Never write:** "Earn ₹50,000 in 7 days", "Guaranteed income", "LIMITED SEATS" (unless truly limited), fake "only 2 left", stock "Lorem ipsum", corporate English ("Leverage AI to optimize").

---

## 5. Sales-engine UX principles (apply on EVERY page)

1. **One page, one job.** Each page has exactly one primary action. Everything else supports it or gets out of the way.
2. **Show, don't tell.** The product is the reels — real reel footage beats any sentence. Show a sample reel in the first screen.
3. **Kill the two fears early.** Above the fold or just below: "No laptop / no paid tools / Hinglish / step-by-step" (fear: too technical) + secure payment, refund policy, real people behind it, WhatsApp support (fear: scam).
4. **Answer the next question before they ask.** Order of sections = order of doubts: What is it? → Is it for me? → Can I do it? → What exactly do I get? → Does it work for others? → How much? → What if I don't like it? → Questions → Buy.
5. **Reduce clicks to money.** From any CTA to the Razorpay UPI screen in ≤ 2 taps after filling 3 fields.
6. **Honest urgency only.** Countdown appears only when admin set a real deadline; social proof only from real data (see PROJECT_BRIEF 4.7). Honest urgency, beautifully presented, still converts.
7. **Speed is design.** A beautiful page that loads in 6 seconds on Jio 4G loses the sale. LCP < 2.5s, minimal JS on public pages, poster image before the hero video plays.
8. **Thumb-first.** Primary actions sit in the bottom half of the phone screen (sticky buy bar, bottom sheets). Tap targets ≥ 48px, 8px apart.
9. **Make them feel progress.** Students and partners should see numbers go up (progress %, streaks, earnings, badges). Celebrate every win with a small, tasteful moment.
10. **Every screen ends with a next step.** No dead ends — thank-you pages, empty states, error pages all have one clear next action.

---

## 6. Core components (build these first, in `components/ui/`)

Each component: typed props, both themes, mobile-first, accessible (real `<button>`/`<a>`, labels, focus ring, `aria-*`), shown on `/design`.

| Component | Key specs |
|---|---|
| `Button` | variants `primary` (gold + glow, on-gold text), `secondary` (ink 2px outline), `ghost` (gold-text underline); sizes md (48px) / lg (56px); `block` for full width; loading state with spinner and disabled; optional trailing arrow icon |
| `Badge` | tones `gold` (soft), `solid` (most popular), `fire` (live/real deadline), `success` (✓), `neutral`; uppercase label style |
| `StatChip` | pill: big Anton number in gold-text + uppercase caption |
| `SectionHeader` | eyebrow (label, gold-text) + Anton heading with gold highlight word + optional sub (body-lg, ink-muted) |
| `ReelPlayer` | 9:16 muted autoplay loop, poster first, lazy, rounded md, play/pause button, "tap for sound" pill; pauses off-screen |
| `PriceCard` | tier badge, Anton name, price, ✓ inclusions (success ticks), CTA; `featured` = gold-soft bg + 2px gold border + solid badge + primary button |
| `TierCompareTable` | mobile: stacked cards with a "Compare" toggle; desktop: table; ✓/✕ with text labels |
| `StickyBuyBar` | mobile only, appears after hero scrolls out, price + 1-line reassurance + pill CTA, respects safe-area-inset-bottom, hides when a sheet/checkout is open |
| `BottomSheet` | mobile lead/opt-in sheet, drag handle, close button 44px, focus trap, ESC closes, desktop = centered modal |
| `Accordion` | for curriculum and FAQ, one open at a time optional, `+`→`−` icon, animated height |
| `CurriculumModule` | module title, lesson count + total min, lessons with ▶ / 🔒 / "FREE PREVIEW" badge |
| `TestimonialCard` | real student only: avatar, name, handle, their reel thumbnail, quote, result chip, "Results vary" line; hidden section until ≥3 exist |
| `IncomeDisclaimer` | info icon + honesty line, dashed border, sunken bg; mandatory under any income claim |
| `GuaranteeBox` | shield icon, refund days, simple terms in plain Hinglish |
| `Countdown` | renders ONLY if a real `deadline` prop exists; days/hours/min in Anton, fire label; auto-hides at 0 |
| `RecentPurchaseToast` | real orders only, "Someone from [city] joined [x] min ago", bottom-left, max 1 per 20s, dismissible, admin toggle |
| `TrustRow` | Razorpay/UPI logos, "Secure payment", refund days, WhatsApp support |
| `Input`, `PhoneInput (+91)`, `Checkbox`, `CouponField` | 48px tall, sunken bg, label above, inline validation in Hinglish, numeric keypad for phone |
| `ProgressBar` / `ProgressRing` | gold fill on line track, % label |
| `StatCard` (dashboards) | label, big Anton number, delta vs previous period (↑ success / ↓ muted, never red-shaming), sparkline |
| `EmptyState` | speed-trail illustration + one sentence + one CTA |
| `Toast` | success/error/info with icon + word |
| `Skeleton` | shimmer placeholders matching final layout (no layout shift) |
| `Watermark` | player overlay per PROJECT_BRIEF §7 |

---

## 7. Page-by-page design

### 7.1 Global shell (public pages)
- **Header** (64px, transparent over hero → `surface` with `line` border on scroll): logo left; right side on mobile = "Login" ghost + small gold "Join" button; desktop adds anchors (Curriculum, Pricing, FAQ, Partner Bano).
- **Footer:** logo, tagline, links (Courses, Done-with-you, Partner Program, Refund Policy, Privacy, Terms, Contact), WhatsApp support, Instagram/YouTube, "© Get Udaan", small income disclaimer.
- **Partner attribution banner:** when `?ref=` or coupon in URL, show a slim gold-soft bar under the header: "🎉 @[partnerhandle] ka coupon [CODE] apply ho gaya — ₹[X] off" (real values only). This makes partner traffic feel special and boosts conversion.

### 7.2 Landing page (`/`) — THE money page
ONE action: start checkout (secondary: free lesson opt-in). Sections in this order (all CMS-editable):

1. **Hero** — night bg, subtle film grain.
   - Mobile layout: eyebrow badge ("HINGLISH • PHONE SE • FREE TOOLS") → `display-xl` headline with gold word → body-lg sub → primary CTA "₹[499] mein Join Karo" (full width) + ghost "Free Lesson Dekho" → 3 StatChips (real numbers: 40+ lessons, 300+ prompts, ₹0 tools) → ReelPlayer (9:16, 70% width, slightly rotated −3° card with gold glow edge, a second reel peeking behind it).
   - Desktop: 2 columns — copy left, stacked reels right.
   - Tiny trust line under CTA: "UPI • [7]-din refund • Lifetime access".
2. **Reel wall** ("Ye sab phone se bana hai") — horizontal swipe strip of 4–6 sample reels made by us (labelled "Made by Get Udaan team"; student reels only when real and permitted).
3. **Problem** — "Kya ye aapke saath ho raha hai?" 4 pain cards (icon + one line): views nahi aate, editing nahi aati, tools paid lagte hain, idea khatam ho jaate hain. Ends with: "Ab nahi."
4. **Ways creators earn** — 4 cards (brand deals, YouTube/FB monetisation, client work, own products) each with a short honest explanation + **IncomeDisclaimer** directly underneath.
5. **How it works (5 steps)** — vertical timeline on mobile with speed-trail connectors: Character banao → Story likho → AI se animate karo → Edit + post → Grow + earn. Each step: number in Anton gold, title, one line, tiny GIF/screenshot.
6. **Curriculum** — accordion of modules; free-preview lessons have a "FREE" badge and open the free lesson (lead opt-in). Summary row: "40+ lessons • 320+ min • 720p • Hinglish".
7. **Bonuses** — gold-soft box: 300+ prompt pack, PDF guide, story templates, income module — each with a mock cover image and a "value" line only if true.
8. **Student results** — TestimonialCards carousel; whole section hidden until ≥3 real ones.
9. **Pricing** — 3 PriceCards (Basic / **Pro featured** / Done-with-you), mobile order: Pro first. Countdown above only if real deadline. Order of info: what you get → price → CTA. Below: "Compare plans" toggle.
10. **Guarantee** — GuaranteeBox, big shield, "[7] din mein pasand nahi aaya? Refund. Simple." + link to policy.
11. **FAQ** — objection-handling accordion (8–12): laptop chahiye?, paid tools?, kitna time?, Hindi mein hai?, payment safe?, refund?, kab tak access?, kya income guarantee hai? (answer honestly: nahi), certificate?, support?
12. **Partner recruitment** — night/gold split block: "Viral page hai? Partner bano — har sale pe [50]% kamao." CTA secondary "Partner Apply Karo".
13. **Final CTA** — big Anton line "UDAAN BHARO." + primary CTA + trust row.
14. **StickyBuyBar** (mobile) from section 2 onward.

Lead opt-in BottomSheet triggers (once per session): "Free Lesson" CTAs, 60% scroll, desktop exit intent. Content: "Pehla lesson FREE + 20 prompts" · name + WhatsApp number (or email toggle) · consent checkbox · gold CTA "Free Lesson Pao" · "Spam nahi karenge." Close button always visible.

### 7.3 Free lesson page (`/free-lesson`)
Video player top (full width mobile), lesson title, short notes, downloadable 20 prompts. Under the video: soft upgrade card — "Ye toh sirf lesson 1 tha. Baaki 39 lessons + 300 prompts ₹[499] mein." + CTA. Progress hint: "1 / 40 lessons".

### 7.4 Checkout (`/checkout`)
ONE action: pay. Remove the header nav and footer links (logo only + "Secure checkout 🔒").
- Mobile single column: Order summary card (product, price, coupon line, total in Anton) → Name → WhatsApp number (+91) → Email → Order bump (gold-soft card with checkbox: "Haan, Advanced Prompt Pack bhi add karo — ₹149") → CouponField (pre-filled from partner) → Pay button "₹[total] Pay Karo" (full width, glow) → TrustRow → refund line → "Help chahiye? WhatsApp karo".
- Desktop: form left, sticky summary right.
- Inline validation, numeric keypad for phone, autofill-friendly `autocomplete` attributes. Show a loading state on Pay; never let the user double-pay.
- Failure screen: calm, "Payment complete nahi hua. Paise kate hain toh 24 ghante mein wapas aa jaayenge." + retry + WhatsApp.

### 7.5 Thank-you page (`/thank-you`)
The happiest page on the site. Gold confetti burst ONCE (reduced-motion: none), big ✓, "WELCOME TO GET UDAAN, [NAME]!", order details, primary "Lesson 1 Shuru Karo". Then ONE upsell card (Pro or Done-with-you) with one-click purchase. Then "Apne dost ko bhejo — usse ₹[50] off, tumhe ₹[100]" share card (WhatsApp first).

### 7.6 Student area (`/learn`)
- **Dashboard:** greeting "Namaste [Name] 👋" · big "Continue watching" card (thumbnail, lesson name, progress bar, gold CTA "Wahi se Shuru Karo") · My courses with ProgressRing · streak/milestone chip · downloads · referral card · purchase history & invoices. Bottom tab bar on mobile: Home, Courses, Downloads, Profile.
- **Lesson player:** video top (sticky on scroll), watermark, title, "Mark complete" toggle, next lesson button, notes/resources tab, module list as a drawer. Remembers position.
- **Milestones:** 25/50/75/100% — small celebratory card ("Aadha safar poora! 🚀") with share-to-Instagram story image.
- **Contextual upsell:** after the income module only: card "Apna page hamari team se banwana hai? Done-with-you dekho."
- **Certificate:** day theme, stacked logo, student name in Anton, course, date, certificate ID, QR to verify; 1080×1920 story version for sharing.

### 7.7 Partner experience — make them feel like rockstars
Partners are our sales team; their dashboard must be the most motivating screen on the site.
- **Partner landing (`/partner`):** hero "TUMHARA PAGE. TUMHARI KAMAAI." · how it works (3 steps: apply → share link → earn) · commission explained with a simple calculator (slider: sales/month → estimated commission, with IncomeDisclaimer) · payout schedule · FAQ · Apply CTA.
- **Apply form:** multi-step (3 short steps with progress), Instagram handle with live @ formatting, UPI field, friendly success screen "Application mil gayi! 48 ghante mein reply karenge."
- **Partner dashboard (`/partner/dashboard`), mobile-first:**
  - Top: greeting + big gold "Total earnings" StatCard (Anton, count-up animation once) with pending / approved / paid split.
  - Quick actions row (sticky on mobile): Copy Link · Copy Coupon · Share on WhatsApp · Share to Instagram — each gives instant toast "Copied! ✓".
  - StatCards: clicks, leads, sales, conversion %, with 7/30/90-day toggle.
  - Earnings chart (Recharts area in gold on night, gridlines `line` colour).
  - Campaign table: "Kaunsi reel ne sabse zyada becha" — best campaign highlighted with a gold crown badge.
  - Sales list: masked buyer (e.g. "R***l, Indore"), product, commission, status badge.
  - Milestone badges: First sale, 10 sales, ₹10k, ₹50k club… (locked ones shown greyed with progress).
  - Leaderboard (if admin enabled): top 10, partner's own rank pinned.
  - Promo kit: grid of downloadable reels, story templates, captions (copy button), best hooks.
  - New sale moment: when a sale arrives since last visit, show a celebratory banner "🎉 2 nayi sales! +₹998".
- **Co-branded partner link landing:** the attribution banner from 7.1 + optional partner photo/handle in hero ("@handle recommends").

### 7.8 Done-with-you page (`/done-with-you`)
Premium tone: more whitespace, gold-soft accents, process timeline (Onboarding → Character → First videos → Page setup → Growth plan), what's included with clear scope (videos, calls, weeks), team intro (real people), application-style CTA "Apna Slot Book Karo". Client tracker after purchase: stage stepper, files per stage, message thread — feels like a Swiggy order tracker.

### 7.9 Auth
Phone/email OTP. One field per screen, big OTP boxes (6 inputs, auto-advance, auto-read SMS where supported), "OTP nahi aaya? 30s mein dobara bhejo" timer. Friendly errors.

### 7.10 Admin panel (`/admin`)
English, clean and dense, same tokens (night or day, pick one). Sidebar nav, tables with search/filter/export, charts in gold + neutral greys, destructive actions in a confirm dialog. Function over flair — but still on-brand.

### 7.11 System pages
404: "Ye page ud gaya! 🪂" + CTA home. 500: calm apology + WhatsApp. Maintenance and offline (PWA) states with logo mark animation.

### 7.12 Emails & WhatsApp templates
Day theme, max-width 600px, logo on-light top, one heading, short Hinglish text, ONE gold button, footer with support + unsubscribe. Same voice as the site. Build with React Email.

---

## 8. Imagery & media
- Hero/section visuals = real frames and clips from our AI reels: cinematic, dark, warm gold rim-light, tight crops on faces and action.
- People photos = real phone-in-hand moments. No stock photos of laptops in cafés, no fake "students".
- Hero video ≤ 2–3 MB, H.264 MP4 + WebM, 720×1280, 6–10s loop, poster AVIF/WebP. All images via `next/image`, AVIF/WebP, lazy below the fold, explicit width/height (no layout shift).
- Open Graph image 1200×630 per page: night bg, Anton headline, logo.

---

## 9. Accessibility & quality bar
- WCAG 2.1 AA: contrast (tokens already pass), visible focus ring everywhere, keyboard reachable, form labels, `alt` text, `lang="hi-Latn"` on Hinglish pages.
- Tap targets ≥ 48px. Text never below 13px; body never below 15px on mobile.
- No horizontal scroll at 360px. Test on a cheap Android (Chrome) and iPhone Safari.
- Lighthouse mobile: Performance ≥ 90, Accessibility ≥ 95, Best Practices ≥ 95, SEO ≥ 95.
- CLS < 0.1, LCP < 2.5s on simulated 4G.

---

## 10. Don'ts (instant fail)
- More than one gold primary button in view.
- White text on gold. Gold text on light backgrounds (use `gold-text`).
- Fake countdowns, fake scarcity, fake reviews, fake purchase popups, fake strikethrough prices.
- Income claims without the IncomeDisclaimer next to them.
- Stock photos, lorem ipsum, AI-trope design (purple gradients, glass cards, emoji icons, left-border accent cards).
- Hardcoded colours/sizes outside the token system.
- Heavy animation libraries or big JS on public pages (no full Framer Motion on the landing page — use CSS; small islands only).
- Autoplay with sound, pop-ups that cover the CTA, pop-ups shown more than once per session.

---

## 11. Build order for the design layer
1. Tokens in `globals.css` + Tailwind config + fonts + `/design` style-guide route.
2. Base components (section 6) with both themes on `/design`.
3. Global shell (header, footer, attribution banner).
4. Landing page sections (7.2) with seed content from the CMS.
5. Lead sheet + free lesson page.
6. Checkout → thank-you.
7. Student area → lesson player → certificate.
8. Partner landing → apply → dashboard.
9. Done-with-you page + tracker.
10. Admin styling, emails, system pages.

After each step: screenshots at 360px and 1280px (Playwright), Lighthouse score, and a checklist for me to test on my phone.

---

## 12. Definition of done (per page)
- [ ] Page plan (one action, doubt, CTA) written and followed
- [ ] Only tokens/components used; looks right in night (and day where used)
- [ ] Perfect at 360px, 414px, 768px, 1280px
- [ ] Exactly one primary CTA in view at any time
- [ ] Every income mention has the IncomeDisclaimer
- [ ] Urgency/social proof only from real data
- [ ] All copy in the content layer, Hinglish, voice rules followed
- [ ] Keyboard + screen reader basics pass, focus visible
- [ ] Lighthouse mobile ≥ 90 performance, no layout shift
- [ ] Funnel events fired (PROJECT_BRIEF §4.8)
- [ ] Phone-testing checklist given to me
