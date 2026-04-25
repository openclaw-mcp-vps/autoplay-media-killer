import { Suspense } from "react";
import Link from "next/link";

import { AuthForm } from "@/components/auth/auth-form";

export const metadata = {
  title: "Sign In",
};

export default function AuthPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col items-center justify-center px-5 py-12 sm:px-8">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-slate-50">Access Your Dashboard</h1>
        <p className="mt-2 max-w-xl text-sm text-slate-300">
          Manage whitelist rules, sync extension settings, and verify your
          subscription purchase.
        </p>
        <Link href="/" className="mt-4 inline-block text-sm text-cyan-300 underline">
          Back to landing page
        </Link>
      </div>
      <Suspense
        fallback={
          <div className="rounded-2xl border border-slate-700/80 bg-surface p-6 text-sm text-slate-300">
            Loading authentication form...
          </div>
        }
      >
        <AuthForm />
      </Suspense>
    </main>
  );
}
