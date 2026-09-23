import { emptyMemory, rememberNotes, rememberPlan } from "./memory";
import { planFromInput } from "./planner";
import { RISK_KINDS } from "./risks";
import { DOWN_KINDS, WHY_KINDS, whyThis } from "./trace";
import { LOOP_STAGES, REPORT_USAGE_COPY } from "./analytics";
import { APPROVAL_KINDS, applyGateDecision, pendingMandatory } from "./approval";
import { SPECIALIST_IDS } from "./orchestrate";
import { EXPERIMENT_CHOICES, REPORT_TEMPLATE_COPY, UNNAMED_METRIC, UNNAMED_THRESHOLD } from "./experiment";
import { BILLING_BRIEF, BILLING_EXISTING, CLINIC_BRIEF, DELETE_TX_BRIEF, EXPORT_REPORTS_BRIEF, FARMER_BRIEF, FIELD_MANAGEMENT_BRIEF, HARBOR_BRIEF, REPORT_EXPORT_BRIEF, REPORT_EXPORT_EXISTING, REPORT_TEMPLATES_BRIEF, REPORT_USAGE_BRIEF, REPORT_USAGE_EXISTING, ROADMAP_BRIEF, STRATEGY_BET_BRIEF, TRANSACTION_ARCHITECTURE, TRANSACTION_BRIEF, TRANSACTION_EXISTING } from "./samples";

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
assert(billing.recommendations.length === 3, "Billing writes one recommendation per support tag");
assert(billing.recommendations[0]?.evidence.some((line) => /840/.test(line.text)), "Billing evidence keeps the 840 requests");
assert(billing.recommendations.every((item) => item.confidence >= 0.6 && item.unknowns.some((line) => /interview/i.test(line))), "Billing confidence follows the counts");
assert(!billing.recommendations.some((item) => /143/.test(JSON.stringify(item))), "Billing does not invent a 143-request line");

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

assert(fields.traceability.chains.length === fields.features.length, "Every field feature has a traceability chain");
assert(harbor.traceability.chains.length === harbor.features.length, "Every HarborLine feature has a traceability chain");
const createTrace = fields.traceability.chains.find((item) => item.feature === "Create Field");
assert(createTrace?.down.map((step) => step.kind).join("|") === DOWN_KINDS.join("|"), "Create Field traces goal to test");
assert(createTrace?.why.map((step) => step.kind).join("|") === WHY_KINDS.join("|"), "Create Field answers why the API exists");
assert(Boolean(createTrace?.why[0]?.label.startsWith("API:") && /persist a field/i.test(createTrace.why[0].label)), "Create Field names the persist API");
assert(Boolean(createTrace?.why.some((step) => step.kind === "problem")), "The why-chain reaches the customer problem");
assert(Boolean(createTrace?.why.some((step) => step.kind === "goal" && /field list|trusts/i.test(step.label))), "The why-chain reaches a field-management goal");
assert(whyThis(fields, "Persist a field").some((item) => item.feature === "Create Field"), "A persist-API query returns Create Field");
const harborSync = harbor.traceability.chains.find((item) => /sync/i.test(item.feature));
assert(Boolean(harborSync?.why.some((step) => /packet|paper|inspect/i.test(step.label))), "Sync traces back to the field-inspection problem");
assert(!clinic.traceability.chains.some((item) => item.why[0]?.label.startsWith("API:")), "Clinic does not invent an API");
assert(!/market size|\bTAM\b/i.test(JSON.stringify(fields.traceability)), "Traceability does not invent market size");

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
assert(harbor.recommendations.length >= 1, "HarborLine still produces a recommendation");
assert(!/143 support|27% of users/.test(JSON.stringify(harbor.recommendations)), "HarborLine does not invent report-export volume");
assert(harbor.recommendations.every((item) => item.unknowns.some((line) => /revenue/i.test(line))), "HarborLine names the missing revenue measure");

const clinicRec = clinic.recommendations[0];
assert(Boolean(clinicRec && /validate/i.test(clinicRec.opportunity)), "Clinic recommends validation");
assert(Boolean(clinicRec && clinicRec.confidence < 0.5), "Clinic confidence stays below 0.5");
assert(Boolean(clinicRec && clinicRec.unknowns.some((line) => /support volume|encounter/i.test(line))), "Clinic names the missing counts");

const report = planFromInput({ brief: REPORT_EXPORT_BRIEF, existing: REPORT_EXPORT_EXISTING, constraints: "" });
const reportRec = report.recommendations[0];
assert(reportRec?.opportunity === "Improve report export", "Report export names the opportunity");
assert(Boolean(reportRec?.evidence.some((line) => line.text === "143 support requests")), "Report export keeps 143 support requests");
assert(Boolean(reportRec?.evidence.some((line) => /27% of users encountered/i.test(line.text))), "Report export keeps the 27% encounter rate");
assert(Boolean(reportRec?.evidence.some((line) => /3 related feature requests/i.test(line.text))), "Report export keeps the three feature requests");
assert(reportRec?.userImpact.level === "high", "Report export user impact is high");
assert(reportRec?.technicalCost.level === "medium", "Report export effort is medium");
assert(reportRec?.confidence === 0.82, "Report export confidence is 0.82");
assert(Boolean(reportRec?.unknowns.includes("Revenue impact hasn't been measured")), "Report export names the missing revenue measure");
assert(Boolean(reportRec?.unknowns.includes("User interviews are limited")), "Report export names the limited interviews");

const exportReports = planFromInput({ brief: EXPORT_REPORTS_BRIEF, existing: "", constraints: "" });
const exportQuestions = exportReports.ambiguities.map((item) => item.question);
assert(exportQuestions[0] === "Which users?", "Export reports asks which users");
assert(exportQuestions[1] === "Which reports?", "Export reports asks which reports");
assert(exportQuestions[2] === "PDF, CSV, or Excel?", "Export reports asks for a format");
assert(exportQuestions[3] === "Maximum report size?", "Export reports asks for a size");
assert(exportQuestions[4] === "Should exports be asynchronous?", "Export reports asks about async work");
assert(exportQuestions[5] === "Should export permissions differ by role?", "Export reports asks about permissions");
assert(exportQuestions[6] === "Should exports be audited?", "Export reports asks about audit");
assert(exportReports.ambiguities[0]?.action === "must clarify", "Which users is critical");
assert(exportReports.ambiguities[2]?.severity === "critical", "Format is critical");
assert(exportReports.ambiguities[3]?.action === "recommendation", "Size is an important recommendation");
assert(exportReports.ambiguities[6]?.action === "reasonable assumption", "Audit is a minor assumption");
assert(exportReports.prd.openQuestions.includes("Which users?"), "Critical ambiguities land on the PRD");
assert(!/\b(pdf|csv|excel)\b/i.test(exportReports.requirements.map((item) => item.statement).join(" ")), "The PRD does not invent an export format");
assert(!harbor.ambiguities.some((item) => /which users|pdf, csv, or excel/i.test(item.question)), "HarborLine does not invent export ambiguities");
assert(!clinic.ambiguities.some((item) => /pdf, csv, or excel/i.test(item.question)), "Clinic does not invent an export format question");

const pdfGuess = exportReports.decisions.find((item) => item.decision === "Most users will export reports as PDF.");
assert(pdfGuess?.status === "assumption", "The PDF default is an assumption");
assert(pdfGuess?.validation === "Interview 5 users before implementation.", "The PDF assumption has a validation step");
assert(exportReports.decisions.some((item) => item.status === "needsValidation" && item.decision === "Which users?"), "Critical ambiguities need validation");
assert(exportReports.decisions.some((item) => item.status === "inferred"), "Inferred export decisions stay inferred");
assert(
  harbor.decisions.some((item) => item.status === "confirmed" && /offline inspection capture/i.test(item.decision)),
  "HarborLine stated must-haves are confirmed",
);
assert(!harbor.decisions.some((item) => item.decision === "Most users will export reports as PDF."), "HarborLine does not guess a PDF export default");
assert(clinic.decisions.some((item) => item.status === "needsValidation"), "Clinic decisions need validation");
assert(clinic.decisions.every((item) => item.status !== "confirmed" || /phones lock/i.test(item.decision) || /7 to 8/i.test(item.decision)), "Clinic does not confirm a product requirement");
assert(farmer.decisions.some((item) => item.status === "inferred" && /proposed mvp/i.test(item.decision)), "The farmer MVP stays inferred");
assert(billing.decisions.some((item) => item.status === "confirmed" && /amount due/i.test(item.decision)), "Billing stated work is confirmed");

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
assert(harbor.conflicts.length === 0, "HarborLine does not invent a requirement conflict");
assert(clinic.conflicts.length === 0, "Clinic has no requirement conflict");
assert(billing.conflicts.length === 0, "Billing does not treat a non-goal as a new redesign");
assert(harbor.context.recalled === 0, "A first plan has no prior product context");

const ledger = planFromInput({
  brief: TRANSACTION_BRIEF,
  existing: TRANSACTION_EXISTING,
  constraints: TRANSACTION_ARCHITECTURE,
});
const ledgerHit = ledger.conflicts.find((item) => item.against === "requirement");
assert(Boolean(ledgerHit), "Edit versus immutable is a requirement conflict");
assert(ledgerHit?.newRequirement === '"Users can edit submitted transactions."', "The new requirement is quoted");
assert(ledgerHit?.existingRequirement === '"Submitted transactions are immutable."', "The existing requirement is quoted");
assert(ledgerHit?.impact === "high", "An immutability clash is high impact");
assert(/revision/i.test(ledgerHit?.resolution ?? ""), "The resolution asks whether a revision is created");
assert(
  ledger.conflicts.some((item) => item.against === "architecture" && /append-only/i.test(item.existingRequirement)),
  "The append-only ledger is an architecture conflict",
);
assert(harbor.impacts.length === 0, "A first HarborLine plan has no change blast radius");
assert(clinic.impacts.length === 0, "Clinic has no change blast radius");
assert(fields.impacts.length === 0, "Field management is new scope, not a change");
assert(billing.impacts.some((item) => /invoice|payment/i.test(item.screens.join(" "))), "Billing change hits the invoice screen");
assert(!/kubernetes|microservice/i.test(JSON.stringify(billing.impacts)), "Billing impact invents no stack");

const deletion = planFromInput({
  brief: DELETE_TX_BRIEF,
  existing: TRANSACTION_EXISTING,
  constraints: TRANSACTION_ARCHITECTURE,
});
const blast = deletion.impacts[0];
assert(blast?.change === "Users can delete transactions.", "Delete transactions is the requirement change");
assert(blast?.severity === "high", "Deleting a posted transaction is high impact");
assert(Boolean(blast?.features.some((line) => /transaction|immutable/i.test(line))), "The blast radius names the transaction surface");
assert(!blast?.features.some((line) => /delete field/i.test(line)), "A transaction delete does not pull in field deletion");
assert(Boolean(blast?.apis.some((line) => /delete/i.test(line))), "The blast radius names a delete API");
assert(Boolean(blast?.database.some((line) => /append-only|ledger|tombstone|revision/i.test(line))), "The blast radius names the ledger");
assert(Boolean(blast?.screens.some((line) => /delete confirmation/i.test(line))), "The blast radius names the delete screen");
assert(Boolean(blast?.permissions.length), "The blast radius names permissions");
assert(Boolean(blast?.tests.some((line) => /delete/i.test(line))), "The blast radius names delete tests");
assert(Boolean(blast?.documentation.some((line) => /immutable|ledger policy/i.test(line))), "The blast radius names documentation");
assert(Boolean(blast?.security.some((line) => /audit|irreversible/i.test(line))), "The blast radius names security");
assert(/change impact/i.test(deletion.handoff.architect), "The architect brief receives the blast radius");
const moneyRisk = deletion.riskAnalysis.registers[0]?.risks.find((item) => item.kind === "product");
assert(moneyRisk?.risk === "Users may accidentally delete financial records.", "Delete transactions names the product risk");
assert(moneyRisk?.cause === "Destructive action has no recovery mechanism.", "Delete transactions names the cause");
assert(moneyRisk?.mitigation === "Soft-delete + confirmation + audit history.", "Delete transactions names the mitigation");
assert(moneyRisk?.residual === "Recovery requirements have not been validated.", "Delete transactions names residual uncertainty");
assert(
  deletion.riskAnalysis.registers.every((register) => register.risks.map((item) => item.kind).join("|") === RISK_KINDS.join("|")),
  "Delete transactions has all seven risk kinds",
);
assert(
  harbor.riskAnalysis.registers.length === harbor.features.length &&
    harbor.riskAnalysis.registers.every((register) => register.risks.length === 7),
  "Every HarborLine feature has seven risks",
);
assert(!harbor.riskAnalysis.registers.some((register) => register.risks.some((item) => /financial records/i.test(item.risk))), "HarborLine does not invent a financial-delete risk");
assert(!/market size|\bTAM\b/i.test(JSON.stringify(harbor.riskAnalysis)), "Risk analysis does not invent market size");
assert(
  clinic.riskAnalysis.registers.some((register) => register.risks.some((item) => item.kind === "product" && /wrong workflow/i.test(item.risk))),
  "Clinic product risk is building before validation",
);
assert(!clinic.riskAnalysis.registers.some((register) => register.risks.some((item) => /financial records/i.test(item.risk))), "Clinic does not invent a financial-delete risk");
const fieldDelete = fields.riskAnalysis.registers.find((item) => item.feature === "Delete Field");
assert(Boolean(fieldDelete?.risks.some((item) => item.kind === "product" && /field/i.test(item.risk) && !/financial/i.test(item.risk))), "Delete Field is a field risk, not a finance risk");
assert(Boolean(fieldDelete?.risks.some((item) => item.kind === "ux" && /confirm/i.test(item.mitigation))), "Delete Field UX mitigation keeps confirmation");
assert(billing.riskAnalysis.registers.some((register) => register.risks.some((item) => item.kind === "business" && /still looks due/i.test(item.risk))), "Billing names the paid-but-due business risk");

const templates = planFromInput({ brief: REPORT_TEMPLATES_BRIEF, existing: "", constraints: "" });
const templateExp = templates.experiments[0];
assert(templateExp?.hypothesis === REPORT_TEMPLATE_COPY.hypothesis, "Report templates keep the stated hypothesis");
assert(templateExp?.experiment === REPORT_TEMPLATE_COPY.experiment, "Report templates keep the 10-user prototype");
assert(templateExp?.metric === REPORT_TEMPLATE_COPY.metric, "Report templates keep time to create report");
assert(templateExp?.successCriteria === REPORT_TEMPLATE_COPY.successCriteria, "Report templates keep the 30% threshold");
assert(templateExp?.decision === "pending", "Report templates leave Build / Modify / Abandon pending");
assert(/Build \/ Modify \/ Abandon/.test(templates.handoff.architect), "The architect brief names Build / Modify / Abandon");
assert(!harbor.experiments.some((item) => /10 users|30% reduction/i.test(`${item.experiment} ${item.successCriteria}`)), "HarborLine does not invent a 10-user 30% experiment");
assert(harbor.experiments.some((item) => /contractor portal/i.test(item.idea)), "HarborLine experiments the later contractor portal");
assert(clinic.experiments.some((item) => /sit with/i.test(item.experiment) && item.metric === UNNAMED_METRIC && item.successCriteria === UNNAMED_THRESHOLD), "Clinic stays a validation experiment");
assert(!clinic.experiments.some((item) => /10 users|30% reduction/i.test(JSON.stringify(item))), "Clinic does not invent a 30% threshold");
assert(fields.experiments.some((item) => /field reports/i.test(item.idea)), "Field reports wait on an experiment");
assert(billing.experiments.some((item) => /9%/.test(`${item.metric} ${item.successCriteria}`) && !/30%/.test(item.successCriteria)), "Billing uses the stated 9% completion");
assert(farmer.experiments.length > 0 && farmer.experiments.every((item) => item.decision === "pending"), "A proposed MVP waits on an experiment");
assert(EXPERIMENT_CHOICES.join(" / ") === "Build / Modify / Abandon", "Experiment decisions are Build, Modify, or Abandon");

const usage = planFromInput({ brief: REPORT_USAGE_BRIEF, existing: REPORT_USAGE_EXISTING, constraints: "" });
const usageLoop = usage.analytics.loops[0];
assert(usageLoop?.feature === REPORT_USAGE_COPY.feature, "Report usage names the launched feature");
assert(usageLoop?.stages.map((item) => item.id).join("|") === LOOP_STAGES.map((item) => item[0]).join("|"), "Report usage walks launched to improvement");
assert(usageLoop?.stages.find((item) => item.id === "declining")?.text === REPORT_USAGE_COPY.declining, "Report usage keeps the 4,200 → 2,940 decline");
assert(usageLoop?.stages.find((item) => item.id === "investigates")?.text === REPORT_USAGE_COPY.investigates, "Report usage investigates the stated errors and behavior");
assert(usageLoop?.stages.find((item) => item.id === "problem")?.text === REPORT_USAGE_COPY.problem, "Report usage names the template-load problem");
assert(usageLoop?.stages.find((item) => item.id === "opportunity")?.text === REPORT_USAGE_COPY.opportunity, "Report usage creates the reliability opportunity");
assert(usageLoop?.stages.find((item) => item.id === "improvement")?.text === REPORT_USAGE_COPY.improvement, "Report usage proposes the load and picker fix");
assert(usage.analytics.signals.some((item) => item.kind === "event" && item.declining && /report_created/i.test(item.name)), "Report usage marks report_created as declining");
assert(usage.analytics.signals.some((item) => item.kind === "error" && /template_load_failed/i.test(item.name) && item.current === 140), "Report usage keeps template_load_failed 140");
assert(usage.analytics.signals.some((item) => item.kind === "behavior" && /41%/.test(item.detail)), "Report usage keeps the 41% abandon rate");
assert(!usage.analytics.signals.some((item) => /usage is declining/i.test(item.detail)), "The usage brief is not a behavior signal");
assert(/restore template reliability/i.test(usage.handoff.architect), "The architect brief receives the analytics opportunity");
assert(harbor.analytics.loops.length === 0, "HarborLine has no invented usage-decline loop");
assert(!harbor.analytics.signals.some((item) => /4,200|report_created|template_load_failed/i.test(item.detail)), "HarborLine does not invent template analytics");
assert(clinic.analytics.loops.length === 0 && clinic.analytics.signals.length === 0, "Clinic has no live analytics");
assert(billing.analytics.signals.some((item) => /12,400|9%/.test(item.detail)), "Billing keeps the stated invoice and completion counts");
assert(billing.analytics.loops.length === 0, "Billing funnel is not a launched-feature decline");
assert(fields.analytics.loops.length === 0, "Field management does not invent live usage");
assert(!/market size|\bTAM\b/i.test(JSON.stringify(usage.analytics)), "Analytics does not invent market size");

const bet = planFromInput({ brief: STRATEGY_BET_BRIEF, existing: "", constraints: "" });
assert(bet.approvals.gates.map((item) => item.kind).join("|") === APPROVAL_KINDS.join("|"), "Strategy bet opens all five approval gates");
assert(bet.approvals.gates.every((item) => item.status === "pending"), "Strategy bet leaves every gate pending");
assert(bet.approvals.gates.find((item) => item.kind === "strategy")?.proposal === "Make saved report templates the 2026 product bet.", "Strategy bet keeps the stated product bet");
assert(bet.approvals.gates.find((item) => item.kind === "scope")?.proposal === "Templates become a must-have.", "Strategy bet keeps the stated scope change");
assert(bet.approvals.gates.find((item) => item.kind === "priority")?.proposal === "Templates move ahead of new report types.", "Strategy bet keeps the stated priority change");
assert(bet.approvals.gates.find((item) => item.kind === "roadmap")?.proposal === "Slip the Q4 export suite.", "Strategy bet keeps the stated roadmap slip");
assert(bet.approvals.gates.find((item) => item.kind === "production")?.proposal === "The live report creator switches to templates.", "Strategy bet keeps the live report-creator change");
assert(bet.approvals.gates.find((item) => item.kind === "priority")?.authorization === "review", "Priority is review recommended");
assert(bet.approvals.gates.filter((item) => item.kind !== "priority").every((item) => item.authorization === "mandatory"), "Strategy, scope, roadmap, and production are mandatory");
assert(pendingMandatory(bet).length === 4, "Four mandatory gates wait on a person");
const signed = applyGateDecision(bet, "GATE-strategy", "approved");
assert(signed.approvals.gates.find((item) => item.kind === "strategy")?.status === "approved", "A person can approve a strategy gate");
assert(signed.approvals.gates.find((item) => item.kind === "strategy")?.commit === "Committed after human approval.", "Approval commits the decision");
assert(/mandatory gates are pending/i.test(bet.handoff.architect), "The architect brief waits on mandatory gates");
assert(clinic.approvals.gates.some((item) => item.kind === "strategy" && /validation/i.test(item.proposal)), "Clinic strategy stays gated on validation");
assert(!clinic.approvals.gates.some((item) => item.kind === "production"), "Clinic has no production gate");
assert(harbor.approvals.gates.some((item) => item.kind === "strategy" && item.status === "pending"), "HarborLine strategy waits on a person");
assert(harbor.approvals.gates.some((item) => item.kind === "roadmap"), "HarborLine roadmap is a major decision");
assert(harbor.approvals.gates.some((item) => item.kind === "production"), "HarborLine field ship is production-impacting");
assert(!harbor.approvals.gates.some((item) => /4,200|Q4 export|2026 product bet/i.test(item.proposal)), "HarborLine does not invent the strategy bet");
assert(billing.approvals.gates.some((item) => item.kind === "production" && /12,400|9%|billing/i.test([item.proposal, ...item.evidence].join(" "))), "Billing production gate keeps stated counts");
assert(billing.approvals.gates.some((item) => item.kind === "scope" || item.kind === "production"), "Billing is a live-product change");
assert(deletion.approvals.gates.some((item) => item.kind === "scope" && /delete/i.test(item.proposal)), "Delete transactions is a scope gate");
assert(deletion.approvals.gates.some((item) => item.kind === "production"), "Delete transactions is a production gate");
assert(farmer.approvals.gates.some((item) => item.kind === "strategy" && /proposed/i.test(item.proposal)), "A proposed MVP waits on strategy approval");
assert(usage.approvals.gates.some((item) => item.kind === "priority" && /restore template reliability/i.test(item.proposal)), "Report usage priority follows the analytics opportunity");
assert(!/market size|\bTAM\b/i.test(JSON.stringify(bet.approvals)), "Approval gates do not invent market size");

assert(harbor.orchestration.agents.map((item) => item.id).join("|") === SPECIALIST_IDS.join("|"), "HarborLine runs the six specialists and a product decision");
assert(harbor.orchestration.agents.every((item) => item.findings.length > 0 && item.output.length > 0), "Every specialist returns findings and a handoff");
assert(/product research agent/i.test(harbor.handoff.architect), "The architect brief names the research agent");
const harborMarket = harbor.orchestration.agents.find((item) => item.id === "market");
assert(Boolean(harborMarket?.findings.some((line) => /cityworks/i.test(line) && /stated/i.test(line))), "HarborLine market agent keeps CityWorks stated");
assert(!harborMarket?.findings.some((line) => /fieldview|granular|farmlogs/i.test(line)), "HarborLine market agent does not invent farm products");
assert(!/\bTAM\b|billion|million users|\$\d/i.test(harborMarket?.findings.join(" ") ?? ""), "The market agent does not invent TAM");
assert(/not a market-size study/i.test(harborMarket?.output ?? ""), "The market agent is a landscape check");
const clinicMarket = clinic.orchestration.agents.find((item) => item.id === "market");
assert(Boolean(clinicMarket?.findings.some((line) => /not named|unknown/i.test(line))), "Clinic market agent does not invent a landscape");
assert(clinic.orchestration.agents.find((item) => item.id === "research")?.output === "Validation first. This is not a build.", "Clinic research agent stays on validation");
const farmerMarket = farmer.orchestration.agents.find((item) => item.id === "market");
assert(Boolean(farmerMarket?.findings.some((line) => /fieldview|notebook/i.test(line) && /inferred/i.test(line))), "Farmer market agent keeps the inferred landscape");
assert(Boolean(usage.orchestration.agents.find((item) => item.id === "analytics")?.findings.some((line) => /4,200/.test(line))), "Analytics agent keeps the stated 4,200 decline");
assert(/mandatory gates wait/i.test(harbor.orchestration.decision), "Product Decision waits on mandatory gates");
assert(fields.orchestration.agents.length === SPECIALIST_IDS.length, "Field management runs every specialist");

const memory = rememberNotes(rememberPlan(emptyMemory(), harbor), {
  feedback: "Inspectors still lose packets in the truck.",
  metrics: "95% of inspections are visible within 15 minutes of reconnect.",
});
assert(memory.items.some((item) => item.kind === "feature" && /contractor portal/i.test(item.text)), "Memory keeps the contractor portal");
assert(memory.items.some((item) => item.kind === "decision" && /cityworks/i.test(item.text)), "Memory keeps the CityWorks decision");
assert(memory.items.some((item) => item.kind === "goal"), "Memory keeps product goals");
assert(memory.items.some((item) => item.kind === "persona" && /inspector/i.test(item.text)), "Memory keeps personas");
assert(memory.items.some((item) => item.kind === "constraint"), "Memory keeps constraints");
assert(memory.items.some((item) => item.kind === "prd" && /harborline/i.test(item.text)), "Memory keeps the PRD");
assert(memory.items.some((item) => item.kind === "limitation"), "Memory keeps technical limitations");
assert(memory.items.some((item) => item.kind === "roadmap"), "Memory keeps the roadmap");
assert(memory.items.some((item) => item.kind === "feedback" && /packets/i.test(item.text)), "Memory keeps user feedback");
assert(memory.items.some((item) => item.kind === "metric" && /95%/.test(item.text)), "Memory keeps product metrics");

const repeat = planFromInput(
  { brief: "Build a contractor portal and replace CityWorks.", existing: "", constraints: "" },
  memory,
);
assert(
  repeat.context.alreadyExists.some((hit) => /contractor portal/i.test(hit.text)),
  "A recorded feature is not proposed again",
);
assert(
  repeat.context.conflicts.some((hit) => /cityworks/i.test(hit.text)),
  "Replacing CityWorks conflicts with the recorded decision",
);
assert(
  repeat.conflicts.some(
    (item) =>
      /replace cityworks/i.test(item.newRequirement) &&
      /cityworks/i.test(item.existingRequirement) &&
      item.impact === "high",
  ),
  "The conflict detector names replace versus remains",
);
assert(
  repeat.impacts.some((item) => /cityworks|system of record/i.test([item.features, item.apis, item.documentation].flat().join(" "))),
  "Replacing CityWorks has a change blast radius",
);
assert(
  !repeat.requirements.some((item) => /replace cityworks|contractor portal/i.test(item.statement)),
  "Blocked requests stay out of the new requirements",
);
assert(
  !repeat.features.some((feature) => /contractor portal|replace cityworks/i.test(feature.name)),
  "Blocked requests stay out of the new feature list",
);
assert(/already recorded/i.test(repeat.problem.nonGoals.join(" ")), "The plan names the recorded feature");
assert(/earlier decision stands/i.test(repeat.handoff.architect), "The architect brief keeps the earlier decision");
const kept = rememberPlan(memory, repeat);
assert(kept.product === memory.product && kept.items.length === memory.items.length, "A gated problem plan does not overwrite product memory");
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
