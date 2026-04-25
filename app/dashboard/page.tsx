import Link from "next/link";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";

import { auth } from "@/lib/auth";
import { readAccessCookieValue, ACCESS_COOKIE_NAME } from "@/lib/access-cookie";
import { findUserByEmail, isSubscriptionActive, readStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { UnlockForm } from "@/components/dashboard/unlock-form";
import { DashboardClient } from "@/components/dashboard/dashboard-client";

export const metadata = {
  title: "Dashboard",
};

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user?.email) {
    redirect("/auth?next=/dashboard");
  }

  const store = readStore();
  const user = findUserByEmail(store, session.user.email);

  if (!user) {
    redirect("/auth?next=/dashboard");
  }

  const cookieStore = await cookies();
  const parsedAccessCookie = readAccessCookieValue(
    cookieStore.get(ACCESS_COOKIE_NAME)?.value
  );

  const hasActiveSubscription = isSubscriptionActive(store, user.email);
  const hasCookieAccess =
    parsedAccessCookie?.email === user.email.toLowerCase().trim();

  if (!hasActiveSubscription || !hasCookieAccess) {
    return (
      <main className="mx-auto grid min-h-screen w-full max-w-6xl gap-8 px-5 py-12 sm:px-8 lg:grid-cols-2">
        <section>
          <h1 className="text-4xl font-black text-slate-50">Dashboard Locked</h1>
          <p className="mt-4 text-slate-300">
            Your account is signed in, but this tool is paywalled behind a
            verified purchase cookie.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <a
              href={process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK ?? ""}
              target="_blank"
              rel="noreferrer"
            >
              <Button size="lg">Buy Access on Stripe</Button>
            </a>
            <Link href="/">
              <Button size="lg" variant="outline">
                Back to Landing Page
              </Button>
            </Link>
          </div>
        </section>
        <section>
          <UnlockForm defaultEmail={user.email} />
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl px-5 py-12 sm:px-8">
      <header className="mb-8 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-4xl font-black text-slate-50">Control Dashboard</h1>
          <p className="mt-2 text-sm text-slate-300">
            Sync autoplay-blocking rules with your browser extension in real time.
          </p>
        </div>
        <Link href="/">
          <Button variant="outline">Home</Button>
        </Link>
      </header>

      <DashboardClient
        user={{
          name: user.name,
          email: user.email,
        }}
        initialWhitelist={user.whitelist}
        initialSettings={user.extensionSettings}
      />
    </main>
  );
}
