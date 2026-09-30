import { createHash } from "node:crypto";

export const LOGIN_RATE_LIMIT_POLICY = {
  maxFailures: 5,
  windowMs: 15 * 60 * 1000,
  maxTrackedEmails: 10_000,
} as const;

type AttemptBucket = {
  failures: number;
  inFlight: number;
  resetAt: number;
};

type RateLimitStore = Map<string, AttemptBucket>;

const globalForRateLimit = globalThis as typeof globalThis & {
  dentalCrmLoginAttempts?: RateLimitStore;
};

const attempts =
  globalForRateLimit.dentalCrmLoginAttempts ??
  (globalForRateLimit.dentalCrmLoginAttempts = new Map());

export type LoginAttemptReservation =
  | { limited: true }
  | { limited: false; complete: (succeeded?: boolean) => void };

function getKey(email: string): string {
  return createHash("sha256")
    .update(email.trim().toLowerCase())
    .digest("hex");
}

function makeRoom(now: number): boolean {
  if (attempts.size < LOGIN_RATE_LIMIT_POLICY.maxTrackedEmails) return true;

  for (const [key, bucket] of attempts) {
    if (bucket.resetAt <= now && bucket.inFlight === 0) {
      attempts.delete(key);
    }
  }

  if (attempts.size < LOGIN_RATE_LIMIT_POLICY.maxTrackedEmails) return true;

  let oldestKey: string | undefined;
  let oldestResetAt = Number.POSITIVE_INFINITY;

  for (const [key, bucket] of attempts) {
    if (bucket.inFlight === 0 && bucket.resetAt < oldestResetAt) {
      oldestKey = key;
      oldestResetAt = bucket.resetAt;
    }
  }

  if (oldestKey) attempts.delete(oldestKey);
  return attempts.size < LOGIN_RATE_LIMIT_POLICY.maxTrackedEmails;
}

function getBucket(key: string, now: number): AttemptBucket | undefined {
  let bucket = attempts.get(key);

  if (bucket && bucket.resetAt <= now && bucket.inFlight === 0) {
    attempts.delete(key);
    bucket = undefined;
  }

  if (!bucket) {
    if (!makeRoom(now)) return undefined;
    bucket = {
      failures: 0,
      inFlight: 0,
      resetAt: now + LOGIN_RATE_LIMIT_POLICY.windowMs,
    };
    attempts.set(key, bucket);
  }

  return bucket;
}

export function beginLoginAttempt(
  email: string,
  now = Date.now(),
): LoginAttemptReservation {
  const key = getKey(email);
  const bucket = getBucket(key, now);
  if (!bucket) return { limited: true };

  if (
    bucket.failures + bucket.inFlight >=
    LOGIN_RATE_LIMIT_POLICY.maxFailures
  ) {
    return { limited: true };
  }

  bucket.inFlight += 1;
  let completed = false;

  return {
    limited: false,
    complete(succeeded) {
      if (completed) return;
      completed = true;

      if (attempts.get(key) !== bucket) return;

      bucket.inFlight -= 1;

      if (succeeded === true) {
        attempts.delete(key);
      } else if (succeeded === false) {
        bucket.failures += 1;
      }
    },
  };
}