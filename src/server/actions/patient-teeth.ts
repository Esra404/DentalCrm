"use server";

import { revalidatePath } from "next/cache";
import { Role, ToothStatus } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { requireRoles } from "@/lib/auth/authorization";
import { canDoctorAccessPatient } from "@/lib/auth/doctor-access";
import { getActiveDoctorId } from "@/lib/auth/doctor-access";
import { writeAuditLog } from "@/lib/audit/write-audit-log";

const PATIENT_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const FDI_TOOTH_PATTERN = /^(1[1-8]|2[1-8]|3[1-8]|4[1-8])$/;
const roles = [Role.ADMIN, Role.STAFF, Role.DOCTOR] as const;

export type PatientToothActionState = { message?: string; saved?: boolean };

export async function savePatientToothAction(
  _previousState: PatientToothActionState,
  formData: FormData,
): Promise<PatientToothActionState> {
  const user = await requireRoles(...roles);
  const ownDoctorId =
    user.role === Role.DOCTOR ? await getActiveDoctorId(user.id) : null;
  const patientId = formData.get("patientId");
  const toothNumberValue = formData.get("toothNumber");
  const statusValue = formData.get("status");
  const notesValue = formData.get("notes");

  if (
    typeof patientId !== "string" ||
    !PATIENT_ID_PATTERN.test(patientId) ||
    typeof toothNumberValue !== "string" ||
    !FDI_TOOTH_PATTERN.test(toothNumberValue) ||
    typeof statusValue !== "string" ||
    typeof notesValue !== "string" ||
    notesValue.trim().length > 2000
  ) {
    return { message: "Diş bilgilerini kontrol edip tekrar deneyin." };
  }
  const selectedStatus = Object.values(ToothStatus).find(
    (status) => status === statusValue,
  );
  if (!selectedStatus) {
    return { message: "Diş bilgilerini kontrol edip tekrar deneyin." };
  }
  if (
    user.role === Role.DOCTOR &&
    !(await canDoctorAccessPatient(user.id, patientId))
  ) {
    return { message: "Bu hasta için diş kaydını düzenleme yetkiniz bulunmuyor." };
  }

  try {
    await prisma.$transaction(async (tx) => {
      const patient = await tx.patient.findUnique({
        where: { id: patientId },
        select: { doctorId: true },
      });
      if (!patient) throw new Error("PATIENT_NOT_FOUND");
      if (user.role === Role.DOCTOR && patient.doctorId !== ownDoctorId) {
        throw new Error("DOCTOR_PATIENT_ACCESS_DENIED");
      }

      const toothNumber = Number(toothNumberValue);
      const current = await tx.patientTooth.findUnique({
        where: { patientId_toothNumber: { patientId, toothNumber } },
        select: { id: true, status: true, notes: true },
      });
      const tooth = await tx.patientTooth.upsert({
        where: { patientId_toothNumber: { patientId, toothNumber } },
        create: {
          patientId,
          toothNumber,
          status: selectedStatus,
          notes: notesValue.trim() || null,
        },
        update: {
          status: selectedStatus,
          notes: notesValue.trim() || null,
        },
        select: { id: true },
      });
      if (
        !current ||
        current.status !== statusValue ||
        current.notes !== (notesValue.trim() || null)
      ) {
        await writeAuditLog(tx, {
          userId: user.id,
          action: current ? "PATIENT_TOOTH_UPDATED" : "PATIENT_TOOTH_RECORDED",
          entity: "PatientTooth",
          entityId: tooth.id,
          metadata: {
            patientId,
            toothNumber,
            status: statusValue,
          },
        });
      }
    });
  } catch (error) {
    console.error("Hasta diş kaydı kaydedilemedi.", error);
    return { message: "Diş bilgileri kaydedilirken bir hata oluştu." };
  }

  revalidatePath(`/patients/${patientId}`);
  return { saved: true, message: "Diş durumu kaydedildi." };
}
