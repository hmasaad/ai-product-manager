import { pendingMandatory } from "./approval";
import type { AuthorizationLevel, Evidence, LoopMode, LoopStage, LoopStageId, ProductLoop, ProductPlan } from "./types";

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

export function emptyProductLoop(): ProductLoop {
  return {
    note: LOOP_NOTE,
    ascii: LOOP_ASCII,
    engineAscii: LOOP_AUTONOMOUS_ASCII,
    current: "observe",
    next: "understand",
    mode: "autonomous",
    authorization: "automatic",
    action: "The loop has not started.",
    blocker: "",
    stages: [],
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
  return {
    note: LOOP_NOTE,
    ascii: LOOP_ASCII,
    engineAscii: LOOP_AUTONOMOUS_ASCII,
    current,
    next,
    mode: modeOf(blocker),
    authorization: authorizationOf(plan, current),
    action: actionOf(plan, current, blocker),
    blocker,
    stages,
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

${body}`;
}
