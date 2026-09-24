import { pendingMandatory } from "./approval";
import type {
  AuthorizationLevel,
  Evidence,
  LoopMode,
  LoopStage,
  LoopStageId,
  Phase3Id,
  Phase3Stage,
  ProductLoop,
  ProductPlan,
  ReevalCycleId,
  ReevalCycleStage,
} from "./types";

export const LOOP_NOTE =
  "The autonomous product loop is the operating cycle. Observe through propose can run from evidence. Validate, decide, and execute wait on a person. After measure and learn, the loop observes again. The PM is an operating system, not a document printer.";

export const LOOP_QUESTION =
  "What is the loop doing now, what can it run on its own, and what still waits on a person?";

export const LOOP_ASCII = `OBSERVE
   ↓
UNDERSTAND
   ↓
DISCOVER
   ↓
ANALYZE
   ↓
PROPOSE
   ↓
VALIDATE
   ↓
DECIDE
   ↓
PLAN
   ↓
EXECUTE
   ↓
MEASURE
   ↓
LEARN
   └──────────────→ OBSERVE`;

export const LOOP_AUTONOMOUS_ASCII = `                    AUTONOMOUS PRODUCT LOOP
                             │
                          OBSERVE
                             ↓
       ┌─────────────────────┼─────────────────────┐
       ↓                     ↓                     ↓
     Monitor              Memory               Brief
       │                     │                     │
       └─────────────────────┼─────────────────────┘
                             ↓
              UNDERSTAND → DISCOVER → ANALYZE → PROPOSE
                             ↓
                      VALIDATE · DECIDE · EXECUTE
                             │
                        wait on a person
                             ↓
                 PLAN → MEASURE → LEARN → OBSERVE`;

export const REEVAL_CYCLE_NOTE =
  "When a recorded decision is challenged, the loop is observe → detect → re-evaluate → propose → approve → execute → measure → learn.";

export const REEVAL_CYCLE_ASCII = `OBSERVE
   ↓
DETECT
   ↓
RE-EVALUATE
   ↓
PROPOSE
   ↓
APPROVE
   ↓
EXECUTE
   ↓
MEASURE
   ↓
LEARN
   └──────────────→ OBSERVE`;

export const REEVAL_CYCLE_IDS: ReevalCycleId[] = [
  "observe",
  "detect",
  "reevaluate",
  "propose",
  "approve",
  "execute",
  "measure",
  "learn",
];

export const PHASE3_NOTE =
  "Phase 3 is the autonomous loop. Named product data feeds continuous monitoring. A triggered re-evaluation can open a product opportunity, a new PRD, the architect brief, and engineering work. A person still signs before a commit.";

export const PHASE3_ASCII = `Product Data
     ↓
Continuous Monitoring
     ↓
Decision Re-evaluation
     ↓
Product Opportunity
     ↓
New PRD
     ↓
AI Architect
     ↓
Engineering`;

export const PHASE3_IDS: Phase3Id[] = [
  "data",
  "monitor",
  "reevaluate",
  "opportunity",
  "prd",
  "architect",
  "engineering",
];

export const PHASE3_NAME: Record<Phase3Id, string> = {
  data: "Product Data",
  monitor: "Continuous Monitoring",
  reevaluate: "Decision Re-evaluation",
  opportunity: "Product Opportunity",
  prd: "New PRD",
  architect: "AI Architect",
  engineering: "Engineering",
};

export const REEVAL_CYCLE_LABEL: Record<ReevalCycleId, string> = {
  observe: "OBSERVE",
  detect: "DETECT",
  reevaluate: "RE-EVALUATE",
  propose: "PROPOSE",
  approve: "APPROVE",
  execute: "EXECUTE",
  measure: "MEASURE",
  learn: "LEARN",
};

export const LOOP_STAGE_IDS: LoopStageId[] = [
  "observe",
  "understand",
  "discover",
  "analyze",
  "propose",
  "validate",
  "decide",
  "plan",
  "execute",
  "measure",
  "learn",
];

export const LOOP_LABEL: Record<LoopStageId, string> = {
  observe: "OBSERVE",
  understand: "UNDERSTAND",
  discover: "DISCOVER",
  analyze: "ANALYZE",
  propose: "PROPOSE",
  validate: "VALIDATE",
  decide: "DECIDE",
  plan: "PLAN",
  execute: "EXECUTE",
  measure: "MEASURE",
  learn: "LEARN",
};

function investigating(plan: ProductPlan) {
  return plan.monitoring?.signals.find((item) => item.status === "investigating");
}

function currentOf(plan: ProductPlan): LoopStageId {
  if (investigating(plan)) return "analyze";
  if (plan.monitoring?.signals.length) {
    if (plan.analytics?.loops.length) return "measure";
    if (pendingMandatory(plan).length) return "decide";
    if (plan.decisionEngine?.record.status === "pending" && (plan.decisionEngine.options.length ?? 0) >= 2) return "decide";
    return "measure";
  }
  if (plan.maturity === "problem") return "validate";
  if (plan.analytics?.loops.length) return "measure";
  if (pendingMandatory(plan).length) return "decide";
  if (plan.proposed) return "discover";
  if (plan.decisionEngine?.record.status === "pending" && (plan.decisionEngine.options.length ?? 0) >= 2) return "decide";
  if (plan.portfolio?.record.status === "pending" && (plan.portfolio.options.length ?? 0) >= 2) return "decide";
  return "plan";
}

function nextOf(plan: ProductPlan, current: LoopStageId): LoopStageId {
  if (investigating(plan)) return "decide";
  if (current === "validate") return "decide";
  if (current === "decide") return "plan";
  if (current === "plan") return "execute";
  if (current === "execute") return "measure";
  if (current === "measure") return "learn";
  if (current === "learn") return "observe";
  if (current === "discover") return "validate";
  if (current === "analyze") return "propose";
  if (current === "propose") return "validate";
  if (current === "observe") return "understand";
  if (current === "understand") return "discover";
  return "observe";
}

function blockerOf(plan: ProductPlan, current: LoopStageId) {
  const signal = investigating(plan);
  if (signal) return `The monitor is still investigating ${signal.feature}.`;
  if (current === "validate" && plan.maturity === "problem") return "Validation first. This is not a build.";
  const pending = pendingMandatory(plan).length;
  if (pending) return `${pending} mandatory gates wait on a person.`;
  if (current === "decide" && plan.decisionEngine?.record.status === "pending") return "A person still chooses among the options.";
  if (current === "decide" && plan.portfolio?.record.status === "pending") return "A portfolio call is still pending.";
  if (current === "execute") return "Execution waits. A person still signs before a ship.";
  return "";
}

function authorizationOf(plan: ProductPlan, current: LoopStageId): AuthorizationLevel {
  if (investigating(plan)) return "review";
  if (current === "validate" && plan.maturity === "problem") return "mandatory";
  if (pendingMandatory(plan).length) return "mandatory";
  if (current === "execute") return "mandatory";
  if (current === "decide") return "review";
  return "automatic";
}

function modeOf(blocker: string): LoopMode {
  return blocker ? "waiting" : "autonomous";
}

function actionOf(plan: ProductPlan, current: LoopStageId, blocker: string) {
  const signal = investigating(plan);
  if (signal) return `${signal.investigation} A person signs before a product decision.`;
  if (current === "validate" && plan.maturity === "problem") return "Validation first. This is not a build.";
  if (current === "discover" && plan.proposed) return "The MVP is a proposal. Validate before a signed bet.";
  if (blocker) return blocker;
  if (current === "plan") return "The roadmap is ready. Execute still waits on a person.";
  if (current === "measure") {
    const decline = plan.analytics?.loops[0]?.stages.find((item) => item.id === "declining")?.text;
    return decline || "Measure the named events, then learn.";
  }
  return "The loop can keep reading evidence.";
}

function textOf(plan: ProductPlan, id: LoopStageId): { text: string; evidence: Evidence } {
  if (id === "observe") {
    const metrics = plan.monitoring?.metrics[0] ?? plan.analytics?.signals[0]?.detail;
    return {
      text: metrics ? `Metrics and feedback were read. ${metrics}` : "No live telemetry was named. Observation stays on the brief.",
      evidence: metrics ? "stated" : "unknown",
    };
  }
  if (id === "understand") {
    return { text: plan.problem.statement, evidence: "stated" };
  }
  if (id === "discover") {
    const rec = plan.recommendations[0]?.opportunity;
    return { text: rec ? `Opportunity: ${rec}` : "Discovery produced the problem and the named users.", evidence: rec ? "inferred" : "stated" };
  }
  if (id === "analyze") {
    const signal = plan.monitoring?.signals[0];
    if (signal) {
      return { text: `${signal.feature}: ${signal.change} Investigation: ${signal.investigation}`, evidence: signal.evidence };
    }
    const score = plan.opportunityScoring?.items[0];
    return {
      text: score ? `${score.opportunity} ${score.rationale}` : "Factors, conflicts, and risks were scored.",
      evidence: "inferred",
    };
  }
  if (id === "propose") {
    const option = plan.decisionEngine?.options[0]?.title;
    return { text: option ? `Options include ${option}.` : "A proposal waits on evidence.", evidence: option ? "inferred" : "unknown" };
  }
  if (id === "validate") {
    const experiment = plan.experiments[0];
    if (plan.maturity === "problem") {
      return { text: "Validation first. This is not a build.", evidence: "stated" };
    }
    return {
      text: experiment ? `${experiment.hypothesis} Decision pending: Build / Modify / Abandon.` : "Open assumptions stay labeled.",
      evidence: experiment?.evidence ?? "inferred",
    };
  }
  if (id === "decide") {
    const pending = pendingMandatory(plan).length;
    return {
      text: pending
        ? `${pending} mandatory gates wait on a person. The loop does not commit on its own.`
        : plan.decisionEngine?.record.status === "chosen"
          ? "A person recorded a choice."
          : "A person still chooses among the options.",
      evidence: "stated",
    };
  }
  if (id === "plan") {
    return { text: plan.roadmap.note || "Release buckets follow the stated scope.", evidence: "inferred" };
  }
  if (id === "execute") {
    const blocked = pendingMandatory(plan).length > 0 || plan.monitoring?.signals.some((item) => item.status === "investigating");
    return {
      text: blocked
        ? "Execution waits. Investigation or a mandatory gate is still open."
        : "The architect and developer briefs are ready.",
      evidence: "inferred",
    };
  }
  if (id === "measure") {
    const decline = plan.analytics?.loops[0]?.stages.find((item) => item.id === "declining")?.text;
    const change = plan.monitoring?.signals[0]?.change;
    return {
      text: decline || change || "No launched-feature decline was named.",
      evidence: decline || change ? "stated" : "unknown",
    };
  }
  const review = plan.decisionReevaluation?.cases.find((item) => item.verdict === "review" || item.verdict === "reconsider");
  return {
    text: review ? review.recommendation : "Learnings land on the ledger and in product memory.",
    evidence: review ? review.evidence.evidence : "inferred",
  };
}

function clip(text: string, n = 140) {
  const next = text.replace(/\s+/g, " ").trim();
  return next.length <= n ? next : `${next.slice(0, n - 1).trim()}…`;
}

function cycleCase(plan: ProductPlan) {
  const cases = plan.decisionReevaluation?.cases ?? [];
  return (
    cases.find((item) => item.updatedDecision) ??
    cases.find((item) => item.state === "UNDER_REVIEW" || item.state === "TRIGGERED") ??
    cases.find((item) => (item.whatChanged?.deltas.length ?? 0) > 0) ??
    cases[0]
  );
}

function currentCycleOf(plan: ProductPlan): ReevalCycleId {
  const item = cycleCase(plan);
  const signal = investigating(plan);
  if (item?.state === "DECISION_CHANGED") return "execute";
  if (item?.state === "DECISION_RETAINED" || item?.state === "VALIDATED") return "learn";
  if (item?.state === "UNDER_REVIEW") return "approve";
  if (item?.updatedDecision) return "learn";
  if (item && (item.state === "TRIGGERED" || (item.whatChanged?.deltas.length ?? 0) > 0)) return "reevaluate";
  if (signal) return "detect";
  return "observe";
}

function cycleText(plan: ProductPlan, id: ReevalCycleId): { text: string; evidence: Evidence } {
  const item = cycleCase(plan);
  const delta = item?.whatChanged?.deltas[0];
  const signal = investigating(plan);
  if (id === "observe") {
    const change = plan.monitoring?.signals[0]?.change;
    return {
      text: change ? clip(change) : "Watch named evidence. Do not invent telemetry.",
      evidence: change ? "stated" : "inferred",
    };
  }
  if (id === "detect") {
    if (delta) return { text: clip(`${delta.metric} ${delta.before} → ${delta.after}`), evidence: delta.evidence };
    if (item?.trigger?.statement || item?.proposal.trigger) {
      return { text: clip(item.trigger?.statement || item.proposal.trigger), evidence: item.evidence.evidence };
    }
    if (signal) return { text: clip(signal.change), evidence: "stated" };
    return { text: "No contradicting evidence was named.", evidence: "unknown" };
  }
  if (id === "reevaluate") {
    const assumption = item?.whatChanged?.assumption;
    if (assumption) return { text: clip(`${assumption.id}: ${assumption.statement} — ${assumption.status}`), evidence: "inferred" };
    if (item?.assumption) return { text: clip(item.assumption), evidence: "inferred" };
    return { text: "Re-evaluation has not opened.", evidence: "unknown" };
  }
  if (id === "propose") {
    const action = item?.whatChanged?.action || item?.proposal?.proposedAction;
    return {
      text: action ? clip(action) : "No proposal was written.",
      evidence: action ? "stated" : "unknown",
    };
  }
  if (id === "approve") {
    return {
      text:
        item?.state === "UNDER_REVIEW"
          ? "A person is reviewing the recorded decision."
          : "A person still owns the recorded decision.",
      evidence: "inferred",
    };
  }
  if (id === "execute") {
    return {
      text:
        item?.state === "DECISION_CHANGED"
          ? "The new version is ready for the architect and developer."
          : "Execute waits on approval.",
      evidence: "inferred",
    };
  }
  if (id === "measure") {
    const after = delta?.after;
    return {
      text: after ? clip(`Current: ${delta?.metric} ${after}`) : "No post-change metric was named.",
      evidence: after ? "stated" : "unknown",
    };
  }
  return {
    text: item?.updatedDecision ? clip(item.updatedDecision) : "Learnings wait on the next observation.",
    evidence: item?.updatedDecision ? "stated" : "inferred",
  };
}

function phase3Case(plan: ProductPlan) {
  return cycleCase(plan);
}

function currentPhase3Of(plan: ProductPlan): Phase3Id {
  const item = phase3Case(plan);
  const signal = investigating(plan);
  if (item?.state === "DECISION_CHANGED") return "opportunity";
  if (item?.state === "TRIGGERED" || item?.state === "UNDER_REVIEW") return "reevaluate";
  if (signal) return "monitor";
  if (plan.maturity === "problem") return "data";
  if (plan.proposed) return "opportunity";
  if ((plan.monitoring?.signals.length ?? 0) > 0) return "monitor";
  return "data";
}

function phase3Finding(plan: ProductPlan, id: Phase3Id): { finding: string; evidence: Evidence } {
  const item = phase3Case(plan);
  const delta = item?.whatChanged?.deltas[0];
  const deltaText = delta ? `${delta.metric} ${delta.before} → ${delta.after}` : "";
  const signal = investigating(plan) ?? plan.monitoring?.signals[0];
  const analytics = plan.analytics?.signals[0]?.detail;
  if (id === "data") {
    const text = deltaText || analytics || signal?.change || "";
    return {
      finding: text ? clip(text) : "No live product data was named.",
      evidence: text ? (delta?.evidence ?? "stated") : "unknown",
    };
  }
  if (id === "monitor") {
    const text = signal?.change || deltaText || "";
    return {
      finding: text ? clip(text) : "Continuous monitoring has no named anomaly.",
      evidence: text ? "stated" : "unknown",
    };
  }
  if (id === "reevaluate") {
    return {
      finding: deltaText
        ? clip(`${item?.whatChanged.title ?? "Decision"} — ${deltaText}`)
        : "No recorded decision has new contradicting evidence.",
      evidence: deltaText ? (delta?.evidence ?? "stated") : "unknown",
    };
  }
  if (id === "opportunity") {
    const action = item?.whatChanged?.action || item?.proposal?.proposedAction;
    const opportunity = plan.recommendations[0]?.opportunity || plan.opportunityScoring?.items[0]?.opportunity || "";
    const text = action || opportunity;
    return {
      finding: text ? clip(text) : "No opportunity was scored.",
      evidence: text ? (action ? "stated" : "inferred") : "unknown",
    };
  }
  if (id === "prd") {
    if (plan.maturity === "problem") {
      return { finding: "Validation first. This is not a build.", evidence: "inferred" };
    }
    const overview = plan.prd?.overview || plan.prd?.problemStatement || plan.title;
    return {
      finding: overview ? clip(`PRD: ${overview}`) : "A new PRD waits on the opportunity.",
      evidence: overview ? "inferred" : "unknown",
    };
  }
  if (id === "architect") {
    if (plan.maturity === "problem") {
      return { finding: "The architect brief stays gated on validation.", evidence: "inferred" };
    }
    const constraint = plan.constraints[0] || plan.discovery.constraints[0]?.text || "";
    return {
      finding: constraint ? clip(constraint) : "The architect brief is ready.",
      evidence: constraint ? "stated" : "inferred",
    };
  }
  if (plan.maturity === "problem") {
    return { finding: "Engineering waits. This is not a build.", evidence: "inferred" };
  }
  const pending = pendingMandatory(plan)[0];
  return {
    finding: pending ? clip(`Engineering waits: ${pending.proposal}`) : "The developer brief is ready.",
    evidence: pending ? "stated" : "inferred",
  };
}

export function emptyProductLoop(): ProductLoop {
  return {
    note: LOOP_NOTE,
    ascii: LOOP_ASCII,
    engineAscii: LOOP_AUTONOMOUS_ASCII,
    cycleNote: REEVAL_CYCLE_NOTE,
    cycleAscii: REEVAL_CYCLE_ASCII,
    phase3Note: PHASE3_NOTE,
    phase3Ascii: PHASE3_ASCII,
    current: "observe",
    next: "understand",
    currentCycle: "observe",
    currentPhase3: "data",
    mode: "autonomous",
    authorization: "automatic",
    action: "The loop has not started.",
    blocker: "",
    stages: [],
    cycle: [],
    phase3: [],
  };
}

export function buildProductLoop(plan: ProductPlan): ProductLoop {
  const current = currentOf(plan);
  const next = nextOf(plan, current);
  const blocker = blockerOf(plan, current);
  const currentIndex = LOOP_STAGE_IDS.indexOf(current);
  const stages: LoopStage[] = LOOP_STAGE_IDS.map((id, index) => {
    const body = textOf(plan, id);
    return {
      id,
      label: LOOP_LABEL[id],
      text: body.text,
      status: index < currentIndex ? "done" : index === currentIndex ? "current" : "waiting",
      evidence: body.evidence,
    };
  });
  const currentCycle = currentCycleOf(plan);
  const cycleIndex = REEVAL_CYCLE_IDS.indexOf(currentCycle);
  const cycle: ReevalCycleStage[] = REEVAL_CYCLE_IDS.map((id, index) => {
    const body = cycleText(plan, id);
    return {
      id,
      label: REEVAL_CYCLE_LABEL[id],
      text: body.text,
      status: index < cycleIndex ? "done" : index === cycleIndex ? "current" : "waiting",
      evidence: body.evidence,
    };
  });
  const currentPhase3 = currentPhase3Of(plan);
  const phase3Index = PHASE3_IDS.indexOf(currentPhase3);
  const phase3: Phase3Stage[] = PHASE3_IDS.map((id, index) => {
    const body = phase3Finding(plan, id);
    return {
      id,
      name: PHASE3_NAME[id],
      finding: body.finding,
      status: index < phase3Index ? "done" : index === phase3Index ? "current" : "waiting",
      evidence: body.evidence,
    };
  });
  return {
    note: LOOP_NOTE,
    ascii: LOOP_ASCII,
    engineAscii: LOOP_AUTONOMOUS_ASCII,
    cycleNote: REEVAL_CYCLE_NOTE,
    cycleAscii: REEVAL_CYCLE_ASCII,
    phase3Note: PHASE3_NOTE,
    phase3Ascii: PHASE3_ASCII,
    current,
    next,
    currentCycle,
    currentPhase3,
    mode: modeOf(blocker),
    authorization: authorizationOf(plan, current),
    action: actionOf(plan, current, blocker),
    blocker,
    stages,
    cycle,
    phase3,
  };
}

export function applyLoopAdvance(plan: ProductPlan): ProductPlan {
  const open = plan.monitoring?.signals.some((item) => item.status === "investigating");
  if (!open) return plan;
  const next: ProductPlan = {
    ...plan,
    monitoring: {
      ...plan.monitoring,
      signals: plan.monitoring.signals.map((item) =>
        item.status === "investigating" ? { ...item, status: "approved" } : item,
      ),
    },
  };
  return { ...next, productLoop: buildProductLoop(next) };
}

export function loopMarkdown(plan: ProductPlan) {
  const board = plan.productLoop;
  if (!board?.stages.length) return "The product loop has not run.";
  const body = board.stages
    .map((item) => `- ${item.label} [${item.status}]: ${item.text}`)
    .join("\n");
  return `${board.note}

${LOOP_QUESTION}

\`\`\`
${board.engineAscii}
\`\`\`

\`\`\`
${board.ascii}
\`\`\`

Current: ${LOOP_LABEL[board.current]}
Next: ${LOOP_LABEL[board.next]}
Mode: ${board.mode}
Authorization: ${board.authorization}
Action: ${board.action}
${board.blocker ? `Blocked: ${board.blocker}` : ""}

${board.cycleNote}

\`\`\`
${board.cycleAscii}
\`\`\`

Cycle: ${REEVAL_CYCLE_LABEL[board.currentCycle]}

${(board.cycle ?? []).map((item) => `- ${item.label} [${item.status}]: ${item.text}`).join("\n")}

${board.phase3Note}

\`\`\`
${board.phase3Ascii}
\`\`\`

Phase 3: ${PHASE3_NAME[board.currentPhase3]}

${(board.phase3 ?? []).map((item) => `- ${item.name} [${item.status}]: ${item.finding}`).join("\n")}

${body}`;
}
