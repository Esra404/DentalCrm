import { prisma } from "../src/lib/prisma";

const LOCAL_DATABASE_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);
const DEFAULT_TREATMENTS = [
  ["Muayene", "Klinik muayene"],
  ["Diş Taşı Temizliği", "Diş taşı ve plak temizliği"],
  ["Kompozit Dolgu", "Kompozit restorasyon"],
  ["Kanal Tedavisi", "Endodontik kanal tedavisi"],
  ["Diş Çekimi", "Basit diş çekimi"],
  ["Cerrahi Diş Çekimi", "Cerrahi diş çekimi"],
  ["Porselen Kuron", "Porselen kuron restorasyonu"],
  ["Zirkonyum Kuron", "Zirkonyum kuron restorasyonu"],
  ["İmplant", "Dental implant uygulaması"],
  ["Diş Beyazlatma", "Profesyonel diş beyazlatma"],
  ["Ortodontik Kontrol", "Ortodontik kontrol randevusu"],
  ["Geçici Dolgu", "Geçici restorasyon"],
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
  if (
    !["postgres:", "postgresql:"].includes(databaseUrl.protocol) ||
    !LOCAL_DATABASE_HOSTS.has(databaseUrl.hostname) ||
    databaseName !== "dental_crm"
  ) {
    throw new Error("Treatment catalogue seeding only permits local dental_crm.");
  }
}

async function main(): Promise<void> {
  assertLocalDevelopmentDatabase();

  for (const [name, description] of DEFAULT_TREATMENTS) {
    await prisma.treatment.upsert({
      where: { name },
      update: {},
      create: {
        name,
        description,
        defaultPrice: "0.00",
        currency: "TRY",
        isActive: false,
      },
    });
  }

  console.info(
    `Seeded ${DEFAULT_TREATMENTS.length} default treatments as inactive. Set clinic prices before activating them.`,
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
