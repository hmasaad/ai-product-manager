import { FIELD_COPY, FIELD_LEAVES } from "./field-management";
import { PROPOSED_FEATURES } from "./roadmap";
import type {
  AnalyticsEvent,
  Competitor,
  Discovery,
  Evidence,
  Flow,
  Judgment,
  Persona,
  ProductInput,
  TaggedLine,
} from "./types";

type Domain = {
  title: string;
  test: RegExp;
  problem: string;
  workaround: string;
  cost: string;
  users: { role: string; why: string; jobs: string[] }[];
  problems: string[];
  needs: { user: string; need: string }[];
  goals: string[];
  assumptions: string[];
  constraints: string[];
  competitors: { name: string; note: string }[];
  metrics: string[];
  mvp: { statement: string; persona: string }[];
  future: string[];
  questions: string[];
  flows: Flow[];
  edgeCases: string[];
  analytics: { name: string; when: string }[];
  nonFunctional: string[];
  dependencies: string[];
  risks: string[];
};

const FIELD_LOG: Domain = {
  title: "Field activity log",
  test: /\bfarmers?\b|\bfield activities\b/i,
  problem:
    "A farm cannot reliably say what work happened on a field. The record lives in a notebook, a spreadsheet, a chat, or the memory of whoever was there.",
  workaround: "Notebook, spreadsheet, or a group chat.",
  cost: "Season decisions get made without a field history anyone else can check.",
  users: [
    {
      role: "Farm operator",
      why: "Owns the season and needs to know what happened on each field.",
      jobs: ["Name the fields on a farm", "Read one field's activities"],
    },
    {
      role: "Field crew",
      why: "Does the work, and is the person who still knows what just happened.",
      jobs: ["Log a field activity before leaving the field"],
    },
  ],
  problems: [
    "Field work cannot be found later by field.",
    "The operator has to ask the person who was there to reconstruct planting, spraying, irrigation, or harvest.",
  ],
  needs: [
    { user: "Field crew", need: "Log an activity against a field in under a minute." },
    { user: "Farm operator", need: "Open one field and read the season's activities in order." },
  ],
  goals: [
    "Replace the notebook with a field history the operator trusts.",
    "Shrink the gap between the work and a record someone else can use.",
  ],
  assumptions: [
    "A field is the unit of record.",
    "The crew can log the work, or the operator will log it for them.",
    "The first buyer is the farm, not a marketplace of advisors.",
  ],
  constraints: [
    "No device, language, or connectivity limit was stated. Ask before requiring offline or a specific phone.",
  ],
  competitors: [
    {
      name: "Notebook, spreadsheet, and chat",
      note: "The incumbent. The record lives wherever the crew already writes.",
    },
    {
      name: "Climate FieldView, Granular, FarmLogs, AgriWebb",
      note: "Existing farm-record products. Ask which of these the buyer already pays for before copying their surface.",
    },
  ],
  metrics: [
    "Share of field activities logged the same day they happen.",
    "Time for an operator to answer what happened on one field this season.",
    "Fields with at least one activity recorded in an active week.",
  ],
  mvp: [
    { statement: "Name the fields on a farm", persona: "Farm operator" },
    {
      statement: "Log a field activity with a type, a date, who did it, and a note",
      persona: "Field crew",
    },
    { statement: "Read one field's activities from newest to oldest", persona: "Farm operator" },
  ],
  future: [
    "Input cost, chemical compliance packets, satellite imagery, equipment telemetry, and sharing a field with an advisor.",
  ],
  questions: [
    "Who logs the work: the crew in the field, or the operator at the end of the day?",
    "Which activity types matter in the first season: planting, spray, irrigation, harvest, or all of them?",
    "Does a save have to succeed with no signal, or is end-of-day entry enough?",
    "Which farm-record product, if any, does the buyer already pay for?",
  ],
  flows: [
    {
      name: "Log an activity",
      steps: [
        "Open the farm",
        "Pick the field",
        "Choose the activity type and the date",
        "Add who did it and a note",
        "Save",
        "See the activity on that field's history",
      ],
    },
    {
      name: "Read a field",
      steps: ["Open the farm", "Pick the field", "Read activities from newest to oldest"],
    },
  ],
  edgeCases: [
    "Two people log the same activity on the same field.",
    "A field is renamed after activities exist.",
    "The activity date is not today.",
    "The crew finishes a row with no signal. The brief does not say the save must wait.",
  ],
  analytics: [
    { name: "activity_logged", when: "A crew member saves an activity." },
    { name: "field_history_opened", when: "An operator opens a field." },
    { name: "activity_abandoned", when: "A log is started and not saved." },
  ],
  nonFunctional: [
    "Logging an activity is usable on a phone, outdoors, with one hand.",
    "A field's history stays in order when two people log on the same day.",
  ],
  dependencies: ["A list of the farm's fields. No external system was named."],
  risks: [
    "A log nobody fills in is an empty history. The MVP has to be faster than the notebook.",
    "Copying a suite the buyer does not use will add scope the request never asked for.",
  ],
};

const FIELD_MANAGEMENT: Domain = {
  title: "Field Management",
  test: /\bfield management\b/i,
  problem: FIELD_COPY.problem,
  workaround: FIELD_COPY.workaround,
  cost: FIELD_COPY.cost,
  users: FIELD_COPY.users,
  problems: [
    "The farm cannot list, correct, or retire a field.",
    "Work done on a field is not attached to that field.",
  ],
  needs: [
    { user: "Farm operator", need: "Create a field and open its details and history." },
    { user: "Field crew", need: "Log an activity on the field where the work happened." },
  ],
  goals: FIELD_COPY.goals,
  assumptions: FIELD_COPY.assumptions,
  constraints: FIELD_COPY.constraints,
  competitors: FIELD_COPY.competitors,
  metrics: FIELD_COPY.metrics,
  mvp: FIELD_LEAVES.filter((leaf) => leaf.priority === "must").map((leaf) => ({
    statement: leaf.statement,
    persona: leaf.persona,
  })),
  future: FIELD_LEAVES.filter((leaf) => leaf.priority !== "must").map((leaf) => leaf.statement),
  questions: FIELD_COPY.questions,
  flows: FIELD_COPY.flows,
  edgeCases: FIELD_COPY.edgeCases,
  analytics: FIELD_COPY.analytics,
  nonFunctional: FIELD_COPY.nonFunctional,
  dependencies: FIELD_COPY.dependencies,
  risks: FIELD_COPY.risks,
};

const CAPACITY_PLAN: Domain = {
  title: "Eight-week delivery plan",
  test: /\b20\s+proposed features\b/i,
  problem:
    "Twenty features are proposed for a field product, and the delivery window is fixed before the dependency order is.",
  workaround: "A list of features with no predecessor and no developer-week budget.",
  cost: "The team starts work that is blocked, or spends the 8 weeks on features that could have waited.",
  users: [
    {
      role: "Operator",
      why: "Uses the field product the sprints are building.",
      jobs: ["Sign in", "Create a field", "Log an activity"],
    },
  ],
  problems: ["Feature order ignores what has to exist first.", "The team size and the week target are easy to leave out of the plan."],
  needs: [{ user: "Operator", need: "A field record that can be created before activities are logged." }],
  goals: ["Ship a dependency-ordered slice inside 8 weeks with 3 developers."],
  assumptions: [
    "The 20 features are a proposed set. The request named the count and the capacity.",
    "Each feature is estimated at 2 developer-weeks.",
    "A sprint is 2 weeks, so 8 weeks is 4 sprints.",
    "A feature may sit in the same sprint as its dependency when that dependency is placed earlier in the sprint.",
  ],
  constraints: ["3 developers.", "8-week target."],
  competitors: [
    {
      name: "An unordered backlog",
      note: "The incumbent plan. Features are listed without predecessors or a developer-week budget.",
    },
  ],
  metrics: ["Features finished inside the 8 weeks whose dependencies were already done."],
  mvp: PROPOSED_FEATURES.map((feature) => ({ statement: feature.name, persona: "Operator" })),
  future: [],
  questions: [
    "Which of the 20 features already exist?",
    "Is 2 weeks the sprint length the team already uses?",
    "Can two developers share one feature inside a sprint?",
  ],
  flows: [
    {
      name: "Sign in and open a field",
      steps: ["Authentication", "User Profile", "Core Data Model", "Field Creation", "Field Details"],
    },
  ],
  edgeCases: ["A sprint fills before a newly unblocked feature fits."],
  analytics: [{ name: "sprint_committed", when: "A feature is placed on a sprint." }],
  nonFunctional: ["The schedule stays inside 3 developers and 8 weeks."],
  dependencies: PROPOSED_FEATURES.filter((feature) => feature.dependsOn.length > 0)
    .slice(0, 6)
    .map((feature) => `${feature.name} depends on ${feature.dependsOn.join(" and ")}.`),
  risks: [
    "Sprint 3 sequences Activities, then History, then Reporting inside one sprint.",
    "Eight proposed features sit past week 8.",
  ],
};

const DOMAINS = [CAPACITY_PLAN, FIELD_MANAGEMENT, FIELD_LOG];

function buildIntent(text: string) {
  const match =
    /(?:build|create|make)\s+(?:an?\s+)?(?:app|product|platform|tool)\s+for\s+([a-z][^.\n]{1,40}?)(?:\s+to\s+([a-z][^.\n]{2,80}))?/i.exec(
      text.replace(/\s+/g, " ").trim(),
    );
  if (!match) return null;
  return {
    users: match[1].trim(),
    job: match[2]?.trim() || "do the job named in the request",
  };
}

function line(text: string, evidence: Evidence): TaggedLine {
  return { text, evidence };
}

function persona(role: string, why: string, jobs: string[], problem: string, success: string): Persona {
  return {
    name: role,
    role,
    context: why,
    jobs,
    pains: [problem],
    success,
    evidence: "inferred",
  };
}

export function enrichSketch(input: ProductInput, judgment: Judgment): {
  judgment: Judgment;
  proposed: boolean;
  domain: Domain | null;
} {
  if (judgment.maturity !== "problem") return { judgment, proposed: false, domain: null };
  const source = `${input.brief}\n${input.existing}`.trim();
  const intent = buildIntent(source);
  const domain = DOMAINS.find((item) => item.test.test(source)) ?? null;
  if (!intent && !domain) return { judgment, proposed: false, domain: null };

  const pack = domain;
  const users = intent?.users ?? "the people named in the request";
  const job = intent?.job ?? "the job named in the request";
  const problem = pack?.problem ?? `${users} need a way to ${job}. The request names the product and not the workaround.`;
  const metrics = pack?.metrics ?? [
    `Share of "${job}" records created the same day.`,
    `Time to find that record again.`,
  ];
  const mvp = pack?.mvp ?? [
    { statement: `${users} can ${job}`, persona: users },
    { statement: "The record of that job can be found again later", persona: users },
  ];
  const people = pack?.users ?? [
    { role: users, why: `Named in the request as the person the app is for.`, jobs: [job] },
  ];

  const requirements = [
    ...mvp.map((item, index) => ({
      id: `R${index + 1}`,
      priority: "must" as const,
      statement: item.statement,
      rationale: "Inferred from the request. Not confirmed with a buyer.",
      persona: item.persona,
      evidence: "inferred" as const,
    })),
    ...(pack?.future ?? ["Anything beyond the job named in the request."]).map((item, index) => ({
      id: `R${mvp.length + index + 1}`,
      priority: "later" as const,
      statement: item,
      rationale: "Held out of the proposed MVP.",
      persona: people[0]?.role ?? users,
      evidence: "inferred" as const,
    })),
  ];

  return {
    proposed: true,
    domain: pack,
    judgment: {
      ...judgment,
      title: pack?.title ?? `App for ${users}`,
      maturity: "solution",
      problem: {
        statement: problem,
        who: people.map((item) => item.role).join(", "),
        currentWorkaround: pack?.workaround ?? "Not stated. Ask what they do today.",
        costOfInaction: pack?.cost ?? "The request does not say what it costs to keep the current workaround.",
        success: metrics,
        nonGoals: pack?.future ?? ["Scope beyond the job named in the request."],
        openQuestions: pack?.questions ?? [
          `Who besides ${users} has to use this?`,
          "What do they use today?",
          "What number should move in the first month?",
        ],
      },
      personas: people.map((item) => persona(item.role, item.why, item.jobs, problem, metrics[0] ?? "")),
      requirements,
      constraints: pack?.constraints ?? ["No constraint was stated with the request."],
      assumptions: [
        "This MVP is inferred from a short build request. It is a proposal, not a signed scope.",
        ...(pack?.assumptions ?? [`The job to support first is: ${job}.`]),
      ],
      risks: pack?.risks ?? ["The request names a product and not a buyer, a price, or a measure of done."],
      research: [
        {
          topic: "The request",
          finding: source.replace(/\s+/g, " ").trim(),
          evidence: "stated",
          implication: "The MVP below is a proposal read from that sentence.",
        },
        ...judgment.research.filter((item) => item.evidence === "unknown").slice(0, 3),
      ],
    },
  };
}

function dependenciesFor(source: string, domain: Domain | null): TaggedLine[] {
  if (domain) return domain.dependencies.map((text) => line(text, "inferred"));
  const found: TaggedLine[] = [];
  if (/cityworks/i.test(source)) found.push(line("CityWorks remains the system of record.", "stated"));
  if (/\bokta\b/i.test(source)) found.push(line("Okta is the identity source of truth.", "stated"));
  if (!found.length) found.push(line("No external system was named.", "unknown"));
  return found;
}

function competitorsFor(source: string, domain: Domain | null): Competitor[] {
  if (domain) {
    return domain.competitors.map((item) => ({ ...item, evidence: "inferred" as const }));
  }
  const named = ["CityWorks"].filter((name) => source.includes(name));
  if (named.length) {
    return named.map((name) => ({
      name,
      note: "Named in the source. Treat it as a system the product has to live with, and ask what else people use.",
      evidence: "stated" as const,
    }));
  }
  return [
    {
      name: "Not named",
      note: "The source does not name a competing product. Ask what people use today.",
      evidence: "unknown",
    },
  ];
}

export function buildDiscovery(input: {
  judgment: Judgment;
  proposed: boolean;
  domain: Domain | null;
  source: string;
}): Discovery {
  const { judgment, domain, source } = input;
  const users = judgment.personas.map((persona) => ({
    role: persona.role,
    why: persona.context,
    evidence: persona.evidence,
  }));
  const needs = domain
    ? domain.needs.map((item) => ({ ...item, evidence: "inferred" as const }))
    : judgment.personas.flatMap((persona) =>
        persona.jobs.map((need) => ({ need, user: persona.role, evidence: persona.evidence })),
      );
  const problems = domain
    ? domain.problems.map((text) => line(text, "inferred"))
    : [line(judgment.problem.statement, judgment.problem.statement ? "stated" : "unknown")];
  const goals = domain
    ? domain.goals.map((text) => line(text, "inferred"))
    : judgment.problem.success.map((text) => line(text, "stated"));
  const metrics = judgment.problem.success.length
    ? judgment.problem.success.map((text) => line(text, input.proposed ? "inferred" : "stated"))
    : [line("No success measure was stated. Ask which number should move.", "unknown")];
  const mvp = judgment.requirements
    .filter((item) => item.priority === "must")
    .map((item) => line(item.statement, item.evidence));
  const constraints = judgment.constraints.length
    ? judgment.constraints.map((text) => line(text, input.proposed ? "unknown" : "stated"))
    : [line("No constraint was stated.", "unknown")];

  return {
    problemStatement: judgment.problem.statement,
    targetUsers: users,
    userProblems: problems,
    userNeeds: needs,
    businessGoals: goals.length ? goals : [line("No business goal was stated.", "unknown")],
    assumptions: judgment.assumptions.map((text) => line(text, "inferred")),
    constraints,
    competitors: competitorsFor(source, domain),
    successMetrics: metrics,
    mvpDefinition: mvp.length ? mvp : [line("No MVP was stated. Validate the problem before naming scope.", "unknown")],
    questions: judgment.problem.openQuestions,
    flows: domain?.flows ?? [],
    edgeCases: (domain?.edgeCases ?? judgment.problem.openQuestions).map((text) =>
      line(text, domain ? "inferred" : "unknown"),
    ),
    analytics: (domain?.analytics ?? []).map(
      (item): AnalyticsEvent => ({ ...item, evidence: "inferred" }),
    ),
    nonFunctional: (domain?.nonFunctional ?? []).map((text) => line(text, "inferred")),
    futureScope: (domain?.future ?? judgment.requirements.filter((item) => item.priority === "later").map((item) => item.statement)).map(
      (text) => line(text, input.proposed || domain ? "inferred" : "stated"),
    ),
    dependencies: dependenciesFor(source, domain),
  };
}
