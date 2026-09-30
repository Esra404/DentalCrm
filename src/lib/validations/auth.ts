export type LoginCredentials = {
  email: string;
  password: string;
};

export type LoginActionState = {
  error?: string;
};

export function parseLoginCredentials(input: {
  email?: unknown;
  password?: unknown;
}): LoginCredentials | null {
  if (typeof input.email !== "string" || typeof input.password !== "string") {
    return null;
  }

  const email = input.email.trim().toLowerCase();

  if (
    email.length > 320 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    input.password.length === 0 ||
    Buffer.byteLength(input.password, "utf8") > 1024
  ) {
    return null;
  }

  return { email, password: input.password };
}