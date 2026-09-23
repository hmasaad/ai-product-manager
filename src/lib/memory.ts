import { contentWords } from "./text";
import type {
  ContextHit,
  Evidence,
  Judgment,
  MemoryItem,
  MemoryKind,
  ProductContext,
  ProductMemory,
  ProductPlan,
  Requirement,
} from "./types";

export const MEMORY_KINDS: { kind: MemoryKind; label: string }[] = [
  { kind: "feature", label: "Existing features" },
  { kind: "decision", label: "Previous decisions" },
  { kind: "goal", label: "Product goals" },
  { kind: "persona", label: "Personas" },
  { kind: "constraint", label: "Constraints" },
  { kind: "prd", label: "Previous PRDs" },
  { kind: "limitation", label: "Known technical limitations" },
  { kind: "experiment", label: "Previous experiments" },
  { kind: "roadmap", label: "Product roadmap" },
  { kind: "feedback", label: "User feedback" },
  { kind: "metric", label: "Product metrics" },
];

const LIMITATION = /kubernetes|microservice|offline|codebase|okta|identity|no cell|cannot live|one codebase|managed app/i;
const DECISION = /do not|don't|remains the|held for later|no microservices|no kubernetes/i;

export function emptyMemory(): ProductMemory {
  return { product: "", updatedAt: "", items: [] };
}

export function emptyContext(): ProductContext {
  return { product: "", recalled: 0, alreadyExists: [], conflicts: [] };
}

function itemId(kind: MemoryKind, text: string) {
  return `${kind}:${text.toLowerCase().replace(/\s+/g, " ").trim().slice(0, 180)}`;
}

function add(
  items: MemoryItem[],
  kind: MemoryKind,
  text: string,
  source: string,
  at: string,
  evidence: Evidence = "stated",
) {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length < 3) return;
  const id = itemId(kind, clean);
  if (items.some((item) => item.id === id)) return;
  items.push({ id, kind, text: clean.slice(0, 500), evidence, source, at });
}

export function rememberPlan(memory: ProductMemory, plan: ProductPlan): ProductMemory {
  if (plan.maturity === "problem") return memory;
  const items = [...memory.items];
  const source = plan.title;
  const at = plan.createdAt;
  for (const feature of plan.features) {
    add(items, "feature", `${feature.name} — ${feature.outcome}`, source, at);
    if (feature.scope === "later") {
      add(items, "decision", `Held for later: ${feature.name}. ${feature.outcome}`, source, at, "inferred");
    }
  }
  for (const goal of plan.problem.success) add(items, "goal", goal, source, at);
  for (const goal of plan.discovery?.businessGoals ?? []) add(items, "goal", goal.text, source, at, goal.evidence);
  for (const persona of plan.personas) {
    add(items, "persona", `${persona.role}: ${persona.context}`, source, at, persona.evidence);
  }
  for (const constraint of plan.constraints) {
    add(items, "constraint", constraint, source, at);
    if (DECISION.test(constraint)) add(items, "decision", constraint, source, at);
    if (LIMITATION.test(constraint)) add(items, "limitation", constraint, source, at);
  }
  for (const goal of plan.problem.nonGoals) add(items, "decision", goal, source, at);
  if (plan.prd?.overview) {
    add(items, "prd", `${plan.title}. ${plan.prd.overview}`, source, at);
  }
  for (const line of plan.prd?.nonFunctionalRequirements ?? []) {
    add(items, "limitation", line.text, source, at, line.evidence);
  }
  if (plan.proposed) {
    add(
      items,
      "experiment",
      `Proposed, not a signed scope: ${plan.title}. ${plan.assumptions[0] ?? "The request was a one-line build."}`,
      source,
      at,
      "inferred",
    );
  }
  for (const experiment of plan.experiments ?? []) {
    add(
      items,
      "experiment",
      `${experiment.idea}: ${experiment.hypothesis} Experiment: ${experiment.experiment} Metric: ${experiment.metric} Success: ${experiment.successCriteria} Decision: pending (Build / Modify / Abandon).`,
      source,
      at,
      experiment.evidence,
    );
  }
  for (const gate of plan.approvals?.gates ?? []) {
    add(
      items,
      "decision",
      `${gate.status === "pending" ? "Pending approval" : gate.status}: ${gate.kind} — ${gate.proposal}`,
      source,
      at,
      gate.evidenceTag,
    );
  }
  for (const loop of plan.analytics?.loops ?? []) {
    const decline = loop.stages.find((item) => item.id === "declining")?.text;
    const problem = loop.stages.find((item) => item.id === "problem")?.text;
    const opportunity = loop.stages.find((item) => item.id === "opportunity")?.text;
    if (decline) add(items, "metric", `${loop.feature}: ${decline}`, source, at);
    if (problem && opportunity) {
      add(items, "feedback", `Analytics: ${problem} Opportunity: ${opportunity}`, source, at);
    }
  }
  for (const sprint of plan.roadmap?.sprints ?? []) {
    const names = sprint.featureIds
      .map((id) => plan.features.find((feature) => feature.id === id)?.name ?? id)
      .join(", ");
    if (names) add(items, "roadmap", `${sprint.name}: ${names}`, source, at, "inferred");
  }
  const capped: MemoryItem[] = [];
  for (const kind of MEMORY_KINDS) {
    capped.push(...items.filter((item) => item.kind === kind.kind).slice(-40));
  }
  return {
    product: plan.title || memory.product,
    updatedAt: at,
    items: capped,
  };
}

export function rememberNotes(
  memory: ProductMemory,
  notes: { feedback?: string; metrics?: string; at?: string },
): ProductMemory {
  const items = [...memory.items];
  const at = notes.at ?? new Date().toISOString();
  for (const line of splitNotes(notes.feedback ?? "")) add(items, "feedback", line, "User feedback", at);
  for (const line of splitNotes(notes.metrics ?? "")) add(items, "metric", line, "Product metrics", at);
  return { ...memory, updatedAt: at, items };
}

function splitNotes(text: string) {
  return text
    .split("\n")
    .map((line) => line.replace(/^[-*•]\s*/, "").trim())
    .filter((line) => line.length > 2);
}

function featureName(text: string) {
  return text.split("—")[0]?.split(":")[0]?.trim() ?? text;
}

export function featureHit(request: string, text: string) {
  const words = contentWords(featureName(text));
  if (words.length >= 2) {
    const blob = request.toLowerCase();
    const hits = words.filter((word) => blob.includes(word));
    return hits.length >= 2;
  }
  const only = words[0] ?? "";
  return only.length >= 12 && request.toLowerCase().includes(only);
}

export function conflictsWith(request: string, decision: string) {
  const ban = /(?:do not|don't)\s+(replace|redesign|remove|drop|rewrite)\s+([^.]{2,80})/i.exec(decision);
  if (ban) {
    const verb = ban[1].toLowerCase();
    const objectWords = contentWords(ban[2]).slice(0, 3);
    if (
      objectWords.length > 0 &&
      objectWords.every((word) => request.toLowerCase().includes(word)) &&
      new RegExp(`\\b${verb}\\b`, "i").test(request)
    ) {
      return true;
    }
  }
  const remains = /\b([A-Za-z][A-Za-z0-9]+)\s+remains\b/.exec(decision);
  if (remains && new RegExp(`\\breplace\\s+${remains[1]}\\b`, "i").test(request)) return true;
  const bannedTech = /\bno\s+(microservices?|kubernetes)\b/i.exec(decision);
  if (
    bannedTech &&
    new RegExp(bannedTech[1], "i").test(request) &&
    /\b(use|add|build|adopt|move)\b/i.test(request)
  ) {
    return true;
  }
  return false;
}

function hitsFor(request: string, items: MemoryItem[], test: (request: string, text: string) => boolean): ContextHit[] {
  const seen = new Set<string>();
  const hits: ContextHit[] = [];
  for (const item of items) {
    if (!test(request, item.text) || seen.has(item.text)) continue;
    seen.add(item.text);
    hits.push({ request, memoryId: item.id, kind: item.kind, text: item.text });
  }
  return hits;
}

export function consultMemory(judgment: Judgment, memory: ProductMemory, request: string): {
  judgment: Judgment;
  context: ProductContext;
} {
  if (!memory.items.length || !request.trim()) {
    return { judgment, context: { ...emptyContext(), product: memory.product, recalled: memory.items.length } };
  }
  const features = memory.items.filter((item) => item.kind === "feature");
  const decisions = memory.items.filter((item) => item.kind === "decision" || item.kind === "constraint");
  const alreadyExists = hitsFor(request, features, featureHit);
  const conflicts = hitsFor(request, decisions, conflictsWith);
  const blocked = (statement: string) =>
    alreadyExists.some((hit) => featureHit(statement, hit.text)) || conflicts.some((hit) => conflictsWith(statement, hit.text));
  const requirements: Requirement[] = judgment.requirements.filter((item) => !blocked(item.statement));
  const nonGoals = [...judgment.problem.nonGoals];
  const openQuestions = [...judgment.problem.openQuestions];
  for (const hit of alreadyExists) {
    const line = `Already recorded: ${hit.text}`;
    if (!nonGoals.includes(line)) nonGoals.push(line);
    openQuestions.push(`The request repeats recorded work (${featureName(hit.text)}). Confirm a change before writing a new requirement.`);
  }
  for (const hit of conflicts) {
    const line = `Earlier decision stands: ${hit.text}`;
    if (!nonGoals.includes(line)) nonGoals.push(line);
    openQuestions.push(`The request conflicts with a recorded decision. That decision stands until it is explicitly reversed.`);
  }
  const research = [...judgment.research];
  if (alreadyExists.length || conflicts.length) {
    research.push({
      topic: "Product context",
      finding: [
        ...alreadyExists.map((hit) => `Already recorded: ${featureName(hit.text)}.`),
        ...conflicts.map((hit) => `Kept an earlier decision: ${hit.text}`),
      ].join(" "),
      evidence: "stated",
      implication: "This plan leaves recorded features and decisions in place.",
    });
  }
  return {
    judgment: {
      ...judgment,
      requirements,
      research,
      problem: { ...judgment.problem, nonGoals, openQuestions },
    },
    context: {
      product: memory.product,
      recalled: memory.items.length,
      alreadyExists,
      conflicts,
    },
  };
}

export function mergeMemory(left: ProductMemory, right: ProductMemory): ProductMemory {
  if (!left.items.length) return right.items.length ? right : left;
  if (!right.items.length) return left;
  const items = [...left.items];
  for (const item of right.items) {
    if (!items.some((current) => current.id === item.id)) items.push(item);
  }
  const newer = left.updatedAt >= right.updatedAt ? left : right;
  return { product: newer.product, updatedAt: newer.updatedAt, items };
}
