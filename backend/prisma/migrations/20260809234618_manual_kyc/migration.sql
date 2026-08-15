-- CreateEnum
CREATE TYPE "KycDocumentType" AS ENUM ('PASSPORT', 'NATIONAL_ID', 'DRIVERS_LICENSE');

-- AlterTable
ALTER TABLE "KycRecord" ADD COLUMN     "countryCode" TEXT,
ADD COLUMN     "documentNumber" TEXT,
ADD COLUMN     "documentType" "KycDocumentType",
ADD COLUMN     "fullName" TEXT,
ADD COLUMN     "reviewedAt" TIMESTAMP(3),
ADD COLUMN     "reviewerNote" TEXT,
ADD COLUMN     "submittedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "KycDocument" (
    "id" TEXT NOT NULL,
    "recordId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "data" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KycDocument_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "KycDocument_recordId_idx" ON "KycDocument"("recordId");

-- AddForeignKey
ALTER TABLE "KycDocument" ADD CONSTRAINT "KycDocument_recordId_fkey" FOREIGN KEY ("recordId") REFERENCES "KycRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;
