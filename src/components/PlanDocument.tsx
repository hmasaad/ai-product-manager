"use client";

import { useMemo, useState } from "react";
import { APPROACH_ASCII, APPROACH_LABEL, APPROACH_NOTE } from "@/lib/approach";
import { planMarkdown } from "@/lib/handoff";
import { prdMarkdown } from "@/lib/prd";
import { AMBIGUITY_NOTE } from "@/lib/ambiguity";
import { ASSUMPTION_NOTE, STATUS_LABEL } from "@/lib/assumption";
import { CONFLICT_NOTE } from "@/lib/conflict";
import { SCORE_NOTE } from "@/lib/prioritize";
import { CONFIDENCE_NOTE } from "@/lib/recommend";
import { IMPACT_NOTE } from "@/lib/impact";
import { RISK_LABEL, RISK_NOTE } from "@/lib/risks";
import { EXPERIMENT_ASCII, EXPERIMENT_CHOICES, EXPERIMENT_NOTE, experimentVerdictLabel } from "@/lib/experiment";
import { ANALYTICS_KIND_LABEL, ANALYTICS_NOTE } from "@/lib/analytics";
import {
  APPROVAL_ASCII,
  APPROVAL_LABEL,
  APPROVAL_NOTE,
  AUTHORIZATION_LABEL,
  applyGateDecision,
} from "@/lib/approval";
import { DECIDE_NOTE, DECIDE_QUESTION, applyDecisionChoice } from "@/lib/decide";
import { LEDGER_NOTE, STALE_ASSUMPTIONS, VERSION_ASCII, WHY_ARCHITECTURE, askLedger, decisionLabel, ledgerObject, structureEntry } from "@/lib/ledger";
import { VERSION_CURRENT, VERSION_HISTORY, VERSIONING_NOTE, buildVersioning } from "@/lib/versioning";
import { CHANGED_ASCII, CHANGED_NOTE, CHANGED_STATUS, DECISION_STATES, PRIORITY_BANDS, PRIORITY_LABEL, REEVAL_CHANNEL_LABEL, REEVAL_LABEL, REEVAL_NOTE, REEVAL_QUESTION, REEVAL_WARNING, SCORE_ASCII, SCORE_EQUATION, SCORE_NOTE as REEVAL_SCORE_NOTE, STATE_ASCII, STATE_LABEL, TRIGGER_KINDS, TRIGGER_LABEL, applyReevaluationChoice } from "@/lib/reevaluate";
import { GRAPH_ASSUMPTIONS, GRAPH_BIGGEST, GRAPH_CAUSED, GRAPH_FEEDBACK, GRAPH_NOTE, GRAPH_WEAK, LINEAGE_ASCII, askGraph, graphPaths } from "@/lib/graph";
import { OPPORTUNITY_NOTE } from "@/lib/score";
import { PORTFOLIO_BET_LABEL, PORTFOLIO_LABEL, PORTFOLIO_NOTE, PORTFOLIO_QUESTION, applyPortfolioChoice } from "@/lib/portfolio";
import { MONITOR_NOTE } from "@/lib/monitor";
import { LOOP_NOTE, LOOP_QUESTION, PHASE3_NAME, PHASE3_NOTE, REEVAL_CYCLE_LABEL, REEVAL_CYCLE_NOTE, applyLoopAdvance, buildProductLoop } from "@/lib/loop";
import { KIND_LABEL, TRACE_NOTE, whyThis } from "@/lib/trace";
import { CONNECTED_HOP_NAME, CONNECTED_NOTE, ORCHESTRATE_NOTE, buildOrchestration } from "@/lib/orchestrate";
import { saveMemoryRemote, savePlan } from "@/lib/storage";
import type { AmbiguitySeverity, Decision, DecisionStatus, Evidence, ImpactLevel, Priority, ProductPlan, ReevaluationVerdict, TaggedLine } from "@/lib/types";

const SECTIONS = [
  ["approach", "Approach"],
  ["orchestrate", "Agents"],
  ["context", "Context"],
  ["discovery", "Discovery"],
  ["ambiguity", "Ambiguity"],
  ["assumption", "Decisions"],
  ["prd", "PRD"],
  ["research", "Research"],
  ["problem", "Problem"],
  ["personas", "Personas"],
  ["requirements", "Requirements"],
  ["conflict", "Conflicts"],
  ["decompose", "Decompose"],
  ["features", "Features"],
  ["stories", "Stories"],
  ["trace", "Trace"],
  ["impact", "Impact"],
  ["risk", "Risks"],
  ["priority", "Priority"],
  ["recommend", "Recommend"],
  ["score", "Score"],
  ["experiment", "Experiments"],
  ["analytics", "Analytics"],
  ["roadmap", "Roadmap"],
  ["approval", "Approvals"],
  ["decide", "Decide"],
  ["ledger", "Ledger"],
  ["reevaluate", "Revisit"],
  ["graph", "Graph"],
  ["portfolio", "Portfolio"],
  ["monitor", "Monitor"],
  ["loop", "Loop"],
  ["handoff", "Handoff"],
] as const;

function Pill({
  children,
  tone,
}: {
  children: string;
  tone: "sage" | "copper" | "stamp" | "navy" | "ink";
}) {
  const tones = {
    sage: "bg-sage/10 text-sage",
    copper: "bg-copper/10 text-copper",
    stamp: "bg-stamp/10 text-stamp",
    navy: "bg-navy text-paper",
    ink: "bg-paper-2 text-ink-soft",
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-[11px] uppercase tracking-[0.12em] ${tones[tone]}`}>
      {children}
    </span>
  );
}

function evidenceTone(evidence: Evidence): "sage" | "copper" | "stamp" {
  if (evidence === "stated") return "sage";
  if (evidence === "inferred") return "copper";
  return "stamp";
}

function priorityTone(priority: Priority): "navy" | "copper" | "ink" {
  if (priority === "must") return "navy";
  if (priority === "should") return "copper";
  return "ink";
}

function statusTone(status: DecisionStatus): "sage" | "copper" | "stamp" | "navy" | "ink" {
  if (status === "confirmed") return "sage";
  if (status === "assumption") return "copper";
  if (status === "inferred") return "navy";
  if (status === "needsValidation") return "stamp";
  return "ink";
}

function severityTone(severity: AmbiguitySeverity): "stamp" | "copper" | "ink" {
  if (severity === "critical") return "stamp";
  if (severity === "important") return "copper";
  return "ink";
}

function impactTone(level: ImpactLevel): "navy" | "copper" | "ink" {
  if (level === "high") return "navy";
  if (level === "medium") return "copper";
  return "ink";
}

function decisionTone(decision: Decision): "navy" | "copper" | "ink" {
  if (decision === "now") return "navy";
  if (decision === "next") return "copper";
  return "ink";
}

function download(filename: string, text: string) {
  const blob = new Blob([text], { type: "text/markdown" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

async function copy(text: string) {
  await navigator.clipboard.writeText(text);
}

export function PlanDocument({ plan }: { plan: ProductPlan }) {
  const [whyQuery, setWhyQuery] = useState("");
  const [ledgerQuery, setLedgerQuery] = useState("");
  const [graphQuery, setGraphQuery] = useState("");
  const [live, setLive] = useState(plan);
  const featureName = (id: string) => plan.features.find((feature) => feature.id === id)?.name ?? id;
  const whyChains = useMemo(() => whyThis(plan, whyQuery), [plan, whyQuery]);
  const ledgerAnswer = useMemo(
    () => askLedger({ entries: live.decisionLedger?.entries ?? [], query: ledgerQuery, corpus: plan.sourceText }),
    [live.decisionLedger, ledgerQuery, plan.sourceText],
  );
  const graphAnswer = useMemo(
    () => askGraph(live, graphQuery, { corpus: plan.sourceText }),
    [live, graphQuery, plan.sourceText],
  );
  const paths = useMemo(() => graphPaths(live), [live]);

  function persist(next: ProductPlan) {
    const refreshed = {
      ...next,
      productLoop: buildProductLoop(next),
      orchestration: buildOrchestration(next),
      decisionLedger: next.decisionLedger
        ? { ...next.decisionLedger, versioning: buildVersioning(next.decisionLedger.entries ?? []) }
        : next.decisionLedger,
    };
    setLive(refreshed);
    savePlan(refreshed);
    return refreshed;
  }

  function decide(gateId: string, status: "approved" | "rejected") {
    const next = persist(applyGateDecision(live, gateId, status));
    const gate = next.approvals.gates.find((item) => item.id === gateId);
    if (gate) {
      void saveMemoryRemote({
        feedback: `${status === "approved" ? "Approved" : "Sent back"}: ${APPROVAL_LABEL[gate.kind]} — ${gate.proposal}`,
      });
    }
  }

  function choosePortfolio(optionId: string) {
    const next = persist(applyPortfolioChoice(live, optionId));
    const option = next.portfolio.options.find((item) => item.id === optionId);
    if (option) {
      void saveMemoryRemote({
        feedback: `Portfolio record: ${next.portfolio.question} Chose: ${option.title}`,
      });
    }
  }

  function choose(optionId: string) {
    const next = persist(applyDecisionChoice(live, optionId));
    const option = next.decisionEngine.options.find((item) => item.id === optionId);
    if (option) {
      void saveMemoryRemote({
        feedback: `Decision record: ${next.decisionEngine.question} Chose: ${option.title}`,
        ledger: next.decisionLedger?.entries,
      });
    }
  }

  function chooseReevaluation(caseId: string, verdict: ReevaluationVerdict) {
    const next = persist(applyReevaluationChoice(live, caseId, verdict));
    const item = next.decisionReevaluation.cases.find((row) => row.id === caseId);
    if (item?.updatedDecision) {
      void saveMemoryRemote({
        feedback: `Re-evaluation: ${item.updatedDecision} ${item.assumption}`,
      });
    }
  }

  function advanceLoop() {
    const next = persist(applyLoopAdvance(live));
    const signal = next.monitoring.signals.find((item) => item.status === "approved");
    if (signal) {
      void saveMemoryRemote({
        feedback: `Loop advanced: Investigation complete for ${signal.feature}. ${signal.change}`,
      });
    }
  }

  return (
    <div className="lg:grid lg:grid-cols-[12rem_minmax(0,1fr)] lg:gap-10">
      <nav className="no-print mb-8 flex gap-2 overflow-x-auto lg:sticky lg:top-6 lg:block lg:h-fit lg:space-y-1">
        {SECTIONS.map(([id, label]) => (
          <a
            key={id}
            href={`#${id}`}
            className="block whitespace-nowrap rounded-full px-3 py-1.5 text-sm text-ink-soft hover:bg-paper-2 hover:text-ink"
          >
            {label}
          </a>
        ))}
      </nav>

      <article className="print-sheet max-w-3xl">
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-copper">
          {plan.maturity === "problem" ? "Problem brief — build is gated" : "Solution brief"}
          {" · "}
          {plan.mode === "model" ? "Model edit" : "Grounded in the source"}
        </p>
        <h1 className="mt-2 font-serif text-4xl tracking-tight text-navy">{plan.title}</h1>
        <p className="mt-3 text-sm text-ink-soft">
          {[
            [plan.requirements.length, "requirement"],
            [plan.features.length, "feature"],
            [plan.stories.length, "story"],
            [plan.milestones.length, "milestone"],
          ]
            .map(([count, word]) => `${count} ${word}${count === 1 ? "" : "s"}`)
            .join(" · ")}
        </p>
        {plan.note && (
          <p className="mt-4 rounded-2xl border border-copper/30 bg-copper/5 px-4 py-3 text-sm text-copper">
            {plan.note}
          </p>
        )}
        <div className="no-print mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            className="rounded-full bg-navy px-4 py-2 text-sm text-paper"
            onClick={() => download(`${plan.title.replace(/\s+/g, "-").toLowerCase()}.md`, planMarkdown(plan))}
          >
            Download plan
          </button>
          <button
            type="button"
            className="rounded-full border border-rule bg-white px-4 py-2 text-sm"
            onClick={() => void copy(plan.handoff.architect)}
          >
            Copy architect brief
          </button>
          <button
            type="button"
            className="rounded-full border border-rule bg-white px-4 py-2 text-sm"
            onClick={() => void copy(plan.handoff.developer)}
          >
            Copy developer brief
          </button>
          <button
            type="button"
            className="rounded-full border border-rule bg-white px-4 py-2 text-sm"
            onClick={() => void copy(prdMarkdown(plan))}
          >
            Copy PRD
          </button>
        </div>

        <section id="approach" className="mt-12 scroll-mt-6">
          <h2 className="font-serif text-2xl text-navy">Approach to suggest</h2>
          <p className="mt-3 text-sm leading-6 text-ink-soft">{plan.approach?.note ?? APPROACH_NOTE}</p>
          <pre className="mt-4 overflow-x-auto rounded-2xl border border-rule bg-white/80 p-4 font-mono text-sm leading-6">
            {plan.approach?.ascii ?? APPROACH_ASCII}
          </pre>
          <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-soft">
            {APPROACH_LABEL[plan.approach?.posture ?? "validate"]}
          </p>
          <h3 className="mt-2 font-serif text-xl text-navy">{plan.approach?.headline}</h3>
          <p className="mt-3 text-sm leading-6">{plan.approach?.pitch}</p>
          <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-soft">First slice</p>
          <p className="mt-1 text-sm leading-6">{plan.approach?.firstSlice}</p>
          {(plan.approach?.steps ?? []).length > 0 && (
            <ol className="mt-4 space-y-3">
              {plan.approach.steps.map((item, index) => (
                <li key={`${item.title}-${index}`} className="rounded-2xl border border-rule bg-white/70 p-4">
                  <h4 className="font-serif text-lg text-navy">{item.title}</h4>
                  <p className="mt-1 text-sm leading-6">{item.detail}</p>
                </li>
              ))}
            </ol>
          )}
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <article className="rounded-2xl border border-rule bg-white/70 p-4">
              <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-soft">Confirm with the client</p>
              <ul className="mt-3 list-disc space-y-1 pl-5 text-sm leading-6">
                {(plan.approach?.questions ?? []).length ? (
                  plan.approach.questions.map((line, index) => <li key={`${line}-${index}`}>{line}</li>)
                ) : (
                  <li>None named.</li>
                )}
              </ul>
            </article>
            <article className="rounded-2xl border border-rule bg-white/70 p-4">
              <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-soft">Hold for later</p>
              <ul className="mt-3 list-disc space-y-1 pl-5 text-sm leading-6">
                {(plan.approach?.later ?? []).length ? (
                  plan.approach.later.map((line, index) => <li key={`${line}-${index}`}>{line}</li>)
                ) : (
                  <li>None named.</li>
                )}
              </ul>
            </article>
          </div>
          {(plan.approach?.alternatives ?? []).length > 0 && (
            <div className="mt-4">
              <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-soft">Other approaches</p>
              <ol className="mt-3 space-y-3">
                {plan.approach.alternatives.map((item, index) => (
                  <li key={`${item.title}-${index}`} className="rounded-2xl border border-rule bg-white/70 p-4">
                    <h4 className="font-serif text-lg text-navy">{item.title}</h4>
                    <p className="mt-1 text-sm leading-6">{item.reason}</p>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </section>

        <section id="orchestrate" className="mt-12 scroll-mt-6">
          <h2 className="font-serif text-2xl text-navy">Specialized Agents</h2>
          <p className="mt-3 text-sm leading-6 text-ink-soft">{CONNECTED_NOTE}</p>
          <p className="mt-2 text-sm leading-6 text-ink-soft">{ORCHESTRATE_NOTE}</p>
          <pre className="mt-4 overflow-x-auto rounded-2xl border border-rule bg-white/80 p-4 font-mono text-sm leading-6">
            {live.orchestration?.connectedAscii}
          </pre>
          <p className="mt-4 font-serif text-xl text-navy">
            Now: {CONNECTED_HOP_NAME[live.orchestration?.currentHop ?? "discovery"]}
          </p>
          <ol className="mt-4 grid gap-3 md:grid-cols-2">
            {(live.orchestration?.hops ?? []).map((hop) => (
              <li
                key={hop.id}
                className={`rounded-2xl border p-4 ${
                  hop.id === live.orchestration?.currentHop ? "border-copper bg-copper/10" : "border-rule bg-white/70"
                }`}
              >
                <div className="flex flex-wrap items-baseline justify-between gap-3">
                  <h3 className="font-serif text-xl text-navy">{hop.name}</h3>
                  <Pill tone={hop.id === live.orchestration?.currentHop ? "copper" : "ink"}>{hop.evidence}</Pill>
                </div>
                <p className="mt-2 text-sm leading-6">{hop.finding}</p>
              </li>
            ))}
          </ol>
          <pre className="mt-4 overflow-x-auto rounded-2xl border border-rule bg-white/50 p-4 font-mono text-sm leading-6 text-ink-soft">
            {live.orchestration?.ascii}
          </pre>
          <p className="mt-4 font-serif text-xl text-navy">{live.orchestration?.decision}</p>
          <ol className="mt-4 grid gap-4 md:grid-cols-2">
            {(live.orchestration?.agents ?? []).map((agent) => (
              <li key={agent.id} className="rounded-2xl border border-rule bg-white/70 p-4">
                <h3 className="font-serif text-xl text-navy">{agent.name}</h3>
                <p className="mt-1 text-sm text-ink-soft">{agent.role}</p>
                <ul className="mt-3 list-disc space-y-1 pl-5 text-sm leading-6">
                  {agent.findings.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
                <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-soft">Handoff</p>
                <p className="mt-1 text-sm leading-6">{agent.output}</p>
              </li>
            ))}
          </ol>
        </section>

        <section id="context" className="mt-12 scroll-mt-6">
          <h2 className="font-serif text-2xl text-navy">Product Context</h2>
          <p className="mt-3 text-sm leading-6 text-ink-soft">
            {plan.context && plan.context.recalled > 0
              ? `Loaded ${plan.context.recalled} remembered items${plan.context.product ? ` from ${plan.context.product}` : ""}.`
              : "No earlier PRD, feedback, or metric was loaded for this plan."}
          </p>
          {plan.context?.alreadyExists.length > 0 && (
            <div className="mt-4">
              <h3 className="font-medium">Already recorded</h3>
              <ul className="mt-2 list-disc space-y-2 pl-5 text-sm leading-6">
                {plan.context.alreadyExists.map((hit) => (
                  <li key={hit.memoryId}>{hit.text}</li>
                ))}
              </ul>
            </div>
          )}
          {plan.context?.conflicts.length > 0 && (
            <div className="mt-4">
              <h3 className="font-medium">Earlier decision kept</h3>
              <ul className="mt-2 list-disc space-y-2 pl-5 text-sm leading-6">
                {plan.context.conflicts.map((hit) => (
                  <li key={hit.memoryId}>{hit.text}</li>
                ))}
              </ul>
            </div>
          )}
        </section>

        <section id="discovery" className="mt-12 scroll-mt-6">
          <h2 className="font-serif text-2xl text-navy">Product Discovery</h2>
          <p className="mt-2 text-sm text-ink-soft">
            {plan.proposed
              ? "Proposed from the request. Each line says whether it was stated, inferred, or still unknown."
              : "Read from the source. Unknown lines are questions, not filled-in facts."}
          </p>
          <h3 className="mt-6 font-medium">Problem Statement</h3>
          <p className="mt-2 text-sm leading-6">{plan.discovery.problemStatement}</p>
          <h3 className="mt-6 font-medium">Target Users</h3>
          <ul className="mt-2 space-y-2">
            {plan.discovery.targetUsers.map((user) => (
              <li key={user.role} className="text-sm leading-6">
                <span className="font-medium">{user.role}</span> <Pill tone={evidenceTone(user.evidence)}>{user.evidence}</Pill>
                <span className="mt-1 block text-ink-soft">{user.why}</span>
              </li>
            ))}
          </ul>
          <Tagged title="User problems" lines={plan.discovery.userProblems} />
          <h3 className="mt-6 font-medium">User Needs</h3>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
            {plan.discovery.userNeeds.map((item) => (
              <li key={item.user + item.need}>
                {item.user}: {item.need}
              </li>
            ))}
          </ul>
          <Tagged title="Business Goals" lines={plan.discovery.businessGoals} />
          <Tagged title="Assumptions" lines={plan.discovery.assumptions} />
          <Tagged title="Constraints" lines={plan.discovery.constraints} />
          <h3 className="mt-6 font-medium">Competitors</h3>
          <ul className="mt-2 space-y-2">
            {plan.discovery.competitors.map((item) => (
              <li key={item.name} className="text-sm leading-6">
                <span className="font-medium">{item.name}</span> <Pill tone={evidenceTone(item.evidence)}>{item.evidence}</Pill>
                <span className="mt-1 block">{item.note}</span>
              </li>
            ))}
          </ul>
          <Tagged title="MVP Definition" lines={plan.discovery.mvpDefinition} />
          <Tagged title="Success Metrics" lines={plan.discovery.successMetrics} />
          {plan.discovery.questions.length > 0 && (
            <>
              <h3 className="mt-6 font-medium">Still asking</h3>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
                {plan.discovery.questions.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </>
          )}
        </section>

        <section id="ambiguity" className="mt-12 scroll-mt-6">
          <h2 className="font-serif text-2xl text-navy">Ambiguities detected</h2>
          <p className="mt-3 text-sm leading-6 text-ink-soft">{AMBIGUITY_NOTE}</p>
          {plan.ambiguities.length === 0 ? (
            <p className="mt-4 rounded-2xl border border-rule bg-white/70 p-4 text-sm leading-6">
              No ambiguity was left open in the source.
            </p>
          ) : (
            <ol className="mt-4 space-y-3">
              {plan.ambiguities.map((item, index) => (
                <li key={item.id} className="rounded-2xl border border-rule bg-white/70 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs text-ink-soft">{index + 1}</span>
                    <Pill tone={severityTone(item.severity)}>{item.severity}</Pill>
                    <span className="text-xs text-ink-soft">{item.action}</span>
                  </div>
                  <p className="mt-2 font-serif text-xl text-navy">{item.question}</p>
                  {item.assumption ? <p className="mt-2 text-sm leading-6 text-ink-soft">{item.assumption}</p> : null}
                </li>
              ))}
            </ol>
          )}
        </section>

        <section id="assumption" className="mt-12 scroll-mt-6">
          <h2 className="font-serif text-2xl text-navy">Assumption Tracking</h2>
          <p className="mt-3 text-sm leading-6 text-ink-soft">{ASSUMPTION_NOTE}</p>
          <pre className="mt-4 overflow-x-auto rounded-2xl border border-rule bg-white/80 p-4 font-mono text-sm leading-6">{`Decision
├── Confirmed
├── Assumption
├── Inferred
├── Unknown
└── Needs validation`}</pre>
          {(["confirmed", "assumption", "inferred", "unknown", "needsValidation"] as DecisionStatus[]).map((status) => {
            const rows = plan.decisions.filter((item) => item.status === status);
            if (!rows.length) return null;
            return (
              <div key={status} className="mt-6">
                <h3 className="font-medium">{STATUS_LABEL[status]}</h3>
                <ol className="mt-3 space-y-3">
                  {rows.map((item) => (
                    <li key={item.id} className="rounded-2xl border border-rule bg-white/70 p-4">
                      <Pill tone={statusTone(item.status)}>{STATUS_LABEL[item.status]}</Pill>
                      <p className="mt-2 font-serif text-xl text-navy">{item.decision}</p>
                      {item.validation ? (
                        <>
                          <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-soft">Validation</p>
                          <p className="mt-1 text-sm leading-6">{item.validation}</p>
                        </>
                      ) : null}
                    </li>
                  ))}
                </ol>
              </div>
            );
          })}
        </section>

        <section id="prd" className="mt-12 scroll-mt-6">
          <h2 className="font-serif text-2xl text-navy">PRD</h2>
          <h3 className="mt-6 font-medium">Product Overview</h3>
          <p className="mt-2 text-sm leading-6">{plan.prd.overview}</p>
          <h3 className="mt-6 font-medium">Problem Statement</h3>
          <p className="mt-2 text-sm leading-6">{plan.prd.problemStatement}</p>
          <Bullet title="Goals" lines={plan.prd.goals} />
          <Bullet title="Non-goals" lines={plan.prd.nonGoals} />
          <h3 className="mt-6 font-medium">Personas</h3>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
            {plan.prd.personas.map((persona) => (
              <li key={persona.role}>
                {persona.role}: {persona.why}
              </li>
            ))}
          </ul>
          <Bullet title="User Stories" lines={plan.prd.userStories.map((story) => `${story.id}. ${story.story}`)} />
          <h3 className="mt-6 font-medium">Functional Requirements</h3>
          <ul className="mt-2 space-y-2">
            {plan.prd.functionalRequirements.map((item) => (
              <li key={item.id} className="text-sm leading-6">
                <span className="font-mono text-xs text-ink-soft">{item.id}</span>{" "}
                <Pill tone={priorityTone(item.priority)}>{item.priority}</Pill> {item.statement}
                <span className="text-ink-soft"> — {item.persona}</span>
              </li>
            ))}
          </ul>
          <Tagged title="Non-functional Requirements" lines={plan.prd.nonFunctionalRequirements} />
          <h3 className="mt-6 font-medium">User Flows</h3>
          <div className="mt-2 space-y-3">
            {plan.prd.userFlows.map((flow) => (
              <div key={flow.name}>
                <p className="text-sm font-medium">{flow.name}</p>
                <ol className="mt-1 list-decimal space-y-1 pl-5 text-sm">
                  {flow.steps.map((step) => (
                    <li key={step}>{step}</li>
                  ))}
                </ol>
              </div>
            ))}
          </div>
          <h3 className="mt-6 font-medium">Acceptance Criteria</h3>
          <ul className="mt-2 space-y-2">
            {plan.prd.acceptanceCriteria.map((item) => (
              <li key={item.id} className="text-sm">
                <span className="font-mono text-xs text-ink-soft">{item.id}</span>
                <ul className="mt-1 list-disc pl-5">
                  {item.criteria.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
          <Tagged title="Edge Cases" lines={plan.prd.edgeCases} />
          <h3 className="mt-6 font-medium">Analytics Events</h3>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
            {plan.prd.analyticsEvents.map((item) => (
              <li key={item.name}>
                <span className="font-mono text-xs">{item.name}</span> — {item.when}
              </li>
            ))}
          </ul>
          <Tagged title="Dependencies" lines={plan.prd.dependencies} />
          <Bullet title="Risks" lines={plan.prd.risks} />
          <Bullet title="Open Questions" lines={plan.prd.openQuestions} />
          <Bullet title="MVP Scope" lines={plan.prd.mvpScope} />
          <Bullet title="Future Scope" lines={plan.prd.futureScope} />
        </section>

        <section id="research" className="mt-12 scroll-mt-6">
          <h2 className="font-serif text-2xl text-navy">Product Research</h2>
          <ul className="mt-4 space-y-4">
            {plan.research.map((item) => (
              <li key={item.topic + item.finding} className="rounded-2xl border border-rule bg-white/70 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-medium">{item.topic}</h3>
                  <Pill tone={evidenceTone(item.evidence)}>{item.evidence}</Pill>
                </div>
                <p className="mt-2 text-sm leading-6">{item.finding}</p>
                <p className="mt-2 text-sm text-ink-soft">{item.implication}</p>
              </li>
            ))}
          </ul>
        </section>

        <section id="problem" className="mt-12 scroll-mt-6">
          <h2 className="font-serif text-2xl text-navy">Problem Definition</h2>
          <p className="mt-4 text-lg leading-8">{plan.problem.statement}</p>
          <dl className="mt-6 grid gap-4 sm:grid-cols-2">
            {[
              ["Who", plan.problem.who],
              ["Today", plan.problem.currentWorkaround],
              ["If we do nothing", plan.problem.costOfInaction],
            ].map(([label, value]) => (
              <div key={label} className="rounded-2xl border border-rule bg-white/70 p-4">
                <dt className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-soft">{label}</dt>
                <dd className="mt-2 text-sm leading-6">{value}</dd>
              </div>
            ))}
          </dl>
          <h3 className="mt-6 font-medium">Success</h3>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
            {(plan.problem.success.length ? plan.problem.success : ["No success measure was stated."]).map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          {plan.problem.openQuestions.length > 0 && (
            <>
              <h3 className="mt-6 font-medium">Open questions</h3>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
                {plan.problem.openQuestions.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </>
          )}
        </section>

        <section id="personas" className="mt-12 scroll-mt-6">
          <h2 className="font-serif text-2xl text-navy">User Personas</h2>
          <div className="mt-4 grid gap-4">
            {plan.personas.map((persona) => (
              <article key={persona.role} className="rounded-2xl border border-rule bg-white/70 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-serif text-xl text-navy">{persona.role}</h3>
                  <Pill tone={evidenceTone(persona.evidence)}>{persona.evidence}</Pill>
                </div>
                <p className="mt-2 text-sm leading-6">{persona.context}</p>
                <p className="mt-3 text-sm">
                  <span className="text-ink-soft">Jobs. </span>
                  {persona.jobs.join(" · ")}
                </p>
                <p className="mt-2 text-sm">
                  <span className="text-ink-soft">Success. </span>
                  {persona.success}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section id="requirements" className="mt-12 scroll-mt-6">
          <h2 className="font-serif text-2xl text-navy">Requirements trace</h2>
          <ul className="mt-4 space-y-3">
            {plan.requirements.map((item) => (
              <li key={item.id} className="rounded-2xl border border-rule bg-white/70 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs text-ink-soft">{item.id}</span>
                  <Pill tone={priorityTone(item.priority)}>{item.priority}</Pill>
                  <Pill tone={evidenceTone(item.evidence)}>{item.evidence}</Pill>
                  <span className="text-xs text-ink-soft">{item.persona}</span>
                </div>
                <p className="mt-2 text-sm leading-6">{item.statement}</p>
                <p className="mt-1 text-sm text-ink-soft">{item.rationale}</p>
              </li>
            ))}
          </ul>
          {plan.constraints.length > 0 && (
            <>
              <h3 className="mt-6 font-medium">Constraints</h3>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
                {plan.constraints.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </>
          )}
          {plan.problem.nonGoals.length > 0 && (
            <>
              <h3 className="mt-6 font-medium">Non-goals</h3>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
                {plan.problem.nonGoals.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </>
          )}
        </section>

        <section id="conflict" className="mt-12 scroll-mt-6">
          <h2 className="font-serif text-2xl text-navy">Requirement Conflicts</h2>
          <p className="mt-3 text-sm leading-6 text-ink-soft">{CONFLICT_NOTE}</p>
          {plan.conflicts.length === 0 ? (
            <p className="mt-4 rounded-2xl border border-rule bg-white/70 p-4 text-sm leading-6">
              No requirement conflict was found.
            </p>
          ) : (
            <ol className="mt-4 space-y-4">
              {plan.conflicts.map((item) => (
                <li key={item.id} className="rounded-2xl border border-stamp/30 bg-stamp/5 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Pill tone="stamp">Requirement Conflict</Pill>
                    <Pill tone={impactTone(item.impact)}>{`${item.impact} impact`}</Pill>
                    <span className="font-mono text-xs text-ink-soft">
                      {item.against === "architecture" ? "Architecture" : "Existing requirement"}
                    </span>
                  </div>
                  <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-soft">New</p>
                  <p className="mt-1 font-serif text-xl leading-7 text-navy">{item.newRequirement}</p>
                  <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-soft">
                    {item.against === "architecture" ? "Architecture" : "Existing"}
                  </p>
                  <p className="mt-1 font-serif text-xl leading-7 text-navy">{item.existingRequirement}</p>
                  <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-soft">Suggested resolution</p>
                  <p className="mt-1 text-sm leading-6">{item.resolution}</p>
                </li>
              ))}
            </ol>
          )}
        </section>

        <section id="decompose" className="mt-12 scroll-mt-6">
          <h2 className="font-serif text-2xl text-navy">Feature Decomposition</h2>
          <pre className="mt-4 overflow-x-auto rounded-2xl border border-rule bg-white/80 p-4 font-mono text-sm leading-6">
            {plan.decomposition.ascii}
          </pre>
          <div className="mt-4 space-y-4">
            {plan.decomposition.nodes.map((node) => (
              <article key={node.featureId} className="rounded-2xl border border-rule bg-white/70 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-medium">{node.name}</h3>
                  <Pill tone={priorityTone(node.scope)}>{node.scope}</Pill>
                </div>
                <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-soft">User story</p>
                <p className="mt-1 text-sm leading-6">{node.story}</p>
                <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-soft">Acceptance criteria</p>
                <ul className="mt-1 list-disc space-y-1 pl-5 text-sm">
                  {node.acceptance.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
                <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-soft">Engineering tasks</p>
                <ul className="mt-1 space-y-1 text-sm">
                  {node.tasks.map((task) => (
                    <li key={task.id}>
                      <span className="font-mono text-xs text-ink-soft">
                        {task.id} · {task.lane}
                      </span>{" "}
                      {task.title}
                    </li>
                  ))}
                </ul>
                <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-soft">Test cases</p>
                <ul className="mt-1 space-y-2 text-sm">
                  {node.tests.map((test) => (
                    <li key={test.id}>
                      <span className="font-mono text-xs text-ink-soft">{test.id}</span> {test.title}
                      <span className="mt-1 block text-ink-soft">Expected: {test.expected}</span>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </section>

        <section id="features" className="mt-12 scroll-mt-6">
          <h2 className="font-serif text-2xl text-navy">Feature Breakdown</h2>
          <ul className="mt-4 space-y-3">
            {plan.features.map((feature) => (
              <li key={feature.id} className="rounded-2xl border border-rule bg-white/70 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs text-ink-soft">{feature.id}</span>
                  <h3 className="font-medium">{feature.name}</h3>
                  <Pill tone={priorityTone(feature.scope)}>{feature.scope}</Pill>
                </div>
                <p className="mt-2 text-sm leading-6">{feature.outcome}</p>
                {feature.requirementIds.length > 0 && (
                  <p className="mt-2 font-mono text-xs text-ink-soft">{feature.requirementIds.join(" · ")}</p>
                )}
              </li>
            ))}
          </ul>
        </section>

        <section id="stories" className="mt-12 scroll-mt-6">
          <h2 className="font-serif text-2xl text-navy">User Stories / Tasks</h2>
          <div className="mt-4 space-y-4">
            {plan.stories.map((story) => (
              <article key={story.id} className="rounded-2xl border border-rule bg-white/70 p-4">
                <p className="font-mono text-xs text-ink-soft">
                  {story.id} · {story.featureId} · {featureName(story.featureId)}
                </p>
                <p className="mt-2 text-sm leading-6">{story.story}</p>
                <ul className="mt-3 list-disc space-y-1 pl-5 text-sm">
                  {story.acceptance.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
                <ul className="mt-3 space-y-1 text-sm">
                  {story.tasks.map((task) => (
                    <li key={task.id}>
                      <span className="font-mono text-xs text-ink-soft">
                        {task.id} · {task.lane}
                      </span>{" "}
                      {task.title}
                    </li>
                  ))}
                </ul>
                <ul className="mt-3 space-y-1 text-sm">
                  {story.tests.map((test) => (
                    <li key={test.id}>
                      <span className="font-mono text-xs text-ink-soft">{test.id}</span> {test.title}
                      <span className="text-ink-soft"> — {test.expected}</span>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </section>

        <section id="trace" className="mt-12 scroll-mt-6">
          <h2 className="font-serif text-2xl text-navy">Product → Engineering Traceability</h2>
          <p className="mt-3 text-sm leading-6 text-ink-soft">{TRACE_NOTE}</p>
          <pre className="mt-4 overflow-x-auto rounded-2xl border border-rule bg-white/80 p-4 font-mono text-sm leading-6">
            {plan.traceability.ascii}
          </pre>
          <label className="mt-6 block">
            <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-soft">Why this work</span>
            <input
              value={whyQuery}
              onChange={(event) => setWhyQuery(event.target.value)}
              placeholder="Why are we implementing this API?"
              className="mt-2 w-full rounded-2xl border border-rule bg-white px-4 py-3 text-sm"
            />
          </label>
          <div className="mt-4 space-y-4">
            {whyChains.map((chain) => (
              <article key={chain.featureId} className="rounded-2xl border border-rule bg-white/70 p-4">
                <h3 className="font-medium">{chain.feature}</h3>
                <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-soft">Goal to test</p>
                <ol className="mt-2 space-y-2">
                  {chain.down.map((step) => (
                    <li key={`${chain.featureId}-${step.kind}-${step.label}`}>
                      <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-soft">{KIND_LABEL[step.kind]}</p>
                      <p className="text-sm leading-6">{step.label}</p>
                    </li>
                  ))}
                </ol>
                <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-soft">Why this API</p>
                <ol className="mt-2 space-y-2">
                  {chain.why.map((step) => (
                    <li key={`${chain.featureId}-why-${step.kind}-${step.label}`}>
                      <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-soft">{KIND_LABEL[step.kind]}</p>
                      <p className="text-sm leading-6">{step.label}</p>
                    </li>
                  ))}
                </ol>
              </article>
            ))}
          </div>
        </section>

        <section id="impact" className="mt-12 scroll-mt-6">
          <h2 className="font-serif text-2xl text-navy">Change Impact Analysis</h2>
          <p className="mt-3 text-sm leading-6 text-ink-soft">{IMPACT_NOTE}</p>
          {plan.impacts.length === 0 ? (
            <p className="mt-4 rounded-2xl border border-rule bg-white/70 p-4 text-sm leading-6">
              No requirement change against a prior surface.
            </p>
          ) : (
            plan.impacts.map((item) => (
              <article key={item.change} className="mt-4 rounded-2xl border border-stamp/30 bg-stamp/5 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Pill tone="stamp">Requirement change</Pill>
                  <Pill tone={impactTone(item.severity)}>{`${item.severity} impact`}</Pill>
                </div>
                <p className="mt-3 font-serif text-xl text-navy">{item.change}</p>
                <pre className="mt-4 overflow-x-auto rounded-2xl border border-rule bg-white/80 p-4 font-mono text-sm leading-6">
                  {item.ascii}
                </pre>
                {(
                  [
                    ["Affected features", item.features],
                    ["Affected APIs", item.apis],
                    ["Database changes", item.database],
                    ["Mobile screens", item.screens],
                    ["Permissions", item.permissions],
                    ["Tests", item.tests],
                    ["Documentation", item.documentation],
                    ["Security implications", item.security],
                  ] as const
                ).map(([title, lines]) => (
                  <div key={title} className="mt-4">
                    <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-soft">{title}</p>
                    <ul className="mt-1 list-disc space-y-1 pl-5 text-sm">
                      {lines.map((line) => (
                        <li key={line}>{line}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </article>
            ))
          )}
        </section>

        <section id="risk" className="mt-12 scroll-mt-6">
          <h2 className="font-serif text-2xl text-navy">Product Risk Analysis</h2>
          <p className="mt-3 text-sm leading-6 text-ink-soft">{RISK_NOTE}</p>
          <div className="mt-4 space-y-6">
            {plan.riskAnalysis.registers.map((register) => (
              <article key={register.featureId}>
                <h3 className="font-serif text-xl text-navy">{register.feature}</h3>
                <ol className="mt-3 space-y-3">
                  {register.risks.map((item) => (
                    <li key={`${register.featureId}-${item.kind}`} className="rounded-2xl border border-rule bg-white/70 p-4">
                      <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-soft">{RISK_LABEL[item.kind]}</p>
                      <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-soft">Risk</p>
                      <p className="mt-1 font-serif text-xl text-navy">{item.risk}</p>
                      <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-soft">Cause</p>
                      <p className="mt-1 text-sm leading-6">{item.cause}</p>
                      <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-soft">Mitigation</p>
                      <p className="mt-1 text-sm leading-6">{item.mitigation}</p>
                      <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-soft">Residual uncertainty</p>
                      <p className="mt-1 text-sm leading-6">{item.residual}</p>
                    </li>
                  ))}
                </ol>
              </article>
            ))}
          </div>
        </section>

        <section id="priority" className="mt-12 scroll-mt-6">
          <h2 className="font-serif text-2xl text-navy">Prioritization Engine</h2>
          <p className="mt-3 text-sm leading-6 text-ink-soft">{SCORE_NOTE}</p>
          <ol className="mt-4 space-y-4">
            {plan.priorities.map((item, index) => (
              <li key={item.featureId} className="rounded-2xl border border-rule bg-white/70 p-4">
                <div className="flex flex-wrap items-baseline justify-between gap-3">
                  <h3 className="font-medium">
                    <span className="mr-2 font-mono text-xs text-ink-soft">{index + 1}</span>
                    {featureName(item.featureId)}
                  </h3>
                  <div className="flex items-center gap-2">
                    <Pill tone={decisionTone(item.decision)}>{item.decision}</Pill>
                    <span className="font-serif text-2xl text-navy">{item.score}</span>
                  </div>
                </div>
                <p className="mt-2 font-mono text-sm text-ink-soft">{item.rationale}</p>
                <ul className="mt-4 divide-y divide-rule/70">
                  {item.factors.map((factor) => (
                    <li key={factor.key} className="grid gap-2 py-3 sm:grid-cols-[11rem_3.5rem_1fr] sm:items-start">
                      <p className="text-sm">{factor.label}</p>
                      <p className="font-mono text-sm">
                        {factor.sign === 1 ? "+" : "−"}
                        {factor.score}
                      </p>
                      <p className="text-sm leading-6 text-ink-soft">
                        <Pill tone={evidenceTone(factor.evidence)}>{factor.evidence}</Pill> {factor.reason}
                      </p>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ol>
        </section>

        <section id="recommend" className="mt-12 scroll-mt-6">
          <h2 className="font-serif text-2xl text-navy">Evidence-Based Recommendations</h2>
          <p className="mt-3 text-sm leading-6 text-ink-soft">{CONFIDENCE_NOTE}</p>
          <ol className="mt-4 space-y-4">
            {plan.recommendations.map((item) => (
              <li key={item.id} className="rounded-2xl border border-rule bg-white/70 p-4">
                <div className="flex flex-wrap items-baseline justify-between gap-3">
                  <h3 className="font-serif text-xl text-navy">Opportunity: {item.opportunity}</h3>
                  <p className="font-serif text-2xl text-navy">{item.confidence.toFixed(2)}</p>
                </div>
                <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-soft">Evidence</p>
                <ul className="mt-1 list-disc space-y-1 pl-5 text-sm">
                  {item.evidence.map((line, index) => (
                    <li key={`${item.id}-evidence-${index}`}>
                      {line.text} <Pill tone={evidenceTone(line.evidence)}>{line.evidence}</Pill>
                    </li>
                  ))}
                </ul>
                <dl className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div>
                    <dt className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-soft">User impact</dt>
                    <dd className="mt-1 text-sm leading-6">
                      <Pill tone={impactTone(item.userImpact.level)}>{item.userImpact.level}</Pill> {item.userImpact.reason}
                    </dd>
                  </div>
                  <div>
                    <dt className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-soft">Business impact</dt>
                    <dd className="mt-1 text-sm leading-6">
                      <Pill tone={impactTone(item.businessImpact.level)}>{item.businessImpact.level}</Pill> {item.businessImpact.reason}
                    </dd>
                  </div>
                  <div>
                    <dt className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-soft">Technical cost</dt>
                    <dd className="mt-1 text-sm leading-6">
                      <Pill tone={impactTone(item.technicalCost.level)}>{item.technicalCost.level}</Pill> {item.technicalCost.reason}
                    </dd>
                  </div>
                  <div>
                    <dt className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-soft">Confidence</dt>
                    <dd className="mt-1 text-sm leading-6">{item.confidence.toFixed(2)}</dd>
                  </div>
                </dl>
                <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-soft">Risks</p>
                <ul className="mt-1 list-disc space-y-1 pl-5 text-sm">
                  {item.risks.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
                <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-soft">Unknowns</p>
                <ul className="mt-1 list-disc space-y-1 pl-5 text-sm">
                  {item.unknowns.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              </li>
            ))}
          </ol>
        </section>

        <section id="score" className="mt-12 scroll-mt-6">
          <h2 className="font-serif text-2xl text-navy">Opportunity Scoring</h2>
          <p className="mt-3 text-sm leading-6 text-ink-soft">{OPPORTUNITY_NOTE}</p>
          <pre className="mt-4 overflow-x-auto rounded-2xl border border-rule bg-white/80 p-4 font-mono text-sm leading-6">
            {live.opportunityScoring?.ascii}
          </pre>
          <ol className="mt-4 space-y-4">
            {(live.opportunityScoring?.items ?? []).map((item, index) => (
              <li key={item.id} className="rounded-2xl border border-rule bg-white/70 p-4">
                <div className="flex flex-wrap items-baseline justify-between gap-3">
                  <h3 className="font-serif text-xl text-navy">
                    <span className="mr-2 font-mono text-xs text-ink-soft">{index + 1}</span>
                    {item.opportunity}
                  </h3>
                  <span className="font-serif text-2xl text-navy">{item.score}</span>
                </div>
                <p className="mt-2 font-mono text-sm text-ink-soft">{item.rationale}</p>
                <ul className="mt-4 divide-y divide-rule/70">
                  {item.factors.map((factor) => (
                    <li key={factor.key} className="grid gap-2 py-3 sm:grid-cols-[11rem_3.5rem_1fr] sm:items-start">
                      <p className="text-sm">{factor.label}</p>
                      <p className="font-mono text-sm">
                        {factor.sign === 1 ? "+" : "−"}
                        {factor.score}
                      </p>
                      <p className="text-sm leading-6 text-ink-soft">
                        <Pill tone={evidenceTone(factor.evidence)}>{factor.evidence}</Pill> {factor.reason}
                      </p>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ol>
        </section>

        <section id="experiment" className="mt-12 scroll-mt-6">
          <h2 className="font-serif text-2xl text-navy">Experiment Planning</h2>
          <p className="mt-3 text-sm leading-6 text-ink-soft">{EXPERIMENT_NOTE}</p>
          <pre className="mt-4 overflow-x-auto rounded-2xl border border-rule bg-white/80 p-4 font-mono text-sm leading-6">
            {EXPERIMENT_ASCII}
          </pre>
          <ol className="mt-4 space-y-4">
            {(plan.experiments ?? []).map((item) => (
              <li key={item.id} className="rounded-2xl border border-rule bg-white/70 p-4">
                <div className="flex flex-wrap items-baseline justify-between gap-3">
                  <h3 className="font-serif text-xl text-navy">{item.idea}</h3>
                  <Pill tone="copper">{item.evidence}</Pill>
                </div>
                <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-soft">Hypothesis</p>
                <p className="mt-1 font-serif text-xl text-navy">{item.hypothesis}</p>
                <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-soft">Experiment</p>
                <p className="mt-1 text-sm leading-6">{item.experiment}</p>
                <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-soft">Primary metric</p>
                <p className="mt-1 text-sm leading-6">{item.metric}</p>
                <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-soft">Success threshold</p>
                <p className="mt-1 text-sm leading-6">{item.successCriteria}</p>
                <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-soft">Decision</p>
                <p className="mt-1 text-sm leading-6">
                  {item.decision === "pending" ? `Pending — ${EXPERIMENT_CHOICES.join(" / ")}.` : experimentVerdictLabel(item.decision)}
                </p>
              </li>
            ))}
          </ol>
        </section>

        <section id="analytics" className="mt-12 scroll-mt-6">
          <h2 className="font-serif text-2xl text-navy">Product Analytics Feedback</h2>
          <p className="mt-3 text-sm leading-6 text-ink-soft">{ANALYTICS_NOTE}</p>
          <pre className="mt-4 overflow-x-auto rounded-2xl border border-rule bg-white/80 p-4 font-mono text-sm leading-6">
            {plan.analytics?.ascii}
          </pre>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            {(["event", "error", "behavior"] as const).map((kind) => {
              const lines = (plan.analytics?.signals ?? []).filter((item) => item.kind === kind);
              return (
                <article key={kind} className="rounded-2xl border border-rule bg-white/70 p-4">
                  <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-soft">{ANALYTICS_KIND_LABEL[kind]}</p>
                  {lines.length ? (
                    <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6">
                      {lines.map((item) => (
                        <li key={item.id}>
                          {item.detail} <Pill tone={item.declining ? "stamp" : "copper"}>{item.evidence}</Pill>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-3 text-sm leading-6 text-ink-soft">None named.</p>
                  )}
                </article>
              );
            })}
          </div>
          <pre className="mt-4 overflow-x-auto rounded-2xl border border-rule bg-white/80 p-4 font-mono text-sm leading-6">
            {plan.analytics?.loopAscii}
          </pre>
          {(plan.analytics?.loops ?? []).length ? (
            <ol className="mt-4 space-y-4">
              {plan.analytics.loops.map((loop) => (
                <li key={loop.feature} className="rounded-2xl border border-rule bg-white/70 p-4">
                  <h3 className="font-serif text-xl text-navy">{loop.feature}</h3>
                  <ol className="mt-3 space-y-3">
                    {loop.stages.map((item) => (
                      <li key={item.id}>
                        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-soft">{item.label}</p>
                        <p className="mt-1 text-sm leading-6">{item.text}</p>
                      </li>
                    ))}
                  </ol>
                </li>
              ))}
            </ol>
          ) : (
            <p className="mt-4 text-sm leading-6 text-ink-soft">No launched feature has a stated usage decline.</p>
          )}
        </section>

        <section id="roadmap" className="mt-12 scroll-mt-6">
          <h2 className="font-serif text-2xl text-navy">Roadmap Generator</h2>
          <p className="mt-3 text-sm leading-6 text-ink-soft">{plan.roadmap.note}</p>
          <pre className="mt-4 overflow-x-auto rounded-2xl border border-rule bg-white/80 p-4 font-mono text-sm leading-6">
            {plan.roadmap.ascii}
          </pre>
          <ol className="mt-4 space-y-4">
            {plan.roadmap.sprints.map((sprint) => (
              <li key={sprint.id} className="rounded-2xl border border-rule bg-white/70 p-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h3 className="font-serif text-xl text-navy">{sprint.name}</h3>
                  {sprint.window && <p className="font-mono text-xs text-ink-soft">{sprint.window}</p>}
                </div>
                <ul className="mt-3 space-y-3">
                  {sprint.placements.map((item) => (
                    <li key={item.featureId}>
                      <p className="font-medium">{featureName(item.featureId)}</p>
                      {item.dependsOn.length > 0 && (
                        <p className="mt-1 text-sm text-ink-soft">Depends on {item.dependsOn.join(", ")}.</p>
                      )}
                      <p className="mt-1 text-sm leading-6">{item.reason}</p>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ol>
          {plan.roadmap.deferred.length > 0 && (
            <div className="mt-4 rounded-2xl border border-rule bg-white/70 p-4">
              <h3 className="font-serif text-xl text-navy">After week {plan.roadmap.weeks}</h3>
              <ul className="mt-3 space-y-3">
                {plan.roadmap.deferred.map((item) => (
                  <li key={item.featureId}>
                    <p className="font-medium">{featureName(item.featureId)}</p>
                    {item.dependsOn.length > 0 && (
                      <p className="mt-1 text-sm text-ink-soft">Depends on {item.dependsOn.join(", ")}.</p>
                    )}
                    <p className="mt-1 text-sm leading-6">{item.reason}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        <section id="approval" className="mt-12 scroll-mt-6">
          <h2 className="font-serif text-2xl text-navy">Human Approval Gates</h2>
          <p className="mt-3 text-sm leading-6 text-ink-soft">{APPROVAL_NOTE}</p>
          <pre className="mt-4 overflow-x-auto rounded-2xl border border-rule bg-white/80 p-4 font-mono text-sm leading-6">
            {APPROVAL_ASCII}
          </pre>
          <ol className="mt-4 space-y-4">
            {(live.approvals?.gates ?? []).map((item) => (
              <li key={item.id} className="rounded-2xl border border-rule bg-white/70 p-4">
                <div className="flex flex-wrap items-baseline justify-between gap-3">
                  <h3 className="font-serif text-xl text-navy">{APPROVAL_LABEL[item.kind]}</h3>
                  <div className="flex flex-wrap gap-2">
                    <Pill tone={item.authorization === "mandatory" ? "stamp" : "copper"}>
                      {AUTHORIZATION_LABEL[item.authorization]}
                    </Pill>
                    <Pill tone={item.status === "approved" ? "sage" : item.status === "rejected" ? "stamp" : "navy"}>
                      {item.status}
                    </Pill>
                  </div>
                </div>
                <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-soft">AI proposes</p>
                <p className="mt-1 font-serif text-xl text-navy">{item.proposal}</p>
                <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-soft">Evidence collected</p>
                <ul className="mt-1 list-disc space-y-1 pl-5 text-sm leading-6">
                  {item.evidence.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
                <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-soft">Risk assessment</p>
                <p className="mt-1 text-sm leading-6">{item.risk}</p>
                <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-soft">Human approval</p>
                <p className="mt-1 text-sm leading-6">{item.status === "pending" ? "Waiting for a person to sign." : item.status}</p>
                <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-soft">Commit decision</p>
                <p className="mt-1 text-sm leading-6">{item.commit}</p>
                {item.status === "pending" && (
                  <div className="no-print mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="rounded-full bg-navy px-4 py-2 text-sm text-paper"
                      onClick={() => decide(item.id, "approved")}
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      className="rounded-full border border-rule bg-white px-4 py-2 text-sm"
                      onClick={() => decide(item.id, "rejected")}
                    >
                      Send back
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ol>
        </section>

        <section id="decide" className="mt-12 scroll-mt-6">
          <h2 className="font-serif text-2xl text-navy">Product Decision Engine</h2>
          <p className="mt-3 text-sm leading-6 text-ink-soft">{DECIDE_NOTE}</p>
          <p className="mt-2 font-serif text-xl text-navy">{live.decisionEngine?.question ?? DECIDE_QUESTION}</p>
          <pre className="mt-4 overflow-x-auto rounded-2xl border border-rule bg-white/80 p-4 font-mono text-sm leading-6">
            {live.decisionEngine?.ascii}
          </pre>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            {(live.decisionEngine?.contexts ?? []).map((ctx) => (
              <article key={ctx.kind} className="rounded-2xl border border-rule bg-white/70 p-4">
                <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-soft">
                  {ctx.kind === "user" ? "User Evidence" : ctx.kind === "business" ? "Business Context" : "Technical Context"}
                </p>
                <ul className="mt-3 list-disc space-y-1 pl-5 text-sm leading-6">
                  {ctx.lines.map((line, index) => (
                    <li key={`${ctx.kind}-${index}`}>
                      {line.text} <Pill tone={evidenceTone(line.evidence)}>{line.evidence}</Pill>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
          {(live.decisionEngine?.missing ?? []).length > 0 && (
            <div className="mt-4 rounded-2xl border border-rule bg-white/70 p-4">
              <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-soft">Still missing</p>
              <p className="mt-1 text-sm leading-6 text-ink-soft">{DECIDE_QUESTION}</p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6">
                {live.decisionEngine.missing.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </div>
          )}
          <ol className="mt-4 space-y-4">
            {(live.decisionEngine?.options ?? []).map((item) => (
              <li key={item.id} className="rounded-2xl border border-rule bg-white/70 p-4">
                <div className="flex flex-wrap items-baseline justify-between gap-3">
                  <h3 className="font-serif text-xl text-navy">{item.title}</h3>
                  {live.decisionEngine.record.chosenOptionId === item.id && <Pill tone="sage">chosen</Pill>}
                </div>
                <p className="mt-2 text-sm leading-6">{item.summary}</p>
                <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-soft">Evidence</p>
                <ul className="mt-1 list-disc space-y-1 pl-5 text-sm leading-6">
                  {item.evidence.map((line, index) => (
                    <li key={`${item.id}-evidence-${index}`}>
                      {line.text} <Pill tone={evidenceTone(line.evidence)}>{line.evidence}</Pill>
                    </li>
                  ))}
                </ul>
                <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-soft">Trade-offs</p>
                <ul className="mt-1 list-disc space-y-1 pl-5 text-sm leading-6">
                  {item.tradeoffs.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
                <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-soft">Risks</p>
                <ul className="mt-1 list-disc space-y-1 pl-5 text-sm leading-6">
                  {item.risks.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
                <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-soft">Still missing</p>
                <ul className="mt-1 list-disc space-y-1 pl-5 text-sm leading-6">
                  {item.missing.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
                {live.decisionEngine.record.status === "pending" && (
                  <button
                    type="button"
                    className="no-print mt-4 rounded-full bg-navy px-4 py-2 text-sm text-paper"
                    onClick={() => choose(item.id)}
                  >
                    Choose this option
                  </button>
                )}
              </li>
            ))}
          </ol>
          <div className="mt-4 rounded-2xl border border-rule bg-white/70 p-4">
            <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-soft">Human decision</p>
            <p className="mt-1 text-sm leading-6">
              {live.decisionEngine?.record.status === "chosen"
                ? `Chose ${live.decisionEngine.options.find((item) => item.id === live.decisionEngine.record.chosenOptionId)?.title ?? "an option"}.`
                : "Waiting for a person to choose."}
            </p>
            <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-soft">Decision record</p>
            <p className="mt-1 text-sm leading-6">{live.decisionEngine?.record.status}</p>
          </div>
        </section>

        <section id="ledger" className="mt-12 scroll-mt-6">
          <h2 className="font-serif text-2xl text-navy">Decision Ledger</h2>
          <p className="mt-3 text-sm leading-6 text-ink-soft">{LEDGER_NOTE}</p>
          <pre className="mt-4 overflow-x-auto rounded-2xl border border-rule bg-white/80 p-4 font-mono text-sm leading-6">
            {live.decisionLedger?.ascii}
          </pre>
          <pre className="mt-4 overflow-x-auto rounded-2xl border border-rule bg-white/80 p-4 font-mono text-sm leading-6">
            {live.decisionLedger?.versionAscii ?? VERSION_ASCII}
          </pre>
          <p className="mt-6 text-sm leading-6 text-ink-soft">{live.decisionLedger?.versioning?.note ?? VERSIONING_NOTE}</p>
          <p className="mt-2 font-serif text-xl text-navy">{live.decisionLedger?.versioning?.question ?? VERSION_CURRENT}</p>
          {(live.decisionLedger?.versioning?.families ?? []).map((family) => (
            <article key={family.decisionId} className="mt-4 rounded-2xl border border-rule bg-white/70 p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-3">
                <h3 className="font-serif text-xl text-navy">{family.decisionId}</h3>
                <Pill tone="sage">{`Current ${family.currentId}`}</Pill>
              </div>
              <pre className="mt-3 overflow-x-auto font-mono text-sm leading-6">{family.ascii}</pre>
              <ol className="mt-4 space-y-3">
                {family.versions.map((item) => (
                  <li key={item.id} className={`rounded-2xl border p-4 ${item.status === "current" ? "border-copper bg-copper/10" : "border-rule bg-white"}`}>
                    <div className="flex flex-wrap items-baseline justify-between gap-3">
                      <h4 className="font-serif text-lg text-navy">{item.id}</h4>
                      <Pill tone={item.status === "current" ? "copper" : "ink"}>{item.status}</Pill>
                    </div>
                    <p className="mt-2 text-sm leading-6">{item.decision || "The new choice is still unnamed."}</p>
                    {item.reasons.length ? (
                      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6">
                        {item.reasons.map((reason) => (
                          <li key={reason}>{reason}</li>
                        ))}
                      </ul>
                    ) : null}
                    {item.replacesId ? <p className="mt-2 text-sm leading-6">Replaces {item.replacesId}</p> : null}
                    {item.replacedById ? <p className="mt-2 text-sm leading-6">Replaced by {item.replacedById}</p> : null}
                  </li>
                ))}
              </ol>
              {family.changes.length ? (
                <div className="mt-4">
                  <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-soft">What changed between versions</p>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6">
                    {family.changes.map((change, index) => (
                      <li key={`${family.decisionId}-${change.field}-${index}`}>
                        {change.field === "decision" ? `Decision: ${change.before} → ${change.after}` : `Reason: ${change.after}`}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </article>
          ))}
          <label className="mt-6 block">
            <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-soft">Ask the ledger</span>
            <input
              value={ledgerQuery}
              onChange={(event) => setLedgerQuery(event.target.value)}
              placeholder={WHY_ARCHITECTURE}
              className="mt-2 w-full rounded-2xl border border-rule bg-white px-4 py-3 text-sm"
            />
          </label>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              className="rounded-full border border-rule bg-white px-3 py-1.5 text-sm text-ink-soft hover:bg-paper-2"
              onClick={() => setLedgerQuery(WHY_ARCHITECTURE)}
            >
              Why this architecture
            </button>
            <button
              type="button"
              className="rounded-full border border-rule bg-white px-3 py-1.5 text-sm text-ink-soft hover:bg-paper-2"
              onClick={() => setLedgerQuery(STALE_ASSUMPTIONS)}
            >
              Assumptions no longer valid
            </button>
            <button
              type="button"
              className="rounded-full border border-rule bg-white px-3 py-1.5 text-sm text-ink-soft hover:bg-paper-2"
              onClick={() => setLedgerQuery(VERSION_CURRENT)}
            >
              Current version
            </button>
            <button
              type="button"
              className="rounded-full border border-rule bg-white px-3 py-1.5 text-sm text-ink-soft hover:bg-paper-2"
              onClick={() => setLedgerQuery(VERSION_HISTORY)}
            >
              Version history
            </button>
          </div>
          {ledgerQuery && (
            <article className="mt-4 rounded-2xl border border-rule bg-white/70 p-4">
              <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-soft">{ledgerAnswer.kind}</p>
              <p className="mt-2 text-sm leading-6">{ledgerAnswer.answer}</p>
            </article>
          )}
          <ol className="mt-4 space-y-4">
            {(live.decisionLedger?.entries ?? []).map((raw) => {
              const item = structureEntry(raw);
              return (
              <li key={item.id} className="rounded-2xl border border-rule bg-white/70 p-4">
                <div className="flex flex-wrap items-baseline justify-between gap-3">
                  <h3 className="font-serif text-xl text-navy">{decisionLabel(item)}</h3>
                  <Pill tone={item.state === "DECISION_CHANGED" ? "stamp" : item.state === "TRIGGERED" || item.state === "UNDER_REVIEW" ? "copper" : item.lifecycle === "active" || item.status === "recorded" ? "sage" : "copper"}>
                    {item.state || item.lifecycle || item.status}
                  </Pill>
                </div>
                <p className="mt-2 text-sm text-ink-soft">Decision #{item.number}</p>
                {(item.stateHistory ?? []).length ? (
                  <p className="mt-2 font-mono text-sm leading-6">{(item.stateHistory ?? []).join(" → ")}</p>
                ) : null}
                {item.predecessorId ? (
                  <p className="mt-2 text-sm leading-6">Predecessor {item.predecessorId}</p>
                ) : null}
                {item.successorId ? (
                  <p className="mt-2 text-sm leading-6">Successor {item.successorId}</p>
                ) : null}
                {item.replacesId ? <p className="mt-2 text-sm leading-6">Replaces {item.replacesId}</p> : null}
                {item.replacedById ? <p className="mt-2 text-sm leading-6">Replaced by {item.replacedById}</p> : null}
                <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-soft">Question</p>
                <p className="mt-1 text-sm leading-6">{item.question}</p>
                <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-soft">Options</p>
                <ul className="mt-1 list-disc space-y-1 pl-5 text-sm leading-6">
                  {item.options.map((option) => (
                    <li key={option.key}>
                      {option.key}. {option.title}
                    </li>
                  ))}
                </ul>
                <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-soft">Observation</p>
                <ul className="mt-1 list-disc space-y-1 pl-5 text-sm leading-6">
                  {(item.observations ?? []).length ? (
                    item.observations.map((line) => (
                      <li key={line.id || line.text}>
                        {line.id ? `${line.id} · ` : ""}
                        {line.statement || line.text}
                        {line.metric ? ` · ${line.metric}` : ""}
                        {line.value != null ? ` · ${line.value}` : ""}{" "}
                        <Pill tone={evidenceTone(line.evidence)}>{line.evidence}</Pill>
                      </li>
                    ))
                  ) : (
                    <li>No observation named.</li>
                  )}
                </ul>
                <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-soft">Constraints</p>
                <ul className="mt-1 list-disc space-y-1 pl-5 text-sm leading-6">
                  {item.constraints.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
                <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-soft">Risks</p>
                <ul className="mt-1 list-disc space-y-1 pl-5 text-sm leading-6">
                  {item.risks.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
                <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-soft">Assumption</p>
                <ul className="mt-1 list-disc space-y-1 pl-5 text-sm leading-6">
                  {item.assumptions.length ? (
                    item.assumptions.map((line) => (
                      <li key={line.id || line.text}>
                        {line.id ? `${line.id} · ` : ""}
                        {line.statement || line.text}
                        {line.confidence != null ? ` · ${line.confidence}` : ""}{" "}
                        <Pill tone={line.health === "stale" ? "stamp" : line.health === "valid" ? "sage" : "copper"}>{line.health}</Pill>
                      </li>
                    ))
                  ) : (
                    <li>No assumption named.</li>
                  )}
                </ul>
                <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-soft">Re-evaluation triggers</p>
                <ul className="mt-1 list-disc space-y-1 pl-5 text-sm leading-6">
                  {(item.triggers ?? []).length
                    ? item.triggers.map((line) => (
                        <li key={line.id || line.statement}>
                          {TRIGGER_LABEL[line.kind]}: {line.statement}
                        </li>
                      ))
                    : (item.reviewTriggers ?? []).length
                      ? item.reviewTriggers.map((line) => <li key={line}>{line}</li>)
                      : <li>None named.</li>}
                </ul>
                <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-soft">Decision</p>
                <p className="mt-1 text-sm leading-6">{item.decision || "Open."}</p>
                <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-soft">Confidence</p>
                <p className="mt-1 text-sm leading-6">{item.decisionConfidence ? item.decisionConfidence : "Unlabeled"}</p>
                <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-soft">Why</p>
                <p className="mt-1 text-sm leading-6">{item.reason || "A person has not chosen yet."}</p>
                <pre className="mt-4 overflow-x-auto rounded-xl border border-rule bg-paper/80 p-3 font-mono text-[11px] leading-5">
                  {JSON.stringify(ledgerObject(item), null, 2)}
                </pre>
                <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-soft">Owner</p>
                <p className="mt-1 text-sm leading-6">{item.owner || "Unassigned"}</p>
                <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-soft">Date</p>
                <p className="mt-1 text-sm leading-6">{item.date || "Unrecorded"}</p>
              </li>
              );
            })}
          </ol>
        </section>

        <section id="reevaluate" className="mt-12 scroll-mt-6">
          <h2 className="font-serif text-2xl text-navy">Decision Re-evaluation</h2>
          <p className="mt-3 text-sm leading-6 text-ink-soft">{live.decisionReevaluation?.whatChangedNote ?? CHANGED_NOTE}</p>
          <pre className="mt-4 overflow-x-auto rounded-2xl border border-rule bg-white/80 p-4 font-mono text-sm leading-6">
            {live.decisionReevaluation?.whatChangedAscii ?? CHANGED_ASCII}
          </pre>
          {(live.decisionReevaluation?.cases ?? []).length === 0 ? (
            <p className="mt-4 text-sm leading-6 text-ink-soft">No recorded decision has new contradicting evidence.</p>
          ) : (
            <ol className="mt-6 space-y-6">
              {(live.decisionReevaluation?.cases ?? [])
                .filter((item, index, all) => all.findIndex((row) => row.decisionNumber === item.decisionNumber) === index)
                .map((item) => {
                const changed = item.whatChanged;
                return (
                  <li key={`${item.id}-changed`} className="rounded-2xl border-2 border-navy/20 bg-white/80 p-6">
                    <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-soft">Decision Re-evaluation</p>
                    <div className="mt-2 flex flex-wrap items-baseline justify-between gap-3">
                      <h3 className="font-serif text-2xl text-navy">Decision: {changed?.title || item.proposal?.originalDecision || `Decision #${item.decisionNumber}`}</h3>
                      <Pill tone={item.state === "DECISION_CHANGED" ? "stamp" : item.state === "TRIGGERED" || item.state === "UNDER_REVIEW" ? "copper" : "sage"}>
                        {item.state || REEVAL_LABEL[item.verdict]}
                      </Pill>
                    </div>
                    <p className="mt-6 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-soft">What Changed?</p>
                    {(changed?.deltas ?? []).length ? (
                      <ol className="mt-3 space-y-4">
                        {changed.deltas.map((row, index) => (
                          <li key={`${row.metric}-${index}`}>
                            <p className="text-sm font-medium">{row.metric}</p>
                            <p className="mt-1 font-mono text-sm leading-6">
                              {row.before} <span className="text-ink-soft">→</span> {row.after}{" "}
                              <Pill tone={evidenceTone(row.evidence)}>{row.evidence}</Pill>
                            </p>
                          </li>
                        ))}
                      </ol>
                    ) : (
                      <p className="mt-2 text-sm leading-6 text-ink-soft">No stated before and after was named.</p>
                    )}
                    {changed?.assumption && (
                      <div className="mt-6">
                        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-soft">Affected Assumptions</p>
                        <p className="mt-2 font-serif text-xl text-navy">
                          {changed.assumption.id ? `${changed.assumption.id} ` : ""}
                          {changed.assumption.statement}
                        </p>
                        <p className="mt-2 text-sm leading-6 text-stamp">⚠ {changed.assumption.status || CHANGED_STATUS}</p>
                      </div>
                    )}
                    <div className="mt-6">
                      <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-soft">Proposed Action</p>
                      <p className="mt-2 font-serif text-xl text-navy">{changed?.action || item.proposal?.proposedAction}</p>
                    </div>
                    {item.status === "pending" && (
                      <div className="no-print mt-6 flex flex-wrap gap-2">
                        {(live.decisionReevaluation?.options ?? []).map((option) => (
                          <button
                            key={option.id}
                            type="button"
                            className={
                              option.id === "review"
                                ? "rounded-full bg-navy px-4 py-2 text-sm text-paper"
                                : "rounded-full border border-rule bg-white px-4 py-2 text-sm"
                            }
                            onClick={() => chooseReevaluation(item.id, option.id)}
                          >
                            {option.id === "review" ? "Review Decision" : option.title}
                          </button>
                        ))}
                      </div>
                    )}
                    {item.updatedDecision && <p className="mt-4 text-sm leading-6">{item.updatedDecision}</p>}
                  </li>
                );
              })}
            </ol>
          )}
          <p className="mt-8 text-sm leading-6 text-ink-soft">{REEVAL_NOTE}</p>
          <p className="mt-2 font-serif text-xl text-navy">{live.decisionReevaluation?.question ?? REEVAL_QUESTION}</p>
          <pre className="mt-4 overflow-x-auto rounded-2xl border border-rule bg-white/80 p-4 font-mono text-sm leading-6">
            {live.decisionReevaluation?.ascii}
          </pre>
          <pre className="mt-4 overflow-x-auto rounded-2xl border border-rule bg-white/80 p-4 font-mono text-sm leading-6">
            {live.decisionReevaluation?.stateAscii ?? STATE_ASCII}
          </pre>
          <p className="mt-4 text-sm leading-6 text-ink-soft">{live.decisionReevaluation?.scoreNote ?? REEVAL_SCORE_NOTE}</p>
          <p className="mt-2 font-mono text-sm leading-6">{live.decisionReevaluation?.scoreEquation ?? SCORE_EQUATION}</p>
          <pre className="mt-4 overflow-x-auto rounded-2xl border border-rule bg-white/80 p-4 font-mono text-sm leading-6">
            {live.decisionReevaluation?.scoreAscii ?? SCORE_ASCII}
          </pre>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {(live.decisionReevaluation?.priorityBands ?? PRIORITY_BANDS).map((band) => (
              <article key={band} className="rounded-2xl border border-rule bg-white/70 p-4">
                <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-soft">{band}</p>
                <p className="mt-2 text-sm leading-6">{PRIORITY_LABEL[band]}</p>
              </article>
            ))}
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {(live.decisionReevaluation?.states ?? DECISION_STATES).map((state) => (
              <article key={state} className="rounded-2xl border border-rule bg-white/70 p-4">
                <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-soft">{state}</p>
                <p className="mt-2 text-sm leading-6">{STATE_LABEL[state]}</p>
              </article>
            ))}
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {TRIGGER_KINDS.map((kind) => {
              const stored = (live.decisionLedger?.entries ?? []).flatMap((item) => (item.triggers ?? []).filter((row) => row.kind === kind));
              const fired = (live.decisionReevaluation?.cases ?? []).filter((item) => item.trigger?.kind === kind);
              return (
                <article key={kind} className="rounded-2xl border border-rule bg-white/70 p-4">
                  <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-soft">{TRIGGER_LABEL[kind]}</p>
                  <ul className="mt-3 list-disc space-y-1 pl-5 text-sm leading-6">
                    {stored.length ? stored.map((row) => <li key={row.id}>{row.statement}</li>) : <li>None named.</li>}
                  </ul>
                  {fired.length ? <p className="mt-2 text-sm text-stamp">Fired</p> : null}
                </article>
              );
            })}
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            {(live.decisionReevaluation?.channels ?? []).map((ctx) => (
              <article key={ctx.kind} className="rounded-2xl border border-rule bg-white/70 p-4">
                <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-soft">{REEVAL_CHANNEL_LABEL[ctx.kind]}</p>
                <ul className="mt-3 list-disc space-y-1 pl-5 text-sm leading-6">
                  {ctx.lines.length ? (
                    ctx.lines.map((line, index) => (
                      <li key={`${ctx.kind}-${index}`}>
                        {line.text} <Pill tone={evidenceTone(line.evidence)}>{line.evidence}</Pill>
                      </li>
                    ))
                  ) : (
                    <li>None named.</li>
                  )}
                </ul>
              </article>
            ))}
          </div>
          {(live.decisionReevaluation?.cases ?? []).length > 0 && (
            <ol className="mt-4 space-y-4">
              {(live.decisionReevaluation?.cases ?? [])
                .filter((item, index, all) => all.findIndex((row) => row.decisionNumber === item.decisionNumber) === index)
                .map((item) => (
                <li key={item.id} className="rounded-2xl border border-rule bg-white/70 p-4">
                  <h3 className="font-serif text-xl text-navy">Inspect Decision #{item.decisionNumber}</h3>
                  <p className="mt-2 text-sm leading-6">{item.question}</p>
                  {(item.stateHistory ?? []).length ? (
                    <p className="mt-2 font-mono text-sm leading-6">{(item.stateHistory ?? []).join(" → ")}</p>
                  ) : null}
                  {item.successorId ? <p className="mt-2 text-sm leading-6">Successor {item.successorId}</p> : null}
                  {item.score && (
                    <article className="mt-4 rounded-2xl border-2 border-navy/20 bg-paper p-5">
                      <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-soft">Re-evaluation priority</p>
                      <div className="mt-2 flex flex-wrap items-baseline justify-between gap-3">
                        <p className="font-serif text-2xl text-navy">{item.score.priority != null ? item.score.priority.toFixed(2) : "Unnamed"}</p>
                        <Pill tone={item.score.band === "critical" || item.score.band === "high" ? "stamp" : item.score.band === "medium" ? "copper" : "sage"}>
                          {item.score.band ? PRIORITY_LABEL[item.score.band] : "Unnamed"}
                        </Pill>
                      </div>
                      <p className="mt-2 font-mono text-sm leading-6">{item.score.rationale}</p>
                      <ol className="mt-4 space-y-3">
                        {item.score.factors.map((factor) => (
                          <li key={factor.key}>
                            <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-soft">{factor.label}</p>
                            <p className="mt-1 text-sm leading-6">
                              {factor.score != null ? factor.score.toFixed(2) : "Unnamed"}{" "}
                              <Pill tone={evidenceTone(factor.evidence)}>{factor.evidence}</Pill>
                            </p>
                            <p className="mt-1 text-sm leading-6 text-ink-soft">{factor.reason}</p>
                          </li>
                        ))}
                      </ol>
                    </article>
                  )}
                  {item.trigger ? (
                    <>
                      <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-soft">Fired trigger</p>
                      <p className="mt-1 text-sm leading-6">
                        {TRIGGER_LABEL[item.trigger.kind]}: {item.trigger.statement}
                      </p>
                    </>
                  ) : null}
                  <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-soft">{REEVAL_CHANNEL_LABEL[item.channel]}</p>
                  <p className="mt-1 text-sm leading-6">
                    {item.evidence.text} <Pill tone={evidenceTone(item.evidence.evidence)}>{item.evidence.evidence}</Pill>
                  </p>
                  {(item.pipeline ?? []).length ? (
                    <ol className="mt-4 list-decimal space-y-1 pl-5 text-sm leading-6">
                      {item.pipeline.map((step) => (
                        <li key={step.id}>
                          {step.label}
                          {step.text ? ` — ${step.text}` : ""}
                        </li>
                      ))}
                    </ol>
                  ) : null}
                </li>
              ))}
            </ol>
          )}
        </section>

        <section id="graph" className="mt-12 scroll-mt-6">
          <h2 className="font-serif text-2xl text-navy">Product Knowledge Graph</h2>
          <p className="mt-3 text-sm leading-6 text-ink-soft">{GRAPH_NOTE}</p>
          <pre className="mt-4 overflow-x-auto rounded-2xl border border-rule bg-white/80 p-4 font-mono text-sm leading-6">
            {live.productGraph?.ascii}
          </pre>
          <pre className="mt-4 overflow-x-auto rounded-2xl border border-rule bg-white/80 p-4 font-mono text-sm leading-6">
            {live.productGraph?.lineageAscii ?? LINEAGE_ASCII}
          </pre>
          <label className="mt-6 block">
            <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-soft">Ask the graph</span>
            <input
              value={graphQuery}
              onChange={(event) => setGraphQuery(event.target.value)}
              placeholder={GRAPH_BIGGEST}
              className="mt-2 w-full rounded-2xl border border-rule bg-white px-4 py-3 text-sm"
            />
          </label>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              className="rounded-full border border-rule bg-white px-3 py-1.5 text-sm text-ink-soft hover:bg-paper-2"
              onClick={() => setGraphQuery(GRAPH_BIGGEST)}
            >
              Biggest problems
            </button>
            <button
              type="button"
              className="rounded-full border border-rule bg-white px-3 py-1.5 text-sm text-ink-soft hover:bg-paper-2"
              onClick={() => setGraphQuery(GRAPH_WEAK)}
            >
              Weak evidence
            </button>
            <button
              type="button"
              className="rounded-full border border-rule bg-white px-3 py-1.5 text-sm text-ink-soft hover:bg-paper-2"
              onClick={() => setGraphQuery(GRAPH_ASSUMPTIONS)}
            >
              Unvalidated assumptions
            </button>
            <button
              type="button"
              className="rounded-full border border-rule bg-white px-3 py-1.5 text-sm text-ink-soft hover:bg-paper-2"
              onClick={() => setGraphQuery(GRAPH_FEEDBACK)}
            >
              Feedback on decisions
            </button>
            <button
              type="button"
              className="rounded-full border border-rule bg-white px-3 py-1.5 text-sm text-ink-soft hover:bg-paper-2"
              onClick={() => setGraphQuery(GRAPH_CAUSED)}
            >
              What caused this feature
            </button>
          </div>
          {graphQuery && (
            <article className="mt-4 rounded-2xl border border-rule bg-white/70 p-4">
              <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-soft">{graphAnswer.kind}</p>
              <p className="mt-2 text-sm leading-6">{graphAnswer.answer}</p>
            </article>
          )}
          <ol className="mt-4 space-y-4">
            {(live.productGraph?.lineages ?? []).slice(0, 8).map((lineage) => (
              <li key={lineage.id} className="rounded-2xl border border-rule bg-white/70 p-4">
                <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-soft">Decision lineage</p>
                <h3 className="mt-2 font-serif text-xl text-navy">{lineage.feature}</h3>
                <p className="mt-2 text-sm leading-6">{lineage.causedBy}</p>
              </li>
            ))}
          </ol>
          <ol className="mt-4 space-y-4">
            {paths.slice(0, 8).map((path) => (
              <li key={path.feature.id} className="rounded-2xl border border-rule bg-white/70 p-4">
                <h3 className="font-serif text-xl text-navy">{path.feature.label}</h3>
                <p className="mt-2 text-sm leading-6">
                  {[path.customer, path.problem, path.opportunity, path.requirement, ...path.branches, path.outcome]
                    .filter(Boolean)
                    .map((item) => `${item?.kind}: ${item?.label}`)
                    .join(" → ")}
                </p>
              </li>
            ))}
          </ol>
        </section>

        <section id="portfolio" className="mt-12 scroll-mt-6">
          <h2 className="font-serif text-2xl text-navy">Portfolio Intelligence</h2>
          <p className="mt-3 text-sm leading-6 text-ink-soft">{PORTFOLIO_NOTE}</p>
          <p className="mt-2 font-serif text-xl text-navy">{live.portfolio?.question ?? PORTFOLIO_QUESTION}</p>
          <pre className="mt-4 overflow-x-auto rounded-2xl border border-rule bg-white/80 p-4 font-mono text-sm leading-6">
            {live.portfolio?.engineAscii}
          </pre>
          <pre className="mt-4 overflow-x-auto rounded-2xl border border-rule bg-white/80 p-4 font-mono text-sm leading-6">
            {live.portfolio?.ascii}
          </pre>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            {(live.portfolio?.contexts ?? []).map((ctx) => (
              <article key={ctx.kind} className="rounded-2xl border border-rule bg-white/70 p-4">
                <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-soft">
                  {ctx.kind === "products" ? "Products" : ctx.kind === "capacity" ? "Capacity" : "Evidence"}
                </p>
                <ul className="mt-3 list-disc space-y-1 pl-5 text-sm leading-6">
                  {ctx.lines.map((line, index) => (
                    <li key={`${ctx.kind}-${index}`}>
                      {line.text} <Pill tone={evidenceTone(line.evidence)}>{line.evidence}</Pill>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            {(live.portfolio?.products ?? []).map((item) => (
              <article key={item.name} className="rounded-2xl border border-rule bg-white/70 p-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h3 className="font-serif text-xl text-navy">{item.name}</h3>
                  <Pill tone={evidenceTone(item.evidence)}>{item.evidence}</Pill>
                </div>
                <ul className="mt-3 list-disc space-y-1 pl-5 text-sm leading-6">
                  {item.features.slice(0, 8).map((feature) => (
                    <li key={feature}>{feature}</li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
          <ol className="mt-4 space-y-4">
            {(live.portfolio?.findings ?? []).map((item) => (
              <li key={item.id} className="rounded-2xl border border-rule bg-white/70 p-4">
                <div className="flex flex-wrap items-baseline justify-between gap-3">
                  <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-soft">{PORTFOLIO_LABEL[item.kind]}</p>
                  <Pill tone={evidenceTone(item.evidence)}>{item.evidence}</Pill>
                </div>
                <h3 className="mt-2 font-serif text-xl text-navy">{item.title}</h3>
                <p className="mt-2 text-sm leading-6">{item.detail}</p>
                {item.products.length > 0 && (
                  <p className="mt-2 text-sm text-ink-soft">{item.products.join(" · ")}</p>
                )}
              </li>
            ))}
          </ol>
          {(live.portfolio?.missing ?? []).length > 0 && (
            <div className="mt-4 rounded-2xl border border-rule bg-white/70 p-4">
              <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-soft">Still missing</p>
              <p className="mt-1 text-sm leading-6 text-ink-soft">{PORTFOLIO_QUESTION}</p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6">
                {live.portfolio.missing.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </div>
          )}
          <ol className="mt-4 space-y-4">
            {(live.portfolio?.options ?? []).map((item) => (
              <li key={item.id} className="rounded-2xl border border-rule bg-white/70 p-4">
                <div className="flex flex-wrap items-baseline justify-between gap-3">
                  <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-soft">{PORTFOLIO_BET_LABEL[item.kind]}</p>
                  {live.portfolio.record.chosenOptionId === item.id && <Pill tone="sage">chosen</Pill>}
                </div>
                <h3 className="mt-2 font-serif text-xl text-navy">{item.title}</h3>
                <p className="mt-2 text-sm leading-6">{item.summary}</p>
                <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-soft">Evidence</p>
                <ul className="mt-1 list-disc space-y-1 pl-5 text-sm leading-6">
                  {item.evidence.map((line, index) => (
                    <li key={`${item.id}-evidence-${index}`}>
                      {line.text} <Pill tone={evidenceTone(line.evidence)}>{line.evidence}</Pill>
                    </li>
                  ))}
                </ul>
                <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-soft">Trade-offs</p>
                <ul className="mt-1 list-disc space-y-1 pl-5 text-sm leading-6">
                  {item.tradeoffs.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
                <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-soft">Risks</p>
                <ul className="mt-1 list-disc space-y-1 pl-5 text-sm leading-6">
                  {item.risks.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
                <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-soft">Still missing</p>
                <ul className="mt-1 list-disc space-y-1 pl-5 text-sm leading-6">
                  {item.missing.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
                {live.portfolio.record.status === "pending" && (
                  <button
                    type="button"
                    className="no-print mt-4 rounded-full bg-navy px-4 py-2 text-sm text-paper"
                    onClick={() => choosePortfolio(item.id)}
                  >
                    Choose this bet
                  </button>
                )}
              </li>
            ))}
          </ol>
          {live.portfolio?.record.status === "chosen" && (
            <p className="mt-4 text-sm leading-6">
              Chose {live.portfolio.options.find((item) => item.id === live.portfolio.record.chosenOptionId)?.title}.
            </p>
          )}
        </section>

        <section id="monitor" className="mt-12 scroll-mt-6">
          <h2 className="font-serif text-2xl text-navy">Autonomous Product Monitoring</h2>
          <p className="mt-3 text-sm leading-6 text-ink-soft">{MONITOR_NOTE}</p>
          <pre className="mt-4 overflow-x-auto rounded-2xl border border-rule bg-white/80 p-4 font-mono text-sm leading-6">
            {live.monitoring?.ascii}
          </pre>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <article className="rounded-2xl border border-rule bg-white/70 p-4">
              <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-soft">Metrics</p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6">
                {(live.monitoring?.metrics ?? []).length ? live.monitoring.metrics.map((line) => <li key={line}>{line}</li>) : <li>None named.</li>}
              </ul>
            </article>
            <article className="rounded-2xl border border-rule bg-white/70 p-4">
              <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-soft">Feedback</p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6">
                {(live.monitoring?.feedback ?? []).length ? live.monitoring.feedback.map((line) => <li key={line}>{line}</li>) : <li>None named.</li>}
              </ul>
            </article>
            <article className="rounded-2xl border border-rule bg-white/70 p-4">
              <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-soft">Experiments</p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6">
                {(live.monitoring?.experiments ?? []).length ? live.monitoring.experiments.map((line) => <li key={line}>{line}</li>) : <li>None named.</li>}
              </ul>
            </article>
          </div>
          {(live.monitoring?.signals ?? []).length === 0 ? (
            <p className="mt-4 text-sm text-ink-soft">No live anomaly was named.</p>
          ) : (
            <ol className="mt-4 space-y-4">
              {(live.monitoring?.signals ?? []).map((item) => (
                <li key={item.id} className="rounded-2xl border border-rule bg-white/70 p-4">
                  <div className="flex flex-wrap items-baseline justify-between gap-3">
                    <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-stamp">⚠ {item.warning}</p>
                    <Pill tone={item.confidence === "high" ? "sage" : item.confidence === "medium" ? "copper" : "ink"}>
                      {`${item.confidence} confidence`}
                    </Pill>
                  </div>
                  <h3 className="mt-2 font-serif text-xl text-navy">Feature: {item.feature}</h3>
                  <p className="mt-2 text-sm leading-6">{item.change}</p>
                  <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-soft">Potential causes</p>
                  <ul className="mt-1 list-disc space-y-1 pl-5 text-sm">
                    {item.causes.map((cause, index) => (
                      <li key={`${item.id}-cause-${index}`}>
                        {cause.text} <Pill tone={evidenceTone(cause.evidence)}>{cause.evidence}</Pill>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-soft">Recommended investigation</p>
                  <p className="mt-1 text-sm leading-6">{item.investigation}</p>
                  <p className="mt-3 text-sm text-ink-soft">
                    Status: {item.status}. The monitor investigates before it decides.
                  </p>
                </li>
              ))}
            </ol>
          )}
        </section>

        <section id="loop" className="mt-12 scroll-mt-6">
          <h2 className="font-serif text-2xl text-navy">Autonomous Product Loop</h2>
          <p className="mt-3 text-sm leading-6 text-ink-soft">{PHASE3_NOTE}</p>
          <pre className="mt-4 overflow-x-auto rounded-2xl border border-rule bg-white/80 p-4 font-mono text-sm leading-6">
            {live.productLoop?.phase3Ascii}
          </pre>
          <p className="mt-4 font-serif text-xl text-navy">
            Phase 3 now: {PHASE3_NAME[live.productLoop?.currentPhase3 ?? "data"]}
          </p>
          <ol className="mt-4 grid gap-3 md:grid-cols-2">
            {(live.productLoop?.phase3 ?? []).map((item) => (
              <li
                key={item.id}
                className={`rounded-2xl border p-4 ${
                  item.status === "current" ? "border-copper bg-copper/10" : "border-rule bg-white/70"
                }`}
              >
                <div className="flex flex-wrap items-baseline justify-between gap-3">
                  <h3 className="font-serif text-xl text-navy">{item.name}</h3>
                  <Pill tone={item.status === "current" ? "copper" : item.status === "done" ? "sage" : "ink"}>{item.status}</Pill>
                </div>
                <p className="mt-2 text-sm leading-6">{item.finding}</p>
              </li>
            ))}
          </ol>
          <p className="mt-6 text-sm leading-6 text-ink-soft">{LOOP_NOTE}</p>
          <p className="mt-2 font-serif text-xl text-navy">{LOOP_QUESTION}</p>
          <pre className="mt-4 overflow-x-auto rounded-2xl border border-rule bg-white/80 p-4 font-mono text-sm leading-6">
            {live.productLoop?.engineAscii}
          </pre>
          <pre className="mt-4 overflow-x-auto rounded-2xl border border-rule bg-white/80 p-4 font-mono text-sm leading-6">
            {live.productLoop?.ascii}
          </pre>
          <p className="mt-6 text-sm leading-6 text-ink-soft">{REEVAL_CYCLE_NOTE}</p>
          <pre className="mt-4 overflow-x-auto rounded-2xl border border-rule bg-white/80 p-4 font-mono text-sm leading-6">
            {live.productLoop?.cycleAscii}
          </pre>
          <p className="mt-4 font-serif text-xl text-navy">
            Cycle now: {REEVAL_CYCLE_LABEL[live.productLoop?.currentCycle ?? "observe"]}
          </p>
          <ol className="mt-4 grid gap-3 md:grid-cols-2">
            {(live.productLoop?.cycle ?? []).map((item) => (
              <li
                key={item.id}
                className={`rounded-2xl border p-4 ${
                  item.status === "current" ? "border-copper bg-copper/10" : "border-rule bg-white/70"
                }`}
              >
                <div className="flex flex-wrap items-baseline justify-between gap-3">
                  <h3 className="font-serif text-xl text-navy">{item.label}</h3>
                  <Pill tone={item.status === "current" ? "copper" : item.status === "done" ? "sage" : "ink"}>{item.status}</Pill>
                </div>
                <p className="mt-2 text-sm leading-6">{item.text}</p>
              </li>
            ))}
          </ol>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <article className="rounded-2xl border border-rule bg-white/70 p-4">
              <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-soft">Now</p>
              <p className="mt-2 font-serif text-xl text-navy">{live.productLoop?.current}</p>
              <p className="mt-2 text-sm leading-6">{live.productLoop?.action}</p>
            </article>
            <article className="rounded-2xl border border-rule bg-white/70 p-4">
              <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-soft">Next</p>
              <p className="mt-2 font-serif text-xl text-navy">{live.productLoop?.next}</p>
              <p className="mt-2 text-sm leading-6">
                {live.productLoop?.mode === "waiting" ? live.productLoop.blocker || "A person still signs." : "The loop can keep reading evidence."}
              </p>
            </article>
            <article className="rounded-2xl border border-rule bg-white/70 p-4">
              <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-soft">Authorization</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <Pill tone={live.productLoop?.mode === "waiting" ? "copper" : "sage"}>{live.productLoop?.mode ?? "autonomous"}</Pill>
                <Pill tone={live.productLoop?.authorization === "mandatory" ? "stamp" : live.productLoop?.authorization === "review" ? "copper" : "navy"}>
                  {live.productLoop?.authorization ?? "automatic"}
                </Pill>
              </div>
              <p className="mt-2 text-sm leading-6">Observe through propose can run. Validate, decide, and execute wait.</p>
            </article>
          </div>
          {live.productLoop?.current === "analyze" && (live.monitoring?.signals ?? []).some((item) => item.status === "investigating") && (
            <button
              type="button"
              className="no-print mt-4 rounded-full bg-navy px-4 py-2 text-sm text-paper"
              onClick={() => advanceLoop()}
            >
              Investigation complete
            </button>
          )}
          <ol className="mt-4 space-y-3">
            {(live.productLoop?.stages ?? []).map((item) => (
              <li
                key={item.id}
                className={`rounded-2xl border p-4 ${
                  item.status === "current" ? "border-copper bg-copper/10" : "border-rule bg-white/70"
                }`}
              >
                <div className="flex flex-wrap items-baseline justify-between gap-3">
                  <h3 className="font-serif text-xl text-navy">{item.label}</h3>
                  <Pill tone={item.status === "current" ? "copper" : item.status === "done" ? "sage" : "ink"}>{item.status}</Pill>
                </div>
                <p className="mt-2 text-sm leading-6">{item.text}</p>
              </li>
            ))}
          </ol>
        </section>

        <section id="handoff" className="mt-12 scroll-mt-6">
          <h2 className="font-serif text-2xl text-navy">Engineering Handoff</h2>
          <div className="mt-4 grid gap-4">
            <article className="rounded-2xl border border-rule bg-white/70 p-4">
              <h3 className="font-serif text-xl text-navy">AI Architect</h3>
              <p className="mt-1 text-sm text-ink-soft">Paste this brief into the architect. It is the PRD.</p>
              <pre className="mt-3 max-h-[28rem] overflow-auto whitespace-pre-wrap font-mono text-xs leading-5">
                {plan.handoff.architect}
              </pre>
            </article>
            <article className="rounded-2xl border border-rule bg-white/70 p-4">
              <h3 className="font-serif text-xl text-navy">AI Developer</h3>
              <p className="mt-1 text-sm text-ink-soft">Stories, acceptance, and tasks in milestone order.</p>
              <pre className="mt-3 max-h-[28rem] overflow-auto whitespace-pre-wrap font-mono text-xs leading-5">
                {plan.handoff.developer}
              </pre>
            </article>
          </div>
          {(plan.assumptions.length > 0 || plan.risks.length > 0) && (
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <h3 className="font-medium">Assumptions</h3>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
                  {plan.assumptions.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="font-medium">Risks</h3>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
                  {plan.risks.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </section>
      </article>
    </div>
  );
}

function Tagged({ title, lines }: { title: string; lines: TaggedLine[] }) {
  return (
    <>
      <h3 className="mt-6 font-medium">{title}</h3>
      <ul className="mt-2 space-y-2">
        {lines.map((item, index) => (
          <li key={`${title}-${index}`} className="text-sm leading-6">
            {item.text} <Pill tone={evidenceTone(item.evidence)}>{item.evidence}</Pill>
          </li>
        ))}
      </ul>
    </>
  );
}

function Bullet({ title, lines }: { title: string; lines: string[] }) {
  return (
    <>
      <h3 className="mt-6 font-medium">{title}</h3>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
        {(lines.length ? lines : ["None stated."]).map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </>
  );
}
