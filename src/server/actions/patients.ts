"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Role } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit/write-audit-log";
import { requireRoles } from "@/lib/auth/authorization";
import {
  patientInputFromFormData,
  validatePatientInput,
  type PatientActionState,
} from "@/lib/validations/patient";

const patientRoles = [Role.ADMIN, Role.STAFF, Role.DOCTOR] as const;
const INVALID_ID_MESSAGE = "Hasta bulunamadı.";

function readId(formData: FormData): string | null {
  const value = formData.get("patientId");
  if (typeof value !== "string" || !/^[0-9a-f-]{36}$/i.test(value)) return null;
  return value;
}

export async function createPatientAction(
  _previousState: PatientActionState,
  formData: FormData,
): Promise<PatientActionState> {
  const user = await requireRoles(...patientRoles);

  const result = validatePatientInput(patientInputFromFormData(formData));
  if (!result.success) {
    return {
      message: "Lütfen işaretli alanları kontrol edin.",
      fieldErrors: result.errors,
    };
  }

  try {
    await prisma.$transaction(async (tx) => {
      const patient = await tx.patient.create({
        data: result.data,
        select: { id: true },
      });
      await writeAuditLog(tx, {
        userId: user.id,
        action: "PATIENT_CREATED",
        entity: "Patient",
        entityId: patient.id,
      });
    });
  } catch {
    return { message: "Hasta kaydedilirken bir hata oluştu." };
  }

  revalidatePath("/patients");
  redirect("/patients?created=1");
}

export async function updatePatientAction(
  _previousState: PatientActionState,
  formData: FormData,
): Promise<PatientActionState> {
  const user = await requireRoles(...patientRoles);

  const patientId = readId(formData);
  if (!patientId) return { message: INVALID_ID_MESSAGE };

  const result = validatePatientInput(patientInputFromFormData(formData));
  if (!result.success) {
    return {
      message: "Lütfen işaretli alanları kontrol edin.",
      fieldErrors: result.errors,
    };
  }

  try {
    await prisma.$transaction(async (tx) => {
      const patient = await tx.patient.update({
        where: { id: patientId },
        data: result.data,
        select: { id: true },
      });
      await writeAuditLog(tx, {
        userId: user.id,
        action: "PATIENT_UPDATED",
        entity: "Patient",
        entityId: patient.id,
      });
    });
  } catch {
    return { message: "Hasta bilgileri kaydedilirken bir hata oluştu." };
  }

  revalidatePath("/patients");
  revalidatePath(`/patients/${patientId}`);
  redirect(`/patients/${patientId}`);
}

export async function setPatientActiveAction(
  formData: FormData,
): Promise<void> {
  const user = await requireRoles(...patientRoles);

  const patientId = readId(formData);
  const activeValue = formData.get("active");
  if (!patientId || (activeValue !== "true" && activeValue !== "false")) {
    redirect("/patients");
  }

  try {
    const isActive = activeValue === "true";
    await prisma.$transaction(async (tx) => {
      const patient = await tx.patient.findUnique({
        where: { id: patientId },
        select: { isActive: true },
      });
      if (!patient) throw new Error("PATIENT_NOT_FOUND");
      if (patient.isActive === isActive) return;

      await tx.patient.update({
        where: { id: patientId },
        data: { isActive },
        select: { id: true },
      });
      await writeAuditLog(tx, {
        userId: user.id,
        action: "PATIENT_STATUS_CHANGED",
        entity: "Patient",
        entityId: patientId,
        metadata: { isActive },
      });
    });
  } catch {
    redirect(`/patients/${patientId}?error=update`);
  }

  revalidatePath("/patients");
  revalidatePath(`/patients/${patientId}`);
  redirect(`/patients/${patientId}`);
}