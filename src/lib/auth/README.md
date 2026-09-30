# Authentication boundaries

- `ADMIN` may pass administrative role checks and is intended for full system access.
- `DOCTOR` is authenticated staff; doctor-owned operations must also constrain records to the linked doctor's own records.
- `STAFF` represents reception/operations access and must not pass administrative checks.
- `PATIENT` remains a valid account role for a future portal; no patient portal is included in this phase.

Role checks do not replace record-level ownership checks. Protected server operations must call `requireAuth`, `requireRole`, or `requireRoles` and apply any resource ownership filter themselves.

## Login abuse protection

Credentials login permits five in-flight or failed attempts per normalized email in a fixed 15-minute window. A successful login clears that email's bucket; otherwise the bucket expires at the end of the window. Bucket keys are SHA-256 digests, the in-memory map is capped at 10,000 identifiers, and no attempt details or credentials are logged.

The limiter is process-local and is suitable only for local or single-instance use. It does not coordinate limits across server processes or instances. Production deployments with multiple instances must replace the in-memory store with a shared store such as Redis.