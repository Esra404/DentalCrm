import { prisma } from "../src/lib/prisma";

const LOCAL_DATABASE_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);
const DEFAULT_TREATMENTS = [
  ["Diş Beyazlatma", "Estetik · Profesyonel diş beyazlatma uygulaması."],
  ["Dijital Gülüş Tasarımı", "Estetik · Dijital analiz ve gülüş tasarımı."],
  ["Diş Eti Estetiği", "Periodonti · Diş eti estetiği ve şekillendirme."],
  ["Porselen Kaplama", "Protez · Porselen kron restorasyonu."],
  ["Zirkonyum Kaplama", "Protez · Zirkonyum kron restorasyonu."],
  ["Diş Köprüsü", "Protez · Sabit köprü protezi uygulaması."],
  ["Diş İmplantı", "İmplant · Dental implant uygulaması."],
  ["Tek Diş İmplantı", "İmplant · Tek diş için implant uygulaması."],
  ["Çoklu Diş İmplantı", "İmplant · Birden fazla diş için implant uygulaması."],
  ["All-on-4", "İmplant · Dört implant destekli tam çene tedavi seçeneği."],
  ["All-on-6", "İmplant · Altı implant destekli tam çene tedavi seçeneği."],
  ["Diş Protezi", "Protez · Hareketli veya sabit diş protezi uygulaması."],
  ["Ortodonti", "Ortodonti · Diş ve çene kapanış bozukluklarının tedavisi."],
  ["Kanal Tedavisi", "Endodonti · Diş pulpası ve kök kanalı tedavisi."],
  ["Diş Çekimi", "Cerrahi · Diş çekimi uygulaması."],
  ["Çene Cerrahisi", "Cerrahi · Ağız ve çene cerrahisi işlemi."],
  ["Diş Taşı Temizliği", "Periodonti · Diş taşı ve plak temizliği."],
  ["Pedodonti", "Çocuk Diş · Çocuk hastalara yönelik diş hekimliği hizmeti."],
  ["Lazer Diş Hekimliği", "Diğer · Lazer destekli diş hekimliği uygulaması."],
] as const;

function assertLocalDevelopmentDatabase(): void {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Treatment catalogue seeding is disabled in production.");
  }

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is required.");

  let databaseUrl: URL;
  try {
    databaseUrl = new URL(connectionString);
  } catch {
    throw new Error("DATABASE_URL must be a valid local PostgreSQL URL.");
  }

  const databaseName = decodeURIComponent(databaseUrl.pathname.replace(/^\//, ""));
  const isNotLocalDevelopmentDatabase =
    !["postgres:", "postgresql:"].includes(databaseUrl.protocol) ||
    !LOCAL_DATABASE_HOSTS.has(databaseUrl.hostname) ||
    databaseName !== "dental_crm";
  const explicitlyAllowedNeonDatabase =
    process.env.ALLOW_NEON_TREATMENT_SEED === "true" &&
    ["postgres:", "postgresql:"].includes(databaseUrl.protocol) &&
    databaseUrl.hostname.endsWith(".neon.tech") &&
    databaseName === "neondb";

  if (isNotLocalDevelopmentDatabase && !explicitlyAllowedNeonDatabase) {
    if (
      ["postgres:", "postgresql:"].includes(databaseUrl.protocol) &&
      LOCAL_DATABASE_HOSTS.has(databaseUrl.hostname) &&
      databaseName === "dental_crm"
    ) {
      return;
    }
    throw new Error(
      "Treatment catalogue seeding requires local dental_crm or explicit Neon neondb opt-in.",
    );
  }
}

async function main(): Promise<void> {
  assertLocalDevelopmentDatabase();

  for (const [name, description] of DEFAULT_TREATMENTS) {
    await prisma.treatment.upsert({
      where: { name },
      update: { isActive: true },
      create: {
        name,
        description,
        defaultPrice: "0.00",
        currency: "TRY",
        isActive: true,
      },
    });
  }

  console.info(
    `Seeded ${DEFAULT_TREATMENTS.length} active default treatments at 0.00 TRY. Set clinic prices before creating plans.`,
  );
}

main()
  .catch((error: unknown) => {
    console.error("Treatment catalogue seed failed.", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
