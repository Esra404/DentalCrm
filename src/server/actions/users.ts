"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Role } from "@/generated/prisma/enums";
import { requireRole } from "@/lib/auth/authorization";
import { hashPassword } from "@/lib/auth/password";
import { prisma } from "@/lib/prisma";
import {
  createUserInputFromFormData,
  validateCreateUserInput,
  type CreateUserActionState,
} from "@/lib/validations/user";
import { writeAuditLog } from "@/lib/audit/write-audit-log";

function isUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "P2002"
  );
}

export async function createUserAction(
  _previousState: CreateUserActionState,
  formData: FormData,
): Promise<CreateUserActionState> {
  const admin = await requireRole(Role.ADMIN);
  const result = validateCreateUserInput(createUserInputFromFormData(formData));
  if (!result.success) {
    return {
      message: "Lütfen işaretli alanları kontrol edin.",
      fieldErrors: result.errors,
    };
  }

  const passwordHash = await hashPassword(result.data.password);

  try {
    await prisma.$transaction(async (tx) => {
      const existingUser = await tx.user.findUnique({
        where: { email: result.data.email },
        select: { id: true },
      });
      if (existingUser) throw new Error("USER_EMAIL_EXISTS");

      const user = await tx.user.create({
        data: {
          name: result.data.name,
          email: result.data.email,
          passwordHash,
          role: result.data.role,
        },
        select: { id: true },
      });

      await writeAuditLog(tx, {
        userId: admin.id,
        action: "USER_CREATED",
        entity: "User",
        entityId: user.id,
        metadata: { role: result.data.role },
      });

      if (result.data.role === Role.DOCTOR) {
        const doctor = await tx.doctor.create({
          data: {
            firstName: result.data.firstName,
            lastName: result.data.lastName,
            email: result.data.email,
            specialty: result.data.specialty,
            userId: user.id,
          },
          select: { id: true },
        });

        await writeAuditLog(tx, {
          userId: admin.id,
          action: "DOCTOR_CREATED",
          entity: "Doctor",
          entityId: doctor.id,
          metadata: { userId: user.id },
        });
      }
    });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "USER_EMAIL_EXISTS"
    ) {
      return { message: "E-posta adresi zaten kullanılıyor." };
    }
    if (isUniqueConstraintError(error)) {
      return { message: "E-posta adresi zaten kullanılıyor." };
    }

    console.error("Kullanıcı hesabı oluşturulamadı.", error);
    return { message: "Kullanıcı oluşturulurken bir hata oluştu." };
  }

  revalidatePath("/users");
  revalidatePath("/doctors");
  revalidatePath("/dashboard");
  redirect("/users?created=1");
}
