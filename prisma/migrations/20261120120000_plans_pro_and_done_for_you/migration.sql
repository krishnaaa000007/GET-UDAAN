-- Plans: only two now (owner's decision, 2026-11-20).
--   slug "basic" (tier BASIC)  -> shown as "Pro",          Rs 499 (unchanged)
--   slug "pro"   (tier PRO)    -> shown as "Done-for-you", Rs 1,499 from now (was Rs 1,999; old price kept as history)
--   slug "done-with-you" (Rs 14,999 service) -> switched off (not sold; nobody had bought it)
-- Internal tiers/slugs stay BASIC/PRO so past orders, enrolments and commissions are untouched.
-- Times use NOW() AT TIME ZONE 'UTC' because the app stores UTC (a database set to IST would otherwise put the new price 5.5h in the future).
-- Every statement is guarded, so running it on a database that already has the change does nothing.

UPDATE "Product" SET "name" = 'Pro'
WHERE "slug" = 'basic' AND "name" = 'Basic';

UPDATE "Product"
SET "name" = 'Done-for-you',
    "tagline" = 'Team ke saath page grow karo',
    "features" = '["Pro ka sab kuch","Humari team ke saath page grow karo","Aapke content ka analysis + feedback","Content refine karne mein madad","Private community (Telegram)","Har mahine naye prompts","Monthly live Q&A"]'::jsonb
WHERE "slug" = 'pro' AND "name" = 'Pro';

-- Done-for-you price: end today's open price rows, start Rs 1,499 now (only if it isn't already Rs 1,499).
WITH p AS (SELECT "id" FROM "Product" WHERE "slug" = 'pro'),
     needs AS (
       SELECT 1 FROM "Price" pr, p
       WHERE pr."productId" = p."id" AND pr."startsAt" <= (NOW() AT TIME ZONE 'UTC') AND (pr."endsAt" IS NULL OR pr."endsAt" > (NOW() AT TIME ZONE 'UTC')) AND pr."amountPaise" <> 149900
     )
UPDATE "Price" SET "endsAt" = (NOW() AT TIME ZONE 'UTC')
WHERE "productId" = (SELECT "id" FROM p) AND "startsAt" <= (NOW() AT TIME ZONE 'UTC') AND ("endsAt" IS NULL OR "endsAt" > (NOW() AT TIME ZONE 'UTC')) AND "amountPaise" <> 149900
  AND EXISTS (SELECT 1 FROM needs);

INSERT INTO "Price" ("id", "productId", "amountPaise", "label", "startsAt", "endsAt", "createdAt")
SELECT 'price_done_for_you_149900', p."id", 149900, NULL, (NOW() AT TIME ZONE 'UTC'), NULL, (NOW() AT TIME ZONE 'UTC')
FROM "Product" p
WHERE p."slug" = 'pro'
  AND NOT EXISTS (
    SELECT 1 FROM "Price" pr WHERE pr."productId" = p."id" AND pr."amountPaise" = 149900 AND (pr."endsAt" IS NULL OR pr."endsAt" > (NOW() AT TIME ZONE 'UTC'))
  );

-- Switch off the Rs 14,999 service.
UPDATE "Product" SET "active" = false WHERE "slug" = 'done-with-you' AND "active" = true;

-- Lessons that suggested the service now suggest Done-for-you.
UPDATE "Lesson" SET "upsellProductSlug" = 'pro' WHERE "upsellProductSlug" = 'done-with-you';
