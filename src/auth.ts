import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { Role } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { beginLoginAttempt } from "@/lib/auth/rate-limit";
import { parseLoginCredentials } from "@/lib/validations/auth";
import { verifyLoginPassword } from "@/lib/auth/password";

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: process.env.AUTH_SECRET,
  useSecureCookies: process.env.NODE_ENV === "production",
  trustHost:
    process.env.AUTH_TRUST_HOST === "true" || process.env.NODE_ENV !== "production",
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 8 * 60 * 60,
  },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(input) {
        const credentials = parseLoginCredentials(input);
        if (!credentials) return null;

        const attempt = beginLoginAttempt(credentials.email);
        if (attempt.limited) return null;

        let succeeded: boolean | undefined;

        try {
          const user = await prisma.user.findUnique({
            where: { email: credentials.email },
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              isActive: true,
              passwordHash: true,
            },
          });

          const passwordMatches = await verifyLoginPassword(
            credentials.password,
            user?.passwordHash,
          );

          succeeded = Boolean(user?.isActive && passwordMatches);
          if (!succeeded || !user) return null;

          return {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
          };
        } finally {
          attempt.complete(succeeded);
        }
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) token.role = user.role;
      token.name = null;
      token.email = null;
      token.picture = null;
      return token;
    },
    session({ session, token }) {
      if (
        session.user &&
        token.sub &&
        typeof token.role === "string" &&
        Object.values(Role).includes(token.role as Role)
      ) {
        session.user.id = token.sub;
        session.user.role = token.role as Role;
      }
      return session;
    },
  },
});