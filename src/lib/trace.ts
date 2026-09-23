import { contentWords } from "./text";
import type { Feature, ProductPlan, Story, TraceChain, TraceKind, TraceStep, Traceability } from "./types";

export const TRACE_NOTE =
  "Each slice is a chain from a business goal to a test case. A backend task is the API. Asking why that API exists walks back through the feature, the story, the customer problem, and the business goal.";

export const KIND_LABEL: Record<TraceKind, string> = {
  goal: "Business Goal",
  objective: "Product Objective",
  feature: "Feature",
  story: "User Story",
  acceptance: "Acceptance Criteria",
  technical: "Technical Requirement",
  task: "Engineering Task",
  test: "Test Case",
  problem: "Customer Problem",
};

export const DOWN_KINDS: TraceKind[] = [
  "goal",
  "objective",
  "feature",
  "story",
  "acceptance",
  "technical",
  "task",
  "test",
];

export const WHY_KINDS: TraceKind[] = ["technical", "feature", "story", "problem", "goal"];

export function emptyTraceability(): Traceability {
  return { note: TRACE_NOTE, ascii: "", chains: [] };
}

function arrow(steps: TraceStep[]) {
  return steps.map((step, index) => `${index === 0 ? "" : "      ↓\n"}${KIND_LABEL[step.kind]}\n${step.label}`).join("\n");
}

function overlap(left: string, right: string) {
  const hay = new Set(contentWords(right));
  return contentWords(left).filter((word) => hay.has(word)).length;
}

function goalFor(plan: ProductPlan, feature: Feature, story: Story) {
  const candidates = [
    ...plan.discovery.businessGoals.map((item) => item.text),
    ...plan.problem.success,
    ...plan.prd?.goals ?? [],
  ].filter(Boolean);
  const blob = `${feature.name} ${feature.outcome} ${story.story}`;
  const ranked = [...candidates].sort((a, b) => overlap(blob, b) - overlap(blob, a));
  return ranked[0] ?? plan.problem.statement;
}

function problemFor(plan: ProductPlan, feature: Feature) {
  const problems = plan.discovery.userProblems.map((item) => item.text);
  const ranked = [...problems].sort((a, b) => overlap(feature.name, b) - overlap(feature.name, a));
  return ranked[0] ?? plan.problem.statement;
}

function technicalFor(story: Story): TraceStep {
  const backend = story.tasks.find((task) => task.lane === "backend");
  const task = backend ?? story.tasks.find((task) => task.lane !== "qa") ?? story.tasks[0];
  const label = backend ? `API: ${backend.title}` : (task?.title ?? "No engineering task was named.");
  return { kind: "technical", label, ref: task?.id };
}

function chainFor(plan: ProductPlan, feature: Feature, story: Story): TraceChain {
  const goal = goalFor(plan, feature, story);
  const problem = problemFor(plan, feature);
  const technical = technicalFor(story);
  const task = story.tasks.find((item) => item.id === technical.ref) ?? story.tasks[0];
  const test = story.tests[0];
  const down: TraceStep[] = [
    { kind: "goal", label: goal },
    { kind: "objective", label: feature.outcome },
    { kind: "feature", label: feature.name, ref: feature.id },
    { kind: "story", label: story.story, ref: story.id },
    { kind: "acceptance", label: story.acceptance[0] ?? "No acceptance line was named." },
    technical,
    { kind: "task", label: task ? `${task.id} · ${task.lane} — ${task.title}` : "No engineering task was named.", ref: task?.id },
    { kind: "test", label: test ? `${test.id} ${test.title}` : "No test case was named.", ref: test?.id },
  ];
  const why: TraceStep[] = [
    technical,
    { kind: "feature", label: feature.name, ref: feature.id },
    { kind: "story", label: story.story, ref: story.id },
    { kind: "problem", label: problem },
    { kind: "goal", label: goal },
  ];
  return {
    featureId: feature.id,
    feature: feature.name,
    down,
    why,
    asciiDown: arrow(down),
    asciiWhy: arrow(why),
  };
}

export function buildTraceability(plan: ProductPlan): Traceability {
  const chains = plan.features
    .map((feature) => {
      const story = plan.stories.find((item) => item.featureId === feature.id);
      return story ? chainFor(plan, feature, story) : null;
    })
    .filter((item): item is TraceChain => Boolean(item));
  return {
    note: TRACE_NOTE,
    ascii: `Business Goal
      ↓
Product Objective
      ↓
Feature
      ↓
User Story
      ↓
Acceptance Criteria
      ↓
Technical Requirement
      ↓
Engineering Task
      ↓
Test Case`,
    chains,
  };
}

export function whyThis(plan: ProductPlan, query: string): TraceChain[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return plan.traceability?.chains ?? [];
  return (plan.traceability?.chains ?? []).filter((chain) => {
    const hay = [chain.feature, ...chain.why.map((step) => step.label), ...chain.down.map((step) => step.label)]
      .join(" ")
      .toLowerCase();
    return hay.includes(needle);
  });
}

export function traceabilityMarkdown(plan: ProductPlan) {
  const tree = plan.traceability;
  if (!tree?.chains.length) return "No product-to-engineering chain was produced.";
  const body = tree.chains
    .map(
      (chain) => `### ${chain.feature}

${chain.asciiDown}

Why this work

${chain.asciiWhy}`,
    )
    .join("\n\n");
  return `${tree.ascii}

${body}`;
}
