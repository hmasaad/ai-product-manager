import type { Discovery, Prd, ProductPlan, TaggedLine } from "./types";

function qualityRequirement(statement: string) {
  return /\boffline|\bsync\b|\bminutes?\b|\bseconds?\b|\bretain|\bsso\b|\bokta\b|\baudit\b|\bphone\b/i.test(
    statement,
  );
}

function flowsFrom(plan: ProductPlan, discovery: Discovery) {
  if (discovery.flows.length) return discovery.flows;
  return plan.features
    .filter((feature) => feature.scope === "must")
    .slice(0, 4)
    .map((feature) => {
      const story = plan.stories.find((item) => item.featureId === feature.id);
      return {
        name: feature.name,
        steps: [
          `${story?.persona ?? "The user"} starts ${feature.name.toLowerCase()}`,
          ...(story?.acceptance ?? [feature.outcome]).slice(0, 3),
          "The record shows the result",
        ],
      };
    });
}

function analyticsFrom(plan: ProductPlan, discovery: Discovery) {
  if (discovery.analytics.length) return discovery.analytics;
  return plan.features
    .filter((feature) => feature.scope === "must")
    .slice(0, 6)
    .map((feature) => ({
      name: `${feature.name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "")}_completed`,
      when: `The ${feature.name.toLowerCase()} acceptance lines are met.`,
      evidence: "inferred" as const,
    }));
}

function nfrs(plan: ProductPlan, discovery: Discovery): TaggedLine[] {
  const fromRequirements = plan.requirements
    .filter((item) => qualityRequirement(item.statement))
    .map((item) => ({ text: item.statement, evidence: item.evidence }));
  const seen = new Set(fromRequirements.map((item) => item.text));
  return [...fromRequirements, ...discovery.nonFunctional.filter((item) => !seen.has(item.text))];
}

export function buildPrd(plan: ProductPlan): Prd {
  const discovery = plan.discovery;
  const functional = plan.requirements.map((item) => ({
    id: item.id,
    statement: item.statement,
    priority: item.priority,
    persona: item.persona,
  }));
  const future = [
    ...plan.requirements.filter((item) => item.priority === "later").map((item) => item.statement),
    ...discovery.futureScope.map((item) => item.text),
  ];
  const futureSeen = new Set<string>();
  const futureScope = future.filter((item) => {
    if (futureSeen.has(item)) return false;
    futureSeen.add(item);
    return true;
  });

  return {
    overview: `${plan.title}. ${discovery.problemStatement}`,
    problemStatement: discovery.problemStatement,
    goals: discovery.businessGoals.map((item) => item.text),
    nonGoals: plan.problem.nonGoals,
    personas: discovery.targetUsers,
    userStories: plan.stories.map((story) => ({
      id: story.id,
      story: story.story,
      persona: story.persona,
    })),
    functionalRequirements: functional,
    nonFunctionalRequirements: nfrs(plan, discovery),
    userFlows: flowsFrom(plan, discovery),
    acceptanceCriteria: plan.stories.map((story) => ({
      id: story.id,
      criteria: story.acceptance,
    })),
    edgeCases: discovery.edgeCases,
    analyticsEvents: analyticsFrom(plan, discovery),
    dependencies: discovery.dependencies,
    risks: plan.risks,
    openQuestions: discovery.questions,
    mvpScope: plan.requirements.filter((item) => item.priority === "must").map((item) => item.statement),
    futureScope,
  };
}

export function prdMarkdown(plan: ProductPlan) {
  const prd = plan.prd;
  const section = (title: string, lines: string[]) =>
    `## ${title}\n\n${lines.length ? lines.map((line) => `- ${line}`).join("\n") : "- None."}`;
  return `# PRD — ${plan.title}

## Product Overview

${prd.overview}

## Problem Statement

${prd.problemStatement}

${section("Goals", prd.goals)}

${section("Non-goals", prd.nonGoals)}

${section(
  "Personas",
  prd.personas.map((persona) => `${persona.role} (${persona.evidence}): ${persona.why}`),
)}

${section(
  "User Stories",
  prd.userStories.map((story) => `${story.id}. ${story.story}`),
)}

${section(
  "Functional Requirements",
  prd.functionalRequirements.map((item) => `${item.id} [${item.priority}] ${item.statement} — ${item.persona}`),
)}

${section(
  "Non-functional Requirements",
  prd.nonFunctionalRequirements.map((item) => `${item.text} (${item.evidence})`),
)}

## User Flows

${prd.userFlows.map((flow) => `### ${flow.name}\n\n${flow.steps.map((step, index) => `${index + 1}. ${step}`).join("\n")}`).join("\n\n")}

${section(
  "Acceptance Criteria",
  prd.acceptanceCriteria.flatMap((item) => item.criteria.map((line) => `${item.id}: ${line}`)),
)}

${section(
  "Edge Cases",
  prd.edgeCases.map((item) => item.text),
)}

${section(
  "Analytics Events",
  prd.analyticsEvents.map((item) => `${item.name} — ${item.when} (${item.evidence})`),
)}

${section(
  "Dependencies",
  prd.dependencies.map((item) => item.text),
)}

${section("Risks", prd.risks)}

${section("Open Questions", prd.openQuestions)}

${section("MVP Scope", prd.mvpScope)}

${section("Future Scope", prd.futureScope)}
`;
}
