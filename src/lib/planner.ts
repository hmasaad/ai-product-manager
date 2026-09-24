import { buildDecomposition } from "./decompose";
import { breakDown } from "./derive";
import { buildDiscovery, enrichSketch } from "./discovery";
import { buildJudgment, composeSource } from "./grounded";
import { architectBrief, developerBrief } from "./handoff";
import { buildPrd } from "./prd";
import { applyAmbiguities, detectAmbiguities } from "./ambiguity";
import { trackDecisions } from "./assumption";
import { analyzeImpact } from "./impact";
import { buildAnalytics, emptyAnalytics } from "./analytics";
import { attachReevaluationGates, buildApprovals, emptyApprovals } from "./approval";
import { buildDecisionEngine, emptyDecisionEngine } from "./decide";
import { buildDecisionLedger, emptyDecisionLedger } from "./ledger";
import { attachDecisionStates, buildDecisionReevaluation, emptyDecisionReevaluation } from "./reevaluate";
import { buildProductGraph, emptyProductGraph } from "./graph";
import { buildPortfolio, emptyPortfolio } from "./portfolio";
import { buildMonitoring, emptyMonitor } from "./monitor";
import { buildProductLoop, emptyProductLoop } from "./loop";
import { buildOpportunityScoring, emptyOpportunityScoring } from "./score";
import { buildOrchestration, emptyOrchestration } from "./orchestrate";
import { buildExperiments } from "./experiment";
import { buildRiskAnalysis, emptyRiskAnalysis } from "./risks";
import { buildTraceability, emptyTraceability } from "./trace";
import { detectConflicts } from "./conflict";
import { consultMemory, emptyContext, emptyMemory } from "./memory";
import { buildRecommendations } from "./recommend";
import { buildCapacityPlan, isCapacityRoadmap, roadmapFromMilestones } from "./roadmap";
import type { Judgment, ModelUsage, ProductInput, ProductMemory, ProductPlan } from "./types";

export function planFromJudgment(input: {
  input: ProductInput;
  judgment: Judgment;
  mode: ProductPlan["mode"];
  note?: string;
  usage?: ModelUsage;
  memory?: ProductMemory;
}): ProductPlan {
  const sourceText = composeSource(input.input);
  const enriched = enrichSketch(input.input, input.judgment);
  const consulted = consultMemory(enriched.judgment, input.memory ?? emptyMemory(), input.input.brief);
  const ambiguities = detectAmbiguities(input.input, consulted.judgment);
  const judgment = applyAmbiguities(consulted.judgment, ambiguities);
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
    context: consulted.context ?? emptyContext(),
    ambiguities,
    decisions: [],
    conflicts: [],
    recommendations: [],
    opportunityScoring: emptyOpportunityScoring(),
    impacts: [],
    riskAnalysis: emptyRiskAnalysis(),
    experiments: [],
    analytics: emptyAnalytics(),
    approvals: emptyApprovals(),
    orchestration: emptyOrchestration(),
    decisionEngine: emptyDecisionEngine(),
    decisionLedger: emptyDecisionLedger(),
    decisionReevaluation: emptyDecisionReevaluation(),
    productGraph: emptyProductGraph(),
    portfolio: emptyPortfolio(),
    monitoring: emptyMonitor(),
    productLoop: emptyProductLoop(),
    traceability: emptyTraceability(),
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
  plan.traceability = buildTraceability(plan);
  plan.decisions = trackDecisions(plan);
  for (const item of plan.decisions) {
    if (item.status === "assumption" && !plan.assumptions.includes(item.decision)) {
      plan.assumptions.push(item.decision);
      plan.discovery.assumptions.push({ text: item.decision, evidence: "inferred" });
    }
  }
  plan.prd = buildPrd(plan);
  plan.conflicts = detectConflicts({
    input: input.input,
    constraints: plan.constraints,
    memory: input.memory,
  });
  plan.recommendations = buildRecommendations(plan, input.memory);
  plan.opportunityScoring = buildOpportunityScoring(plan, input.memory);
  plan.impacts = analyzeImpact(plan, input.memory);
  plan.riskAnalysis = buildRiskAnalysis(plan);
  plan.experiments = buildExperiments(plan);
  plan.analytics = buildAnalytics(plan, input.memory);
  plan.monitoring = buildMonitoring(plan, input.memory);
  plan.approvals = buildApprovals(plan);
  plan.decisionEngine = buildDecisionEngine(plan, input.memory);
  plan.decisionLedger = buildDecisionLedger(plan, input.memory);
  plan.decisionReevaluation = buildDecisionReevaluation(plan, input.memory);
  const withStates = attachDecisionStates(plan);
  plan.decisionLedger = withStates.decisionLedger;
  plan.decisionReevaluation = withStates.decisionReevaluation;
  plan.approvals = attachReevaluationGates(plan);
  plan.productGraph = buildProductGraph(plan);
  plan.portfolio = buildPortfolio(plan, input.memory);
  plan.productLoop = buildProductLoop(plan);
  plan.orchestration = buildOrchestration(plan);
  plan.handoff = {
    architect: architectBrief(plan),
    developer: developerBrief(plan),
  };
  return plan;
}

export function planFromInput(input: ProductInput, memory?: ProductMemory): ProductPlan {
  return planFromJudgment({
    input,
    judgment: buildJudgment(input),
    mode: "grounded",
    memory,
  });
}
