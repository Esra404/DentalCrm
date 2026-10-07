import { PATIENT_ID_PATTERN } from "@/lib/validations/patient";

export const TREATMENT_ID_PATTERN = PATIENT_ID_PATTERN;

export type TreatmentFormInput = {
  name: string;
  description: string;
  defaultPrice: string;
  currency: string;
};

export type TreatmentFieldErrors = Partial<
  Record<keyof TreatmentFormInput, string>
>;

export type TreatmentActionState = {
  message?: string;
  fieldErrors?: TreatmentFieldErrors;
};

export function treatmentInputFromFormData(
  formData: FormData,
): TreatmentFormInput {
  const read = (key: keyof TreatmentFormInput) => {
    const value = formData.get(key);
    return typeof value === "string" ? value : "";
  };

  return {
    name: read("name"),
    description: read("description"),
    defaultPrice: read("defaultPrice"),
    currency: read("currency"),
  };
}

export function validateTreatmentInput(input: TreatmentFormInput):
  | {
      success: true;
      data: {
        name: string;
        description: string | null;
        defaultPrice: string;
        currency: string;
      };
    }
  | { success: false; errors: TreatmentFieldErrors } {
  const name = input.name.trim();
  const description = input.description.trim();
  const defaultPrice = input.defaultPrice.trim();
  const currency = input.currency.trim().toUpperCase();
  const errors: TreatmentFieldErrors = {};

  if (!name) errors.name = "Tedavi adı zorunludur.";
  else if (name.length > 160) errors.name = "Tedavi adı en fazla 160 karakter olabilir.";
  if (description.length > 10000) {
    errors.description = "Açıklama en fazla 10000 karakter olabilir.";
  }
  if (!/^(?:0|[1-9]\d{0,9})(?:\.\d{1,2})?$/.test(defaultPrice)) {
    errors.defaultPrice = "0-9999999999,99 arasında en fazla iki ondalık basamak girin.";
  }
  if (!/^[A-Z]{3}$/.test(currency)) {
    errors.currency = "Üç harfli bir para birimi kodu girin (ör. TRY).";
  }

  if (Object.keys(errors).length > 0) return { success: false, errors };

  return {
    success: true,
    data: {
      name,
      description: description || null,
      defaultPrice,
      currency,
    },
  };
}
