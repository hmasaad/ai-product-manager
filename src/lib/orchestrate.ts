import { APPROVAL_LABEL, pendingMandatory } from "./approval";
import type {
  ConnectedHop,
  ConnectedHopId,
  Evidence,
  ProductPlan,
  SpecialistId,
  SpecialistReport,
  StepId,
} from "./types";

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

export const CONNECTED_NOTE =
  "Discovery and the Decision Engine now share one path. Re-evaluation asks Architect, Analytics, and Feedback for impact, then a person approves any updated decision.";

export const CONNECTED_ASCII = `                 AI PRODUCT MANAGER
                         │
            ┌────────────┴────────────┐
            ↓                         ↓
      Product Discovery        Decision Engine
            │                         │
            ↓                         ↓
       Opportunities          Decision Ledger
                                      │
                                      ↓
                              Re-evaluation
                                      │
                         ┌────────────┼────────────┐
                         ↓            ↓            ↓
                    Architect     Analytics     Feedback
                         │            │            │
                         └────────────┼────────────┘
                                      ↓
                               Impact Analysis
                                      │
                                      ↓
                                Human Approval
                                      │
                                      ↓
                              Updated Decision`;

export const CONNECTED_HOP_IDS: ConnectedHopId[] = [
  "discovery",
  "opportunities",
  "decision-engine",
  "ledger",
  "reevaluation",
  "architect",
  "analytics",
  "feedback",
  "impact",
  "approval",
  "updated-decision",
];

export const CONNECTED_HOP_NAME: Record<ConnectedHopId, string> = {
  discovery: "Product Discovery",
  opportunities: "Opportunities",
  "decision-engine": "Decision Engine",
  ledger: "Decision Ledger",
  reevaluation: "Re-evaluation",
  architect: "Architect",
  analytics: "Analytics",
  feedback: "Feedback",
  impact: "Impact Analysis",
  approval: "Human Approval",
  "updated-decision": "Updated Decision",
};

const AGENT_TO_HOP: Partial<Record<SpecialistId, ConnectedHopId>> = {
  research: "opportunities",
  analytics: "reevaluation",
  decision: "ledger",
};

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

function clip(text: string, n = 140) {
  const next = text.replace(/\s+/g, " ").trim();
  return next.length <= n ? next : `${next.slice(0, n - 1).trim()}…`;
}

function hopOf(id: ConnectedHopId, finding: string, evidence: Evidence): ConnectedHop {
  return { id, name: CONNECTED_HOP_NAME[id], finding, evidence };
}

function openCase(plan: ProductPlan) {
  const cases = plan.decisionReevaluation?.cases ?? [];
  return (
    cases.find((item) => item.updatedDecision) ??
    cases.find((item) => item.state === "UNDER_REVIEW" || item.state === "TRIGGERED") ??
    cases.find((item) => (item.whatChanged?.deltas.length ?? 0) > 0) ??
    cases[0]
  );
}

function currentHopOf(plan: ProductPlan): ConnectedHopId {
  const item = openCase(plan);
  if (item?.state === "DECISION_CHANGED" || item?.state === "DECISION_RETAINED" || item?.state === "VALIDATED") {
    return "updated-decision";
  }
  if (item?.state === "UNDER_REVIEW") return "approval";
  if (item && (item.state === "TRIGGERED" || item.status === "pending" || (item.whatChanged?.deltas.length ?? 0) > 0)) {
    return "reevaluation";
  }
  if (plan.maturity === "problem") return "discovery";
  if (plan.proposed) return "opportunities";
  if ((plan.decisionLedger?.entries.length ?? 0) > 0) return "ledger";
  if ((plan.decisionEngine?.options.length ?? 0) > 0) return "decision-engine";
  return "discovery";
}

export function buildConnectedHops(plan: ProductPlan): ConnectedHop[] {
  const item = openCase(plan);
  const delta = item?.whatChanged?.deltas[0];
  const deltaText = delta ? `${delta.metric} ${delta.before} → ${delta.after}` : "";
  const opportunity = plan.recommendations[0]?.opportunity || plan.opportunityScoring?.items[0]?.opportunity || "";
  const entry = plan.decisionLedger?.entries[0];
  const ledgerLabel = entry ? `DEC-${entry.number} v${entry.version ?? 1}` : "";
  const feedbackLine = plan.decisionReevaluation?.channels.find((ctx) => ctx.kind === "feedback")?.lines[0];
  const feedbackDelta = item?.whatChanged?.deltas.find((row) => /support|feedback|customer|segment/i.test(row.metric));
  const analyticsLine = plan.decisionReevaluation?.channels.find((ctx) => ctx.kind === "analytics")?.lines[0];
  const analyticsSignal = plan.analytics?.signals[0]?.detail;
  const impact = plan.impacts[0];
  const pending = pendingMandatory(plan)[0];
  const constraint = plan.constraints[0] || plan.discovery.constraints[0]?.text || "";

  return [
    hopOf(
      "discovery",
      clip(plan.discovery.problemStatement || plan.title || "Product Discovery named the request."),
      plan.discovery.problemStatement ? "stated" : "inferred",
    ),
    hopOf(
      "opportunities",
      opportunity ? clip(opportunity) : "No opportunity was scored.",
      opportunity ? "inferred" : "unknown",
    ),
    hopOf(
      "decision-engine",
      clip(plan.decisionEngine?.question || "The Decision Engine has not named a question."),
      plan.decisionEngine?.question ? "inferred" : "unknown",
    ),
    hopOf(
      "ledger",
      entry ? clip(`${ledgerLabel}: ${entry.decision || "Decision text was not named."}`) : "No ledger entry.",
      entry ? "stated" : "unknown",
    ),
    hopOf(
      "reevaluation",
      deltaText
        ? clip(`${item?.whatChanged.title ?? "Decision"} — ${deltaText}`)
        : "No recorded decision has new contradicting evidence.",
      deltaText ? (delta?.evidence ?? "stated") : "unknown",
    ),
    hopOf(
      "architect",
      constraint ? clip(constraint) : "No architecture constraint was named.",
      constraint ? "stated" : "unknown",
    ),
    hopOf(
      "analytics",
      clip(analyticsLine?.text || deltaText || analyticsSignal || "No live telemetry was named."),
      analyticsLine || deltaText || analyticsSignal ? (analyticsLine?.evidence ?? delta?.evidence ?? "stated") : "unknown",
    ),
    hopOf(
      "feedback",
      clip(feedbackLine?.text || (feedbackDelta ? `${feedbackDelta.metric} ${feedbackDelta.before} → ${feedbackDelta.after}` : "No named feedback.")),
      feedbackLine || feedbackDelta ? (feedbackLine?.evidence ?? feedbackDelta?.evidence ?? "stated") : "unknown",
    ),
    hopOf(
      "impact",
      impact
        ? clip(`${impact.change} (${impact.severity})`)
        : item?.whatChanged.assumption
          ? clip(`${item.whatChanged.assumption.id}: ${item.whatChanged.assumption.statement}`)
          : "No blast radius was named.",
      impact || item?.whatChanged.assumption ? "inferred" : "unknown",
    ),
    hopOf(
      "approval",
      pending ? clip(pending.proposal) : item?.state === "UNDER_REVIEW" ? "A person still signs." : "No mandatory gate is waiting.",
      pending ? "stated" : "inferred",
    ),
    hopOf(
      "updated-decision",
      item?.updatedDecision
        ? clip(item.updatedDecision)
        : "The recorded decision stays until a person reviews it.",
      item?.updatedDecision ? "stated" : "inferred",
    ),
  ];
}

function connectAgent(agent: SpecialistReport, hops: ConnectedHop[]): SpecialistReport {
  const hopId = AGENT_TO_HOP[agent.id];
  const hop = hops.find((item) => item.id === hopId);
  if (!hop) return agent;
  return {
    ...agent,
    findings: [...agent.findings, `Hands to ${hop.name}: ${hop.finding}`],
  };
}

export function emptyOrchestration() {
  return {
    note: ORCHESTRATE_NOTE,
    ascii: ORCHESTRATE_ASCII,
    connectedNote: CONNECTED_NOTE,
    connectedAscii: CONNECTED_ASCII,
    hops: [] as ConnectedHop[],
    currentHop: "discovery" as ConnectedHopId,
    agents: [] as SpecialistReport[],
    decision: "",
  };
}

export function buildOrchestration(plan: ProductPlan) {
  const hops = buildConnectedHops(plan);
  const agents = [
    researchReport(plan),
    requirementsReport(plan),
    analyticsReport(plan),
    marketReport(plan),
    riskReport(plan),
    experimentReport(plan),
    decisionReport(plan),
  ].map((agent) => connectAgent(agent, hops));
  return {
    note: ORCHESTRATE_NOTE,
    ascii: ORCHESTRATE_ASCII,
    connectedNote: CONNECTED_NOTE,
    connectedAscii: CONNECTED_ASCII,
    hops,
    currentHop: currentHopOf(plan),
    agents,
    decision: agents.find((item) => item.id === "decision")?.output ?? "",
  };
}

export function orchestrationMarkdown(plan: ProductPlan) {
  const board = plan.orchestration;
  if (!board?.agents.length) return "Specialists have not run.";
  const hops = (board.hops ?? [])
    .map((item) => `- ${item.name}${item.id === board.currentHop ? " (now)" : ""}: ${item.finding}`)
    .join("\n");
  const body = board.agents
    .map((agent) => {
      const findings = agent.findings.map((line) => `- ${line}`).join("\n");
      return `### ${agent.name}\n\n${agent.role}\n\n${findings}\n\nHandoff: ${agent.output}`;
    })
    .join("\n\n");
  return `${board.connectedNote}

\`\`\`
${board.connectedAscii}
\`\`\`

Now: ${CONNECTED_HOP_NAME[board.currentHop]}

${hops}

${board.decision}

${body}`;
}

export function agentForStep(id: StepId): SpecialistId {
  return STEP_TO_AGENT[id];
}
