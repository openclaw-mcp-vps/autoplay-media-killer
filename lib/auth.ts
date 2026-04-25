import type { NextAuthOptions } from "next-auth";
import { getServerSession } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

import { verifyPassword } from "@/lib/passwords";
import { findUserByEmail, isSubscriptionActive, normalizeEmail, readStore } from "@/lib/store";

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/auth",
  },
  providers: [
    CredentialsProvider({
      name: "Email and Password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials.password) {
          return null;
        }

        const store = readStore();
        const user = findUserByEmail(store, credentials.email);
        if (!user) {
          return null;
        }

        const valid = verifyPassword(credentials.password, user.passwordHash);
        if (!valid) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          subscriptionActive: isSubscriptionActive(store, user.email),
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.userId = user.id;
        token.subscriptionActive = (user as { subscriptionActive?: boolean })
          .subscriptionActive;
      }

      if (token.email) {
        const store = readStore();
        const dbUser = findUserByEmail(store, token.email);
        token.userId = dbUser?.id;
        token.subscriptionActive = dbUser
          ? isSubscriptionActive(store, normalizeEmail(dbUser.email))
          : false;
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.userId as string;
        session.user.subscriptionActive = Boolean(token.subscriptionActive);
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET ?? process.env.STRIPE_WEBHOOK_SECRET,
};

export function auth() {
  return getServerSession(authOptions);
}
