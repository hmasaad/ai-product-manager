import { decompositionMarkdown } from "./decompose";
import { prdMarkdown } from "./prd";
import type { Feature, Milestone, ProductPlan, Story } from "./types";

function bullets(lines: string[]) {
  if (!lines.length) return "- None stated.";
  return lines.map((line) => `- ${line}`).join("\n");
}

function feature(plan: ProductPlan, id: string) {
  return plan.features.find((item) => item.id === id);
}

function storyFor(plan: ProductPlan, featureId: string) {
  return plan.stories.find((item) => item.featureId === featureId);
}

function milestoneBlock(plan: ProductPlan, milestone: Milestone) {
  const features = milestone.featureIds.map((id) => feature(plan, id)).filter((item): item is Feature => Boolean(item));
  const body = features
    .map((item) => {
      const story = storyFor(plan, item.id);
      return storyBlock(item, story);
    })
    .join("\n\n");
  return `## ${milestone.id} — ${milestone.name}

${milestone.goal}

Exit:
${bullets(milestone.exitCriteria)}

${body}`;
}

function storyBlock(item: Feature, story: Story | undefined) {
  if (!story) return `### ${item.id} ${item.name}\n\nNo story.`;
  const acceptance = story.acceptance.map((line) => `- ${line}`).join("\n");
  const tasks = story.tasks.map((task) => `- [ ] ${task.id} · ${task.lane} — ${task.title}`).join("\n");
  const tests = (story.tests ?? [])
    .map((test) => `- ${test.id} ${test.title} — expected: ${test.expected}`)
    .join("\n");
  return `### ${item.id} ${item.name}

${story.id}. ${story.story}

Acceptance:
${acceptance}

Tasks:
${tasks}

Test cases:
${tests || "- None."}`;
}

export function architectBrief(plan: ProductPlan) {
  const must = plan.requirements.filter((item) => item.priority === "must").map((item) => item.statement);
  const should = plan.requirements.filter((item) => item.priority === "should").map((item) => item.statement);
  const later = plan.requirements.filter((item) => item.priority === "later").map((item) => item.statement);
  const users = plan.personas.map(
    (persona) => `- ${persona.role} (${persona.evidence}): ${persona.context}`,
  );

  const proposal = plan.proposed
    ? "\n\nThese must-haves are inferred from the request. They are a proposal, not a signed scope.\n"
    : "";

  return `# ${plan.title}
${proposal}
${plan.problem.statement}

## Problem

Who: ${plan.problem.who}
Today: ${plan.problem.currentWorkaround}
If we do nothing: ${plan.problem.costOfInaction}

## Users

${users.join("\n")}

## Must have (v1)

${bullets(must)}

## Should have

${bullets(should)}

## Later

${bullets(later)}

## Constraints

${bullets(plan.constraints)}

## Success

${bullets(plan.problem.success)}

## Non-goals

${bullets(plan.problem.nonGoals)}

## Open questions

Do not invent answers for these. Design around them, or send them back.

${bullets(plan.problem.openQuestions)}

## Assumptions

${bullets(plan.assumptions)}

## Risks

${bullets(plan.risks)}
`;
}

export function developerBrief(plan: ProductPlan) {
  if (plan.maturity === "problem") {
    const milestone = plan.milestones.map((item) => milestoneBlock(plan, item)).join("\n\n");
    return `# Developer brief — ${plan.title}

This is not a build. The brief states a problem and no solution.

Do not open an architecture or a sprint until the validation milestone exits.

${milestone}
`;
  }

  if (plan.proposed) {
    return `# Developer brief — ${plan.title}

This MVP is a proposal. Confirm the open questions before treating the stories as committed scope.

${plan.milestones.map((item) => milestoneBlock(plan, item)).join("\n\n")}
`;
  }

  return `# Developer brief — ${plan.title}

Ship in milestone order. Each task traces to a requirement in the architect brief.

${plan.milestones.map((item) => milestoneBlock(plan, item)).join("\n\n")}
`;
}

export function planMarkdown(plan: ProductPlan) {
  const research = plan.research
    .map((item) => `### ${item.topic} (${item.evidence})\n\n${item.finding}\n\nImplication: ${item.implication}`)
    .join("\n\n");
  const personas = plan.personas
    .map(
      (persona) =>
        `### ${persona.role} (${persona.evidence})\n\n${persona.context}\n\nJobs: ${persona.jobs.join("; ")}\n\nSuccess: ${persona.success}`,
    )
    .join("\n\n");
  const requirements = plan.requirements
    .map((item) => `- ${item.id} [${item.priority}] ${item.statement} — ${item.persona} (${item.evidence})`)
    .join("\n");
  const priority = plan.priorities
    .map((item) => {
      const name = plan.features.find((feature) => feature.id === item.featureId)?.name ?? item.featureId;
      const factors = item.factors
        .map((factor) => `${factor.sign === 1 ? "+" : "−"}${factor.score} ${factor.label} (${factor.evidence}): ${factor.reason}`)
        .join("\n");
      return `- ${item.featureId} ${name}: ${item.decision}. ${item.rationale}\n${factors}`;
    })
    .join("\n");

  const discovery = plan.discovery;
  const tagged = (lines: { text: string; evidence: string }[]) =>
    lines.map((item) => `- ${item.text} (${item.evidence})`).join("\n");

  return `# ${plan.title}

Mode: ${plan.mode}. Maturity: ${plan.maturity}.${plan.proposed ? " Proposed MVP." : ""}

## Feature decomposition

${decompositionMarkdown(plan)}

## Product Discovery

### Problem Statement

${discovery.problemStatement}

### Target Users

${discovery.targetUsers.map((user) => `- ${user.role} (${user.evidence}): ${user.why}`).join("\n")}

### User Problems

${tagged(discovery.userProblems)}

### User Needs

${discovery.userNeeds.map((item) => `- ${item.user}: ${item.need} (${item.evidence})`).join("\n")}

### Business Goals

${tagged(discovery.businessGoals)}

### Assumptions

${tagged(discovery.assumptions)}

### Constraints

${tagged(discovery.constraints)}

### Competitors

${discovery.competitors.map((item) => `- ${item.name} (${item.evidence}): ${item.note}`).join("\n")}

### Success Metrics

${tagged(discovery.successMetrics)}

### MVP Definition

${tagged(discovery.mvpDefinition)}

## PRD

${prdMarkdown(plan)}

## Product Research

${research}

## Problem Definition

${plan.problem.statement}

## User Personas

${personas}

## Requirements

${requirements}

## Prioritization

${priority}

## Roadmap

${plan.roadmap.note}

\`\`\`
${plan.roadmap.ascii}
\`\`\`

## Engineering handoff — architect

${plan.handoff.architect}

## Engineering handoff — developer

${plan.handoff.developer}
`;
}
