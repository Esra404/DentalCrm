"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { AppointmentStatus, Prisma, Role } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRoles } from "@/lib/auth/authorization";
import {
  canDoctorAccessPatient,
  getActiveDoctorId,
} from "@/lib/auth/doctor-access";
import { getChangedFields } from "@/lib/audit/changed-fields";
import { writeAuditLog } from "@/lib/audit/write-audit-log";
import {
  APPOINTMENT_ID_PATTERN,
  appointmentInputFromFormData,
  validateAppointmentInput,
  type AppointmentActionState,
  type AppointmentFieldErrors,
  type AppointmentWriteData,
} from "@/lib/validations/appointment";

const appointmentRoles = [Role.ADMIN, Role.STAFF, Role.DOCTOR] as const;

type RelatedEntity = "patientId" | "doctorId" | "treatmentId";

class AppointmentRuleError extends Error {
  constructor(
    message: string,
    readonly field?: RelatedEntity,
  ) {
    super(message);
  }
}

function readAppointmentId(formData: FormData): string | null {
  const value = formData.get("appointmentId");
  return typeof value === "string" && APPOINTMENT_ID_PATTERN.test(value)
    ? value
    : null;
}

function isPrismaError(error: unknown, code: string): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === code
  );
}

function ruleErrorState(error: AppointmentRuleError): AppointmentActionState {
  const fieldErrors: AppointmentFieldErrors = {};
  if (error.field) fieldErrors[error.field] = error.message;
  return { message: error.message, fieldErrors };
}

async function saveAppointment(
  data: AppointmentWriteData,
  appointmentId: string | null,
  userId: string,
  authorizedDoctorId: string | null,
): Promise<void> {
  await prisma.$transaction(
    async (tx) => {
      const current = appointmentId
        ? await tx.appointment.findUnique({
            where: { id: appointmentId },
            select: {
              id: true,
              patientId: true,
              doctorId: true,
              treatmentId: true,
              startsAt: true,
              endsAt: true,
              status: true,
              note: true,
            },
          })
        : null;

      if (appointmentId && !current) {
        throw new AppointmentRuleError("Randevu bulunamadı.");
      }
      const patient = await tx.patient.findUnique({
        where: { id: data.patientId },
        select: { id: true, isActive: true, doctorId: true },
      });
      if (!patient) throw new AppointmentRuleError("Hasta kaydı bulunamadı.", "patientId");
      if (!patient.doctorId) {
        throw new AppointmentRuleError("Randevu için hastaya sorumlu doktor atanmalıdır.", "patientId");
      }
      const appointmentData = { ...data, doctorId: patient.doctorId };
      const doctor = await tx.doctor.findUnique({
        where: { id: appointmentData.doctorId },
        select: { id: true, isActive: true },
      });
      const treatment = await tx.treatment.findUnique({
        where: { id: data.treatmentId },
        select: { id: true, isActive: true },
      });

      if (!doctor) throw new AppointmentRuleError("Doktor kaydı bulunamadı.", "doctorId");
      if (
        authorizedDoctorId &&
        (appointmentData.doctorId !== authorizedDoctorId ||
          current?.doctorId !== undefined && current.doctorId !== authorizedDoctorId)
      ) {
        throw new AppointmentRuleError("Yalnızca kendi sorumlu hastalarınızın randevularını düzenleyebilirsiniz.");
      }
      if (!treatment) throw new AppointmentRuleError("Tedavi kaydı bulunamadı.", "treatmentId");
      if (!patient.isActive && patient.id !== current?.patientId) {
        throw new AppointmentRuleError("Pasif hastayla yeni randevu oluşturulamaz.", "patientId");
      }
      if (!doctor.isActive && doctor.id !== current?.doctorId) {
        throw new AppointmentRuleError("Pasif doktorla yeni randevu oluşturulamaz.", "doctorId");
      }
      if (!treatment.isActive && treatment.id !== current?.treatmentId) {
        throw new AppointmentRuleError("Pasif tedavi yeni randevuda seçilemez.", "treatmentId");
      }

      if (
        data.status === AppointmentStatus.SCHEDULED ||
        data.status === AppointmentStatus.CONFIRMED
      ) {
        const overlappingAppointment = await tx.appointment.findFirst({
          where: {
              doctorId: appointmentData.doctorId,
            status: {
              in: [AppointmentStatus.SCHEDULED, AppointmentStatus.CONFIRMED],
            },
            startsAt: { lt: data.endsAt },
            endsAt: { gt: data.startsAt },
            ...(appointmentId ? { id: { not: appointmentId } } : {}),
          },
          select: { id: true },
        });
        if (overlappingAppointment) {
          throw new AppointmentRuleError(
            "Bu doktorun seçilen saat aralığında başka bir randevusu bulunuyor.",
          );
        }
      }

      if (appointmentId) {
        await tx.appointment.update({
          where: { id: appointmentId },
          data: {
            patientId: data.patientId,
            doctorId: appointmentData.doctorId,
            treatmentId: data.treatmentId,
            startsAt: data.startsAt,
            endsAt: data.endsAt,
            status: data.status,
            note: data.note,
          },
          select: { id: true },
        });
        if (current) {
          const changed = getChangedFields(current, appointmentData);
          if (changed.length > 0) {
            await writeAuditLog(tx, {
              userId,
              action: "APPOINTMENT_UPDATED",
              entity: "Appointment",
              entityId: current.id,
              metadata: { changedFields: changed },
            });
            if (current.status !== data.status) {
              await writeAuditLog(tx, {
                userId,
                action: "APPOINTMENT_STATUS_CHANGED",
                entity: "Appointment",
                entityId: current.id,
                metadata: { changedFields: ["status"] },
              });
            }
          }
        }
      } else {
        const appointment = await tx.appointment.create({
          data: {
            patientId: data.patientId,
            doctorId: appointmentData.doctorId,
            treatmentId: data.treatmentId,
            startsAt: data.startsAt,
            endsAt: data.endsAt,
            status: data.status,
            note: data.note,
          },
          select: { id: true },
        });
        await writeAuditLog(tx, {
          userId,
          action: "APPOINTMENT_CREATED",
          entity: "Appointment",
          entityId: appointment.id,
        });
      }
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
}

async function mutateAppointment(
  formData: FormData,
  appointmentId: string | null,
): Promise<AppointmentActionState> {
  const user = await requireRoles(...appointmentRoles);
  const authorizedDoctorId =
    user.role === Role.DOCTOR ? await getActiveDoctorId(user.id) : null;
  if (user.role === Role.DOCTOR && !authorizedDoctorId) {
    return { message: "Doktor profiliniz bulunamadı." };
  }

  const result = validateAppointmentInput(appointmentInputFromFormData(formData));
  if (!result.success) {
    return {
      message: "Lütfen işaretli alanları kontrol edin.",
      fieldErrors: result.errors,
    };
  }
  if (
    user.role === Role.DOCTOR &&
    !(await canDoctorAccessPatient(user.id, result.data.patientId))
  ) {
    return {
      message: "Yalnızca kendi hastalarınız için randevu oluşturabilirsiniz.",
      fieldErrors: { patientId: "Bu hasta doktor listenizde bulunmuyor." },
    };
  }

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      await saveAppointment(
        result.data,
        appointmentId,
        user.id,
        authorizedDoctorId,
      );
      break;
    } catch (error) {
      if (error instanceof AppointmentRuleError) return ruleErrorState(error);
      if (isPrismaError(error, "P2034") && attempt < 2) continue;
      if (isPrismaError(error, "P2034")) {
        return { message: "Randevu aynı anda değiştirildi. Lütfen yeniden deneyin." };
      }
      if (isPrismaError(error, "P2025") && appointmentId) {
        return { message: "Randevu bulunamadı." };
      }
      console.error("Randevu kaydedilemedi.", error);
      return { message: "Randevu kaydedilirken bir hata oluştu." };
    }
  }

  revalidatePath("/appointments");
  if (appointmentId) {
    revalidatePath(`/appointments/${appointmentId}`);
    redirect(`/appointments/${appointmentId}`);
  }
  redirect("/appointments?created=1");
}

export async function createAppointmentAction(
  _previousState: AppointmentActionState,
  formData: FormData,
): Promise<AppointmentActionState> {
  return mutateAppointment(formData, null);
}

export async function updateAppointmentAction(
  _previousState: AppointmentActionState,
  formData: FormData,
): Promise<AppointmentActionState> {
  await requireRoles(...appointmentRoles);
  const appointmentId = readAppointmentId(formData);
  if (!appointmentId) return { message: "Randevu bulunamadı." };
  return mutateAppointment(formData, appointmentId);
}
