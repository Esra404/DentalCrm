"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Role } from "@/generated/prisma/enums";
import { requireRoles } from "@/lib/auth/authorization";
import {
  removeLocalDocument,
  writeLocalDocument,
} from "@/lib/documents/storage";
import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit/write-audit-log";
import {
  MAX_PATIENT_DOCUMENT_BYTES,
  PATIENT_DOCUMENT_ID_PATTERN,
  detectPatientDocumentMimeType,
  isPatientDocumentFileTypeConsistent,
  validatePatientDocumentName,
} from "@/lib/validations/patient-document";

const documentRoles = [Role.ADMIN, Role.STAFF, Role.DOCTOR] as const;
const documentDeleteRoles = [Role.ADMIN, Role.STAFF] as const;

export type PatientDocumentActionState = {
  message?: string;
  fieldErrors?: {
    documentName?: string;
    file?: string;
  };
};

export async function createPatientDocumentAction(
  _previousState: PatientDocumentActionState,
  formData: FormData,
): Promise<PatientDocumentActionState> {
  const user = await requireRoles(...documentRoles);
  const patientIdValue = formData.get("patientId");
  if (
    typeof patientIdValue !== "string" ||
    !PATIENT_DOCUMENT_ID_PATTERN.test(patientIdValue)
  ) {
    return { message: "Hasta bulunamadı." };
  }

  const nameValidation = validatePatientDocumentName(
    formData.get("documentName"),
  );
  if (!nameValidation.success) {
    return {
      message: nameValidation.message,
      fieldErrors: { documentName: nameValidation.message },
    };
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return {
      message: "Yüklenecek bir dosya seçin.",
      fieldErrors: { file: "Yüklenecek bir dosya seçin." },
    };
  }
  if (file.size > MAX_PATIENT_DOCUMENT_BYTES) {
    return {
      message: "Dosya boyutu en fazla 10 MB olabilir.",
      fieldErrors: { file: "Dosya boyutu en fazla 10 MB olabilir." },
    };
  }

  const content = new Uint8Array(await file.arrayBuffer());
  if (content.byteLength === 0 || content.byteLength > MAX_PATIENT_DOCUMENT_BYTES) {
    return {
      message: "Dosya boyutu geçersiz. En fazla 10 MB yükleyebilirsiniz.",
      fieldErrors: { file: "Dosya boyutu geçersiz veya sınırı aşıyor." },
    };
  }
  const detectedMimeType = detectPatientDocumentMimeType(content);
  if (
    !detectedMimeType ||
    !isPatientDocumentFileTypeConsistent(
      file.name,
      file.type,
      detectedMimeType,
    )
  ) {
    return {
      message: "Yalnızca içeriği doğrulanmış PDF, JPG/JPEG veya PNG dosyaları yüklenebilir.",
      fieldErrors: { file: "Desteklenmeyen veya içeriği doğrulanamayan dosya türü." },
    };
  }

  const storageKey = randomUUID();
  try {
    await writeLocalDocument(storageKey, content);
    await prisma.$transaction(async (tx) => {
      const patient = await tx.patient.findUnique({
        where: { id: patientIdValue },
        select: { id: true },
      });
      if (!patient) throw new Error("PATIENT_NOT_FOUND");

      const document = await tx.patientDocument.create({
        data: {
          patientId: patient.id,
          storageProvider: "local",
          storageKey,
          fileName: nameValidation.name,
          mimeType: detectedMimeType,
          sizeBytes: BigInt(content.byteLength),
          uploadedByUserId: user.id,
        },
        select: { id: true, patientId: true },
      });
      await writeAuditLog(tx, {
        userId: user.id,
        action: "PATIENT_DOCUMENT_UPLOADED",
        entity: "PatientDocument",
        entityId: document.id,
        metadata: {
          patientId: document.patientId,
          mimeType: detectedMimeType,
          sizeBytes: content.byteLength,
        },
      });
    });
  } catch (error) {
    try {
      await removeLocalDocument(storageKey);
    } catch (cleanupError) {
      console.error("Başarısız belge yüklemesinin geçici dosyası temizlenemedi.", cleanupError);
    }
    if (error instanceof Error && error.message === "PATIENT_NOT_FOUND") {
      return { message: "Hasta bulunamadı." };
    }
    console.error("Hasta belgesi yüklenemedi.", error);
    return { message: "Belge yüklenirken bir hata oluştu." };
  }

  revalidatePath(`/patients/${patientIdValue}`);
  revalidatePath(`/patients/${patientIdValue}/documents`);
  revalidatePath("/documents");
  redirect(`/patients/${patientIdValue}/documents?uploaded=1`);
}

export async function softDeletePatientDocumentAction(
  formData: FormData,
): Promise<void> {
  const user = await requireRoles(...documentDeleteRoles);
  const patientId = formData.get("patientId");
  const documentId = formData.get("documentId");
  if (
    typeof patientId !== "string" ||
    !PATIENT_DOCUMENT_ID_PATTERN.test(patientId) ||
    typeof documentId !== "string" ||
    !PATIENT_DOCUMENT_ID_PATTERN.test(documentId)
  ) {
    redirect("/documents?error=invalid");
  }

  let document: { storageKey: string } | null;
  try {
    document = await prisma.$transaction(async (tx) => {
      const existing = await tx.patientDocument.findFirst({
        where: {
          id: documentId,
          patientId,
          deletedAt: null,
        },
        select: { id: true, patientId: true, storageKey: true },
      });
      if (!existing) return null;

      const deleted = await tx.patientDocument.updateMany({
        where: { id: existing.id, patientId, deletedAt: null },
        data: { deletedAt: new Date() },
      });
      if (deleted.count !== 1) return null;
      await writeAuditLog(tx, {
        userId: user.id,
        action: "PATIENT_DOCUMENT_DELETED",
        entity: "PatientDocument",
        entityId: existing.id,
        metadata: { patientId: existing.patientId },
      });
      return existing;
    });
  } catch (error) {
    console.error("Hasta belgesi silinemedi.", error);
    redirect(`/patients/${patientId}/documents?error=delete`);
  }
  if (!document) redirect(`/patients/${patientId}/documents?error=not-found`);

  let cleanupPending = false;
  try {
    await removeLocalDocument(document.storageKey);
  } catch (error) {
    cleanupPending = true;
    console.error("Silinen hasta belgesinin dosyası temizlenemedi.", error);
  }

  revalidatePath(`/patients/${patientId}`);
  revalidatePath(`/patients/${patientId}/documents`);
  revalidatePath("/documents");
  redirect(
    `/patients/${patientId}/documents?deleted=1${cleanupPending ? "&cleanup=pending" : ""}`,
  );
}
