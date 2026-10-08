CREATE TYPE "ToothStatus" AS ENUM (
  'HEALTHY',
  'CARIES',
  'FILLED',
  'ROOT_CANAL',
  'CROWN',
  'MISSING',
  'IMPLANT',
  'EXTRACTION_RECOMMENDED'
);

ALTER TABLE "Patient"
ADD COLUMN "doctorId" UUID;

CREATE INDEX "Patient_doctorId_idx" ON "Patient"("doctorId");

ALTER TABLE "Patient"
ADD CONSTRAINT "Patient_doctorId_fkey"
FOREIGN KEY ("doctorId") REFERENCES "Doctor"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "PatientTooth" (
  "id" UUID NOT NULL,
  "patientId" UUID NOT NULL,
  "toothNumber" SMALLINT NOT NULL,
  "status" "ToothStatus" NOT NULL DEFAULT 'HEALTHY',
  "notes" TEXT,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "PatientTooth_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PatientTooth_toothNumber_fdi_check" CHECK (
    "toothNumber" BETWEEN 11 AND 18 OR
    "toothNumber" BETWEEN 21 AND 28 OR
    "toothNumber" BETWEEN 31 AND 38 OR
    "toothNumber" BETWEEN 41 AND 48
  )
);

CREATE UNIQUE INDEX "PatientTooth_patientId_toothNumber_key"
ON "PatientTooth"("patientId", "toothNumber");
CREATE INDEX "PatientTooth_patientId_idx" ON "PatientTooth"("patientId");

ALTER TABLE "PatientTooth"
ADD CONSTRAINT "PatientTooth_patientId_fkey"
FOREIGN KEY ("patientId") REFERENCES "Patient"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "TreatmentPlanItem"
ADD COLUMN "patientToothId" UUID;

CREATE INDEX "TreatmentPlanItem_patientToothId_idx"
ON "TreatmentPlanItem"("patientToothId");

ALTER TABLE "TreatmentPlanItem"
ADD CONSTRAINT "TreatmentPlanItem_patientToothId_fkey"
FOREIGN KEY ("patientToothId") REFERENCES "PatientTooth"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
