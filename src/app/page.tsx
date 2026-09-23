"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import { Workflow } from "@/components/Workflow";
import { describeStep, readSse } from "@/lib/client";
import {
  BILLING_BRIEF,
  BILLING_EXISTING,
  CLINIC_BRIEF,
  FARMER_BRIEF,
  FIELD_MANAGEMENT_BRIEF,
  HARBOR_BRIEF,
  ROADMAP_BRIEF,
} from "@/lib/samples";
import { fetchStatus, savePlan } from "@/lib/storage";
import type { AgentStepEvent, ProductPlan, StepId } from "@/lib/types";

export default function HomePage() {
  const router = useRouter();
  const [brief, setBrief] = useState("");
  const [existing, setExisting] = useState("");
  const [constraints, setConstraints] = useState("");
  const [running, setRunning] = useState(false);
  const [current, setCurrent] = useState<StepId | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [configured, setConfigured] = useState<boolean | null>(null);

  useEffect(() => {
    void fetchStatus().then((status) => setConfigured(status.configured));
  }, []);

  async function onFile(file: File) {
    setError(null);
    const text = await file.text();
    setBrief(text);
  }

  async function plan() {
    setError(null);
    setRunning(true);
    setCurrent("research");
    setMessage("Product Discovery — users, problems, goals, and the proposed MVP.");
    try {
      const response = await fetch("/api/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brief, existing, constraints }),
      });
      if (!response.ok && response.headers.get("content-type")?.includes("application/json")) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error || "Planning failed.");
      }
      await readSse(response, (event, data) => {
        if (event === "step") {
          const step = data as AgentStepEvent;
          setCurrent(step.id);
          setMessage(describeStep(step));
        }
        if (event === "plan") {
          savePlan(data as ProductPlan);
          router.push("/plan");
        }
        if (event === "error") {
          const payload = data as { message?: string };
          setError(payload.message || "Planning failed.");
        }
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Planning failed.");
    } finally {
      setRunning(false);
    }
  }

  const canRun = Boolean(brief.trim() || existing.trim());

  return (
    <div className="min-h-screen">
      <AppHeader />
      <main className="mx-auto grid max-w-6xl gap-10 px-6 py-10 lg:grid-cols-[minmax(0,1.15fr)_minmax(18rem,0.85fr)]">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-copper">From idea to engineering handoff</p>
          <h1 className="mt-2 font-serif text-4xl tracking-tight text-navy">
            Turn a problem into a plan a team can build.
          </h1>
          <p className="mt-4 max-w-xl text-ink-soft">
            Discovery names the users, the problem, the goals, the assumptions, the constraints, the
            competitors, the metrics, and an MVP. The PRD then writes the overview, stories, flows,
            acceptance, edge cases, and future scope. A one-line build request stays marked as a proposal.
          </p>

          <label className="mt-8 block">
            <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-ink-soft">
              Product input
            </span>
            <textarea
              value={brief}
              onChange={(event) => setBrief(event.target.value)}
              rows={10}
              placeholder="An idea, a business problem, or a request. A full PRD works too."
              className="mt-2 w-full rounded-2xl border border-rule bg-white/80 px-4 py-3 text-sm leading-6 outline-none ring-navy focus:ring-2"
            />
          </label>

          <label className="mt-4 block">
            <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-ink-soft">
              Existing product
            </span>
            <textarea
              value={existing}
              onChange={(event) => setExisting(event.target.value)}
              rows={6}
              placeholder="Docs, analytics, support themes. Leave empty for a new idea."
              className="mt-2 w-full rounded-2xl border border-rule bg-white/80 px-4 py-3 text-sm leading-6 outline-none ring-navy focus:ring-2"
            />
          </label>

          <label className="mt-4 block">
            <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-ink-soft">
              Constraints
            </span>
            <textarea
              value={constraints}
              onChange={(event) => setConstraints(event.target.value)}
              rows={3}
              placeholder="Team, platforms, systems you will not replace."
              className="mt-2 w-full rounded-2xl border border-rule bg-white/80 px-4 py-3 text-sm leading-6 outline-none ring-navy focus:ring-2"
            />
          </label>

          <div className="mt-3 flex flex-wrap gap-2">
            <label className="cursor-pointer rounded-full border border-rule bg-white px-3 py-1.5 text-sm text-ink-soft hover:bg-paper-2">
              Upload notes
              <input
                type="file"
                accept=".md,.txt,.markdown"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void onFile(file);
                }}
              />
            </label>
            <button
              type="button"
              className="rounded-full border border-rule bg-white px-3 py-1.5 text-sm text-ink-soft hover:bg-paper-2"
              onClick={() => {
                setBrief(HARBOR_BRIEF);
                setExisting("");
                setConstraints("");
              }}
            >
              HarborLine PRD
            </button>
            <button
              type="button"
              className="rounded-full border border-rule bg-white px-3 py-1.5 text-sm text-ink-soft hover:bg-paper-2"
              onClick={() => {
                setBrief(FARMER_BRIEF);
                setExisting("");
                setConstraints("");
              }}
            >
              Farmer field log
            </button>
            <button
              type="button"
              className="rounded-full border border-rule bg-white px-3 py-1.5 text-sm text-ink-soft hover:bg-paper-2"
              onClick={() => {
                setBrief(FIELD_MANAGEMENT_BRIEF);
                setExisting("");
                setConstraints("");
              }}
            >
              Field management
            </button>
            <button
              type="button"
              className="rounded-full border border-rule bg-white px-3 py-1.5 text-sm text-ink-soft hover:bg-paper-2"
              onClick={() => {
                setBrief(ROADMAP_BRIEF);
                setExisting("");
                setConstraints("");
              }}
            >
              8-week roadmap
            </button>
            <button
              type="button"
              className="rounded-full border border-rule bg-white px-3 py-1.5 text-sm text-ink-soft hover:bg-paper-2"
              onClick={() => {
                setBrief(CLINIC_BRIEF);
                setExisting("");
                setConstraints("");
              }}
            >
              Clinic phone rush
            </button>
            <button
              type="button"
              className="rounded-full border border-rule bg-white px-3 py-1.5 text-sm text-ink-soft hover:bg-paper-2"
              onClick={() => {
                setBrief(BILLING_BRIEF);
                setExisting(BILLING_EXISTING);
                setConstraints("");
              }}
            >
              Billing analytics
            </button>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled={!canRun || running}
              onClick={() => void plan()}
              className="rounded-full bg-navy px-5 py-2.5 text-sm text-paper disabled:opacity-50"
            >
              {running ? "Planning…" : "Build the plan"}
            </button>
            <p className="text-sm text-ink-soft">
              {configured === null
                ? "Checking the model…"
                : configured
                  ? "A model key is set. It may edit the draft, and it cannot drop stated scope."
                  : "No model key. Stated scope stays put. A one-line build request becomes a proposed MVP."}
            </p>
          </div>
          {error && <p className="mt-4 text-sm text-stamp">{error}</p>}
          {message && running && (
            <p className="mt-4 text-sm text-ink-soft" aria-live="polite">
              {message}
            </p>
          )}
        </div>
        <Workflow current={current} running={running} />
      </main>
    </div>
  );
}
