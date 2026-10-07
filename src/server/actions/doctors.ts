"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Role } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { requireRoles } from "@/lib/auth/authorization";
import { getChangedFields } from "@/lib/audit/changed-fields";
import { writeAuditLog } from "@/lib/audit/write-audit-log";
import {
  DOCTOR_ID_PATTERN,
  doctorInputFromFormData,
  validateDoctorInput,
  type DoctorActionState,
} from "@/lib/validations/doctor";

const doctorRoles = [Role.ADMIN, Role.STAFF] as const;

function readDoctorId(formData: FormData): string | null {
  const id = formData.get("doctorId");
  return typeof id === "string" && DOCTOR_ID_PATTERN.test(id) ? id : null;
}

function isUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "P2002"
  );
}

export async function createDoctorAction(
  _previousState: DoctorActionState,
  formData: FormData,
): Promise<DoctorActionState> {
  const user = await requireRoles(...doctorRoles);
  const result = validateDoctorInput(doctorInputFromFormData(formData));
  if (!result.success) {
    return { message: "Lütfen işaretli alanları kontrol edin.", fieldErrors: result.errors };
  }

  try {
    await prisma.$transaction(async (tx) => {
      const doctor = await tx.doctor.create({
        data: result.data,
        select: { id: true },
      });
      await writeAuditLog(tx, {
        userId: user.id,
        action: "DOCTOR_CREATED",
        entity: "Doctor",
        entityId: doctor.id,
      });
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return { message: "Bu lisans numarası başka bir doktorda kayıtlı." };
    }
    console.error("Doktor kaydı oluşturulamadı.", error);
    return { message: "Doktor kaydedilirken bir hata oluştu." };
  }

  revalidatePath("/doctors");
  redirect("/doctors?created=1");
}

export async function updateDoctorAction(
  _previousState: DoctorActionState,
  formData: FormData,
): Promise<DoctorActionState> {
  const user = await requireRoles(...doctorRoles);
  const doctorId = readDoctorId(formData);
  if (!doctorId) return { message: "Doktor bulunamadı." };

  const result = validateDoctorInput(doctorInputFromFormData(formData));
  if (!result.success) {
    return { message: "Lütfen işaretli alanları kontrol edin.", fieldErrors: result.errors };
  }

  try {
    await prisma.$transaction(async (tx) => {
      const current = await tx.doctor.findUnique({
        where: { id: doctorId },
        select: {
          firstName: true,
          lastName: true,
          phone: true,
          email: true,
          specialty: true,
          licenseNumber: true,
        },
      });
      if (!current) throw new Error("DOCTOR_NOT_FOUND");
      const changed = getChangedFields(current, result.data);
      await tx.doctor.update({
        where: { id: doctorId },
        data: result.data,
        select: { id: true },
      });
      if (changed.length > 0) {
        await writeAuditLog(tx, {
          userId: user.id,
          action: "DOCTOR_UPDATED",
          entity: "Doctor",
          entityId: doctorId,
          metadata: { changedFields: changed },
        });
      }
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return { message: "Bu lisans numarası başka bir doktorda kayıtlı." };
    }
    console.error("Doktor bilgileri güncellenemedi.", error);
    return { message: "Doktor bilgileri kaydedilirken bir hata oluştu." };
  }

  revalidatePath("/doctors");
  revalidatePath(`/doctors/${doctorId}`);
  redirect(`/doctors/${doctorId}`);
}

export async function setDoctorActiveAction(formData: FormData): Promise<void> {
  const user = await requireRoles(...doctorRoles);
  const doctorId = readDoctorId(formData);
  const active = formData.get("active");
  if (!doctorId || (active !== "true" && active !== "false")) {
    redirect("/doctors?error=invalid");
  }

  try {
    await prisma.$transaction(async (tx) => {
      const current = await tx.doctor.findUnique({
        where: { id: doctorId },
        select: { isActive: true },
      });
      if (!current) throw new Error("DOCTOR_NOT_FOUND");
      const nextActive = active === "true";
      await tx.doctor.update({
        where: { id: doctorId },
        data: { isActive: nextActive },
        select: { id: true },
      });
      if (current.isActive !== nextActive) {
        await writeAuditLog(tx, {
          userId: user.id,
          action: "DOCTOR_STATUS_CHANGED",
          entity: "Doctor",
          entityId: doctorId,
          metadata: { isActive: nextActive },
        });
      }
    });
  } catch (error) {
    console.error("Doktor durumu güncellenemedi.", error);
    redirect(`/doctors/${doctorId}?error=update`);
  }

  revalidatePath("/doctors");
  revalidatePath(`/doctors/${doctorId}`);
  redirect(`/doctors/${doctorId}`);
}
