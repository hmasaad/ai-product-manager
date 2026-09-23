import type { Ambiguity, AmbiguitySeverity, Judgment, ProductInput, ProductPlan } from "./types";

export const AMBIGUITY_NOTE =
  "Unclear requirements are named before the PRD. Critical questions must be clarified. Important questions are recommendations. Minor questions become a labeled assumption.";

const NAMED_ROLE =
  /\b(inspectors?|supervisors?|clerks?|farmers?|operators?|payers?|nurses?|physicians?|admins?|administrators?|crews?|accountants?|field inspector)\b/i;
const EXPORT = /\bexport(s|ed|ing)?\b/i;
const FORMAT = /\b(pdf|csv|excel|xlsx|json)\b/i;
const SIZE = /\b(\d+\s*(mb|kb|gb)|maximum report size|max (size|file)|file size|size limit)\b/i;
const ASYNC = /\b(async|asynchronous|background job|queued?|email when ready)\b/i;
const PERMISSION = /\b(permission|rbac|by role|only (the )?(clerk|supervisor|admin|inspector))\b/i;
const AUDIT = /\b(audit|logged|log of who)\b/i;
const SPECIFIC_REPORT = /\b(inspection report|field report|invoice report|pdf inspection)\b/i;
const GENERIC_USER = /\b(users?|people|someone|anyone)\b/i;

const ACTION: Record<AmbiguitySeverity, Ambiguity["action"]> = {
  critical: "must clarify",
  important: "recommendation",
  minor: "reasonable assumption",
};

function item(id: string, question: string, severity: AmbiguitySeverity, assumption?: string): Ambiguity {
  return {
    id,
    question,
    severity,
    action: ACTION[severity],
    assumption,
  };
}

function namedRole(source: string, judgment: Judgment) {
  if (NAMED_ROLE.test(source)) return true;
  return judgment.personas.some((persona) => NAMED_ROLE.test(persona.role) && persona.evidence === "stated");
}

export function detectAmbiguities(input: ProductInput, judgment: Judgment): Ambiguity[] {
  const source = [input.brief, input.existing, input.constraints].filter(Boolean).join("\n");
  const found: Ambiguity[] = [];
  const exportWork = EXPORT.test(source);
  const genericUsers = GENERIC_USER.test(input.brief) && !namedRole(source, judgment);

  if (genericUsers) {
    found.push(item("AMB1", "Which users?", "critical"));
  }

  if (exportWork) {
    if (!SPECIFIC_REPORT.test(source)) {
      found.push(item("AMB2", "Which reports?", "critical"));
    }
    if (!FORMAT.test(source)) {
      found.push(item("AMB3", "PDF, CSV, or Excel?", "critical"));
    }
    if (!SIZE.test(source)) {
      found.push(item("AMB4", "Maximum report size?", "important"));
    }
    if (!ASYNC.test(source)) {
      found.push(item("AMB5", "Should exports be asynchronous?", "important"));
    }
    if (!PERMISSION.test(source)) {
      found.push(item("AMB6", "Should export permissions differ by role?", "important"));
    }
    if (!AUDIT.test(source)) {
      found.push(
        item("AMB7", "Should exports be audited?", "minor", "Log who exported, when, and which report."),
      );
    }
    return found;
  }

  if (/\b(can|should be able to)\s+edit\b/i.test(input.brief)) {
    if (!PERMISSION.test(source)) {
      found.push(item("AMB2", "Should edit permissions differ by role?", "important"));
    }
    if (!AUDIT.test(source)) {
      found.push(item("AMB3", "Should edits be audited?", "minor", "Log who edited, when, and which record."));
    }
  }

  return found;
}

export function applyAmbiguities(judgment: Judgment, ambiguities: Ambiguity[]): Judgment {
  const openQuestions = [...judgment.problem.openQuestions];
  const assumptions = [...judgment.assumptions];
  for (const item of ambiguities) {
    if (item.severity === "critical" && !openQuestions.includes(item.question)) {
      openQuestions.push(item.question);
    }
    if (item.severity === "minor" && item.assumption && !assumptions.includes(item.assumption)) {
      assumptions.push(item.assumption);
    }
  }
  return {
    ...judgment,
    assumptions,
    problem: { ...judgment.problem, openQuestions },
  };
}

export function ambiguityMarkdown(plan: ProductPlan) {
  if (!plan.ambiguities?.length) return "No ambiguity was left open in the source.";
  const lines = plan.ambiguities.map((item, index) => {
    const extra = item.assumption ? ` Assumption: ${item.assumption}` : "";
    return `${index + 1}. ${item.question} — ${item.severity} → ${item.action}.${extra}`;
  });
  return `Ambiguities detected:\n\n${lines.join("\n")}`;
}
