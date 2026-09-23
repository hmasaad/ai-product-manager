export type Evidence = "stated" | "inferred" | "unknown";
export type Priority = "must" | "should" | "later";
export type Maturity = "problem" | "solution";
export type Lane = "product" | "client" | "backend" | "qa";
export type Decision = "now" | "next" | "later";

export type StepId =
  | "research"
  | "problem"
  | "personas"
  | "prd"
  | "features"
  | "stories"
  | "priority"
  | "roadmap"
  | "handoff";

export type ProductInput = {
  brief: string;
  existing: string;
  constraints: string;
};

export type Finding = {
  topic: string;
  finding: string;
  evidence: Evidence;
  implication: string;
};

export type ProblemDefinition = {
  statement: string;
  who: string;
  currentWorkaround: string;
  costOfInaction: string;
  success: string[];
  nonGoals: string[];
  openQuestions: string[];
};

export type Persona = {
  name: string;
  role: string;
  context: string;
  jobs: string[];
  pains: string[];
  success: string;
  evidence: Evidence;
};

export type Requirement = {
  id: string;
  priority: Priority;
  statement: string;
  rationale: string;
  persona: string;
  evidence: Evidence;
};

export type Feature = {
  id: string;
  name: string;
  outcome: string;
  requirementIds: string[];
  scope: Priority;
  rank: number;
};

export type StoryTask = {
  id: string;
  title: string;
  lane: Lane;
};

export type TestCase = {
  id: string;
  title: string;
  steps: string[];
  expected: string;
};

export type Story = {
  id: string;
  featureId: string;
  persona: string;
  story: string;
  acceptance: string[];
  tasks: StoryTask[];
  tests: TestCase[];
};

export type DecompositionNode = {
  featureId: string;
  name: string;
  scope: Priority;
  storyId: string;
  persona: string;
  story: string;
  acceptance: string[];
  tasks: StoryTask[];
  tests: TestCase[];
};

export type Decomposition = {
  root: string;
  ascii: string;
  nodes: DecompositionNode[];
};

export type PriorityFactorKey =
  | "businessValue"
  | "userImpact"
  | "strategicAlignment"
  | "revenueImpact"
  | "urgency"
  | "effort"
  | "risk";

export type PriorityFactor = {
  key: PriorityFactorKey;
  label: string;
  sign: 1 | -1;
  score: number;
  reason: string;
  evidence: Evidence;
};

export type PriorityItem = {
  featureId: string;
  factors: PriorityFactor[];
  score: number;
  decision: Decision;
  rationale: string;
};

export type Milestone = {
  id: string;
  name: string;
  goal: string;
  featureIds: string[];
  exitCriteria: string[];
};

export type RoadmapPlacement = {
  featureId: string;
  dependsOn: string[];
  reason: string;
};

export type RoadmapSprint = {
  id: string;
  name: string;
  window: string;
  featureIds: string[];
  placements: RoadmapPlacement[];
};

export type Roadmap = {
  developers: number | null;
  weeks: number | null;
  sprintWeeks: number | null;
  note: string;
  ascii: string;
  sprints: RoadmapSprint[];
  deferred: RoadmapPlacement[];
};

export type TaggedLine = {
  text: string;
  evidence: Evidence;
};

export type Competitor = {
  name: string;
  note: string;
  evidence: Evidence;
};

export type Flow = {
  name: string;
  steps: string[];
};

export type AnalyticsEvent = {
  name: string;
  when: string;
  evidence: Evidence;
};

export type Discovery = {
  problemStatement: string;
  targetUsers: { role: string; why: string; evidence: Evidence }[];
  userProblems: TaggedLine[];
  userNeeds: { need: string; user: string; evidence: Evidence }[];
  businessGoals: TaggedLine[];
  assumptions: TaggedLine[];
  constraints: TaggedLine[];
  competitors: Competitor[];
  successMetrics: TaggedLine[];
  mvpDefinition: TaggedLine[];
  questions: string[];
  flows: Flow[];
  edgeCases: TaggedLine[];
  analytics: AnalyticsEvent[];
  nonFunctional: TaggedLine[];
  futureScope: TaggedLine[];
  dependencies: TaggedLine[];
};

export type Prd = {
  overview: string;
  problemStatement: string;
  goals: string[];
  nonGoals: string[];
  personas: Discovery["targetUsers"];
  userStories: { id: string; story: string; persona: string }[];
  functionalRequirements: { id: string; statement: string; priority: Priority; persona: string }[];
  nonFunctionalRequirements: TaggedLine[];
  userFlows: Flow[];
  acceptanceCriteria: { id: string; criteria: string[] }[];
  edgeCases: TaggedLine[];
  analyticsEvents: AnalyticsEvent[];
  dependencies: TaggedLine[];
  risks: string[];
  openQuestions: string[];
  mvpScope: string[];
  futureScope: string[];
};

export type ModelUsage = {
  model: string;
  inputTokens: number;
  outputTokens: number;
  thoughtTokens: number;
};

export type Judgment = {
  title: string;
  maturity: Maturity;
  research: Finding[];
  problem: ProblemDefinition;
  personas: Persona[];
  requirements: Requirement[];
  constraints: string[];
  assumptions: string[];
  risks: string[];
};

export type ProductPlan = {
  id: string;
  createdAt: string;
  title: string;
  mode: "grounded" | "model";
  note: string;
  proposed: boolean;
  maturity: Maturity;
  input: ProductInput;
  sourceText: string;
  research: Finding[];
  problem: ProblemDefinition;
  personas: Persona[];
  requirements: Requirement[];
  constraints: string[];
  assumptions: string[];
  risks: string[];
  features: Feature[];
  stories: Story[];
  priorities: PriorityItem[];
  milestones: Milestone[];
  roadmap: Roadmap;
  decomposition: Decomposition;
  discovery: Discovery;
  prd: Prd;
  handoff: {
    architect: string;
    developer: string;
  };
  usage?: ModelUsage;
};

export type AgentStepEvent = {
  id: StepId;
  label: string;
  detail: string;
};
