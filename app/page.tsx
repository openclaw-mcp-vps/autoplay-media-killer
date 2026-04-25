import Link from "next/link";
import { ShieldBan, VolumeX, Waves, Zap } from "lucide-react";

import { Button } from "@/components/ui/button";
import { PricingTable } from "@/components/pricing-table";

const problems = [
  {
    title: "Attention Hijack",
    description:
      "News sites, blogs, and social feeds trigger video playback before you touch the page.",
  },
  {
    title: "Public Audio Embarrassment",
    description:
      "Unexpected audio starts during meetings, commutes, and shared spaces.",
  },
  {
    title: "Battery and CPU Burn",
    description:
      "Autoplaying media silently drains resources even when content is irrelevant.",
  },
];

const solutions = [
  {
    icon: ShieldBan,
    title: "Preemptive Media Blocking",
    description:
      "Intercepts media playback and removes autoplay intents before videos can fire.",
  },
  {
    icon: VolumeX,
    title: "Granular Toggles",
    description:
      "Disable video autoplay, audio autoplay, or embedded iframe autoplay independently.",
  },
  {
    icon: Waves,
    title: "Smart Whitelist",
    description:
      "Allow trusted domains while every unknown site stays locked down by default.",
  },
  {
    icon: Zap,
    title: "Cross-Device Sync",
    description:
      "Sign in once and your whitelist and controls follow you across browsers and devices.",
  },
];

const faqs = [
  {
    q: "Does this work on modern autoplay patterns, not just basic <video autoplay>?",
    a: "Yes. The extension blocks direct media autoplay, JavaScript-initiated play() calls, and autoplay query flags in embedded players.",
  },
  {
    q: "Can I allow autoplay on specific sites?",
    a: "Yes. Add exact domains or wildcard rules like *.trustednews.com in the dashboard or extension options.",
  },
  {
    q: "How is access controlled after payment?",
    a: "After checkout, you verify your purchase email once. The app issues a secure access cookie and validates subscription state for extension sync APIs.",
  },
  {
    q: "Will this slow down my browsing?",
    a: "No. The content script is lightweight and runs only the checks needed to neutralize autoplay behavior.",
  },
];

export default function Home() {
  return (
    <div className="relative overflow-x-hidden">
      <header className="sticky top-0 z-20 border-b border-slate-800/90 bg-[#0d1117]/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-4 sm:px-8">
          <span className="text-sm font-bold uppercase tracking-[0.14em] text-cyan-300">
            autoplay-media-killer
          </span>
          <nav className="flex items-center gap-2 sm:gap-3">
            <Link href="/auth">
              <Button size="sm" variant="ghost">
                Sign In
              </Button>
            </Link>
            <Link href="/dashboard">
              <Button size="sm">Dashboard</Button>
            </Link>
          </nav>
        </div>
      </header>

      <main>
        <section className="mx-auto grid w-full max-w-6xl gap-10 px-5 pb-20 pt-16 sm:px-8 lg:grid-cols-[1.3fr_1fr] lg:pt-24">
          <div>
            <p className="mb-5 inline-flex rounded-full border border-cyan-400/30 bg-cyan-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.15em] text-cyan-300">
              Built from an HN plea to browser vendors
            </p>
            <h1 className="text-4xl font-black leading-tight text-slate-50 sm:text-5xl lg:text-6xl">
              Kill autoplay media across all websites.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">
              Autoplay Media Killer gives you deterministic control over every
              autoplay attempt, from social feeds to embedded news players. You
              decide what plays, where it plays, and when silence stays intact.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a
                href={process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK ?? ""}
                target="_blank"
                rel="noreferrer"
              >
                <Button size="lg">Start Protecting My Browser</Button>
              </a>
              <Link href="/unlock">
                <Button size="lg" variant="outline">
                  Unlock Existing Purchase
                </Button>
              </Link>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-700/80 bg-surface p-6 shadow-[0_18px_80px_-42px_rgba(34,211,238,0.7)]">
            <h2 className="text-lg font-bold text-slate-50">What You Get</h2>
            <ul className="mt-4 space-y-3 text-sm text-slate-300">
              <li>Real-time autoplay interception on every page load</li>
              <li>Domain whitelist synced through a secure API</li>
              <li>Extension login with subscription validation</li>
              <li>Control panel for audio, video, and iframe autoplay modes</li>
              <li>Cookie-based access gate for the managed web dashboard</li>
            </ul>
          </div>
        </section>

        <section id="problem" className="border-y border-slate-800 bg-surface/50 py-16">
          <div className="mx-auto w-full max-w-6xl px-5 sm:px-8">
            <h2 className="text-3xl font-bold text-slate-50">The Problem</h2>
            <p className="mt-3 max-w-3xl text-slate-300">
              Users have asked browser vendors for years to end autoplay chaos.
              The default web still optimizes for forced engagement instead of
              user consent.
            </p>
            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {problems.map((problem) => (
                <article
                  key={problem.title}
                  className="rounded-xl border border-slate-700/70 bg-[#111826] p-5"
                >
                  <h3 className="text-lg font-semibold text-cyan-300">
                    {problem.title}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-slate-300">
                    {problem.description}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="solution" className="py-16">
          <div className="mx-auto w-full max-w-6xl px-5 sm:px-8">
            <h2 className="text-3xl font-bold text-slate-50">The Solution</h2>
            <p className="mt-3 max-w-3xl text-slate-300">
              A dedicated extension and synced dashboard that aggressively blocks
              autoplay while giving you exact control over trusted exceptions.
            </p>
            <div className="mt-8 grid gap-4 md:grid-cols-2">
              {solutions.map(({ icon: Icon, title, description }) => (
                <article
                  key={title}
                  className="rounded-xl border border-slate-700/70 bg-[#101723] p-5"
                >
                  <Icon className="size-6 text-cyan-300" />
                  <h3 className="mt-3 text-lg font-semibold text-slate-100">
                    {title}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-slate-300">
                    {description}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="pricing" className="border-y border-slate-800 bg-surface/30 py-16">
          <div className="mx-auto w-full max-w-6xl px-5 sm:px-8">
            <h2 className="mb-8 text-center text-3xl font-bold text-slate-50">
              Simple Pricing
            </h2>
            <PricingTable />
          </div>
        </section>

        <section id="faq" className="py-16">
          <div className="mx-auto w-full max-w-4xl px-5 sm:px-8">
            <h2 className="text-3xl font-bold text-slate-50">FAQ</h2>
            <div className="mt-8 space-y-4">
              {faqs.map((item) => (
                <article
                  key={item.q}
                  className="rounded-xl border border-slate-700/70 bg-[#101723] p-5"
                >
                  <h3 className="text-base font-semibold text-cyan-300">
                    {item.q}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-slate-300">
                    {item.a}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-800 py-8">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-5 text-sm text-slate-400 sm:px-8">
          <p>Autoplay Media Killer</p>
          <p>
            Built for users who want consent-driven media playback, not surprise
            noise.
          </p>
        </div>
      </footer>
    </div>
  );
}
