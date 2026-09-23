import type { DecisionStatus, ProductPlan, TrackedDecision } from "./types";

export const ASSUMPTION_NOTE =
  "Every generated decision has a status: confirmed, assumption, inferred, unknown, or needs validation. An assumption stays an assumption until someone validates it. It does not become a requirement on its own.";

export const STATUS_LABEL: Record<DecisionStatus, string> = {
  confirmed: "Confirmed",
  assumption: "Assumption",
  inferred: "Inferred",
  unknown: "Unknown",
  needsValidation: "Needs validation",
};

const PDF_ASSUMPTION = "Most users will export reports as PDF.";
const PDF_VALIDATION = "Interview 5 users before implementation.";

function card(
  id: string,
  decision: string,
  status: DecisionStatus,
  validation?: string,
): TrackedDecision {
  return {
    id,
    decision,
    status,
    validation: status === "confirmed" ? undefined : validation,
  };
}

function validationFor(decision: string, status: DecisionStatus) {
  if (status === "confirmed") return undefined;
  if (decision === PDF_ASSUMPTION) return PDF_VALIDATION;
  if (status === "needsValidation") return "Clarify before implementation.";
  if (status === "inferred") return "Confirm this before treating it as a requirement.";
  if (status === "unknown") return "Collect a stated answer before implementation.";
  return "Validate this before implementation.";
}

function seenKey(text: string) {
  return text.replace(/\s+/g, " ").trim().toLowerCase();
}

export function trackDecisions(plan: ProductPlan): TrackedDecision[] {
  const items: TrackedDecision[] = [];
  const seen = new Set<string>();

  const add = (decision: string, status: DecisionStatus, validation?: string) => {
    const key = seenKey(decision);
    if (!decision.trim() || seen.has(key)) return;
    seen.add(key);
    items.push(card(`DEC${items.length + 1}`, decision, status, validation ?? validationFor(decision, status)));
  };

  const source = plan.sourceText;
  const exportOpen = /\bexport(s|ed|ing)?\b/i.test(source) && !/\b(pdf|csv|excel|xlsx|json)\b/i.test(source);

  for (const item of plan.requirements) {
    if (item.evidence === "stated") add(item.statement, "confirmed");
    else if (item.evidence === "inferred") add(item.statement, "inferred");
    else add(item.statement, "unknown");
  }

  for (const persona of plan.personas) {
    const line = `${persona.role}: ${persona.context}`;
    if (persona.evidence === "stated") add(line, "confirmed");
    else add(line, "inferred");
  }

  for (const constraint of plan.constraints) add(constraint, "confirmed");

  if (exportOpen) add(PDF_ASSUMPTION, "assumption", PDF_VALIDATION);

  for (const line of plan.assumptions) add(line, "assumption");

  for (const item of plan.ambiguities ?? []) {
    if (item.severity === "critical") add(item.question, "needsValidation");
    if (item.assumption) add(item.assumption, "assumption");
  }

  for (const item of plan.research.filter((finding) => finding.evidence === "unknown").slice(0, 3)) {
    add(item.finding, "unknown", item.implication);
  }

  if (plan.proposed) {
    add(
      `Proposed MVP: ${plan.title}. This is inferred from the request, not a signed scope.`,
      "inferred",
      "Confirm the buyer and the measure of done before implementation.",
    );
  }

  if (plan.maturity === "problem") {
    add(
      "The plan is validation work, not a committed build.",
      "needsValidation",
      "Answer the open questions before writing a product requirement.",
    );
  }

  return items;
}

export function decisionsMarkdown(plan: ProductPlan) {
  if (!plan.decisions?.length) return "No decisions were generated.";
  const groups: DecisionStatus[] = ["confirmed", "assumption", "inferred", "unknown", "needsValidation"];
  return groups
    .map((status) => {
      const rows = plan.decisions.filter((item) => item.status === status);
      if (!rows.length) return "";
      const body = rows
        .map((item) => {
          const validation = item.validation ? `\nValidation:\n${item.validation}` : "";
          return `${STATUS_LABEL[item.status]}:\n${item.decision}${validation}`;
        })
        .join("\n\n");
      return `### ${STATUS_LABEL[status]}\n\n${body}`;
    })
    .filter(Boolean)
    .join("\n\n");
}
