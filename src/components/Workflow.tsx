"use client";

import { isStepCurrent } from "@/lib/client";
import { CONNECTED_ASCII, ORCHESTRATE_ASCII, SPECIALIST_NAME, STEP_TO_AGENT } from "@/lib/orchestrate";
import { PHASE3_ASCII, REEVAL_CYCLE_ASCII } from "@/lib/loop";
import type { SpecialistId, StepId } from "@/lib/types";

function Source({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="rounded-2xl border border-rule bg-white/80 px-3 py-3">
      <p className="font-serif text-lg leading-tight text-navy">{title}</p>
      <p className="mt-1 text-xs text-ink-soft">{detail}</p>
    </div>
  );
}

const TREE: SpecialistId[][] = [
  ["research", "requirements", "analytics"],
  ["market", "risk", "experiment"],
  ["decision"],
];

export function Workflow({ current, running }: { current: StepId | null; running: boolean }) {
  const active = current ? STEP_TO_AGENT[current] : null;
  return (
    <div className="rounded-2xl border border-rule bg-white/60 p-4">
      <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-copper">Orchestrator</p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <Source title="Product input" detail="Idea, problem, or request" />
        <Source title="Existing product" detail="Docs or analytics" />
      </div>
      <pre className="mt-3 overflow-x-auto rounded-2xl border border-rule bg-white/80 p-3 font-mono text-[11px] leading-5">
        {PHASE3_ASCII}
      </pre>
      <pre className="mt-3 overflow-x-auto rounded-2xl border border-rule bg-white/80 p-3 font-mono text-[11px] leading-5">
        {CONNECTED_ASCII}
      </pre>
      <pre className="mt-3 overflow-x-auto rounded-2xl border border-rule bg-white/80 p-3 font-mono text-[11px] leading-5">
        {REEVAL_CYCLE_ASCII}
      </pre>
      <pre className="mt-3 overflow-x-auto rounded-2xl border border-rule bg-white/50 p-3 font-mono text-[11px] leading-5 text-ink-soft">
        {ORCHESTRATE_ASCII}
      </pre>
      <div className="mt-3 space-y-2">
        {TREE.map((row) => (
          <ol key={row.join("-")} className={`grid gap-2 ${row.length === 1 ? "grid-cols-1" : "grid-cols-3"}`}>
            {row.map((id) => {
              const on = running && active === id;
              return (
                <li
                  key={id}
                  className={`rounded-xl border px-3 py-2 text-sm ${
                    on ? "border-copper bg-copper text-paper" : "border-rule bg-white/70 text-ink"
                  }`}
                >
                  <span className="font-medium">{SPECIALIST_NAME[id]}</span>
                </li>
              );
            })}
          </ol>
        ))}
      </div>
      <div className="mx-auto my-2 h-4 w-px bg-rule" />
      <div className="grid grid-cols-2 gap-2">
        <Source title="AI Architect" detail="System design from the PRD" />
        <Source title="AI Developer" detail="Stories, acceptance, tasks" />
      </div>
    </div>
  );
}
