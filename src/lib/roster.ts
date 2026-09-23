import type { StepId } from "./types";

export const PIPELINE: { id: StepId; label: string; detail: string }[] = [
  {
    id: "research",
    label: "Product Discovery",
    detail: "Users, problems, goals, assumptions, constraints, competitors, metrics, and an MVP.",
  },
  {
    id: "problem",
    label: "Problem Definition",
    detail: "Who hurts, what they do today, and the cost of waiting.",
  },
  {
    id: "personas",
    label: "User Personas",
    detail: "Only the people the source supports.",
  },
  {
    id: "prd",
    label: "PRD Generator",
    detail: "Overview, flows, acceptance, edge cases, analytics, risks, and future scope.",
  },
  {
    id: "features",
    label: "Feature Decomposition",
    detail: "A feature tree, then a story, acceptance, engineering tasks, and test cases.",
  },
  {
    id: "stories",
    label: "User Stories / Tasks",
    detail: "A story, acceptance lines, and tasks for each slice.",
  },
  {
    id: "priority",
    label: "Prioritization Engine",
    detail: "Business value, user impact, alignment, revenue, urgency, effort, and risk, each with a reason.",
  },
  {
    id: "roadmap",
    label: "Roadmap Generator",
    detail: "Sprints from dependencies, team size, and the week target.",
  },
  {
    id: "handoff",
    label: "Engineering Handoff",
    detail: "One brief for the architect, one for the developer.",
  },
];
