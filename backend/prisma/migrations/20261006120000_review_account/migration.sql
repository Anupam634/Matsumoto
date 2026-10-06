-- The Google Play review account: signs in with the password alone, and no
-- withdrawal from it is ever approved. Defaulted, so `db push` on EC2 can add
-- it to the populated table.
ALTER TABLE "User" ADD COLUMN "isReviewAccount" BOOLEAN NOT NULL DEFAULT false;
