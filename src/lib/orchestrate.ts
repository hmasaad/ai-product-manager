import { APPROVAL_LABEL, pendingMandatory } from "./approval";
import type { ProductPlan, SpecialistId, SpecialistReport, StepId } from "./types";

export const ORCHESTRATE_NOTE =
  "The product manager is an orchestrator. Six specialists do the research, requirements, analytics, market, risk, and experiment work. Their outputs meet at a product decision. A person still signs before a commit.";

export const ORCHESTRATE_ASCII = `                 AI PRODUCT MANAGER
                         │
        ┌────────────────┼────────────────┐
        ↓                ↓                ↓
 Product Research   Requirements      Analytics
     Agent             Agent            Agent
        │                │                │
        ↓                ↓                ↓
   Market Agent      Risk Agent       Experiment Agent
                         │
                         ↓
                  Product Decision`;

export const SPECIALIST_IDS: SpecialistId[] = [
  "research",
  "requirements",
  "analytics",
  "market",
  "risk",
  "experiment",
  "decision",
];

export const SPECIALIST_NAME: Record<SpecialistId, string> = {
  research: "Product Research Agent",
  requirements: "Requirements Agent",
  analytics: "Analytics Agent",
  market: "Market Agent",
  risk: "Risk Agent",
  experiment: "Experiment Agent",
  decision: "Product Decision",
};

export const SPECIALIST_ROLE: Record<SpecialistId, string> = {
  research: "Users, problems, goals, and an MVP from the source.",
  requirements: "Scope, ambiguities, conflicts, and the PRD.",
  analytics: "Events, errors, behavior, and the product monitor after launch.",
  market: "A competitor landscape from the source. Totals stay unnamed unless stated.",
  risk: "Product, technical, security, UX, business, compliance, and operational risk.",
  experiment: "Hypothesis, prototype, metric, and a pending Build / Modify / Abandon.",
  decision: "Options, evidence, scored opportunities, portfolio bets, trade-offs, missing information, a human record, then the ledger.",
};

export const STEP_TO_AGENT: Record<StepId, SpecialistId> = {
  research: "research",
  problem: "research",
  personas: "research",
  market: "market",
  ambiguity: "requirements",
  assumption: "requirements",
  prd: "requirements",
  conflict: "requirements",
  features: "requirements",
  stories: "requirements",
  trace: "requirements",
  impact: "requirements",
  risk: "risk",
  priority: "decision",
  recommend: "decision",
  score: "decision",
  experiment: "experiment",
  analytics: "analytics",
  roadmap: "decision",
  approval: "decision",
  decide: "decision",
  ledger: "decision",
  reevaluate: "decision",
  graph: "decision",
  portfolio: "decision",
  monitor: "analytics",
  loop: "decision",
  handoff: "decision",
};

function report(id: SpecialistId, findings: string[], output: string): SpecialistReport {
  return {
    id,
    name: SPECIALIST_NAME[id],
    role: SPECIALIST_ROLE[id],
    findings: findings.filter(Boolean).slice(0, 5),
    output,
  };
}

function researchReport(plan: ProductPlan): SpecialistReport {
  const users = plan.discovery.targetUsers.slice(0, 2).map((user) => `${user.role} (${user.evidence})`);
  const mvp = plan.discovery.mvpDefinition.slice(0, 2).map((item) => item.text);
  return report(
    "research",
    [plan.discovery.problemStatement, ...users, ...mvp],
    plan.maturity === "problem"
      ? "Validation first. This is not a build."
      : plan.proposed
        ? "The MVP is a proposal."
        : `Research supports ${plan.title}.`,
  );
}

function requirementsReport(plan: ProductPlan): SpecialistReport {
  const must = plan.requirements.filter((item) => item.priority === "must").slice(0, 3).map((item) => item.statement);
  const critical = plan.ambiguities.filter((item) => item.severity === "critical").map((item) => item.question);
  const clash = plan.conflicts[0];
  return report(
    "requirements",
    [
      ...must,
      ...critical.slice(0, 2),
      clash ? `Conflict: ${clash.newRequirement}` : "",
    ],
    clash
      ? `A requirement conflict is open (${clash.impact}).`
      : critical.length
        ? `${critical.length} critical ambiguities wait on a person.`
        : `${must.length} must-haves are in the PRD.`,
  );
}

function analyticsReport(plan: ProductPlan): SpecialistReport {
  const signals = plan.analytics.signals.slice(0, 4).map((item) => item.detail);
  const loop = plan.analytics.loops[0];
  const opportunity = loop?.stages.find((item) => item.id === "opportunity")?.text;
  return report(
    "analytics",
    signals.length ? signals : ["No live events, errors, or behavior were named."],
    opportunity ?? (signals.length ? "Usage was observed. No launched-feature decline was named." : "No live telemetry."),
  );
}

function marketReport(plan: ProductPlan): SpecialistReport {
  const competitors = plan.discovery.competitors.slice(0, 4).map((item) => `${item.name} (${item.evidence}): ${item.note}`);
  const unknown = plan.discovery.competitors.every((item) => item.evidence === "unknown");
  return report(
    "market",
    competitors,
    unknown
      ? "A market landscape was not named. Ask what people use today."
      : "A competitor landscape to check. Not a market-size study.",
  );
}

function riskReport(plan: ProductPlan): SpecialistReport {
  const cards = plan.riskAnalysis.registers
    .flatMap((register) => register.risks.filter((item) => item.kind === "product").map((item) => `${register.feature}: ${item.risk}`))
    .slice(0, 4);
  return report(
    "risk",
    cards.length ? cards : ["No product risk card was named."],
    `${plan.riskAnalysis.registers.length} features carry a seven-kind register.`,
  );
}

function experimentReport(plan: ProductPlan): SpecialistReport {
  const first = plan.experiments[0];
  return report(
    "experiment",
    first
      ? [first.hypothesis, first.experiment, `${first.metric} / ${first.successCriteria}`]
      : ["No experiment is waiting on this plan."],
    first ? `Decision pending: Build / Modify / Abandon. ${first.idea}` : "No experiment is waiting.",
  );
}

function decisionReport(plan: ProductPlan): SpecialistReport {
  const pending = pendingMandatory(plan);
  const engine = plan.decisionEngine;
  const options = (engine?.options ?? []).map((item) => item.title);
  const rec = plan.recommendations[0];
  return report(
    "decision",
    options.length ? options : [rec ? `Opportunity: ${rec.opportunity}` : "", ...plan.approvals.gates.slice(0, 2).map((item) => `${APPROVAL_LABEL[item.kind]}: ${item.status}`)],
    engine?.options.length
      ? `${engine.options.length} options. ${engine.record.status === "pending" ? "A person still chooses." : "A person chose an option."}${pending.length ? ` ${pending.length} mandatory gates wait.` : ""}`
      : pending.length
        ? `${pending.length} mandatory gates wait on a person. The decision is not committed.`
        : "Product decision: the plan is ready for a person to sign.",
  );
}

export function emptyOrchestration() {
  return {
    note: ORCHESTRATE_NOTE,
    ascii: ORCHESTRATE_ASCII,
    agents: [] as SpecialistReport[],
    decision: "",
  };
}

export function buildOrchestration(plan: ProductPlan) {
  const agents = [
    researchReport(plan),
    requirementsReport(plan),
    analyticsReport(plan),
    marketReport(plan),
    riskReport(plan),
    experimentReport(plan),
    decisionReport(plan),
  ];
  return {
    note: ORCHESTRATE_NOTE,
    ascii: ORCHESTRATE_ASCII,
    agents,
    decision: agents.find((item) => item.id === "decision")?.output ?? "",
  };
}

export function orchestrationMarkdown(plan: ProductPlan) {
  const board = plan.orchestration;
  if (!board?.agents.length) return "Specialists have not run.";
  const body = board.agents
    .map((agent) => {
      const findings = agent.findings.map((line) => `- ${line}`).join("\n");
      return `### ${agent.name}\n\n${agent.role}\n\n${findings}\n\nHandoff: ${agent.output}`;
    })
    .join("\n\n");
  return `${board.decision}\n\n${body}`;
}

export function agentForStep(id: StepId): SpecialistId {
  return STEP_TO_AGENT[id];
}
