import type {
  DecisionFact,
  DecisionReevaluation,
  Evidence,
  LedgerEntry,
  ProductMemory,
  ProductPlan,
  ReevaluationCase,
} from "./types";

export const REEVAL_NOTE =
  "A recorded decision is watched. New evidence is checked against its assumptions. When an assumption changes, the blast radius is named and a person is asked whether to revisit the decision.";

export const REEVAL_ASCII = `Decision
   ↓
New Evidence
   ↓
Assumption Changed?
   ↓
Impact Analysis
   ↓
Should Decision Be Revisited?`;

export const REEVAL_WARNING = "Previous assumption may be invalid.";

export const OFFLINE_AFFECTED = ["Offline architecture", "Sync strategy", "Data caching", "Product roadmap"];

function fact(text: string, evidence: Evidence = "stated"): DecisionFact {
  return { text, evidence };
}

export function emptyDecisionReevaluation(): DecisionReevaluation {
  return { note: REEVAL_NOTE, ascii: REEVAL_ASCII, cases: [] };
}

export function parseDecisionNumbers(source: string) {
  const found = new Set<number>();
  const matcher = /Decision\s*#\s*(\d+)/gi;
  let match: RegExpExecArray | null;
  while ((match = matcher.exec(source))) found.add(Number(match[1]));
  return [...found];
}

export function parseOriginalAssumptions(source: string) {
  const lines: string[] = [];
  const block = /Original assumptions?:\s*\n([\s\S]*?)(?=\n\s*(?:\d+\s+months later|New evidence|Offline usage|Decision\s*#|Question:|Options:|Evidence:|Constraints:|Risks:|Assumptions:|Decision:|Reason:)|$)/i.exec(
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

function parseNewEvidence(source: string, memory?: ProductMemory): DecisionFact[] {
  const facts: DecisionFact[] = [];
  const usage = source.match(/offline usage increased[^\n.]*/i)?.[0]?.replace(/\s+/g, " ").trim();
  if (usage) facts.push(fact(/[.]$/.test(usage) ? usage : `${usage}.`));
  const stale = source.match(/[^\n.]*(?:no longer (?:holds|valid|true)|now have continuous|now have reliable)[^\n.]*/i)?.[0]?.replace(/\s+/g, " ").trim();
  if (stale) facts.push(fact(/[.]$/.test(stale) ? stale : `${stale}.`));
  for (const item of memory?.items ?? []) {
    if (item.kind !== "metric" && item.kind !== "feedback") continue;
    if (/offline usage increased|no longer (holds|valid)|now have continuous/i.test(item.text)) {
      facts.push(fact(item.text, item.evidence));
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

function assumptionChanged(assumption: string, evidence: string) {
  if (/rarely (need|use) offline/i.test(assumption) && /offline usage increased/i.test(evidence)) return true;
  if (/without cell signal|full shift/i.test(assumption) && /no longer (holds|valid)|now have continuous|now have reliable/i.test(evidence)) {
    return /cell signal|lte|offline|shift/i.test(evidence);
  }
  return false;
}

function affectedFor(entry: LedgerEntry, assumption: string, evidence: string) {
  const blob = `${entry.question} ${entry.decision} ${assumption} ${evidence}`;
  if (/offline|sync|queue|cach/i.test(blob)) return [...OFFLINE_AFFECTED];
  if (/cityworks|system of record/i.test(blob)) return ["System of record", "Product roadmap"];
  if (/immutable|append-only|revision/i.test(blob)) return ["Ledger policy", "Audit trail", "Product roadmap"];
  return ["Product roadmap"];
}

function reviewCase(input: {
  number: number;
  question: string;
  decision: string;
  assumption: string;
  evidence: DecisionFact;
}): ReevaluationCase {
  return {
    decisionNumber: input.number,
    question: input.question,
    decision: input.decision,
    assumption: input.assumption,
    evidence: input.evidence,
    changed: true,
    warning: REEVAL_WARNING,
    affected: affectedFor(
      {
        number: input.number,
        id: `LEDGER-${input.number}`,
        kind: "architecture",
        question: input.question,
        options: [],
        evidence: [],
        constraints: [],
        risks: [],
        assumptions: [],
        decision: input.decision,
        reason: "",
        owner: "",
        date: "",
        status: "recorded",
      },
      input.assumption,
      input.evidence.text,
    ),
    recommendation: `Review decision #${input.number}.`,
    verdict: "review",
  };
}

export function buildDecisionReevaluation(plan: ProductPlan, memory?: ProductMemory): DecisionReevaluation {
  const corpus = [plan.sourceText, ...(memory?.items ?? []).map((item) => item.text)].join("\n");
  const evidence = parseNewEvidence(corpus, memory);
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
    const assumptions = [
      ...entry.assumptions.map((item) => item.text),
      ...extra,
    ].filter(Boolean);
    for (const assumption of assumptions) {
      for (const line of evidence) {
        if (!assumptionChanged(assumption, `${line.text} ${corpus}`)) continue;
        add(
          reviewCase({
            number: entry.number,
            question: entry.question,
            decision: entry.decision,
            assumption,
            evidence: line,
          }),
        );
      }
    }
  }

  for (const number of refs) {
    if (cases.some((item) => item.decisionNumber === number)) continue;
    const entry = plan.decisionLedger?.entries.find((item) => item.number === number);
    for (const assumption of originals) {
      for (const line of evidence) {
        if (!assumptionChanged(assumption, `${line.text} ${corpus}`)) continue;
        add(
          reviewCase({
            number,
            question: entry?.question || `Decision #${number}`,
            decision: entry?.decision ?? "",
            assumption,
            evidence: line,
          }),
        );
      }
    }
  }

  return {
    note: REEVAL_NOTE,
    ascii: REEVAL_ASCII,
    cases,
  };
}

export function reevaluationMarkdown(plan: ProductPlan) {
  const board = plan.decisionReevaluation;
  if (!board?.cases.length) return "No recorded decision has new contradicting evidence.";
  return board.cases
    .map((item) => {
      return `Decision #${item.decisionNumber}

Question: ${item.question}
Decision: ${item.decision || "Recorded."}

New evidence: ${item.evidence.text} (${item.evidence.evidence})
Assumption changed? ${item.changed ? "Yes." : "No."}
⚠ ${item.warning}

Affected decisions:
${item.affected.map((line) => `- ${line}`).join("\n")}

Recommendation:
${item.recommendation}

Should the decision be revisited? ${item.verdict === "review" ? "Yes. Review it." : "Hold."}`;
    })
    .join("\n\n");
}
