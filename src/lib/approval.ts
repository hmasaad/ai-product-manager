import type {
  ApprovalBoard,
  ApprovalGate,
  ApprovalKind,
  ApprovalStatus,
  AuthorizationLevel,
  Evidence,
  ProductPlan,
} from "./types";

export const APPROVAL_NOTE =
  "The PM proposes. A person signs. Strategy, scope, priority, roadmap, and production-impacting changes wait on a human. Authorization is risk-based: review recommended, or mandatory. Nothing here runs automatically.";

export const APPROVAL_ASCII = `AI proposes
     ↓
Evidence collected
     ↓
Risk assessment
     ↓
Human approval
     ↓
Commit decision`;

export const APPROVAL_KINDS: ApprovalKind[] = [
  "strategy",
  "scope",
  "priority",
  "roadmap",
  "production",
];

export const APPROVAL_LABEL: Record<ApprovalKind, string> = {
  strategy: "Product strategy",
  scope: "Scope changes",
  priority: "Priority changes",
  roadmap: "Major roadmap decisions",
  production: "Production-impacting changes",
};

export const AUTHORIZATION_LABEL: Record<AuthorizationLevel, string> = {
  automatic: "Automatic",
  review: "Review recommended",
  mandatory: "Mandatory human",
};

const KIND_AUTH: Record<ApprovalKind, AuthorizationLevel> = {
  strategy: "mandatory",
  scope: "mandatory",
  priority: "review",
  roadmap: "mandatory",
  production: "mandatory",
};

function collapse(text: string) {
  return text.replace(/\s+/g, " ").trim();
}

function commitText(status: ApprovalStatus) {
  if (status === "approved") return "Committed after human approval.";
  if (status === "rejected") return "Sent back. The decision stays open.";
  return "Wait for a person to sign.";
}

function gate(input: {
  kind: ApprovalKind;
  proposal: string;
  evidence: string[];
  risk: string;
  evidenceTag?: Evidence;
}): ApprovalGate {
  return {
    id: `GATE-${input.kind}`,
    kind: input.kind,
    proposal: input.proposal,
    evidence: input.evidence.filter(Boolean),
    risk: input.risk,
    status: "pending",
    authorization: KIND_AUTH[input.kind],
    commit: commitText("pending"),
    evidenceTag: input.evidenceTag ?? "inferred",
  };
}

function productRisk(plan: ProductPlan) {
  const first = plan.riskAnalysis.registers[0]?.risks.find((item) => item.kind === "product");
  return first?.risk ?? plan.risks[0] ?? "The residual product risk has not been named.";
}

function statedClause(source: string, lead: RegExp) {
  const match = source.match(lead);
  return match?.[1] ? collapse(match[1]) : "";
}

function strategyGate(plan: ProductPlan): ApprovalGate {
  const source = plan.sourceText;
  const bet = statedClause(source, /make\s+(.+?)\s+the\s+\d{4}\s+product bet/i);
  if (bet) {
    return gate({
      kind: "strategy",
      proposal: `Make ${bet} the 2026 product bet.`,
      evidence: [collapse(source.split("\n").find((line) => /product bet/i.test(line)) ?? "")],
      risk: "A product bet locks the year's roadmap.",
      evidenceTag: "stated",
    });
  }
  if (plan.maturity === "problem") {
    return gate({
      kind: "strategy",
      proposal: `Do not commit a product until validation exits: ${plan.title}.`,
      evidence: [plan.problem.statement, plan.problem.who].filter(Boolean),
      risk: productRisk(plan),
      evidenceTag: "stated",
    });
  }
  if (plan.proposed) {
    return gate({
      kind: "strategy",
      proposal: `Treat ${plan.title} as a proposed MVP, not a signed strategy.`,
      evidence: plan.discovery.mvpDefinition.slice(0, 3).map((item) => item.text),
      risk: "An inferred MVP can become an accidental product.",
    });
  }
  const opportunity = plan.analytics.loops[0]?.stages.find((item) => item.id === "opportunity")?.text;
  if (opportunity) {
    return gate({
      kind: "strategy",
      proposal: `Commit the analytics opportunity: ${opportunity}.`,
      evidence: plan.analytics.loops[0]?.stages
        .filter((item) => item.id === "declining" || item.id === "problem")
        .map((item) => item.text),
      risk: productRisk(plan),
      evidenceTag: "stated",
    });
  }
  return gate({
    kind: "strategy",
    proposal: `Commit ${plan.title} as the product strategy.`,
    evidence: [
      ...plan.problem.success.slice(0, 2),
      ...plan.requirements.filter((item) => item.priority === "must").slice(0, 2).map((item) => item.statement),
    ],
    risk: productRisk(plan),
    evidenceTag: plan.problem.success.length ? "stated" : "inferred",
  });
}

function scopeGate(plan: ProductPlan): ApprovalGate | null {
  const source = plan.sourceText;
  const stated = statedClause(source, /(?:this )?changes scope:\s*(.+)/i);
  if (stated) {
    return gate({
      kind: "scope",
      proposal: stated.charAt(0).toUpperCase() + stated.slice(1),
      evidence: [stated],
      risk: "A scope change rewrites what v1 owes the user.",
      evidenceTag: "stated",
    });
  }
  const conflict = plan.conflicts[0];
  if (conflict) {
    return gate({
      kind: "scope",
      proposal: conflict.newRequirement,
      evidence: [conflict.existingRequirement, conflict.resolution],
      risk: `Requirement conflict impact ${conflict.impact}.`,
      evidenceTag: "stated",
    });
  }
  const impact = plan.impacts[0];
  if (impact) {
    return gate({
      kind: "scope",
      proposal: impact.change,
      evidence: [...impact.features.slice(0, 2), ...impact.apis.slice(0, 1)],
      risk: `Change impact is ${impact.severity}.`,
      evidenceTag: "stated",
    });
  }
  if (plan.proposed) {
    return gate({
      kind: "scope",
      proposal: `Inferred must-haves for ${plan.title} stay a proposal.`,
      evidence: plan.requirements.filter((item) => item.priority === "must").slice(0, 3).map((item) => item.statement),
      risk: "Inferred scope can be mistaken for a signed contract.",
    });
  }
  return null;
}

function priorityGate(plan: ProductPlan): ApprovalGate | null {
  const source = plan.sourceText;
  const stated = statedClause(source, /(?:this )?changes priority:\s*(.+)/i);
  if (stated) {
    return gate({
      kind: "priority",
      proposal: stated.charAt(0).toUpperCase() + stated.slice(1),
      evidence: [stated],
      risk: "A priority change moves engineering time off the current must-haves.",
      evidenceTag: "stated",
    });
  }
  const opportunity = plan.analytics.loops[0]?.stages.find((item) => item.id === "opportunity")?.text;
  const decline = plan.analytics.loops[0]?.stages.find((item) => item.id === "declining")?.text;
  if (opportunity && decline) {
    return gate({
      kind: "priority",
      proposal: `Move ${opportunity} ahead of new feature work.`,
      evidence: [decline],
      risk: "A live decline can starve the committed roadmap if it jumps the queue unsigned.",
      evidenceTag: "stated",
    });
  }
  const signal = plan.monitoring?.signals.find((item) => item.status === "investigating");
  if (signal) {
    return gate({
      kind: "priority",
      proposal: `Investigate ${signal.feature} before a product decision.`,
      evidence: [signal.change, signal.investigation, ...signal.causes.slice(0, 2).map((item) => item.text)],
      risk: "Acting on an anomaly without a pre/post comparison can freeze the wrong fix.",
      evidenceTag: signal.evidence,
    });
  }
  const laterRec = plan.recommendations.find((item) => {
    const feature = plan.features.find((row) => row.id === item.featureId);
    return feature?.scope === "later";
  });
  if (laterRec) {
    return gate({
      kind: "priority",
      proposal: `Promote ${laterRec.opportunity} ahead of later scope.`,
      evidence: laterRec.evidence.slice(0, 3).map((item) => item.text),
      risk: "Promoting later work changes the release order.",
    });
  }
  return null;
}

function roadmapGate(plan: ProductPlan): ApprovalGate | null {
  const source = plan.sourceText;
  const stated = statedClause(source, /major roadmap decision:\s*(.+)/i);
  if (stated) {
    return gate({
      kind: "roadmap",
      proposal: stated.charAt(0).toUpperCase() + stated.slice(1),
      evidence: [stated],
      risk: "A roadmap slip reallocates the team's weeks.",
      evidenceTag: "stated",
    });
  }
  if (plan.maturity === "problem" || plan.proposed) return null;
  if (plan.roadmap.weeks != null || plan.roadmap.deferred.length > 0) {
    const deferred = plan.roadmap.deferred.slice(0, 3).join(", ");
    return gate({
      kind: "roadmap",
      proposal: `${plan.roadmap.developers ?? "The team"} developers, ${plan.roadmap.weeks}-week target. Hold ${plan.roadmap.deferred.length} features after the window.`,
      evidence: [
        plan.roadmap.note,
        deferred ? `Deferred: ${deferred}` : "",
      ],
      risk: "Capacity placement is a commitment once a sprint starts.",
      evidenceTag: "stated",
    });
  }
  if (plan.roadmap.sprints.length >= 3) {
    const later = plan.features.filter((item) => item.scope === "later").map((item) => item.name);
    return gate({
      kind: "roadmap",
      proposal: `Place ${plan.roadmap.sprints.length} release buckets, with later work after the core loop.`,
      evidence: [
        plan.roadmap.sprints.map((item) => item.name).join(" · "),
        later[0] ? `Later: ${later.join(", ")}` : "",
      ],
      risk: "A multi-bucket roadmap becomes the team's calendar once engineering starts.",
    });
  }
  return null;
}

function productionGate(plan: ProductPlan): ApprovalGate | null {
  const source = plan.sourceText;
  const stated = statedClause(source, /production-impacting change:\s*(.+)/i);
  if (stated) {
    return gate({
      kind: "production",
      proposal: stated.charAt(0).toUpperCase() + stated.slice(1),
      evidence: [stated],
      risk: "A production change reaches people who already use the product.",
      evidenceTag: "stated",
    });
  }
  const high = plan.impacts.find((item) => item.severity === "high");
  if (high) {
    return gate({
      kind: "production",
      proposal: high.change,
      evidence: [...high.security.slice(0, 1), ...high.database.slice(0, 1), ...high.apis.slice(0, 1)],
      risk: "High blast radius on a live ledger or API.",
      evidenceTag: "stated",
    });
  }
  const liveProduct = /\b(payment|invoice|billing|transaction|amount due)\b/i.test(plan.input.existing);
  if (liveProduct) {
    const metrics = plan.input.existing
      .split("\n")
      .map((line) => line.replace(/^[-*•]\s*/, "").trim())
      .filter((line) => /\d/.test(line))
      .slice(0, 3);
    return gate({
      kind: "production",
      proposal: `Change the live ${/billing|payment|invoice/i.test(plan.input.existing) ? "billing" : "transaction"} surface.`,
      evidence: metrics,
      risk: "The existing product already has users on this path.",
      evidenceTag: "stated",
    });
  }
  if (plan.analytics.loops.length) {
    const decline = plan.analytics.loops[0]?.stages.find((item) => item.id === "declining")?.text;
    const improvement = plan.analytics.loops[0]?.stages.find((item) => item.id === "improvement")?.text;
    return gate({
      kind: "production",
      proposal: improvement ?? `Change the live ${plan.analytics.loops[0]?.feature} path.`,
      evidence: [decline ?? ""].filter(Boolean),
      risk: "The feature is already launched. A fix ships to people who use it today.",
      evidenceTag: "stated",
    });
  }
  if (
    plan.maturity === "solution" &&
    !plan.proposed &&
    /okta|cityworks|photos are evidence|inspectors/i.test(source)
  ) {
    return gate({
      kind: "production",
      proposal: "Ship field inspections to devices that already hold evidence photos.",
      evidence: plan.constraints.filter((line) => /photo|okta|cityworks|phone/i.test(line)).slice(0, 3),
      risk: "Photos are evidence. A field ship reaches inspectors and the system of record.",
      evidenceTag: "stated",
    });
  }
  return null;
}

export function emptyApprovals(): ApprovalBoard {
  return {
    note: APPROVAL_NOTE,
    ascii: APPROVAL_ASCII,
    gates: [],
  };
}

export function buildApprovals(plan: ProductPlan): ApprovalBoard {
  const gates = [
    strategyGate(plan),
    scopeGate(plan),
    priorityGate(plan),
    roadmapGate(plan),
    productionGate(plan),
  ].filter((item): item is ApprovalGate => Boolean(item));
  return {
    note: APPROVAL_NOTE,
    ascii: APPROVAL_ASCII,
    gates,
  };
}

export function applyGateDecision(plan: ProductPlan, gateId: string, status: "approved" | "rejected"): ProductPlan {
  return {
    ...plan,
    approvals: {
      ...plan.approvals,
      gates: (plan.approvals?.gates ?? []).map((item) =>
        item.id === gateId ? { ...item, status, commit: commitText(status) } : item,
      ),
    },
  };
}

export function pendingMandatory(plan: ProductPlan) {
  return (plan.approvals?.gates ?? []).filter(
    (item) => item.authorization === "mandatory" && item.status === "pending",
  );
}

export function approvalMarkdown(plan: ProductPlan) {
  const gates = plan.approvals?.gates ?? [];
  if (!gates.length) return "No approval gate is waiting.";
  return gates
    .map((item) => {
      const evidence = item.evidence.map((line) => `  - ${line}`).join("\n");
      return `### ${APPROVAL_LABEL[item.kind]} (${AUTHORIZATION_LABEL[item.authorization]}, ${item.status})

AI proposes: ${item.proposal}

Evidence collected:
${evidence || "  - None named."}

Risk assessment: ${item.risk}

Human approval: ${item.status}

Commit decision: ${item.commit}`;
    })
    .join("\n\n");
}
