import { Check } from "lucide-react";

import { Button } from "@/components/ui/button";

const features = [
  "Block autoplay video, audio, and embedded media players",
  "Per-site whitelist with wildcard domain matching",
  "Sync settings and whitelist across every browser profile",
  "One-click emergency mute mode for noisy pages",
  "Subscription-backed anti-tamper validation in extension",
  "Priority support from engineers who care about attention hygiene",
];

export function PricingTable() {
  return (
    <div className="mx-auto w-full max-w-3xl rounded-2xl border border-slate-700/80 bg-surface p-8 shadow-[0_18px_80px_-35px_rgba(34,211,238,0.45)]">
      <p className="mb-3 inline-flex rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-cyan-300">
        Single Plan
      </p>
      <h3 className="text-3xl font-bold text-slate-50">Autoplay Media Killer Pro</h3>
      <p className="mt-2 text-sm text-slate-300">
        Built for people who refuse to let websites decide when sound starts.
      </p>

      <div className="mt-6 flex items-end gap-2">
        <span className="text-5xl font-extrabold text-cyan-300">$5</span>
        <span className="pb-1 text-lg text-slate-300">/ month</span>
      </div>

      <ul className="mt-8 space-y-3">
        {features.map((feature) => (
          <li key={feature} className="flex items-start gap-3 text-sm text-slate-200">
            <Check className="mt-0.5 size-4 text-cyan-300" />
            <span>{feature}</span>
          </li>
        ))}
      </ul>

      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        <a
          href={process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK ?? ""}
          target="_blank"
          rel="noreferrer"
          className="w-full"
        >
          <Button className="w-full" size="lg">
            Buy With Stripe Checkout
          </Button>
        </a>
        <a href="/unlock" className="w-full">
          <Button className="w-full" size="lg" variant="outline">
            I Already Purchased
          </Button>
        </a>
      </div>

      <p className="mt-4 text-xs text-slate-400">
        Hosted Stripe checkout, cancel anytime, and whitelist sync included.
      </p>
    </div>
  );
}
