-- Patient records remain in Patient; legacy patient login accounts are disabled.
UPDATE "User"
SET "role" = 'STAFF', "isActive" = false
WHERE "role" = 'PATIENT';

ALTER TABLE "User" ALTER COLUMN "role" DROP DEFAULT;

CREATE TYPE "Role_new" AS ENUM ('ADMIN', 'STAFF', 'DOCTOR');

ALTER TABLE "User"
ALTER COLUMN "role" TYPE "Role_new"
USING ("role"::text::"Role_new");

ALTER TYPE "Role" RENAME TO "Role_old";
ALTER TYPE "Role_new" RENAME TO "Role";
DROP TYPE "Role_old";

ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'STAFF';
