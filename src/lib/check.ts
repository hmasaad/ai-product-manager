import { emptyMemory, rememberNotes, rememberPlan } from "./memory";
import { planFromInput } from "./planner";
import { RISK_KINDS } from "./risks";
import { DOWN_KINDS, WHY_KINDS, whyThis } from "./trace";
import { LOOP_STAGES, REPORT_USAGE_COPY } from "./analytics";
import { APPROVAL_KINDS, applyGateDecision, pendingMandatory } from "./approval";
import { applyDecisionChoice, DECIDE_QUESTION } from "./decide";
import { askLedger, STALE_ASSUMPTIONS, WHY_ARCHITECTURE } from "./ledger";
import { GRAPH_ASSUMPTIONS, GRAPH_BIGGEST, GRAPH_FEEDBACK, GRAPH_WEAK, askGraph } from "./graph";
import { OPPORTUNITY_NOTE } from "./score";
import { PORTFOLIO_INTELLIGENCE_ASCII, PORTFOLIO_NOTE, PORTFOLIO_QUESTION, applyPortfolioChoice } from "./portfolio";
import { EXPORT_CHANGE, EXPORT_INVESTIGATION, MONITOR_NOTE, MONITOR_WARNING } from "./monitor";
import { LOOP_AUTONOMOUS_ASCII, LOOP_NOTE, LOOP_STAGE_IDS, applyLoopAdvance } from "./loop";
import { OFFLINE_AFFECTED, REEVAL_WARNING } from "./reevaluate";
import { SPECIALIST_IDS } from "./orchestrate";
import { EXPERIMENT_CHOICES, REPORT_TEMPLATE_COPY, UNNAMED_METRIC, UNNAMED_THRESHOLD } from "./experiment";
import { BILLING_BRIEF, BILLING_EXISTING, CLINIC_BRIEF, DELETE_TX_BRIEF, EXPORT_REPORTS_BRIEF, FARMER_BRIEF, FIELD_MANAGEMENT_BRIEF, HARBOR_BRIEF, OFFLINE_REEVAL_BRIEF, OFFLINE_REPORTS_BRIEF, OFFLINE_STALE_EXISTING, REPORT_EXPORT_BRIEF, REPORT_EXPORT_EXISTING, REPORT_SIGNAL_BRIEF, REPORT_SIGNAL_EXISTING, REPORT_TEMPLATES_BRIEF, REPORT_USAGE_BRIEF, REPORT_USAGE_EXISTING, ROADMAP_BRIEF, STRATEGY_BET_BRIEF, TRANSACTION_ARCHITECTURE, TRANSACTION_BRIEF, TRANSACTION_EXISTING } from "./samples";

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

assert(ledger.decisionEngine.options.length >= 2, "A decision names more than one option");
assert(ledger.decisionEngine.options.some((item) => /revision/i.test(item.title)), "Edit-versus-immutable offers a revision");
assert(ledger.decisionEngine.options.some((item) => /modify the original/i.test(item.title)), "Edit-versus-immutable offers modifying the original");
assert(ledger.decisionEngine.options.some((item) => /immutable|hold/i.test(item.title)), "Edit-versus-immutable offers holding the ledger policy");
assert(ledger.decisionEngine.options.every((item) => item.evidence.length > 0 && item.tradeoffs.length > 0 && item.missing.length > 0), "Every option has evidence, a trade-off, and a gap");
assert(!ledger.decisionEngine.options.every((item) => /^build\b/i.test(item.title)), "The engine does not only say Build X");
assert(/edit submitted transactions/i.test(ledger.decisionEngine.question), "The ledger question is about editing submitted transactions");
assert(ledger.decisionEngine.record.status === "pending", "A new decision record starts pending");
assert(/create a revision/i.test(ledger.handoff.architect), "The architect brief receives the revision option");
assert(DECIDE_QUESTION.includes("still missing"), "The engine asks what information is still missing");
const chosen = applyDecisionChoice(ledger, "OPT-revision");
assert(chosen.decisionEngine.record.status === "chosen" && chosen.decisionEngine.record.chosenOptionId === "OPT-revision", "A person can record a chosen option");
assert(clinic.decisionEngine.options.some((item) => /sit with/i.test(item.title)), "Clinic options include validation");
assert(!clinic.decisionEngine.options.some((item) => /build a booking|invent an api/i.test(item.title)), "Clinic does not invent a booking product");
assert(harbor.decisionEngine.options.some((item) => /cityworks/i.test(item.title)), "HarborLine keeps CityWorks as an option");
assert(harbor.decisionEngine.missing.some((line) => /conflict|version|cityworks/i.test(line)), "HarborLine still names the open questions");
assert(!/market size|\bTAM\b/i.test(JSON.stringify(harbor.decisionEngine)), "Decision analysis does not invent TAM");
assert(billing.decisionEngine.options.some((item) => /amount due/i.test(item.title)), "Billing options include making the amount due visible");
assert(billing.decisionEngine.options.some((item) => /do not redesign/i.test(item.title)), "Billing keeps do-not-redesign as an option");
assert(billing.decisionEngine.options.some((item) => item.evidence.some((line) => /12,400|840|9%/.test(line.text))), "Billing options keep stated counts");
assert(deletion.decisionEngine.options.length >= 2, "Delete transactions has more than one option");
assert(usage.decisionEngine.options.some((item) => /template load|reliability|picker/i.test(item.title)), "Report usage options include the load fix");
assert(farmer.decisionEngine.options.length >= 2 && farmer.decisionEngine.record.status === "pending", "A proposed MVP still has a pending decision");

const offline = planFromInput({ brief: OFFLINE_REPORTS_BRIEF, existing: "", constraints: "" });
const card142 = offline.decisionLedger.entries.find((item) => item.number === 142);
assert(Boolean(card142), "Offline reports keep Decision #142");
assert(/offline report generation/i.test(card142?.question ?? ""), "Decision #142 asks about offline report generation");
assert(card142?.options.map((item) => item.title).join("|") === "Fully offline|Queue and sync|Online only", "Decision #142 keeps the three named options");
assert(/queue and sync/i.test(card142?.decision ?? ""), "Decision #142 records Queue and sync");
assert(/second system of record/i.test(card142?.reason ?? ""), "Decision #142 keeps the stated reason");
assert(card142?.owner === "Product" && card142?.date === "2026-03-12", "Decision #142 keeps owner and date");
assert(Boolean(card142?.assumptions.some((line) => /without cell signal/i.test(line.text))), "Decision #142 keeps the signal assumption");
const whyArch = askLedger({ entries: offline.decisionLedger.entries, query: WHY_ARCHITECTURE, corpus: OFFLINE_REPORTS_BRIEF });
assert(/#142/.test(whyArch.answer) && /queue and sync/i.test(whyArch.answer), "The ledger answers why this architecture");
assert(/decision #142/i.test(offline.handoff.architect), "The architect brief receives Decision #142");
const stale = askLedger({
  entries: offline.decisionLedger.entries,
  query: STALE_ASSUMPTIONS,
  corpus: OFFLINE_STALE_EXISTING,
});
assert(/without cell signal/i.test(stale.answer) && /#142/.test(stale.answer), "The ledger names assumptions that no longer hold");
const recalled = planFromInput({ brief: WHY_ARCHITECTURE, existing: OFFLINE_STALE_EXISTING, constraints: "" }, rememberPlan(emptyMemory(), offline));
assert(recalled.decisionLedger.entries.some((item) => item.number === 142), "The next plan recalls Decision #142");
assert(
  askLedger({ entries: recalled.decisionLedger.entries, query: STALE_ASSUMPTIONS, corpus: OFFLINE_STALE_EXISTING }).entries.some((item) =>
    item.assumptions.some((line) => line.health === "stale" && /without cell signal/i.test(line.text)),
  ),
  "Recalled Decision #142 marks the signal assumption stale",
);
assert(!clinic.decisionLedger.entries.some((item) => item.number === 142), "Clinic does not invent Decision #142");
assert(!clinic.decisionLedger.entries.some((item) => /fully offline|queue and sync/i.test(item.options.map((option) => option.title).join(" "))), "Clinic does not invent offline report options");
assert(harbor.decisionLedger.entries.some((item) => /cityworks/i.test(item.decision)), "HarborLine ledger keeps CityWorks");
assert(!harbor.decisionLedger.entries.some((item) => item.number === 142), "HarborLine does not invent Decision #142");
assert(!/market size|\bTAM\b/i.test(JSON.stringify(harbor.decisionLedger)), "The ledger does not invent TAM");
assert(
  Boolean(askLedger({ entries: harbor.decisionLedger.entries, query: WHY_ARCHITECTURE, corpus: HARBOR_BRIEF }).answer.match(/cityworks|okta|offline/i)),
  "HarborLine architecture has a recorded reason",
);
assert(ledger.decisionLedger.entries.some((item) => item.options.length >= 2 && /revision|immutable/i.test(item.question + item.options.map((option) => option.title).join(" "))), "The transaction clash is on the ledger");
const picked = applyDecisionChoice(ledger, "OPT-revision");
assert(picked.decisionLedger.entries.some((item) => /create a revision/i.test(item.decision) && item.status === "recorded"), "Choosing an option writes the ledger record");
assert(farmer.decisionLedger.entries.length >= 1 && farmer.decisionLedger.entries.every((item) => item.number !== 142), "A proposed MVP has a pending ledger card, not #142");
assert(rememberPlan(emptyMemory(), offline).ledger.some((item) => item.number === 142), "Memory stores Decision #142");
assert(offline.decisionReevaluation.cases.length === 0, "The original #142 card has no new contradicting evidence");

const reeval = planFromInput({ brief: OFFLINE_REEVAL_BRIEF, existing: "", constraints: "" }, rememberPlan(emptyMemory(), offline));
const review142 = reeval.decisionReevaluation.cases.find((item) => item.decisionNumber === 142);
assert(Boolean(review142), "New offline usage reopens Decision #142");
assert(review142?.assumption === "Users rarely need offline access.", "The original rare-offline assumption is named");
assert(/38%/.test(review142?.evidence.text ?? ""), "The 38% usage rise stays stated");
assert(review142?.warning === REEVAL_WARNING, "A changed assumption is flagged as possibly invalid");
assert(review142?.changed === true && review142?.verdict === "review", "The decision is marked for review");
assert(OFFLINE_AFFECTED.every((line) => review142?.affected.includes(line)), "Offline architecture, sync, caching, and the roadmap are affected");
assert(review142?.recommendation === "Review decision #142.", "The recommendation is to review Decision #142");
assert(/review decision #142/i.test(reeval.handoff.architect), "The architect brief receives the re-evaluation");
assert(!/market size|\bTAM\b/i.test(JSON.stringify(reeval.decisionReevaluation)), "Re-evaluation does not invent TAM");
assert(harbor.decisionReevaluation.cases.length === 0, "HarborLine has no invented usage rise");
assert(!clinic.decisionReevaluation.cases.some((item) => item.decisionNumber === 142 || /38%/.test(item.evidence.text)), "Clinic does not invent a #142 review");
assert(!billing.decisionReevaluation.cases.some((item) => /38%/.test(item.evidence.text)), "Billing does not invent a 38% offline rise");
assert(!farmer.decisionReevaluation.cases.some((item) => item.decisionNumber === 142), "A proposed MVP does not invent a #142 review");
assert(rememberPlan(emptyMemory(), reeval).items.some((item) => /re-evaluation/i.test(item.text) && /#142/.test(item.text)), "Memory stores the re-evaluation");

assert(harbor.productGraph.nodes.some((item) => item.kind === "customer" && /inspector/i.test(item.label)), "The graph names the inspector");
assert(harbor.productGraph.nodes.some((item) => item.kind === "feature" && /offline/i.test(item.label)), "The graph keeps Offline capture");
assert(harbor.productGraph.edges.length > 0, "HarborLine graph has links");
assert(/customer|problem|opportunity|feature|requirement|decision|risk|experiment|metric|outcome/i.test(harbor.productGraph.ascii), "The graph ascii names every layer");
assert(!/market size|\bTAM\b/i.test(JSON.stringify(harbor.productGraph)), "The graph does not invent TAM");
const biggestHarbor = askGraph(harbor, GRAPH_BIGGEST);
assert(/offline|sync|packet|paper/i.test(biggestHarbor.answer), "HarborLine biggest problems sit on field capture");
assert(!/143 support|27% of users|FieldView/.test(biggestHarbor.answer), "HarborLine graph does not invent report-export volume");
const biggestClinic = askGraph(clinic, GRAPH_BIGGEST);
assert(/phone|validate/i.test(biggestClinic.answer), "Clinic graph keeps the phone problem on validation");
assert(!/booking app|invent an api/i.test(biggestClinic.answer), "Clinic graph does not invent a booking product");
const biggestBilling = askGraph(billing, GRAPH_BIGGEST);
assert(/amount due|payment|card/i.test(biggestBilling.answer), "Billing graph sits on the named payment failures");
assert(/143|27%|export/i.test(askGraph(report, GRAPH_BIGGEST).answer), "Report export graph keeps the stated 143 and 27%");
assert(/create field|field/i.test(askGraph(fields, GRAPH_BIGGEST).answer), "Field management graph sits Create Field on the field problem");
const weakFarmer = askGraph(farmer, GRAPH_WEAK);
assert(weakFarmer.nodes.length >= 1 && /inferred|later|uncounted|proposed/i.test(weakFarmer.answer), "A proposed MVP has weak-evidence roadmap items");
assert(!askGraph(harbor, GRAPH_WEAK).nodes.some((item) => /offline capture/i.test(item.label)), "HarborLine Offline capture is not weak evidence");
assert(/pdf|export/i.test(askGraph(exportReports, GRAPH_ASSUMPTIONS).answer), "Export reports hangs on the PDF assumption");
assert(!/most users will export reports as pdf/i.test(askGraph(harbor, GRAPH_ASSUMPTIONS).answer), "HarborLine does not inherit the PDF assumption");
assert(/#142|38%|offline/i.test(askGraph(reeval, GRAPH_FEEDBACK).answer), "New offline usage feedback moves Decision #142");
assert(!/#142/.test(askGraph(clinic, GRAPH_FEEDBACK).answer), "Clinic feedback does not invent Decision #142");
assert(/knowledge graph|customer/i.test(harbor.handoff.architect), "The architect brief receives the knowledge graph");

const OPPORTUNITY_KEYS = ["customerImpact", "businessImpact", "strategicAlignment", "reach", "confidence", "evidenceQuality", "effort", "risk"];
function scoredOpportunity(plan: { opportunityScoring: { items: { opportunity: string; score: number; rationale: string; factors: { key: string; sign: number; score: number; reason: string; evidence: string }[] }[] } }, name: string | RegExp) {
  return plan.opportunityScoring.items.find((item) => (typeof name === "string" ? item.opportunity === name : name.test(item.opportunity)));
}
for (const [label, scored] of [
  ["HarborLine", harbor],
  ["clinic", clinic],
  ["billing", billing],
  ["report export", report],
  ["farmer", farmer],
] as const) {
  assert(scored.opportunityScoring.items.length >= 1, `${label} scores at least one opportunity`);
  assert(scored.opportunityScoring.note === OPPORTUNITY_NOTE, `${label} stores the opportunity equation`);
  assert(/Customer Impact/.test(scored.opportunityScoring.ascii) && /Evidence Quality/.test(scored.opportunityScoring.ascii), `${label} opportunity tree names the eight factors`);
  for (const item of scored.opportunityScoring.items) {
    assert(item.factors.map((factor) => factor.key).join("|") === OPPORTUNITY_KEYS.join("|"), `${label} ${item.opportunity} has eight factors`);
    const total = item.factors.reduce((sum, factor) => sum + factor.sign * factor.score, 0);
    assert(item.score === total, `${label} ${item.opportunity} score equals its factors`);
    assert(item.rationale === `${item.score} = ${item.factors.map((factor) => (factor.sign === 1 ? String(factor.score) : `− ${factor.score}`)).join(" + ").replaceAll(" + − ", " − ")}`, `${label} ${item.opportunity} stores the equation`);
    assert(Number.isInteger(item.score), `${label} ${item.opportunity} is an integer total`);
    assert(
      item.factors.every((factor) => Number.isInteger(factor.score) && factor.score >= 1 && factor.score <= 5 && factor.reason.length > 8),
      `${label} ${item.opportunity} explains every factor`,
    );
  }
  assert(!/\b8\.7\b|\/10\b/.test(JSON.stringify(scored.opportunityScoring)), `${label} does not invent an 8.7/10`);
}
const reportOpp = scoredOpportunity(report, "Improve report export");
assert(Boolean(reportOpp), "Report export scores the named opportunity");
assert(reportOpp?.factors.find((factor) => factor.key === "customerImpact")?.score === 5, "Report export customer impact is 5");
assert(reportOpp?.factors.find((factor) => factor.key === "reach")?.score === 5, "Report export reach is 5");
assert(reportOpp?.factors.find((factor) => factor.key === "evidenceQuality")?.score === 5, "Report export evidence quality is 5");
assert(reportOpp?.factors.find((factor) => factor.key === "confidence")?.score === 4, "Report export confidence factor is 4");
assert(reportOpp?.factors.find((factor) => factor.key === "businessImpact")?.score === 1, "Report export does not invent revenue");
assert(reportOpp?.factors.find((factor) => factor.key === "businessImpact")?.evidence === "unknown", "Report export revenue stays unknown");
assert(/143/.test(reportOpp?.factors.find((factor) => factor.key === "customerImpact")?.reason ?? ""), "Report export customer impact keeps 143");
assert(/27%/.test(reportOpp?.factors.find((factor) => factor.key === "reach")?.reason ?? ""), "Report export reach keeps 27%");
assert(/3 stated counts/i.test(reportOpp?.factors.find((factor) => factor.key === "evidenceQuality")?.reason ?? ""), "Report export evidence quality counts the three stated facts");
assert(!/143 support|27% of users/.test(JSON.stringify(harbor.opportunityScoring)), "HarborLine scoring does not invent report-export volume");
assert(
  harbor.opportunityScoring.items.every((item) => item.factors.find((factor) => factor.key === "reach")?.evidence === "unknown"),
  "HarborLine reach stays uncounted",
);
assert(
  harbor.opportunityScoring.items.every((item) => {
    const business = item.factors.find((factor) => factor.key === "businessImpact");
    return (business?.score ?? 5) <= 3 && !/\$|TAM|billion/i.test(business?.reason ?? "");
  }),
  "HarborLine does not invent a business-impact number",
);
const clinicOpp = clinic.opportunityScoring.items[0];
assert(/validate/i.test(clinicOpp?.opportunity ?? ""), "Clinic scores validation");
assert(clinicOpp?.factors.find((factor) => factor.key === "evidenceQuality")?.score === 1, "Clinic evidence quality stays at 1");
assert(clinicOpp?.factors.find((factor) => factor.key === "reach")?.evidence === "unknown", "Clinic reach was not counted");
assert(!/\b\d{3,}\b/.test(JSON.stringify(clinic.opportunityScoring)), "Clinic scoring invents no user counts");
assert(!/booking app/i.test(JSON.stringify(clinic.opportunityScoring)), "Clinic scoring does not invent a booking product");
assert(
  billing.opportunityScoring.items.some((item) => item.factors.find((factor) => factor.key === "customerImpact")?.score === 5 && /840|510|390/.test(item.factors.find((factor) => factor.key === "customerImpact")?.reason ?? "")),
  "Billing customer impact keeps a stated support count",
);
assert(
  billing.opportunityScoring.items.some((item) => item.factors.find((factor) => factor.key === "businessImpact")?.score === 5),
  "Billing scores business impact on money already in motion",
);
assert(!/143/.test(JSON.stringify(billing.opportunityScoring)), "Billing scoring does not invent a 143-request line");
const farmerOpp = farmer.opportunityScoring.items[0];
assert((farmerOpp?.factors.find((factor) => factor.key === "evidenceQuality")?.score ?? 5) <= 2, "A proposed MVP has weak evidence quality");
assert(farmerOpp?.factors.find((factor) => factor.key === "reach")?.evidence === "unknown", "A proposed MVP does not invent reach");
assert((reportOpp?.score ?? 0) > (clinicOpp?.score ?? 0), "Stated export volume outranks an uncounted clinic problem");
assert((billing.opportunityScoring.items[0]?.score ?? 0) > (farmerOpp?.score ?? 0), "Billing outranks a proposed MVP");
assert(/opportunity scoring|customer impact/i.test(harbor.handoff.architect), "The architect brief receives opportunity scoring");
assert(/opportunity scoring|143/i.test(report.handoff.architect), "The architect brief receives the report-export score");
assert(!/market size|\bTAM\b/i.test(JSON.stringify(harbor.opportunityScoring)), "Opportunity scoring does not invent TAM");
assert(usage.opportunityScoring.items.some((item) => /reliability|template/i.test(item.opportunity)), "Report usage scores the reliability opportunity");

assert(harbor.portfolio.note === PORTFOLIO_NOTE, "HarborLine stores the portfolio note");
assert(harbor.portfolio.products.length === 1 && /harborline/i.test(harbor.portfolio.products[0]?.name ?? ""), "HarborLine is a one-product portfolio");
assert(/PRODUCT PORTFOLIO/.test(harbor.portfolio.ascii) && /Portfolio View/.test(harbor.portfolio.ascii), "HarborLine portfolio tree names the view");
assert(!/product b|product c|billing|farmer|clinic/i.test(harbor.portfolio.products.map((item) => item.name).join(" ")), "HarborLine does not invent sibling products");
assert(harbor.portfolio.products[0]?.features.some((name) => /offline/i.test(name)), "HarborLine portfolio keeps Offline capture");
assert(harbor.portfolio.findings.some((item) => item.kind === "constraint" && /4/.test(item.detail)), "HarborLine portfolio keeps the four-engineer limit");
assert(harbor.portfolio.findings.some((item) => item.kind === "dependency" && /cityworks|okta/i.test(item.title + item.detail)), "HarborLine portfolio names CityWorks or Okta as a shared dependency");
assert(harbor.portfolio.findings.some((item) => item.kind === "evidence" && /contractor/i.test(item.title + item.detail)), "HarborLine later contractor portal is weak evidence");
assert(harbor.portfolio.findings.some((item) => item.kind === "gap" && /contractor/i.test(item.title + item.detail)), "HarborLine later contractor portal is a strategic gap");
assert(!/143 support|27% of users|FieldView|\bTAM\b|#142|38%/.test(JSON.stringify(harbor.portfolio)), "HarborLine portfolio does not invent other-product evidence");
assert(clinic.portfolio.products.length === 1, "Clinic is a one-product portfolio");
assert(clinic.portfolio.findings.some((item) => item.kind === "gap" && /validat/i.test(item.title + item.detail)), "Clinic portfolio keeps validation as the gap");
assert(!/booking app|#142|\b143\b/.test(JSON.stringify(clinic.portfolio)), "Clinic portfolio does not invent a second product");
assert(farmer.portfolio.findings.some((item) => item.kind === "evidence"), "A proposed MVP is weak evidence on the portfolio");
assert(/pdf/i.test(exportReports.portfolio.findings.filter((item) => item.kind === "assumption").map((item) => item.title + item.detail).join(" ")), "Export reports portfolio hangs on the PDF assumption");
assert(!/143/.test(JSON.stringify(billing.portfolio)), "Billing portfolio does not invent a 143-request line");
assert(/product portfolio|duplicated initiatives|shared dependencies/i.test(harbor.handoff.architect), "The architect brief receives the portfolio view");
assert(harbor.portfolio.engineAscii === PORTFOLIO_INTELLIGENCE_ASCII, "HarborLine stores the portfolio intelligence tree");
assert(harbor.portfolio.question.length > 0 && harbor.portfolio.options.length >= 2, "HarborLine names more than one portfolio bet");
assert(harbor.portfolio.options.some((item) => /keep the current bet|harborline/i.test(item.title)), "HarborLine can keep the current product bet");
assert(harbor.portfolio.options.some((item) => /hold|gather/i.test(item.title)), "HarborLine portfolio offers a hold");
assert(harbor.portfolio.options.some((item) => /contractor/i.test(item.title)), "HarborLine can hold the contractor portal for later");
assert(!harbor.portfolio.options.some((item) => /^build\b/i.test(item.title)), "HarborLine portfolio does not say Build X");
assert(harbor.portfolio.missing.length > 0, "HarborLine portfolio names what is still missing");
assert(harbor.portfolio.record.status === "pending", "HarborLine portfolio starts pending");
assert(harbor.portfolio.contexts.some((ctx) => ctx.kind === "capacity" && ctx.lines.some((line) => /4/.test(line.text))), "HarborLine capacity keeps the four-engineer limit");
const keptBet = applyPortfolioChoice(harbor, harbor.portfolio.options.find((item) => item.id === "BET-keep")?.id ?? "");
assert(keptBet.portfolio.record.status === "chosen" && keptBet.portfolio.record.chosenOptionId === "BET-keep", "A person can record the HarborLine portfolio bet");
assert(clinic.portfolio.options.length >= 2, "Clinic names more than one portfolio bet");
assert(clinic.portfolio.options.some((item) => item.id === "BET-validate" && /validat/i.test(item.title)), "Clinic portfolio stays on validation");
assert(clinic.portfolio.options.some((item) => /hold|gather/i.test(item.title)), "Clinic portfolio offers a hold");
assert(!clinic.portfolio.options.some((item) => /booking app|FieldView|fund a product now/i.test(item.title)), "Clinic portfolio does not invent a booking product");
assert(/fund a product/i.test(clinic.portfolio.question), "Clinic asks whether the portfolio should fund a product");
assert(farmer.portfolio.options.some((item) => /proposed MVP/i.test(item.title)), "A proposed MVP stays a proposal on the portfolio");
assert(farmer.portfolio.options.some((item) => /hold|gather/i.test(item.title)), "A proposed MVP still has a hold");
assert(!/143 support|27% of users|FieldView|\bTAM\b|#142|38%/.test(JSON.stringify(harbor.portfolio.options) + harbor.portfolio.question), "HarborLine bets do not invent other-product evidence");
assert(/portfolio intelligence|where should the next capacity|still missing/i.test(harbor.handoff.architect), "The architect brief receives portfolio intelligence");

const stacked = planFromInput({ brief: OFFLINE_REPORTS_BRIEF, existing: "", constraints: "" }, rememberPlan(emptyMemory(), harbor));
assert(stacked.portfolio.products.length >= 2, "HarborLine plus offline reports is a multi-product portfolio");
assert(stacked.portfolio.products.some((item) => /harborline/i.test(item.name)), "The stacked portfolio keeps HarborLine");
assert(stacked.portfolio.findings.some((item) => item.kind === "duplicate" && /offline/i.test(item.title + item.detail)), "Offline work is duplicated across products");
assert(stacked.portfolio.findings.some((item) => item.kind === "dependency" && /cityworks/i.test(item.title + item.detail)), "CityWorks is a shared dependency across products");
assert(!/FieldView|\bTAM\b|143 support/.test(JSON.stringify(stacked.portfolio)), "The stacked portfolio does not invent farm or export volume");
assert(stacked.portfolio.options.some((item) => item.id === "BET-combine" && /offline/i.test(item.title)), "Stacked offline work can be combined");
assert(stacked.portfolio.options.some((item) => /parallel|hold|gather/i.test(item.title)), "Stacked offline work offers a parallel or hold path");
assert(!stacked.portfolio.options.some((item) => /^build\b/i.test(item.title)), "Stacked portfolio does not say Build X");

const mixed = planFromInput({ brief: FIELD_MANAGEMENT_BRIEF, existing: "", constraints: "" }, rememberPlan(emptyMemory(), harbor));
assert(mixed.portfolio.products.length >= 2, "HarborLine plus field management is a multi-product portfolio");
assert(!mixed.portfolio.findings.some((item) => item.kind === "duplicate" && /delete field/i.test(item.initiatives.join(" "))), "Delete Field is not a cross-product duplicate");
assert(/capacity go across|harborline/i.test(mixed.portfolio.question), "HarborLine plus field management asks where capacity should go");
assert(mixed.portfolio.options.some((item) => /sequence|keep the next capacity|split capacity/i.test(item.title)), "HarborLine plus field management offers a capacity bet");
assert(!harbor.portfolio.options.some((item) => item.id === "BET-combine"), "A one-product HarborLine does not combine with itself");

const memory = rememberNotes(rememberPlan(emptyMemory(), harbor), {
  feedback: "Inspectors still lose packets in the truck.",
  metrics: "95% of inspections are visible within 15 minutes of reconnect.",
});
assert(memory.products.some((name) => /harborline/i.test(name)), "Memory records HarborLine on the portfolio");
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
const signal = planFromInput({ brief: REPORT_SIGNAL_BRIEF, existing: REPORT_SIGNAL_EXISTING, constraints: "" });
const exportMon = signal.monitoring.signals[0];
assert(signal.monitoring.note === MONITOR_NOTE, "Report signal stores the monitor note");
assert(/PRODUCT MONITOR/.test(signal.monitoring.ascii) && /Human Approval/.test(signal.monitoring.ascii), "The monitor tree ends at human approval");
assert(exportMon?.warning === MONITOR_WARNING, "Report signal uses the Product Signal warning");
assert(exportMon?.feature === "Report Export", "Report signal names Report Export");
assert(exportMon?.change === EXPORT_CHANGE, "Report signal keeps the 17% conversion drop");
assert(exportMon?.causes.map((item) => item.text).join("|") === "New UI introduced|Export latency increased|Error rate increased", "Report signal keeps the three named causes");
assert(exportMon?.confidence === "medium", "Report signal confidence is medium");
assert(exportMon?.investigation === EXPORT_INVESTIGATION, "Report signal recommends a pre/post-release funnel check");
assert(exportMon?.status === "investigating", "Report signal investigates before it decides");
assert(exportMon?.kind === "risk", "A conversion drop is a risk signal");
assert(signal.approvals.gates.some((item) => item.kind === "priority" && /investigate report export/i.test(item.proposal)), "Report signal waits on a person before a product decision");
assert(signal.decisionEngine.options.length >= 2, "A monitor signal names more than one option");
assert(signal.decisionEngine.options.some((item) => item.id === "OPT-investigate" && /pre\/post-release funnel/i.test(item.title)), "Report signal offers the funnel investigation");
assert(signal.decisionEngine.options.some((item) => /hold|gather/i.test(item.title)), "Report signal offers a hold");
assert(!signal.decisionEngine.options.some((item) => /^build\b/i.test(item.title)), "The monitor decision does not say Build X");
assert(/17%|report export/i.test(signal.decisionEngine.question), "The monitor question is about the 17% export drop");
assert(signal.decisionEngine.contexts.some((ctx) => ctx.kind === "user" && ctx.lines.some((line) => /17%/.test(line.text))), "User evidence keeps the 17% drop");
assert(signal.decisionEngine.missing.length > 0, "The monitor decision names what is still missing");
assert(signal.decisionEngine.record.status === "pending", "The monitor decision starts pending");
const investigated = applyDecisionChoice(signal, "OPT-investigate");
assert(investigated.decisionEngine.record.status === "chosen" && investigated.decisionEngine.record.chosenOptionId === "OPT-investigate", "A person can record the investigation");
assert(!/17%/.test(JSON.stringify(harbor.decisionEngine.options.map((item) => item.title))), "HarborLine options do not invent a 17% investigation");
assert(!clinic.decisionEngine.options.some((item) => item.id === "OPT-investigate"), "Clinic stays on validation, not a funnel investigation");
assert(signal.productLoop.note === LOOP_NOTE, "Report signal stores the agent-loop note");
assert(signal.productLoop.engineAscii === LOOP_AUTONOMOUS_ASCII, "Report signal stores the autonomous loop tree");
assert(signal.productLoop.stages.map((item) => item.id).join("|") === LOOP_STAGE_IDS.join("|"), "The agent loop has every operating stage");
assert(signal.productLoop.current === "analyze", "A live anomaly stays on analyze");
assert(signal.productLoop.next === "decide", "After the investigation, the loop waits on decide");
assert(signal.productLoop.mode === "waiting", "A live investigation waits on a person");
assert(signal.productLoop.authorization === "review", "A live investigation is review recommended");
assert(/pre\/post-release funnel/i.test(signal.productLoop.action), "The loop action is the funnel investigation");
assert(/report export/i.test(signal.productLoop.blocker), "The loop names the open investigation");
assert(signal.productLoop.stages.find((item) => item.id === "analyze")?.status === "current", "Analyze is the current loop stage");
assert(signal.productLoop.stages.find((item) => item.id === "decide")?.status === "waiting", "Decide waits until the investigation finishes");
assert(signal.productLoop.stages.find((item) => item.id === "execute")?.status === "waiting", "Execute waits while the investigation is open");
const advanced = applyLoopAdvance(signal);
assert(advanced.monitoring.signals.every((item) => item.status !== "investigating"), "A person can close the investigation");
assert(advanced.productLoop.current !== "analyze", "The loop leaves analyze after the investigation is signed");
assert(advanced.productLoop.current === "decide", "The loop moves to decide after the investigation is signed");
assert(advanced.productLoop.mode === "waiting", "Decide still waits on a person");
assert(applyLoopAdvance(clinic) === clinic, "Clinic has no investigation to close");
assert(applyLoopAdvance(harbor) === harbor, "HarborLine has no invented investigation to close");
assert(/investigates before/i.test(signal.handoff.architect) && /product signal|report export/i.test(signal.handoff.architect), "The architect brief receives the monitor investigation");
assert(/OBSERVE|ANALYZE|LEARN/i.test(signal.handoff.architect), "The architect brief receives the agent loop");
assert(/autonomous product loop|wait on a person/i.test(signal.handoff.architect), "The architect brief receives the autonomous loop");
assert(harbor.monitoring.signals.length === 0, "HarborLine has no invented conversion drop");
assert(!/17%|new ui introduced|export latency/i.test(JSON.stringify(harbor.monitoring)), "HarborLine monitor does not invent the export signal");
assert(clinic.monitoring.signals.length === 0, "Clinic has no live product signal");
assert(!/17%/.test(JSON.stringify(clinic.productLoop)), "Clinic loop does not invent a 17% drop");
assert(clinic.productLoop.current === "validate", "Clinic stays on validate");
assert(clinic.productLoop.mode === "waiting" && clinic.productLoop.authorization === "mandatory", "Clinic validation waits on a person");
assert(clinic.productLoop.next === "decide", "Clinic next stage is decide");
assert(/validation first/i.test(clinic.productLoop.action), "Clinic loop stays on validation");
assert(billing.monitoring.signals.length === 0, "Billing funnel is not a monitor anomaly");
assert(!/17%/.test(JSON.stringify(billing.monitoring)), "Billing monitor does not invent a 17% drop");
assert(fields.monitoring.signals.length === 0, "Field management does not invent live monitoring");
assert(farmer.productLoop.stages.length === LOOP_STAGE_IDS.length, "A proposed MVP still walks the full loop");
assert(harbor.productLoop.current === "decide", "HarborLine waits on decide while mandatory gates are open");
assert(harbor.productLoop.mode === "waiting" && harbor.productLoop.authorization === "mandatory", "HarborLine decide is mandatory");
assert(harbor.productLoop.next === "plan", "HarborLine next stage is plan");
assert(/mandatory gates/i.test(harbor.productLoop.blocker), "HarborLine loop names the open gates");
assert(harbor.productLoop.engineAscii.includes("AUTONOMOUS PRODUCT LOOP"), "HarborLine stores the autonomous loop tree");
assert(!/17%/.test(JSON.stringify(harbor.productLoop)), "HarborLine loop does not invent a 17% drop");
assert(farmer.productLoop.current === "discover" || farmer.productLoop.current === "decide", "A proposed MVP stays on discover or decide");
assert(farmer.productLoop.mode === "waiting" || farmer.productLoop.mode === "autonomous", "A proposed MVP still has a loop mode");
assert(usage.monitoring.signals.some((item) => /saved report templates/i.test(item.feature) && /4,200|−30%|-30%/.test(item.change)), "Report usage monitoring keeps the stated template decline");
assert(!usage.monitoring.signals.some((item) => /17%|new ui introduced/i.test(item.change + item.causes.map((cause) => cause.text).join(" "))), "Report usage does not inherit the 17% export causes");
assert(usage.productLoop.current === "analyze", "Report usage stays on analyze while the monitor investigates");
assert(!/market size|\bTAM\b/i.test(JSON.stringify(signal.monitoring) + JSON.stringify(signal.productLoop)), "Monitoring and the loop do not invent TAM");
assert(rememberPlan(emptyMemory(), signal).items.some((item) => /monitor/i.test(item.text) && /17%/.test(item.text)), "Memory stores the monitor signal");

assert(repeat.portfolio.findings.some((item) => item.kind === "duplicate" && /contractor/i.test(item.title + item.detail)), "The portfolio names the duplicated contractor portal");
assert(repeat.portfolio.findings.some((item) => item.kind === "conflict" && /cityworks/i.test(item.title + item.detail)), "The portfolio names the CityWorks roadmap conflict");
assert(/cityworks|contractor/i.test(repeat.portfolio.question), "The contractor follow-up asks a CityWorks portfolio question");
assert(repeat.portfolio.options.some((item) => /keep cityworks/i.test(item.title)), "The contractor follow-up can keep CityWorks");
assert(repeat.portfolio.options.some((item) => /replace cityworks/i.test(item.title)), "The contractor follow-up can replace CityWorks");
assert(repeat.portfolio.options.some((item) => /hold|gather/i.test(item.title)), "The contractor follow-up offers a hold");
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
