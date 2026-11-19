-- AlterTable
ALTER TABLE "Testimonial" ADD COLUMN     "consentAt" TIMESTAMP(3),
ADD COLUMN     "proofUrl" TEXT,
ADD COLUMN     "videoUrl" TEXT;


-- FIRST100: 10% off for the first 100 buyers (masterclass offer). A normal coupon, not a partner's,
-- so it never overrides a partner's link credit. Only created if the code is free.
INSERT INTO "Coupon" ("id", "code", "kind", "value", "partnerId", "productSlugs", "maxUses", "usedCount", "active", "createdAt")
SELECT 'coupon_first100', 'FIRST100', 'PERCENT', 1000, NULL, NULL, 100, 0, true, NOW()
WHERE NOT EXISTS (SELECT 1 FROM "Coupon" WHERE "code" = 'FIRST100');
