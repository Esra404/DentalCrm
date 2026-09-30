import {
  randomBytes,
  scrypt as scryptCallback,
  scryptSync,
  timingSafeEqual,
} from "node:crypto";

const KEY_LENGTH = 64;
const MAX_PASSWORD_BYTES = 1024;
const SCRYPT_OPTIONS = {
  N: 1 << 15,
  r: 8,
  p: 1,
  maxmem: 64 * 1024 * 1024,
};
const DUMMY_PASSWORD_HASH = (() => {
  const salt = randomBytes(16);
  const key = scryptSync(randomBytes(32), salt, KEY_LENGTH, SCRYPT_OPTIONS);

  return [
    "scrypt",
    SCRYPT_OPTIONS.N,
    SCRYPT_OPTIONS.r,
    SCRYPT_OPTIONS.p,
    salt.toString("base64url"),
    key.toString("base64url"),
  ].join("$");
})();

function deriveKey(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scryptCallback(password, salt, KEY_LENGTH, SCRYPT_OPTIONS, (error, key) => {
      if (error) {
        reject(error);
        return;
      }

      resolve(key);
    });
  });
}

export async function hashPassword(password: string): Promise<string> {
  if (!password || Buffer.byteLength(password, "utf8") > MAX_PASSWORD_BYTES) {
    throw new Error("Password length is invalid");
  }

  const salt = randomBytes(16);
  const key = await deriveKey(password, salt);

  return [
    "scrypt",
    SCRYPT_OPTIONS.N,
    SCRYPT_OPTIONS.r,
    SCRYPT_OPTIONS.p,
    salt.toString("base64url"),
    key.toString("base64url"),
  ].join("$");
}

export async function verifyPassword(
  password: string,
  encodedHash: string,
): Promise<boolean> {
  if (!password || Buffer.byteLength(password, "utf8") > MAX_PASSWORD_BYTES) {
    return false;
  }

  const [algorithm, cost, blockSize, parallelization, saltValue, keyValue, extra] =
    encodedHash.split("$");

  if (
    algorithm !== "scrypt" ||
    Number(cost) !== SCRYPT_OPTIONS.N ||
    Number(blockSize) !== SCRYPT_OPTIONS.r ||
    Number(parallelization) !== SCRYPT_OPTIONS.p ||
    !saltValue ||
    !keyValue ||
    extra !== undefined
  ) {
    return false;
  }

  const salt = Buffer.from(saltValue, "base64url");
  const expectedKey = Buffer.from(keyValue, "base64url");

  if (salt.length !== 16 || expectedKey.length !== KEY_LENGTH) {
    return false;
  }

  const actualKey = await deriveKey(password, salt);
  return timingSafeEqual(actualKey, expectedKey);
}

export async function verifyLoginPassword(
  password: string,
  storedHash: string | null | undefined,
): Promise<boolean> {
  const hasStoredHash = typeof storedHash === "string" && storedHash.length > 0;
  const hashToVerify = hasStoredHash ? storedHash : DUMMY_PASSWORD_HASH;
  const matches = await verifyPassword(password, hashToVerify);

  return hasStoredHash && matches;
}