-- Account security: authenticator-app 2FA, session revocation, the admin
-- audit trail, per-account security events, and admin-editable settings.
--
-- Every added column is nullable or defaulted, so `db push` (the EC2 deploy)
-- can apply this to populated tables too. Existing tokens carry no session
-- version and are read as version 0, which is what every row starts at —
-- miners stay signed in. Admin tokens are different on purpose: the guard
-- now requires a version claim, so every admin signs in again, through the
-- emailed code.

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "sessionVersion" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "totpEnabledAt" TIMESTAMP(3),
ADD COLUMN     "totpFailedCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "totpLastStep" INTEGER,
ADD COLUMN     "totpLockedUntil" TIMESTAMP(3),
ADD COLUMN     "totpSecret" TEXT;

-- AlterTable
ALTER TABLE "Withdrawal" ADD COLUMN     "requestFingerprint" TEXT,
ADD COLUMN     "requestIp" TEXT,
ADD COLUMN     "requestPlatform" TEXT,
ADD COLUMN     "secondFactor" TEXT;

-- AlterTable
ALTER TABLE "AdminUser" ADD COLUMN     "sessionVersion" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "AdminAuditLog" (
    "id" TEXT NOT NULL,
    "adminId" TEXT,
    "adminEmail" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "target" TEXT,
    "outcome" TEXT NOT NULL,
    "detail" JSONB,
    "ip" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserSecurityEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "ip" TEXT,
    "fingerprint" TEXT,
    "platform" TEXT,
    "userAgent" TEXT,
    "detail" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserSecurityEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppSetting" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT,

    CONSTRAINT "AppSetting_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE INDEX "AdminAuditLog_createdAt_idx" ON "AdminAuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "AdminAuditLog_adminId_createdAt_idx" ON "AdminAuditLog"("adminId", "createdAt");

-- CreateIndex
CREATE INDEX "UserSecurityEvent_userId_createdAt_idx" ON "UserSecurityEvent"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "UserSecurityEvent_createdAt_idx" ON "UserSecurityEvent"("createdAt");

-- AddForeignKey
ALTER TABLE "UserSecurityEvent" ADD CONSTRAINT "UserSecurityEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

