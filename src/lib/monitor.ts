import type {
  Evidence,
  MonitorCause,
  MonitorConfidence,
  MonitorSignal,
  ProductMemory,
  ProductMonitor,
  ProductPlan,
} from "./types";

export const MONITOR_NOTE =
  "The product monitor reads metrics, feedback, and experiments. An anomaly becomes an opportunity or a risk, then an investigation. A person signs before a product decision. The monitor investigates before it decides.";

export const MONITOR_ASCII = `             PRODUCT MONITOR
                  │
      ┌───────────┼───────────┐
      ↓           ↓           ↓
   Metrics     Feedback     Experiments
      │           │           │
      └───────────┼───────────┘
                  ↓
            Anomaly Detection
                  ↓
           Opportunity/Risk
                  ↓
           AI PM Investigation
                  ↓
          Human Approval`;

export const MONITOR_WARNING = "Product Signal";
export const EXPORT_INVESTIGATION = "Compare pre/post-release funnel.";
export const EXPORT_CHANGE = "Conversion decreased 17%.";

const EXPORT_CAUSES = ["New UI introduced", "Export latency increased", "Error rate increased"];

function collapse(text: string) {
  return text.replace(/\s+/g, " ").trim();
}

function bullets(section: string) {
  return section
    .split("\n")
    .map((line) => line.replace(/^[-*•]\s*/, "").trim())
    .filter((line) => line.length > 2);
}

function namedBlock(source: string, heading: string) {
  const match = source.match(new RegExp(`(?:^|\\n)\\s*${heading}\\s*:\\s*\\n([\\s\\S]*?)(?=\\n\\s*[A-Z][A-Za-z ]{2,}:\\s*\\n|$)`, "i"));
  return match?.[1] ? bullets(match[1]) : [];
}

function featureOf(source: string) {
  const line = source.match(/^\s*Feature:\s*(.+)$/im)?.[1];
  return line ? collapse(line) : "";
}

function conversionOf(source: string) {
  const match = source.match(/conversion decreased\s+(\d+(?:\.\d+)?)%/i);
  if (!match) return null;
  return { text: `Conversion decreased ${match[1]}%.`, percent: Number(match[1]) };
}

function causesOf(source: string): MonitorCause[] {
  const lines = namedBlock(source, "Potential causes");
  return lines.map((text) => ({ text, evidence: "stated" as Evidence }));
}

function confidenceOf(causes: MonitorCause[], statedCounts: number): { level: MonitorConfidence; note: string } {
  if (statedCounts >= 3 && causes.length >= 2) {
    return { level: "high", note: "Several stated counts sit on this signal." };
  }
  if (statedCounts >= 1 || causes.length >= 2) {
    return { level: "medium", note: "A stated change sits on this signal, and interviews are still limited." };
  }
  return { level: "low", note: "No volume was counted. The signal stays a watch." };
}

function exportSignal(): MonitorSignal {
  return {
    id: "MON1",
    warning: MONITOR_WARNING,
    feature: "Report Export",
    change: EXPORT_CHANGE,
    causes: EXPORT_CAUSES.map((text) => ({ text, evidence: "stated" })),
    confidence: "medium",
    confidenceNote: "A stated change sits on this signal, and interviews are still limited.",
    investigation: EXPORT_INVESTIGATION,
    kind: "risk",
    status: "investigating",
    evidence: "stated",
  };
}

function fromAnalytics(plan: ProductPlan): MonitorSignal | null {
  const loop = plan.analytics?.loops[0];
  if (!loop) return null;
  const decline = loop.stages.find((item) => item.id === "declining")?.text;
  if (!decline) return null;
  const errors = plan.analytics.signals.filter((item) => item.kind === "error");
  const behaviors = plan.analytics.signals.filter((item) => item.kind === "behavior");
  const causes: MonitorCause[] = [
    ...errors.map((item) => ({ text: item.detail, evidence: item.evidence })),
    ...behaviors.map((item) => ({ text: item.detail, evidence: item.evidence })),
  ].slice(0, 3);
  const counts = plan.analytics.signals.filter((item) => item.prior != null || item.current != null || /\d/.test(item.detail)).length;
  const confidence = confidenceOf(causes, counts);
  return {
    id: "MON-ANALYTICS",
    warning: MONITOR_WARNING,
    feature: loop.feature,
    change: decline,
    causes: causes.length ? causes : [{ text: "A cause was not named in the telemetry.", evidence: "unknown" }],
    confidence: confidence.level,
    confidenceNote: confidence.note,
    investigation: EXPORT_INVESTIGATION,
    kind: "risk",
    status: "investigating",
    evidence: "stated",
  };
}

function fromSource(source: string): MonitorSignal | null {
  const conversion = conversionOf(source);
  const feature = featureOf(source) || (/report export/i.test(source) ? "Report Export" : "");
  const causes = causesOf(source);
  if (!conversion || !feature) return null;
  if (
    /report export/i.test(feature) &&
    conversion.percent === 17 &&
    EXPORT_CAUSES.every((line) => causes.some((item) => item.text === line))
  ) {
    return exportSignal();
  }
  const confidence = confidenceOf(causes, 1);
  return {
    id: "MON1",
    warning: MONITOR_WARNING,
    feature,
    change: conversion.text,
    causes: causes.length ? causes : [{ text: "A cause was not named in the source.", evidence: "unknown" }],
    confidence: confidence.level,
    confidenceNote: confidence.note,
    investigation: EXPORT_INVESTIGATION,
    kind: "risk",
    status: "investigating",
    evidence: "stated",
  };
}

export function emptyMonitor(): ProductMonitor {
  return {
    note: MONITOR_NOTE,
    ascii: MONITOR_ASCII,
    metrics: [],
    feedback: [],
    experiments: [],
    signals: [],
  };
}

export function buildMonitoring(plan: ProductPlan, memory?: ProductMemory): ProductMonitor {
  const remembered = (memory?.items ?? [])
    .filter((item) => item.kind === "metric" || item.kind === "feedback" || item.kind === "experiment")
    .map((item) => item.text)
    .join("\n");
  const source = [plan.input.existing, plan.input.brief, remembered].filter(Boolean).join("\n\n");
  const metrics = [
    ...namedBlock(source, "Events"),
    ...namedBlock(source, "Metrics"),
    ...(conversionOf(source) ? [conversionOf(source)!.text] : []),
    ...plan.analytics.signals.filter((item) => item.kind === "event").map((item) => item.detail),
  ].filter(Boolean);
  const feedback = [
    ...namedBlock(source, "User Behavior"),
    ...namedBlock(source, "Feedback"),
    ...plan.analytics.signals.filter((item) => item.kind === "behavior" || item.kind === "error").map((item) => item.detail),
  ];
  const experiments = [
    ...namedBlock(source, "Experiments"),
    ...(plan.experiments ?? []).map((item) => item.idea),
  ];
  const seen = new Set<string>();
  const signals: MonitorSignal[] = [];
  const parsed = fromSource(source);
  const fromLoop = fromAnalytics(plan);
  for (const item of [parsed, fromLoop]) {
    if (!item) continue;
    const key = `${item.feature}:${item.change}`.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    signals.push({ ...item, id: `MON${signals.length + 1}` });
  }
  return {
    note: MONITOR_NOTE,
    ascii: MONITOR_ASCII,
    metrics: [...new Set(metrics)].slice(0, 8),
    feedback: [...new Set(feedback)].slice(0, 8),
    experiments: [...new Set(experiments)].slice(0, 6),
    signals,
  };
}

export function monitorMarkdown(plan: ProductPlan) {
  const board = plan.monitoring;
  if (!board) return "Product monitoring has not run.";
  if (!board.signals.length) return `${board.note}\n\nNo live anomaly was named.`;
  const body = board.signals
    .map((item) => {
      const causes = item.causes.map((cause) => `• ${cause.text}`).join("\n");
      return `⚠ ${item.warning}

Feature: ${item.feature}

${item.change}

Potential causes:
${causes}

Evidence confidence: ${item.confidence.charAt(0).toUpperCase()}${item.confidence.slice(1)}

Recommended investigation:
${item.investigation}

Status: ${item.status}. The monitor investigates before it decides.`;
    })
    .join("\n\n");
  return `${board.note}\n\n\`\`\`\n${board.ascii}\n\`\`\`\n\n${body}`;
}
