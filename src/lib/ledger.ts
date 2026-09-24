import { parseDecisionNumbers, parseOriginalAssumptions } from "./reevaluate";
import { contentWords } from "./text";
import type {
  AssumptionHealth,
  DecisionFact,
  DecisionLedger,
  Evidence,
  LedgerAnswer,
  LedgerAssumption,
  LedgerEntry,
  LedgerEvidenceItem,
  LedgerEvidenceType,
  LedgerKind,
  LedgerLayerConfidence,
  LedgerLifecycle,
  LedgerObservation,
  LedgerOption,
  ProductMemory,
  ProductPlan,
  ReevaluationTrigger,
  ReevaluationTriggerKind,
} from "./types";

export const LEDGER_NOTE =
  "Facts, assumptions, and decisions stay on separate layers. An observation is a measured fact. An assumption is the interpretation. A decision is the choice that sat on that assumption, with a labeled confidence. New evidence challenges the assumption. A recorded decision moves through states. A change writes a new version. The old version stays. Together the versions are the product decision history.";

export const VERSION_ASCII = `                    DEC-N v1
                         │
                         ↓
                    DEC-N v2`;

export function decisionLabel(entry: Pick<LedgerEntry, "decisionId" | "number" | "version">) {
  const id = entry.decisionId || (entry.number > 0 ? `DEC-${entry.number}` : "DEC");
  return `${id} v${entry.version ?? 1}`;
}

export const LEDGER_ASCII = `                    DECISION LEDGER
                            │
                            ↓
                         DEC-N
                            │
                      Observation
                         (fact)
                            │
                            ↓
                       Assumption
                            │
                            ↓
                        Decision
                            │
                            ↓
                       Confidence
                            │
                            ↓
              New evidence → Assumption`;

export const WHY_ARCHITECTURE = "Why did we choose this architecture?";
export const STALE_ASSUMPTIONS = "Which assumptions behind this decision are no longer valid?";

const ARCH =
  /architecture|offline|queue and sync|online only|cityworks|okta|kubernetes|microservice|append-only|immutable|one codebase|system of record|ledger/i;

function fact(text: string, evidence: Evidence = "stated"): DecisionFact {
  return { text, evidence };
}

function normalize(text: string) {
  return text.replace(/\s+/g, " ").trim().toLowerCase().replace(/[?!.]+$/, "");
}

function sameQuestion(left: string, right: string) {
  const a = normalize(left);
  const b = normalize(right);
  if (!a || !b) return false;
  if (a === b) return true;
  const words = contentWords(a);
  if (words.length < 3) return a.includes(b) || b.includes(a);
  return words.filter((word) => b.includes(word)).length >= Math.min(4, words.length);
}

function letter(index: number) {
  return String.fromCharCode(65 + index);
}

function kindOf(question: string, decision: string): LedgerKind {
  return ARCH.test(`${question} ${decision}`) ? "architecture" : "product";
}

function healthOf(text: string, corpus: string): { health: AssumptionHealth; note?: string } {
  const blob = corpus.replace(/\s+/g, " ");
  const words = contentWords(text);
  const mentioned = words.length ? words.filter((word) => blob.toLowerCase().includes(word)).length >= Math.min(3, words.length) : false;
  const staleNear =
    /no longer (holds|valid|true)|assumption[^.?]{0,80}no longer|now have continuous|now have reliable/i.test(blob);
  if (/rarely (need|use) offline|not a significant user need|don'?t need offline/i.test(text) && /offline usage increased/i.test(blob)) {
    const note = blob.match(/offline usage increased[^.?\n]*/i)?.[0]?.trim();
    return { health: "stale", note };
  }
  if (mentioned && staleNear) {
    const note = blob.match(/[^.?\n]*(?:no longer (?:holds|valid|true)|now have continuous|now have reliable)[^.?\n]*/i)?.[0]?.trim();
    return { health: "stale", note };
  }
  if (mentioned && /\b(confirmed|still holds|remains true)\b/i.test(blob)) return { health: "valid" };
  return { health: "untested" };
}

function withHealth(lines: string[], corpus: string) {
  return lines.filter(Boolean).map((text, index) => structureAssumption({ text, ...healthOf(text, corpus) }, index, corpus));
}

function assumptionId(index: number) {
  return `A-${String(index + 1).padStart(2, "0")}`;
}

function observationId(index: number) {
  return `O-${String(index + 1).padStart(2, "0")}`;
}

export function parseLayerConfidence(text: string): LedgerLayerConfidence | null {
  const clean = text.replace(/[.]/g, "").trim();
  if (/^high$/i.test(clean)) return "high";
  if (/^medium$/i.test(clean)) return "medium";
  if (/^low$/i.test(clean)) return "low";
  return null;
}

function isCollapsedNeedClaim(text: string) {
  return /users don'?t need offline reports/i.test(text);
}

function isDecisionClaim(text: string) {
  return /do not implement|queue and sync|online generation|online only/i.test(text);
}

function splitCollapsedClaim(text: string) {
  if (!isCollapsedNeedClaim(text)) return null;
  return { assumption: "Offline reporting is not a significant user need." };
}

function structureObservation(
  item: Partial<LedgerObservation> & { text?: string; statement?: string; evidence?: Evidence },
  index: number,
): LedgerObservation {
  const statement = (item.statement || item.text || "").replace(/\s+/g, " ").trim();
  const typed = structureEvidence({
    text: statement,
    evidence: item.evidence ?? "stated",
    type: item.type,
    metric: item.metric,
    value: item.value,
  });
  return {
    id: item.id || observationId(index),
    statement,
    text: statement,
    type: typed.type,
    metric: typed.metric,
    value: typed.value,
    evidence: typed.evidence,
  };
}

function deriveObservations(entry: Pick<LedgerEntry, "observations" | "evidence">): LedgerObservation[] {
  if (entry.observations?.length) return entry.observations.filter((item) => item.statement || item.text).map((item, index) => structureObservation(item, index));
  return (entry.evidence ?? []).filter((item) => item.text).map((item, index) => structureObservation(item, index));
}

function structureAssumption(
  item: Partial<LedgerAssumption> & { text?: string; statement?: string },
  index: number,
  corpus: string,
): LedgerAssumption {
  const statement = (item.statement || item.text || "").replace(/\s+/g, " ").trim();
  const scored = healthOf(statement, corpus);
  return {
    id: item.id || assumptionId(index),
    statement,
    text: statement,
    confidence: typeof item.confidence === "number" ? item.confidence : null,
    health: item.health ?? scored.health,
    note: item.note ?? scored.note,
  };
}

function evidenceTypeOf(text: string, type?: LedgerEvidenceType): LedgerEvidenceType {
  if (type) return type;
  if (/\b(usage|conversion|offline_usage|metric)\b/i.test(text)) return "analytics";
  if (/\b(said|feedback|support request)\b/i.test(text)) return "feedback";
  if (/\b(storage|limited local|constraint)\b/i.test(text)) return "constraint";
  return "stated";
}

function evidenceMetricOf(text: string, metric?: string) {
  if (metric) return metric;
  if (/offline usage|offline_usage/i.test(text)) return "offline_usage";
  if (/support request/i.test(text)) return "support_requests_offline";
  return undefined;
}

function evidenceValueOf(text: string, value?: number | string) {
  if (value !== undefined) return value;
  const pct = text.match(/(\d+(?:\.\d+)?)\s*%/);
  if (pct) return Number(pct[1]);
  return undefined;
}

function structureEvidence(item: DecisionFact | LedgerEvidenceItem): LedgerEvidenceItem {
  const typed = item as LedgerEvidenceItem;
  return {
    text: item.text,
    evidence: item.evidence,
    type: evidenceTypeOf(item.text, typed.type),
    metric: evidenceMetricOf(item.text, typed.metric),
    value: evidenceValueOf(item.text, typed.value),
  };
}

function triggerId(index: number) {
  return `T-${String(index + 1).padStart(2, "0")}`;
}

export function classifyTrigger(text: string): ReevaluationTriggerKind {
  if (/after\s+\d+\s+days|\b\d+\s+days\b|time trigger/i.test(text)) return "time";
  if (/complaint|support_requests|feedback trigger/i.test(text)) return "feedback";
  if (/customer segment|business trigger/i.test(text)) return "business";
  if (/sync infrastructure|infrastructure becomes|connectivity assumption/i.test(text)) return "technical";
  if (/api architecture|dependency trigger|underlying api/i.test(text)) return "dependency";
  return "metric";
}

export function structureTrigger(
  item: Partial<ReevaluationTrigger> & { statement?: string; text?: string },
  index: number,
): ReevaluationTrigger {
  const statement = (item.statement || item.text || "").replace(/\s+/g, " ").trim();
  const comparison = /(\w+)\s*(>=|<=|>|<|=)\s*(\d+(?:\.\d+)?)\s*(%|\/month|per month)?/i.exec(statement);
  const after = /after\s+(\d+)\s+days/i.exec(statement);
  return {
    id: item.id || triggerId(index),
    kind: item.kind || classifyTrigger(statement),
    statement,
    metric: item.metric || comparison?.[1],
    operator: item.operator || (comparison?.[2] as ReevaluationTrigger["operator"] | undefined),
    threshold: item.threshold ?? (comparison ? Number(comparison[3]) : undefined),
    unit: item.unit || comparison?.[4]?.replace("per month", "/month"),
    days: item.days ?? (after ? Number(after[1]) : undefined),
  };
}

export function parseTriggerBlocks(source: string): ReevaluationTrigger[] {
  const items: ReevaluationTrigger[] = [];
  const seen = new Set<string>();
  const add = (kind: ReevaluationTriggerKind | undefined, statement: string) => {
    const clean = statement.replace(/^[-*•]\s*/, "").trim();
    if (clean.length < 3 || seen.has(clean.toLowerCase())) return;
    seen.add(clean.toLowerCase());
    items.push(structureTrigger({ kind, statement: clean }, items.length));
  };
  for (const match of source.matchAll(
    /(?:^|\n)\s*(Metric|Feedback|Business|Technical|Time|Dependency)\s+trigger\s*:?\s*\n\s*([^\n]+)/gi,
  )) {
    add(match[1].toLowerCase() as ReevaluationTriggerKind, match[2]);
  }
  for (const match of source.matchAll(
    /(?:^|\n)\s*(Metric|Feedback|Business|Technical|Time|Dependency)\s+trigger\s*:\s*([^\n]+)/gi,
  )) {
    add(match[1].toLowerCase() as ReevaluationTriggerKind, match[2]);
  }
  return items;
}

function deriveTriggerObjects(entry: Pick<LedgerEntry, "question" | "decision" | "assumptions" | "reviewTriggers" | "triggers">) {
  if (entry.triggers?.length) return entry.triggers.map((item, index) => structureTrigger(item, index));
  if (entry.reviewTriggers?.length) return [...new Set(entry.reviewTriggers.filter(Boolean))].map((statement, index) => structureTrigger({ statement }, index));
  const blob = `${entry.question} ${entry.decision} ${entry.assumptions.map((item) => item.statement || item.text).join(" ")}`;
  const triggers: ReevaluationTrigger[] = [];
  if (/offline|queue and sync|internet connection|connectivity|significant user need/i.test(blob)) {
    triggers.push(structureTrigger({ statement: "offline usage increases", kind: "metric" }, triggers.length));
  }
  if (/without cell signal|rarely (need|use) offline|usually have connectivity|significant user need/i.test(blob)) {
    triggers.push(structureTrigger({ statement: "connectivity assumption no longer holds", kind: "technical" }, triggers.length));
  }
  return triggers;
}

function lifecycleOf(status: LedgerEntry["status"], lifecycle?: LedgerLifecycle): LedgerLifecycle {
  if (lifecycle) return lifecycle;
  return status === "recorded" ? "active" : "open";
}

export function structureEntry(entry: LedgerEntry, corpus = ""): LedgerEntry {
  const collapsed = [...(entry.assumptions ?? []).map((item) => item.statement || item.text), entry.decision].find((text) => isCollapsedNeedClaim(text ?? ""));
  const split = collapsed ? splitCollapsedClaim(collapsed) : null;
  const rawAssumptions = (entry.assumptions ?? [])
    .map((item) => ({ ...item, statement: isCollapsedNeedClaim(item.statement || item.text) ? split?.assumption ?? item.statement : item.statement }))
    .filter((item) => !isDecisionClaim(item.statement || item.text));
  if (split?.assumption && !rawAssumptions.some((item) => /significant user need/i.test(item.statement || item.text || ""))) {
    rawAssumptions.push({ statement: split.assumption, text: split.assumption, id: "", confidence: null, health: "untested" });
  }
  const assumptions = rawAssumptions.map((item, index) => structureAssumption(item, index, corpus));
  const observations = deriveObservations(entry);
  const evidence = (entry.evidence?.length ? entry.evidence : observations).map((item) =>
    structureEvidence({
      text: item.text || ("statement" in item ? String(item.statement ?? "") : ""),
      evidence: item.evidence ?? "stated",
      type: item.type,
      metric: item.metric,
      value: item.value,
    }),
  );
  const number = entry.number;
  const decision = isCollapsedNeedClaim(entry.decision) ? "" : entry.decision;
  return {
    ...entry,
    decisionId: entry.decisionId || (number > 0 ? `DEC-${number}` : entry.id || ""),
    observations,
    assumptions,
    evidence,
    triggers: deriveTriggerObjects({ ...entry, assumptions }),
    reviewTriggers: deriveTriggerObjects({ ...entry, assumptions }).map((item) => item.statement),
    decision,
    decisionConfidence: entry.decisionConfidence ?? null,
    lifecycle: lifecycleOf(entry.status, entry.state === "DECISION_CHANGED" ? "superseded" : entry.lifecycle),
    state: entry.state ?? (entry.status === "recorded" ? "ACTIVE" : entry.state),
    stateHistory: entry.stateHistory ?? (entry.status === "recorded" ? ["ACTIVE"] : entry.stateHistory),
    predecessorId: entry.predecessorId,
    successorId: entry.successorId,
    version: entry.version ?? 1,
    replacesId: entry.replacesId,
    replacedById: entry.replacedById,
    id: entry.id || (number > 0 ? `LEDGER-${number}-v${entry.version ?? 1}` : entry.id),
    reason: entry.reason,
  };
}

export function ledgerObject(entry: LedgerEntry) {
  return {
    decisionId: entry.decisionId || `DEC-${entry.number}`,
    question: entry.question,
    observation: entry.observations.map((item) => ({
      id: item.id,
      statement: item.statement || item.text,
      type: item.type,
      metric: item.metric,
      value: item.value,
    })),
    assumption: entry.assumptions.map((item) => ({
      id: item.id,
      statement: item.statement || item.text,
      confidence: item.confidence,
      health: item.health,
    })),
    decision: entry.decision,
    confidence: entry.decisionConfidence,
    date: entry.date,
    evidence: entry.evidence.map((item) => ({
      type: item.type ?? "stated",
      metric: item.metric,
      value: item.value,
      text: item.text,
    })),
    constraints: entry.constraints,
    reviewTriggers: entry.reviewTriggers ?? [],
    triggers: (entry.triggers ?? []).map((item) => ({
      id: item.id,
      kind: item.kind,
      statement: item.statement,
      metric: item.metric,
      operator: item.operator,
      threshold: item.threshold,
      unit: item.unit,
      days: item.days,
    })),
    status: entry.lifecycle ?? lifecycleOf(entry.status),
    state: entry.state,
    predecessorId: entry.predecessorId,
    successorId: entry.successorId,
    version: entry.version ?? 1,
    replacesId: entry.replacesId,
    replacedById: entry.replacedById,
    why: entry.reason,
  };
}

export function emptyDecisionLedger(): DecisionLedger {
  return { note: LEDGER_NOTE, ascii: LEDGER_ASCII, versionAscii: VERSION_ASCII, entries: [], nextNumber: 1 };
}

function bullets(block: string) {
  return block
    .split(/\n/)
    .map((line) => line.replace(/^[-*•]\s*/, "").replace(/^[A-Z]\.\s+/, "").trim())
    .filter((line) => line.length > 1 && !/^(question|options?|evidence|observations?|constraints?|risks?|assumptions?|decision|reason|why|owner|date|confidence|review triggers?):?$/i.test(line));
}

function section(source: string, name: string) {
  const match = new RegExp(
    `(?:^|\\n)\\s*${name}\\s*:?\\s*\\n([\\s\\S]*?)(?=\\n\\s*(?:Question|Options?|Evidence|Observations?|Constraints?|Risks?|Assumptions?|Review triggers?|Metric trigger|Feedback trigger|Business trigger|Technical trigger|Time trigger|Dependency trigger|Original Decision|Changed Assumption|Proposed Action|Trigger|Original|Current|Change|Affected assumption|Impact|Re-evaluation|Decision|Reason|Why|Owner|Date|Status|Confidence)\\s*:?\\s*\\n|$)`,
    "i",
  ).exec(`\n${source}\n`);
  return match?.[1]?.trim() ?? "";
}

function inline(source: string, name: string) {
  const match = new RegExp(`(?:^|\\n)\\s*${name}\\s*:\\s*([^\\n]+)`, "i").exec(source);
  return match?.[1]?.trim() ?? "";
}

function parseOptions(block: string): LedgerOption[] {
  const lines = block
    .split(/\n/)
    .map((line) => line.replace(/^[-*•]\s*/, "").trim())
    .filter(Boolean);
  const labeled = lines
    .map((line) => {
      const match = /^([A-Z])[.)]\s+(.+)$/.exec(line);
      return match ? { key: match[1], title: match[2].trim() } : null;
    })
    .filter((item): item is LedgerOption => Boolean(item));
  if (labeled.length) return labeled;
  return lines.slice(0, 5).map((title, index) => ({ key: letter(index), title }));
}

export function parseLedgerBlocks(source: string): LedgerEntry[] {
  const chunks = source.split(/(?=Decision\s*#\s*\d+)/i);
  const entries: LedgerEntry[] = [];
  for (const chunk of chunks) {
    const numbered = /Decision\s*#\s*(\d+)/i.exec(chunk);
    const question = section(chunk, "Question") || inline(chunk, "Question");
    const options = parseOptions(section(chunk, "Options?"));
    if (!question && options.length < 2) continue;
    const decision = inline(chunk, "Decision") || bullets(section(chunk, "Decision"))[0] || "";
    const reason =
      inline(chunk, "Why") ||
      inline(chunk, "Reason") ||
      section(chunk, "Why").replace(/\s+/g, " ").trim() ||
      section(chunk, "Reason").replace(/\s+/g, " ").trim();
    const owner = inline(chunk, "Owner") || bullets(section(chunk, "Owner"))[0] || "";
    const date = inline(chunk, "Date") || bullets(section(chunk, "Date"))[0] || "";
    const number = numbered ? Number(numbered[1]) : 0;
    const asked = question || "";
    const labeledTriggers = parseTriggerBlocks(chunk);
    const triggerLines = bullets(section(chunk, "Review triggers?"));
    const observed = [...bullets(section(chunk, "Observations?")), inline(chunk, "Observation")].filter(Boolean);
    entries.push(
      structureEntry({
        decisionId: number ? `DEC-${number}` : "",
        number,
        id: number ? `LEDGER-${number}` : `LEDGER-parsed-${entries.length + 1}`,
        kind: kindOf(asked, decision),
        question: asked,
        options,
        evidence: bullets(section(chunk, "Evidence")).map((text) => structureEvidence(fact(text))),
        observations: observed.map((text, index) => structureObservation({ text }, index)),
        constraints: bullets(section(chunk, "Constraints?")),
        risks: bullets(section(chunk, "Risks?")),
        assumptions: withHealth(bullets(section(chunk, "Assumptions?")), source),
        reviewTriggers: labeledTriggers.length ? labeledTriggers.map((item) => item.statement) : triggerLines,
        triggers: labeledTriggers,
        decision,
        decisionConfidence: parseLayerConfidence(inline(chunk, "Confidence") || bullets(section(chunk, "Confidence"))[0] || ""),
        reason,
        owner,
        date,
        status: decision ? "recorded" : "open",
        lifecycle: decision ? "active" : "open",
      }),
    );
  }
  return entries.filter((item) => item.question || item.options.length);
}

function linkVersions(entries: LedgerEntry[]) {
  const groups = new Map<string, LedgerEntry[]>();
  for (const item of entries) {
    const key = item.decisionId || `DEC-${item.number}`;
    groups.set(key, [...(groups.get(key) ?? []), item]);
  }
  return entries.map((item) => {
    const family = [...(groups.get(item.decisionId || `DEC-${item.number}`) ?? [])].sort((a, b) => (a.version ?? 1) - (b.version ?? 1));
    const index = family.findIndex((row) => row.id === item.id);
    if (index < 0 || family.length < 2) return item;
    const previous = family[index - 1];
    const next = family[index + 1];
    return {
      ...item,
      replacesId: previous ? decisionLabel(previous) : item.replacesId,
      replacedById: next ? decisionLabel(next) : item.replacedById,
      lifecycle: next ? "superseded" : item.lifecycle,
    };
  });
}

export function parseVersionCards(source: string): LedgerEntry[] {
  const entries: LedgerEntry[] = [];
  const matcher = /DEC-(\d+)\s*v(\d+)\s*\n([\s\S]*?)(?=\n\s*DEC-\d+\s*v\d+|\n\s*Decision\s*#|$)/gi;
  let match: RegExpExecArray | null;
  while ((match = matcher.exec(`${source}\n`))) {
    const number = Number(match[1]);
    const version = Number(match[2]);
    const body = match[3] ?? "";
    const decision = inline(body, "Decision") || bullets(section(body, "Decision"))[0] || "";
    const reason =
      bullets(section(body, "Reason")).join(" ") ||
      inline(body, "Reason") ||
      section(body, "Reason").replace(/\s+/g, " ").trim();
    const question = inline(body, "Question") || section(body, "Question") || `Decision #${number}`;
    if (!decision && !reason) continue;
    entries.push(
      structureEntry({
        decisionId: `DEC-${number}`,
        number,
        version,
        id: `LEDGER-${number}-v${version}`,
        kind: kindOf(question, decision),
        question,
        options: [],
        evidence: [],
        observations: [],
        constraints: [],
        risks: [],
        assumptions: [],
        reviewTriggers: [],
        triggers: [],
        decision,
        decisionConfidence: null,
        reason,
        owner: "",
        date: "",
        status: decision ? "recorded" : "open",
        lifecycle: decision ? "active" : "open",
      }),
    );
  }
  return linkVersions(entries);
}

export function parseLayeredDecision(source: string): LedgerEntry[] {
  if (/DEC-\d+\s*v\d+/i.test(source)) return [];
  if (/Decision\s*#\s*\d+/i.test(source) && /Question:/i.test(source)) return [];
  if (!/Observation:|Assumption:|Confidence:/i.test(source)) return [];
  const observation =
    inline(source, "Observation") ||
    bullets(section(source, "Observations?"))[0] ||
    section(source, "Observation").replace(/\s+/g, " ").trim();
  const assumption =
    inline(source, "Assumption") ||
    bullets(section(source, "Assumptions?"))[0] ||
    section(source, "Assumption").replace(/\s+/g, " ").trim();
  const decision = inline(source, "Decision") || bullets(section(source, "Decision"))[0] || "";
  const confidence = parseLayerConfidence(inline(source, "Confidence") || bullets(section(source, "Confidence"))[0] || "");
  if (!observation && !assumption && !decision) return [];
  const split = splitCollapsedClaim(`${observation} ${assumption} ${decision}`);
  const assumptionText = isCollapsedNeedClaim(assumption) ? split?.assumption ?? assumption : assumption;
  const decisionText = isCollapsedNeedClaim(decision) ? "" : decision;
  return [
    structureEntry({
      decisionId: "",
      number: 0,
      id: "",
      kind: kindOf(observation || assumptionText, decisionText),
      question: decisionText ? `Should we ${decisionText.replace(/^do not /i, "").replace(/\.$/, "").toLowerCase()}?` : "What should we do with this observation?",
      options: [],
      evidence: observation ? [structureEvidence(fact(observation))] : [],
      observations: observation ? [structureObservation({ text: observation }, 0)] : [],
      constraints: [],
      risks: [],
      assumptions: assumptionText ? withHealth([assumptionText], source) : [],
      reviewTriggers: parseTriggerBlocks(source).map((item) => item.statement),
      triggers: parseTriggerBlocks(source),
      decision: decisionText,
      decisionConfidence: confidence,
      reason: observation && assumptionText ? `Observation: ${observation} Assumption: ${assumptionText}` : "",
      owner: "",
      date: "",
      status: decisionText ? "recorded" : "open",
      lifecycle: decisionText ? "active" : "open",
    }, source),
  ];
}

function nextNumber(memory?: ProductMemory, extra: LedgerEntry[] = []) {
  const numbers = [
    memory?.nextDecisionNumber ?? 1,
    ...(memory?.ledger ?? []).map((item) => item.number + 1),
    ...extra.map((item) => (item.number > 0 ? item.number + 1 : 1)),
  ];
  return Math.max(1, ...numbers);
}

function assignNumber(entry: LedgerEntry, used: Set<number>, fallback: number): LedgerEntry {
  const version = entry.version ?? 1;
  if (entry.number > 0) {
    used.add(entry.number);
    return {
      ...entry,
      version,
      id: entry.id || `LEDGER-${entry.number}-v${version}`,
      decisionId: entry.decisionId || `DEC-${entry.number}`,
    };
  }
  let number = fallback;
  while (used.has(number)) number += 1;
  used.add(number);
  return { ...entry, number, version, id: `LEDGER-${number}-v${version}`, decisionId: `DEC-${number}` };
}

const ARCH_RULES: { pattern: RegExp; question: string }[] = [
  { pattern: /cityworks remains/i, question: "What is the system of record for work orders?" },
  { pattern: /append-only|submitted transactions are immutable/i, question: "How do posted entries change?" },
  { pattern: /okta/i, question: "What is the identity source?" },
  { pattern: /no kubernetes|no microservices/i, question: "How do we host the first release?" },
  { pattern: /one codebase/i, question: "How do we ship iOS and Android?" },
  { pattern: /offline inspection|offline capture|poor rural coverage/i, question: "How does field capture work without signal?" },
];

function architectureEntries(plan: ProductPlan, corpus: string): LedgerEntry[] {
  const pool = [
    ...plan.constraints,
    ...plan.requirements.filter((item) => item.priority === "must").map((item) => item.statement),
  ];
  const seen = new Set<string>();
  const entries: LedgerEntry[] = [];
  for (const rule of ARCH_RULES) {
    const text = pool.find((item) => rule.pattern.test(item));
    if (!text || seen.has(rule.question)) continue;
    seen.add(rule.question);
    entries.push(
      structureEntry({
        decisionId: "",
        number: 0,
        id: "",
        kind: "architecture",
        question: rule.question,
        options: [{ key: "A", title: text }],
        evidence: [structureEvidence(fact(text))],
        observations: [structureObservation({ text }, 0)],
        constraints: [text],
        risks: [],
        assumptions: withHealth([], corpus),
        reviewTriggers: [],
        triggers: [],
        decision: text,
        decisionConfidence: null,
        reason: "Stated in the source.",
        owner: "Source",
        date: plan.createdAt.slice(0, 10),
        status: "recorded",
        lifecycle: "active",
      }, corpus),
    );
  }
  return entries;
}

function optionsFromEngine(plan: ProductPlan): LedgerOption[] {
  return plan.decisionEngine.options.map((item, index) => ({
    key: letter(index),
    title: item.title,
  }));
}

function engineEntry(plan: ProductPlan, corpus: string): LedgerEntry {
  const engine = plan.decisionEngine;
  const chosen = engine.options.find((item) => item.id === engine.record.chosenOptionId);
  const decision = chosen ? `${letter(engine.options.indexOf(chosen))}. ${chosen.title}` : "";
  return structureEntry({
    decisionId: "",
    number: 0,
    id: "",
    kind: kindOf(engine.question, decision),
    question: engine.question,
    options: optionsFromEngine(plan),
    evidence: engine.contexts.flatMap((ctx) => ctx.lines).slice(0, 6).map((line) => structureEvidence(line)),
    observations: [],
    constraints: plan.constraints.slice(0, 4),
    risks: [...new Set(engine.options.flatMap((item) => item.risks))].slice(0, 4),
    assumptions: withHealth(
      plan.decisions.filter((item) => item.status === "assumption").map((item) => item.decision).slice(0, 4),
      corpus,
    ),
    reviewTriggers: [],
    triggers: [],
    decision,
    decisionConfidence: null,
    reason: chosen?.summary ?? engine.record.rationale ?? "",
    owner: chosen ? "Human" : "",
    date: engine.record.at?.slice(0, 10) ?? "",
    status: chosen ? "recorded" : "open",
    lifecycle: chosen ? "active" : "open",
  }, corpus);
}

function refresh(entry: LedgerEntry, corpus: string): LedgerEntry {
  return structureEntry(
    {
      ...entry,
      assumptions: (entry.assumptions ?? []).map((item, index) =>
        structureAssumption({ ...item, ...healthOf(item.statement || item.text, corpus) }, index, corpus),
      ),
    },
    corpus,
  );
}

export function parseLedgerJson(source: string): LedgerEntry[] {
  const blocks: string[] = [];
  const trimmed = source.trim();
  if (trimmed.startsWith("{") && /decisionId/.test(trimmed)) blocks.push(trimmed);
  for (const match of source.matchAll(/```(?:json)?\s*(\{[\s\S]*?"decisionId"[\s\S]*?\})\s*```/gi)) {
    if (match[1]) blocks.push(match[1]);
  }
  const entries: LedgerEntry[] = [];
  for (const block of blocks) {
    try {
      const raw = JSON.parse(block) as {
        decisionId?: string;
        question?: string;
        decision?: string;
        date?: string;
        assumptions?: { id?: string; statement?: string; confidence?: number }[];
        observations?: { id?: string; statement?: string; type?: LedgerEvidenceType; metric?: string; value?: number | string }[];
        evidence?: { type?: LedgerEvidenceType; metric?: string; value?: number | string; text?: string }[];
        constraints?: string[];
        reviewTriggers?: string[];
        status?: string;
        confidence?: string;
        why?: string;
        reason?: string;
      };
      const number = Number(/(\d+)/.exec(raw.decisionId ?? "")?.[1] ?? 0);
      const assumptions = (raw.assumptions ?? []).map((item, index) =>
        structureAssumption(
          { id: item.id, statement: item.statement, text: item.statement, confidence: item.confidence ?? null },
          index,
          source,
        ),
      );
      const evidence = (raw.evidence ?? []).map((item) =>
        structureEvidence({
          text: item.text || (item.metric != null && item.value != null ? `${item.metric}: ${item.value}` : item.metric || ""),
          evidence: "stated",
          type: item.type,
          metric: item.metric,
          value: item.value,
        }),
      );
      entries.push(
        structureEntry({
          decisionId: raw.decisionId || (number ? `DEC-${number}` : ""),
          number,
          id: number ? `LEDGER-${number}` : `LEDGER-json-${entries.length + 1}`,
          kind: kindOf(raw.question ?? "", raw.decision ?? ""),
          question: raw.question ?? "",
          options: [],
          evidence,
          observations: (raw.observations ?? []).map((item, index) =>
            structureObservation({ id: item.id, statement: item.statement, text: item.statement, type: item.type, metric: item.metric, value: item.value }, index),
          ),
          constraints: raw.constraints ?? [],
          risks: [],
          assumptions,
          reviewTriggers: raw.reviewTriggers ?? [],
          triggers: (raw.reviewTriggers ?? []).map((statement, index) => structureTrigger({ statement }, index)),
          decision: raw.decision ?? "",
          decisionConfidence: parseLayerConfidence(raw.confidence ?? ""),
          reason: raw.why || raw.reason || "",
          owner: "",
          date: raw.date ?? "",
          status: raw.decision ? "recorded" : "open",
          lifecycle: raw.status === "superseded" ? "superseded" : raw.decision ? "active" : "open",
        }, source),
      );
    } catch {
      continue;
    }
  }
  return entries.filter((item) => item.question || item.decision);
}

export function mergeLedgerEntries(left: LedgerEntry[], right: LedgerEntry[]) {
  const byKey = new Map<string, LedgerEntry>();
  const unnumbered: LedgerEntry[] = [];
  const keyOf = (item: LedgerEntry) =>
    item.number > 0 ? `${item.decisionId || `DEC-${item.number}`}:v${item.version ?? 1}` : "";
  for (const item of [...left, ...right]) {
    const key = keyOf(item);
    if (key) {
      const current = byKey.get(key);
      if (!current || (item.status === "recorded" && current.status === "open") || item.date >= (current.date ?? "")) {
        byKey.set(key, item);
      }
    } else {
      unnumbered.push(item);
    }
  }
  const used = new Set([...byKey.values()].map((item) => item.number));
  let next = used.size ? Math.max(...used) + 1 : 1;
  for (const item of unnumbered) {
    const twin = [...byKey.values()].find(
      (entry) => sameQuestion(entry.question, item.question) && (entry.version ?? 1) === (item.version ?? 1),
    );
    if (twin) {
      if (item.status === "recorded" && twin.status === "open") {
        byKey.set(keyOf({ ...twin, ...item }), { ...item, number: twin.number, id: twin.id, decisionId: twin.decisionId || `DEC-${twin.number}`, version: twin.version ?? 1 });
      }
      continue;
    }
    const assigned = assignNumber(item, used, next);
    next = assigned.number + 1;
    byKey.set(keyOf(assigned), assigned);
  }
  return [...byKey.values()].sort((a, b) => a.number - b.number || (a.version ?? 1) - (b.version ?? 1));
}

export function buildDecisionLedger(plan: ProductPlan, memory?: ProductMemory): DecisionLedger {
  const corpus = [plan.sourceText, ...(memory?.items ?? []).map((item) => item.text)].join("\n");
  const parsed = [...parseLedgerJson(plan.sourceText), ...parseLayeredDecision(plan.sourceText), ...parseLedgerBlocks(plan.sourceText), ...parseVersionCards(plan.sourceText)].map((item) => refresh(item, corpus));
  const recalled = (memory?.ledger ?? []).map((item) => refresh(item, corpus));
  const used = new Set<number>();
  const assignedParsed = parsed.map((item) => assignNumber(item, used, item.number || nextNumber(memory, parsed)));
  let seed = nextNumber(memory, assignedParsed);
  const architecture = architectureEntries(plan, corpus)
    .filter((item) => ![...recalled, ...assignedParsed].some((entry) => sameQuestion(entry.question, item.question) || (item.decision && entry.decision === item.decision)))
    .map((item) => assignNumber(item, used, seed++));
  const live = engineEntry(plan, corpus);
  const already = [...recalled, ...assignedParsed, ...architecture].some((item) => sameQuestion(item.question, live.question));
  const current = already ? [] : [assignNumber(live, used, seed++)];
  const originals = parseOriginalAssumptions(plan.sourceText);
  const refs = parseDecisionNumbers(plan.sourceText);
  const entries = mergeLedgerEntries(recalled, [...assignedParsed, ...architecture, ...current]).map((item) => {
    const extra =
      refs.includes(item.number) || item.assumptions.some((line) => originals.some((text) => normalize(text) === normalize(line.text)))
        ? originals.filter((text) => !item.assumptions.some((line) => normalize(line.text) === normalize(text)))
        : [];
    return refresh(
      {
        ...item,
        assumptions: [
          ...item.assumptions,
          ...extra.map((text, index) => structureAssumption({ text, health: "untested" }, item.assumptions.length + index, corpus)),
        ],
      },
      corpus,
    );
  });
  return {
    note: LEDGER_NOTE,
    ascii: LEDGER_ASCII,
    versionAscii: VERSION_ASCII,
    entries,
    nextNumber: entries.length ? Math.max(...entries.map((item) => item.number)) + 1 : seed,
  };
}

export function recordLedgerChoice(plan: ProductPlan, optionId: string, at: string): DecisionLedger {
  const board = plan.decisionLedger ?? emptyDecisionLedger();
  const option = plan.decisionEngine.options.find((item) => item.id === optionId);
  if (!option) return board;
  const letterKey = letter(plan.decisionEngine.options.indexOf(option));
  const decision = `${letterKey}. ${option.title}`;
  return {
    ...board,
    entries: board.entries.map((entry) =>
      sameQuestion(entry.question, plan.decisionEngine.question)
        ? {
            ...entry,
            decision,
            reason: option.summary,
            owner: entry.owner || "Human",
            date: at.slice(0, 10),
            status: "recorded" as const,
            lifecycle: "active" as const,
            kind: kindOf(entry.question, decision),
            decisionId: entry.decisionId || `DEC-${entry.number}`,
          }
        : entry,
    ),
  };
}

export function parsedEngineOptions(source: string) {
  const block = parseLedgerBlocks(source).find((item) => item.options.length >= 2);
  if (!block) return null;
  return block;
}

export function askLedger(input: { entries: LedgerEntry[]; query: string; corpus?: string }): LedgerAnswer {
  const query = input.query.trim();
  const entries = input.entries.map((item) => refresh(item, input.corpus ?? ""));
  if (!query) return { query, kind: "search", entries: [], answer: "Ask why a recorded choice was made, or which assumptions no longer hold." };
  const why = /why did we (choose|pick|select)|why this architecture|why .* architecture/i.test(query);
  const stale = /no longer valid|assumptions behind|which assumptions/i.test(query);
  if (why) {
    const hits = entries.filter((item) => item.status === "recorded" && (item.kind === "architecture" || ARCH.test(`${item.question} ${item.decision}`)));
    if (!hits.length) {
      return { query, kind: "why", entries: [], answer: "No recorded architecture decision answers this yet." };
    }
    const answer = hits
      .map((item) => `${item.decisionId || `DEC-${item.number}`} (Decision #${item.number}). We chose ${item.decision}. Why: ${item.reason} Owner: ${item.owner || "Unassigned"}. Date: ${item.date || "unrecorded"}.`)
      .join(" ");
    return { query, kind: "why", entries: hits, answer };
  }
  if (stale) {
    const hits = entries.filter((item) => item.assumptions.some((line) => line.health === "stale"));
    if (!hits.length) {
      return { query, kind: "assumptions", entries: [], answer: "No recorded assumption has been contradicted." };
    }
    const answer = hits
      .flatMap((item) =>
        item.assumptions
          .filter((line) => line.health === "stale")
          .map((line) => `Decision #${item.number}. ${line.text}${line.note ? ` ${line.note}.` : ""}`),
      )
      .join(" ");
    return { query, kind: "assumptions", entries: hits, answer };
  }
  const words = contentWords(query);
  const hits = entries.filter((item) => {
    const blob = `${item.question} ${item.decision} ${item.reason}`.toLowerCase();
    return words.length ? words.filter((word) => blob.includes(word)).length >= Math.min(2, words.length) : false;
  });
  return {
    query,
    kind: "search",
    entries: hits,
    answer: hits.length
      ? hits.map((item) => `Decision #${item.number}: ${item.question} ${item.decision || "Open."}`).join(" ")
      : "No ledger entry matches that question.",
  };
}

export function ledgerMarkdown(plan: ProductPlan) {
  const board = plan.decisionLedger;
  if (!board?.entries.length) return "No significant product decisions are on the ledger yet.";
  return board.entries
    .map((item) => {
      const options = item.options.map((option) => `${option.key}. ${option.title}`).join("\n");
      const evidence = item.evidence.map((line) => `- ${line.text} (${line.evidence})`).join("\n") || "- None named.";
      const assumptions = item.assumptions.map((line) => `- ${line.text} (${line.health})`).join("\n") || "- None named.";
      const observations = item.observations.map((line) => `- ${line.statement || line.text}`).join("\n") || "- None named.";
      const triggers = (item.reviewTriggers ?? []).map((line) => `- ${line}`).join("\n") || "- None named.";
      const object = ledgerObject(item);
      return `Decision #${item.number}
decisionId: ${object.decisionId}
status: ${object.status}

Question:
${item.question}

Options:
${options || "- None named."}

Observation:
${observations}

Evidence:
${evidence}

Constraints:
${item.constraints.map((line) => `- ${line}`).join("\n") || "- None named."}

Risks:
${item.risks.map((line) => `- ${line}`).join("\n") || "- None named."}

Assumptions:
${assumptions}

Review triggers:
${triggers}

Decision:
${item.decision || "Open."}

Confidence:
${item.decisionConfidence || "Unlabeled"}

Why:
${item.reason || "A person has not chosen yet."}

Owner:
${item.owner || "Unassigned"}

Date:
${item.date || "Unrecorded"}`;
    })
    .join("\n\n");
}
