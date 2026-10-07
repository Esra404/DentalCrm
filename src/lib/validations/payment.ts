import { PaymentMethod } from "@/generated/prisma/enums";
import type { PaymentMethod as PaymentMethodType } from "@/generated/prisma/enums";
import { APPOINTMENT_ID_PATTERN } from "@/lib/validations/appointment";

export const PAYMENT_ID_PATTERN = APPOINTMENT_ID_PATTERN;
const MONEY_PATTERN = /^(?:0|[1-9]\d{0,9})(?:\.\d{1,2})?$/;

export function paymentDateInputValue(value: Date): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Istanbul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(value);
  const date = Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );
  return `${date.year}-${date.month}-${date.day}`;
}
export const PAYMENT_METHOD_LABELS: Record<PaymentMethodType, string> = {
  CASH: "Nakit",
  CARD: "Kart",
  BANK_TRANSFER: "Banka Havalesi",
  OTHER: "Diğer",
};

export type PaymentFormInput = {
  treatmentPlanId: string;
  amount: string;
  method: string;
  paidAt: string;
};

export type PaymentFieldErrors = Partial<
  Record<keyof PaymentFormInput, string>
>;

export type PaymentActionState = {
  message?: string;
  fieldErrors?: PaymentFieldErrors;
};

export type ValidatedPaymentInput = {
  treatmentPlanId: string;
  amount: string;
  method: PaymentMethodType;
  paidAt: Date;
};

export function paymentInputFromFormData(formData: FormData): PaymentFormInput {
  const read = (key: keyof PaymentFormInput) => {
    const value = formData.get(key);
    return typeof value === "string" ? value : "";
  };
  return {
    treatmentPlanId: read("treatmentPlanId"),
    amount: read("amount"),
    method: read("method"),
    paidAt: read("paidAt"),
  };
}

function isPaymentMethod(value: string): value is PaymentMethodType {
  return Object.values(PaymentMethod).some((method) => method === value);
}

export function validatePaymentInput(input: PaymentFormInput):
  | { success: true; data: ValidatedPaymentInput }
  | { success: false; errors: PaymentFieldErrors } {
  const errors: PaymentFieldErrors = {};
  const treatmentPlanId = input.treatmentPlanId.trim();
  if (!APPOINTMENT_ID_PATTERN.test(treatmentPlanId)) {
    errors.treatmentPlanId = "Geçerli bir tedavi planı seçin.";
  }

  const amount = input.amount.trim();
  if (!MONEY_PATTERN.test(amount) || !/[1-9]/.test(amount)) {
    errors.amount = "Pozitif ve en fazla iki ondalık basamaklı bir tutar girin.";
  }
  if (!isPaymentMethod(input.method)) {
    errors.method = "Geçerli bir ödeme yöntemi seçin.";
  }

  const datePattern = /^\d{4}-\d{2}-\d{2}$/;
  const paidAt = datePattern.test(input.paidAt)
    ? new Date(`${input.paidAt}T00:00:00.000Z`)
    : new Date(Number.NaN);
  if (
    Number.isNaN(paidAt.getTime()) ||
    paidAt.toISOString().slice(0, 10) !== input.paidAt
  ) {
    errors.paidAt = "Geçerli bir ödeme tarihi girin.";
  }

  if (
    Object.keys(errors).length > 0 ||
    !MONEY_PATTERN.test(amount) ||
    !/[1-9]/.test(amount) ||
    !isPaymentMethod(input.method) ||
    Number.isNaN(paidAt.getTime())
  ) {
    return { success: false, errors };
  }

  return {
    success: true,
    data: {
      treatmentPlanId,
      amount,
      method: input.method,
      paidAt,
    },
  };
}
