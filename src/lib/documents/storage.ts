import "server-only";

import { del, get, put } from "@vercel/blob";

const STORAGE_KEY_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function resolveStoragePath(storageKey: string): string {
  if (!STORAGE_KEY_PATTERN.test(storageKey)) {
    throw new Error("Invalid patient document storage key.");
  }

  return `patient-documents/${storageKey}`;
}

export async function writeLocalDocument(
  storageKey: string,
  content: Uint8Array,
): Promise<void> {
  const pathname = resolveStoragePath(storageKey);

  await put(pathname, Buffer.from(content), {
    access: "private",
    addRandomSuffix: false,
  });
}

export async function readLocalDocument(
  storageKey: string,
): Promise<Buffer> {
  const pathname = resolveStoragePath(storageKey);

  const result = await get(pathname, {
    access: "private",
  });

  if (!result) {
    throw new Error("Patient document not found.");
  }

  const arrayBuffer = await new Response(result.stream).arrayBuffer();

  return Buffer.from(arrayBuffer);
}

export async function removeLocalDocument(
  storageKey: string,
): Promise<void> {
  const pathname = resolveStoragePath(storageKey);

  await del(pathname);
}