import Link from "next/link";

import { auth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { UnlockForm } from "@/components/dashboard/unlock-form";

export const metadata = {
  title: "Unlock Access",
};

export default async function UnlockPage() {
  const session = await auth();

  return (
    <main className="mx-auto grid min-h-screen w-full max-w-6xl gap-8 px-5 py-12 sm:px-8 lg:grid-cols-2">
      <section>
        <p className="mb-3 inline-flex rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-cyan-300">
          Paid Access
        </p>
        <h1 className="text-4xl font-black text-slate-50">Unlock The Tool</h1>
        <p className="mt-4 text-slate-300">
          The dashboard and extension sync APIs are behind a paid access cookie.
          After checkout, verify once and keep using your account seamlessly.
        </p>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <a
            href={process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK ?? ""}
            target="_blank"
            rel="noreferrer"
          >
            <Button size="lg">Buy Access on Stripe</Button>
          </a>
          <Link href="/dashboard">
            <Button size="lg" variant="outline">
              Go to Dashboard
            </Button>
          </Link>
        </div>

        <p className="mt-8 text-sm text-slate-400">
          If webhook delivery is delayed, retry verification in 15-30 seconds.
        </p>
      </section>

      <section>
        <UnlockForm defaultEmail={session?.user?.email ?? ""} />
      </section>
    </main>
  );
}
