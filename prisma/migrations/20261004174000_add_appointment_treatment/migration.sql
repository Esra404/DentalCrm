-- Add an optional treatment reference so existing appointments remain valid.
ALTER TABLE "Appointment"
ADD COLUMN "treatmentId" UUID;

CREATE INDEX "Appointment_treatmentId_idx" ON "Appointment"("treatmentId");

ALTER TABLE "Appointment"
ADD CONSTRAINT "Appointment_treatmentId_fkey"
FOREIGN KEY ("treatmentId") REFERENCES "Treatment"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
