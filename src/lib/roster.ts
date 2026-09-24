import type { StepId } from "./types";

export const PIPELINE: { id: StepId; label: string; detail: string }[] = [
  {
    id: "research",
    label: "Product Discovery",
    detail: "Users, problems, goals, assumptions, constraints, competitors, metrics, an MVP, and the approach to suggest to the client.",
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
    id: "market",
    label: "Market Agent",
    detail: "A competitor landscape from the source. Totals stay unnamed unless stated.",
  },
  {
    id: "ambiguity",
    label: "Ambiguity Detection",
    detail: "Unclear requirements, classified as critical, important, or minor.",
  },
  {
    id: "assumption",
    label: "Assumption Tracking",
    detail: "Every decision is confirmed, an assumption, inferred, unknown, or needs validation.",
  },
  {
    id: "prd",
    label: "PRD Generator",
    detail: "Overview, flows, acceptance, edge cases, analytics, risks, and future scope.",
  },
  {
    id: "conflict",
    label: "Requirements Conflict Detector",
    detail: "New requirements against existing scope and architecture.",
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
    id: "trace",
    label: "Product → Engineering Traceability",
    detail: "Goal to test downward, and API back to the customer problem.",
  },
  {
    id: "impact",
    label: "Change Impact Analysis",
    detail: "A requirement change fans out to features, APIs, data, screens, tests, and security.",
  },
  {
    id: "risk",
    label: "Product Risk Analysis",
    detail: "Product, technical, security, UX, business, compliance, and operational risk, each with a mitigation.",
  },
  {
    id: "priority",
    label: "Prioritization Engine",
    detail: "Business value, user impact, alignment, revenue, urgency, effort, and risk, each with a reason.",
  },
  {
    id: "recommend",
    label: "Evidence-Based Recommendations",
    detail: "An opportunity, the evidence, impact, cost, risks, confidence, and unknowns.",
  },
  {
    id: "score",
    label: "Opportunity Scoring",
    detail: "Customer, business, alignment, reach, confidence, effort, risk, and evidence quality, each with a reason.",
  },
  {
    id: "experiment",
    label: "Experiment Planning",
    detail: "Hypothesis, prototype, metric, success threshold, then Build / Modify / Abandon.",
  },
  {
    id: "analytics",
    label: "Product Analytics Feedback",
    detail: "Events, errors, and behavior. A decline becomes an investigated opportunity.",
  },
  {
    id: "roadmap",
    label: "Roadmap Generator",
    detail: "Sprints from dependencies, team size, and the week target.",
  },
  {
    id: "approval",
    label: "Human Approval Gates",
    detail: "Strategy, scope, priority, roadmap, and production wait on a person.",
  },
  {
    id: "decide",
    label: "Product Decision Engine",
    detail: "Options, evidence, trade-offs, and missing information. A person chooses.",
  },
  {
    id: "ledger",
    label: "Decision Ledger",
    detail: "Observations, assumptions, and decisions stay on separate layers. Decision Versioning keeps DEC-N v1 and DEC-N v2 as a family. The current version is marked. The old version stays.",
  },
  {
    id: "reevaluate",
    label: "Decision Re-evaluation",
    detail: "What Changed? is the central card: stated before and after, the affected assumption, and the proposed action. A person still reviews. A change writes a new version. The old version stays.",
  },
  {
    id: "graph",
    label: "Product Knowledge Graph",
    detail: "Customer to outcome, plus the decision lineage from feedback to evidence, assumption, decision, feature, engineering, and product outcome.",
  },
  {
    id: "portfolio",
    label: "Portfolio Intelligence",
    detail: "Products, capacity, and evidence become bets, trade-offs, and missing information. A person chooses.",
  },
  {
    id: "monitor",
    label: "Autonomous Product Monitoring",
    detail: "Metrics, feedback, and experiments. An anomaly is investigated before a decision.",
  },
  {
    id: "loop",
    label: "Autonomous Product Loop",
    detail: "Phase 3 runs product data through continuous monitoring, decision re-evaluation, a product opportunity, a new PRD, the architect, and engineering. A person still signs. Observe through propose can run. Validate, decide, and execute wait.",
  },
  {
    id: "handoff",
    label: "Engineering Handoff",
    detail: "One brief for the architect, one for the developer.",
  },
];
