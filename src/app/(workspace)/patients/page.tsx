import Link from "next/link";
import { ArrowRight, Eye, Plus, Search, UserRoundPen } from "lucide-react";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

const PAGE_SIZE = 25;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PATIENT_SELECT = {
  id: true,
  firstName: true,
  lastName: true,
  phone: true,
  email: true,
  dateOfBirth: true,
  isActive: true,
  createdAt: true,
} satisfies Prisma.PatientSelect;

type PatientsPageProps = {
  searchParams: Promise<{
    q?: string | string[];
    cursor?: string | string[];
    created?: string | string[];
  }>;
};

function getSingleValue(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function formatDate(value: Date | null): string {
  if (!value) return "Belirtilmedi";
  return new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium" }).format(value);
}

function makeNextHref(query: string, cursor: string): string {
  const params = new URLSearchParams();
  if (query) params.set("q", query);
  params.set("cursor", cursor);
  return `/patients?${params.toString()}`;
}

export default async function PatientsPage({ searchParams }: PatientsPageProps) {
  const params = await searchParams;
  const query = getSingleValue(params.q).trim().slice(0, 120);
  const requestedCursor = getSingleValue(params.cursor);
  const cursor = UUID_PATTERN.test(requestedCursor) ? requestedCursor : "";
  const created = getSingleValue(params.created) === "1";
  const terms = query.split(/\s+/).filter(Boolean).slice(0, 5);

  const where: Prisma.PatientWhereInput = query
    ? {
        OR: [
          { firstName: { contains: query, mode: "insensitive" } },
          { lastName: { contains: query, mode: "insensitive" } },
          { phone: { contains: query } },
          { email: { contains: query, mode: "insensitive" } },
          {
            AND: terms.map((term) => ({
              OR: [
                { firstName: { contains: term, mode: "insensitive" as const } },
                { lastName: { contains: term, mode: "insensitive" as const } },
              ],
            })),
          },
        ],
      }
    : {};

  let patients: Prisma.PatientGetPayload<{ select: typeof PATIENT_SELECT }>[] = [];
  let hasMore = false;
  let loadError = false;

  try {
    const validCursor = cursor
      ? await prisma.patient.findUnique({ where: { id: cursor }, select: { id: true } })
      : null;
    const results = await prisma.patient.findMany({
      where,
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }, { id: "asc" }],
      take: PAGE_SIZE + 1,
      ...(validCursor ? { cursor: { id: validCursor.id }, skip: 1 } : {}),
      select: PATIENT_SELECT,
    });

    hasMore = results.length > PAGE_SIZE;
    patients = results.slice(0, PAGE_SIZE);
  } catch {
    loadError = true;
  }

  const nextHref =
    hasMore && patients.length > 0
      ? makeNextHref(query, patients[patients.length - 1].id)
      : null;

  return (
    <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-6">
      <header className="flex flex-col gap-4 border-b border-[var(--line)] pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--accent)]">
            Klinik
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-[var(--ink)]">Hastalar</h1>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Klinikte kayıtlı hastaları görüntüleyin ve yönetin.
          </p>
        </div>
        <Link
          className="inline-flex min-h-11 items-center justify-center gap-2 self-start rounded-md bg-[var(--accent-strong)] px-4 text-sm font-semibold text-white outline-none hover:bg-[#19483f] focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 sm:self-auto"
          href="/patients/new"
        >
          <Plus aria-hidden="true" size={17} />
          Yeni Hasta
        </Link>
      </header>

      {created ? (
        <p className="rounded-md border border-[#c7ded6] bg-[#e9f4ef] px-4 py-3 text-sm text-[#245b50]">
          Hasta kaydı oluşturuldu.
        </p>
      ) : null}

      <form action="/patients" className="flex flex-col gap-3 sm:flex-row" method="get" role="search">
        <label className="relative block min-w-0 flex-1">
          <span className="sr-only">Hasta ara</span>
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]"
            size={17}
          />
          <input
            className="min-h-11 w-full rounded-md border border-[var(--line)] bg-white pl-10 pr-3 text-sm text-[var(--ink)] outline-none placeholder:text-[#83928d] focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/15"
            defaultValue={query}
            maxLength={120}
            name="q"
            placeholder="Ad, soyad, telefon veya e-posta ile ara..."
            type="search"
          />
        </label>
        <button
          className="inline-flex min-h-11 items-center justify-center rounded-md border border-[var(--line)] bg-white px-4 text-sm font-medium text-[var(--ink)] outline-none hover:bg-[var(--canvas)] focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
          type="submit"
        >
          Ara
        </button>
        {query ? (
          <Link
            className="inline-flex min-h-11 items-center justify-center rounded-md px-3 text-sm font-medium text-[var(--muted)] outline-none hover:bg-white focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
            href="/patients"
          >
            Temizle
          </Link>
        ) : null}
      </form>

      {loadError ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-800" role="alert">
          Hastalar yüklenirken bir hata oluştu.
        </div>
      ) : patients.length === 0 ? (
        <section className="flex min-h-64 flex-col items-center justify-center rounded-md border border-dashed border-[#c7d7d2] bg-white/70 px-6 py-10 text-center">
          <span className="flex size-12 items-center justify-center rounded-full bg-[var(--accent-soft)] text-[var(--accent-strong)]">
            <Search aria-hidden="true" size={21} />
          </span>
          <h2 className="mt-4 text-base font-semibold text-[var(--ink)]">
            {query ? "Aramanızla eşleşen hasta bulunamadı." : "Henüz kayıtlı hasta bulunmuyor."}
          </h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            {query ? "Arama bilgilerini değiştirebilir veya temizleyebilirsiniz." : "İlk hasta kaydını oluşturarak başlayın."}
          </p>
          {!query ? (
            <Link
              className="mt-5 inline-flex min-h-10 items-center gap-2 rounded-md bg-[var(--accent-strong)] px-4 text-sm font-semibold text-white outline-none hover:bg-[#19483f] focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
              href="/patients/new"
            >
              <Plus aria-hidden="true" size={16} />
              Yeni Hasta Ekle
            </Link>
          ) : null}
        </section>
      ) : (
        <>
          <div className="overflow-hidden rounded-md border border-[var(--line)] bg-white">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[850px] border-collapse text-left text-sm">
                <caption className="sr-only">Kayıtlı hastalar</caption>
                <thead className="bg-[#f6f8f7] text-xs font-semibold text-[var(--muted)]">
                  <tr>
                    <th className="px-4 py-3.5" scope="col">Ad Soyad</th>
                    <th className="px-4 py-3.5" scope="col">Telefon</th>
                    <th className="px-4 py-3.5" scope="col">E-posta</th>
                    <th className="px-4 py-3.5" scope="col">Doğum Tarihi</th>
                    <th className="px-4 py-3.5" scope="col">Durum</th>
                    <th className="px-4 py-3.5" scope="col">Kayıt Tarihi</th>
                    <th className="px-4 py-3.5 text-right" scope="col">İşlemler</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--line)]">
                  {patients.map((patient) => {
                    const fullName = `${patient.firstName} ${patient.lastName}`;

                    return (
                      <tr className="hover:bg-[#fbfcfb]" key={patient.id}>
                        <th className="px-4 py-4 font-medium text-[var(--ink)]" scope="row">
                          <Link
                            className="rounded-sm outline-none hover:text-[var(--accent-strong)] focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                            href={`/patients/${patient.id}`}
                          >
                            {fullName}
                          </Link>
                        </th>
                        <td className="px-4 py-4 text-[var(--muted)]">{patient.phone || "—"}</td>
                        <td className="max-w-56 truncate px-4 py-4 text-[var(--muted)]">{patient.email || "—"}</td>
                        <td className="px-4 py-4 text-[var(--muted)]">{formatDate(patient.dateOfBirth)}</td>
                        <td className="px-4 py-4">
                          <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${patient.isActive ? "bg-[#e8f3ed] text-[#28634f]" : "bg-[#edf0ef] text-[#5f6e68]"}`}>
                            {patient.isActive ? "Aktif" : "Pasif"}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-[var(--muted)]">{formatDate(patient.createdAt)}</td>
                        <td className="px-4 py-4">
                          <div className="flex justify-end gap-1">
                            <Link
                              aria-label={`${fullName} detayını görüntüle`}
                              className="inline-flex size-9 items-center justify-center rounded-md text-[var(--muted)] outline-none hover:bg-[var(--accent-soft)] hover:text-[var(--accent-strong)] focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                              href={`/patients/${patient.id}`}
                            >
                              <Eye aria-hidden="true" size={17} />
                            </Link>
                            <Link
                              aria-label={`${fullName} bilgilerini düzenle`}
                              className="inline-flex size-9 items-center justify-center rounded-md text-[var(--muted)] outline-none hover:bg-[var(--accent-soft)] hover:text-[var(--accent-strong)] focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                              href={`/patients/${patient.id}/edit`}
                            >
                              <UserRoundPen aria-hidden="true" size={17} />
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {nextHref ? (
            <div className="flex justify-center">
              <Link
                className="inline-flex min-h-11 items-center gap-2 rounded-md border border-[var(--line)] bg-white px-4 text-sm font-medium text-[var(--ink)] outline-none hover:bg-[var(--canvas)] focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                href={nextHref}
              >
                Daha fazla yükle
                <ArrowRight aria-hidden="true" size={16} />
              </Link>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}