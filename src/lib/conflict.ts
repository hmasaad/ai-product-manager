import type { ImpactLevel, ProductInput, ProductMemory, ProductPlan, RequirementConflict } from "./types";

export const CONFLICT_NOTE =
  "A conflict is an opposite claim, not a repeated feature. New requirements are read from the request. Existing requirements come from the existing-product notes and remembered decisions. Architecture comes from constraints and recorded technical limits.";

const NEGATION = /\b(do not|don't|does not|cannot|can't|never|no)\b/i;

const TOPIC_ALIASES: [RegExp, string][] = [
  [/\btransactions?\b|\bledger\b|\bposted entries\b|\bappend-only\b/i, "transaction"],
  [/\bcityworks\b/i, "cityworks"],
  [/\bbilling portal\b|\binvoice\b|\bamount due\b/i, "billing"],
  [/\bkubernetes\b/i, "kubernetes"],
  [/\bmicroservices?\b/i, "microservice"],
  [/\bokta\b|\bidentity source\b/i, "identity"],
];

type Rule = {
  id: string;
  impact: ImpactLevel;
  resolution: string;
  newMatches: (text: string) => boolean;
  existingMatches: (text: string) => boolean;
};

const RULES: Rule[] = [
  {
    id: "mutate-vs-immutable",
    impact: "high",
    resolution: "Clarify whether editing creates a revision or modifies the original transaction.",
    newMatches: (text) =>
      /\b((?:can|may|allow(?:s|ed)?|enable[sd]?)\s+(?:\w+\s+){0,4}(edit|change|modify|update)|edit(?:ing|s)?\s+submitted|modify(?:ing)?\s+(the\s+)?original)\b/i.test(
        text,
      ) && !NEGATION.test(text),
    existingMatches: (text) =>
      /\b(immutable|append-only|unchangeable)\b/i.test(text) ||
      (NEGATION.test(text) && /\b(edit|change|modify|update)\b/i.test(text) && /\b(submitted|posted|transaction|ledger)\b/i.test(text)),
  },
  {
    id: "replace-vs-remains",
    impact: "high",
    resolution: "Keep the recorded system, or open an explicit decision to replace it.",
    newMatches: (text) => /\breplace[sd]?\b/i.test(text) && !NEGATION.test(text),
    existingMatches: (text) =>
      /\bremains\b/i.test(text) || (NEGATION.test(text) && /\breplace\b/i.test(text)),
  },
  {
    id: "redesign-vs-keep",
    impact: "high",
    resolution: "Keep the current surface, or open a decision to redesign it.",
    newMatches: (text) => /\bredesign\b/i.test(text) && !NEGATION.test(text),
    existingMatches: (text) => NEGATION.test(text) && /\bredesign\b/i.test(text),
  },
  {
    id: "write-vs-readonly",
    impact: "high",
    resolution: "Clarify whether this product writes back, or only reads from the system of record.",
    newMatches: (text) => /\b(write back|writes back)\b/i.test(text) && !NEGATION.test(text),
    existingMatches: (text) => /\bread-only\b/i.test(text) && /\b(system of record|cityworks|work-order)\b/i.test(text),
  },
  {
    id: "delete-vs-retain",
    impact: "high",
    resolution: "Clarify whether a delete removes the record or only hides it from the default view.",
    newMatches: (text) => /\b(can|may|allow(?:s|ed)?)\s+(?:\w+\s+){0,3}delete\b/i.test(text) && !NEGATION.test(text),
    existingMatches: (text) =>
      /\b(retain|retention|cannot delete|do not delete|immutable)\b/i.test(text) && /\b(record|inspection|transaction|photo)\b/i.test(text),
  },
  {
    id: "banned-architecture",
    impact: "high",
    resolution: "Keep the recorded architecture limit, or open an explicit decision to reverse it.",
    newMatches: (text) =>
      /\b(use|add|build|adopt|move to|run)\b/i.test(text) &&
      /\b(kubernetes|microservices?)\b/i.test(text) &&
      !NEGATION.test(text),
    existingMatches: (text) => /\bno\s+(kubernetes|microservices?)\b/i.test(text),
  },
];

function clean(text: string) {
  return text
    .replace(/^[-*#>\d.)\s]+/, "")
    .replace(/^["“]|["”]$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function statements(text: string) {
  return text
    .split(/\n+|(?<=[.!?])\s+(?=[A-Z“"])/)
    .map(clean)
    .filter((line) => line.length >= 12 && !/^#{1,6}\s/.test(line));
}

function topics(text: string) {
  const found = new Set<string>();
  for (const [pattern, topic] of TOPIC_ALIASES) {
    if (pattern.test(text)) found.add(topic);
  }
  return found;
}

function shareTopic(left: string, right: string) {
  const a = topics(left);
  const b = topics(right);
  if (!a.size || !b.size) return false;
  for (const topic of a) {
    if (b.has(topic)) return true;
  }
  return false;
}

function quote(text: string) {
  const inner = clean(text);
  return `"${inner.replace(/^["“]|["”]$/g, "")}"`;
}

function collectExisting(input: ProductInput, memory?: ProductMemory) {
  const lines = statements(input.existing);
  for (const item of memory?.items ?? []) {
    if (item.kind === "decision" || item.kind === "constraint" || item.kind === "prd" || item.kind === "feature") {
      lines.push(clean(item.text));
    }
  }
  return [...new Set(lines.filter(Boolean))];
}

function collectArchitecture(input: ProductInput, memory?: ProductMemory, constraints: string[] = []) {
  const lines = [...statements(input.constraints), ...constraints.map(clean)];
  const fromExisting = input.existing.match(/##\s*Architecture\n+([\s\S]*?)(?=\n##\s|$)/i);
  if (fromExisting) lines.push(...statements(fromExisting[1]));
  for (const item of memory?.items ?? []) {
    if (item.kind === "limitation" || item.kind === "constraint") lines.push(clean(item.text));
  }
  return [...new Set(lines.filter(Boolean))];
}

export function detectConflicts(input: {
  input: ProductInput;
  constraints?: string[];
  memory?: ProductMemory;
}): RequirementConflict[] {
  const next = statements(input.input.brief);
  const existing = collectExisting(input.input, input.memory);
  const architecture = collectArchitecture(input.input, input.memory, input.constraints);
  const seen = new Set<string>();
  const conflicts: RequirementConflict[] = [];

  const consider = (fresh: string, prior: string, against: RequirementConflict["against"]) => {
    if (fresh.toLowerCase() === prior.toLowerCase()) return;
    if (!shareTopic(fresh, prior)) return;
    for (const rule of RULES) {
      if (!rule.newMatches(fresh) || !rule.existingMatches(prior)) continue;
      const key = `${rule.id}:${fresh}:${prior}:${against}`;
      if (seen.has(key)) continue;
      seen.add(key);
      conflicts.push({
        id: `CF${conflicts.length + 1}`,
        newRequirement: quote(fresh),
        existingRequirement: quote(prior),
        against,
        impact: rule.impact,
        resolution: rule.resolution,
        rule: rule.id,
      });
    }
  };

  for (const fresh of next) {
    for (const prior of existing) consider(fresh, prior, "requirement");
    for (const prior of architecture) consider(fresh, prior, "architecture");
  }

  return conflicts;
}

export function conflictMarkdown(plan: ProductPlan) {
  if (!plan.conflicts?.length) return "No requirement conflict was found.";
  return plan.conflicts
    .map((item) => {
      const label = item.against === "architecture" ? "Architecture" : "Existing";
      return `⚠ Requirement Conflict

New:
${item.newRequirement}

${label}:
${item.existingRequirement}

Impact:
${item.impact}

Suggested resolution:
${item.resolution}`;
    })
    .join("\n\n");
}
