import "server-only";

import { AppointmentStatus, TreatmentPlanStatus } from "@/generated/prisma/enums";
import { Prisma } from "@/generated/prisma/client";
import { formatMoney } from "@/lib/finance/decimal";
import { prisma } from "@/lib/prisma";
import { getIstanbulDayBounds } from "@/lib/dashboard/time";

const ACTIVE_APPOINTMENT_STATUSES = [
  AppointmentStatus.SCHEDULED,
  AppointmentStatus.CONFIRMED,
  AppointmentStatus.COMPLETED,
  AppointmentStatus.NO_SHOW,
] as const;
const PENDING_APPOINTMENT_STATUSES = [
  AppointmentStatus.SCHEDULED,
  AppointmentStatus.CONFIRMED,
] as const;

type CurrencyAmountRow = {
  currency: string;
  amount: string;
};

export type DashboardAppointment = {
  id: string;
  startsAt: Date;
  status: AppointmentStatus;
  patient: { id: string; firstName: string; lastName: string };
  doctor: { id: string; firstName: string; lastName: string };
  treatment: { name: string } | null;
};

export type DashboardPatient = {
  id: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  createdAt: Date;
  doctorName: string | null;
  lastTreatment: string | null;
};

export type DashboardPayment = {
  id: string;
  amount: Prisma.Decimal;
  paidAt: Date;
  currency: string;
  patientName: string;
};

export type CurrencyTotal = {
  currency: string;
  formattedAmount: string;
};

export type AdminDashboardData = {
  patientCount: number;
  appointmentCount: number;
  doctorCount: number;
  todayAppointmentCount: number;
  pendingAppointmentCount: number;
  appointments: DashboardAppointment[];
  doctors: { id: string; name: string }[];
  recentPatients: DashboardPatient[];
  recentPayments: DashboardPayment[];
  collections: CurrencyTotal[];
  outstandingBalances: CurrencyTotal[];
};

export type StaffDashboardData = {
  patientCount: number;
  todayAppointmentCount: number;
  appointments: DashboardAppointment[];
  recentPatients: DashboardPatient[];
  recentPayments: DashboardPayment[];
  outstandingBalances: CurrencyTotal[];
};

export type DoctorDashboardData = {
  doctorFound: boolean;
  todayDate: string;
  patientCount: number;
  todayAppointmentCount: number;
  upcomingAppointmentCount: number;
  completedTodayCount: number;
  appointments: DashboardAppointment[];
  patients: DashboardPatient[];
};

function getTodayWhere(now: Date) {
  const { start, end } = getIstanbulDayBounds(now);

  return {
    startsAt: { gte: start, lt: end },
    status: { in: [...ACTIVE_APPOINTMENT_STATUSES] },
  };
}

async function getCurrencyTotals(
  rowsPromise: Promise<CurrencyAmountRow[]>,
): Promise<CurrencyTotal[]> {
  const rows = await rowsPromise;
  return rows.map((row) => ({
    currency: row.currency.trim(),
    formattedAmount: formatMoney(new Prisma.Decimal(row.amount), row.currency.trim()),
  }));
}

function getCollectionTotals(): Promise<CurrencyTotal[]> {
  return getCurrencyTotals(
    prisma.$queryRaw<CurrencyAmountRow[]>`
      SELECT plan."currency" AS currency, COALESCE(SUM(payment."amount"), 0)::text AS amount
      FROM "Payment" AS payment
      INNER JOIN "TreatmentPlan" AS plan
        ON plan."id" = payment."treatmentPlanId"
      GROUP BY plan."currency"
      ORDER BY plan."currency"
    `,
  );
}

function getOutstandingBalances(): Promise<CurrencyTotal[]> {
  return getCurrencyTotals(
    prisma.$queryRaw<CurrencyAmountRow[]>`
      WITH plan_totals AS (
        SELECT "treatmentPlanId", SUM("unitPrice" * "quantity") AS amount
        FROM "TreatmentPlanItem"
        GROUP BY "treatmentPlanId"
      ),
      payment_totals AS (
        SELECT "treatmentPlanId", SUM("amount") AS amount
        FROM "Payment"
        GROUP BY "treatmentPlanId"
      )
      SELECT
        plan."currency" AS currency,
        SUM(GREATEST(
          COALESCE(plan_total.amount, 0) - COALESCE(payment_total.amount, 0),
          0
        ))::text AS amount
      FROM "TreatmentPlan" AS plan
      LEFT JOIN plan_totals AS plan_total
        ON plan_total."treatmentPlanId" = plan."id"
      LEFT JOIN payment_totals AS payment_total
        ON payment_total."treatmentPlanId" = plan."id"
      WHERE plan."status" <> ${TreatmentPlanStatus.CANCELLED}
      GROUP BY plan."currency"
      HAVING SUM(GREATEST(
        COALESCE(plan_total.amount, 0) - COALESCE(payment_total.amount, 0),
        0
      )) > 0
      ORDER BY plan."currency"
    `,
  );
}

async function getTodayAppointments(
  now: Date,
  doctorId?: string,
): Promise<DashboardAppointment[]> {
  return prisma.appointment.findMany({
    where: {
      ...getTodayWhere(now),
      ...(doctorId
        ? { doctorId, patient: { doctorId } }
        : {}),
    },
    orderBy: [{ startsAt: "asc" }, { id: "asc" }],
    select: {
      id: true,
      startsAt: true,
      status: true,
      patient: { select: { id: true, firstName: true, lastName: true } },
      doctor: { select: { id: true, firstName: true, lastName: true } },
      treatment: { select: { name: true } },
    },
  });
}

async function getRecentPatients(
  take: number,
  doctorId?: string,
): Promise<DashboardPatient[]> {
  const patients = await prisma.patient.findMany({
    where: {
      isActive: true,
      ...(doctorId ? { doctorId } : {}),
    },
    orderBy: [{ updatedAt: "desc" }, { id: "asc" }],
    take,
    select: {
      id: true,
      firstName: true,
      lastName: true,
      phone: true,
      createdAt: true,
      doctor: { select: { firstName: true, lastName: true } },
      appointments: {
        where: doctorId
          ? {
              doctorId,
              status: AppointmentStatus.COMPLETED,
              startsAt: { lt: new Date() },
            }
          : { status: { not: AppointmentStatus.CANCELLED } },
        orderBy: [{ startsAt: "desc" }, { id: "asc" }],
        take: 1,
        select: {
          doctor: { select: { firstName: true, lastName: true } },
          treatment: { select: { name: true } },
        },
      },
    },
  });

  return patients.map((patient) => {
    if (doctorId) {
      const appointment = patient.appointments[0];
      return {
        ...patient,
        doctorName: patient.doctor
          ? `${patient.doctor.firstName} ${patient.doctor.lastName}`
          : null,
        lastTreatment: appointment?.treatment?.name ?? null,
      };
    }

    return {
      ...patient,
      doctorName: patient.doctor
        ? `${patient.doctor.firstName} ${patient.doctor.lastName}`
        : null,
      lastTreatment: null,
    };
  });
}

async function getRecentPayments(take: number): Promise<DashboardPayment[]> {
  const payments = await prisma.payment.findMany({
    orderBy: [{ paidAt: "desc" }, { id: "asc" }],
    take,
    select: {
      id: true,
      amount: true,
      paidAt: true,
      treatmentPlan: {
        select: {
          currency: true,
          patient: { select: { firstName: true, lastName: true } },
        },
      },
    },
  });

  return payments.map((payment) => ({
    id: payment.id,
    amount: payment.amount,
    paidAt: payment.paidAt,
    currency: payment.treatmentPlan.currency.trim(),
    patientName: `${payment.treatmentPlan.patient.firstName} ${payment.treatmentPlan.patient.lastName}`,
  }));
}

export async function getAdminDashboardData(
  now = new Date(),
): Promise<AdminDashboardData> {
  const [
    patientCount,
    appointmentCount,
    doctorCount,
    todayAppointmentCount,
    pendingAppointmentCount,
    appointments,
    doctors,
    recentPatients,
    recentPayments,
    collections,
    outstandingBalances,
  ] = await Promise.all([
    prisma.patient.count(),
    prisma.appointment.count(),
    prisma.doctor.count({ where: { isActive: true } }),
    prisma.appointment.count({ where: getTodayWhere(now) }),
    prisma.appointment.count({
      where: {
        startsAt: { gte: now },
        status: { in: [...PENDING_APPOINTMENT_STATUSES] },
      },
    }),
    getTodayAppointments(now),
    prisma.doctor.findMany({
      where: { isActive: true },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      select: { id: true, firstName: true, lastName: true },
    }),
    getRecentPatients(5),
    getRecentPayments(5),
    getCollectionTotals(),
    getOutstandingBalances(),
  ]);

  return {
    patientCount,
    appointmentCount,
    doctorCount,
    todayAppointmentCount,
    pendingAppointmentCount,
    appointments,
    doctors: doctors.map((doctor) => ({
      id: doctor.id,
      name: `${doctor.firstName} ${doctor.lastName}`,
    })),
    recentPatients,
    recentPayments,
    collections:
      collections.length > 0
        ? collections
        : [{ currency: "TRY", formattedAmount: formatMoney(new Prisma.Decimal(0), "TRY") }],
    outstandingBalances:
      outstandingBalances.length > 0
        ? outstandingBalances
        : [{ currency: "TRY", formattedAmount: formatMoney(new Prisma.Decimal(0), "TRY") }],
  };
}

export async function getStaffDashboardData(
  now = new Date(),
): Promise<StaffDashboardData> {
  const [patientCount, todayAppointmentCount, appointments, recentPatients, recentPayments, outstandingBalances] =
    await Promise.all([
      prisma.patient.count(),
      prisma.appointment.count({ where: getTodayWhere(now) }),
      getTodayAppointments(now),
      getRecentPatients(5),
      getRecentPayments(5),
      getOutstandingBalances(),
    ]);

  return {
    patientCount,
    todayAppointmentCount,
    appointments,
    recentPatients,
    recentPayments,
    outstandingBalances:
      outstandingBalances.length > 0
        ? outstandingBalances
        : [{ currency: "TRY", formattedAmount: formatMoney(new Prisma.Decimal(0), "TRY") }],
  };
}

export async function getDoctorDashboardData(
  userId: string,
  now = new Date(),
): Promise<DoctorDashboardData> {
  const todayDate = formatDashboardDateKey(now);
  const doctor = await prisma.doctor.findUnique({
    where: { userId, isActive: true },
    select: { id: true },
  });

  if (!doctor) {
    return {
      doctorFound: false,
      todayDate,
      patientCount: 0,
      todayAppointmentCount: 0,
      upcomingAppointmentCount: 0,
      completedTodayCount: 0,
      appointments: [],
      patients: [],
    };
  }

  const { start, end, nextWeekEnd } = getIstanbulDayBounds(now);
  const [patientCount, todayAppointmentCount, upcomingAppointmentCount, completedTodayCount, appointments, patients] =
    await Promise.all([
      prisma.patient.count({
        where: {
          isActive: true,
          doctorId: doctor.id,
        },
      }),
      prisma.appointment.count({
        where: {
          doctorId: doctor.id,
          patient: { doctorId: doctor.id },
          ...getTodayWhere(now),
        },
      }),
      prisma.appointment.count({
        where: {
          doctorId: doctor.id,
          patient: { doctorId: doctor.id },
          startsAt: { gte: now, lt: nextWeekEnd },
          status: { in: [...PENDING_APPOINTMENT_STATUSES] },
        },
      }),
      prisma.appointment.count({
        where: {
          doctorId: doctor.id,
          patient: { doctorId: doctor.id },
          startsAt: { gte: start, lt: end },
          status: AppointmentStatus.COMPLETED,
        },
      }),
      getTodayAppointments(now, doctor.id),
      getRecentPatients(5, doctor.id),
    ]);

  return {
    doctorFound: true,
    todayDate,
    patientCount,
    todayAppointmentCount,
    upcomingAppointmentCount,
    completedTodayCount,
    appointments,
    patients,
  };
}

export function formatDashboardDate(value: Date): string {
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
    timeZone: "Europe/Istanbul",
  }).format(value);
}

function formatDashboardDateKey(value: Date): string {
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

export function formatDashboardTime(value: Date): string {
  return new Intl.DateTimeFormat("tr-TR", {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: "Europe/Istanbul",
  }).format(value);
}
