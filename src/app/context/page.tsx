"use client";

import { useEffect, useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { MEMORY_KINDS } from "@/lib/memory";
import { fetchMemory, saveMemoryRemote } from "@/lib/storage";
import type { ProductMemory } from "@/lib/types";

export default function ContextPage() {
  const [memory, setMemory] = useState<ProductMemory | null>(null);
  const [feedback, setFeedback] = useState("");
  const [metrics, setMetrics] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void fetchMemory().then(setMemory);
  }, []);

  async function remember() {
    setSaving(true);
    setError(null);
    try {
      const next = await saveMemoryRemote({ feedback, metrics });
      setMemory(next);
      setFeedback("");
      setMetrics("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update product context.");
    } finally {
      setSaving(false);
    }
  }

  async function clear() {
    setSaving(true);
    setError(null);
    try {
      setMemory(await saveMemoryRemote({ clear: true }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not clear product context.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen">
      <AppHeader />
      <main className="mx-auto max-w-3xl px-6 py-10">
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-copper">Product context</p>
        <h1 className="mt-2 font-serif text-4xl text-navy">Memory</h1>
        <p className="mt-4 text-ink-soft">
          Previous PRDs, user feedback, and product metrics stay here. The next plan reads this memory, so a
          request that repeats a feature or crosses a decision is kept out of the new scope.
        </p>
        <p className="mt-3 text-sm text-ink-soft">
          {memory
            ? memory.items.length > 0
              ? `${memory.items.length} items remembered${memory.product ? ` · ${memory.product}` : ""}.`
              : "Nothing remembered yet. Build a plan, or add feedback and metrics."
            : "Opening memory…"}
        </p>

        <div className="mt-8 grid gap-4">
          <label className="block">
            <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-ink-soft">User feedback</span>
            <textarea
              value={feedback}
              onChange={(event) => setFeedback(event.target.value)}
              rows={4}
              placeholder="One note per line. What people said after the last release."
              className="mt-2 w-full rounded-2xl border border-rule bg-white/80 px-4 py-3 text-sm leading-6 outline-none ring-navy focus:ring-2"
            />
          </label>
          <label className="block">
            <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-ink-soft">Product metrics</span>
            <textarea
              value={metrics}
              onChange={(event) => setMetrics(event.target.value)}
              rows={4}
              placeholder="One metric per line. Counts and rates you already measured."
              className="mt-2 w-full rounded-2xl border border-rule bg-white/80 px-4 py-3 text-sm leading-6 outline-none ring-navy focus:ring-2"
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={saving || (!feedback.trim() && !metrics.trim())}
              onClick={() => void remember()}
              className="rounded-full bg-navy px-5 py-2.5 text-sm text-paper disabled:opacity-50"
            >
              {saving ? "Saving…" : "Remember"}
            </button>
            <button
              type="button"
              disabled={saving || !memory?.items.length}
              onClick={() => void clear()}
              className="rounded-full border border-rule bg-white px-5 py-2.5 text-sm disabled:opacity-50"
            >
              Clear memory
            </button>
          </div>
          {error && <p className="text-sm text-stamp">{error}</p>}
        </div>

        <div className="mt-10 space-y-8">
          {MEMORY_KINDS.map((group) => {
            const items = memory?.items.filter((item) => item.kind === group.kind) ?? [];
            return (
              <section key={group.kind}>
                <h2 className="font-serif text-2xl text-navy">{group.label}</h2>
                {items.length === 0 ? (
                  <p className="mt-2 text-sm text-ink-soft">None recorded.</p>
                ) : (
                  <ul className="mt-3 space-y-2">
                    {items.map((item) => (
                      <li key={item.id} className="rounded-2xl border border-rule bg-white/70 px-4 py-3 text-sm leading-6">
                        <p>{item.text}</p>
                        <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.12em] text-ink-soft">
                          {item.source} · {item.evidence}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            );
          })}
        </div>
      </main>
    </div>
  );
}
