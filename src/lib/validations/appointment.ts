import { AppointmentStatus } from "@/generated/prisma/enums";
import type { AppointmentStatus as AppointmentStatusType } from "@/generated/prisma/enums";

export const APPOINTMENT_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const APPOINTMENT_TIME_ZONE = "Europe/Istanbul";
export const APPOINTMENT_STATUS_LABELS: Record<AppointmentStatusType, string> = {
  SCHEDULED: "Planlandı",
  CONFIRMED: "Onaylandı",
  COMPLETED: "Tamamlandı",
  CANCELLED: "İptal Edildi",
  NO_SHOW: "Gelmedi",
};

export type AppointmentFormInput = {
  patientId: string;
  doctorId: string;
  treatmentId: string;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  status: string;
  note: string;
};

export type AppointmentFieldErrors = Partial<
  Record<keyof AppointmentFormInput, string>
>;

export type AppointmentActionState = {
  message?: string;
  fieldErrors?: AppointmentFieldErrors;
};

export type AppointmentWriteData = {
  patientId: string;
  doctorId: string;
  treatmentId: string;
  startsAt: Date;
  endsAt: Date;
  status: AppointmentStatusType;
  note: string | null;
};

export function appointmentInputFromFormData(
  formData: FormData,
): AppointmentFormInput {
  const read = (key: keyof AppointmentFormInput) => {
    const value = formData.get(key);
    return typeof value === "string" ? value : "";
  };

  return {
    patientId: read("patientId"),
    doctorId: read("doctorId"),
    treatmentId: read("treatmentId"),
    startDate: read("startDate"),
    startTime: read("startTime"),
    endDate: read("endDate"),
    endTime: read("endTime"),
    status: read("status"),
    note: read("note"),
  };
}

function isAppointmentStatus(value: string): value is AppointmentStatusType {
  return Object.values(AppointmentStatus).some((status) => status === value);
}

function dateTimeParts(value: Date): Record<string, number> {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: APPOINTMENT_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(value);

  return Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, Number(part.value)]),
  );
}

export function parseAppointmentLocalDateTime(
  date: string,
  time: string,
): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) {
    return null;
  }

  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  const candidate = Date.UTC(year, month - 1, day, hour, minute);
  const candidateDate = new Date(candidate);
  if (
    candidateDate.getUTCFullYear() !== year ||
    candidateDate.getUTCMonth() !== month - 1 ||
    candidateDate.getUTCDate() !== day ||
    hour > 23 ||
    minute > 59
  ) {
    return null;
  }

  const firstParts = dateTimeParts(candidateDate);
  const representedAsUtc = Date.UTC(
    firstParts.year,
    firstParts.month - 1,
    firstParts.day,
    firstParts.hour,
    firstParts.minute,
  );
  const result = new Date(candidate - (representedAsUtc - candidate));
  const local = dateTimeParts(result);

  if (
    local.year !== year ||
    local.month !== month ||
    local.day !== day ||
    local.hour !== hour ||
    local.minute !== minute
  ) {
    return null;
  }

  return result;
}

export function appointmentDateTimeValues(value: Date): {
  date: string;
  time: string;
} {
  const parts = dateTimeParts(value);
  return {
    date: `${parts.year.toString().padStart(4, "0")}-${parts.month
      .toString()
      .padStart(2, "0")}-${parts.day.toString().padStart(2, "0")}`,
    time: `${parts.hour.toString().padStart(2, "0")}:${parts.minute
      .toString()
      .padStart(2, "0")}`,
  };
}

export function validateAppointmentInput(input: AppointmentFormInput):
  | { success: true; data: AppointmentWriteData }
  | { success: false; errors: AppointmentFieldErrors } {
  const errors: AppointmentFieldErrors = {};
  const patientId = input.patientId.trim();
  const doctorId = input.doctorId.trim();
  const treatmentId = input.treatmentId.trim();
  const note = input.note.trim();

  if (!APPOINTMENT_ID_PATTERN.test(patientId)) {
    errors.patientId = "Geçerli bir hasta seçin.";
  }
  if (!APPOINTMENT_ID_PATTERN.test(doctorId)) {
    errors.doctorId = "Geçerli bir doktor seçin.";
  }
  if (!APPOINTMENT_ID_PATTERN.test(treatmentId)) {
    errors.treatmentId = "Geçerli bir tedavi seçin.";
  }

  const startsAt = parseAppointmentLocalDateTime(input.startDate, input.startTime);
  const endsAt = parseAppointmentLocalDateTime(input.endDate, input.endTime);
  if (!startsAt || !endsAt) {
    errors.startDate = "Geçerli bir başlangıç tarihi ve saati girin.";
    errors.endDate = "Geçerli bir bitiş tarihi ve saati girin.";
  } else if (endsAt <= startsAt) {
    errors.endTime = "Bitiş saati başlangıç saatinden sonra olmalıdır.";
  }

  if (!isAppointmentStatus(input.status)) {
    errors.status = "Geçerli bir randevu durumu seçin.";
  }
  if (note.length > 10000) {
    errors.note = "Not en fazla 10000 karakter olabilir.";
  }

  if (
    Object.keys(errors).length > 0 ||
    !startsAt ||
    !endsAt ||
    !isAppointmentStatus(input.status)
  ) {
    return { success: false, errors };
  }

  return {
    success: true,
    data: {
      patientId,
      doctorId,
      treatmentId,
      startsAt,
      endsAt,
      status: input.status,
      note: note || null,
    },
  };
}
