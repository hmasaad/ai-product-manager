"use client";

import { isStepCurrent, isStepDone } from "@/lib/client";
import { PIPELINE } from "@/lib/roster";
import type { StepId } from "@/lib/types";

function Source({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="rounded-2xl border border-rule bg-white/80 px-3 py-3">
      <p className="font-serif text-lg leading-tight text-navy">{title}</p>
      <p className="mt-1 text-xs text-ink-soft">{detail}</p>
    </div>
  );
}

export function Workflow({ current, running }: { current: StepId | null; running: boolean }) {
  return (
    <div className="rounded-2xl border border-rule bg-white/60 p-4">
      <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-copper">Core workflow</p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <Source title="Product input" detail="Idea, problem, or request" />
        <Source title="Existing product" detail="Docs or analytics" />
      </div>
      <div className="mx-auto my-2 h-4 w-px bg-rule" />
      <ol className="space-y-1.5">
        {PIPELINE.map((step) => {
          const active = isStepCurrent(step.id, current, running);
          const done = isStepDone(step.id, current, running);
          return (
            <li
              key={step.id}
              className={`rounded-xl border px-3 py-2 text-sm ${
                active
                  ? "border-copper bg-copper text-paper"
                  : done
                    ? "border-sage/30 bg-sage/10 text-sage"
                    : "border-rule bg-white/70 text-ink"
              }`}
            >
              <span className="font-medium">{step.label}</span>
            </li>
          );
        })}
      </ol>
      <div className="mx-auto my-2 h-4 w-px bg-rule" />
      <div className="grid grid-cols-2 gap-2">
        <Source title="AI Architect" detail="System design from the PRD" />
        <Source title="AI Developer" detail="Stories, acceptance, tasks" />
      </div>
    </div>
  );
}
