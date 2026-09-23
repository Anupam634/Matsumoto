-- Multi-wallet booster payment routing, and admin permission grants.
--
-- Both new columns are non-nullable but carry a default: `db push` (used by
-- some deployments, per the note on BoosterPurchase.priceUsd) cannot add a
-- required column to a populated table, but a defaulted one is fine and
-- every existing row gets the value that already described it implicitly
-- ("default" collector, "BSC" network) before these columns existed.
ALTER TABLE "BoosterPurchase" ADD COLUMN "collectorId" TEXT NOT NULL DEFAULT 'default';
ALTER TABLE "BoosterPurchase" ADD COLUMN "network" TEXT NOT NULL DEFAULT 'BSC';

-- The finance module lists a collector's purchases and sums a collector's
-- confirmed total for the current UTC day; both are collectorId-first reads.
CREATE INDEX "BoosterPurchase_collectorId_idx" ON "BoosterPurchase"("collectorId");
CREATE INDEX "BoosterPurchase_collectorId_status_confirmedAt_idx"
  ON "BoosterPurchase"("collectorId", "status", "confirmedAt");

-- Fine-grained grants beyond an admin's role (e.g. CRYPTO_PAYMENT_VIEW).
ALTER TABLE "AdminUser" ADD COLUMN "permissions" TEXT[] NOT NULL DEFAULT '{}';
