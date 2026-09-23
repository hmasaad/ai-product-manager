"use client";

import { useEffect, useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { fetchStatus } from "@/lib/storage";

export default function SettingsPage() {
  const [configured, setConfigured] = useState<boolean | null>(null);

  useEffect(() => {
    void fetchStatus().then((status) => setConfigured(status.configured));
  }, []);

  return (
    <div className="min-h-screen">
      <AppHeader />
      <main className="mx-auto max-w-3xl px-6 py-10">
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-copper">Studio</p>
        <h1 className="mt-2 font-serif text-4xl text-navy">Settings</h1>
        <p className="mt-4 text-ink-soft">
          The planner runs without a key and stays inside the words you gave it. A key lets Gemini or
          OpenAI edit that draft. Keys stay in <code className="font-mono text-sm">.env.local</code>.
        </p>
        <div className="mt-8 rounded-2xl border border-rule bg-white/70 p-5">
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-copper">Model status</p>
          <p className="mt-2 font-serif text-2xl">
            {configured === null ? "Checking…" : configured ? "Configured" : "Not configured"}
          </p>
          <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm">
            <li>
              Copy <code className="font-mono">.env.example</code> to <code className="font-mono">.env.local</code>.
            </li>
            <li>
              Set <code className="font-mono">GEMINI_API_KEY</code> from{" "}
              <a className="text-blueprint underline" href="https://aistudio.google.com/apikey">
                Google AI Studio
              </a>
              .
            </li>
            <li>
              Optional: <code className="font-mono">OPENAI_API_KEY</code> when Gemini is unset.
            </li>
            <li>
              Restart <code className="font-mono">npm run dev</code>.
            </li>
          </ol>
        </div>
      </main>
    </div>
  );
}
