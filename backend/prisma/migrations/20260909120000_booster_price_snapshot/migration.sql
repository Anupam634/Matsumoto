-- Pin the USD price on each booster purchase.
--
-- Revenue was being reported as (purchase count × the plan's *current*
-- price), so repricing a plan retroactively rewrote every past day's
-- takings. Backfill from the plan, then make the column required: from here
-- the quote carries its own price, like it already carries its own token
-- amount and payee.
ALTER TABLE "BoosterPurchase" ADD COLUMN "priceUsd" INTEGER;

UPDATE "BoosterPurchase" bp
SET "priceUsd" = p."priceUsd"
FROM "BoosterPlan" p
WHERE p."id" = bp."planId";

ALTER TABLE "BoosterPurchase" ALTER COLUMN "priceUsd" SET NOT NULL;

-- Revenue reads walk confirmed purchases by confirmation date.
CREATE INDEX "BoosterPurchase_status_confirmedAt_idx"
  ON "BoosterPurchase"("status", "confirmedAt");

-- The dashboard sums minted points per day across every user. The only
-- index on the ledger leads with "userId", which a date-range predicate on
-- its own cannot use — so this was a sequential scan of the table that grows
-- with every tap.
CREATE INDEX "LedgerEntry_createdAt_idx" ON "LedgerEntry"("createdAt");
