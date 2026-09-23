import { FIELD_THEMES } from "./field-management";
import { scorePriorities } from "./prioritize";
import { clip, lowerFirst } from "./text";
import type {
  Decision,
  Feature,
  Judgment,
  Lane,
  Milestone,
  Priority,
  PriorityItem,
  Requirement,
  Story,
  StoryTask,
} from "./types";

const THEMES: { key: string; name: string; rank: number; test: RegExp }[] = [
  ...FIELD_THEMES,
  { key: "fields", name: "Fields", rank: 1, test: /\bname the fields\b|\bfields on a farm\b/i },
  { key: "activity", name: "Activity log", rank: 2, test: /\blog a field activity\b/i },
  { key: "history", name: "Field history", rank: 3, test: /\bfield's activities\b|newest to oldest/i },
  { key: "access", name: "Access", rank: 1, test: /\b(sso|okta|login|sign-?in|auth|permission)\b/i },
  { key: "audit", name: "Audit and retention", rank: 7, test: /\b(audit|retain|retention)\b/i },
  { key: "evidence", name: "Evidence", rank: 3, test: /\b(photo|signature|attachment|camera)\b/i },
  { key: "sync", name: "Sync", rank: 4, test: /\bsync|reconnect|connectivity returns/i },
  { key: "offline", name: "Offline capture", rank: 2, test: /\boffline|no cell|no signal/i },
  { key: "capture", name: "Structured capture", rank: 2, test: /\b(finding|checklist|structured)\b/i },
  { key: "review", name: "Review", rank: 5, test: /\b(review|approve|rework)\b/i },
  { key: "report", name: "Reporting", rank: 6, test: /\b(pdf|report|export)\b/i },
  { key: "map", name: "Day map", rank: 9, test: /\bmap\b|\bpins?\b/i },
  { key: "integration", name: "System of record", rank: 8, test: /cityworks|system of record|work-order status/i },
  { key: "payment", name: "Payment completion", rank: 3, test: /\b(pay|paid|payment|invoice|card|billing|amount due)\b/i },
  { key: "notify", name: "Notifications", rank: 8, test: /\b(notif|alert|sms|email)\b/i },
];

function shortName(statement: string) {
  const cut = statement.split(/\bso that\b|\bso\b|,/)[0]?.trim() || statement;
  const words = cut.split(/\s+/).slice(0, 5);
  const name = words.join(" ");
  return name.charAt(0).toUpperCase() + name.slice(1);
}

function scopeOf(reqs: Requirement[]): Priority {
  if (reqs.some((item) => item.priority === "must")) return "must";
  if (reqs.some((item) => item.priority === "should")) return "should";
  return "later";
}

function featuresFrom(judgment: Judgment): Feature[] {
  if (judgment.maturity === "problem") {
    return [
      {
        id: "F1",
        name: "Validate the problem",
        outcome: "Answer the open questions by watching the people named above do the job.",
        requirementIds: judgment.requirements.map((item) => item.id),
        scope: "must",
        rank: 1,
      },
      {
        id: "F2",
        name: "Commit a solution bet",
        outcome: "Choose the smallest workflow only after validation. No build scope yet.",
        requirementIds: [],
        scope: "later",
        rank: 9,
      },
    ];
  }

  const groups = new Map<string, { name: string; rank: number; reqs: Requirement[] }>();
  const order: string[] = [];

  for (const requirement of judgment.requirements) {
    const theme = THEMES.find((item) => item.test.test(requirement.statement));
    const key = theme?.key ?? `solo-${requirement.id}`;
    const name = theme?.name ?? shortName(requirement.statement);
    const rank = theme?.rank ?? 6;
    const existing = groups.get(key);
    if (existing) {
      existing.reqs.push(requirement);
      continue;
    }
    groups.set(key, { name, rank, reqs: [requirement] });
    order.push(key);
  }

  return order.map((key, index) => {
    const group = groups.get(key)!;
    const scope = scopeOf(group.reqs);
    return {
      id: `F${index + 1}`,
      name: group.name,
      outcome: group.reqs.map((item) => item.statement).join(" "),
      requirementIds: group.reqs.map((item) => item.id),
      scope,
      rank: group.rank,
    };
  });
}

function dominantPersona(reqs: Requirement[], fallback: string) {
  const counts = new Map<string, number>();
  for (const requirement of reqs) {
    counts.set(requirement.persona, (counts.get(requirement.persona) ?? 0) + 1);
  }
  let best = fallback;
  let bestCount = 0;
  for (const [persona, count] of counts) {
    if (count > bestCount) {
      best = persona;
      bestCount = count;
    }
  }
  return best;
}

function lanesFor(text: string): Lane[] {
  const lanes: Lane[] = [];
  if (/\boffline|ios|android|mobile|photo|signature|screen|map|visible|amount due|invoice\b/i.test(text)) {
    lanes.push("client");
  }
  if (/\bsync|sso|okta|pdf|audit|retain|server|paid|payment|card|integration|cityworks|api\b/i.test(text)) {
    lanes.push("backend");
  }
  if (!lanes.length) lanes.push("client");
  return lanes;
}

function tasksFor(
  feature: Feature,
  reqs: Requirement[],
  maturity: Judgment["maturity"],
  nextId: () => string,
): StoryTask[] {
  if (maturity === "problem" && feature.id === "F1") {
    return [
      {
        id: nextId(),
        lane: "product",
        title: "Sit with the people named above and record what they do today.",
      },
      {
        id: nextId(),
        lane: "product",
        title: "Write the decision: build a specific workflow, or stop.",
      },
    ];
  }
  if (maturity === "problem") {
    return [
      {
        id: nextId(),
        lane: "product",
        title: "Hold this until validation exits. Then write the bet in one page.",
      },
    ];
  }

  const text = [feature.name, feature.outcome, ...reqs.map((item) => item.statement)].join(" ");
  const tasks: StoryTask[] = lanesFor(text).map((lane) => ({
    id: nextId(),
    lane,
    title:
      lane === "client"
        ? `Build the ${feature.name} experience: ${clip(reqs[0]?.statement ?? feature.outcome, 110)}`
        : `Build the ${feature.name} service path: ${clip(reqs.at(-1)?.statement ?? feature.outcome, 110)}`,
  }));
  tasks.push({
    id: nextId(),
    lane: "qa",
    title: `Verify ${feature.name} against every acceptance line.`,
  });
  return tasks;
}

function storiesFrom(judgment: Judgment, features: Feature[]): Story[] {
  const byId = new Map(judgment.requirements.map((item) => [item.id, item]));
  const fallback = judgment.personas[0]?.role ?? "Primary user";
  const soThat = judgment.problem.success[0] ?? "the current workaround is no longer required";
  let taskCount = 0;
  const nextId = () => {
    taskCount += 1;
    return `T${taskCount}`;
  };

  return features.map((feature, index) => {
    const reqs = feature.requirementIds.map((id) => byId.get(id)).filter((item): item is Requirement => Boolean(item));
    const persona = dominantPersona(reqs, fallback);
    const article = /^all\b/i.test(persona) ? "" : /^[aeiou]/i.test(persona) ? "an " : "a ";
    const want = reqs[0]?.statement ?? feature.outcome;
    const acceptance =
      feature.id === "F2" && judgment.maturity === "problem"
        ? [
            "Validation has exited with a written decision.",
            "Open questions are answered, or accepted as assumptions the architect can see.",
          ]
        : reqs.map((item) => item.statement);
    return {
      id: `S${index + 1}`,
      featureId: feature.id,
      persona,
      story: `As ${article}${persona}, I want ${lowerFirst(want)}, so that ${lowerFirst(soThat).replace(/\.$/, "")}.`,
      acceptance,
      tasks: tasksFor(feature, reqs, judgment.maturity, nextId),
      tests: [],
    };
  });
}

function byRank(features: Feature[]) {
  return [...features].sort((a, b) => a.rank - b.rank || a.id.localeCompare(b.id));
}

function milestonesFrom(judgment: Judgment, features: Feature[], priorities: PriorityItem[]): Milestone[] {
  const decisionOf = new Map(priorities.map((item) => [item.featureId, item.decision]));
  const now = byRank(features.filter((feature) => decisionOf.get(feature.id) === "now"));
  const next = byRank(features.filter((feature) => decisionOf.get(feature.id) === "next"));
  const later = byRank(features.filter((feature) => decisionOf.get(feature.id) === "later"));

  const milestones: Milestone[] = [];
  const primary = judgment.personas[0]?.role ?? "the primary user";

  if (judgment.maturity === "problem") {
    if (now.length) {
      milestones.push({
        id: "M1",
        name: "Validate",
        goal: `Learn whether ${primary} still has this problem, and what done would mean.`,
        featureIds: now.map((feature) => feature.id),
        exitCriteria: [
          "The open questions have answers from the people involved, or an explicit assumption.",
          "The team has a written decision to build or to stop.",
        ],
      });
    }
    if (later.length) {
      milestones.push({
        id: "M2",
        name: "Solution bet",
        goal: "Turn a confirmed problem into a one-page bet the architect can design.",
        featureIds: later.map((feature) => feature.id),
        exitCriteria: ["A solution is chosen, or the work is closed."],
      });
    }
    return milestones;
  }

  const m1 = now.slice(0, 4);
  const m1Ids = new Set(m1.map((feature) => feature.id));
  const m2 = now.filter((feature) => !m1Ids.has(feature.id));

  const criteria = (items: Feature[]) =>
    items.map((feature) => `${feature.name}: ${clip(feature.outcome, 140)}`);

  if (m1.length) {
    milestones.push({
      id: "M1",
      name: "Core loop",
      goal: `${primary} can finish the job once, including the hardest path the source requires.`,
      featureIds: m1.map((feature) => feature.id),
      exitCriteria: criteria(m1),
    });
  }
  if (m2.length) {
    milestones.push({
      id: "M2",
      name: "Make the record official",
      goal: "The result of the core loop becomes reviewable, reportable, and kept.",
      featureIds: m2.map((feature) => feature.id),
      exitCriteria: criteria(m2),
    });
  }
  if (next.length) {
    milestones.push({
      id: milestones.length === 0 ? "M1" : `M${milestones.length + 1}`,
      name: "Next",
      goal: "Expand only after the must-have loop is in use.",
      featureIds: next.map((feature) => feature.id),
      exitCriteria: criteria(next),
    });
  }
  if (later.length) {
    milestones.push({
      id: `M${milestones.length + 1}`,
      name: "Later",
      goal: "Held out of the current release.",
      featureIds: later.map((feature) => feature.id),
      exitCriteria: ["Revisit only after the earlier milestones exit."],
    });
  }
  return milestones;
}

export function breakDown(judgment: Judgment) {
  const features = featuresFrom(judgment);
  const stories = storiesFrom(judgment, features);
  const priorities = scorePriorities(judgment, features);
  const milestones = milestonesFrom(judgment, features, priorities);
  return { features, stories, priorities, milestones };
}
