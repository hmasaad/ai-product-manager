import { parseDecisionNumbers, parseOriginalAssumptions } from "./reevaluate";
import { contentWords } from "./text";
import type {
  AssumptionHealth,
  DecisionFact,
  DecisionLedger,
  Evidence,
  LedgerAnswer,
  LedgerEntry,
  LedgerKind,
  LedgerOption,
  ProductMemory,
  ProductPlan,
} from "./types";

export const LEDGER_NOTE =
  "Every significant product decision is stored: the question, the options, the evidence, constraints, risks, assumptions, the choice, the reason, the owner, and the date. Later the PM can ask why a choice was made, or which assumptions no longer hold.";

export const LEDGER_ASCII = `                    DECISION LEDGER
                            │
                            ↓
                      Decision #N
                            │
         Question → Options → Evidence
         Constraints → Risks → Assumptions
                            │
                            ↓
           Decision → Reason → Owner → Date`;

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
  if (/rarely (need|use) offline/i.test(text) && /offline usage increased/i.test(blob)) {
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
  return lines.filter(Boolean).map((text) => ({ text, ...healthOf(text, corpus) }));
}

export function emptyDecisionLedger(): DecisionLedger {
  return { note: LEDGER_NOTE, ascii: LEDGER_ASCII, entries: [], nextNumber: 1 };
}

function bullets(block: string) {
  return block
    .split(/\n/)
    .map((line) => line.replace(/^[-*•]\s*/, "").replace(/^[A-Z]\.\s+/, "").trim())
    .filter((line) => line.length > 1 && !/^(question|options?|evidence|constraints?|risks?|assumptions?|decision|reason|owner|date):?$/i.test(line));
}

function section(source: string, name: string) {
  const match = new RegExp(`(?:^|\\n)\\s*${name}\\s*:?\\s*\\n([\\s\\S]*?)(?=\\n\\s*(?:Question|Options?|Evidence|Constraints?|Risks?|Assumptions?|Decision|Reason|Owner|Date)\\s*:?\\s*\\n|$)`, "i").exec(
    `\n${source}\n`,
  );
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
    const reason = inline(chunk, "Reason") || section(chunk, "Reason").replace(/\s+/g, " ").trim();
    const owner = inline(chunk, "Owner") || bullets(section(chunk, "Owner"))[0] || "";
    const date = inline(chunk, "Date") || bullets(section(chunk, "Date"))[0] || "";
    const number = numbered ? Number(numbered[1]) : 0;
    const asked = question || "";
    entries.push({
      number,
      id: number ? `LEDGER-${number}` : `LEDGER-parsed-${entries.length + 1}`,
      kind: kindOf(asked, decision),
      question: asked,
      options,
      evidence: bullets(section(chunk, "Evidence")).map((text) => fact(text)),
      constraints: bullets(section(chunk, "Constraints?")),
      risks: bullets(section(chunk, "Risks?")),
      assumptions: withHealth(bullets(section(chunk, "Assumptions?")), source),
      decision,
      reason,
      owner,
      date,
      status: decision ? "recorded" : "open",
    });
  }
  return entries.filter((item) => item.question || item.options.length);
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
  let number = entry.number > 0 && !used.has(entry.number) ? entry.number : fallback;
  while (used.has(number)) number += 1;
  used.add(number);
  return { ...entry, number, id: `LEDGER-${number}` };
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
    entries.push({
      number: 0,
      id: "",
      kind: "architecture",
      question: rule.question,
      options: [{ key: "A", title: text }],
      evidence: [fact(text)],
      constraints: [text],
      risks: [],
      assumptions: withHealth([], corpus),
      decision: text,
      reason: "Stated in the source.",
      owner: "Source",
      date: plan.createdAt.slice(0, 10),
      status: "recorded",
    });
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
  return {
    number: 0,
    id: "",
    kind: kindOf(engine.question, decision),
    question: engine.question,
    options: optionsFromEngine(plan),
    evidence: engine.contexts.flatMap((ctx) => ctx.lines).slice(0, 6),
    constraints: plan.constraints.slice(0, 4),
    risks: [...new Set(engine.options.flatMap((item) => item.risks))].slice(0, 4),
    assumptions: withHealth(
      plan.decisions.filter((item) => item.status === "assumption").map((item) => item.decision).slice(0, 4),
      corpus,
    ),
    decision,
    reason: chosen?.summary ?? engine.record.rationale ?? "",
    owner: chosen ? "Human" : "",
    date: engine.record.at?.slice(0, 10) ?? "",
    status: chosen ? "recorded" : "open",
  };
}

function refresh(entry: LedgerEntry, corpus: string): LedgerEntry {
  return {
    ...entry,
    assumptions: entry.assumptions.map((item) => ({ text: item.text, ...healthOf(item.text, corpus) })),
  };
}

export function mergeLedgerEntries(left: LedgerEntry[], right: LedgerEntry[]) {
  const byNumber = new Map<number, LedgerEntry>();
  const unnumbered: LedgerEntry[] = [];
  for (const item of [...left, ...right]) {
    if (item.number > 0) {
      const current = byNumber.get(item.number);
      if (!current || (item.status === "recorded" && current.status === "open") || item.date >= (current.date ?? "")) {
        byNumber.set(item.number, item);
      }
    } else {
      unnumbered.push(item);
    }
  }
  const used = new Set(byNumber.keys());
  let next = used.size ? Math.max(...used) + 1 : 1;
  for (const item of unnumbered) {
    const twin = [...byNumber.values()].find((entry) => sameQuestion(entry.question, item.question));
    if (twin) {
      if (item.status === "recorded" && twin.status === "open") byNumber.set(twin.number, { ...item, number: twin.number, id: twin.id });
      continue;
    }
    const assigned = assignNumber(item, used, next);
    next = assigned.number + 1;
    byNumber.set(assigned.number, assigned);
  }
  return [...byNumber.values()].sort((a, b) => a.number - b.number);
}

export function buildDecisionLedger(plan: ProductPlan, memory?: ProductMemory): DecisionLedger {
  const corpus = [plan.sourceText, ...(memory?.items ?? []).map((item) => item.text)].join("\n");
  const parsed = parseLedgerBlocks(plan.sourceText).map((item) => refresh(item, corpus));
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
        assumptions: [...item.assumptions, ...extra.map((text) => ({ text, health: "untested" as const }))],
      },
      corpus,
    );
  });
  return {
    note: LEDGER_NOTE,
    ascii: LEDGER_ASCII,
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
            kind: kindOf(entry.question, decision),
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
      .map((item) => `Decision #${item.number}. We chose ${item.decision}. ${item.reason} Owner: ${item.owner || "Unassigned"}. Date: ${item.date || "unrecorded"}.`)
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
      return `Decision #${item.number}

Question:
${item.question}

Options:
${options || "- None named."}

Evidence:
${evidence}

Constraints:
${item.constraints.map((line) => `- ${line}`).join("\n") || "- None named."}

Risks:
${item.risks.map((line) => `- ${line}`).join("\n") || "- None named."}

Assumptions:
${assumptions}

Decision:
${item.decision || "Open."}

Reason:
${item.reason || "A person has not chosen yet."}

Owner:
${item.owner || "Unassigned"}

Date:
${item.date || "Unrecorded"}`;
    })
    .join("\n\n");
}
