-- Inviters can email an idle referral a reminder to mine. Record when each
-- account was last nudged so one referral cannot be reminded more than
-- once per cooldown, whoever is tapping the button.
ALTER TABLE "User" ADD COLUMN "lastReferralNudgeAt" TIMESTAMP(3);
