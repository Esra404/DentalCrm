import {
  Activity,
  CalendarDays,
  ClipboardList,
  FileText,
  LayoutDashboard,
  ScrollText,
  UserRound,
  UsersRound,
  WalletCards,
  type LucideIcon,
} from "lucide-react";
import { Role } from "@/generated/prisma/enums";

const clinicalRoles = [Role.ADMIN, Role.STAFF, Role.DOCTOR] as const;
const administrativeRoles = [Role.ADMIN, Role.STAFF] as const;
const allStaffRoles = [Role.ADMIN, Role.STAFF, Role.DOCTOR] as const;

export type CrmModule = {
  href: string;
  label: string;
  group: "Klinik" | "İşlemler" | "Yönetim";
  icon: LucideIcon;
  roles: readonly Role[];
  description: string;
  emptyState: string;
};

export const CRM_MODULES = {
  patients: {
    href: "/patients",
    label: "Hastalar",
    group: "Klinik",
    icon: UsersRound,
    roles: allStaffRoles,
    description: "Klinikte kayıtlı hastaları görüntüleyin ve yönetin.",
    emptyState: "Henüz kayıtlı hasta bulunmuyor.",
  },
  doctors: {
    href: "/doctors",
    label: "Doktorlar",
    group: "Klinik",
    icon: UserRound,
    roles: administrativeRoles,
    description: "Klinik ekibi dizini burada yer alacak.",
    emptyState: "Henüz doktor kaydı bulunmuyor.",
  },
  treatments: {
    href: "/treatments",
    label: "Tedaviler",
    group: "Klinik",
    icon: Activity,
    roles: clinicalRoles,
    description: "Klinikte uygulanan tedaviler burada yer alacak.",
    emptyState: "Henüz tedavi kaydı bulunmuyor.",
  },
  appointments: {
    href: "/appointments",
    label: "Randevular",
    group: "İşlemler",
    icon: CalendarDays,
    roles: allStaffRoles,
    description: "Klinik randevu takvimi burada yer alacak.",
    emptyState: "Henüz randevu kaydı bulunmuyor.",
  },
  "treatment-plans": {
    href: "/treatment-plans",
    label: "Tedavi Planları",
    group: "İşlemler",
    icon: ClipboardList,
    roles: allStaffRoles,
    description: "Hasta tedavi planları burada yer alacak.",
    emptyState: "Henüz tedavi planı bulunmuyor.",
  },
  payments: {
    href: "/payments",
    label: "Ödemeler",
    group: "İşlemler",
    icon: WalletCards,
    roles: administrativeRoles,
    description: "Hasta ödeme kayıtları burada yer alacak.",
    emptyState: "Henüz ödeme kaydı bulunmuyor.",
  },
  documents: {
    href: "/documents",
    label: "Belgeler",
    group: "İşlemler",
    icon: FileText,
    roles: allStaffRoles,
    description: "Hasta belgeleri burada yer alacak.",
    emptyState: "Henüz hasta belgesi bulunmuyor.",
  },
  "audit-log": {
    href: "/audit-log",
    label: "İşlem Kayıtları",
    group: "Yönetim",
    icon: ScrollText,
    roles: [Role.ADMIN],
    description: "Sistem işlem kayıtları burada yer alacak.",
    emptyState: "Henüz işlem kaydı bulunmuyor.",
  },
  users: {
    href: "/users",
    label: "Kullanıcılar",
    group: "Yönetim",
    icon: UsersRound,
    roles: [Role.ADMIN],
    description: "Klinik kullanıcı hesaplarını ve rollerini yönetin.",
    emptyState: "Henüz kullanıcı bulunmuyor.",
  },
} satisfies Record<string, CrmModule>;

export type CrmModuleSlug = keyof typeof CRM_MODULES;

export type CrmNavigationItem = {
  href: string;
  label: string;
  group: "Genel" | CrmModule["group"];
  icon: LucideIcon;
  roles: readonly Role[];
};

export const CRM_NAVIGATION: readonly CrmNavigationItem[] = [
  {
    href: "/dashboard",
    label: "Ana Sayfa",
    group: "Genel",
    icon: LayoutDashboard,
    roles: clinicalRoles,
  },
  ...Object.values(CRM_MODULES),
];

export function getRouteTitle(pathname: string): string {
  const item = CRM_NAVIGATION.find(
    (entry) => pathname === entry.href || pathname.startsWith(`${entry.href}/`),
  );

  return item?.label ?? "Dashboard";
}