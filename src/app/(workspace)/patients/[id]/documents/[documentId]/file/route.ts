import { Role } from "@/generated/prisma/enums";
import { requireRoles } from "@/lib/auth/authorization";
import { readLocalDocument } from "@/lib/documents/storage";
import { prisma } from "@/lib/prisma";
import {
  PATIENT_DOCUMENT_ID_PATTERN,
  PATIENT_DOCUMENT_MIME_TYPES,
  detectPatientDocumentMimeType,
} from "@/lib/validations/patient-document";

function isAllowedMimeType(value: string): value is (typeof PATIENT_DOCUMENT_MIME_TYPES)[number] {
  return PATIENT_DOCUMENT_MIME_TYPES.some((mimeType) => mimeType === value);
}

function isMissingFile(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "ENOENT"
  );
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; documentId: string }> },
) {
  await requireRoles(Role.ADMIN, Role.STAFF, Role.DOCTOR);
  const { id, documentId } = await params;
  if (
    !PATIENT_DOCUMENT_ID_PATTERN.test(id) ||
    !PATIENT_DOCUMENT_ID_PATTERN.test(documentId)
  ) {
    return new Response("Belge bulunamadı.", { status: 404 });
  }

  const document = await prisma.patientDocument.findFirst({
    where: { id: documentId, patientId: id, deletedAt: null },
    select: {
      storageProvider: true,
      storageKey: true,
      fileName: true,
      mimeType: true,
      sizeBytes: true,
    },
  });
  if (
    !document ||
    document.storageProvider !== "local" ||
    !isAllowedMimeType(document.mimeType)
  ) {
    return new Response("Belge bulunamadı.", { status: 404 });
  }

  let content: Buffer;
  try {
    content = await readLocalDocument(document.storageKey);
  } catch (error) {
    if (!isMissingFile(error)) {
      console.error("Hasta belgesi okunamadı.", error);
      return new Response("Belge şu anda görüntülenemiyor.", { status: 500 });
    }
    console.error("Belge kaydı var ancak depolama dosyası bulunamadı.", {
      documentId,
    });
    return new Response("Belge bulunamadı.", { status: 404 });
  }
  if (
    content.byteLength !== Number(document.sizeBytes) ||
    detectPatientDocumentMimeType(content) !== document.mimeType
  ) {
    console.error("Hasta belgesi içeriği kayıt bilgileriyle uyuşmuyor.", {
      documentId,
    });
    return new Response("Belge şu anda görüntülenemiyor.", { status: 500 });
  }

  const encodedName = encodeURIComponent(document.fileName).replace(
    /[!'()*]/g,
    (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`,
  );
  return new Response(new Uint8Array(content), {
    headers: {
      "Cache-Control": "private, no-store",
      "Content-Disposition": `inline; filename*=UTF-8''${encodedName}`,
      "Content-Length": document.sizeBytes.toString(),
      "Content-Type": document.mimeType,
      "Referrer-Policy": "no-referrer",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
