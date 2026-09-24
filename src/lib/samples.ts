export const HARBOR_BRIEF = `# HarborLine Field Inspections — product requirement

HarborLine Water is a mid-size municipal utility. Inspectors currently complete paper packets in the field, photograph defects on personal phones, and type everything into CityWorks back at the office. Packets go missing. Photos never attach. Supervisors review a week late.

## Problem

We need a field inspection product that works in poor rural coverage, captures evidence on the device, and lands a reviewable record for supervisors the same day the inspector reconnects.

## Users

- Field inspectors: receive today's assigned jobs, complete inspections offline, capture findings, photos, and signatures, and sync when they have signal.
- Supervisors: assign work, review completed inspections, request rework, and approve the official record.
- Clerks: generate the PDF inspection report for the property file and public-records requests.

## Must have (v1)

- Offline inspection capture for a full 8-hour shift with no cell signal.
- Structured findings (severity, code citation, notes) per inspection.
- Photo capture attached to a finding, including photos up to 8MB.
- Customer or site signature on device.
- Sync when connectivity returns; a 40-inspection day must finish syncing in under 2 minutes on typical LTE.
- Supervisor review queue: approve or send back.
- PDF inspection report from the approved record.
- Okta SSO for all staff. No local username and password product.
- Audit log of who changed an inspection and when.
- Retain inspection records and photos for 2 years.

## Should have

- Map of assigned jobs for the day (read-only pins).
- Read-only work-order status from the existing CityWorks system so inspectors see why they were sent.

## Nice to have / later

- Contractor portal so third-party crews can submit their own inspections.

## Constraints

- Team is 4 engineers (2 mobile, 1 backend, 1 shared frontend and backend).
- No microservices at launch. We cannot operate a mesh.
- No Kubernetes. We will use a managed app host.
- iOS and Android from one codebase.
- Existing Okta tenant is the identity source of truth.
- Photos are evidence; they cannot live only on the phone.
- Greenfield product, but CityWorks remains the work-order system of record. Do not replace CityWorks in v1.

## Success

- Inspectors stop carrying paper packets.
- 95% of completed inspections are supervisor-visible within 15 minutes of reconnect.
- Zero inspections lost because a packet was left in a truck.
`;

export const CLINIC_BRIEF = `Our clinic's phones lock up from 7 to 8am because every same-day appointment is booked by whoever gets through first.`;

export const FARMER_BRIEF = `We want to build an app for farmers to track field activities.`;

export const FIELD_MANAGEMENT_BRIEF = `Build farmer field management.`;

export const ROADMAP_BRIEF = `20 proposed features
3 developers
8-week target`;

export const TRANSACTION_BRIEF = `Users can edit submitted transactions.`;

export const TRANSACTION_EXISTING = `Submitted transactions are immutable.`;

export const TRANSACTION_ARCHITECTURE = `Posted entries live in an append-only ledger.`;

export const DELETE_TX_BRIEF = `Users can delete transactions.`;

export const EXPORT_REPORTS_BRIEF = `Users should be able to export reports.`;

export const REPORT_EXPORT_BRIEF = `Improve report export.`;

export const REPORT_TEMPLATES_BRIEF = `Saved report templates.

Hypothesis:
Users will complete report creation faster
with saved report templates.

Experiment:
Prototype templates for 10 users.

Primary metric:
Time to create report.

Success threshold:
30% reduction.
`;

export const REPORT_EXPORT_EXISTING = `- 143 support requests
- 27% of users encountered the issue
- 3 related feature requests`;

export const REPORT_SIGNAL_BRIEF = `Product monitor for Report Export.`;

export const REPORT_SIGNAL_EXISTING = `Feature: Report Export

Conversion decreased 17%.

Potential causes:
- New UI introduced
- Export latency increased
- Error rate increased
`;

export const REPORT_USAGE_BRIEF = `Saved report templates launched. Usage is declining.`;

export const REPORT_USAGE_EXISTING = `Product analytics — last 14 days vs prior 14 days

Feature launched: Saved report templates

Events:
- report_created: 4,200 → 2,940 (−30%)
- template_applied: 1,100 → 620 (−44%)

Errors:
- template_load_failed: 18 → 140

User behavior:
- Time to create report rose from 4.2 min to 6.1 min
- Template picker abandoned on 41% of opens
`;

export const STRATEGY_BET_BRIEF = `Make saved report templates the 2026 product bet.

This is a product strategy change.
This changes scope: templates become a must-have.
This changes priority: templates move ahead of new report types.
This is a major roadmap decision: slip the Q4 export suite.
This is a production-impacting change: the live report creator switches to templates.
`;

export const BILLING_BRIEF = `Reduce failed payment completion. Do not redesign the whole billing portal.`;

export const OFFLINE_REPORTS_BRIEF = `Decision #142

Question:
Should we introduce offline report generation?

Options:
A. Fully offline
B. Queue and sync
C. Online only

Evidence:
Inspectors complete work in poor rural coverage.

Constraints:
CityWorks remains the work-order system of record.
iOS and Android from one codebase.

Risks:
A fully offline client can diverge from the official record.

Assumptions:
Field work happens without cell signal for a full shift.
Users will sync when they reconnect.

Decision:
B. Queue and sync

Reason:
Inspectors need to capture without signal. The official record still lands after reconnect. Fully offline keeps a second system of record.

Owner:
Product

Date:
2026-03-12
`;

export const LEDGER_OBJECT_BRIEF = `{
  "decisionId": "DEC-142",
  "question": "Should report generation require an internet connection?",
  "decision": "Online generation",
  "date": "2026-09-23",
  "assumptions": [
    {
      "id": "A-01",
      "statement": "Users usually have connectivity",
      "confidence": 0.72
    }
  ],
  "evidence": [
    {
      "type": "analytics",
      "metric": "offline_usage",
      "value": 8
    }
  ],
  "constraints": [
    "Limited local storage",
    "Reports can be large"
  ],
  "reviewTriggers": [
    "offline_usage > 25%",
    "support_requests_offline > 20"
  ],
  "status": "active"
}
`;

export const FACTS_LAYERS_BRIEF = `Observation:
8% of report requests currently happen offline.

Assumption:
Offline reporting is not a significant user need.

Decision:
Do not implement offline report generation.

Confidence:
Medium.
`;

export const FACTS_REEVAL_BRIEF = `${FACTS_LAYERS_BRIEF}
6 months later:
Offline usage increased 38%.
`;

export const COLLAPSED_CLAIM_BRIEF = `Assumption:
Users don't need offline reports.
`;

export const TRIGGERS_BRIEF = `Observation:
8% of report requests currently happen offline.

Assumption:
Offline reporting is not a significant user need.

Decision:
Do not implement offline report generation.

Confidence:
Medium.

Metric trigger
offline_usage > 25%

Feedback trigger
offline-related complaints > 20/month

Business trigger
New customer segment requires offline operation

Technical trigger
New sync infrastructure becomes available

Time trigger
Review decision after 90 days

Dependency trigger
Underlying API architecture changed
`;

export const TRIGGERS_METRIC_BRIEF = `${TRIGGERS_BRIEF}
Offline usage increased 38%.
`;

export const TRIGGERS_TIME_BRIEF = `${TRIGGERS_BRIEF}
6 months later.
`;

export const PIPELINE_BRIEF = `Decision #142

Question:
Should report generation require an internet connection?

Observation:
8% of report requests currently happen offline.

Assumption:
Offline usage is low.

Original:
8%

Current:
31%

Change:
+23 percentage points

Affected assumption:
A-01

Impact:
High

Re-evaluation:
Required

Decision:
Do not implement offline report generation.

Metric trigger
offline_usage > 25%
`;

export const HUMAN_OWNER_BRIEF = `Decision #142

Question:
Should report generation require an internet connection?

Original Decision:
Online report generation

Decision:
Online report generation

Assumption:
Connectivity is usually present

Changed Assumption:
Connectivity is usually present

Trigger:
Offline usage increased to 31%

Offline usage increased to 31%.

Impact:
High

Proposed Action:
Reconsider offline support

Confidence:
0.86

Metric trigger
offline_usage > 25%
`;

export const STATES_BRIEF = `${HUMAN_OWNER_BRIEF}

Decision states
ACTIVE
TRIGGERED
UNDER_REVIEW
VALIDATED
DECISION_CHANGED
DECISION_RETAINED

DEC-142
ACTIVE
  ↓
TRIGGERED
  ↓
UNDER_REVIEW
  ↓
DECISION_CHANGED
  ↓
DEC-207

Successor:
DEC-207
`;

export const SCORE_BRIEF = `${HUMAN_OWNER_BRIEF}

Evidence change:
0.90

Decision impact:
0.80

Business exposure:
0.75
`;

export const CHANGED_BRIEF = `Decision #142

Question:
Should report generation require an internet connection?

Decision title:
Offline Reporting

Original Decision:
Online report generation

Decision:
Online report generation

Observation:
8% of report requests currently happen offline.

Assumption:
Connectivity is usually available

Changed Assumption:
Connectivity is usually available

Affected assumption:
A-01

Original:
8%

Current:
31%

Change:
+23 percentage points

What changed:
Offline usage
8% → 31%

Support requests
4/month → 27/month

Customer segment
No enterprise requirement → Required

Trigger:
Offline usage increased to 31%

Impact:
High

Proposed Action:
Reconsider offline report generation.

Confidence:
0.86

Re-evaluation:
Required

Metric trigger
offline_usage > 25%
`;

export const VERSION_BRIEF = `DEC-142 v1
Decision:
Online reports

Reason:
Low offline usage

DEC-142 v2
Decision:
Support queued offline generation

Reason:
Offline usage increased
New synchronization infrastructure
Customer feedback
`;

export const LINEAGE_BRIEF = `Customer feedback:
Reports fail when the device is offline.

Evidence:
Offline usage increased.

Assumption:
Users can wait until they have a connection.

Decision:
Support queued offline generation

Feature:
Queued offline generation

Engineering:
Synchronize queued jobs when the device reconnects.

Product outcome:
Reports finish after the device reconnects.

New evidence:
Queued jobs complete after reconnect.
`;

export const OFFLINE_STALE_EXISTING = `Inspectors now have continuous LTE on every assigned route.
The assumption that field work happens without cell signal for a full shift no longer holds.
`;

export const OFFLINE_REEVAL_BRIEF = `Decision #142 should be re-checked.

Original assumption:
Users rarely need offline access.

6 months later:
Offline usage increased 38%.
`;

export const BILLING_EXISTING = `Billing portal — last 30 days

- 12,400 accounts reached the invoice page
- 61% opened an invoice
- 22% started payment
- 9% completed payment
- Support tags: "can't find the amount due" (840), "card failed and I don't know why" (510), "paid but still shows due" (390)
`;
