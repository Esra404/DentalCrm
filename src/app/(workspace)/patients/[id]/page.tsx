import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarDays, ClipboardList, CreditCard, FileText, Pencil, Smile } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { setPatientActiveAction } from "@/server/actions/patients";

function formatDate(value: Date | null): string {
  if (!value) return "Belirtilmedi";
  return new Intl.DateTimeFormat("tr-TR", { dateStyle: "long" }).format(value);
}

function HistorySection({
  title,
  emptyMessage,
  count,
  icon: Icon,
}: {
  title: string;
  emptyMessage: string;
  count: number;
  icon: typeof CalendarDays;
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
  const { id } = await params;
  const query = await searchParams;

  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
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

  const [treatmentCount, paymentCount] = await Promise.all([
    prisma.treatmentPlanItem.count({
      where: { treatmentPlan: { patientId: patient.id } },
    }),
    prisma.payment.count({
      where: { treatmentPlan: { patientId: patient.id } },
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