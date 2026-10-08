import { PATIENT_ID_PATTERN } from "@/lib/validations/patient";
import { isDoctorSpecialty } from "@/lib/constants/doctor-specialties";

export const DOCTOR_ID_PATTERN = PATIENT_ID_PATTERN;

export type DoctorFormInput = {
  firstName: string;
  lastName: string;
  specialty: string;
  phone: string;
  email: string;
  licenseNumber: string;
};

export type DoctorFieldErrors = Partial<Record<keyof DoctorFormInput, string>>;

export type DoctorWriteData = {
  firstName: string;
  lastName: string;
  specialty: string | null;
  phone: string | null;
  email: string | null;
  licenseNumber: string | null;
};

export type DoctorActionState = {
  message?: string;
  fieldErrors?: DoctorFieldErrors;
};

export function doctorInputFromFormData(formData: FormData): DoctorFormInput {
  const read = (key: keyof DoctorFormInput) => {
    const value = formData.get(key);
    return typeof value === "string" ? value : "";
  };

  return {
    firstName: read("firstName"),
    lastName: read("lastName"),
    specialty: read("specialty"),
    phone: read("phone"),
    email: read("email"),
    licenseNumber: read("licenseNumber"),
  };
}

export function validateDoctorInput(input: DoctorFormInput):
  | { success: true; data: DoctorWriteData }
  | { success: false; errors: DoctorFieldErrors } {
  const firstName = input.firstName.trim();
  const lastName = input.lastName.trim();
  const specialty = input.specialty.trim();
  const phone = input.phone.trim();
  const email = input.email.trim().toLowerCase();
  const licenseNumber = input.licenseNumber.trim();
  const errors: DoctorFieldErrors = {};

  if (!firstName) errors.firstName = "Ad alanı zorunludur.";
  else if (firstName.length > 100) errors.firstName = "Ad en fazla 100 karakter olabilir.";
  if (!lastName) errors.lastName = "Soyad alanı zorunludur.";
  else if (lastName.length > 100) errors.lastName = "Soyad en fazla 100 karakter olabilir.";
  if (specialty.length > 120) {
    errors.specialty = "Uzmanlık en fazla 120 karakter olabilir.";
  } else if (specialty && !isDoctorSpecialty(specialty)) {
    errors.specialty = "Listeden geçerli bir uzmanlık alanı seçin.";
  }
  if (
    phone &&
    (phone.length > 32 ||
      !/^\+?[0-9\s().-]{7,24}$/.test(phone) ||
      phone.replace(/\D/g, "").length < 7 ||
      phone.replace(/\D/g, "").length > 15)
  ) {
    errors.phone = "Telefon numarasını kontrol edin.";
  }
  if (email && (email.length > 320 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) {
    errors.email = "Geçerli bir e-posta adresi girin.";
  }
  if (licenseNumber.length > 64) {
    errors.licenseNumber = "Lisans numarası en fazla 64 karakter olabilir.";
  }

  if (Object.keys(errors).length > 0) return { success: false, errors };

  return {
    success: true,
    data: {
      firstName,
      lastName,
      specialty: specialty || null,
      phone: phone || null,
      email: email || null,
      licenseNumber: licenseNumber || null,
    },
  };
}
