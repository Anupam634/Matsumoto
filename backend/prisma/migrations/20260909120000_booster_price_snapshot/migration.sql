-- Pin the USD price on each booster purchase.
--
-- Revenue was being reported as (purchase count × the plan's *current*
-- price), so repricing a plan retroactively rewrote every past day's
-- takings. Backfill from the plan, then make the column required: from here
-- the quote carries its own price, like it already carries its own token
-- amount and payee.
-- The column stays nullable: deployment syncs with `prisma db push`, which
-- would refuse a required column on a table that already has rows. Reporting
-- falls back to the plan price wherever this is null, so a database that
-- never runs this backfill still reads correctly.
ALTER TABLE "BoosterPurchase" ADD COLUMN "priceUsd" INTEGER;

UPDATE "BoosterPurchase" bp
SET "priceUsd" = p."priceUsd"
FROM "BoosterPlan" p
WHERE p."id" = bp."planId";

-- Revenue reads walk confirmed purchases by confirmation date.
CREATE INDEX "BoosterPurchase_status_confirmedAt_idx"
  ON "BoosterPurchase"("status", "confirmedAt");

-- The dashboard sums minted points per day across every user. The only
-- index on the ledger leads with "userId", which a date-range predicate on
-- its own cannot use — so this was a sequential scan of the table that grows
-- with every tap.
CREATE INDEX "LedgerEntry_createdAt_idx" ON "LedgerEntry"("createdAt");
