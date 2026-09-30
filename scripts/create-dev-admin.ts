import { createInterface } from "node:readline/promises";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth/password-core";
import { parseLoginCredentials } from "@/lib/validations/auth";
import { Role } from "@/generated/prisma/enums";

const LOCAL_DATABASE_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

class DevAdminSetupError extends Error {}

function assertDevelopmentTarget(): void {
  if (process.env.NODE_ENV === "production") {
    throw new DevAdminSetupError(
      "This development-only command cannot run in production.",
    );
  }

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new DevAdminSetupError("DATABASE_URL is required.");

  let databaseUrl: URL;
  try {
    databaseUrl = new URL(connectionString);
  } catch {
    throw new DevAdminSetupError(
      "DATABASE_URL must be a valid local PostgreSQL URL.",
    );
  }

  const databaseName = decodeURIComponent(databaseUrl.pathname.replace(/^\//, ""));
  if (
    !["postgres:", "postgresql:"].includes(databaseUrl.protocol) ||
    !LOCAL_DATABASE_HOSTS.has(databaseUrl.hostname) ||
    databaseName !== "dental_crm"
  ) {
    throw new DevAdminSetupError(
      "This command only permits the local dental_crm database.",
    );
  }
}

function readHidden(prompt: string): Promise<string> {
  const input = process.stdin;

  if (!input.isTTY || typeof input.setRawMode !== "function") {
    throw new DevAdminSetupError(
      "Run this command in an interactive terminal to enter passwords safely.",
    );
  }

  return new Promise((resolve, reject) => {
    let value = "";

    const finish = (callback: () => void) => {
      input.off("data", onData);
      input.setRawMode(false);
      input.pause();
      process.stdout.write("\n");
      callback();
    };

    const onData = (chunk: Buffer | string) => {
      for (const character of chunk.toString("utf8")) {
        if (character === "\u0003") {
          finish(() => reject(new Error("Cancelled.")));
          return;
        }

        if (character === "\r" || character === "\n") {
          finish(() => resolve(value));
          return;
        }

        if (character === "\u007f" || character === "\b") {
          value = value.slice(0, -1);
        } else if (character >= " ") {
          value += character;
        }
      }
    };

    process.stdout.write(prompt);
    input.setRawMode(true);
    input.resume();
    input.on("data", onData);
  });
}

async function promptEmail(): Promise<string> {
  const terminal = createInterface({ input: process.stdin, output: process.stdout });
  try {
    return await terminal.question("Admin email: ");
  } finally {
    terminal.close();
  }
}

async function createDevAdmin(): Promise<void> {
  assertDevelopmentTarget();

  const emailInput = await promptEmail();
  let password = await readHidden("Password (hidden): ");
  const confirmation = await readHidden("Confirm password (hidden): ");

  if (password !== confirmation) {
    password = "";
    throw new DevAdminSetupError("Passwords do not match; no account was created.");
  }

  if (Buffer.byteLength(password, "utf8") < 12) {
    password = "";
    throw new DevAdminSetupError(
      "Use a password of at least 12 bytes; no account was created.",
    );
  }

  const credentials = parseLoginCredentials({ email: emailInput, password });
  if (!credentials) {
    password = "";
    throw new DevAdminSetupError(
      "Email or password is invalid; no account was created.",
    );
  }

  const existing = await prisma.user.findUnique({
    where: { email: credentials.email },
    select: { id: true },
  });
  if (existing) {
    password = "";
    throw new DevAdminSetupError(
      "An account with this email already exists; no changes were made.",
    );
  }

  let passwordHash = "";
  try {
    passwordHash = await hashPassword(credentials.password);
    const user = await prisma.user.create({
      data: {
        name: "Development Admin",
        email: credentials.email,
        passwordHash,
        role: Role.ADMIN,
        isActive: true,
      },
      select: { email: true, role: true, isActive: true },
    });

    console.log(`Created ${user.role} account ${user.email} (active: ${user.isActive}).`);
  } finally {
    password = "";
    passwordHash = "";
  }
}

createDevAdmin()
  .catch((error: unknown) => {
    if (error instanceof DevAdminSetupError) {
      console.error(`Dev admin setup failed: ${error.message}`);
    } else {
      console.error(
        "Dev admin setup failed; details suppressed to protect credential material.",
      );
    }
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });