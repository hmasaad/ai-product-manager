import { contentWords } from "./text";
import type { Evidence, ExperimentVerdict, Feature, ProductExperiment, ProductPlan } from "./types";

export const EXPERIMENT_NOTE =
  "A large feature starts as a hypothesis. Prototype it, name the metric and the success threshold, then decide Build, Modify, or Abandon.";

export const EXPERIMENT_ASCII = `Idea
 ↓
Hypothesis
 ↓
Experiment
 ↓
Metric
 ↓
Success Criteria
 ↓
Decision`;

export const EXPERIMENT_CHOICES = ["Build", "Modify", "Abandon"] as const;

export const UNNAMED_METRIC = "A stated measure of done was not named.";
export const UNNAMED_THRESHOLD = "Name a threshold before treating this as a build.";

const TEMPLATE_HYPOTHESIS = "Users will complete report creation faster with saved report templates.";
const TEMPLATE_EXPERIMENT = "Prototype templates for 10 users.";
const TEMPLATE_METRIC = "Time to create report.";
const TEMPLATE_THRESHOLD = "30% reduction.";

const LABELS = "hypothesis|experiment|primary metric|metric|success threshold|success criteria|decision";

const LARGE = /\b(report|analytics|template|export|portal|dashboard|notification|invite)\b/i;

function collapse(text: string) {
  return text.replace(/\s+/g, " ").trim();
}

function field(source: string, names: string[]) {
  const label = names.join("|");
  const re = new RegExp(
    `(?:^|\\n)\\s*(?:${label})\\s*:\\s*([\\s\\S]*?)(?=\\n\\s*(?:${LABELS})\\s*:|$)`,
    "i",
  );
  const match = source.match(re);
  return match?.[1] ? collapse(match[1]) : "";
}

function overlap(left: string, right: string) {
  const words = contentWords(left);
  if (!words.length) return false;
  const hay = right.toLowerCase();
  const hits = words.filter((word) => hay.includes(word));
  return hits.length >= Math.min(2, words.length);
}

function ideaFrom(source: string, hypothesis: string) {
  if (/saved report templates|report templates/i.test(`${source}\n${hypothesis}`)) {
    return "Saved report templates";
  }
  const heading = source
    .split("\n")
    .map((line) => line.replace(/^#+\s*/, "").trim())
    .find((line) => line && !new RegExp(`^(?:${LABELS})\\s*:`, "i").test(line));
  return heading || hypothesis;
}

function parseStated(source: string): ProductExperiment | null {
  const hypothesis = field(source, ["hypothesis"]);
  const experiment = field(source, ["experiment"]);
  const metric = field(source, ["primary metric", "metric"]);
  const success = field(source, ["success threshold", "success criteria"]);
  if (!hypothesis || !experiment || !metric || !success) return null;
  return {
    id: "EXP1",
    idea: ideaFrom(source, hypothesis),
    hypothesis,
    experiment,
    metric,
    successCriteria: success,
    decision: "pending",
    evidence: "stated",
  };
}

function card(input: {
  id: string;
  idea: string;
  hypothesis: string;
  experiment: string;
  metric: string;
  successCriteria: string;
  featureId?: string;
  evidence: Evidence;
}): ProductExperiment {
  return {
    ...input,
    decision: "pending",
  };
}

function usersOf(plan: ProductPlan) {
  const named = plan.personas.map((persona) => persona.role).filter(Boolean);
  if (named.length) return named.slice(0, 2).join(" and ").toLowerCase();
  return "the named users";
}

function metricFor(plan: ProductPlan, topic: string): { metric: string; successCriteria: string; evidence: Evidence } {
  const source = plan.sourceText;
  const completion = source.match(/(\d+(?:\.\d+)?)%\s+completed payment/i);
  if (completion && /payment|billing|amount due|invoice/i.test(topic)) {
    return {
      metric: `Payment completion (${completion[1]}% stated).`,
      successCriteria: `Completion rises from the stated ${completion[1]}%.`,
      evidence: "stated",
    };
  }
  return { metric: UNNAMED_METRIC, successCriteria: UNNAMED_THRESHOLD, evidence: "unknown" };
}

function validationExperiment(plan: ProductPlan): ProductExperiment {
  const who = plan.problem.who || usersOf(plan);
  return card({
    id: "EXP1",
    idea: plan.title,
    hypothesis: "The people named still have this problem during the situation in the source.",
    experiment: `Sit with ${who} and record what they do today, before a build.`,
    metric: UNNAMED_METRIC,
    successCriteria: UNNAMED_THRESHOLD,
    featureId: plan.features.find((feature) => /validate/i.test(feature.name))?.id,
    evidence: "inferred",
  });
}

function proposedExperiment(plan: ProductPlan): ProductExperiment {
  const feature = plan.features.find((item) => item.scope === "must") ?? plan.features[0];
  return card({
    id: "EXP1",
    idea: feature?.name ?? plan.title,
    hypothesis: `${usersOf(plan)} will complete the named job if ${feature?.name ?? "this MVP"} matches the day's work.`,
    experiment: `Walk the proposed ${feature?.name ?? "MVP"} with ${usersOf(plan)} before a full build.`,
    metric: UNNAMED_METRIC,
    successCriteria: UNNAMED_THRESHOLD,
    featureId: feature?.id,
    evidence: "inferred",
  });
}

function laterExperiment(plan: ProductPlan, feature: Feature, index: number): ProductExperiment {
  const topic = `${feature.name} ${feature.outcome}`;
  const measure = metricFor(plan, topic);
  const hypothesis = /report template/i.test(topic)
    ? TEMPLATE_HYPOTHESIS
    : `Users will complete the job named in ${feature.name} if that slice exists.`;
  return card({
    id: `EXP${index}`,
    idea: feature.name,
    hypothesis,
    experiment: `Prototype ${feature.name} with ${usersOf(plan)} before a full build.`,
    metric: measure.metric,
    successCriteria: measure.successCriteria,
    featureId: feature.id,
    evidence: measure.evidence === "stated" ? "stated" : "inferred",
  });
}

function recommendationExperiment(plan: ProductPlan, index: number): ProductExperiment | null {
  const rec = plan.recommendations[0];
  if (!rec) return null;
  const feature = plan.features.find((item) => item.id === rec.featureId);
  const topic = `${rec.opportunity} ${feature?.name ?? ""}`;
  const measure = metricFor(plan, topic);
  return card({
    id: `EXP${index}`,
    idea: rec.opportunity,
    hypothesis: `Users will finish this job more often if ${rec.opportunity.toLowerCase()} lands.`,
    experiment: `Prototype ${rec.opportunity.toLowerCase()} with ${usersOf(plan)} before a full build.`,
    metric: measure.metric,
    successCriteria: measure.successCriteria,
    featureId: rec.featureId,
    evidence: measure.evidence === "stated" ? "stated" : "inferred",
  });
}

function laterCandidates(plan: ProductPlan) {
  return plan.features
    .filter((feature) => feature.scope === "later")
    .sort((a, b) => Number(LARGE.test(b.name)) - Number(LARGE.test(a.name)));
}

export function buildExperiments(plan: ProductPlan): ProductExperiment[] {
  const stated = parseStated(plan.sourceText);
  if (plan.maturity === "problem") {
    return stated ? [stated] : [validationExperiment(plan)];
  }

  const found: ProductExperiment[] = [];
  if (stated) found.push(stated);

  if (plan.proposed && !stated) {
    found.push(proposedExperiment(plan));
  }

  let next = found.length + 1;
  for (const feature of laterCandidates(plan)) {
    if (found.length >= 5) break;
    if (stated && overlap(stated.idea, `${feature.name} ${feature.outcome}`)) continue;
    if (found.some((item) => item.featureId === feature.id || overlap(item.idea, feature.name))) continue;
    found.push(laterExperiment(plan, feature, next));
    next += 1;
  }

  if (!found.length) {
    const fromRec = recommendationExperiment(plan, 1);
    if (fromRec) found.push(fromRec);
  }

  return found;
}

export function experimentMarkdown(plan: ProductPlan) {
  if (!plan.experiments.length) return "No experiment is waiting on this plan.";
  return plan.experiments
    .map((item) => {
      return `### ${item.id} ${item.idea} (${item.evidence})

Hypothesis: ${item.hypothesis}

Experiment: ${item.experiment}

Primary metric: ${item.metric}

Success threshold: ${item.successCriteria}

Decision: pending — ${EXPERIMENT_CHOICES.join(" / ")}.`;
    })
    .join("\n\n");
}

export function experimentVerdictLabel(verdict: ExperimentVerdict) {
  if (verdict === "pending") return EXPERIMENT_CHOICES.join(" / ");
  return verdict.charAt(0).toUpperCase() + verdict.slice(1);
}

export const REPORT_TEMPLATE_COPY = {
  hypothesis: TEMPLATE_HYPOTHESIS,
  experiment: TEMPLATE_EXPERIMENT,
  metric: TEMPLATE_METRIC,
  successCriteria: TEMPLATE_THRESHOLD,
};
