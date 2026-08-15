-- CreateEnum
CREATE TYPE "BoosterPurchaseStatus" AS ENUM ('AWAITING_PAYMENT', 'CONFIRMED', 'FAILED', 'EXPIRED');

-- AlterTable
ALTER TABLE "Booster" ADD COLUMN     "purchaseId" TEXT;

-- CreateTable
CREATE TABLE "BoosterPurchase" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "status" "BoosterPurchaseStatus" NOT NULL DEFAULT 'AWAITING_PAYMENT',
    "tokenSymbol" TEXT NOT NULL,
    "expectedUnits" TEXT NOT NULL,
    "expectedAmount" TEXT NOT NULL,
    "payToAddress" TEXT NOT NULL,
    "fromAddress" TEXT NOT NULL,
    "txHash" TEXT,
    "failureReason" TEXT,
    "confirmedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BoosterPurchase_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BoosterPurchase_txHash_key" ON "BoosterPurchase"("txHash");

-- CreateIndex
CREATE INDEX "BoosterPurchase_userId_idx" ON "BoosterPurchase"("userId");

-- CreateIndex
CREATE INDEX "BoosterPurchase_status_idx" ON "BoosterPurchase"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Booster_purchaseId_key" ON "Booster"("purchaseId");

-- AddForeignKey
ALTER TABLE "BoosterPurchase" ADD CONSTRAINT "BoosterPurchase_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BoosterPurchase" ADD CONSTRAINT "BoosterPurchase_planId_fkey" FOREIGN KEY ("planId") REFERENCES "BoosterPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booster" ADD CONSTRAINT "Booster_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES "BoosterPurchase"("id") ON DELETE SET NULL ON UPDATE CASCADE;

