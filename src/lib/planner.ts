import { buildDecomposition } from "./decompose";
import { breakDown } from "./derive";
import { buildDiscovery, enrichSketch } from "./discovery";
import { buildJudgment, composeSource } from "./grounded";
import { architectBrief, developerBrief } from "./handoff";
import { buildPrd } from "./prd";
import { buildCapacityPlan, isCapacityRoadmap, roadmapFromMilestones } from "./roadmap";
import type { Judgment, ModelUsage, ProductInput, ProductPlan } from "./types";

export function planFromJudgment(input: {
  input: ProductInput;
  judgment: Judgment;
  mode: ProductPlan["mode"];
  note?: string;
  usage?: ModelUsage;
}): ProductPlan {
  const sourceText = composeSource(input.input);
  const enriched = enrichSketch(input.input, input.judgment);
  const judgment = enriched.judgment;
  const discovery = buildDiscovery({
    judgment,
    proposed: enriched.proposed,
    domain: enriched.domain,
    source: sourceText,
  });
  const parts = breakDown(judgment);
  const plan: ProductPlan = {
    id: `plan-${Date.now().toString(36)}`,
    createdAt: new Date().toISOString(),
    title: judgment.title,
    mode: input.mode,
    note: input.note ?? "",
    proposed: enriched.proposed,
    maturity: judgment.maturity,
    input: input.input,
    sourceText,
    research: judgment.research,
    problem: judgment.problem,
    personas: judgment.personas,
    requirements: judgment.requirements,
    constraints: judgment.constraints,
    assumptions: judgment.assumptions,
    risks: judgment.risks,
    features: parts.features,
    stories: parts.stories,
    priorities: parts.priorities,
    milestones: parts.milestones,
    roadmap: {
      developers: null,
      weeks: null,
      sprintWeeks: null,
      note: "",
      ascii: "",
      sprints: [],
      deferred: [],
    },
    decomposition: { root: "", ascii: "", nodes: [] },
    discovery,
    prd: {
      overview: "",
      problemStatement: "",
      goals: [],
      nonGoals: [],
      personas: [],
      userStories: [],
      functionalRequirements: [],
      nonFunctionalRequirements: [],
      userFlows: [],
      acceptanceCriteria: [],
      edgeCases: [],
      analyticsEvents: [],
      dependencies: [],
      risks: [],
      openQuestions: [],
      mvpScope: [],
      futureScope: [],
    },
    handoff: { architect: "", developer: "" },
    usage: input.usage,
  };
  if (isCapacityRoadmap(sourceText)) {
    const shaped = buildCapacityPlan(judgment, sourceText);
    plan.features = shaped.features;
    plan.stories = shaped.stories;
    plan.priorities = shaped.priorities;
    plan.milestones = shaped.milestones;
    plan.roadmap = shaped.roadmap;
  } else {
    plan.roadmap = roadmapFromMilestones(plan);
  }
  const decomposed = buildDecomposition(plan);
  plan.stories = decomposed.stories;
  plan.decomposition = decomposed.decomposition;
  plan.prd = buildPrd(plan);
  plan.handoff = {
    architect: architectBrief(plan),
    developer: developerBrief(plan),
  };
  return plan;
}

export function planFromInput(input: ProductInput): ProductPlan {
  return planFromJudgment({
    input,
    judgment: buildJudgment(input),
    mode: "grounded",
  });
}
