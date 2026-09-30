"use server";

import { AuthError } from "next-auth";
import { signIn, signOut } from "@/auth";
import { parseLoginCredentials, type LoginActionState } from "@/lib/validations/auth";

const INVALID_LOGIN_MESSAGE = "Invalid email or password.";

export async function loginAction(
  _previousState: LoginActionState,
  formData: FormData,
): Promise<LoginActionState> {
  const credentials = parseLoginCredentials({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!credentials) return { error: INVALID_LOGIN_MESSAGE };

  try {
    await signIn("credentials", {
      ...credentials,
      redirectTo: "/auth-check",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: INVALID_LOGIN_MESSAGE };
    }

    throw error;
  }

  return { error: INVALID_LOGIN_MESSAGE };
}

export async function logoutAction(): Promise<void> {
  await signOut({ redirectTo: "/login" });
}