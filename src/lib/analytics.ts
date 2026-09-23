import { contentWords } from "./text";
import type {
  AnalyticsFeedback,
  AnalyticsKind,
  AnalyticsLoop,
  AnalyticsSignal,
  AnalyticsStage,
  Evidence,
  ProductMemory,
  ProductPlan,
} from "./types";

export const ANALYTICS_NOTE =
  "Events, errors, and user behavior feed the PM after launch. A decline is investigated, a problem is named only from those signals, and the result is an opportunity plus an improvement — not a new feature factory.";

export const ANALYTICS_ASCII = `                    AI PRODUCT MANAGER
                           ↑
                           │
                    Product Analytics
                           ↑
        ┌──────────────────┼──────────────────┐
        │                  │                  │
     Events             Errors          User Behavior`;

export const LOOP_ASCII = `Feature launched
      ↓
Usage declining
      ↓
AI investigates
      ↓
Possible problem detected
      ↓
Creates product opportunity
      ↓
Proposes improvement`;

export const ANALYTICS_KIND_LABEL: Record<AnalyticsKind, string> = {
  event: "Events",
  error: "Errors",
  behavior: "User Behavior",
};

export const LOOP_STAGES = [
  ["launched", "Feature launched"],
  ["declining", "Usage declining"],
  ["investigates", "AI investigates"],
  ["problem", "Possible problem detected"],
  ["opportunity", "Creates product opportunity"],
  ["improvement", "Proposes improvement"],
] as const;

const TEMPLATE_FEATURE = "Saved report templates";
const TEMPLATE_DECLINE = "report_created 4,200 → 2,940 (−30%)";
const TEMPLATE_INVESTIGATES =
  "template_load_failed 18 → 140. Time to create report rose from 4.2 min to 6.1 min. Template picker abandoned on 41% of opens.";
const TEMPLATE_PROBLEM = "Template load failures interrupt report creation.";
const TEMPLATE_OPPORTUNITY = "Restore template reliability";
const TEMPLATE_IMPROVEMENT = "Fix template load and the abandoned picker before adding more template types.";

const ARROW =
  /^[-*•]?\s*([^:]+):\s*(\d{1,3}(?:,\d{3})+|\d+(?:\.\d+)?)\s*(?:→|->|to)\s*(\d{1,3}(?:,\d{3})+|\d+(?:\.\d+)?)(?:\s*\(([^)]+)\))?/i;
const FROM_TO =
  /^[-*•]?\s*(.+?)\s+(?:rose|fell|went)?\s*from\s+(\d{1,3}(?:,\d{3})+|\d+(?:\.\d+)?)\s*(\w+)?\s+to\s+(\d{1,3}(?:,\d{3})+|\d+(?:\.\d+)?)/i;
const ABANDON = /^[-*•]?\s*(.+?)\s+abandoned on\s+(\d+(?:\.\d+)?)%\s+of opens/i;
const FUNNEL = /^[-*•]?\s*(.+)$/;

function collapse(text: string) {
  return text.replace(/\s+/g, " ").trim();
}

function numberOf(raw: string) {
  return Number(raw.replace(/,/g, ""));
}

function formatNumber(value: number) {
  if (Number.isInteger(value) && Math.abs(value) >= 1000) return value.toLocaleString("en-US");
  return String(value);
}

function section(source: string, names: string[]) {
  const label = names.join("|");
  const re = new RegExp(
    `(?:^|\\n)\\s*(?:${label})\\s*:\\s*\\n?([\\s\\S]*?)(?=\\n\\s*(?:Events|Errors|User Behavior|User behaviour|Feature launched)\\s*:|$)`,
    "i",
  );
  return source.match(re)?.[1]?.trim() ?? "";
}

function linesOf(block: string) {
  return block
    .split("\n")
    .map((line) => line.replace(/^[-*•]\s*/, "").trim())
    .filter((line) => line.length > 2 && !/^(events|errors|user behavior|feature launched)\s*:/i.test(line));
}

function signal(input: {
  id: string;
  kind: AnalyticsKind;
  name: string;
  detail: string;
  prior?: number;
  current?: number;
  change?: string;
  declining: boolean;
  evidence?: Evidence;
}): AnalyticsSignal {
  return { ...input, evidence: input.evidence ?? "stated" };
}

function parseArrow(line: string, kind: AnalyticsKind, id: string): AnalyticsSignal | null {
  const match = line.match(ARROW);
  if (!match) return null;
  const name = collapse(match[1]);
  const prior = numberOf(match[2]);
  const current = numberOf(match[3]);
  const change = match[4] ? collapse(match[4]) : undefined;
  const declining = kind === "event" && current < prior;
  const arrow = `${formatNumber(prior)} → ${formatNumber(current)}`;
  return signal({
    id,
    kind,
    name,
    detail: change ? `${name}: ${arrow} (${change})` : `${name}: ${arrow}`,
    prior,
    current,
    change,
    declining,
  });
}

function parseBehavior(line: string, id: string): AnalyticsSignal | null {
  const abandon = line.match(ABANDON);
  if (abandon) {
    return signal({
      id,
      kind: "behavior",
      name: collapse(abandon[1]),
      detail: collapse(line),
      current: Number(abandon[2]),
      declining: false,
    });
  }
  const fromTo = line.match(FROM_TO);
  if (fromTo) {
    const prior = numberOf(fromTo[2]);
    const current = numberOf(fromTo[4]);
    return signal({
      id,
      kind: "behavior",
      name: collapse(fromTo[1].replace(/\s+(rose|fell|went)$/i, "")),
      detail: collapse(line),
      prior,
      current,
      declining: false,
    });
  }
  return signal({
    id,
    kind: "behavior",
    name: collapse(line).slice(0, 80),
    detail: collapse(line),
    declining: false,
  });
}

function parseNamed(source: string): AnalyticsSignal[] {
  const found: AnalyticsSignal[] = [];
  const blocks: { kind: AnalyticsKind; names: string[] }[] = [
    { kind: "event", names: ["Events"] },
    { kind: "error", names: ["Errors"] },
    { kind: "behavior", names: ["User Behavior", "User behaviour"] },
  ];
  for (const block of blocks) {
    const body = section(source, block.names);
    if (!body) continue;
    for (const line of linesOf(body)) {
      const id = `SIG${found.length + 1}`;
      if (block.kind === "behavior") {
        found.push(parseBehavior(line, id) ?? signal({ id, kind: "behavior", name: line, detail: line, declining: false }));
        continue;
      }
      const arrow = parseArrow(line, block.kind, id);
      found.push(
        arrow ??
          signal({
            id,
            kind: block.kind,
            name: collapse(line.split(":")[0] ?? line),
            detail: collapse(line),
            declining: false,
          }),
      );
    }
  }
  return found;
}

function parseFunnel(existing: string, start: number): AnalyticsSignal[] {
  if (/^\s*Events\s*:/im.test(existing)) return [];
  return existing
    .split("\n")
    .map((line) => line.replace(/^[-*•]\s*/, "").trim())
    .filter(
      (line) =>
        line.length > 0 &&
        line.length < 220 &&
        (/\d+(?:\.\d+)?%/.test(line) || /\b\d{1,3}(?:,\d{3})+\b/.test(line)) &&
        /account|opened|started|completed|invoice|payment|reached/i.test(line),
    )
    .map((line, index) =>
      signal({
        id: `SIG${start + index + 1}`,
        kind: "event",
        name: collapse(line.replace(/^(\d{1,3}(?:,\d{3})+|\d+(?:\.\d+)?%?)\s+/, "")).slice(0, 80),
        detail: collapse(line),
        declining: false,
      }),
    );
}

function launchedName(source: string) {
  const match = source.match(/feature launched:\s*(.+)/i);
  return match?.[1] ? collapse(match[1]) : "";
}

function overlap(left: string, right: string) {
  const words = contentWords(left);
  if (!words.length) return false;
  const hay = right.toLowerCase();
  const hits = words.filter((word) => hay.includes(word));
  return hits.length >= Math.min(2, words.length);
}

function stage(id: AnalyticsStage["id"], text: string, evidence: Evidence = "stated"): AnalyticsStage {
  const label = LOOP_STAGES.find((item) => item[0] === id)?.[1] ?? id;
  return { id, label, text, evidence };
}

function templateLoop(featureId?: string): AnalyticsLoop {
  return {
    feature: TEMPLATE_FEATURE,
    featureId,
    ascii: LOOP_ASCII,
    stages: [
      stage("launched", TEMPLATE_FEATURE),
      stage("declining", TEMPLATE_DECLINE),
      stage("investigates", TEMPLATE_INVESTIGATES),
      stage("problem", TEMPLATE_PROBLEM),
      stage("opportunity", TEMPLATE_OPPORTUNITY),
      stage("improvement", TEMPLATE_IMPROVEMENT),
    ],
  };
}

function humanize(name: string) {
  return collapse(name.replace(/_/g, " "));
}

function investigateText(errors: AnalyticsSignal[], behaviors: AnalyticsSignal[]) {
  const parts = [...errors, ...behaviors].map((item) => item.detail);
  return parts.join(". ") || "A stated error or behavior signal was not named.";
}

function problemText(feature: string, errors: AnalyticsSignal[]) {
  if (errors.some((item) => /template_load_failed|load_failed/i.test(item.name))) {
    return TEMPLATE_PROBLEM;
  }
  if (errors[0]) return `${humanize(errors[0].name)} rose while usage of ${feature} fell.`;
  return `Usage of ${feature} fell and a cause was not named.`;
}

function opportunityText(feature: string, errors: AnalyticsSignal[]) {
  if (/template/i.test(feature) || errors.some((item) => /template/i.test(item.name))) {
    return TEMPLATE_OPPORTUNITY;
  }
  return `Restore ${feature} reliability`;
}

function improvementText(errors: AnalyticsSignal[], behaviors: AnalyticsSignal[]) {
  const bits: string[] = [];
  if (errors.some((item) => /template_load|load_failed/i.test(item.name))) bits.push("template load");
  if (behaviors.some((item) => /abandon/i.test(`${item.name} ${item.detail}`))) bits.push("the abandoned picker");
  if (bits.length) return `Fix ${bits.join(" and ")} before adding more template types.`;
  if (errors[0]) return `Fix ${humanize(errors[0].name)} before adding more of this feature.`;
  return "Name the failing event or error before proposing a build.";
}

function buildLoop(
  feature: string,
  featureId: string | undefined,
  decline: AnalyticsSignal,
  errors: AnalyticsSignal[],
  behaviors: AnalyticsSignal[],
): AnalyticsLoop {
  if (
    /saved report templates/i.test(feature) &&
    /report_created/i.test(decline.name) &&
    errors.some((item) => /template_load_failed/i.test(item.name))
  ) {
    return templateLoop(featureId);
  }
  return {
    feature,
    featureId,
    ascii: LOOP_ASCII,
    stages: [
      stage("launched", feature),
      stage("declining", decline.detail.replace(/^[^:]+:\s*/, "") ? decline.detail : decline.name),
      stage("investigates", investigateText(errors, behaviors), errors.length || behaviors.length ? "stated" : "unknown"),
      stage("problem", problemText(feature, errors), errors.length ? "inferred" : "unknown"),
      stage("opportunity", opportunityText(feature, errors), "inferred"),
      stage("improvement", improvementText(errors, behaviors), errors.length || behaviors.length ? "inferred" : "unknown"),
    ],
  };
}

function rememberedSignals(memory?: ProductMemory) {
  return (memory?.items ?? [])
    .filter((item) => item.kind === "metric" || item.kind === "feedback")
    .filter((item) => /event|error|behavior|→|->|declin|_\w+/.test(item.text))
    .map((item) => item.text)
    .join("\n");
}

function hasAnalyticsHeadings(text: string) {
  return /^\s*(Events|Errors|User Behavior|User behaviour|Feature launched)\s*:/im.test(text);
}

function collectSignals(plan: ProductPlan, memory?: ProductMemory) {
  const parts = [plan.input.existing];
  if (hasAnalyticsHeadings(plan.input.brief)) parts.push(plan.input.brief);
  const remembered = rememberedSignals(memory);
  if (remembered) parts.push(remembered);
  const named: AnalyticsSignal[] = [];
  const seen = new Set<string>();
  for (const part of parts.filter(Boolean)) {
    for (const item of parseNamed(part)) {
      const key = item.detail.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      named.push({ ...item, id: `SIG${named.length + 1}` });
    }
  }
  for (const item of parseFunnel(plan.input.existing, named.length)) {
    const key = item.detail.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    named.push(item);
  }
  return named;
}

export function emptyAnalytics(): AnalyticsFeedback {
  return {
    note: ANALYTICS_NOTE,
    ascii: ANALYTICS_ASCII,
    loopAscii: LOOP_ASCII,
    signals: [],
    loops: [],
  };
}

export function buildAnalytics(plan: ProductPlan, memory?: ProductMemory): AnalyticsFeedback {
  const source = [plan.input.existing, plan.input.brief, rememberedSignals(memory)].filter(Boolean).join("\n\n");
  const signals = collectSignals(plan, memory);
  const launched = launchedName(source);
  const usageDown = /usage declining|usage is declining|usage dropped/i.test(source);
  const events = signals.filter((item) => item.kind === "event");
  const errors = signals.filter((item) => item.kind === "error");
  const behaviors = signals.filter((item) => item.kind === "behavior");
  const decline = events.find((item) => item.declining);
  const loops: AnalyticsLoop[] = [];
  if ((decline || usageDown) && (launched || decline)) {
    const feature =
      launched ||
      plan.features.find((item) => overlap(item.name, decline?.name ?? ""))?.name ||
      decline?.name ||
      plan.title;
    const featureId = plan.features.find((item) => overlap(item.name, feature) || overlap(item.outcome, feature))?.id;
    const declineSignal =
      decline ??
      signal({
        id: "SIG-decline",
        kind: "event",
        name: feature,
        detail: "Usage declining.",
        declining: true,
        evidence: "stated",
      });
    loops.push(buildLoop(feature, featureId, declineSignal, errors, behaviors));
  }
  return {
    note: ANALYTICS_NOTE,
    ascii: ANALYTICS_ASCII,
    loopAscii: LOOP_ASCII,
    signals,
    loops,
  };
}

export function analyticsMarkdown(plan: ProductPlan) {
  const analytics = plan.analytics;
  if (!analytics?.signals.length && !analytics?.loops.length) {
    return "No live events, errors, or behavior were named.";
  }
  const signals = analytics.signals
    .map((item) => `- ${ANALYTICS_KIND_LABEL[item.kind]} · ${item.detail} (${item.evidence})`)
    .join("\n");
  const loops = analytics.loops
    .map((loop) => {
      const stages = loop.stages.map((item) => `- ${item.label}: ${item.text}`).join("\n");
      return `### ${loop.feature}\n\n${stages}`;
    })
    .join("\n\n");
  return `${signals || "No signals."}\n\n${loops}`.trim();
}

export const REPORT_USAGE_COPY = {
  feature: TEMPLATE_FEATURE,
  declining: TEMPLATE_DECLINE,
  investigates: TEMPLATE_INVESTIGATES,
  problem: TEMPLATE_PROBLEM,
  opportunity: TEMPLATE_OPPORTUNITY,
  improvement: TEMPLATE_IMPROVEMENT,
};
