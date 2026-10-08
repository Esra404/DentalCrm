import { Role } from "@/generated/prisma/enums";
import type { Role as RoleType } from "@/generated/prisma/enums";
import { isDoctorSpecialty } from "@/lib/constants/doctor-specialties";

export type CreateUserFormInput = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role: string;
  specialty: string;
};

export type CreateUserFieldErrors = Partial<
  Record<keyof CreateUserFormInput, string>
>;

export type CreateUserActionState = {
  message?: string;
  fieldErrors?: CreateUserFieldErrors;
};

export type CreateUserData = {
  firstName: string;
  lastName: string;
  name: string;
  email: string;
  password: string;
  role: Exclude<RoleType, "ADMIN">;
  specialty: string | null;
};

export function createUserInputFromFormData(
  formData: FormData,
): CreateUserFormInput {
  const read = (key: keyof CreateUserFormInput) => {
    const value = formData.get(key);
    return typeof value === "string" ? value : "";
  };

  return {
    firstName: read("firstName"),
    lastName: read("lastName"),
    email: read("email"),
    password: read("password"),
    role: read("role"),
    specialty: read("specialty"),
  };
}

export function validateCreateUserInput(input: CreateUserFormInput):
  | { success: true; data: CreateUserData }
  | { success: false; errors: CreateUserFieldErrors } {
  const firstName = input.firstName.trim();
  const lastName = input.lastName.trim();
  const email = input.email.trim().toLowerCase();
  const specialty = input.specialty.trim();
  const errors: CreateUserFieldErrors = {};

  if (!firstName) errors.firstName = "Ad alanı zorunludur.";
  else if (firstName.length > 100) errors.firstName = "Ad en fazla 100 karakter olabilir.";

  if (!lastName) errors.lastName = "Soyad alanı zorunludur.";
  else if (lastName.length > 100) errors.lastName = "Soyad en fazla 100 karakter olabilir.";

  if (
    email.length > 320 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  ) {
    errors.email = "Geçerli bir e-posta adresi girin.";
  }

  const passwordBytes = Buffer.byteLength(input.password, "utf8");
  if (passwordBytes < 12) {
    errors.password = "Şifre en az 12 bayt olmalıdır.";
  } else if (passwordBytes > 1024) {
    errors.password = "Şifre çok uzun.";
  }

  const role = input.role === Role.DOCTOR || input.role === Role.STAFF
    ? input.role
    : null;
  if (!role) errors.role = "Doktor veya çalışan rolü seçin.";

  if (role === Role.DOCTOR && specialty.length > 120) {
    errors.specialty = "Uzmanlık en fazla 120 karakter olabilir.";
  } else if (
    role === Role.DOCTOR &&
    specialty &&
    !isDoctorSpecialty(specialty)
  ) {
    errors.specialty = "Listeden geçerli bir uzmanlık alanı seçin.";
  }

  const name = `${firstName} ${lastName}`;
  if (name.length > 160) errors.lastName = "Ad ve soyad toplamı 160 karakteri aşamaz.";

  if (Object.keys(errors).length > 0 || !role) {
    return { success: false, errors };
  }

  return {
    success: true,
    data: {
      firstName,
      lastName,
      name,
      email,
      password: input.password,
      role,
      specialty: role === Role.DOCTOR ? specialty || null : null,
    },
  };
}
