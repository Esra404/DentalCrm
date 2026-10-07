import {
  TreatmentPlanStatus,
} from "@/generated/prisma/enums";
import type {
  TreatmentPlanStatus as TreatmentPlanStatusType,
} from "@/generated/prisma/enums";
import { APPOINTMENT_ID_PATTERN } from "@/lib/validations/appointment";

export const TREATMENT_PLAN_ID_PATTERN = APPOINTMENT_ID_PATTERN;

export type TreatmentPlanItemInput = {
  itemId?: string;
  treatmentId: string;
  quantity: number;
};

export type TreatmentPlanFormInput = {
  patientId: string;
  startsAt: string;
  endsAt: string;
  status: string;
  itemsJson: string;
};

export type TreatmentPlanFieldErrors = Partial<
  Record<keyof TreatmentPlanFormInput | "items", string>
>;

export type TreatmentPlanActionState = {
  message?: string;
  fieldErrors?: TreatmentPlanFieldErrors;
};

export type ValidatedTreatmentPlanInput = {
  patientId: string;
  startsAt: Date;
  endsAt: Date;
  status: TreatmentPlanStatusType;
  items: TreatmentPlanItemInput[];
};

export function treatmentPlanInputFromFormData(
  formData: FormData,
): TreatmentPlanFormInput {
  const read = (key: keyof TreatmentPlanFormInput) => {
    const value = formData.get(key);
    return typeof value === "string" ? value : "";
  };
  return {
    patientId: read("patientId"),
    startsAt: read("startsAt"),
    endsAt: read("endsAt"),
    status: read("status"),
    itemsJson: read("itemsJson"),
  };
}

function isStatus(value: string): value is TreatmentPlanStatusType {
  return Object.values(TreatmentPlanStatus).some((status) => status === value);
}

export function parseTreatmentPlanItems(
  value: string,
):
  | { success: true; items: TreatmentPlanItemInput[] }
  | { success: false; message: string } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    return { success: false, message: "Tedavi kalemlerini kontrol edin." };
  }

  if (!Array.isArray(parsed) || parsed.length === 0 || parsed.length > 30) {
    return {
      success: false,
      message: "Bir plan en az bir, en fazla 30 tedavi kalemi içermelidir.",
    };
  }

  const items: TreatmentPlanItemInput[] = [];
  const treatmentIds = new Set<string>();
  for (const entry of parsed) {
    if (!entry || typeof entry !== "object") {
      return { success: false, message: "Tedavi kalemlerini kontrol edin." };
    }
    const item = entry as Record<string, unknown>;
    if (
      typeof item.treatmentId !== "string" ||
      !APPOINTMENT_ID_PATTERN.test(item.treatmentId) ||
      (item.itemId !== undefined &&
        (typeof item.itemId !== "string" ||
          !TREATMENT_PLAN_ID_PATTERN.test(item.itemId))) ||
      typeof item.quantity !== "number" ||
      !Number.isInteger(item.quantity) ||
      item.quantity < 1 ||
      item.quantity > 999
    ) {
      return {
        success: false,
        message: "Tedavi ve adet bilgilerini kontrol edin.",
      };
    }
    if (treatmentIds.has(item.treatmentId)) {
      return {
        success: false,
        message: "Aynı tedaviyi bir plana birden fazla satır olarak ekleyemezsiniz.",
      };
    }
    treatmentIds.add(item.treatmentId);
    items.push({
      itemId: typeof item.itemId === "string" ? item.itemId : undefined,
      treatmentId: item.treatmentId,
      quantity: item.quantity,
    });
  }
  return { success: true, items };
}

export function validateTreatmentPlanInput(input: TreatmentPlanFormInput):
  | { success: true; data: ValidatedTreatmentPlanInput }
  | { success: false; errors: TreatmentPlanFieldErrors } {
  const errors: TreatmentPlanFieldErrors = {};
  const patientId = input.patientId.trim();
  if (!APPOINTMENT_ID_PATTERN.test(patientId)) {
    errors.patientId = "Geçerli bir hasta seçin.";
  }

  const datePattern = /^\d{4}-\d{2}-\d{2}$/;
  const startsAt = datePattern.test(input.startsAt)
    ? new Date(`${input.startsAt}T00:00:00.000Z`)
    : new Date(Number.NaN);
  const endsAt = datePattern.test(input.endsAt)
    ? new Date(`${input.endsAt}T00:00:00.000Z`)
    : new Date(Number.NaN);
  const startsValid =
    !Number.isNaN(startsAt.getTime()) &&
    startsAt.toISOString().slice(0, 10) === input.startsAt;
  const endsValid =
    !Number.isNaN(endsAt.getTime()) &&
    endsAt.toISOString().slice(0, 10) === input.endsAt;
  if (!startsValid) errors.startsAt = "Geçerli bir başlangıç tarihi girin.";
  if (!endsValid) errors.endsAt = "Geçerli bir bitiş tarihi girin.";
  if (startsValid && endsValid && endsAt < startsAt) {
    errors.endsAt = "Bitiş tarihi başlangıç tarihinden önce olamaz.";
  }
  if (!isStatus(input.status)) errors.status = "Geçerli bir plan durumu seçin.";

  const parsedItems = parseTreatmentPlanItems(input.itemsJson);
  if (!parsedItems.success) errors.items = parsedItems.message;
  if (
    Object.keys(errors).length > 0 ||
    !startsValid ||
    !endsValid ||
    !isStatus(input.status) ||
    !parsedItems.success
  ) {
    return { success: false, errors };
  }

  return {
    success: true,
    data: {
      patientId,
      startsAt,
      endsAt,
      status: input.status,
      items: parsedItems.items,
    },
  };
}
