export type Evidence = "stated" | "inferred" | "unknown";
export type Priority = "must" | "should" | "later";
export type Maturity = "problem" | "solution";
export type Lane = "product" | "client" | "backend" | "qa";
export type Decision = "now" | "next" | "later";

export type StepId =
  | "research"
  | "problem"
  | "personas"
  | "market"
  | "ambiguity"
  | "assumption"
  | "prd"
  | "conflict"
  | "features"
  | "stories"
  | "trace"
  | "impact"
  | "risk"
  | "priority"
  | "recommend"
  | "experiment"
  | "analytics"
  | "roadmap"
  | "approval"
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

export type MemoryKind =
  | "feature"
  | "decision"
  | "goal"
  | "persona"
  | "constraint"
  | "prd"
  | "limitation"
  | "experiment"
  | "roadmap"
  | "feedback"
  | "metric";

export type MemoryItem = {
  id: string;
  kind: MemoryKind;
  text: string;
  evidence: Evidence;
  source: string;
  at: string;
};

export type ProductMemory = {
  product: string;
  updatedAt: string;
  items: MemoryItem[];
};

export type ContextHit = {
  request: string;
  memoryId: string;
  kind: MemoryKind;
  text: string;
};

export type ImpactLevel = "high" | "medium" | "low";

export type RecommendationFact = {
  text: string;
  evidence: Evidence;
};

export type DecisionStatus = "confirmed" | "assumption" | "inferred" | "unknown" | "needsValidation";

export type TrackedDecision = {
  id: string;
  decision: string;
  status: DecisionStatus;
  validation?: string;
};

export type AmbiguitySeverity = "critical" | "important" | "minor";

export type Ambiguity = {
  id: string;
  question: string;
  severity: AmbiguitySeverity;
  action: "must clarify" | "recommendation" | "reasonable assumption";
  assumption?: string;
};

export type RequirementConflict = {
  id: string;
  newRequirement: string;
  existingRequirement: string;
  against: "requirement" | "architecture";
  impact: ImpactLevel;
  resolution: string;
  rule: string;
};

export type Recommendation = {
  id: string;
  opportunity: string;
  featureId?: string;
  evidence: RecommendationFact[];
  userImpact: { level: ImpactLevel; reason: string };
  businessImpact: { level: ImpactLevel; reason: string };
  technicalCost: { level: ImpactLevel; reason: string };
  risks: string[];
  confidence: number;
  unknowns: string[];
};

export type TraceKind =
  | "goal"
  | "objective"
  | "feature"
  | "story"
  | "acceptance"
  | "technical"
  | "task"
  | "test"
  | "problem";

export type TraceStep = {
  kind: TraceKind;
  label: string;
  ref?: string;
};

export type TraceChain = {
  featureId: string;
  feature: string;
  down: TraceStep[];
  why: TraceStep[];
  asciiDown: string;
  asciiWhy: string;
};

export type Traceability = {
  note: string;
  ascii: string;
  chains: TraceChain[];
};

export type RiskKind =
  | "product"
  | "technical"
  | "security"
  | "ux"
  | "business"
  | "compliance"
  | "operational";

export type FeatureRisk = {
  kind: RiskKind;
  risk: string;
  cause: string;
  mitigation: string;
  residual: string;
};

export type FeatureRiskRegister = {
  featureId: string;
  feature: string;
  risks: FeatureRisk[];
};

export type RiskAnalysis = {
  note: string;
  registers: FeatureRiskRegister[];
};

export type ExperimentVerdict = "pending" | "build" | "modify" | "abandon";

export type ProductExperiment = {
  id: string;
  idea: string;
  hypothesis: string;
  experiment: string;
  metric: string;
  successCriteria: string;
  decision: ExperimentVerdict;
  featureId?: string;
  evidence: Evidence;
};

export type AnalyticsKind = "event" | "error" | "behavior";

export type AnalyticsSignal = {
  id: string;
  kind: AnalyticsKind;
  name: string;
  detail: string;
  prior?: number;
  current?: number;
  change?: string;
  declining: boolean;
  evidence: Evidence;
};

export type AnalyticsStageId =
  | "launched"
  | "declining"
  | "investigates"
  | "problem"
  | "opportunity"
  | "improvement";

export type AnalyticsStage = {
  id: AnalyticsStageId;
  label: string;
  text: string;
  evidence: Evidence;
};

export type AnalyticsLoop = {
  feature: string;
  featureId?: string;
  ascii: string;
  stages: AnalyticsStage[];
};

export type AnalyticsFeedback = {
  note: string;
  ascii: string;
  loopAscii: string;
  signals: AnalyticsSignal[];
  loops: AnalyticsLoop[];
};

export type ApprovalKind = "strategy" | "scope" | "priority" | "roadmap" | "production";
export type ApprovalStatus = "pending" | "approved" | "rejected";
export type AuthorizationLevel = "automatic" | "review" | "mandatory";

export type ApprovalGate = {
  id: string;
  kind: ApprovalKind;
  proposal: string;
  evidence: string[];
  risk: string;
  status: ApprovalStatus;
  authorization: AuthorizationLevel;
  commit: string;
  evidenceTag: Evidence;
};

export type ApprovalBoard = {
  note: string;
  ascii: string;
  gates: ApprovalGate[];
};

export type SpecialistId =
  | "research"
  | "requirements"
  | "analytics"
  | "market"
  | "risk"
  | "experiment"
  | "decision";

export type SpecialistReport = {
  id: SpecialistId;
  name: string;
  role: string;
  findings: string[];
  output: string;
};

export type Orchestration = {
  note: string;
  ascii: string;
  agents: SpecialistReport[];
  decision: string;
};

export type ChangeImpact = {
  change: string;
  severity: ImpactLevel;
  features: string[];
  apis: string[];
  database: string[];
  screens: string[];
  permissions: string[];
  tests: string[];
  documentation: string[];
  security: string[];
  ascii: string;
};

export type ProductContext = {
  product: string;
  recalled: number;
  alreadyExists: ContextHit[];
  conflicts: ContextHit[];
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
  context: ProductContext;
  ambiguities: Ambiguity[];
  decisions: TrackedDecision[];
  conflicts: RequirementConflict[];
  recommendations: Recommendation[];
  impacts: ChangeImpact[];
  riskAnalysis: RiskAnalysis;
  experiments: ProductExperiment[];
  analytics: AnalyticsFeedback;
  approvals: ApprovalBoard;
  orchestration: Orchestration;
  traceability: Traceability;
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
