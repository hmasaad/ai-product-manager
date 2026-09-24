import { contentWords } from "./text";
import type {
  Evidence,
  Feature,
  ImpactLevel,
  PriorityItem,
  ProductMemory,
  ProductPlan,
  Recommendation,
  RecommendationFact,
} from "./types";

export const CONFIDENCE_NOTE =
  "Confidence starts at 0.50. A stated support-request count adds 0.16. A stated share of users adds 0.12. A stated feature-request count adds 0.08. A stated account or completion baseline adds 0.06. A stated must-have list adds 0.06. Revenue that was never measured subtracts 0.04. A problem with no counts subtracts 0.08. A proposed MVP subtracts 0.08. The score is clamped between 0.20 and 0.95.";

const MONEY = /\b(revenue|payment|paid|invoice|billing|amount due|refund|card)\b/i;

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function numberOf(raw: string) {
  return Number(raw.replace(/,/g, ""));
}

function fact(text: string, evidence: Evidence = "stated"): RecommendationFact {
  return { text, evidence };
}

type Volume = {
  supportRequests: number | null;
  userShare: number | null;
  featureRequests: number | null;
  accounts: number | null;
  completion: number | null;
  complaints: { quote: string; count: number | null }[];
};

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

function hasCounts(volume: Volume) {
  return Boolean(
    volume.supportRequests ||
      volume.userShare != null ||
      volume.featureRequests != null ||
      volume.complaints.some((item) => item.count),
  );
}

function confidenceOf(plan: ProductPlan, volume: Volume) {
  let score = 0.5;
  if (volume.supportRequests || volume.complaints.some((item) => item.count)) score += 0.16;
  if (volume.userShare != null) score += 0.12;
  if (volume.featureRequests != null) score += 0.08;
  if (volume.accounts != null || volume.completion != null) score += 0.06;
  if (plan.maturity === "solution" && plan.requirements.some((item) => item.priority === "must" && item.evidence === "stated")) {
    score += 0.06;
  }
  if (!MONEY.test(plan.sourceText)) score -= 0.04;
  if (plan.maturity === "problem" && !hasCounts(volume)) score -= 0.08;
  if (plan.proposed) score -= 0.08;
  return round2(clamp(score, 0.2, 0.95));
}

function unknownsOf(plan: ProductPlan, volume: Volume) {
  const unknowns: string[] = [];
  if (!MONEY.test(plan.sourceText)) unknowns.push("Revenue impact hasn't been measured");
  unknowns.push("User interviews are limited");
  if (!hasCounts(volume) && plan.maturity === "problem") {
    unknowns.push("No support volume or encounter rate was stated.");
  }
  if (plan.proposed) unknowns.push("The buyer and the measure of done were not confirmed.");
  return unknowns;
}

function sharedEvidence(volume: Volume): RecommendationFact[] {
  const lines: RecommendationFact[] = [];
  if (volume.supportRequests != null) {
    lines.push(fact(`${volume.supportRequests} support requests`));
  }
  if (volume.userShare != null) {
    lines.push(fact(`${volume.userShare}% of users encountered the issue`));
  }
  if (volume.featureRequests != null) {
    lines.push(fact(`${volume.featureRequests} related feature requests`));
  }
  if (volume.accounts != null) {
    lines.push(fact(`${volume.accounts.toLocaleString("en-US")} accounts reached the invoice page`));
  }
  if (volume.completion != null) {
    lines.push(fact(`${volume.completion}% completed payment`));
  }
  return lines;
}

function levelFrom(score: number): ImpactLevel {
  if (score >= 4) return "high";
  if (score >= 3) return "medium";
  return "low";
}

function userImpact(volume: Volume, count: number | null): { level: ImpactLevel; reason: string } {
  if ((count ?? 0) >= 100 || (volume.supportRequests ?? 0) >= 100 || (volume.userShare ?? 0) >= 20) {
    const parts = [
      count != null ? `${count} support requests` : "",
      volume.supportRequests != null ? `${volume.supportRequests} support requests` : "",
      volume.userShare != null ? `${volume.userShare}% of users hit the issue` : "",
    ].filter(Boolean);
    return { level: "high", reason: parts[0] ? `Stated volume: ${parts[0]}.` : "The source names a large share of users." };
  }
  if ((count ?? 0) >= 20 || (volume.supportRequests ?? 0) >= 20 || (volume.userShare ?? 0) >= 5) {
    return { level: "medium", reason: "The source names a measurable share of users." };
  }
  return { level: "medium", reason: "User volume was not counted. Impact follows the people named in the source." };
}

function businessImpact(plan: ProductPlan): { level: ImpactLevel; reason: string } {
  if (MONEY.test(plan.sourceText)) {
    return { level: "high", reason: "The source ties this work to money already in motion." };
  }
  if (plan.problem.success.length) {
    return { level: "medium", reason: "A success line was stated, and no revenue number sits next to it." };
  }
  return { level: "low", reason: "No revenue or completion effect was stated." };
}

function technicalCost(feature: Feature | undefined, priority: PriorityItem | undefined): {
  level: ImpactLevel;
  reason: string;
} {
  const effort = priority?.factors.find((item) => item.key === "effort");
  if (effort) {
    return { level: levelFrom(effort.score), reason: effort.reason };
  }
  if (feature && /report|export|analytics/i.test(feature.name)) {
    return { level: "medium", reason: "Export and report work is a contained slice until a format is named." };
  }
  return { level: "medium", reason: "No engineering estimate was stated. The default is a contained slice." };
}

function risksFor(plan: ProductPlan, priority: PriorityItem | undefined) {
  const fromPriority = priority?.factors.find((item) => item.key === "risk")?.reason;
  const lines = [...plan.risks];
  if (fromPriority && !lines.includes(fromPriority)) lines.unshift(fromPriority);
  if (!lines.length) lines.push("A miss stays local until a number says otherwise.");
  return lines.slice(0, 3);
}

function matchFeature(plan: ProductPlan, text: string) {
  const words = contentWords(text);
  if (words.length < 2) return undefined;
  return plan.features.find((feature) => {
    if (/validate|commit a solution/i.test(feature.name)) return false;
    const hay = `${feature.name} ${feature.outcome}`.toLowerCase();
    return words.filter((word) => hay.includes(word)).length >= 2;
  });
}

function opportunityFromQuote(quote: string) {
  const text = quote.toLowerCase();
  if (/amount due|can't find|cannot find/.test(text)) return "Make the amount due visible";
  if (/card failed|don't know why|do not know why/.test(text)) return "Explain a failed card";
  if (/paid but|still shows due/.test(text)) return "Clear a paid invoice that still shows due";
  if (/report|export/.test(text)) return "Improve report export";
  return quote.charAt(0).toUpperCase() + quote.slice(1);
}

function opportunityFromBrief(plan: ProductPlan) {
  const line = plan.input.brief.split(/[.\n]/)[0]?.trim() ?? plan.title;
  if (/^improve\b|^reduce\b|^fix\b|^clear\b/i.test(line)) return line.replace(/\.$/, "");
  return plan.title;
}

function card(input: {
  id: string;
  opportunity: string;
  feature?: Feature;
  plan: ProductPlan;
  volume: Volume;
  evidence: RecommendationFact[];
  count?: number | null;
}): Recommendation {
  const priority = input.plan.priorities.find((item) => item.featureId === input.feature?.id);
  return {
    id: input.id,
    opportunity: input.opportunity,
    featureId: input.feature?.id,
    evidence: input.evidence,
    userImpact: userImpact(input.volume, input.count ?? null),
    businessImpact: businessImpact(input.plan),
    technicalCost: technicalCost(input.feature, priority),
    risks: risksFor(input.plan, priority),
    confidence: confidenceOf(input.plan, input.volume),
    unknowns: unknownsOf(input.plan, input.volume),
  };
}

export function buildRecommendations(plan: ProductPlan, memory?: ProductMemory): Recommendation[] {
  const volume = readVolume(corpus(plan, memory));
  const shared = sharedEvidence(volume);

  if (volume.complaints.length) {
    return volume.complaints.map((complaint, index) => {
      const extra = complaint.count != null ? [fact(`${complaint.count} support requests`)] : [];
      const evidence = [...extra, ...shared.filter((item) => !/support requests/i.test(item.text))];
      return card({
        id: `REC${index + 1}`,
        opportunity: opportunityFromQuote(complaint.quote),
        feature: matchFeature(plan, complaint.quote) ?? plan.features[0],
        plan,
        volume,
        evidence,
        count: complaint.count,
      });
    });
  }

  if (hasCounts(volume)) {
    return [
      card({
        id: "REC1",
        opportunity: opportunityFromBrief(plan),
        feature: matchFeature(plan, plan.input.brief) ?? matchFeature(plan, "report export"),
        plan,
        volume,
        evidence: shared,
        count: volume.supportRequests,
      }),
    ];
  }

  if (plan.maturity === "problem") {
    return [
      card({
        id: "REC1",
        opportunity: `Validate ${plan.title.replace(/^validate\s+/i, "")}`,
        feature: plan.features.find((item) => /validate/i.test(item.name)),
        plan,
        volume,
        evidence: [fact("The source names a problem and no mechanism.", plan.research[0]?.evidence ?? "stated")],
      }),
    ];
  }

  return plan.priorities.slice(0, 3).map((item, index) => {
    const feature = plan.features.find((feature) => feature.id === item.featureId);
    const req = plan.requirements.find((requirement) => requirement.id === feature?.requirementIds[0]);
    const evidence: RecommendationFact[] = [];
    if (req) evidence.push(fact(req.statement, req.evidence));
    if (plan.problem.success[0]) evidence.push(fact(plan.problem.success[0], "stated"));
    if (!evidence.length) evidence.push(fact(feature?.outcome ?? plan.title, "inferred"));
    return card({
      id: `REC${index + 1}`,
      opportunity: feature?.name ?? item.featureId,
      feature,
      plan,
      volume,
      evidence,
    });
  });
}

export function recommendationMarkdown(plan: ProductPlan) {
  if (!plan.recommendations?.length) return "No recommendation was produced.";
  return plan.recommendations
    .map((item) => {
      const evidence = item.evidence.map((line) => `• ${line.text}`).join("\n");
      const unknowns = item.unknowns.map((line) => `• ${line}`).join("\n");
      return `Opportunity: ${item.opportunity}

Evidence:
${evidence}

User impact: ${item.userImpact.level} — ${item.userImpact.reason}
Business impact: ${item.businessImpact.level} — ${item.businessImpact.reason}
Technical cost: ${item.technicalCost.level} — ${item.technicalCost.reason}
Risks: ${item.risks.join("; ")}
Confidence: ${item.confidence.toFixed(2)}

Unknowns:
${unknowns}`;
    })
    .join("\n\n");
}
