import { planFromInput } from "./planner";
import { BILLING_BRIEF, BILLING_EXISTING, CLINIC_BRIEF, FARMER_BRIEF, FIELD_MANAGEMENT_BRIEF, HARBOR_BRIEF, ROADMAP_BRIEF } from "./samples";

let failures = 0;

function assert(condition: boolean, message: string) {
  if (!condition) {
    failures += 1;
    console.error(`FAIL ${message}`);
  }
}

const harbor = planFromInput({ brief: HARBOR_BRIEF, existing: "", constraints: "" });
const clinic = planFromInput({ brief: CLINIC_BRIEF, existing: "", constraints: "" });
const billing = planFromInput({ brief: BILLING_BRIEF, existing: BILLING_EXISTING, constraints: "" });

assert(harbor.maturity === "solution", "HarborLine is a solution brief");
assert(harbor.personas.length >= 3, "HarborLine names three personas");
assert(
  harbor.features.some((feature) => /offline/i.test(feature.name)),
  "HarborLine has an offline feature",
);
assert(harbor.features.some((feature) => /sync/i.test(feature.name)), "HarborLine has sync");
assert(harbor.features.some((feature) => /review/i.test(feature.name)), "HarborLine has review");
assert(/okta/i.test(harbor.handoff.architect), "Architect brief keeps Okta");
assert(/open questions/i.test(harbor.handoff.architect), "Architect brief lists open questions");
assert(
  harbor.problem.openQuestions.some((question) => /conflict|version/i.test(question)),
  "Offline work asks about conflicts",
);
assert(harbor.stories.length === harbor.features.length, "Every HarborLine feature has a story");
assert(
  harbor.features.every((feature) =>
    harbor.milestones.some((milestone) => milestone.featureIds.includes(feature.id)),
  ),
  "Every HarborLine feature is on the roadmap",
);
assert(
  harbor.requirements.filter((item) => item.priority === "must").length >= 8,
  "HarborLine keeps the must-have list",
);
assert(
  harbor.requirements.find((item) => /pdf/i.test(item.statement))?.persona === "Clerk",
  "The PDF report belongs to the clerk",
);
assert(
  harbor.requirements.find((item) => /^sync/i.test(item.statement))?.persona === "Field inspector",
  "Sync belongs to the field inspector",
);
assert(
  harbor.requirements.find((item) => /cityworks/i.test(item.statement))?.persona === "Field inspector",
  "CityWorks status belongs to the field inspector",
);
assert(!/competitor|market size|\bTAM\b/i.test(JSON.stringify(harbor.research)), "No invented market");

assert(clinic.maturity === "problem", "Clinic one-liner stays a problem");
assert(clinic.research.some((item) => item.evidence === "unknown"), "Clinic research records unknowns");
assert(/not a build/i.test(clinic.handoff.developer), "Clinic developer brief is gated");
assert(!/react|kubernetes|microservice/i.test(clinic.handoff.architect), "Clinic brief invents no stack");
assert(
  clinic.priorities.some((item) => item.decision === "later"),
  "Clinic solution bet is gated",
);

assert(
  billing.research.some((item) => /9%/.test(item.finding) && /12,400/.test(item.finding)),
  "Billing research keeps the funnel counts",
);
assert(
  billing.requirements.some((item) => /amount due/i.test(item.statement)),
  "Billing requires a visible amount due",
);
assert(
  billing.requirements.some((item) => /failed card|why it failed/i.test(item.statement)),
  "Billing requires a card-failure explanation",
);
assert(/redesign/i.test(billing.handoff.architect), "Billing non-goal keeps the no-redesign line");
assert(billing.maturity === "solution", "Billing complaints are enough to plan a fix");

const farmer = planFromInput({ brief: FARMER_BRIEF, existing: "", constraints: "" });
assert(farmer.proposed, "The farmer request is a proposed MVP");
assert(/field activity log/i.test(farmer.title), "Farmer plan has a product title");
assert(
  farmer.discovery.targetUsers.some((user) => /farm operator/i.test(user.role)),
  "Discovery names the farm operator",
);
assert(
  farmer.discovery.targetUsers.some((user) => /field crew/i.test(user.role)),
  "Discovery names the field crew",
);
assert(farmer.discovery.userNeeds.length >= 2, "Discovery lists user needs");
assert(farmer.discovery.businessGoals.length >= 1, "Discovery lists business goals");
assert(farmer.discovery.assumptions.length >= 1, "Discovery lists assumptions");
assert(farmer.discovery.constraints.length >= 1, "Discovery lists constraints");
assert(
  farmer.discovery.competitors.some((item) => /notebook/i.test(item.name)),
  "Discovery names the notebook as the incumbent",
);
assert(
  farmer.discovery.competitors.some((item) => /FieldView|Granular/i.test(item.name)),
  "Discovery names farm-record products to check",
);
assert(farmer.discovery.successMetrics.length >= 2, "Discovery proposes success metrics");
assert(farmer.discovery.mvpDefinition.length >= 3, "Discovery defines an MVP");
assert(farmer.discovery.questions.length >= 3, "Discovery still asks open questions");
assert(farmer.prd.functionalRequirements.length >= 3, "PRD has functional requirements");
assert(farmer.prd.nonFunctionalRequirements.length >= 1, "PRD has non-functional requirements");
assert(farmer.prd.userFlows.some((flow) => /log an activity/i.test(flow.name)), "PRD has the log flow");
assert(farmer.prd.acceptanceCriteria.every((item) => item.criteria.length > 0), "PRD stories have acceptance");
assert(farmer.prd.edgeCases.length >= 3, "PRD lists edge cases");
assert(farmer.prd.analyticsEvents.some((item) => item.name === "activity_logged"), "PRD names analytics events");
assert(farmer.prd.risks.length >= 1, "PRD lists risks");
assert(farmer.prd.openQuestions.length >= 1, "PRD keeps open questions");
assert(/satellite|advisor/i.test(farmer.prd.futureScope.join(" ")), "PRD holds future scope out of the MVP");
assert(!/TAM|market size/i.test(JSON.stringify(farmer.discovery)), "Discovery invents no market size");
assert(!/FieldView|Granular|FarmLogs/i.test(JSON.stringify(harbor.discovery)), "HarborLine does not inherit farm competitors");
assert(harbor.prd.mvpScope.length >= 8, "HarborLine PRD keeps the must-have MVP");
assert(clinic.proposed === false, "Clinic stays a problem, not a proposed app");

const fields = planFromInput({ brief: FIELD_MANAGEMENT_BRIEF, existing: "", constraints: "" });
const fieldNames = [
  "Create Field",
  "Edit Field",
  "Delete Field",
  "Field Details",
  "Field History",
  "Field Activities",
  "Field Reports",
  "Field Analytics",
];
assert(fields.decomposition.root === "Field Management", "Decomposition root is Field Management");
assert(
  fields.decomposition.nodes.map((node) => node.name).join("|") === fieldNames.join("|"),
  "Field management decomposes into the eight branches",
);
assert(fields.decomposition.ascii.includes("└── Field Analytics"), "The tree ends at Field Analytics");
for (const node of fields.decomposition.nodes) {
  assert(node.story.length > 0, `${node.name} has a user story`);
  assert(node.acceptance.length >= 2, `${node.name} has acceptance criteria`);
  assert(node.tasks.length >= 2, `${node.name} has engineering tasks`);
  assert(node.tests.length >= 2, `${node.name} has test cases`);
  assert(node.tests.every((test) => test.steps.length > 0 && test.expected.length > 0), `${node.name} tests name an expected result`);
}
const deleteField = fields.decomposition.nodes.find((node) => node.name === "Delete Field");
assert(Boolean(deleteField?.acceptance.some((line) => /confirm/i.test(line))), "Delete field requires confirmation");
assert(fields.features.map((feature) => feature.name).join("|") === fieldNames.join("|"), "Eight field features exist");
assert(!/Field Analytics/.test(farmer.decomposition.ascii), "The activity-log request does not become the full field-management tree");
assert(harbor.decomposition.nodes.length === harbor.features.length, "HarborLine decomposes every feature");
assert(harbor.decomposition.nodes.every((node) => node.tests.length > 0), "HarborLine nodes have test cases");

const factorKeys = [
  "businessValue",
  "userImpact",
  "strategicAlignment",
  "revenueImpact",
  "urgency",
  "effort",
  "risk",
];
for (const [label, scored] of [
  ["HarborLine", harbor],
  ["Clinic", clinic],
  ["Billing", billing],
  ["Farmer", farmer],
  ["Field management", fields],
] as const) {
  const scores = scored.priorities.map((item) => item.score);
  assert(
    scores.every((score, index) => index === 0 || scores[index - 1]! >= score),
    `${label} ranks by the priority score`,
  );
  for (const item of scored.priorities) {
    assert(item.factors.map((factor) => factor.key).join("|") === factorKeys.join("|"), `${label} ${item.featureId} has seven factors`);
    const total = item.factors.reduce((sum, factor) => sum + factor.sign * factor.score, 0);
    assert(item.score === total, `${label} ${item.featureId} score equals its factors`);
    assert(item.rationale.startsWith(`${item.score} =`), `${label} ${item.featureId} shows the equation`);
    assert(
      item.factors.every((factor) => factor.score >= 1 && factor.score <= 5 && factor.reason.length > 10),
      `${label} ${item.featureId} explains every factor`,
    );
  }
}

function scoredFeature(plan: typeof fields, name: string) {
  const feature = plan.features.find((item) => item.name === name);
  return plan.priorities.find((item) => item.featureId === feature?.id);
}

const createField = scoredFeature(fields, "Create Field");
const fieldAnalytics = scoredFeature(fields, "Field Analytics");
assert(Boolean(createField && fieldAnalytics && createField.score > fieldAnalytics.score), "Create Field outranks Field Analytics");
const fieldRevenue = fieldAnalytics?.factors.find((factor) => factor.key === "revenueImpact");
assert(fieldRevenue?.evidence === "unknown" && fieldRevenue.score === 1, "Field analytics does not invent revenue");
const fieldMust = fields.features
  .filter((feature) => feature.scope === "must")
  .map((feature) => fields.priorities.find((item) => item.featureId === feature.id)?.score ?? 0);
const fieldLater = fields.features
  .filter((feature) => feature.scope === "later")
  .map((feature) => fields.priorities.find((item) => item.featureId === feature.id)?.score ?? 0);
assert(Math.min(...fieldMust) > Math.max(...fieldLater), "Field must-haves outrank reports and analytics");
assert(
  billing.priorities.some((item) => (item.factors.find((factor) => factor.key === "revenueImpact")?.score ?? 0) >= 4),
  "Billing scores the payment slice on revenue",
);
const validate = scoredFeature(clinic, "Validate the problem");
const solutionBet = scoredFeature(clinic, "Commit a solution bet");
assert(Boolean(validate && solutionBet && validate.score > solutionBet.score), "Clinic validation outranks a solution bet");
assert(
  harbor.priorities.some((item) => item.factors.find((factor) => factor.key === "revenueImpact")?.evidence === "unknown"),
  "HarborLine does not invent revenue",
);

const delivery = planFromInput({ brief: ROADMAP_BRIEF, existing: "", constraints: "" });
const sprintTree = `Sprint 1
 ├── Authentication
 ├── User Profile
 └── Core Data Model

Sprint 2
 ├── Field Creation
 ├── Field Editing
 └── Field Details

Sprint 3
 ├── Activities
 ├── History
 └── Reporting`;
assert(delivery.roadmap.ascii.startsWith(sprintTree), "The first three sprints follow the dependency tree");
assert(delivery.features.length === 20, "The request proposes 20 features");
assert(delivery.roadmap.developers === 3 && delivery.roadmap.weeks === 8, "Capacity is 3 developers and 8 weeks");
assert(delivery.roadmap.sprints.length === 4, "Eight weeks is four 2-week sprints");
assert(delivery.roadmap.sprints.every((sprint) => sprint.featureIds.length === 3), "Each sprint holds three features");
assert(delivery.roadmap.deferred.length === 8, "Eight features wait past week 8");
assert(
  delivery.features.every((feature) => delivery.milestones.some((milestone) => milestone.featureIds.includes(feature.id))),
  "Every proposed feature is on the roadmap",
);

function placedAt(name: string) {
  for (const [sprintIndex, sprint] of delivery.roadmap.sprints.entries()) {
    const index = sprint.placements.findIndex(
      (item) => delivery.features.find((feature) => feature.id === item.featureId)?.name === name,
    );
    if (index >= 0) return { sprintIndex, index };
  }
  return null;
}

for (const sprint of delivery.roadmap.sprints) {
  sprint.placements.forEach((item, index) => {
    const name = delivery.features.find((feature) => feature.id === item.featureId)?.name ?? item.featureId;
    for (const dependency of item.dependsOn) {
      const dependencyAt = placedAt(dependency);
      const here = placedAt(name);
      assert(
        Boolean(
          dependencyAt &&
            here &&
            (dependencyAt.sprintIndex < here.sprintIndex ||
              (dependencyAt.sprintIndex === here.sprintIndex && dependencyAt.index < index)),
        ),
        `${name} is placed after ${dependency}`,
      );
    }
  });
}
assert(placedAt("Field Creation")?.sprintIndex === 1, "Field Creation is in sprint 2");
assert(placedAt("Reporting")?.sprintIndex === 2, "Reporting is in sprint 3");
assert(
  Boolean(delivery.roadmap.sprints[2]?.placements.some((item) => /History/i.test(item.reason))),
  "Reporting records its dependency on History",
);
assert(!harbor.roadmap.ascii.includes("Authentication"), "HarborLine keeps its own release buckets");
assert(harbor.roadmap.developers === 4 && harbor.roadmap.weeks === null, "HarborLine names engineers and no week target");

const featureIds = new Set(harbor.features.map((feature) => feature.id));
for (const story of harbor.stories) {
  assert(featureIds.has(story.featureId), `${story.id} points at a feature`);
  assert(story.acceptance.length > 0, `${story.id} has acceptance`);
  assert(story.tasks.length > 0, `${story.id} has tasks`);
}

if (failures) {
  console.error(`\n${failures} failed`);
  console.error(
    JSON.stringify(
      {
        harbor: {
          title: harbor.title,
          features: harbor.features.map((feature) => feature.name),
          milestones: harbor.milestones.map((item) => ({
            name: item.name,
            features: item.featureIds,
          })),
          questions: harbor.problem.openQuestions,
        },
        clinic: { title: clinic.title, maturity: clinic.maturity },
        billing: {
          requirements: billing.requirements.map((item) => item.statement),
          features: billing.features.map((feature) => feature.name),
        },
      },
      null,
      2,
    ),
  );
  process.exit(1);
}

console.log("ok");
console.log(
  harbor.features.map((feature) => feature.name).join(" · "),
);
console.log(harbor.milestones.map((item) => `${item.name} (${item.featureIds.length})`).join(" · "));
console.log(billing.features.map((feature) => `${feature.name} [${feature.requirementIds.length}]`).join(" · "));
