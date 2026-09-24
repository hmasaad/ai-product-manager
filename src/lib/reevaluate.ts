import type {
  DecisionFact,
  DecisionReevaluation,
  DecisionState,
  Evidence,
  LedgerEntry,
  ProductMemory,
  ProductPlan,
  ReevaluationCase,
  ReevaluationChannel,
  ReevaluationComparison,
  ReevaluationImpact,
  ReevaluationOption,
  ReevaluationPriorityBand,
  ReevaluationProposal,
  ReevaluationScore,
  ReevaluationScoreFactor,
  ReevaluationStage,
  ReevaluationTrigger,
  ReevaluationTriggerKind,
  ReevaluationVerdict,
  WhatChangedAssumption,
  WhatChangedDelta,
  WhatChangedView,
} from "./types";
import { buildProductLoop } from "./loop";
import { buildOrchestration } from "./orchestrate";
import { buildVersioning } from "./versioning";

export const REEVAL_NOTE =
  "What Changed? is the re-evaluation screen. It names the before and after, the assumption that no longer holds, and the action a person should review. A person still owns Keep Decision, Review, or Change Decision. A change writes a new decision. The old record stays.";

export const CHANGED_NOTE =
  "What Changed? is the central re-evaluation card. It shows the stated deltas, the affected assumption, and the proposed action. It is not a long model writeup.";

export const CHANGED_ASCII = `Decision
   │
   ↓
What Changed?
   │
   ├──── Offline usage
   ├──── Support requests
   └──── Customer segment
   │
   ↓
Affected assumption
   │
   ↓
Proposed action
   │
   ↓
Review Decision`;

export const CHANGED_STATUS = "No longer strongly supported";

export const REEVAL_QUESTION =
  "The engine wrote a proposal. Should a person keep the recorded decision, review it, or change it?";

export const REEVAL_OWNER = "human" as const;

export const DECISION_STATES: DecisionState[] = [
  "ACTIVE",
  "TRIGGERED",
  "UNDER_REVIEW",
  "VALIDATED",
  "DECISION_CHANGED",
  "DECISION_RETAINED",
];

export const STATE_ASCII = `                    ACTIVE
                       │
                       ↓
                    TRIGGERED
                       │
                       ↓
                  UNDER_REVIEW
                       │
          ┌────────────┼────────────┐
          ↓            ↓            ↓
      VALIDATED  DECISION_CHANGED  DECISION_RETAINED`;

export const STATE_LABEL: Record<DecisionState, string> = {
  ACTIVE: "Active",
  TRIGGERED: "Triggered",
  UNDER_REVIEW: "Under review",
  VALIDATED: "Validated",
  DECISION_CHANGED: "Decision changed",
  DECISION_RETAINED: "Decision retained",
};

export const REEVAL_ASCII = `                    Trigger
                       │
                       ↓
            Retrieve original decision
                       │
                       ↓
            Retrieve supporting evidence
                       │
                       ↓
            Retrieve original assumptions
                       │
                       ↓
               Collect new evidence
                       │
                       ↓
             Compare old vs new state
                       │
                       ↓
            Identify changed assumptions
                       │
                       ↓
                 Calculate impact
                       │
                       ↓
              Generate re-evaluation`;

export const PIPELINE_STEPS: ReevaluationStage[] = [
  { id: "trigger", label: "Trigger", text: "" },
  { id: "decision", label: "Retrieve original decision", text: "" },
  { id: "evidence", label: "Retrieve supporting evidence", text: "" },
  { id: "assumptions", label: "Retrieve original assumptions", text: "" },
  { id: "collect", label: "Collect new evidence", text: "" },
  { id: "compare", label: "Compare old vs new state", text: "" },
  { id: "changed", label: "Identify changed assumptions", text: "" },
  { id: "impact", label: "Calculate impact", text: "" },
  { id: "generate", label: "Generate re-evaluation", text: "" },
];

export const TRIGGER_KINDS: ReevaluationTriggerKind[] = ["metric", "feedback", "business", "technical", "time", "dependency"];

export const TRIGGER_LABEL: Record<ReevaluationTriggerKind, string> = {
  metric: "Metric trigger",
  feedback: "Feedback trigger",
  business: "Business trigger",
  technical: "Technical trigger",
  time: "Time trigger",
  dependency: "Dependency trigger",
};

export const REEVAL_WARNING = "Previous assumption may be invalid.";

export const SCORE_NOTE =
  "Re-evaluation priority is Evidence Change × Decision Impact × Confidence × Business Exposure. Each factor is a 0–1 signal with a reason. Unnamed factors stay unnamed, and the product stays unnamed until every factor is present.";

export const SCORE_ASCII = `Re-evaluation Priority
         =
   Evidence Change
         ×
   Decision Impact
         ×
    Confidence
         ×
  Business Exposure`;

export const SCORE_EQUATION = "priority = evidenceChange × decisionImpact × confidence × businessExposure";

export const PRIORITY_BANDS: ReevaluationPriorityBand[] = ["low", "medium", "high", "critical"];

export const PRIORITY_LABEL: Record<ReevaluationPriorityBand, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  critical: "Critical",
};

export const PRIORITY_THRESHOLDS = [
  { band: "low" as const, below: 0.2 },
  { band: "medium" as const, below: 0.4 },
  { band: "high" as const, below: 0.7 },
  { band: "critical" as const, below: 1.01 },
];

export const IMPACT_WEIGHT: Record<ReevaluationImpact, number> = {
  high: 0.8,
  medium: 0.5,
  low: 0.25,
};

export const OFFLINE_AFFECTED = ["Offline architecture", "Sync strategy", "Data caching", "Product roadmap"];

export const REEVAL_OPTIONS: ReevaluationOption[] = [
  {
    id: "maintain",
    title: "Keep Decision",
    summary: "The recorded decision still holds. The engine leaves it in place.",
  },
  {
    id: "review",
    title: "Review",
    summary: "A person re-reads the decision against the new evidence. The recorded choice stays.",
  },
  {
    id: "reconsider",
    title: "Change Decision",
    summary: "A person authorizes a change. The engine does not write the new choice on its own.",
  },
];

export const REEVAL_LABEL: Record<ReevaluationVerdict, string> = {
  maintain: "Keep Decision",
  review: "Review",
  reconsider: "Change Decision",
};

export const REEVAL_CHANNEL_LABEL: Record<ReevaluationChannel, string> = {
  analytics: "Analytics",
  feedback: "Feedback",
  constraints: "New Constraints",
};

function fact(text: string, evidence: Evidence = "stated"): DecisionFact {
  return { text, evidence };
}

function channelOf(text: string): ReevaluationChannel {
  if (/no longer (holds|valid|true)|now have continuous|now have reliable|constraint/i.test(text)) return "constraints";
  if (/\b(said|asked|complain|feedback|support request)/i.test(text)) return "feedback";
  return "analytics";
}

function needsAttention(verdict: ReevaluationVerdict) {
  return verdict === "review" || verdict === "reconsider";
}

export function emptyDecisionReevaluation(): DecisionReevaluation {
  return {
    note: REEVAL_NOTE,
    ascii: REEVAL_ASCII,
    question: REEVAL_QUESTION,
    owner: REEVAL_OWNER,
    triggerKinds: TRIGGER_KINDS,
    states: DECISION_STATES,
    stateAscii: STATE_ASCII,
    scoreNote: SCORE_NOTE,
    scoreAscii: SCORE_ASCII,
    scoreEquation: SCORE_EQUATION,
    priorityBands: PRIORITY_BANDS,
    whatChangedNote: CHANGED_NOTE,
    whatChangedAscii: CHANGED_ASCII,
    stages: PIPELINE_STEPS,
    channels: [],
    options: REEVAL_OPTIONS,
    cases: [],
  };
}

export function parseDecisionNumbers(source: string) {
  const found = new Set<number>();
  const matcher = /(?:Decision\s*#|DEC-)\s*(\d+)/gi;
  let match: RegExpExecArray | null;
  while ((match = matcher.exec(source))) found.add(Number(match[1]));
  return [...found];
}

export function parseOriginalAssumptions(source: string) {
  const lines: string[] = [];
  const block = /Original assumptions?:\s*\n([\s\S]*?)(?=\n\s*(?:\d+\s+months later|New evidence|Offline usage|Decision\s*#|Question:|Options:|Evidence:|Observations?:|Constraints:|Risks:|Assumptions:|Original Decision:|Trigger:|Changed Assumption:|Proposed Action:|Decision:|Reason:|Confidence:|Original:|Current:|Change:)|$)/i.exec(
    `${source}\n`,
  );
  const body = block?.[1] ?? "";
  for (const line of body.split("\n")) {
    const clean = line.replace(/^[-*•]\s*/, "").trim();
    if (clean.length > 3) lines.push(clean);
  }
  const inline = /Original assumption:\s*([^\n]+)/i.exec(source);
  if (inline?.[1] && !lines.includes(inline[1].trim())) lines.push(inline[1].trim());
  return lines;
}

function parseNewEvidence(plan: ProductPlan, memory?: ProductMemory): DecisionFact[] {
  const facts: DecisionFact[] = [];
  const addLine = (text: string, evidence: Evidence = "stated") => {
    const clean = text.replace(/\s+/g, " ").trim();
    if (clean.length < 4) return;
    facts.push(fact(/[.]$/.test(clean) ? clean : `${clean}.`, evidence));
  };
  const source = plan.sourceText.replace(
    /(?:Metric|Feedback|Business|Technical|Time|Dependency)\s+trigger\s*:?\s*\n\s*[^\n]+/gi,
    "",
  );
  const usage = source.match(/offline usage increased[^\n.]*/i)?.[0];
  if (usage) addLine(usage);
  const stale = source.match(/[^\n.]*(?:no longer (?:holds|valid|true)|now have continuous|now have reliable)[^\n.]*/i)?.[0];
  if (stale) addLine(stale);
  const complaints = source.match(/offline[- ]related complaints[^\n.]*/i)?.[0] ?? source.match(/complaints this month[^\n.]*/i)?.[0];
  if (complaints) addLine(complaints);
  const segment = source.match(/[^\n.]*(?:new customer segment requires offline)[^\n.]*/i)?.[0];
  if (segment) addLine(segment);
  const sync = source.match(/[^\n.]*(?:new sync infrastructure becomes available)[^\n.]*/i)?.[0];
  if (sync) addLine(sync);
  const elapsed = source.match(/(\d+)\s+months later[^\n.]*/i)?.[0] ?? source.match(/(\d+)\s+days later[^\n.]*/i)?.[0];
  if (elapsed) addLine(elapsed);
  const api = source.match(/[^\n.]*(?:underlying api architecture changed|api architecture changed)[^\n.]*/i)?.[0];
  if (api) addLine(api);
  const current = source.match(/Current:\s*(\d+(?:\.\d+)?)\s*%/i);
  if (current) addLine(`Current: ${current[1]}%.`);
  for (const loop of plan.analytics?.loops ?? []) {
    const decline = loop.stages.find((item) => item.id === "declining")?.text;
    if (decline && /offline usage increased|no longer (holds|valid)/i.test(decline)) addLine(decline, "stated");
  }
  for (const signal of plan.monitoring?.signals ?? []) {
    if (/offline usage|no longer (holds|valid)|now have continuous/i.test(`${signal.change} ${signal.investigation}`)) {
      addLine(signal.change, signal.evidence);
    }
  }
  for (const item of memory?.items ?? []) {
    if (item.kind !== "metric" && item.kind !== "feedback") continue;
    if (/offline usage increased|no longer (holds|valid)|now have continuous/i.test(item.text)) {
      addLine(item.text, item.evidence);
    }
  }
  const seen = new Set<string>();
  return facts.filter((item) => {
    const key = item.text.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function elapsedDays(evidence: string) {
  const months = /(\d+)\s+months later/i.exec(evidence);
  if (months) return Number(months[1]) * 30;
  const days = /(\d+)\s+days later/i.exec(evidence);
  if (days) return Number(days[1]);
  return null;
}

function compare(value: number, operator: ReevaluationTrigger["operator"], threshold: number) {
  if (operator === ">=") return value >= threshold;
  if (operator === "<=") return value <= threshold;
  if (operator === "<") return value < threshold;
  if (operator === "=") return value === threshold;
  return value > threshold;
}

export function triggerFired(trigger: string | ReevaluationTrigger, evidence: string) {
  const statement = typeof trigger === "string" ? trigger : trigger.statement;
  const kind = typeof trigger === "string" ? undefined : trigger.kind;
  const blob = evidence.replace(/\s+/g, " ");
  if (/offline usage increases/i.test(statement) && /offline usage increased/i.test(blob)) return true;
  if (/connectivity assumption no longer holds/i.test(statement) && /no longer (holds|valid)|now have continuous|now have reliable/i.test(blob)) {
    return true;
  }
  const threshold = /offline_usage\s*(>=|<=|>|<|=)\s*(\d+(?:\.\d+)?)%?/i.exec(statement);
  if (threshold) {
    const value =
      blob.match(/offline usage increased(?:\s+to)?\s+(\d+(?:\.\d+)?)\s*%/i) ??
      blob.match(/Current:\s*(\d+(?:\.\d+)?)\s*%/i) ??
      blob.match(/\boffline_usage\b[^\d]{0,12}(\d+(?:\.\d+)?)/i);
    return value ? compare(Number(value[1]), threshold[1] as ReevaluationTrigger["operator"], Number(threshold[2])) : false;
  }
  const support = /(?:support_requests_offline|offline[- ]related complaints)\s*(>=|<=|>|<|=)\s*(\d+)/i.exec(statement);
  if (support) {
    const value = blob.match(/(?:complaints|support)[^\d]{0,32}(\d+)/i);
    return value ? compare(Number(value[1]), support[1] as ReevaluationTrigger["operator"], Number(support[2])) : false;
  }
  if ((kind === "feedback" || /complaints?\s*>\s*\d+/i.test(statement)) && /(\d+)\s*(?:\/\s*month|per month|this month)/i.test(blob)) {
    const need = /(\d+)/.exec(statement);
    const have = /(\d+)/.exec(blob);
    return need && have ? Number(have[1]) > Number(need[1]) : /complaints/i.test(blob);
  }
  if ((kind === "business" || /new customer segment requires offline/i.test(statement)) && /new customer segment requires offline/i.test(blob)) {
    return true;
  }
  if ((kind === "technical" || /new sync infrastructure/i.test(statement)) && /new sync infrastructure becomes available/i.test(blob)) {
    return true;
  }
  if (kind === "time" || /after\s+\d+\s+days/i.test(statement)) {
    const need = typeof trigger === "string" ? Number(/after\s+(\d+)\s+days/i.exec(statement)?.[1] ?? 0) : trigger.days ?? Number(/after\s+(\d+)\s+days/i.exec(statement)?.[1] ?? 0);
    const have = elapsedDays(blob);
    return need > 0 && have != null ? have >= need : false;
  }
  if ((kind === "dependency" || /api architecture changed/i.test(statement)) && /api architecture changed/i.test(blob)) {
    return true;
  }
  if (typeof trigger !== "string" && trigger.threshold != null && trigger.metric) {
    const value = blob.match(new RegExp(`${trigger.metric}[^\\d]{0,12}(\\d+(?:\\.\\d+)?)`, "i")) ?? blob.match(/offline usage increased(?:\s+to)?\s+(\d+(?:\.\d+)?)\s*%/i);
    return value ? compare(Number(value[1]), trigger.operator, trigger.threshold) : false;
  }
  return false;
}

function triggerTouchesAssumption(assumption: string, trigger: string | ReevaluationTrigger) {
  const statement = typeof trigger === "string" ? trigger : trigger.statement;
  const kind = typeof trigger === "string" ? undefined : trigger.kind;
  if (kind === "time" || kind === "business" || kind === "technical" || kind === "dependency") return true;
  if (/offline|connectivity|internet|cell signal/i.test(statement)) {
    return /offline|connectivity|internet|cell signal|rarely (need|use)|significant user need|usage is low|usually present|usually available/i.test(assumption);
  }
  return /support request|complaint/i.test(statement) && /support|offline|need/i.test(assumption);
}

function assumptionChanged(assumption: string, evidence: string, triggers: Array<string | ReevaluationTrigger> = []) {
  if (triggers.some((item) => triggerFired(item, evidence) && triggerTouchesAssumption(assumption, item))) return true;
  if (/rarely (need|use) offline|not a significant user need|don'?t need offline|offline usage is low|connectivity is usually (present|available)|usually have connectivity/i.test(assumption) && /offline usage increased|Current:\s*\d/i.test(evidence)) return true;
  if (/without cell signal|full shift/i.test(assumption) && /no longer (holds|valid)|now have continuous|now have reliable/i.test(evidence)) {
    return /cell signal|lte|offline|shift/i.test(evidence);
  }
  return false;
}

function verdictOf(assumption: string, evidence: string, triggers: Array<string | ReevaluationTrigger> = []): ReevaluationVerdict {
  if (/no longer (holds|valid|true)|now have continuous|now have reliable/i.test(evidence)) return "reconsider";
  if (assumptionChanged(assumption, evidence, triggers)) return "review";
  return "maintain";
}

function percentOf(text: string) {
  const match = text.match(/(\d+(?:\.\d+)?)\s*%/);
  return match ? Number(match[1]) : null;
}

function labeledLine(source: string, name: string) {
  const match = new RegExp(`(?:^|\\n)\\s*${name}\\s*:\\s*([^\\n]+)`, "i").exec(source);
  return match?.[1]?.trim() ?? "";
}

function originalValue(source: string, observation: string, entry?: LedgerEntry) {
  const labeled = percentOf(labeledLine(source, "Original"));
  if (labeled != null) return labeled;
  const fromObservation = percentOf(observation);
  if (fromObservation != null) return fromObservation;
  for (const item of entry?.observations ?? []) {
    if (typeof item.value === "number" && /offline/i.test(`${item.metric} ${item.statement} ${item.text}`)) return item.value;
    const pct = percentOf(item.statement || item.text);
    if (pct != null) return pct;
  }
  return null;
}

function currentValue(source: string, evidence: string) {
  const labeled = percentOf(labeledLine(source, "Current"));
  if (labeled != null) return labeled;
  return percentOf(evidence);
}

function changeValue(source: string, original: number | null, current: number | null) {
  const labeled = labeledLine(source, "Change");
  const stated = /([+-]?\d+(?:\.\d+)?)\s*percentage points/i.exec(labeled);
  if (stated) return Number(stated[1]);
  if (original != null && current != null) return Math.round((current - original) * 10) / 10;
  return null;
}

function impactOf(source: string, change: number | null, current: number | null, threshold: number | undefined, verdict: ReevaluationVerdict): ReevaluationImpact {
  const labeled = labeledLine(source, "Impact").toLowerCase();
  if (/^high/.test(labeled)) return "high";
  if (/^medium/.test(labeled)) return "medium";
  if (/^low/.test(labeled)) return "low";
  if (change != null && Math.abs(change) >= 15) return "high";
  if (current != null && threshold != null && current > threshold) return "high";
  if (verdict === "reconsider") return "high";
  if (change != null && Math.abs(change) >= 5) return "medium";
  if (verdict === "review") return "medium";
  return "low";
}

function buildComparison(input: {
  source: string;
  assumption: string;
  observation: string;
  evidence: string;
  entry?: LedgerEntry;
  trigger?: ReevaluationTrigger;
  verdict: ReevaluationVerdict;
}): ReevaluationComparison {
  const original = originalValue(input.source, input.observation, input.entry);
  const current = currentValue(input.source, input.evidence);
  const change = changeValue(input.source, original, current);
  const affected =
    labeledLine(input.source, "Affected assumption") ||
    input.entry?.assumptions.find((item) => (item.statement || item.text) === input.assumption)?.id ||
    input.entry?.assumptions[0]?.id ||
    "";
  const impact = impactOf(input.source, change, current, input.trigger?.threshold, input.verdict);
  const required = /required/i.test(labeledLine(input.source, "Re-evaluation")) || input.verdict === "review" || input.verdict === "reconsider";
  const changeLabel =
    labeledLine(input.source, "Change") ||
    (change != null ? `${change > 0 ? "+" : ""}${change} percentage points` : input.evidence);
  return {
    originalAssumption: labeledLine(input.source, "Original assumption") || input.assumption,
    affectedAssumptionId: affected,
    original,
    current,
    change,
    changeLabel,
    impact,
    reevaluation: required ? "required" : "not required",
  };
}

function parseWhatChangedBlock(source: string): WhatChangedDelta[] {
  const block =
    /What changed:\s*\n([\s\S]*?)(?=\n\s*(?:Assumption:|Changed Assumption:|Trigger:|Impact:|Proposed Action:|Decision:|Confidence:|Re-evaluation:|Metric trigger)|$)/i.exec(
      `${source}\n`,
    );
  if (!block?.[1]) return [];
  const lines = block[1]
    .split("\n")
    .map((line) => line.replace(/^[-*•]\s*/, "").trim())
    .filter(Boolean);
  const deltas: WhatChangedDelta[] = [];
  for (let index = 0; index < lines.length; index += 1) {
    const labeled = /^([^:]+):\s*(.+?)\s*(?:→|->|—>|–>)\s*(.+)$/.exec(lines[index]);
    if (labeled) {
      deltas.push({ metric: labeled[1].trim(), before: labeled[2].trim(), after: labeled[3].trim(), evidence: "stated" });
      continue;
    }
    const arrow = /^(.*?)\s*(?:→|->|—>|–>)\s*(.+)$/.exec(lines[index]);
    if (arrow && index > 0 && !/(?:→|->|—>|–>)/.test(lines[index - 1] ?? "")) {
      deltas.push({
        metric: lines[index - 1],
        before: arrow[1].trim(),
        after: arrow[2].trim(),
        evidence: "stated",
      });
    }
  }
  return deltas;
}

function decisionTitleOf(source: string, decision: string, question: string) {
  const labeled = labeledLine(source, "Decision title");
  if (labeled) return labeled;
  if (/offline report/i.test(`${decision} ${question}`)) return "Offline Reporting";
  return decision || question || "Recorded decision";
}

function buildWhatChanged(input: {
  source: string;
  decision: string;
  question: string;
  comparison: ReevaluationComparison;
  proposal: ReevaluationProposal;
  changed: boolean;
}): WhatChangedView {
  const stated = parseWhatChangedBlock(input.source);
  const deltas = stated.length
    ? stated
    : input.comparison.original != null && input.comparison.current != null
      ? [
          {
            metric: /offline/i.test(`${input.source} ${input.decision} ${input.proposal.trigger}`)
              ? "Offline usage"
              : "Named metric",
            before: `${input.comparison.original}%`,
            after: `${input.comparison.current}%`,
            evidence: "stated" as const,
          },
        ]
      : [];
  const assumption: WhatChangedAssumption | null = input.proposal.changedAssumption
    ? {
        id: input.comparison.affectedAssumptionId,
        statement: input.proposal.changedAssumption,
        status: input.changed ? CHANGED_STATUS : "Still supported",
      }
    : null;
  return {
    title: decisionTitleOf(input.source, input.proposal.originalDecision || input.decision, input.question),
    deltas,
    assumption,
    action: input.proposal.proposedAction,
  };
}

function fillPipeline(input: {
  trigger?: ReevaluationTrigger;
  decision: string;
  observation: string;
  assumption: string;
  evidence: string;
  comparison: ReevaluationComparison;
  verdict: ReevaluationVerdict;
}): ReevaluationStage[] {
  return PIPELINE_STEPS.map((step) => {
    const text =
      step.id === "trigger"
        ? input.trigger
          ? `${input.trigger.kind}: ${input.trigger.statement}`
          : "A stored trigger fired."
        : step.id === "decision"
          ? input.decision || "The recorded decision was retrieved."
          : step.id === "evidence"
            ? input.observation || "No original observation was stored."
            : step.id === "assumptions"
              ? input.assumption
              : step.id === "collect"
                ? input.evidence
                : step.id === "compare"
                  ? `Original: ${input.comparison.original ?? "unnamed"}. Current: ${input.comparison.current ?? "unnamed"}. Change: ${input.comparison.changeLabel}`
                  : step.id === "changed"
                    ? `${input.comparison.affectedAssumptionId || "Assumption"} · ${input.comparison.originalAssumption}`
                    : step.id === "impact"
                      ? input.comparison.impact
                      : input.comparison.reevaluation === "required"
                        ? REEVAL_LABEL[input.verdict]
                        : "Not required";
    return { ...step, text };
  });
}

export function parseSuccessorId(source: string, current: number) {
  const labeled = /Successor:\s*DEC-(\d+)/i.exec(source);
  if (labeled) {
    const number = Number(labeled[1]);
    return number !== current ? `DEC-${number}` : undefined;
  }
  const after = /DECISION_CHANGED[\s\S]{0,48}DEC-(\d+)/i.exec(source);
  if (after) {
    const number = Number(after[1]);
    return number !== current ? `DEC-${number}` : undefined;
  }
  return undefined;
}

function walkHistory(history: DecisionState[] | undefined, next: DecisionState): DecisionState[] {
  const path: DecisionState[] = history?.length ? [...history] : ["ACTIVE"];
  const terminals: DecisionState[] = ["VALIDATED", "DECISION_CHANGED", "DECISION_RETAINED"];
  if (terminals.includes(next) && path[path.length - 1] !== "UNDER_REVIEW") path.push("UNDER_REVIEW");
  if (path[path.length - 1] !== next) path.push(next);
  return path;
}

function nextState(current: DecisionState | undefined, verdict: ReevaluationVerdict): DecisionState {
  if (verdict === "review") return "UNDER_REVIEW";
  if (verdict === "reconsider") return "DECISION_CHANGED";
  return current === "UNDER_REVIEW" ? "VALIDATED" : "DECISION_RETAINED";
}

function labelOf(entry: Pick<LedgerEntry, "decisionId" | "number" | "version">) {
  return `${entry.decisionId || `DEC-${entry.number}`} v${entry.version ?? 1}`;
}

function latestOf(entries: LedgerEntry[], number: number) {
  return [...entries].filter((row) => row.number === number).sort((a, b) => (b.version ?? 1) - (a.version ?? 1))[0];
}

function statedVersion(source: string, number: number, version: number) {
  const block = new RegExp(`DEC-${number}\\s*v${version}\\s*\\n([\\s\\S]*?)(?=\\n\\s*DEC-\\d+\\s*v\\d+|\\n\\s*Decision\\s*#|$)`, "i").exec(`${source}\n`);
  if (!block) return { decision: "", reason: "" };
  const body = block[1] ?? "";
  const decision = /(?:^|\n)\s*Decision:\s*([^\n]+)/i.exec(body)?.[1]?.trim() ?? "";
  const reasonBlock = /(?:^|\n)\s*Reason:\s*\n([\s\S]*?)(?=\n\s*[A-Z][a-z][A-Za-z ]*:|$)/i.exec(body)?.[1] ?? "";
  const reason = reasonBlock
    .split("\n")
    .map((line) => line.replace(/^[-*•]\s*/, "").trim())
    .filter(Boolean)
    .join(" ");
  return { decision, reason };
}

function successorEntry(old: LedgerEntry, number: number): LedgerEntry {
  const predecessor = labelOf(old);
  return {
    decisionId: `DEC-${number}`,
    number,
    version: 1,
    id: `LEDGER-${number}-v1`,
    kind: old.kind,
    question: old.question,
    options: old.options,
    evidence: [],
    observations: [],
    constraints: old.constraints,
    risks: [],
    assumptions: old.assumptions,
    reviewTriggers: old.reviewTriggers,
    triggers: old.triggers,
    decision: "",
    decisionConfidence: null,
    reason: `Successor of ${predecessor}. The recorded choice on ${predecessor} stays. The new choice is still unnamed.`,
    owner: old.owner,
    date: "",
    status: "open",
    lifecycle: "open",
    state: "ACTIVE",
    stateHistory: ["ACTIVE"],
    predecessorId: predecessor,
    replacesId: predecessor,
  };
}

function versionEntry(old: LedgerEntry, version: number, stated: { decision: string; reason: string }): LedgerEntry {
  const from = labelOf(old);
  return {
    decisionId: old.decisionId || `DEC-${old.number}`,
    number: old.number,
    version,
    id: `LEDGER-${old.number}-v${version}`,
    kind: old.kind,
    question: old.question,
    options: old.options,
    evidence: [],
    observations: [],
    constraints: old.constraints,
    risks: [],
    assumptions: old.assumptions,
    reviewTriggers: old.reviewTriggers,
    triggers: old.triggers,
    decision: stated.decision,
    decisionConfidence: null,
    reason: stated.reason || `Version ${version} of ${from}. The recorded choice on ${from} stays. The new choice is still unnamed.`,
    owner: old.owner,
    date: "",
    status: stated.decision ? "recorded" : "open",
    lifecycle: stated.decision ? "active" : "open",
    state: "ACTIVE",
    stateHistory: ["ACTIVE"],
    predecessorId: from,
    replacesId: from,
  };
}

export function attachDecisionStates(plan: ProductPlan): ProductPlan {
  const cases = plan.decisionReevaluation.cases.map((item) => ({
    ...item,
    state: item.state ?? (item.status === "pending" ? ("TRIGGERED" as const) : item.state),
    stateHistory: item.stateHistory?.length ? item.stateHistory : (["ACTIVE", "TRIGGERED"] as DecisionState[]),
    successorId: item.successorId ?? parseSuccessorId(plan.sourceText, item.decisionNumber),
  }));
  const latestId = (number: number) => latestOf(plan.decisionLedger.entries ?? [], number)?.id;
  const entries: LedgerEntry[] = (plan.decisionLedger.entries ?? []).map((entry) => {
    if (entry.lifecycle === "superseded" || entry.replacedById || entry.state === "DECISION_CHANGED" || entry.state === "DECISION_RETAINED" || entry.state === "VALIDATED" || entry.state === "UNDER_REVIEW") {
      return { ...entry, version: entry.version ?? 1, stateHistory: entry.stateHistory?.length ? entry.stateHistory : entry.state ? [entry.state] : entry.stateHistory };
    }
    const pending = cases.some((item) => item.decisionNumber === entry.number && item.status === "pending");
    if (pending && entry.id === latestId(entry.number)) {
      return {
        ...entry,
        version: entry.version ?? 1,
        state: "TRIGGERED" as const,
        stateHistory: walkHistory(entry.stateHistory, "TRIGGERED"),
      };
    }
    if (entry.status === "recorded") {
      return {
        ...entry,
        version: entry.version ?? 1,
        state: entry.state ?? "ACTIVE",
        stateHistory: entry.stateHistory?.length ? entry.stateHistory : (["ACTIVE"] as DecisionState[]),
      };
    }
    return { ...entry, version: entry.version ?? 1 };
  });
  return {
    ...plan,
    decisionLedger: { ...plan.decisionLedger, entries },
    decisionReevaluation: {
      ...plan.decisionReevaluation,
      states: DECISION_STATES,
      stateAscii: STATE_ASCII,
      scoreNote: plan.decisionReevaluation.scoreNote ?? SCORE_NOTE,
      scoreAscii: plan.decisionReevaluation.scoreAscii ?? SCORE_ASCII,
      scoreEquation: plan.decisionReevaluation.scoreEquation ?? SCORE_EQUATION,
      priorityBands: plan.decisionReevaluation.priorityBands ?? PRIORITY_BANDS,
      cases,
    },
  };
}

function recommendationOf(number: number, verdict: ReevaluationVerdict) {
  if (verdict === "reconsider") return `Reconsider decision #${number}.`;
  if (verdict === "review") return `Review decision #${number}.`;
  return `Maintain decision #${number}.`;
}

function proposalConfidence(source: string): number | null {
  return unitScore(source, "Confidence");
}

function roundScore(value: number) {
  return Math.round(value * 100) / 100;
}

function unitScore(source: string, name: string): number | null {
  const labeled = labeledLine(source, name);
  const inline = /^(0(?:\.\d+)?|1(?:\.0+)?)$/.exec(labeled);
  if (inline) return Number(inline[1]);
  const block = new RegExp(`(?:^|\\n)\\s*${name}\\s*:?\\s*\\n\\s*(0(?:\\.\\d+)?|1(?:\\.0+)?)\\b`, "i").exec(source);
  return block ? Number(block[1]) : null;
}

export function classifyPriority(priority: number | null): ReevaluationPriorityBand | null {
  if (priority == null || Number.isNaN(priority)) return null;
  if (priority < 0.2) return "low";
  if (priority < 0.4) return "medium";
  if (priority < 0.7) return "high";
  return "critical";
}

function factorOf(
  key: ReevaluationScoreFactor["key"],
  label: string,
  score: number | null,
  reason: string,
  evidence: ReevaluationScoreFactor["evidence"],
): ReevaluationScoreFactor {
  return { key, label, score, reason, evidence };
}

function evidenceChangeFactor(source: string, comparison: ReevaluationComparison): ReevaluationScoreFactor {
  const stated = unitScore(source, "Evidence change");
  if (stated != null) {
    return factorOf("evidenceChange", "Evidence Change", stated, `Stated evidence change ${stated}.`, "stated");
  }
  if (comparison.change != null) {
    const score = roundScore(Math.min(1, Math.abs(comparison.change) / 100));
    return factorOf(
      "evidenceChange",
      "Evidence Change",
      score,
      `${comparison.changeLabel || `${comparison.change} percentage points`} maps to ${score}.`,
      "inferred",
    );
  }
  if (comparison.current != null) {
    const score = roundScore(Math.min(1, comparison.current / 100));
    return factorOf("evidenceChange", "Evidence Change", score, `Current ${comparison.current}% maps to ${score}.`, "inferred");
  }
  return factorOf("evidenceChange", "Evidence Change", null, "Evidence change is unnamed.", "unknown");
}

function decisionImpactFactor(source: string, comparison: ReevaluationComparison): ReevaluationScoreFactor {
  const stated = unitScore(source, "Decision impact");
  if (stated != null) {
    return factorOf("decisionImpact", "Decision Impact", stated, `Stated decision impact ${stated}.`, "stated");
  }
  const labeled = labeledLine(source, "Impact").toLowerCase();
  if (/^high|^medium|^low/.test(labeled)) {
    const score = IMPACT_WEIGHT[comparison.impact];
    return factorOf(
      "decisionImpact",
      "Decision Impact",
      score,
      `Stated ${comparison.impact} impact maps to ${score}.`,
      "stated",
    );
  }
  return factorOf("decisionImpact", "Decision Impact", null, "Decision impact is unnamed.", "unknown");
}

function confidenceFactor(source: string, confidence: number | null): ReevaluationScoreFactor {
  if (confidence != null) {
    return factorOf("confidence", "Confidence", confidence, `Stated confidence ${confidence}.`, "stated");
  }
  return factorOf("confidence", "Confidence", null, "Confidence is unnamed.", "unknown");
}

function businessExposureFactor(source: string): ReevaluationScoreFactor {
  const stated = unitScore(source, "Business exposure");
  if (stated != null) {
    return factorOf("businessExposure", "Business Exposure", stated, `Stated business exposure ${stated}.`, "stated");
  }
  return factorOf("businessExposure", "Business Exposure", null, "Business exposure is unnamed.", "unknown");
}

export function buildReevaluationScore(input: {
  source: string;
  comparison: ReevaluationComparison;
  confidence: number | null;
}): ReevaluationScore {
  const factors = [
    evidenceChangeFactor(input.source, input.comparison),
    decisionImpactFactor(input.source, input.comparison),
    confidenceFactor(input.source, input.confidence),
    businessExposureFactor(input.source),
  ];
  const ready = factors.every((item) => item.score != null);
  const priority = ready ? roundScore(factors.reduce((product, item) => product * (item.score ?? 0), 1)) : null;
  const band = classifyPriority(priority);
  const rationale = ready && priority != null
    ? `${priority.toFixed(2)} = ${factors.map((item) => (item.score ?? 0).toFixed(2)).join(" × ")}`
    : `${factors.filter((item) => item.score == null).map((item) => item.label).join(", ")} ${factors.filter((item) => item.score == null).length === 1 ? "is" : "are"} unnamed, so priority stays unnamed.`;
  return {
    note: SCORE_NOTE,
    ascii: SCORE_ASCII,
    equation: SCORE_EQUATION,
    factors,
    priority,
    band,
    rationale,
  };
}

function proposedActionOf(source: string, number: number, verdict: ReevaluationVerdict) {
  return labeledLine(source, "Proposed Action") || recommendationOf(number, verdict);
}

function suggestedVerdict(source: string, assumption: string, evidence: string, triggers: Array<string | ReevaluationTrigger> = []): ReevaluationVerdict {
  const action = labeledLine(source, "Proposed Action");
  if (/^change decision|^reconsider/i.test(action)) return "reconsider";
  if (/^keep decision|^maintain/i.test(action)) return "maintain";
  if (/^review/i.test(action)) return "review";
  return verdictOf(assumption, evidence, triggers);
}

function buildProposal(input: {
  source: string;
  decision: string;
  assumption: string;
  evidence: string;
  trigger?: ReevaluationTrigger;
  comparison: ReevaluationComparison;
  verdict: ReevaluationVerdict;
  number: number;
}): ReevaluationProposal {
  return {
    originalDecision: labeledLine(input.source, "Original Decision") || input.decision,
    trigger: labeledLine(input.source, "Trigger") || (input.trigger ? input.trigger.statement : input.evidence),
    changedAssumption: labeledLine(input.source, "Changed Assumption") || input.comparison.originalAssumption || input.assumption,
    impact: input.comparison.impact,
    proposedAction: proposedActionOf(input.source, input.number, input.verdict),
    confidence: proposalConfidence(input.source),
  };
}

function affectedFor(entry: LedgerEntry, assumption: string, evidence: string) {
  const blob = `${entry.question} ${entry.decision} ${assumption} ${evidence}`;
  if (/offline|sync|queue|cach/i.test(blob)) return [...OFFLINE_AFFECTED];
  if (/cityworks|system of record/i.test(blob)) return ["System of record", "Product roadmap"];
  if (/immutable|append-only|revision/i.test(blob)) return ["Ledger policy", "Audit trail", "Product roadmap"];
  return ["Product roadmap"];
}

function makeCase(input: {
  number: number;
  question: string;
  decision: string;
  assumption: string;
  observation?: string;
  evidence: DecisionFact;
  triggers?: Array<string | ReevaluationTrigger>;
  entry?: LedgerEntry;
  source?: string;
}): ReevaluationCase {
  const source = input.source ?? "";
  const verdict = suggestedVerdict(source, input.assumption, input.evidence.text, input.triggers);
  const fired = (input.triggers ?? []).find((item) => triggerFired(item, input.evidence.text));
  const trigger = typeof fired === "string" ? { id: "T-fired", kind: "metric" as const, statement: fired } : fired;
  const comparison = buildComparison({
    source,
    assumption: input.assumption,
    observation: input.observation ?? "",
    evidence: input.evidence.text,
    entry: input.entry,
    trigger,
    verdict,
  });
  const proposal = buildProposal({
    source,
    decision: input.decision,
    assumption: input.assumption,
    evidence: input.evidence.text,
    trigger,
    comparison,
    verdict,
    number: input.number,
  });
  const score = buildReevaluationScore({
    source,
    comparison,
    confidence: proposal.confidence,
  });
  return {
    id: `REV-${input.number}-${verdict}`,
    decisionNumber: input.number,
    question: input.question,
    decision: input.decision,
    assumption: input.assumption,
    observation: input.observation ?? "",
    target: "assumption",
    trigger,
    evidence: input.evidence,
    channel: channelOf(input.evidence.text),
    changed: verdict !== "maintain",
    warning: verdict === "maintain" ? "" : REEVAL_WARNING,
    affected: affectedFor(
      {
        decisionId: `DEC-${input.number}`,
        number: input.number,
        id: `LEDGER-${input.number}`,
        kind: "architecture",
        question: input.question,
        options: [],
        evidence: [],
        constraints: [],
        risks: [],
        observations: [],
        assumptions: [],
        reviewTriggers: (input.triggers ?? []).map((item) => (typeof item === "string" ? item : item.statement)),
        triggers: (input.triggers ?? []).map((item, index) =>
          typeof item === "string" ? { id: `T-${index + 1}`, kind: "metric" as const, statement: item } : item,
        ),
        decision: input.decision,
        decisionConfidence: null,
        reason: "",
        owner: "",
        date: "",
        status: "recorded",
        lifecycle: "active",
      },
      input.assumption,
      input.evidence.text,
    ),
    recommendation: proposal.proposedAction,
    verdict,
    status: "pending",
    comparison,
    proposal,
    whatChanged: buildWhatChanged({
      source,
      decision: input.decision,
      question: input.question,
      comparison,
      proposal,
      changed: verdict !== "maintain",
    }),
    score,
    state: "TRIGGERED",
    stateHistory: ["ACTIVE", "TRIGGERED"],
    successorId: parseSuccessorId(source, input.number),
    pipeline: fillPipeline({
      trigger,
      decision: input.decision,
      observation: input.observation ?? "",
      assumption: input.assumption,
      evidence: input.evidence.text,
      comparison,
      verdict,
    }),
  };
}

function channelsOf(evidence: DecisionFact[]) {
  return (["analytics", "feedback", "constraints"] as ReevaluationChannel[]).map((kind) => ({
    kind,
    lines: evidence.filter((item) => channelOf(item.text) === kind),
  }));
}

export function buildDecisionReevaluation(plan: ProductPlan, memory?: ProductMemory): DecisionReevaluation {
  const evidence = parseNewEvidence(plan, memory);
  const originals = parseOriginalAssumptions(plan.sourceText);
  const refs = parseDecisionNumbers(plan.sourceText);
  const cases: ReevaluationCase[] = [];
  const seen = new Set<string>();

  const add = (item: ReevaluationCase) => {
    const key = `${item.decisionNumber}:${item.assumption}:${item.evidence.text}`;
    if (seen.has(key)) return;
    seen.add(key);
    cases.push(item);
  };

  for (const entry of plan.decisionLedger?.entries ?? []) {
    const extra = refs.includes(entry.number) ? originals : [];
    const assumptions = [...extra, ...entry.assumptions.map((item) => item.statement || item.text)].filter((text) => text && !/do not implement|queue and sync|online generation/i.test(text));
    for (const assumption of assumptions) {
      for (const line of evidence) {
        if (!assumptionChanged(assumption, line.text, entry.triggers?.length ? entry.triggers : entry.reviewTriggers ?? [])) continue;
        add(
          makeCase({
            number: entry.number,
            question: entry.question,
            decision: entry.decision,
            assumption,
            observation: entry.observations[0]?.statement || entry.observations[0]?.text || "",
            evidence: line,
            triggers: entry.triggers?.length ? entry.triggers : entry.reviewTriggers,
            entry,
            source: plan.sourceText,
          }),
        );
      }
    }
  }

  for (const number of refs) {
    if (cases.some((item) => item.decisionNumber === number)) continue;
    const entry = plan.decisionLedger?.entries.find((item) => item.number === number);
    if (!entry) continue;
    for (const assumption of originals) {
      for (const line of evidence) {
        if (!assumptionChanged(assumption, line.text, entry?.triggers?.length ? entry.triggers : entry?.reviewTriggers ?? [])) continue;
        add(
          makeCase({
            number,
            question: entry?.question || `Decision #${number}`,
            decision: entry?.decision ?? "",
            assumption,
            evidence: line,
            triggers: entry?.triggers?.length ? entry.triggers : entry?.reviewTriggers,
            entry,
            source: plan.sourceText,
          }),
        );
      }
    }
  }

  return {
    note: REEVAL_NOTE,
    ascii: REEVAL_ASCII,
    question: REEVAL_QUESTION,
    owner: REEVAL_OWNER,
    triggerKinds: TRIGGER_KINDS,
    states: DECISION_STATES,
    stateAscii: STATE_ASCII,
    scoreNote: SCORE_NOTE,
    scoreAscii: SCORE_ASCII,
    scoreEquation: SCORE_EQUATION,
    priorityBands: PRIORITY_BANDS,
    whatChangedNote: CHANGED_NOTE,
    whatChangedAscii: CHANGED_ASCII,
    stages: PIPELINE_STEPS,
    channels: channelsOf(evidence),
    options: REEVAL_OPTIONS,
    cases,
  };
}

export function applyReevaluationChoice(plan: ProductPlan, caseId: string, verdict: ReevaluationVerdict): ProductPlan {
  const item = plan.decisionReevaluation.cases.find((row) => row.id === caseId);
  if (!item) return plan;
  const state = nextState(item.state, verdict);
  const history = walkHistory(item.stateHistory, state);
  const original = latestOf(plan.decisionLedger.entries, item.decisionNumber);
  const recorded = original?.decision ?? item.decision;
  let entries = (plan.decisionLedger.entries ?? []).map((row) =>
    original && row.id === original.id
      ? {
          ...row,
          decision: row.decision,
          version: row.version ?? 1,
          state,
          stateHistory: walkHistory(row.stateHistory, state),
          lifecycle: state === "DECISION_CHANGED" ? ("superseded" as const) : row.lifecycle,
        }
      : row,
  );
  let successorId = item.successorId;
  let nextNumber = plan.decisionLedger.nextNumber;
  if (state === "DECISION_CHANGED" && original) {
    const statedSuccessor = parseSuccessorId(plan.sourceText, item.decisionNumber);
    const statedNumber = Number(/DEC-(\d+)/.exec(statedSuccessor ?? "")?.[1] ?? 0);
    if (statedNumber && statedNumber !== original.number) {
      successorId = `DEC-${statedNumber}`;
      if (!entries.some((row) => row.number === statedNumber || row.decisionId === successorId)) {
        entries = [...entries, successorEntry(original, statedNumber)];
      }
      nextNumber = Math.max(nextNumber, statedNumber + 1);
    } else {
      const version = (original.version ?? 1) + 1;
      const stated = statedVersion(plan.sourceText, original.number, version);
      if (!entries.some((row) => row.number === original.number && (row.version ?? 1) === version)) {
        const next = versionEntry(original, version, stated);
        entries = [...entries, next];
        successorId = labelOf(next);
      } else {
        successorId = `${original.decisionId || `DEC-${original.number}`} v${version}`;
      }
    }
    entries = entries.map((row) =>
      row.id === original.id
        ? { ...row, decision: recorded, successorId, replacedById: successorId, lifecycle: "superseded" as const }
        : row,
    );
  }
  const updated =
    verdict === "maintain"
      ? `Decision #${item.decisionNumber} stands. The recorded choice stays.`
      : verdict === "review"
        ? `Decision #${item.decisionNumber} is under review. A person has not replaced it yet.`
        : `Decision #${item.decisionNumber} is reopened. A person authorized the change. The recorded choice on ${original ? labelOf(original) : `DEC-${item.decisionNumber}`} stays. The new record is ${successorId ?? "unnamed"}. The new choice is still unnamed.`;
  const next: ProductPlan = {
    ...plan,
    decisionLedger: {
      ...plan.decisionLedger,
      entries,
      nextNumber,
      versioning: buildVersioning(entries),
    },
    decisionReevaluation: {
      ...plan.decisionReevaluation,
      owner: REEVAL_OWNER,
      states: DECISION_STATES,
      stateAscii: STATE_ASCII,
      cases: plan.decisionReevaluation.cases.map((row) =>
        row.id === caseId
          ? {
              ...row,
              verdict,
              status: "chosen",
              recommendation: recommendationOf(row.decisionNumber, verdict),
              updatedDecision: updated,
              proposal: row.proposal,
              state,
              stateHistory: history,
              successorId,
            }
          : row,
      ),
    },
  };
  return {
    ...next,
    productLoop: buildProductLoop(next),
    orchestration: buildOrchestration(next),
  };
}

export function openReevaluations(plan: ProductPlan) {
  return (plan.decisionReevaluation?.cases ?? []).filter((item) => needsAttention(item.verdict) && item.status === "pending");
}

export function reevaluationMarkdown(plan: ProductPlan) {
  const board = plan.decisionReevaluation;
  if (!board) return "No re-evaluation ran.";
  const channels = board.channels
    .map((ctx) => `- ${REEVAL_CHANNEL_LABEL[ctx.kind]}: ${ctx.lines.map((line) => line.text).join(" ") || "None named."}`)
    .join("\n");
  if (!board.cases.length) {
    return `${board.note}\n\n${board.question}\n\n\`\`\`\n${board.ascii}\n\`\`\`\n\n${channels}\n\nNo recorded decision has new contradicting evidence.`;
  }
  const cases = board.cases
    .map((item) => {
      const deltas = (item.whatChanged?.deltas ?? [])
        .map((row) => `- ${row.metric}: ${row.before} → ${row.after}`)
        .join("\n");
      const assumption = item.whatChanged?.assumption
        ? `${item.whatChanged.assumption.id ? `${item.whatChanged.assumption.id} ` : ""}${item.whatChanged.assumption.statement}\n⚠ ${item.whatChanged.assumption.status}`
        : item.proposal.changedAssumption;
      return `Decision: ${item.whatChanged?.title || item.decision || `Decision #${item.decisionNumber}`}

WHAT CHANGED?
${deltas || "- None named."}

AFFECTED ASSUMPTIONS
${assumption}

PROPOSED ACTION
${item.whatChanged?.action || item.proposal.proposedAction}

Question: ${item.question}
Decision: ${item.decision || "Recorded."}

Channel: ${REEVAL_CHANNEL_LABEL[item.channel]}
New evidence: ${item.evidence.text} (${item.evidence.evidence})
Assumption changed? ${item.changed ? "Yes." : "No."}
${item.warning ? `⚠ ${item.warning}` : ""}

Affected decisions:
${item.affected.map((line) => `- ${line}`).join("\n")}

Original decision: ${item.proposal.originalDecision}
Trigger: ${item.proposal.trigger}
Changed assumption: ${item.proposal.changedAssumption}
Impact: ${item.proposal.impact}
Proposed action: ${item.proposal.proposedAction}
Confidence: ${item.proposal.confidence ?? "unnamed"}

Re-evaluation priority: ${item.score?.priority ?? "unnamed"}
Band: ${item.score?.band ?? "unnamed"}
${item.score?.rationale ?? ""}
${(item.score?.factors ?? []).map((factor) => `${factor.label}: ${factor.score ?? "unnamed"} — ${factor.reason}`).join("\n")}

State: ${(item.stateHistory ?? [item.state]).join(" → ")}
${item.successorId ? `Successor: ${item.successorId}` : ""}

Engine: ${REEVAL_LABEL[item.verdict]}
${item.updatedDecision ? `Human owner: ${item.updatedDecision}` : "Human owner: pending. Keep Decision, Review, or Change Decision."}`;
    })
    .join("\n\n");
  return `${board.note}

${board.question}

\`\`\`
${board.ascii}
\`\`\`

${board.scoreNote ?? SCORE_NOTE}

\`\`\`
${board.scoreAscii ?? SCORE_ASCII}
\`\`\`

${channels}

${cases}`;
}
