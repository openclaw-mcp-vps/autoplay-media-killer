"use client";

import { FormEvent, useMemo, useState } from "react";
import { signOut } from "next-auth/react";

import { Button } from "@/components/ui/button";

interface ExtensionSettings {
  blockVideoAutoplay: boolean;
  blockAudioAutoplay: boolean;
  blockIframeAutoplay: boolean;
  aggressivePlayInterception: boolean;
}

interface DashboardClientProps {
  user: {
    name: string;
    email: string;
  };
  initialWhitelist: string[];
  initialSettings: ExtensionSettings;
}

export function DashboardClient({
  user,
  initialWhitelist,
  initialSettings,
}: DashboardClientProps) {
  const [whitelist, setWhitelist] = useState(initialWhitelist);
  const [settings, setSettings] = useState(initialSettings);
  const [domainInput, setDomainInput] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [token, setToken] = useState<string | null>(null);

  const apiBase = useMemo(() => {
    if (typeof window !== "undefined") {
      return window.location.origin;
    }
    return "";
  }, []);

  async function saveChanges() {
    setLoading(true);
    setStatus(null);

    try {
      const response = await fetch("/api/whitelist/sync", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ whitelist, settings }),
      });

      const result = (await response.json()) as {
        error?: string;
        whitelist?: string[];
      };

      if (!response.ok) {
        setStatus(result.error ?? "Could not save settings.");
        return;
      }

      if (Array.isArray(result.whitelist)) {
        setWhitelist(result.whitelist);
      }

      setStatus("Saved. Extension sync endpoint now has your latest rules.");
    } finally {
      setLoading(false);
    }
  }

  async function generateExtensionToken() {
    setLoading(true);
    setStatus(null);

    try {
      const response = await fetch("/api/subscription/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ issueExtensionToken: true }),
      });

      const result = (await response.json()) as {
        error?: string;
        extensionToken?: string;
      };

      if (!response.ok) {
        setStatus(result.error ?? "Could not issue extension token.");
        return;
      }

      if (result.extensionToken) {
        setToken(result.extensionToken);
        setStatus("New extension token issued. Copy it into extension options.");
      }
    } finally {
      setLoading(false);
    }
  }

  function addDomain(event: FormEvent) {
    event.preventDefault();

    const normalized = domainInput.trim().toLowerCase();
    if (!normalized) {
      return;
    }

    if (whitelist.includes(normalized)) {
      setStatus("Domain already exists in whitelist.");
      return;
    }

    setWhitelist((prev) => [...prev, normalized]);
    setDomainInput("");
    setStatus(null);
  }

  function removeDomain(target: string) {
    setWhitelist((prev) => prev.filter((entry) => entry !== target));
  }

  async function copyToken() {
    if (!token) {
      return;
    }

    await navigator.clipboard.writeText(token);
    setStatus("Token copied to clipboard.");
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1.2fr_1fr]">
      <section className="space-y-5 rounded-2xl border border-slate-700/80 bg-surface p-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-50">Whitelist Manager</h2>
          <p className="mt-2 text-sm text-slate-300">
            Add domains where autoplay should remain enabled. Use wildcard
            patterns like *.example.com for trusted media properties.
          </p>
        </div>

        <form onSubmit={addDomain} className="flex flex-col gap-3 sm:flex-row">
          <input
            value={domainInput}
            onChange={(event) => setDomainInput(event.target.value)}
            placeholder="example.com or *.example.com"
            className="h-10 flex-1 rounded-lg border border-slate-700 bg-[#0d1117] px-3 text-slate-100 outline-none focus:border-cyan-400"
          />
          <Button type="submit" variant="outline">
            Add Domain
          </Button>
        </form>

        <ul className="grid gap-2">
          {whitelist.length === 0 && (
            <li className="rounded-lg border border-slate-700 bg-[#101723] px-3 py-2 text-sm text-slate-400">
              No whitelist rules yet. Autoplay is blocked everywhere by default.
            </li>
          )}
          {whitelist.map((domain) => (
            <li
              key={domain}
              className="flex items-center justify-between rounded-lg border border-slate-700 bg-[#101723] px-3 py-2"
            >
              <span className="font-mono text-sm text-slate-200">{domain}</span>
              <button
                type="button"
                onClick={() => removeDomain(domain)}
                className="text-xs font-semibold uppercase tracking-[0.08em] text-rose-300 hover:text-rose-200"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex items-center gap-2 rounded-lg border border-slate-700 bg-[#101723] px-3 py-2 text-sm text-slate-200">
            <input
              type="checkbox"
              checked={settings.blockVideoAutoplay}
              onChange={(event) =>
                setSettings((prev) => ({
                  ...prev,
                  blockVideoAutoplay: event.target.checked,
                }))
              }
            />
            Block video autoplay
          </label>

          <label className="flex items-center gap-2 rounded-lg border border-slate-700 bg-[#101723] px-3 py-2 text-sm text-slate-200">
            <input
              type="checkbox"
              checked={settings.blockAudioAutoplay}
              onChange={(event) =>
                setSettings((prev) => ({
                  ...prev,
                  blockAudioAutoplay: event.target.checked,
                }))
              }
            />
            Block audio autoplay
          </label>

          <label className="flex items-center gap-2 rounded-lg border border-slate-700 bg-[#101723] px-3 py-2 text-sm text-slate-200">
            <input
              type="checkbox"
              checked={settings.blockIframeAutoplay}
              onChange={(event) =>
                setSettings((prev) => ({
                  ...prev,
                  blockIframeAutoplay: event.target.checked,
                }))
              }
            />
            Block iframe autoplay
          </label>

          <label className="flex items-center gap-2 rounded-lg border border-slate-700 bg-[#101723] px-3 py-2 text-sm text-slate-200">
            <input
              type="checkbox"
              checked={settings.aggressivePlayInterception}
              onChange={(event) =>
                setSettings((prev) => ({
                  ...prev,
                  aggressivePlayInterception: event.target.checked,
                }))
              }
            />
            Aggressive play interception
          </label>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Button onClick={saveChanges} size="lg" disabled={loading}>
            {loading ? "Saving..." : "Save and Sync Rules"}
          </Button>
          <Button
            variant="outline"
            size="lg"
            disabled={loading}
            onClick={() => signOut({ callbackUrl: "/" })}
          >
            Sign Out
          </Button>
        </div>

        {status && (
          <p className="rounded-lg border border-slate-700 bg-[#101723] px-3 py-2 text-sm text-slate-300">
            {status}
          </p>
        )}
      </section>

      <section className="space-y-5 rounded-2xl border border-slate-700/80 bg-surface p-6">
        <h2 className="text-xl font-bold text-slate-50">Extension Setup</h2>
        <p className="text-sm text-slate-300">
          Use these values in extension options to enable authenticated sync.
        </p>

        <div className="space-y-2 rounded-lg border border-slate-700 bg-[#101723] p-3 text-sm">
          <p className="font-semibold text-slate-100">Account</p>
          <p className="text-slate-300">{user.name}</p>
          <p className="font-mono text-xs text-slate-400">{user.email}</p>
        </div>

        <div className="space-y-2 rounded-lg border border-slate-700 bg-[#101723] p-3 text-sm">
          <p className="font-semibold text-slate-100">API base URL</p>
          <p className="font-mono text-xs text-slate-300">{apiBase}</p>
        </div>

        <div className="space-y-2 rounded-lg border border-slate-700 bg-[#101723] p-3 text-sm">
          <p className="font-semibold text-slate-100">Extension token</p>
          <p className="break-all font-mono text-xs text-slate-300">
            {token ?? "Generate a token to connect your extension."}
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Button variant="outline" onClick={generateExtensionToken} disabled={loading}>
            Generate Token
          </Button>
          <Button variant="outline" onClick={copyToken} disabled={!token}>
            Copy Token
          </Button>
        </div>
      </section>
    </div>
  );
}
