import { clamp, contentWords } from "./text";
import type {
  Decision,
  Evidence,
  Feature,
  Judgment,
  PriorityFactor,
  PriorityFactorKey,
  PriorityItem,
  Requirement,
} from "./types";

export const SCORE_NOTE =
  "Priority score = business value + user impact + strategic alignment + revenue impact + urgency − engineering effort − risk. Each factor is scored 1 to 5, with the reason beside it. The list is ordered by that total. Now, next, and later are the release bucket from the source.";

const LABELS: Record<PriorityFactorKey, string> = {
  businessValue: "Business value",
  userImpact: "User impact",
  strategicAlignment: "Strategic alignment",
  revenueImpact: "Revenue impact",
  urgency: "Urgency",
  effort: "Engineering effort",
  risk: "Risk",
};

const MONEY = /\b(revenue|payment|paid|invoice|billing|amount due|refund|card)\b/i;
const HOT = /\d|%|\btoday\b|\brush\b|\bcomplaint|\bwaiting\b|\bfail|\bimmediately\b|\bnow\b/i;
const AFTER_JOB = /\b(report|analytics|export|map|audit|retention)\b/i;

function factor(
  key: PriorityFactorKey,
  sign: 1 | -1,
  score: number,
  reason: string,
  evidence: Evidence,
): PriorityFactor {
  return {
    key,
    label: LABELS[key],
    sign,
    score: clamp(score, 1, 5),
    reason,
    evidence,
  };
}

function evidenceOf(reqs: Requirement[]): Evidence {
  if (!reqs.length) return "unknown";
  if (reqs.every((item) => item.evidence === "stated")) return "stated";
  if (reqs.some((item) => item.evidence === "stated")) return "inferred";
  return reqs[0]?.evidence ?? "inferred";
}

function overlaps(needle: string, haystack: string) {
  const words = [...new Set(contentWords(needle))];
  if (words.length < 2) return false;
  const blob = haystack.toLowerCase();
  const hits = words.filter((word) => blob.includes(word));
  return hits.length / words.length >= 0.6;
}

function effortFor(text: string, count: number) {
  let effort = 2;
  const reasons: string[] = [];
  if (/\boffline|\bsync|\bsso\b|\bokta\b|\bpayment\b|\bpdf\b|ios and android|one codebase/i.test(text)) {
    effort += 1;
    reasons.push("it crosses a device, an identity system, or a file workflow");
  }
  if (/\boffline/i.test(text) && /\bsync/i.test(text)) {
    effort += 1;
    reasons.push("offline and sync land together");
  }
  if (count >= 3) {
    effort += 1;
    reasons.push(`${count} requirements share the slice`);
  }
  return {
    score: clamp(effort, 1, 5),
    reason: reasons[0] ?? "the slice is contained",
  };
}

function riskFor(text: string) {
  let risk = 1;
  let reason = "a miss stays local";
  if (/\boffline|\bsync|\bpayment|\bpaid\b|\baudit\b|\bphoto|\bsignature\b/i.test(text)) {
    risk += 2;
    reason = "a miss loses evidence, money, or trust";
  } else if (/sso|okta|cityworks|system of record|integrat/i.test(text)) {
    risk += 1;
    reason = "it depends on a system this product does not own";
  }
  return { score: clamp(risk, 1, 5), reason };
}

function decisionFor(feature: Feature, maturity: Judgment["maturity"]): Decision {
  if (maturity === "problem") return feature.scope === "must" ? "now" : "later";
  if (feature.scope === "must") return "now";
  if (feature.scope === "should") return "next";
  return "later";
}

function businessValue(feature: Feature, reqs: Requirement[], judgment: Judgment): PriorityFactor {
  if (judgment.maturity === "problem") {
    return feature.scope === "must"
      ? factor("businessValue", 1, 5, "The stated next step is to learn whether the problem is real.", "stated")
      : factor("businessValue", 1, 1, "No product outcome was stated.", "unknown");
  }
  if (feature.scope === "must") {
    const evidence = evidenceOf(reqs);
    return factor(
      "businessValue",
      1,
      5,
      evidence === "stated"
        ? "The source required this for the release."
        : "Inferred as required to deliver the request.",
      evidence,
    );
  }
  if (feature.scope === "should") {
    return factor("businessValue", 1, 3, "The source asked for this after the must-haves.", evidenceOf(reqs));
  }
  return factor("businessValue", 1, 2, "The source left this out of the current release.", "inferred");
}

function userImpact(feature: Feature, reqs: Requirement[], judgment: Judgment): PriorityFactor {
  if (judgment.maturity === "problem") {
    return feature.scope === "must"
      ? factor("userImpact", 1, 5, "The people named in the brief are the ones to watch.", "stated")
      : factor("userImpact", 1, 1, "No user was given a workflow.", "unknown");
  }
  const personas = [...new Set(reqs.map((item) => item.persona).filter(Boolean))];
  const primary = judgment.personas[0]?.role ?? "";
  const servesPrimary = personas.some((role) => role.toLowerCase() === primary.toLowerCase());
  const afterJob = AFTER_JOB.test(`${feature.name} ${feature.outcome}`);
  if (servesPrimary && !afterJob) {
    return factor("userImpact", 1, 5, `${primary} uses this to finish the job.`, evidenceOf(reqs));
  }
  if (servesPrimary) {
    return factor("userImpact", 1, 3, `${primary} uses this after the job is done.`, "inferred");
  }
  if (personas.length) {
    return factor("userImpact", 1, 3, `This serves ${personas.join(", ")}.`, evidenceOf(reqs));
  }
  return factor("userImpact", 1, 2, "No persona was tied to this slice.", "unknown");
}

function strategicAlignment(feature: Feature, reqs: Requirement[], judgment: Judgment): PriorityFactor {
  if (judgment.maturity === "problem") {
    return feature.scope === "must"
      ? factor("strategicAlignment", 1, 5, "Learning comes before a build.", "stated")
      : factor("strategicAlignment", 1, 1, "A build would skip the open questions.", "inferred");
  }
  const blob = `${feature.name} ${feature.outcome} ${reqs.map((item) => item.statement).join(" ")}`;
  const blocked = judgment.problem.nonGoals.find((goal) => {
    const own = reqs.some((item) => item.statement.trim().toLowerCase() === goal.trim().toLowerCase());
    return !own && overlaps(goal, blob);
  });
  if (blocked) {
    return factor("strategicAlignment", 1, 1, `The source listed a non-goal this slice would cross: ${blocked}`, "stated");
  }
  if (feature.scope === "must") {
    return factor("strategicAlignment", 1, 5, "It sits inside the release the source described.", evidenceOf(reqs));
  }
  if (feature.scope === "should") {
    return factor("strategicAlignment", 1, 3, "It supports the goal and is not required to ship the core.", "inferred");
  }
  return factor("strategicAlignment", 1, 1, "It is future scope.", "inferred");
}

function revenueImpact(text: string, feature: Feature, reqs: Requirement[], judgment: Judgment): PriorityFactor {
  const corpus = [
    judgment.problem.statement,
    judgment.problem.costOfInaction,
    ...judgment.problem.success,
    ...judgment.requirements.map((item) => item.statement),
  ].join(" ");
  if (MONEY.test(text)) {
    const score = feature.scope === "must" ? 5 : feature.scope === "should" ? 3 : 2;
    return factor(
      "revenueImpact",
      1,
      score,
      "The source ties this slice to money already in motion.",
      evidenceOf(reqs) === "unknown" ? "inferred" : evidenceOf(reqs),
    );
  }
  if (MONEY.test(corpus)) {
    return factor("revenueImpact", 1, 1, "The product mentions money, and this slice does not move it.", "inferred");
  }
  return factor("revenueImpact", 1, 1, "No revenue effect was stated.", "unknown");
}

function urgency(feature: Feature, judgment: Judgment): PriorityFactor {
  const hot = HOT.test(`${judgment.problem.statement} ${judgment.problem.costOfInaction}`);
  if (judgment.maturity === "problem") {
    return feature.scope === "must"
      ? factor(
          "urgency",
          1,
          hot ? 5 : 3,
          hot ? "The harm described is happening now." : "The problem is current, and no deadline was stated.",
          hot ? "stated" : "inferred",
        )
      : factor("urgency", 1, 1, "A solution waits on evidence.", "inferred");
  }
  if (feature.scope === "later") {
    return factor("urgency", 1, 1, "The source did not ask for this in the current release.", "inferred");
  }
  if (feature.scope === "should") {
    return factor("urgency", 1, 2, "It can wait until the must-haves are in use.", "inferred");
  }
  if (hot) {
    return factor("urgency", 1, 5, "The cost of waiting is already visible in the source.", "stated");
  }
  return factor("urgency", 1, 3, "Required for the release, and no deadline was stated.", "inferred");
}

function equation(factors: PriorityFactor[], score: number) {
  const body = factors
    .map((item) => (item.sign === 1 ? String(item.score) : `− ${item.score}`))
    .join(" + ")
    .replaceAll(" + − ", " − ");
  return `${score} = ${body}`;
}

function scoreFeature(judgment: Judgment, feature: Feature, reqs: Requirement[]): PriorityItem {
  const text = [feature.name, feature.outcome, ...reqs.map((item) => item.statement)].join(" ");
  const effort = effortFor(text, reqs.length);
  const risk = riskFor(text);
  const factors = [
    businessValue(feature, reqs, judgment),
    userImpact(feature, reqs, judgment),
    strategicAlignment(feature, reqs, judgment),
    revenueImpact(text, feature, reqs, judgment),
    urgency(feature, judgment),
    factor("effort", -1, effort.score, `Estimated ${effort.score} because ${effort.reason}.`, "inferred"),
    factor("risk", -1, risk.score, `Estimated ${risk.score} because ${risk.reason}.`, "inferred"),
  ];
  const score = factors.reduce((sum, item) => sum + item.sign * item.score, 0);
  return {
    featureId: feature.id,
    factors,
    score,
    decision: decisionFor(feature, judgment.maturity),
    rationale: equation(factors, score),
  };
}

export function scorePriorities(judgment: Judgment, features: Feature[]): PriorityItem[] {
  const byId = new Map(judgment.requirements.map((item) => [item.id, item]));
  const order: Record<Decision, number> = { now: 0, next: 1, later: 2 };
  return features
    .map((feature) => {
      const reqs = feature.requirementIds
        .map((id) => byId.get(id))
        .filter((item): item is Requirement => Boolean(item));
      return scoreFeature(judgment, feature, reqs);
    })
    .sort(
      (a, b) =>
        b.score - a.score || order[a.decision] - order[b.decision] || a.featureId.localeCompare(b.featureId),
    );
}
