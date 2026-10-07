import "server-only";

import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

const STORAGE_KEY_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const storageRoot = path.join(process.cwd(), ".private-storage", "patient-documents");

function resolveStoragePath(storageKey: string): string {
  if (!STORAGE_KEY_PATTERN.test(storageKey)) {
    throw new Error("Invalid patient document storage key.");
  }
  return path.join(storageRoot, `${storageKey}.private`);
}

export async function writeLocalDocument(
  storageKey: string,
  content: Uint8Array,
): Promise<void> {
  const filePath = resolveStoragePath(storageKey);
  await mkdir(storageRoot, { recursive: true, mode: 0o700 });
  await writeFile(filePath, content, { flag: "wx", mode: 0o600 });
}

export async function readLocalDocument(
  storageKey: string,
): Promise<Buffer> {
  return readFile(resolveStoragePath(storageKey));
}

export async function removeLocalDocument(storageKey: string): Promise<void> {
  await rm(resolveStoragePath(storageKey), { force: true });
}
