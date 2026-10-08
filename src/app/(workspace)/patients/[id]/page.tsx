import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarDays, ClipboardList, CreditCard, FileText, Pencil, Smile } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Role, ToothStatus } from "@/generated/prisma/enums";
import { requireRoles } from "@/lib/auth/authorization";
import { canDoctorAccessPatient } from "@/lib/auth/doctor-access";
import { setPatientActiveAction } from "@/server/actions/patients";
import { PatientToothForm } from "@/components/patients/patient-tooth-form";

function formatDate(value: Date | null): string {
  if (!value) return "Belirtilmedi";
  return new Intl.DateTimeFormat("tr-TR", { dateStyle: "long" }).format(value);
}

const TOOTH_STATUS_LABELS: Record<ToothStatus, string> = {
  HEALTHY: "Sağlıklı",
  CARIES: "Çürük",
  FILLED: "Dolgulu",
  ROOT_CANAL: "Kanal tedavili",
  CROWN: "Kaplama",
  MISSING: "Eksik",
  IMPLANT: "İmplant",
  EXTRACTION_RECOMMENDED: "Çekim önerildi",
};

function HistorySection({
  title,
  emptyMessage,
  count,
  icon: Icon,
  documentsHref,
  addDocumentHref,
}: {
  title: string;
  emptyMessage: string;
  count: number;
  icon: typeof CalendarDays;
  documentsHref?: string;
  addDocumentHref?: string;
}) {
  return (
    <section className="rounded-md border border-[var(--line)] bg-white p-5">
      <div className="flex items-center gap-3">
        <span className="flex size-9 items-center justify-center rounded-md bg-[var(--accent-soft)] text-[var(--accent-strong)]">
          <Icon aria-hidden="true" size={18} />
        </span>
        <h2 className="text-sm font-semibold text-[var(--ink)]">{title}</h2>
      </div>
      <p className="mt-4 text-sm text-[var(--muted)]">
        {count === 0 ? emptyMessage : `${count} kayıt bulunuyor.`}
      </p>
      {documentsHref && addDocumentHref ? (
        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            className="inline-flex min-h-9 items-center rounded-md border border-[var(--line)] bg-white px-3 text-sm font-medium text-[var(--ink)] outline-none hover:bg-[var(--canvas)] focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
            href={documentsHref}
          >
            Belgeleri Görüntüle
          </Link>
          <Link
            className="inline-flex min-h-9 items-center rounded-md bg-[var(--accent-strong)] px-3 text-sm font-medium text-white outline-none hover:bg-[#19483f] focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
            href={addDocumentHref}
          >
            Belge Ekle
          </Link>
        </div>
      ) : null}
    </section>
  );
}

export default async function PatientDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await requireRoles(Role.ADMIN, Role.STAFF, Role.DOCTOR);
  const { id } = await params;
  const query = await searchParams;

  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    notFound();
  }

  if (
    user.role === Role.DOCTOR &&
    !(await canDoctorAccessPatient(user.id, id))
  ) {
    notFound();
  }

  const patient = await prisma.patient.findUnique({
    where: { id },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      phone: true,
      email: true,
      dateOfBirth: true,
      address: true,
      notes: true,
      isActive: true,
      createdAt: true,
      doctorId: true,
      doctor: { select: { firstName: true, lastName: true } },
      teeth: {
        orderBy: { toothNumber: "asc" },
        select: {
          toothNumber: true,
          status: true,
          notes: true,
          planItems: {
            select: {
              id: true,
              treatmentName: true,
              treatmentPlan: {
                select: { id: true, startsAt: true, status: true },
              },
            },
            orderBy: { createdAt: "desc" },
          },
        },
      },
      _count: {
        select: {
          appointments: true,
          treatmentPlans: true,
          documents: true,
        },
      },
    },
  });

  if (!patient) notFound();

  const [treatmentCount, paymentCount, appointments, treatmentPlans, payments] = await Promise.all([
    prisma.treatmentPlanItem.count({
      where: { treatmentPlan: { patientId: patient.id } },
    }),
    prisma.payment.count({
      where: { treatmentPlan: { patientId: patient.id } },
    }),
    prisma.appointment.findMany({
      where: { patientId: patient.id },
      orderBy: [{ startsAt: "desc" }, { id: "desc" }],
      take: 20,
      select: {
        id: true,
        startsAt: true,
        status: true,
        doctor: { select: { firstName: true, lastName: true } },
        treatment: { select: { name: true } },
      },
    }),
    prisma.treatmentPlan.findMany({
      where: { patientId: patient.id },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: 20,
      select: {
        id: true,
        status: true,
        startsAt: true,
        endsAt: true,
        createdAt: true,
        createdByDoctor: { select: { firstName: true, lastName: true } },
        items: { select: { treatmentName: true, patientTooth: { select: { toothNumber: true } } } },
      },
    }),
    prisma.payment.findMany({
      where: { treatmentPlan: { patientId: patient.id } },
      orderBy: [{ paidAt: "desc" }, { id: "desc" }],
      take: 20,
      select: {
        id: true,
        amount: true,
        method: true,
        paidAt: true,
        treatmentPlan: { select: { id: true, currency: true } },
      },
    }),
  ]);

  const fullName = `${patient.firstName} ${patient.lastName}`;

  return (
    <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-6">
      <header className="flex flex-col gap-5 border-b border-[var(--line)] pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link
            className="mb-4 inline-flex min-h-9 items-center gap-2 rounded-sm text-sm font-medium text-[var(--muted)] outline-none hover:text-[var(--accent-strong)] focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
            href="/patients"
          >
            <ArrowLeft aria-hidden="true" size={16} />
            Hastalara dön
          </Link>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--accent)]">
            Hasta Kaydı
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold text-[var(--ink)]">{fullName}</h1>
            <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${patient.isActive ? "bg-[#e8f3ed] text-[#28634f]" : "bg-[#edf0ef] text-[#5f6e68]"}`}>
              {patient.isActive ? "Aktif" : "Pasif"}
            </span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            className="inline-flex min-h-10 items-center gap-2 rounded-md border border-[var(--line)] bg-white px-3 text-sm font-medium text-[var(--ink)] outline-none hover:bg-[var(--canvas)] focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
            href={`/patients/${patient.id}/edit`}
          >
            <Pencil aria-hidden="true" size={16} />
            Düzenle
          </Link>
          <form action={setPatientActiveAction}>
            <input name="patientId" type="hidden" value={patient.id} />
            <input name="active" type="hidden" value={String(!patient.isActive)} />
            <button
              className="inline-flex min-h-10 items-center rounded-md border border-[var(--line)] bg-white px-3 text-sm font-medium text-[var(--ink)] outline-none hover:bg-[var(--canvas)] focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
              type="submit"
            >
              {patient.isActive ? "Pasifleştir" : "Aktifleştir"}
            </button>
          </form>
        </div>
      </header>

      {query.error === "update" ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
          Hasta durumu güncellenirken bir hata oluştu.
        </p>
      ) : null}

      <section aria-labelledby="patient-details-title" className="rounded-md border border-[var(--line)] bg-white p-5 sm:p-7">
        <div className="flex items-center gap-3 border-b border-[var(--line)] pb-4">
          <span className="flex size-10 items-center justify-center rounded-md bg-[var(--accent-soft)] text-[var(--accent-strong)]">
            <Smile aria-hidden="true" size={20} />
          </span>
          <div>
            <h2 className="text-base font-semibold text-[var(--ink)]" id="patient-details-title">Hasta Bilgileri</h2>
            <p className="text-xs text-[var(--muted)]">Kayıt tarihi: {formatDate(patient.createdAt)}</p>
          </div>
        </div>
        <dl className="mt-5 grid gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
          <Detail label="Ad Soyad" value={fullName} />
          <div>
            <dt className="text-xs font-medium text-[var(--muted)]">Sorumlu Doktor</dt>
            <dd className="mt-1 text-sm font-medium text-[var(--ink)]">
              {patient.doctor ? (
                <Link className="text-[var(--accent-strong)] underline-offset-4 hover:underline" href={`/doctors/${patient.doctorId}`}>
                  Dr. {patient.doctor.firstName} {patient.doctor.lastName}
                </Link>
              ) : "Atanmamış"}
            </dd>
          </div>
          <Detail label="Telefon" value={patient.phone || "Belirtilmedi"} />
          <Detail label="E-posta" value={patient.email || "Belirtilmedi"} />
          <Detail label="Doğum Tarihi" value={formatDate(patient.dateOfBirth)} />
          <Detail label="Adres" value={patient.address || "Belirtilmedi"} />
          <Detail label="Kayıt Tarihi" value={formatDate(patient.createdAt)} />
          <div className="sm:col-span-2 lg:col-span-3">
            <Detail label="Notlar" value={patient.notes || "Not bulunmuyor."} />
          </div>
        </dl>
      </section>

      <section aria-labelledby="patient-teeth-title" className="rounded-md border border-[var(--line)] bg-white p-5 sm:p-7">
        <div className="border-b border-[var(--line)] pb-4">
          <h2 className="text-base font-semibold text-[var(--ink)]" id="patient-teeth-title">Diş Durumu (FDI)</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">Dişe tıklayarak temel durumu ve notu kaydedin.</p>
        </div>
        {patient.doctor ? (
          <p className="mt-4 text-sm text-[var(--muted)]">
            Sorumlu doktor: Dr. {patient.doctor.firstName} {patient.doctor.lastName}
          </p>
        ) : (
          <p className="mt-4 rounded-md bg-amber-50 p-3 text-sm text-amber-900">
            Eski hasta kaydına sorumlu doktor atanmadığı için dental güncelleme yapılamaz.
          </p>
        )}
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            [18, 17, 16, 15, 14, 13, 12, 11],
            [21, 22, 23, 24, 25, 26, 27, 28],
            [48, 47, 46, 45, 44, 43, 42, 41],
            [31, 32, 33, 34, 35, 36, 37, 38],
          ].map((row) => (
            <div className="grid grid-cols-4 gap-2 rounded-md bg-[var(--canvas)] p-3" key={row[0]}>
              {row.map((toothNumber) => {
                const tooth = patient.teeth.find((entry) => entry.toothNumber === toothNumber);
                return (
                  <details className="group min-w-0" key={toothNumber}>
                    <summary className={`flex min-h-11 cursor-pointer list-none items-center justify-center rounded-md border text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] [&::-webkit-details-marker]:hidden ${tooth ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent-strong)]" : "border-[var(--line)] bg-white text-[var(--muted)]"}`}>
                      {toothNumber}
                    </summary>
                    <div className="col-span-4 mt-2 rounded-md border border-[var(--line)] bg-white p-2">
                      <p className="text-xs font-semibold text-[var(--ink)]">{toothNumber} numaralı diş</p>
                      {tooth?.planItems.length ? (
                        <ul className="mt-1 text-xs text-[var(--muted)]">
                          {tooth.planItems.map((item) => (
                            <li key={item.id}>{item.treatmentName}</li>
                          ))}
                        </ul>
                      ) : null}
                      {patient.doctorId ? (
                        <PatientToothForm
                          notes={tooth?.notes ?? ""}
                          patientId={patient.id}
                          status={tooth?.status ?? ToothStatus.HEALTHY}
                          toothNumber={toothNumber}
                        />
                      ) : null}
                    </div>
                  </details>
                );
              })}
            </div>
          ))}
        </div>
        <div className="mt-5">
          <h3 className="text-sm font-semibold text-[var(--ink)]">Diş ve Tedavi Kayıtları</h3>
          {patient.teeth.length === 0 ? (
            <p className="mt-2 text-sm text-[var(--muted)]">Henüz diş kaydı bulunmuyor.</p>
          ) : (
            <ul className="mt-2 divide-y divide-[var(--line)]">
              {patient.teeth.map((tooth) => (
                <li className="flex flex-col gap-1 py-3 text-sm sm:flex-row sm:items-start sm:justify-between" key={tooth.toothNumber}>
                  <span className="font-medium text-[var(--ink)]">
                    FDI {tooth.toothNumber} · {TOOTH_STATUS_LABELS[tooth.status]}
                    {tooth.notes ? ` · ${tooth.notes}` : ""}
                  </span>
                  <span className="text-[var(--muted)]">
                    {tooth.planItems.map((item) => item.treatmentName).join(", ") || "Tedavi planı yok"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section aria-labelledby="patient-treatment-history-title" className="rounded-md border border-[var(--line)] bg-white p-5 sm:p-7">
        <h2 className="text-base font-semibold text-[var(--ink)]" id="patient-treatment-history-title">Tedavi Geçmişi</h2>
        {treatmentPlans.length === 0 ? (
          <p className="mt-3 text-sm text-[var(--muted)]">Henüz tedavi planı bulunmuyor.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[620px] text-left text-sm">
              <thead className="text-xs text-[var(--muted)]"><tr><th className="py-2">Tarih</th><th>Plan</th><th>Tedavi</th><th>Diş</th><th>Doktor</th></tr></thead>
              <tbody className="divide-y divide-[var(--line)]">
                {treatmentPlans.flatMap((plan) => plan.items.map((item, index) => (
                  <tr key={`${plan.id}-${index}`}>
                    <td className="py-3">{formatDate(plan.startsAt ?? plan.createdAt)}</td>
                    <td>{plan.status}</td>
                    <td>{item.treatmentName}</td>
                    <td>{item.patientTooth ? `FDI ${item.patientTooth.toothNumber}` : "—"}</td>
                    <td>{plan.createdByDoctor ? `Dr. ${plan.createdByDoctor.firstName} ${plan.createdByDoctor.lastName}` : "—"}</td>
                  </tr>
                )))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section aria-labelledby="patient-appointment-history-title" className="rounded-md border border-[var(--line)] bg-white p-5 sm:p-7">
        <h2 className="text-base font-semibold text-[var(--ink)]" id="patient-appointment-history-title">Randevu Geçmişi</h2>
        {appointments.length === 0 ? (
          <p className="mt-3 text-sm text-[var(--muted)]">Henüz randevu bulunmuyor.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[620px] text-left text-sm">
              <thead className="text-xs text-[var(--muted)]"><tr><th className="py-2">Tarih / Saat</th><th>Doktor</th><th>Tedavi</th><th>Durum</th></tr></thead>
              <tbody className="divide-y divide-[var(--line)]">
                {appointments.map((appointment) => (
                  <tr key={appointment.id}>
                    <td className="py-3">{new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Istanbul" }).format(appointment.startsAt)}</td>
                    <td>Dr. {appointment.doctor.firstName} {appointment.doctor.lastName}</td>
                    <td>{appointment.treatment?.name ?? "—"}</td>
                    <td>{appointment.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section aria-labelledby="patient-payments-title" className="rounded-md border border-[var(--line)] bg-white p-5 sm:p-7">
        <h2 className="text-base font-semibold text-[var(--ink)]" id="patient-payments-title">Ödemeler</h2>
        {payments.length === 0 ? (
          <p className="mt-3 text-sm text-[var(--muted)]">Henüz ödeme bulunmuyor.</p>
        ) : (
          <ul className="mt-3 divide-y divide-[var(--line)]">
            {payments.map((payment) => (
              <li className="flex justify-between gap-3 py-3 text-sm" key={payment.id}>
                <span>{formatDate(payment.paidAt)} · {payment.method}</span>
                <span className="font-medium">{new Intl.NumberFormat("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(payment.amount.toNumber())} {payment.treatmentPlan.currency.trim()}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-label="Hasta geçmişi" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <HistorySection
          count={patient._count.appointments}
          emptyMessage="Bu hastaya ait henüz randevu bulunmuyor."
          icon={CalendarDays}
          title="Randevular"
        />
        <HistorySection
          count={treatmentCount}
          emptyMessage="Bu hastaya ait henüz işlem bulunmuyor."
          icon={Smile}
          title="İşlemler"
        />
        <HistorySection
          count={patient._count.treatmentPlans}
          emptyMessage="Bu hastaya ait henüz tedavi planı bulunmuyor."
          icon={ClipboardList}
          title="Tedavi Planları"
        />
        <HistorySection
          count={paymentCount}
          emptyMessage="Bu hastaya ait henüz ödeme bulunmuyor."
          icon={CreditCard}
          title="Ödemeler"
        />
        <HistorySection
          count={patient._count.documents}
          emptyMessage="Bu hastaya ait henüz belge bulunmuyor."
          icon={FileText}
          title="Belgeler"
          documentsHref={`/patients/${patient.id}/documents`}
          addDocumentHref={`/patients/${patient.id}/documents/new`}
        />
      </section>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-medium text-[var(--muted)]">{label}</dt>
      <dd className="mt-1 break-words text-sm font-medium text-[var(--ink)]">{value}</dd>
    </div>
  );
}