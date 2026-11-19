-- CreateEnum
CREATE TYPE "CommissionType" AS ENUM ('SALE', 'TEAM_L1', 'TEAM_L2');

-- DropIndex
DROP INDEX "Commission_orderId_partnerId_key";

-- AlterTable
ALTER TABLE "Commission" ADD COLUMN     "sourceCommissionId" TEXT,
ADD COLUMN     "type" "CommissionType" NOT NULL DEFAULT 'SALE';

-- AlterTable
ALTER TABLE "Partner" ADD COLUMN     "recruiterLockedAt" TIMESTAMP(3),
ADD COLUMN     "referredByPartnerId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Commission_orderId_partnerId_type_key" ON "Commission"("orderId", "partnerId", "type");

-- CreateIndex
CREATE INDEX "Partner_referredByPartnerId_idx" ON "Partner"("referredByPartnerId");

-- AddForeignKey
ALTER TABLE "Partner" ADD CONSTRAINT "Partner_referredByPartnerId_fkey" FOREIGN KEY ("referredByPartnerId") REFERENCES "Partner"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Commission" ADD CONSTRAINT "Commission_sourceCommissionId_fkey" FOREIGN KEY ("sourceCommissionId") REFERENCES "Commission"("id") ON DELETE SET NULL ON UPDATE CASCADE;

