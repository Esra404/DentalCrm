export const PATIENT_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const PATIENT_PHONE_PATTERN = "^\\+?[0-9\\s\\x28\\x29.\\x2d]{7,24}$";

export type PatientFormInput = {
  firstName: string;
  lastName: string;
  doctorId: string;
  phone: string;
  email: string;
  dateOfBirth: string;
  address: string;
  notes: string;
};

export type PatientFieldErrors = Partial<
  Record<keyof PatientFormInput, string>
>;

export type PatientWriteData = {
  firstName: string;
  lastName: string;
  doctorId: string;
  phone: string | null;
  email: string | null;
  dateOfBirth: Date | null;
  address: string | null;
  notes: string | null;
};

export type PatientValidationResult =
  | { success: true; data: PatientWriteData }
  | { success: false; errors: PatientFieldErrors };

export type PatientActionState = {
  message?: string;
  fieldErrors?: PatientFieldErrors;
};

export function patientInputFromFormData(formData: FormData): PatientFormInput {
  const read = (key: keyof PatientFormInput) => {
    const value = formData.get(key);
    return typeof value === "string" ? value : "";
  };

  return {
    firstName: read("firstName"),
    lastName: read("lastName"),
    doctorId: read("doctorId").trim(),
    phone: read("phone"),
    email: read("email"),
    dateOfBirth: read("dateOfBirth"),
    address: read("address"),
    notes: read("notes"),
  };
}

export function validatePatientInput(
  input: PatientFormInput,
): PatientValidationResult {
  const firstName = input.firstName.trim();
  const lastName = input.lastName.trim();
  const doctorId = input.doctorId.trim();
  const phone = input.phone.trim();
  const email = input.email.trim().toLowerCase();
  const dateOfBirth = input.dateOfBirth.trim();
  const address = input.address.trim();
  const notes = input.notes.trim();
  const errors: PatientFieldErrors = {};

  if (!firstName) errors.firstName = "Ad alanı zorunludur.";
  else if (firstName.length > 100) errors.firstName = "Ad en fazla 100 karakter olabilir.";

  if (!lastName) errors.lastName = "Soyad alanı zorunludur.";
  else if (lastName.length > 100) errors.lastName = "Soyad en fazla 100 karakter olabilir.";

  if (!PATIENT_ID_PATTERN.test(doctorId)) {
    errors.doctorId = "Sorumlu bir doktor seçin.";
  }

  if (phone) {
    const digitCount = phone.replace(/\D/g, "").length;
    if (
      phone.length > 32 ||
      !new RegExp(PATIENT_PHONE_PATTERN).test(phone) ||
      digitCount < 7 ||
      digitCount > 15
    ) {
      errors.phone = "Telefon numarasını kontrol edin.";
    }
  }

  if (
    email &&
    (email.length > 320 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
  ) {
    errors.email = "Geçerli bir e-posta adresi girin.";
  }

  let birthDate: Date | null = null;
  if (dateOfBirth) {
    const parsed = new Date(`${dateOfBirth}T00:00:00.000Z`);
    const isValidDate =
      /^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth) &&
      !Number.isNaN(parsed.getTime()) &&
      parsed.toISOString().slice(0, 10) === dateOfBirth;

    if (!isValidDate || dateOfBirth > new Date().toISOString().slice(0, 10)) {
      errors.dateOfBirth = "Geçerli ve geçmiş bir doğum tarihi girin.";
    } else {
      birthDate = parsed;
    }
  }

  if (address.length > 4000) {
    errors.address = "Adres en fazla 4000 karakter olabilir.";
  }

  if (notes.length > 10000) {
    errors.notes = "Notlar en fazla 10000 karakter olabilir.";
  }

  if (Object.keys(errors).length > 0) {
    return { success: false, errors };
  }

  return {
    success: true,
    data: {
      firstName,
      lastName,
      doctorId,
      phone: phone || null,
      email: email || null,
      dateOfBirth: birthDate,
      address: address || null,
      notes: notes || null,
    },
  };
}