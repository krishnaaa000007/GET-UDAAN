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

- **Name:** GET UDAAN ("udaan" = flight). Always written "Get Udaan" in sentences, "GET UDAAN" only inside the logo artwork.
- **What we sell:** courses that teach Indians to make viral AI-animated reels (lion "bhai" gangster stories etc.) using FREE AI tools, mostly from a phone. Plus a Pro tier and a Done-with-you service.
- **Tagline:** *Phone se Viral tak.* · **Sign-off:** *Udaan bharo.*
- **Promise:** "Sirf phone aur free AI tools se apna viral reel page banao — step by step, Hinglish mein."
- **Personality:** the confident big brother (bhai) who has already done it. Bold, street-smart, warm, never arrogant. Movie-trailer energy, zero hype-lies.
- **Three words:** Bold. Desi. Honest.
- **Audience:** 17–30, Hindi/Hinglish, 90%+ on Android phones, often slow 4G, pay by UPI, many buying an online course for the FIRST time. Their two fears: "Ye scam toh nahi?" and "Mujhse ho payega? Ye toh technical hoga."
- **Feeling every visitor must leave with:** "Ye log real hain, ye easy hai, aur main bhi kar sakta hoon — abhi start karta hoon."

**The look ("Daylight", Nov 2026 redesign):** a bright, warm cream page with **deep navy** for the header, footer, app sidebars and one or two contrast bands per page, and **Udaan Gold** as the colour of action. Bold sentence-case Bricolage Grotesque headlines with ONE highlighted word, clean Poppins text, flat gold buttons (no glow), white rounded cards, real reel footage everywhere. Professional and energetic, desi and friendly — never "dark gamer".

**Direction (from the unslop method, github.com/heydamir/unslop, CC BY 4.0 by Damir Sokolovsky):**
- Character: confident, warm, street-smart (bade bhai).
- World: a bright Indian afternoon (cream, marigold) under a deep-navy sky (udaan = flight).
- Moments (where colour and craft go): the masterclass video / reel phones in heroes, and the earnings number on the partner dashboard. Everything around them stays quiet.
- Signature: one hand-drawn gold underline under the hero word (`<Highlight shimmer>` / `HandUnderline`). Once per page, nowhere else.

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

### 3.1 Colours — daylight (default) + night (navy bands)

The default theme (`:root`, alias `[data-theme="day"]`) is used everywhere. Wrap the header, footer, app sidebars, video areas and at most TWO contrast sections per page in `data-theme="night"` — the same token names switch to navy values, so components need no changes.

| Token | Daylight (default) | Night (navy band) | Use |
|---|---|---|---|
| `surface` | `#fff8f0` cream | `#0f1b2d` | Page / band background |
| `surface-raised` | `#ffffff` | `#16253d` | Cards, accordions, sheets, sticky bar |
| `surface-raised-2` | `#fbf1e4` | `#1d2e4a` | Hover, nested cards, progress tracks, soft bands |
| `surface-sunken` | `#f8eee1` | `#0b1524` | Inputs, prompt/code boxes |
| `line` | `#eedfcb` | cream at 12% | Hairline borders, dividers |
| `ink` | `#14213a` navy (15.2:1) | `#fff8f0` (17:1) | Main text |
| `ink-muted` | `#5a5f6e` (6.1:1) | `#a9b4c7` (8.3:1) | Secondary text, captions |
| `gold` | `#ffb627` | same | FILL only: primary button, progress, logo tile |
| `gold-deep` | `#f5a300` | same | Hover/pressed gold |
| `on-gold` | `#14213a` (9.2:1) | same | Text/icons on gold. NEVER white on gold |
| `gold-text` | `#a84b08` (5.4:1, ≥4.98 on every light surface) | `#ffc21a` (10.7:1) | Gold used AS TEXT: eyebrows, links, small labels |
| `saffron` | `#d96a00` (3.3:1, 24px+ only) | `#ffc21a` | The ONE highlighted word in a big heading |
| `gold-soft` | `#fff1d6` | gold at 12% | Tinted chips, featured tier, offer box |
| `fire` | `#c2361a` | `#ff7a59` | REAL urgency only, errors |
| `success` | `#0b7a5c` | `#4cc38a` | Paid, completed — always with ✓ or a word |
| `bezel` | `#14213a` | `#0b1524` | Phone frames, video thumbnails before the poster loads |

**Colour rules**
- 60-30-10: ~60% cream/white, ~30% navy (text + bands), ~10% gold. If everything is gold, nothing is.
- **ONE gold primary button visible per screen.** Everything else is secondary (ink outline) or ghost (gold-text link).
- All text pairs above pass WCAG AA. `saffron` on cream is for 24px+ headings only. Don't invent new text colours.
- No gradients on surfaces, no gradient text, no coloured glows, no blobs, no stars or grain, no glass. Allowed: a dark fade over a video so its text stays readable.
- Video, reel thumbnails and phone mockups sit on `bezel` (navy), never on cream.

### 3.2 Typography

Fonts via `next/font/google` (self-hosted, `display: swap`):
- **Bricolage Grotesque** 600/700/800 — headings, prices, big numbers. **Sentence case**, tight tracking on big sizes only. (Latin only: a Hindi-script heading falls back to Poppins.)
- **Poppins** 400/500/600/700 (+ Devanagari) — everything else.
- Anton is retired from the UI. The logo SVGs keep their own lettering.
- No ALL-CAPS headings and no uppercase wide-tracked labels. Write copy in sentence case in the JSON; never rely on CSS to uppercase.

| Style (utility) | Font | Mobile → desktop | Line height | Use |
|---|---|---|---|---|
| `type-display-xl` | Bricolage 800, -0.03em | 44 → 76px | 1.02 | Hero headline (one per page), the partner earnings figure |
| `type-display` | Bricolage 800, -0.025em | 32 → 52px | 1.06 | Section headings |
| `type-heading` | Bricolage 700, -0.02em | 24 → 32px | 1.15 | Card titles, dashboard titles |
| `type-price` / `type-stat` | Bricolage 800 / 700, tabular | 40 → 56 / 32 → 44px | 1.0 | Prices / big numbers |
| `type-title` | Poppins 700 | 20 → 22px | 1.35 | Sub-headlines, lesson titles |
| `type-body-lg` | Poppins 400 | 18 → 20px | 1.55 | Hero sub, lead paragraphs |
| `type-body` | Poppins 400 | 16 → 17px | 1.6 | Default text |
| `type-small` | Poppins 400 | 13px | 1.45 | Disclaimers, meta (minimum size) |
| `type-label` | Poppins 600, no tracking | 13px | 1.25 | Eyebrow chips, badges (sentence case) |
| `type-button` | Poppins 600 | 17px | 1 | Button labels, Title Case |

Highlight ONE word per heading with `*stars*` in the copy ("Phone se *viral* tak"). Headlines end without a period.

### 3.3 Spacing, radius, shadow, motion

- Spacing scale (px): 4, 8, 12, 16, 24, 32, 48, 64. Mobile gutter 16px. Section padding 48px mobile / 64–96px desktop. Max content width 1120px; reading text max 640px.
- Radius: `sm` 8px (badges, chips, inputs) · `md` 12px (buttons, thumbnails) · `lg` 16px (cards) · `sheet` 20px (bottom sheets, big panels) · `pill` 999px (sticky CTA, segmented toggles only). Not everything is a pill.
- Shadows (neutral, navy-tinted, never coloured): `shadow-card` (soft `0 1px 2px`) under white cards · `shadow-lift` for floating things (sheets, sticky bar, dropdowns, featured price card) · the primary button gets a tiny bottom edge (the `glow-gold` token, which no longer glows). Cards = 1px `line` border + `shadow-card`. On navy, depth comes from surface steps, not shadows.
- Motion: one easing curve `cubic-bezier(0.22,1,0.36,1)`; UI transitions 150–250ms. Section reveal on scroll: fade-up, once, only for headings/cards. Buttons: `scale(.98)` on press. Cards lift at most 2px on hover. Numbers may count up once. No floating loops, shimmer, pulsing or parallax. Respect `prefers-reduced-motion`. No autoplaying sound ever.

### 3.4 Implementation

- Tokens are CSS variables in `src/app/globals.css`: `:root, [data-theme="day"]` (daylight) and `[data-theme="night"]` (navy). Tailwind v4 maps them in `@theme inline` (there is no `tailwind.config.ts`): `bg-surface`, `text-ink`, `text-gold-text`, `text-saffron`, `border-line`, `shadow-card`, `bg-bezel` …
- The old night-sky helpers (`sky-stars`, `sky-horizon`, `sky-dusk`, `sun-glow`, `film-grain`, `shimmer-once`, `float-slow`) remain only as harmless no-ops or plain backgrounds so older markup keeps working. Don't use them in new code; use `data-theme="night"` for a navy band.
- `/design` (dev-only) is the living style guide.
- Icons: **lucide-react** only, 2px stroke, 20px in UI / 24px in dashboards, coloured `ink` or `ink-muted` (`on-gold` inside gold buttons). No emoji as UI icons (emoji only inside Hinglish marketing copy, max one per line, never in buttons, headlines, invoices or admin).

### 3.5 Reference look (owner-approved, Nov 2026) — overrides the stricter lines above

The owner chose this look from their reference designs. Where it conflicts with 3.1–3.3, this wins:
- **Headings:** Plus Jakarta Sans 800 (replaces Bricolage). The ONE key word sits on a hand-painted gold **brush stroke** (`hl-brush`, navy text on gold) — made by `<Highlight>` from `*stars*` in the copy.
- **Buttons:** every button is a **pill**. Primary = gold with a soft warm gold glow (`shadow-glow-gold`).
- **Chips:** eyebrows and badges are yellow pills (`bg-gold-chip`, navy text) with a small icon where it helps.
- **Sparks:** `<Sparks>` (three short gold strokes) next to the hero headline and media. Max 2–3 per screen.
- **Hero:** warm sunlight glow + dot grid (`hero-glow`), video in a white frame with a gold halo (`media-frame`), offer card with gold border, white stats strip with icon tiles (`HeroStats`), green tick doubt-killers.
- **Navy panels:** the problem section is a rounded navy panel with a paper plane; the final CTA is navy with a gold circle (creator photo when `hero.personUrl` is set) and a cream cloud edge into a cream footer.
- **Apps:** sidebar active item = gold pill; stat cards get a gold icon tile; continue-watching card uses a gold chip.
- **Checkout:** gold-tick inclusions, a gold total bar, a navy "Aapki details" pill heading, and a navy trust strip at the bottom.
- **Hero photo:** `hero.personUrl` (landing.json or Admin → Landing content) — a transparent PNG/WebP of a REAL person from the team (cut-out, about 720×880). Empty = no photo; the layout still works.
- Still true: one key word per heading, WCAG AA for all text, real numbers only, no fake people presented as students, scroll reveal + flight path animation kept.

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
| `Button` | variants `primary` (flat gold, on-gold text, no glow), `secondary` (ink 2px outline), `ghost` (gold-text underline); sizes md (48px) / lg (56px); `block` for full width; loading state with spinner and disabled; optional trailing arrow icon |
| `Badge` | tones `gold` (soft), `solid` (most popular), `fire` (live/real deadline), `success` (✓), `neutral`; uppercase label style |
| `StatChip` | big Bricolage number in ink + small muted caption |
| `SectionHeader` | eyebrow chip (gold-soft, sentence case) + Bricolage heading with ONE saffron word + optional sub (body-lg, ink-muted) |
| `ReelPlayer` | 9:16 muted autoplay loop, poster first, lazy, rounded md, play/pause button, "tap for sound" pill; pauses off-screen |
| `PriceCard` | tier badge, name, price in ink, ✓ inclusions (success ticks), CTA; `featured` = 2px gold border + `shadow-lift` + solid badge + primary button |
| `TierCompareTable` | mobile: stacked cards with a "Compare" toggle; desktop: table; ✓/✕ with text labels |
| `StickyBuyBar` | mobile only, appears after hero scrolls out, price + 1-line reassurance + pill CTA, respects safe-area-inset-bottom, hides when a sheet/checkout is open |
| `BottomSheet` | mobile lead/opt-in sheet, drag handle, close button 44px, focus trap, ESC closes, desktop = centered modal |
| `Accordion` | for curriculum and FAQ, one open at a time optional, `+`→`−` icon, animated height |
| `CurriculumModule` | module title, lesson count + total min, lessons with ▶ / 🔒 / "FREE PREVIEW" badge |
| `TestimonialCard` | real student only: avatar, name, handle, their reel thumbnail, quote, result chip, "Results vary" line; hidden section until ≥3 exist |
| `IncomeDisclaimer` | info icon + honesty line, dashed border, sunken bg; mandatory under any income claim |
| `GuaranteeBox` | shield icon, refund days, simple terms in plain Hinglish |
| `Countdown` | renders ONLY if a real `deadline` prop exists; days/hours/min in Bricolage, fire label; auto-hides at 0 |
| `RecentPurchaseToast` | real orders only, "Someone from [city] joined [x] min ago", bottom-left, max 1 per 20s, dismissible, admin toggle |
| `TrustRow` | Razorpay/UPI logos, "Secure payment", refund days, WhatsApp support |
| `Input`, `PhoneInput (+91)`, `Checkbox`, `CouponField` | 48px tall, sunken bg, label above, inline validation in Hinglish, numeric keypad for phone |
| `ProgressBar` / `ProgressRing` | gold fill on line track, % label |
| `StatCard` (dashboards) | label, big Bricolage number, delta vs previous period (↑ success / ↓ muted, never red-shaming), quiet muted sparkline |
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

1. **Hero** — cream background under the navy header; the headline word gets the hand-drawn gold underline.
   - Mobile layout: eyebrow chip ("Hinglish • Phone se • Free tools") → `display-xl` headline with gold word → body-lg sub → primary CTA "₹[499] mein Join Karo" (full width) + ghost "Free Lesson Dekho" → 3 StatChips (real numbers: 40+ lessons, 300+ prompts, ₹0 tools) → ReelPlayer (9:16, 70% width, slightly rotated −3° navy phone frame with a soft neutral shadow, a second reel peeking behind it).
   - Desktop: 2 columns — copy left, stacked reels right.
   - Tiny trust line under CTA: "UPI • [7]-din refund • Lifetime access".
2. **Reel wall** ("Ye sab phone se bana hai") — horizontal swipe strip of 4–6 sample reels made by us (labelled "Made by Get Udaan team"; student reels only when real and permitted).
3. **Problem** (navy band) — "Kya ye aapke saath ho raha hai?" 4 pain cards (icon + one line): views nahi aate, editing nahi aati, tools paid lagte hain, idea khatam ho jaate hain. Ends with: "Ab nahi."
4. **Ways creators earn** — 4 cards (brand deals, YouTube/FB monetisation, client work, own products) each with a short honest explanation + **IncomeDisclaimer** directly underneath.
5. **How it works (5 steps)** — vertical timeline on mobile with speed-trail connectors: Character banao → Story likho → AI se animate karo → Edit + post → Grow + earn. Each step: number in a gold-ringed node, title, one line, tiny GIF/screenshot.
6. **Curriculum** — accordion of modules; free-preview lessons have a "FREE" badge and open the free lesson (lead opt-in). Summary row: "40+ lessons • 320+ min • 720p • Hinglish".
7. **Bonuses** — gold-soft box: 300+ prompt pack, PDF guide, story templates, income module — each with a mock cover image and a "value" line only if true.
8. **Student results** — TestimonialCards carousel; whole section hidden until ≥3 real ones.
9. **Pricing** — 3 PriceCards (Basic / **Pro featured** / Done-with-you), mobile order: Pro first. Countdown above only if real deadline. Order of info: what you get → price → CTA. Below: "Compare plans" toggle.
10. **Guarantee** — GuaranteeBox, big shield, "[7] din mein pasand nahi aaya? Refund. Simple." + link to policy.
11. **FAQ** — objection-handling accordion (8–12): laptop chahiye?, paid tools?, kitna time?, Hindi mein hai?, payment safe?, refund?, kab tak access?, kya income guarantee hai? (answer honestly: nahi), certificate?, support?
12. **Partner recruitment** — cream/gold-soft split block: "Viral page hai? Partner bano — har sale pe [50]% kamao." CTA secondary "Partner Apply Karo".
13. **Final CTA** — navy band, big line "Udaan *bharo*" + primary CTA + trust row.
14. **StickyBuyBar** (mobile) from section 2 onward.

Lead opt-in BottomSheet triggers (once per session): "Free Lesson" CTAs, 60% scroll, desktop exit intent. Content: "Pehla lesson FREE + 20 prompts" · name + WhatsApp number (or email toggle) · consent checkbox · gold CTA "Free Lesson Pao" · "Spam nahi karenge." Close button always visible.

### 7.3 Free lesson page (`/free-lesson`)
Video player top (full width mobile), lesson title, short notes, downloadable 20 prompts. Under the video: soft upgrade card — "Ye toh sirf lesson 1 tha. Baaki 39 lessons + 300 prompts ₹[499] mein." + CTA. Progress hint: "1 / 40 lessons".

### 7.4 Checkout (`/checkout`)
ONE action: pay. Remove the header nav and footer links (logo only + "Secure checkout 🔒").
- Mobile single column: Order summary card (product, price, coupon line, total in Bricolage) → Name → WhatsApp number (+91) → Email → Order bump (gold-soft card with checkbox: "Haan, Advanced Prompt Pack bhi add karo — ₹149") → CouponField (pre-filled from partner) → Pay button "₹[total] Pay Karo" (full width, flat gold) → TrustRow → refund line → "Help chahiye? WhatsApp karo".
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
- **Certificate:** day theme, stacked logo, student name in Bricolage, course, date, certificate ID, QR to verify; 1080×1920 story version for sharing.

### 7.7 Partner experience — make them feel like rockstars
Partners are our sales team; their dashboard must be the most motivating screen on the site.
- **Partner landing (`/partner`):** hero "TUMHARA PAGE. TUMHARI KAMAAI." · how it works (3 steps: apply → share link → earn) · commission explained with a simple calculator (slider: sales/month → estimated commission, with IncomeDisclaimer) · payout schedule · FAQ · Apply CTA.
- **Apply form:** multi-step (3 short steps with progress), Instagram handle with live @ formatting, UPI field, friendly success screen "Application mil gayi! 48 ghante mein reply karenge."
- **Partner dashboard (`/partner/dashboard`), mobile-first:**
  - Top: greeting + big gold "Total earnings" StatCard (navy card, Bricolage, count-up animation once) with pending / approved / paid split.
  - Quick actions row (sticky on mobile): Copy Link · Copy Coupon · Share on WhatsApp · Share to Instagram — each gives instant toast "Copied! ✓".
  - StatCards: clicks, leads, sales, conversion %, with 7/30/90-day toggle.
  - Total earnings = the screen's moment: a navy card with the big gold number.
  - Earnings chart (Recharts: saffron line over a soft gold area, gridlines `line` colour).
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
- Open Graph image 1200×630 per page: navy bg, bold sentence-case headline with one gold word, logo (`src/lib/og.tsx`).

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
- Stock photos, lorem ipsum, AI-trope design (purple gradients, glass cards, emoji icons, left-border accent cards, coloured glows, blobs, gradient text, ALL-CAPS tracked labels).
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
- [ ] Only tokens/components used; looks right on cream and inside navy bands
- [ ] Perfect at 360px, 414px, 768px, 1280px
- [ ] Exactly one primary CTA in view at any time
- [ ] Every income mention has the IncomeDisclaimer
- [ ] Urgency/social proof only from real data
- [ ] All copy in the content layer, Hinglish, voice rules followed
- [ ] Keyboard + screen reader basics pass, focus visible
- [ ] Lighthouse mobile ≥ 90 performance, no layout shift
- [ ] Funnel events fired (PROJECT_BRIEF §4.8)
- [ ] Phone-testing checklist given to me
