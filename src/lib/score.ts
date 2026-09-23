import { clamp, contentWords } from "./text";
import type {
  Evidence,
  Feature,
  OpportunityFactor,
  OpportunityFactorKey,
  OpportunityScore,
  OpportunityScoring,
  ProductMemory,
  ProductPlan,
  Recommendation,
} from "./types";

export const OPPORTUNITY_NOTE =
  "Opportunity score = customer impact + business impact + strategic alignment + reach + confidence + evidence quality − engineering effort − risk. Each factor is scored 1 to 5, with the reason and the evidence tag beside it. The list is ordered by that total. The stored equation is the score.";

export const OPPORTUNITY_ASCII = `Opportunity
├── Customer Impact
├── Business Impact
├── Strategic Alignment
├── Reach
├── Confidence
├── Evidence Quality
├── Engineering Effort
└── Risk`;

const LABELS: Record<OpportunityFactorKey, string> = {
  customerImpact: "Customer impact",
  businessImpact: "Business impact",
  strategicAlignment: "Strategic alignment",
  reach: "Reach",
  confidence: "Confidence",
  effort: "Engineering effort",
  risk: "Risk",
  evidenceQuality: "Evidence quality",
};

const MONEY = /\b(revenue|payment|paid|invoice|billing|amount due|refund|card)\b/i;
const HARD = /\boffline|\bsync|\bsso\b|\bokta\b|\bpayment\b|\bpdf\b|ios and android|one codebase/i;

type Volume = {
  supportRequests: number | null;
  userShare: number | null;
  featureRequests: number | null;
  accounts: number | null;
  completion: number | null;
  complaints: { quote: string; count: number | null }[];
};

function numberOf(raw: string) {
  return Number(raw.replace(/,/g, ""));
}

function readVolume(text: string): Volume {
  const support = text.match(/(\d{1,3}(?:,\d{3})+|\d+)\s+support requests/i);
  const share = text.match(/(\d+(?:\.\d+)?)%\s+of users/i);
  const requests = text.match(/(\d+)\s+related feature requests/i);
  const accounts = text.match(/(\d{1,3}(?:,\d{3})+)\s+accounts/i);
  const completion = text.match(/(\d+(?:\.\d+)?)%\s+completed/i);
  const complaints = [...text.matchAll(/"([^"]{8,140})"\s*\((\d{2,})\)/g)].map((match) => ({
    quote: match[1].trim(),
    count: numberOf(match[2]),
  }));
  return {
    supportRequests: support ? numberOf(support[1]) : null,
    userShare: share ? Number(share[1]) : null,
    featureRequests: requests ? Number(requests[1]) : null,
    accounts: accounts ? numberOf(accounts[1]) : null,
    completion: completion ? Number(completion[1]) : null,
    complaints,
  };
}

function corpus(plan: ProductPlan, memory?: ProductMemory) {
  const remembered = (memory?.items ?? [])
    .filter((item) => item.kind === "feedback" || item.kind === "metric")
    .map((item) => item.text)
    .join("\n");
  return [plan.sourceText, remembered].filter(Boolean).join("\n");
}

function countFacts(volume: Volume, count?: number | null) {
  return [
    volume.supportRequests,
    volume.userShare,
    volume.featureRequests,
    volume.accounts,
    volume.completion,
    count,
  ].filter((item) => item != null).length;
}

function hasCounts(volume: Volume, count?: number | null) {
  return countFacts(volume, count) > 0 || volume.complaints.some((item) => item.count);
}

function factor(
  key: OpportunityFactorKey,
  sign: 1 | -1,
  score: number,
  reason: string,
  evidence: Evidence,
): OpportunityFactor {
  return {
    key,
    label: LABELS[key],
    sign,
    score: clamp(score, 1, 5),
    reason,
    evidence,
  };
}

function equation(factors: OpportunityFactor[], score: number) {
  const plus = factors.filter((item) => item.sign === 1).map((item) => String(item.score));
  const minus = factors.filter((item) => item.sign === -1).map((item) => `− ${item.score}`);
  return `${score} = ${[...plus, ...minus].join(" + ").replaceAll(" + − ", " − ")}`;
}

function featureOf(plan: ProductPlan, featureId?: string): Feature | undefined {
  return plan.features.find((item) => item.id === featureId);
}

function customerImpact(plan: ProductPlan, rec: Recommendation, volume: Volume, count?: number | null): OpportunityFactor {
  const support = count ?? volume.supportRequests;
  if ((support ?? 0) >= 100 || (volume.userShare ?? 0) >= 20) {
    const parts = [
      support != null ? `${support} support requests` : "",
      volume.userShare != null ? `${volume.userShare}% of users` : "",
    ].filter(Boolean);
    return factor("customerImpact", 1, 5, `Stated volume: ${parts.join(" and ")}.`, "stated");
  }
  if ((support ?? 0) >= 20 || (volume.userShare ?? 0) >= 5) {
    return factor("customerImpact", 1, 4, "The source names a measurable share of users.", "stated");
  }
  if (plan.maturity === "problem") {
    return factor("customerImpact", 1, 5, "The people named in the brief are the ones to watch.", "stated");
  }
  const feature = featureOf(plan, rec.featureId);
  if (feature?.scope === "must") {
    return factor("customerImpact", 1, 5, "The source required this for the people named in the brief.", rec.evidence[0]?.evidence ?? "stated");
  }
  if (feature?.scope === "should") {
    return factor("customerImpact", 1, 3, "The source asked for this after the must-haves.", "inferred");
  }
  if (plan.proposed) {
    return factor("customerImpact", 1, 3, "The request names users, and the workflow is still a proposal.", "inferred");
  }
  return factor("customerImpact", 1, 2, "No user volume was tied to this opportunity.", "unknown");
}

function businessImpact(plan: ProductPlan, rec: Recommendation): OpportunityFactor {
  const slice = `${rec.opportunity} ${featureOf(plan, rec.featureId)?.name ?? ""}`;
  if (MONEY.test(slice) || MONEY.test(rec.opportunity)) {
    return factor("businessImpact", 1, 5, "The source ties this opportunity to money already in motion.", "stated");
  }
  if (MONEY.test(plan.sourceText)) {
    return factor("businessImpact", 1, 1, "The product mentions money, and this opportunity does not move it.", "inferred");
  }
  if (plan.maturity === "problem") {
    return factor("businessImpact", 1, 1, "No product outcome was stated.", "unknown");
  }
  if (plan.problem.success.length) {
    return factor("businessImpact", 1, 3, "A success line was stated, and no revenue number sits next to it.", "stated");
  }
  return factor("businessImpact", 1, 1, "No revenue effect was stated.", "unknown");
}

function strategicAlignment(plan: ProductPlan, rec: Recommendation): OpportunityFactor {
  if (plan.maturity === "problem") {
    return factor("strategicAlignment", 1, 5, "Learning comes before a build.", "stated");
  }
  const feature = featureOf(plan, rec.featureId);
  const blob = `${rec.opportunity} ${feature?.name ?? ""} ${feature?.outcome ?? ""}`;
  const blocked = plan.problem.nonGoals.find((goal) => {
    const words = [...new Set(contentWords(goal))];
    if (words.length < 2) return false;
    const hits = words.filter((word) => blob.toLowerCase().includes(word));
    return hits.length / words.length >= 0.6;
  });
  if (blocked) {
    return factor("strategicAlignment", 1, 1, `The source listed a non-goal this opportunity would cross: ${blocked}`, "stated");
  }
  if (feature?.scope === "must" || /restore|improve|fix|validate/i.test(rec.opportunity)) {
    return factor("strategicAlignment", 1, 5, "It sits inside the work the source asked for.", rec.evidence[0]?.evidence ?? "stated");
  }
  if (feature?.scope === "should") {
    return factor("strategicAlignment", 1, 3, "It supports the goal and is not required to ship the core.", "inferred");
  }
  if (plan.proposed) {
    return factor("strategicAlignment", 1, 2, "The MVP is a proposal, not a signed bet.", "inferred");
  }
  return factor("strategicAlignment", 1, 2, "It is adjacent to the current release.", "inferred");
}

function reach(volume: Volume, count?: number | null): OpportunityFactor {
  const support = count ?? volume.supportRequests;
  if ((volume.userShare ?? 0) >= 20 || (support ?? 0) >= 100 || (volume.accounts ?? 0) >= 1000) {
    const parts = [
      volume.userShare != null ? `${volume.userShare}% of users` : "",
      support != null ? `${support} support requests` : "",
      volume.accounts != null ? `${volume.accounts.toLocaleString("en-US")} accounts` : "",
    ].filter(Boolean);
    return factor("reach", 1, 5, `Stated reach: ${parts.join(", ")}.`, "stated");
  }
  if ((volume.userShare ?? 0) >= 5 || (support ?? 0) >= 20 || (volume.accounts ?? 0) >= 100) {
    return factor("reach", 1, 4, "The source names a measurable share of users.", "stated");
  }
  return factor("reach", 1, 2, "Reach was not counted.", "unknown");
}

function confidenceBand(value: number) {
  if (value >= 0.85) return 5;
  if (value >= 0.7) return 4;
  if (value >= 0.55) return 3;
  if (value >= 0.4) return 2;
  return 1;
}

function confidenceOf(rec: Recommendation, volume: Volume, count?: number | null): OpportunityFactor {
  const band = confidenceBand(rec.confidence);
  if (hasCounts(volume, count)) {
    return factor("confidence", 1, band, `Mapped from the evidence formula (${rec.confidence.toFixed(2)}).`, "stated");
  }
  if (rec.confidence < 0.5) {
    return factor("confidence", 1, band, `Mapped from the evidence formula (${rec.confidence.toFixed(2)}). Counts are missing.`, "unknown");
  }
  return factor("confidence", 1, band, `Mapped from the evidence formula (${rec.confidence.toFixed(2)}).`, rec.evidence[0]?.evidence ?? "inferred");
}

function evidenceQuality(plan: ProductPlan, rec: Recommendation, volume: Volume, count?: number | null): OpportunityFactor {
  const statedCounts = rec.evidence.filter((item) =>
    item.evidence === "stated" && /\b(\d{1,3}(?:,\d{3})+|\d+)\s+(support requests|related feature requests|accounts)\b|\d+(?:\.\d+)?%\s+(of users|completed)/i.test(item.text),
  ).length;
  const facts = Math.max(statedCounts, countFacts(volume, count));
  if (facts >= 3) {
    return factor("evidenceQuality", 1, 5, `${facts} stated counts sit on this opportunity.`, "stated");
  }
  if (facts >= 1) {
    return factor("evidenceQuality", 1, 4, "A stated count sits on this opportunity.", "stated");
  }
  if (plan.maturity === "solution" && plan.requirements.some((item) => item.priority === "must" && item.evidence === "stated")) {
    return factor("evidenceQuality", 1, 3, "The source stated must-haves, and no volume was counted.", "stated");
  }
  if (plan.proposed || plan.maturity === "problem") {
    return factor("evidenceQuality", 1, 1, "No support volume or encounter rate was stated.", "unknown");
  }
  return factor("evidenceQuality", 1, 2, "The opportunity is inferred from the brief.", "inferred");
}

function effortOf(plan: ProductPlan, rec: Recommendation): OpportunityFactor {
  const priority = plan.priorities.find((item) => item.featureId === rec.featureId);
  const fromPriority = priority?.factors.find((item) => item.key === "effort");
  if (fromPriority) {
    return factor("effort", -1, fromPriority.score, fromPriority.reason, fromPriority.evidence);
  }
  const level = rec.technicalCost.level;
  const score = level === "high" ? 4 : level === "low" ? 2 : 3;
  return factor("effort", -1, score, rec.technicalCost.reason, "inferred");
}

function riskOf(plan: ProductPlan, rec: Recommendation): OpportunityFactor {
  const priority = plan.priorities.find((item) => item.featureId === rec.featureId);
  const fromPriority = priority?.factors.find((item) => item.key === "risk");
  if (fromPriority) {
    return factor("risk", -1, fromPriority.score, fromPriority.reason, fromPriority.evidence);
  }
  const text = `${rec.opportunity} ${rec.risks.join(" ")}`;
  if (HARD.test(text) || MONEY.test(text)) {
    return factor("risk", -1, 3, "A miss loses evidence, money, or trust.", "inferred");
  }
  return factor("risk", -1, 1, rec.risks[0] ?? "A miss stays local until a number says otherwise.", "inferred");
}

function card(plan: ProductPlan, rec: Recommendation, volume: Volume, count?: number | null): OpportunityScore {
  const factors = [
    customerImpact(plan, rec, volume, count),
    businessImpact(plan, rec),
    strategicAlignment(plan, rec),
    reach(volume, count),
    confidenceOf(rec, volume, count),
    evidenceQuality(plan, rec, volume, count),
    effortOf(plan, rec),
    riskOf(plan, rec),
  ];
  const score = factors.reduce((sum, item) => sum + item.sign * item.score, 0);
  return {
    id: `OPP-${rec.id}`,
    opportunity: rec.opportunity,
    recommendationId: rec.id,
    featureId: rec.featureId,
    factors,
    score,
    rationale: equation(factors, score),
  };
}

function complaintCount(rec: Recommendation, volume: Volume) {
  const match = volume.complaints.find((item) => rec.evidence.some((line) => line.text === `${item.count} support requests`));
  return match?.count ?? null;
}

function analyticsOpportunity(plan: ProductPlan): Recommendation | null {
  const loop = plan.analytics.loops[0];
  const opportunity = loop?.stages.find((item) => item.id === "opportunity")?.text;
  if (!opportunity) return null;
  if (plan.recommendations.some((item) => item.opportunity.toLowerCase() === opportunity.toLowerCase())) return null;
  return {
    id: "REC-ANALYTICS",
    opportunity,
    featureId: loop?.featureId,
    evidence: loop?.stages.filter((item) => item.id === "declining" || item.id === "problem").map((item) => ({ text: item.text, evidence: item.evidence })) ?? [],
    userImpact: { level: "high", reason: "Usage declined on a launched feature." },
    businessImpact: { level: "medium", reason: "A live feature is losing completions." },
    technicalCost: { level: "medium", reason: "Restore the launched path before adding types." },
    risks: ["The decline continues while new types ship."],
    confidence: 0.74,
    unknowns: ["Revenue impact hasn't been measured"],
  };
}

export function emptyOpportunityScoring(): OpportunityScoring {
  return {
    note: OPPORTUNITY_NOTE,
    ascii: OPPORTUNITY_ASCII,
    items: [],
  };
}

export function buildOpportunityScoring(plan: ProductPlan, memory?: ProductMemory): OpportunityScoring {
  const volume = readVolume(corpus(plan, memory));
  const extra = analyticsOpportunity(plan);
  const recs = extra ? [...plan.recommendations, extra] : plan.recommendations;
  const items = recs
    .map((rec) => card(plan, rec, volume, complaintCount(rec, volume)))
    .sort((a, b) => b.score - a.score || a.opportunity.localeCompare(b.opportunity));
  return {
    note: OPPORTUNITY_NOTE,
    ascii: OPPORTUNITY_ASCII,
    items,
  };
}

export function opportunityMarkdown(plan: ProductPlan) {
  const board = plan.opportunityScoring;
  if (!board?.items.length) return "No opportunity was scored.";
  const body = board.items
    .map((item) => {
      const factors = item.factors
        .map((factor) => `${factor.sign === 1 ? "+" : "−"}${factor.score} ${factor.label} (${factor.evidence}): ${factor.reason}`)
        .join("\n");
      return `Opportunity: ${item.opportunity}\n${item.rationale}\n${factors}`;
    })
    .join("\n\n");
  return `${board.note}\n\n\`\`\`\n${board.ascii}\n\`\`\`\n\n${body}`;
}
