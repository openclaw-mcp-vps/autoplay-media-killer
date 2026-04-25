"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";

import { Button } from "@/components/ui/button";

type Mode = "signin" | "register";

export function AuthForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = useMemo(() => searchParams.get("next") || "/dashboard", [searchParams]);

  const [mode, setMode] = useState<Mode>("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleRegister() {
    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });

    const result = (await response.json()) as { error?: string };
    if (!response.ok) {
      setStatus(result.error ?? "Registration failed.");
      return;
    }

    const loginResult = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (loginResult?.error) {
      setStatus("Account created, but sign in failed. Please sign in manually.");
      return;
    }

    router.push(nextPath);
    router.refresh();
  }

  async function handleSignIn() {
    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      setStatus("Incorrect email or password.");
      return;
    }

    router.push(nextPath);
    router.refresh();
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus(null);
    setLoading(true);

    try {
      if (mode === "register") {
        await handleRegister();
      } else {
        await handleSignIn();
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-md rounded-2xl border border-slate-700/80 bg-surface p-6">
      <div className="mb-6 grid grid-cols-2 gap-2 rounded-lg bg-[#111826] p-1">
        <button
          type="button"
          onClick={() => setMode("signin")}
          className={`rounded-md px-3 py-2 text-sm font-semibold transition ${
            mode === "signin"
              ? "bg-cyan-500/25 text-cyan-200"
              : "text-slate-300 hover:text-slate-100"
          }`}
        >
          Sign In
        </button>
        <button
          type="button"
          onClick={() => setMode("register")}
          className={`rounded-md px-3 py-2 text-sm font-semibold transition ${
            mode === "register"
              ? "bg-cyan-500/25 text-cyan-200"
              : "text-slate-300 hover:text-slate-100"
          }`}
        >
          Create Account
        </button>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        {mode === "register" && (
          <label className="flex flex-col gap-2 text-sm text-slate-200">
            Full Name
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="h-10 rounded-lg border border-slate-700 bg-[#0d1117] px-3 text-slate-100 outline-none focus:border-cyan-400"
              required
              minLength={2}
            />
          </label>
        )}

        <label className="flex flex-col gap-2 text-sm text-slate-200">
          Email
          <input
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            type="email"
            className="h-10 rounded-lg border border-slate-700 bg-[#0d1117] px-3 text-slate-100 outline-none focus:border-cyan-400"
            required
          />
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-200">
          Password
          <input
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            type="password"
            className="h-10 rounded-lg border border-slate-700 bg-[#0d1117] px-3 text-slate-100 outline-none focus:border-cyan-400"
            required
            minLength={10}
          />
        </label>

        {status && (
          <p className="rounded-lg border border-slate-700 bg-[#101723] px-3 py-2 text-sm text-slate-300">
            {status}
          </p>
        )}

        <Button className="w-full" type="submit" size="lg" disabled={loading}>
          {loading
            ? "Working..."
            : mode === "register"
              ? "Create Account and Continue"
              : "Sign In and Continue"}
        </Button>
      </form>
    </div>
  );
}
