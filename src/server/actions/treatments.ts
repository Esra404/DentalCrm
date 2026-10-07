"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Role } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { requireRoles } from "@/lib/auth/authorization";
import { getChangedFields } from "@/lib/audit/changed-fields";
import { writeAuditLog } from "@/lib/audit/write-audit-log";
import {
  TREATMENT_ID_PATTERN,
  treatmentInputFromFormData,
  validateTreatmentInput,
  type TreatmentActionState,
} from "@/lib/validations/treatment";

const treatmentRoles = [Role.ADMIN, Role.STAFF, Role.DOCTOR] as const;

function readTreatmentId(formData: FormData): string | null {
  const id = formData.get("treatmentId");
  return typeof id === "string" && TREATMENT_ID_PATTERN.test(id) ? id : null;
}

function isUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "P2002"
  );
}

export async function createTreatmentAction(
  _previousState: TreatmentActionState,
  formData: FormData,
): Promise<TreatmentActionState> {
  const user = await requireRoles(...treatmentRoles);
  const result = validateTreatmentInput(treatmentInputFromFormData(formData));
  if (!result.success) {
    return { message: "Lütfen işaretli alanları kontrol edin.", fieldErrors: result.errors };
  }

  try {
    await prisma.$transaction(async (tx) => {
      const treatment = await tx.treatment.create({
        data: result.data,
        select: { id: true },
      });
      await writeAuditLog(tx, {
        userId: user.id,
        action: "TREATMENT_CREATED",
        entity: "Treatment",
        entityId: treatment.id,
      });
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return { message: "Bu tedavi adı zaten kayıtlı." };
    }
    console.error("Tedavi kaydı oluşturulamadı.", error);
    return { message: "Tedavi kaydedilirken bir hata oluştu." };
  }

  revalidatePath("/treatments");
  redirect("/treatments?created=1");
}

export async function updateTreatmentAction(
  _previousState: TreatmentActionState,
  formData: FormData,
): Promise<TreatmentActionState> {
  const user = await requireRoles(...treatmentRoles);
  const treatmentId = readTreatmentId(formData);
  if (!treatmentId) return { message: "Tedavi bulunamadı." };

  const result = validateTreatmentInput(treatmentInputFromFormData(formData));
  if (!result.success) {
    return { message: "Lütfen işaretli alanları kontrol edin.", fieldErrors: result.errors };
  }

  try {
    await prisma.$transaction(async (tx) => {
      const current = await tx.treatment.findUnique({
        where: { id: treatmentId },
        select: {
          name: true,
          description: true,
          defaultPrice: true,
          currency: true,
        },
      });
      if (!current) throw new Error("TREATMENT_NOT_FOUND");
      const changed = getChangedFields(current, result.data);
      await tx.treatment.update({
        where: { id: treatmentId },
        data: result.data,
        select: { id: true },
      });
      if (changed.length > 0) {
        await writeAuditLog(tx, {
          userId: user.id,
          action: "TREATMENT_UPDATED",
          entity: "Treatment",
          entityId: treatmentId,
          metadata: { changedFields: changed },
        });
      }
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return { message: "Bu tedavi adı başka bir kayıtta kullanılıyor." };
    }
    console.error("Tedavi bilgileri güncellenemedi.", error);
    return { message: "Tedavi bilgileri kaydedilirken bir hata oluştu." };
  }

  revalidatePath("/treatments");
  revalidatePath(`/treatments/${treatmentId}`);
  redirect(`/treatments/${treatmentId}`);
}

export async function setTreatmentActiveAction(formData: FormData): Promise<void> {
  const user = await requireRoles(...treatmentRoles);
  const treatmentId = readTreatmentId(formData);
  const active = formData.get("active");
  if (!treatmentId || (active !== "true" && active !== "false")) {
    redirect("/treatments?error=invalid");
  }

  try {
    await prisma.$transaction(async (tx) => {
      const current = await tx.treatment.findUnique({
        where: { id: treatmentId },
        select: { isActive: true },
      });
      if (!current) throw new Error("TREATMENT_NOT_FOUND");
      const nextActive = active === "true";
      await tx.treatment.update({
        where: { id: treatmentId },
        data: { isActive: nextActive },
        select: { id: true },
      });
      if (current.isActive !== nextActive) {
        await writeAuditLog(tx, {
          userId: user.id,
          action: "TREATMENT_STATUS_CHANGED",
          entity: "Treatment",
          entityId: treatmentId,
          metadata: { isActive: nextActive },
        });
      }
    });
  } catch (error) {
    console.error("Tedavi durumu güncellenemedi.", error);
    redirect(`/treatments/${treatmentId}?error=update`);
  }

  revalidatePath("/treatments");
  revalidatePath(`/treatments/${treatmentId}`);
  redirect(`/treatments/${treatmentId}`);
}
