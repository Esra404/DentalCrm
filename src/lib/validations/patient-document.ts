import { APPOINTMENT_ID_PATTERN } from "@/lib/validations/appointment";

export const PATIENT_DOCUMENT_ID_PATTERN = APPOINTMENT_ID_PATTERN;
export const MAX_PATIENT_DOCUMENT_BYTES = 10 * 1024 * 1024;
export const PATIENT_DOCUMENT_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
] as const;

export type PatientDocumentMimeType =
  (typeof PATIENT_DOCUMENT_MIME_TYPES)[number];

export function validatePatientDocumentName(value: FormDataEntryValue | null):
  | { success: true; name: string }
  | { success: false; message: string } {
  if (typeof value !== "string") {
    return { success: false, message: "Belge adını girin." };
  }
  const name = value.trim();
  if (
    name.length < 1 ||
    name.length > 160 ||
    /[/\\\u0000-\u001f\u007f]/.test(name) ||
    name === "." ||
    name === ".."
  ) {
    return { success: false, message: "Geçerli bir belge adı girin." };
  }
  return { success: true, name };
}

export function detectPatientDocumentMimeType(
  bytes: Uint8Array,
): PatientDocumentMimeType | null {
  const pdfSearchEnd = Math.min(bytes.length - 5, 1024);
  for (let offset = 0; offset <= pdfSearchEnd; offset += 1) {
    if (
      bytes[offset] === 0x25 &&
      bytes[offset + 1] === 0x50 &&
      bytes[offset + 2] === 0x44 &&
      bytes[offset + 3] === 0x46 &&
      bytes[offset + 4] === 0x2d
    ) {
      return "application/pdf";
    }
  }
  if (
    bytes.length >= 3 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[2] === 0xff
  ) {
    return "image/jpeg";
  }
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return "image/png";
  }
  return null;
}

export function isPatientDocumentFileTypeConsistent(
  fileName: string,
  declaredMimeType: string,
  detectedMimeType: PatientDocumentMimeType,
): boolean {
  const extension = fileName.split(".").at(-1)?.toLowerCase();
  const allowedExtensions: Record<PatientDocumentMimeType, string[]> = {
    "application/pdf": ["pdf"],
    "image/jpeg": ["jpg", "jpeg"],
    "image/png": ["png"],
  };
  return (
    declaredMimeType === detectedMimeType &&
    Boolean(extension && allowedExtensions[detectedMimeType].includes(extension))
  );
}
