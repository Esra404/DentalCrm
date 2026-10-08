import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

const NO_DOCTOR_ID = "00000000-0000-0000-0000-000000000000";

export async function getActiveDoctorId(userId: string): Promise<string | null> {
  const doctor = await prisma.doctor.findUnique({
    where: { userId },
    select: { id: true, isActive: true },
  });

  return doctor?.isActive ? doctor.id : null;
}

export function doctorPatientWhere(doctorId: string | null): Prisma.PatientWhereInput {
  return { doctorId: doctorId ?? NO_DOCTOR_ID };
}

export async function canDoctorAccessPatient(
  userId: string,
  patientId: string,
): Promise<boolean> {
  const doctorId = await getActiveDoctorId(userId);
  if (!doctorId) return false;

  const patient = await prisma.patient.findFirst({
    where: { id: patientId, doctorId },
    select: { id: true },
  });

  return Boolean(patient);
}
