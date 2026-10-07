-- AlterTable
ALTER TABLE "PatientDocument" ADD COLUMN     "deletedAt" TIMESTAMPTZ(3),
ADD COLUMN     "uploadedByUserId" UUID;

-- CreateIndex
CREATE INDEX "PatientDocument_uploadedByUserId_uploadedAt_idx" ON "PatientDocument"("uploadedByUserId", "uploadedAt");

-- CreateIndex
CREATE INDEX "PatientDocument_patientId_deletedAt_uploadedAt_idx" ON "PatientDocument"("patientId", "deletedAt", "uploadedAt");

-- AddForeignKey
ALTER TABLE "PatientDocument" ADD CONSTRAINT "PatientDocument_uploadedByUserId_fkey" FOREIGN KEY ("uploadedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
