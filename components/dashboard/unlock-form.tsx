"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";

interface UnlockFormProps {
  defaultEmail?: string;
}

export function UnlockForm({ defaultEmail = "" }: UnlockFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState(defaultEmail);
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setStatus(null);

    try {
      const response = await fetch("/api/subscription/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const result = (await response.json()) as { error?: string; active?: boolean };

      if (!response.ok) {
        setStatus(result.error ?? "Could not verify your purchase email.");
        return;
      }

      if (result.active) {
        setStatus("Subscription verified. Redirecting to dashboard...");
        router.push("/dashboard");
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="rounded-2xl border border-slate-700/70 bg-surface p-6">
      <h2 className="text-xl font-bold text-slate-50">Verify Purchase</h2>
      <p className="mt-2 text-sm text-slate-300">
        Enter the email used in Stripe checkout. We validate it against webhook
        events and issue your secure access cookie.
      </p>
      <label className="mt-4 flex flex-col gap-2 text-sm text-slate-200">
        Checkout email
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
          className="h-10 rounded-lg border border-slate-700 bg-[#0d1117] px-3 text-slate-100 outline-none focus:border-cyan-400"
        />
      </label>

      {status && (
        <p className="mt-4 rounded-lg border border-slate-700 bg-[#101723] px-3 py-2 text-sm text-slate-300">
          {status}
        </p>
      )}

      <Button className="mt-4 w-full" type="submit" size="lg" disabled={loading}>
        {loading ? "Verifying..." : "Verify and Unlock"}
      </Button>
    </form>
  );
}
