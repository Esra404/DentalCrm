export const DOCTOR_SPECIALTIES = [
  "Ağız, Diş ve Çene Cerrahisi",
  "Ağız, Diş ve Çene Radyolojisi",
  "Çocuk Diş Hekimliği (Pedodonti)",
  "Endodonti (Kanal Tedavisi)",
  "Ortodonti",
  "Periodontoloji (Diş Eti Hastalıkları)",
  "Protetik Diş Tedavisi (Protez)",
  "Restoratif Diş Tedavisi (Dolgu ve Estetik)",
] as const;

export function isDoctorSpecialty(value: string): boolean {
  return DOCTOR_SPECIALTIES.some((specialty) => specialty === value);
}
