import type { Feature, FeatureRisk, FeatureRiskRegister, ProductPlan, RiskAnalysis, RiskKind, Story } from "./types";

export const RISK_NOTE =
  "Every feature has seven risk kinds. Each names the failure, the cause, the mitigation, and the residual uncertainty. A bare High is not a risk.";

export const RISK_KINDS: RiskKind[] = [
  "product",
  "technical",
  "security",
  "ux",
  "business",
  "compliance",
  "operational",
];

export const RISK_LABEL: Record<RiskKind, string> = {
  product: "Product Risk",
  technical: "Technical Risk",
  security: "Security Risk",
  ux: "UX Risk",
  business: "Business Risk",
  compliance: "Compliance Risk",
  operational: "Operational Risk",
};

function blank(kind: RiskKind): FeatureRisk {
  return {
    kind,
    risk: `No specific ${RISK_LABEL[kind].toLowerCase()} was named for this feature.`,
    cause: "The source does not describe this class of failure.",
    mitigation: "Do not invent a control. Keep the question open.",
    residual: `${RISK_LABEL[kind]} has not been validated.`,
  };
}

function card(kind: RiskKind, risk: string, cause: string, mitigation: string, residual: string): FeatureRisk {
  return { kind, risk, cause, mitigation, residual };
}

type Ctx = {
  feature: Feature;
  story?: Story;
  source: string;
  local: string;
  maturity: ProductPlan["maturity"];
};

function analyze(ctx: Ctx): FeatureRisk[] {
  const { source, local, maturity } = ctx;
  const deleteMoney = /\bdelete\b/i.test(source) && /\b(transactions?|payment|invoice|financial)\b/i.test(source);
  const deleteField = /\bdelete\b/i.test(local) && /\bfield\b/i.test(local);
  const offline = /\boffline\b/i.test(`${local} ${source}`) && /\bsync\b/i.test(source);
  const billing = /\b(payment|amount due|card failed|still shows due)\b/i.test(`${local} ${source}`);
  const retain = /\bretain\b|\b2 years\b|\baudit log\b/i.test(source);
  const photos = /\bphotos?\b/i.test(source) && /\bcannot live only on the phone\b/i.test(source);
  const exportWork = /\bexport\b/i.test(`${local} ${source}`);

  return RISK_KINDS.map((kind) => {
    if (kind === "product") {
      if (deleteMoney) {
        return card(
          kind,
          "Users may accidentally delete financial records.",
          "Destructive action has no recovery mechanism.",
          "Soft-delete + confirmation + audit history.",
          "Recovery requirements have not been validated.",
        );
      }
      if (deleteField) {
        return card(
          kind,
          "An operator may delete a field and its history by mistake.",
          "Delete removes the field and its activities.",
          "Confirmation is required. Ask whether a soft-delete is enough.",
          "Recovery requirements have not been validated.",
        );
      }
      if (maturity === "problem") {
        return card(
          kind,
          "The team may freeze the wrong workflow.",
          "The source states a problem and no solution.",
          "Hold the build until validation exits with a written decision.",
          "Who is affected, and which number should move, were not measured.",
        );
      }
    }

    if (kind === "technical") {
      if (deleteMoney && /append-only|immutable|ledger/i.test(source)) {
        return card(
          kind,
          "A hard delete fights the append-only ledger.",
          "Posted entries are immutable.",
          "Write a revision or a tombstone. Do not overwrite the posted row.",
          "The ledger policy for a delete was not updated.",
        );
      }
      if (offline) {
        return card(
          kind,
          "Offline capture and sync can diverge.",
          "The same record can change on two devices before reconnect.",
          "Keep the conflict question open. Do not invent a winner.",
          "Which version wins was not stated.",
        );
      }
    }

    if (kind === "security") {
      if (deleteMoney) {
        return card(
          kind,
          "A deleted record cannot be reconstructed.",
          "No recovery or audit step was named for the delete.",
          "Audit who deleted, when, and which record.",
          "Recovery requirements have not been validated.",
        );
      }
      if (photos) {
        return card(
          kind,
          "Evidence can disappear with the phone.",
          "Photos cannot live only on the device.",
          "Keep capture-and-sync as a must-have. Photos land in the official record.",
          "The store for photos after sync was not named.",
        );
      }
    }

    if (kind === "ux") {
      if (deleteMoney) {
        return card(
          kind,
          "A mis-tap can destroy a posted record.",
          "The source names delete and does not name a confirmation step.",
          "Confirmation before delete, then an audit history.",
          "The confirmation copy was not written.",
        );
      }
      if (deleteField) {
        return card(
          kind,
          "A mis-tap can retire a field the crew still uses.",
          "Delete is a destructive action on a working list.",
          "The confirm and cancel paths already sit in acceptance.",
          "Whether the crew sees a recovery path was not stated.",
        );
      }
      if (billing && /amount due/i.test(source)) {
        return card(
          kind,
          "The payer cannot see what they owe.",
          "Support already tags 'can't find the amount due'.",
          "The amount due is visible without searching the invoice.",
          "Whether that copy is enough was not tested with payers.",
        );
      }
    }

    if (kind === "business") {
      if (deleteMoney) {
        return card(
          kind,
          "Posted money can leave the books.",
          "A delete of a submitted transaction was requested.",
          "Keep the row. Hide it from the default view until finance confirms.",
          "Revenue impact of a delete was not measured.",
        );
      }
      if (billing && /paid but|still shows due/i.test(source)) {
        return card(
          kind,
          "A payment that succeeds still looks due.",
          "Support already tags paid-but-due.",
          "A completed payment clears the amount due before any new payment method.",
          "Revenue recovered after the fix was not measured.",
        );
      }
      if (/\bpacket\b/i.test(source) && /offline|inspection/i.test(local + source)) {
        return card(
          kind,
          "Inspections stay on paper and go missing.",
          "Packets are left in the truck.",
          "Offline capture for the shift, then sync when signal returns.",
          "The share of packets lost was not counted in this brief.",
        );
      }
    }

    if (kind === "compliance") {
      if (deleteMoney && /immutable|retain|ledger/i.test(source)) {
        return card(
          kind,
          "A financial record may leave the retention set.",
          "Immutability or retention was already stated.",
          "Soft-delete + confirmation + audit history.",
          "The retention rule for a deleted transaction was not stated.",
        );
      }
      if (retain && /inspection|audit/i.test(`${local} ${source}`)) {
        return card(
          kind,
          "An official record is changed without a trail.",
          "The source requires an audit log and a retention window.",
          "Keep retain and audit as must-haves.",
          "Who may export the audit log was not named.",
        );
      }
    }

    if (kind === "operational") {
      if (deleteMoney) {
        return card(
          kind,
          "Support cannot restore a posted row.",
          "No recovery mechanism was named.",
          "Restore from audit history after a soft-delete.",
          "Recovery requirements have not been validated.",
        );
      }
      if (/40-inspection|under 2 minutes/i.test(source) && /sync/i.test(local)) {
        return card(
          kind,
          "A 40-inspection day misses the sync window.",
          "The source requires a full day to finish syncing in under two minutes.",
          "Treat sync performance as a must-have, not a later polish.",
          "The device and the radio for that measure were not named.",
        );
      }
      if (exportWork) {
        return card(
          kind,
          "A large export can stall the session.",
          "Size and async work were not named.",
          "Ask whether the export is asynchronous before implementation.",
          "Maximum report size has not been validated.",
        );
      }
    }

    return blank(kind);
  });
}

export function emptyRiskAnalysis(): RiskAnalysis {
  return { note: RISK_NOTE, registers: [] };
}

export function buildRiskAnalysis(plan: ProductPlan): RiskAnalysis {
  const source = plan.sourceText;
  const registers: FeatureRiskRegister[] = plan.features.map((feature) => {
    const story = plan.stories.find((item) => item.featureId === feature.id);
    return {
      featureId: feature.id,
      feature: feature.name,
      risks: analyze({
        feature,
        story,
        source,
        local: `${feature.name} ${feature.outcome} ${story?.story ?? ""}`,
        maturity: plan.maturity,
      }),
    };
  });
  return { note: RISK_NOTE, registers };
}

export function riskAnalysisMarkdown(plan: ProductPlan) {
  if (!plan.riskAnalysis?.registers.length) return "No feature risk register was produced.";
  return plan.riskAnalysis.registers
    .map((register) => {
      const body = register.risks
        .map(
          (item) => `${RISK_LABEL[item.kind]}

Risk:
${item.risk}

Cause:
${item.cause}

Mitigation:
${item.mitigation}

Residual uncertainty:
${item.residual}`,
        )
        .join("\n\n");
      return `### ${register.feature}\n\n${body}`;
    })
    .join("\n\n");
}
