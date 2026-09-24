import { parsedEngineOptions, recordLedgerChoice } from "./ledger";
import type {
  DecisionEngine,
  DecisionOption,
  DecisionRecord,
  Evidence,
  ProductMemory,
  ProductPlan,
} from "./types";

export const DECIDE_NOTE =
  "A product decision names the options, the evidence for each, the trade-offs, and what is still missing. It does not say Build X and stop.";

export const DECIDE_QUESTION =
  "What are our options, what evidence supports each one, what are we trading off, and what information are we still missing?";

export const DECIDE_ASCII = `                    PRODUCT DECISION ENGINE
                             │
       ┌─────────────────────┼─────────────────────┐
       ↓                     ↓                     ↓
   User Evidence       Business Context       Technical Context
       │                     │                     │
       └─────────────────────┼─────────────────────┘
                             ↓
                     Decision Analysis
                             ↓
             ┌───────────────┼───────────────┐
             ↓               ↓               ↓
          Options         Trade-offs       Risks
             │               │               │
             └───────────────┼───────────────┘
                             ↓
                    Human Decision
                             ↓
                    Decision Record`;

function fact(text: string, evidence: Evidence = "stated") {
  return { text, evidence };
}

function uniqueFacts(lines: { text: string; evidence: Evidence }[], skip: string[] = []) {
  const banned = new Set(skip.map((text) => text.replace(/\s+/g, " ").trim().toLowerCase()).filter(Boolean));
  const seen = new Set<string>();
  return lines.filter((line) => {
    const key = line.text.replace(/\s+/g, " ").trim().toLowerCase();
    if (!key || seen.has(key) || banned.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function option(input: {
  id: string;
  title: string;
  summary: string;
  evidence: { text: string; evidence: Evidence }[];
  tradeoffs: string[];
  risks: string[];
  missing: string[];
}): DecisionOption {
  return input;
}

function questionOf(plan: ProductPlan) {
  const conflict = plan.conflicts[0];
  if (conflict) return `How do we resolve ${conflict.newRequirement.replace(/^"|"$/g, "")}?`;
  const decline = plan.analytics.loops[0];
  if (decline) return `How do we respond to declining usage of ${decline.feature}?`;
  const signal = plan.monitoring?.signals.find((item) => item.status === "investigating");
  if (signal) return `How do we respond to ${signal.change.replace(/\.$/, "")} on ${signal.feature}?`;
  if (plan.maturity === "problem") return `How do we respond to this problem: ${plan.problem.statement}`;
  const line = plan.input.brief.split(/[.\n]/)[0]?.replace(/\.$/, "").trim();
  if (line && /^(should|how|what)\b/i.test(line)) return `${line}?`.replace(/\?\?$/, "?");
  return `What should we do about ${plan.title}?`;
}

function userContext(plan: ProductPlan, memory?: ProductMemory) {
  const lines = [
    ...plan.personas.slice(0, 3).map((persona) => fact(`${persona.role}: ${persona.context}`, persona.evidence)),
    ...plan.analytics.signals.filter((item) => item.kind === "behavior" || item.declining).slice(0, 3).map((item) => fact(item.detail, item.evidence)),
    ...(plan.monitoring?.signals ?? []).slice(0, 1).map((item) => fact(`${item.feature}: ${item.change}`, item.evidence)),
    ...(memory?.items ?? [])
      .filter((item) => item.kind === "feedback")
      .slice(-3)
      .map((item) => fact(item.text, item.evidence)),
  ];
  const unique = uniqueFacts(lines, [plan.input.brief]);
  if (!unique.length) unique.push(fact("No named user evidence was loaded.", "unknown"));
  return { kind: "user" as const, lines: unique.slice(0, 5) };
}

function businessContext(plan: ProductPlan, memory?: ProductMemory) {
  const lines = [
    ...plan.problem.success.slice(0, 2).map((text) => fact(text, "stated")),
    ...plan.discovery.businessGoals.slice(0, 2).map((item) => fact(item.text, item.evidence)),
    ...plan.recommendations.slice(0, 2).flatMap((item) => item.evidence.slice(0, 2)),
    ...plan.constraints.filter((line) => /do not|don't|remains/i.test(line)).slice(0, 2).map((text) => fact(text, "stated")),
    ...(memory?.items ?? [])
      .filter((item) => item.kind === "metric" || item.kind === "goal")
      .slice(-2)
      .map((item) => fact(item.text, item.evidence)),
  ];
  const unique = uniqueFacts(lines, [plan.input.brief]);
  if (!unique.length) unique.push(fact("No named business context was loaded.", "unknown"));
  return { kind: "business" as const, lines: unique.slice(0, 6) };
}

function technicalContext(plan: ProductPlan, memory?: ProductMemory) {
  const impact = plan.impacts[0];
  const lines = [
    ...plan.constraints.filter((line) => /ledger|okta|cityworks|append-only|kubernetes|microservice|offline|immutable/i.test(line)).slice(0, 3).map((text) => fact(text, "stated")),
    ...(impact ? [...impact.apis, ...impact.database].slice(0, 2).map((text) => fact(text, "inferred")) : []),
    ...(memory?.items ?? [])
      .filter((item) => item.kind === "limitation")
      .slice(-2)
      .map((item) => fact(item.text, item.evidence)),
  ];
  const unique = uniqueFacts(lines);
  if (!unique.length) unique.push(fact("No named technical context was loaded.", "unknown"));
  return { kind: "technical" as const, lines: unique.slice(0, 5) };
}

function holdOption(missing: string[]): DecisionOption {
  return option({
    id: "OPT-hold",
    title: "Hold — gather the missing information",
    summary: "Do not commit a build until the open questions have an owner.",
    evidence: [fact("A product decision can wait.", "inferred")],
    tradeoffs: ["Time is spent on discovery instead of a ship.", "The current workaround stays in place."],
    risks: ["The team may treat waiting as a silent no."],
    missing,
  });
}

function fromConflict(plan: ProductPlan): DecisionOption[] {
  const clash = plan.conflicts.find((item) => item.against === "requirement") ?? plan.conflicts[0];
  if (!clash) return [];
  const missing = [
    clash.resolution,
    ...plan.problem.openQuestions.slice(0, 2),
  ];
  if (/edit|immutable/i.test(`${clash.newRequirement} ${clash.existingRequirement}`)) {
    return [
      option({
        id: "OPT-revision",
        title: "Create a revision",
        summary: "A correction becomes a new version. The original posted row stays.",
        evidence: [
          fact(clash.existingRequirement.replace(/^"|"$/g, ""), "stated"),
          ...plan.constraints.filter((line) => /append-only|ledger/i.test(line)).map((text) => fact(text, "stated")),
        ],
        tradeoffs: ["Users can correct a posting.", "Readers must know which version is current."],
        risks: ["Two versions of the same transaction can confuse a reviewer."],
        missing,
      }),
      option({
        id: "OPT-mutate",
        title: "Modify the original transaction",
        summary: "The posted row itself changes.",
        evidence: [fact(clash.newRequirement.replace(/^"|"$/g, ""), "stated")],
        tradeoffs: ["One row stays current.", "The first posted values are lost unless separately kept."],
        risks: ["This is opposite an append-only ledger."],
        missing,
      }),
      option({
        id: "OPT-keep",
        title: "Hold — keep submitted transactions immutable",
        summary: "The ledger policy stays. No edit path ships.",
        evidence: [fact(clash.existingRequirement.replace(/^"|"$/g, ""), "stated")],
        tradeoffs: ["Audit of the first posting stays simple.", "People who need a correction have no product path."],
        risks: ["Support load continues if posted rows are often wrong."],
        missing,
      }),
    ];
  }
  return [
    option({
      id: "OPT-new",
      title: clash.newRequirement.replace(/^"|"$/g, ""),
      summary: "Take the new requirement.",
      evidence: [fact(clash.newRequirement.replace(/^"|"$/g, ""), "stated")],
      tradeoffs: ["The new claim becomes scope.", "The earlier claim no longer holds as written."],
      risks: [`Conflict impact ${clash.impact}.`],
      missing,
    }),
    option({
      id: "OPT-keep",
      title: "Keep the existing requirement",
      summary: clash.existingRequirement.replace(/^"|"$/g, ""),
      evidence: [fact(clash.existingRequirement.replace(/^"|"$/g, ""), "stated")],
      tradeoffs: ["Earlier policy stays.", "The new request is refused or deferred."],
      risks: [`Conflict impact ${clash.impact}.`],
      missing,
    }),
    holdOption(missing),
  ];
}

function fromProblem(plan: ProductPlan): DecisionOption[] {
  if (plan.maturity !== "problem") return [];
  const missing = plan.problem.openQuestions.slice(0, 3);
  return [
    option({
      id: "OPT-validate",
      title: "Sit with the named people and record what they do today",
      summary: "Treat this as a validation plan. No product bet yet.",
      evidence: [
        fact("The source names a problem and no product.", "stated"),
        fact(plan.problem.who ? `${plan.problem.who} are the people named in this situation.` : "The people affected were not named.", "inferred"),
      ],
      tradeoffs: ["The team learns the workflow before a build.", "No software ships in this slice."],
      risks: [plan.riskAnalysis.registers[0]?.risks.find((item) => item.kind === "product")?.risk ?? "The team may freeze the wrong workflow."],
      missing: missing.length ? missing : ["Which number should move, and who owns the rush."],
    }),
    holdOption(missing.length ? missing : ["Which number should move, and who owns the rush."]),
  ];
}

function fromImpact(plan: ProductPlan): DecisionOption[] {
  const high = plan.impacts.find((item) => item.severity === "high");
  if (!high) return [];
  const missing = ["Recovery requirements have not been validated.", ...plan.problem.openQuestions.slice(0, 1)];
  return [
    option({
      id: "OPT-change",
      title: high.change,
      summary: `Ship the change. Blast radius is ${high.severity}.`,
      evidence: [...high.features, ...high.database].slice(0, 3).map((text) => fact(text, "inferred")),
      tradeoffs: ["The named path gains the new action.", "Ledger, API, and tests have to move with it."],
      risks: high.security.slice(0, 2),
      missing,
    }),
    holdOption(missing),
  ];
}

function fromRecommendations(plan: ProductPlan): DecisionOption[] {
  if (!plan.recommendations.length) return [];
  const missing = [
    ...plan.recommendations[0].unknowns.slice(0, 2),
    ...plan.ambiguities.filter((item) => item.severity === "critical").slice(0, 2).map((item) => item.question),
  ];
  const keepPortal = plan.constraints.find((line) => /do not redesign/i.test(line));
  const options = plan.recommendations.slice(0, 3).map((item, index) =>
    option({
      id: `OPT-rec${index + 1}`,
      title: item.opportunity,
      summary: item.userImpact.reason,
      evidence: item.evidence.slice(0, 3),
      tradeoffs: [
        `User impact ${item.userImpact.level}. Technical cost ${item.technicalCost.level}.`,
        keepPortal ?? "Scope stays inside the named complaint.",
      ],
      risks: item.risks.slice(0, 2),
      missing: item.unknowns.slice(0, 2),
    }),
  );
  if (keepPortal) {
    options.push(
      option({
        id: "OPT-hold-redesign",
        title: "Hold — do not redesign the whole billing portal",
        summary: keepPortal,
        evidence: [fact(keepPortal, "stated")],
        tradeoffs: ["The portal surface stays.", "Only the named payment failures move."],
        risks: ["A small fix may leave the other support tags untouched."],
        missing,
      }),
    );
  } else {
    options.push(holdOption(missing.length ? missing : ["A stated measure of done was not named."]));
  }
  return options;
}

function fromMonitor(plan: ProductPlan): DecisionOption[] {
  const signal = plan.monitoring?.signals.find((item) => item.status === "investigating");
  if (!signal) return [];
  const missing = [
    signal.investigation,
    ...signal.causes.filter((item) => item.evidence === "unknown").map((item) => item.text),
    "Whether a ship should wait on the funnel comparison.",
  ].filter(Boolean);
  return [
    option({
      id: "OPT-investigate",
      title: signal.investigation,
      summary: `${signal.feature}: ${signal.change} The monitor investigates before it decides.`,
      evidence: [fact(signal.change, signal.evidence), ...signal.causes.slice(0, 3).map((item) => fact(item.text, item.evidence))],
      tradeoffs: ["Time goes to a pre/post comparison.", "A fix does not ship on the first signal."],
      risks: ["A skip of the investigation can freeze the wrong cause."],
      missing,
    }),
    holdOption(missing),
  ];
}

function fromAnalytics(plan: ProductPlan): DecisionOption[] {
  const loop = plan.analytics.loops[0];
  if (!loop || plan.conflicts.length) return [];
  const decline = loop.stages.find((item) => item.id === "declining")?.text ?? "";
  const problem = loop.stages.find((item) => item.id === "problem")?.text ?? "";
  const improvement = loop.stages.find((item) => item.id === "improvement")?.text ?? "";
  const missing = ["Whether the decline continues after a load fix.", ...plan.problem.openQuestions.slice(0, 1)];
  return [
    option({
      id: "OPT-fix",
      title: improvement || `Restore ${loop.feature}`,
      summary: problem,
      evidence: [fact(decline, "stated"), ...plan.analytics.signals.filter((item) => item.kind === "error").slice(0, 1).map((item) => fact(item.detail, item.evidence))],
      tradeoffs: ["Engineering time goes to a launched feature.", "New template work waits."],
      risks: ["A fix that ignores the abandon rate may leave usage down."],
      missing,
    }),
    holdOption(missing),
  ];
}

function fromParsed(plan: ProductPlan): DecisionOption[] {
  const block = parsedEngineOptions(plan.sourceText);
  if (!block || block.options.length < 2) return [];
  const missing = block.assumptions.map((item) => item.text).slice(0, 2);
  return block.options.map((item) => {
    const chosen = block.decision && new RegExp(item.title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i").test(block.decision);
    return option({
      id: `OPT-${item.key}`,
      title: item.title,
      summary: chosen && block.reason ? block.reason : item.title,
      evidence: block.evidence.length ? block.evidence : [fact(item.title, "stated")],
      tradeoffs: parsedTradeoffs(item.title),
      risks: block.risks.slice(0, 2),
      missing: missing.length ? missing : block.constraints.slice(0, 1),
    });
  });
}

function parsedTradeoffs(title: string) {
  if (/queue|sync/i.test(title)) return ["Capture continues without signal.", "The official record waits on reconnect."];
  if (/fully offline|offline only/i.test(title)) return ["Work continues with no network.", "A second copy of the record can diverge."];
  if (/online only/i.test(title)) return ["One live record.", "Field work stops without signal."];
  return ["This option is named in the source.", "The other named options stay unchosen."];
}

function fromSolution(plan: ProductPlan): DecisionOption[] {
  const missing = [
    ...plan.problem.openQuestions.slice(0, 3),
    ...plan.ambiguities.filter((item) => item.severity === "critical").slice(0, 2).map((item) => item.question),
  ];
  const cityworks = plan.constraints.find((line) => /cityworks remains/i.test(line));
  const options = [
    option({
      id: "OPT-commit",
      title: `Commit the stated ${plan.proposed ? "proposed MVP" : "v1"}`,
      summary: plan.approach?.firstSlice || plan.title,
      evidence: plan.requirements
        .filter((item) => item.priority === "must")
        .slice(0, 3)
        .map((item) => fact(item.statement, item.evidence)),
      tradeoffs: ["The team builds the named must-haves.", "Open questions stay open during the build."],
      risks: [plan.risks[0] ?? "An unsigned v1 can lock the architecture."],
      missing,
    }),
  ];
  if (cityworks) {
    options.push(
      option({
        id: "OPT-cityworks",
        title: "Keep CityWorks as the system of record",
        summary: cityworks,
        evidence: [fact(cityworks, "stated")],
        tradeoffs: ["Inspectors still live with the existing work-order system.", "A contractor portal stays later."],
        risks: ["A follow-up that replaces CityWorks contradicts this decision."],
        missing,
      }),
    );
  }
  options.push(
    option({
      id: "OPT-hold-v1",
      title: "Hold until the open questions have owners",
      summary: "Do not treat the handoff as committed scope.",
      evidence: missing.slice(0, 2).map((text) => fact(text, "unknown")),
      tradeoffs: ["Architecture waits.", "Inspectors keep the current workaround."],
      risks: ["A hold without an owner becomes drift."],
      missing,
    }),
  );
  return options;
}

function uniqueOptions(options: DecisionOption[]) {
  const seen = new Set<string>();
  return options.filter((item) => {
    const key = item.title.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function emptyDecisionEngine(): DecisionEngine {
  return {
    note: DECIDE_NOTE,
    question: DECIDE_QUESTION,
    ascii: DECIDE_ASCII,
    contexts: [],
    options: [],
    missing: [],
    record: {
      id: "DEC-record",
      question: DECIDE_QUESTION,
      status: "pending",
    },
  };
}

export function buildDecisionEngine(plan: ProductPlan, memory?: ProductMemory): DecisionEngine {
  const parsed = parsedEngineOptions(plan.sourceText);
  const question = parsed?.question || questionOf(plan);
  const contexts = [userContext(plan, memory), businessContext(plan, memory), technicalContext(plan, memory)];
  let options: DecisionOption[] = fromParsed(plan);
  if (!options.length && plan.conflicts.length) options = fromConflict(plan);
  else if (!options.length && plan.analytics.loops.length) options = fromAnalytics(plan);
  else if (!options.length && plan.monitoring?.signals.some((item) => item.status === "investigating")) options = fromMonitor(plan);
  else if (!options.length && plan.maturity === "problem") options = fromProblem(plan);
  else if (!options.length && plan.impacts.some((item) => item.severity === "high")) options = fromImpact(plan);
  else if (!options.length && plan.recommendations.length && plan.input.existing.trim()) options = fromRecommendations(plan);
  else if (!options.length) options = fromSolution(plan);
  options = uniqueOptions(options);
  if (options.length < 2) options.push(holdOption(plan.problem.openQuestions.slice(0, 2)));
  const missing = [...new Set(options.flatMap((item) => item.missing))].slice(0, 6);
  const chosenTitle = parsed?.decision ?? "";
  const chosen = options.find((item) => chosenTitle && new RegExp(item.title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i").test(chosenTitle));
  return {
    note: DECIDE_NOTE,
    question,
    ascii: DECIDE_ASCII,
    contexts,
    options: options.slice(0, 5),
    missing,
    record: {
      id: "DEC-record",
      question,
      status: chosen ? "chosen" : "pending",
      chosenOptionId: chosen?.id,
      rationale: chosen ? parsed?.reason : undefined,
      at: parsed?.date || undefined,
    },
  };
}

export function applyDecisionChoice(plan: ProductPlan, optionId: string): ProductPlan {
  const option = plan.decisionEngine.options.find((item) => item.id === optionId);
  if (!option) return plan;
  const record: DecisionRecord = {
    id: "DEC-record",
    question: plan.decisionEngine.question,
    status: "chosen",
    chosenOptionId: option.id,
    rationale: option.summary,
    at: new Date().toISOString(),
  };
  return {
    ...plan,
    decisionEngine: {
      ...plan.decisionEngine,
      record,
    },
    decisionLedger: recordLedgerChoice({ ...plan, decisionEngine: { ...plan.decisionEngine, record } }, optionId, record.at ?? new Date().toISOString()),
  };
}

export function decisionMarkdown(plan: ProductPlan) {
  const engine = plan.decisionEngine;
  if (!engine?.options.length) return "No decision options were named.";
  const options = engine.options
    .map((item) => {
      const evidence = item.evidence.map((line) => `  - ${line.text} (${line.evidence})`).join("\n");
      return `### ${item.id} ${item.title}

${item.summary}

Evidence:
${evidence}

Trade-offs:
${item.tradeoffs.map((line) => `- ${line}`).join("\n")}

Risks:
${item.risks.map((line) => `- ${line}`).join("\n")}

Still missing:
${item.missing.map((line) => `- ${line}`).join("\n")}`;
    })
    .join("\n\n");
  return `${engine.question}

${DECIDE_QUESTION}

Record: ${engine.record.status}${engine.record.chosenOptionId ? ` — ${engine.record.chosenOptionId}` : ""}

${options}`;
}
