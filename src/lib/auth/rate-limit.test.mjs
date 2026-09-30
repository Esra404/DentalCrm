import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import {
  beginLoginAttempt,
  LOGIN_RATE_LIMIT_POLICY,
} from "./rate-limit.ts";

function reserve(email, now) {
  const attempt = beginLoginAttempt(email, now);
  assert.equal(attempt.limited, false);
  return attempt;
}

test("blocks after the configured failed-attempt threshold", () => {
  const email = `${randomUUID()}@example.invalid`;
  const start = 1_800_000_000_000;

  for (let index = 0; index < LOGIN_RATE_LIMIT_POLICY.maxFailures; index += 1) {
    reserve(email, start).complete(false);
  }

  assert.deepEqual(beginLoginAttempt(email, start), { limited: true });
  assert.notDeepEqual(beginLoginAttempt(`${randomUUID()}@example.invalid`, start), {
    limited: true,
  });
});

test("failure bucket expires after the bounded window", () => {
  const email = `${randomUUID()}@example.invalid`;
  const start = 1_800_000_000_000;

  for (let index = 0; index < LOGIN_RATE_LIMIT_POLICY.maxFailures; index += 1) {
    reserve(email, start).complete(false);
  }

  assert.equal(
    beginLoginAttempt(
      email,
      start + LOGIN_RATE_LIMIT_POLICY.windowMs,
    ).limited,
    false,
  );
});

test("successful authentication clears previous failures", () => {
  const email = `${randomUUID()}@example.invalid`;
  const start = 1_800_000_000_000;

  for (let index = 0; index < LOGIN_RATE_LIMIT_POLICY.maxFailures - 1; index += 1) {
    reserve(email, start).complete(false);
  }

  reserve(email, start).complete(true);
  assert.equal(beginLoginAttempt(email, start).limited, false);
});

test("reserves in-flight attempts so concurrent requests cannot bypass the limit", () => {
  const email = `${randomUUID()}@example.invalid`;
  const start = 1_800_000_000_000;
  const inFlight = Array.from(
    { length: LOGIN_RATE_LIMIT_POLICY.maxFailures },
    () => reserve(email, start),
  );

  assert.deepEqual(beginLoginAttempt(email, start), { limited: true });
  for (const attempt of inFlight) attempt.complete(false);
  assert.deepEqual(beginLoginAttempt(email, start), { limited: true });
});

test("case and surrounding whitespace share one normalized email bucket", () => {
  const email = `${randomUUID()}@example.invalid`;
  const start = 1_800_000_000_000;

  for (let index = 0; index < LOGIN_RATE_LIMIT_POLICY.maxFailures; index += 1) {
    reserve(email, start).complete(false);
  }

  assert.deepEqual(beginLoginAttempt(` ${email.toUpperCase()} `, start), {
    limited: true,
  });
});

test("does not exceed the tracked-identifier capacity during concurrent attempts", () => {
  const start = 1_800_000_000_000;
  const inFlight = [];
  let rejected = false;

  for (let index = 0; index <= LOGIN_RATE_LIMIT_POLICY.maxTrackedEmails; index += 1) {
    const attempt = beginLoginAttempt(
      `capacity-${index}-${randomUUID()}@example.invalid`,
      start,
    );
    if (attempt.limited) {
      rejected = true;
      break;
    }
    inFlight.push(attempt);
  }

  assert.equal(rejected, true);
  for (const attempt of inFlight) attempt.complete();
});