import Link from "next/link";
import type { ReactNode } from "react";
import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  CreditCard,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import { APPOINTMENT_STATUS_LABELS } from "@/lib/validations/appointment";
import {
  formatDashboardDate,
  formatDashboardTime,
  type AdminDashboardData,
  type DashboardAppointment,
  type DoctorDashboardData,
  type StaffDashboardData,
} from "@/lib/dashboard/data";

type DashboardRole = "ADMIN" | "DOCTOR" | "STAFF";

const roleDescriptions: Record<DashboardRole, string> = {
  ADMIN: "Klinik genel durumuna buradan göz atabilirsiniz.",
  DOCTOR: "Bugünkü hastalarınızı ve randevularınızı buradan takip edebilirsiniz.",
  STAFF: "Bugünkü klinik operasyonlarını buradan takip edebilirsiniz.",
};

function DashboardHeader({
  name,
  role,
}: {
  name: string;
  role: DashboardRole;
}) {
  return (
    <header className="border-b border-[var(--line)] pb-5">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--accent)]">
        Genel Bakış
      </p>
      <h1 className="mt-1 text-2xl font-semibold text-[var(--ink)]">
        Hoş geldiniz, {name}
      </h1>
      <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
        {roleDescriptions[role]}
      </p>
    </header>
  );
}

function MetricLinkCard({
  href,
  icon: Icon,
  label,
  value,
  action,
  detail,
}: {
  href: string;
  icon: LucideIcon;
  label: string;
  value: ReactNode;
  action: string;
  detail?: string;
}) {
  return (
    <Link
      className="group flex min-w-0 flex-col rounded-md border border-[var(--line)] bg-white p-4 outline-none transition hover:border-[var(--accent)] hover:shadow-sm focus-visible:ring-2 focus-visible:ring-[var(--accent)] sm:p-5"
      href={href}
    >
      <span className="flex items-start justify-between gap-3">
        <span className="text-sm font-medium text-[var(--muted)]">{label}</span>
        <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-[var(--accent-soft)] text-[var(--accent-strong)]">
          <Icon aria-hidden="true" size={18} />
        </span>
      </span>
      <span className="mt-3 break-words text-2xl font-semibold tabular-nums text-[var(--ink)]">
        {value}
      </span>
      {detail ? <span className="mt-1 text-xs text-[var(--muted)]">{detail}</span> : null}
      <span className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-[var(--accent-strong)] group-hover:underline">
        {action}
        <span aria-hidden="true">→</span>
      </span>
    </Link>
  );
}

function Section({
  title,
  action,
  children,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="min-w-0 rounded-md border border-[var(--line)] bg-white p-4 sm:p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-[var(--ink)]">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function EmptyState({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-md bg-[var(--canvas)] px-4 py-5 text-center text-sm text-[var(--muted)]">
      {children}
    </p>
  );
}

function StatusBadge({ status }: { status: DashboardAppointment["status"] }) {
  const colors = {
    SCHEDULED: "bg-[#f3f0e7] text-[#80611e]",
    CONFIRMED: "bg-[#eaf1fb] text-[#345b91]",
    COMPLETED: "bg-[#e9f4ef] text-[#285d50]",
    CANCELLED: "bg-[#f9eceb] text-[#9b4842]",
    NO_SHOW: "bg-[#f4e9f0] text-[#854b70]",
  } satisfies Record<DashboardAppointment["status"], string>;

  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${colors[status]}`}>
      {APPOINTMENT_STATUS_LABELS[status]}
    </span>
  );
}

function AppointmentRows({
  appointments,
  showDoctor,
}: {
  appointments: DashboardAppointment[];
  showDoctor: boolean;
}) {
  if (appointments.length === 0) {
    return <EmptyState>Bugün randevu bulunmuyor.</EmptyState>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[620px] border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-[var(--line)] text-xs text-[var(--muted)]">
            <th className="pb-3 pr-4 font-medium">Saat</th>
            <th className="pb-3 pr-4 font-medium">Hasta</th>
            {showDoctor ? <th className="pb-3 pr-4 font-medium">Doktor</th> : null}
            <th className="pb-3 pr-4 font-medium">Tedavi</th>
            <th className="pb-3 font-medium">Durum</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--line)]">
          {appointments.map((appointment) => (
            <tr key={appointment.id}>
              <td className="whitespace-nowrap py-3 pr-4 font-medium tabular-nums text-[var(--ink)]">
                {formatDashboardTime(appointment.startsAt)}
              </td>
              <td className="py-3 pr-4">
                <Link
                  className="font-medium text-[var(--accent-strong)] underline-offset-4 hover:underline"
                  href={`/patients/${appointment.patient.id}`}
                >
                  {appointment.patient.firstName} {appointment.patient.lastName}
                </Link>
              </td>
              {showDoctor ? (
                <td className="whitespace-nowrap py-3 pr-4 text-[var(--ink)]">
                  Dr. {appointment.doctor.firstName} {appointment.doctor.lastName}
                </td>
              ) : null}
              <td className="py-3 pr-4 text-[var(--muted)]">
                {appointment.treatment?.name ?? "Belirtilmedi"}
              </td>
              <td className="py-3">
                <StatusBadge status={appointment.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PatientList({
  patients,
  showPhone,
}: {
  patients: AdminDashboardData["recentPatients"];
  showPhone: boolean;
}) {
  if (patients.length === 0) return <EmptyState>Henüz hasta kaydı bulunmuyor.</EmptyState>;

  return (
    <ul className="divide-y divide-[var(--line)]">
      {patients.map((patient) => (
        <li className="flex min-w-0 items-center justify-between gap-3 py-3 first:pt-0 last:pb-0" key={patient.id}>
          <div className="min-w-0">
            <Link
              className="truncate text-sm font-medium text-[var(--accent-strong)] underline-offset-4 hover:underline"
              href={`/patients/${patient.id}`}
            >
              {patient.firstName} {patient.lastName}
            </Link>
            <p className="mt-1 truncate text-xs text-[var(--muted)]">
              {showPhone ? (
                <>
                  {patient.phone ?? "Telefon belirtilmedi"}
                  {" · "}
                  {patient.doctorName ? `Dr. ${patient.doctorName}` : "Doktor bilgisi yok"}
                  {" · "}
                  {formatDashboardDate(patient.createdAt)}
                </>
              ) : (
                patient.lastTreatment ?? "Henüz tamamlanan işlem yok"
              )}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}

function MoneyTotals({ totals }: { totals: { currency: string; formattedAmount: string }[] }) {
  return (
    <div className="flex flex-col gap-1">
      {totals.map((total) => (
        <span className="break-words" key={total.currency}>
          {total.formattedAmount}
        </span>
      ))}
    </div>
  );
}

function DoctorSchedule({ data }: { data: AdminDashboardData }) {
  if (data.doctors.length === 0) {
    return <EmptyState>Aktif doktor kaydı bulunmuyor.</EmptyState>;
  }

  return (
    <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {data.doctors.map((doctor) => {
        const appointments = data.appointments.filter(
          (appointment) => appointment.doctor.id === doctor.id,
        );

        return (
          <li className="rounded-md border border-[var(--line)] p-4" key={doctor.id}>
            <h3 className="text-sm font-semibold text-[var(--ink)]">Dr. {doctor.name}</h3>
            {appointments.length > 0 ? (
              <ul className="mt-2 space-y-2">
                {appointments.map((appointment) => (
                  <li className="flex gap-2 text-sm text-[var(--muted)]" key={appointment.id}>
                    <span className="shrink-0 font-medium tabular-nums text-[var(--ink)]">
                      {formatDashboardTime(appointment.startsAt)}
                    </span>
                    <Link
                      className="truncate underline-offset-4 hover:text-[var(--accent-strong)] hover:underline"
                      href={`/patients/${appointment.patient.id}`}
                    >
                      {appointment.patient.firstName} {appointment.patient.lastName}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-[var(--muted)]">Bugün randevusu yok.</p>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function RecentPayments({ data }: { data: StaffDashboardData }) {
  if (data.recentPayments.length === 0) {
    return <EmptyState>Henüz ödeme kaydı bulunmuyor.</EmptyState>;
  }

  return (
    <ul className="divide-y divide-[var(--line)]">
      {data.recentPayments.map((payment) => (
        <li className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0" key={payment.id}>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-[var(--ink)]">{payment.patientName}</p>
            <p className="mt-1 text-xs text-[var(--muted)]">{formatDashboardDate(payment.paidAt)}</p>
          </div>
          <span className="shrink-0 text-sm font-semibold tabular-nums text-[var(--ink)]">
            {new Intl.NumberFormat("tr-TR", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            }).format(payment.amount.toNumber())}{" "}
            {payment.currency}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function AdminDashboard({
  name,
  data,
}: {
  name: string;
  data: AdminDashboardData;
}) {
  return (
    <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6">
      <DashboardHeader name={name} role="ADMIN" />
      <section aria-label="Klinik modülleri" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricLinkCard action="Hastaları Gör" href="/patients" icon={UsersRound} label="Toplam Hasta" value={data.patientCount} />
        <MetricLinkCard action="Randevuları Gör" detail="Tüm durumlar" href="/appointments" icon={CalendarDays} label="Toplam Randevu" value={data.appointmentCount} />
        <MetricLinkCard action="Doktorları Gör" href="/doctors" icon={UsersRound} label="Aktif Doktor" value={data.doctorCount} />
        <MetricLinkCard action="Ödemeleri Gör" detail="Kaydedilen tahsilat" href="/payments" icon={CreditCard} label="Toplam Tahsilat" value={<MoneyTotals totals={data.collections} />} />
        <MetricLinkCard action="Ödemeleri Gör" href="/payments" icon={CreditCard} label="Bekleyen Ödeme" value={<MoneyTotals totals={data.outstandingBalances} />} detail="İptal edilmemiş tedavi planlarında kalan tutar" />
      </section>
      <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(18rem,0.8fr)]">
        <Section title="Bugünkü Randevular" action={<div className="flex flex-wrap items-center justify-end gap-3"><span className="text-xs text-[var(--muted)]">Bekleyen: {data.pendingAppointmentCount}</span><Link className="text-xs font-medium text-[var(--accent-strong)] hover:underline" href="/appointments">Tüm randevular</Link></div>}>
          <AppointmentRows appointments={data.appointments} showDoctor />
        </Section>
        <Section title="Son Hastalar" action={<Link className="text-xs font-medium text-[var(--accent-strong)] hover:underline" href="/patients">Tüm hastalar</Link>}>
          <PatientList patients={data.recentPatients} showPhone />
        </Section>
      </div>
      <Section title="Doktorların Bugünkü Programı" action={<Link className="text-xs font-medium text-[var(--accent-strong)] hover:underline" href="/doctors">Tüm doktorlar</Link>}>
        <DoctorSchedule data={data} />
      </Section>
      <Section title="Son Ödemeler" action={<Link className="text-xs font-medium text-[var(--accent-strong)] hover:underline" href="/payments">Tüm ödemeler</Link>}>
        <RecentPayments data={data} />
      </Section>
    </div>
  );
}

export function DoctorDashboard({
  name,
  data,
}: {
  name: string;
  data: DoctorDashboardData;
}) {
  return (
    <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6">
      <DashboardHeader name={name} role="DOCTOR" />
      {!data.doctorFound ? (
        <p className="rounded-md border border-[#e7d7a7] bg-[#fbf6e8] px-4 py-3 text-sm text-[#715b22]">
          Bu kullanıcıya bağlı doktor kaydı bulunamadı. Randevu ve hasta bilgileri gösterilemiyor.
        </p>
      ) : null}
      <section aria-label="Doktor özeti" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricLinkCard action="Hastalarımı Gör" href="/patients" icon={UsersRound} label="Hastalarım" value={data.patientCount} detail="Aktif ve doktorla ilişkili hastalar" />
        <MetricLinkCard action="Randevularımı Gör" href="/appointments" icon={CalendarDays} label="Bugünkü Randevularım" value={data.todayAppointmentCount} />
        <MetricLinkCard action="Yaklaşanları Gör" href="/appointments" icon={Clock3} label="Yaklaşan Randevularım" value={data.upcomingAppointmentCount} detail="Önümüzdeki 7 gün içinde" />
        <MetricLinkCard action="Tamamlananları Gör" href={`/appointments?status=COMPLETED&date=${data.todayDate}`} icon={CheckCircle2} label="Bugün Tamamlanan Tedaviler" value={data.completedTodayCount} detail="Tamamlandı durumundaki randevular" />
      </section>
      <Section title="Bugünkü Randevularım" action={<Link className="text-xs font-medium text-[var(--accent-strong)] hover:underline" href="/appointments">Tüm randevularım</Link>}>
        {data.appointments.length === 0 ? (
          <EmptyState>Bugün randevunuz bulunmuyor.</EmptyState>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {data.appointments.map((appointment) => (
              <li className="flex min-w-0 flex-col rounded-md border border-[var(--line)] p-4" key={appointment.id}>
                <p className="text-lg font-semibold tabular-nums text-[var(--ink)]">
                  {formatDashboardTime(appointment.startsAt)}
                </p>
                <Link
                  className="mt-2 truncate text-sm font-semibold text-[var(--accent-strong)] underline-offset-4 hover:underline"
                  href={`/patients/${appointment.patient.id}`}
                >
                  {appointment.patient.firstName} {appointment.patient.lastName}
                </Link>
                <p className="mt-1 truncate text-sm text-[var(--muted)]">
                  {appointment.treatment?.name ?? "Tedavi belirtilmedi"}
                </p>
                <div className="mt-3 flex items-center justify-between gap-2">
                  <StatusBadge status={appointment.status} />
                  <Link
                    className="text-xs font-medium text-[var(--accent-strong)] underline-offset-4 hover:underline"
                    href={`/patients/${appointment.patient.id}`}
                  >
                    Hasta detayı
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Section>
      <Section title="Son Hastalarım" action={<Link className="text-xs font-medium text-[var(--accent-strong)] hover:underline" href="/patients">Tüm hastalarım</Link>}>
        <PatientList patients={data.patients} showPhone={false} />
      </Section>
    </div>
  );
}

export function StaffDashboard({
  name,
  data,
}: {
  name: string;
  data: StaffDashboardData;
}) {
  return (
    <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6">
      <DashboardHeader name={name} role="STAFF" />
      <section aria-label="Klinik operasyon özeti" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <MetricLinkCard action="Hastaları Gör" href="/patients" icon={UsersRound} label="Toplam Hasta" value={data.patientCount} />
        <MetricLinkCard action="Randevuları Gör" detail="Geliş kaydı olmadığından iptal hariç" href="/appointments" icon={CalendarDays} label="Bugünkü Randevular" value={data.todayAppointmentCount} />
        <MetricLinkCard action="Ödemeleri Gör" href="/payments" icon={CreditCard} label="Bekleyen Ödemeler" value={<MoneyTotals totals={data.outstandingBalances} />} detail="İptal edilmemiş tedavi planlarında kalan tutar" />
      </section>
      <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(18rem,0.8fr)]">
        <Section title="Bugünkü Randevular" action={<Link className="text-xs font-medium text-[var(--accent-strong)] hover:underline" href="/appointments">Tüm randevular</Link>}>
          <AppointmentRows appointments={data.appointments} showDoctor />
        </Section>
        <Section title="Son Eklenen Hastalar" action={<Link className="text-xs font-medium text-[var(--accent-strong)] hover:underline" href="/patients">Tüm hastalar</Link>}>
          <PatientList patients={data.recentPatients} showPhone />
        </Section>
      </div>
      <Section title="Son Ödemeler" action={<Link className="text-xs font-medium text-[var(--accent-strong)] hover:underline" href="/payments">Tüm ödemeler</Link>}>
        <RecentPayments data={data} />
      </Section>
    </div>
  );
}
