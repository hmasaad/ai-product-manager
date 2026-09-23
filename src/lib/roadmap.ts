import { scorePriorities } from "./prioritize";
import type {
  Feature,
  Judgment,
  Milestone,
  ProductPlan,
  Roadmap,
  RoadmapPlacement,
  RoadmapSprint,
  Story,
} from "./types";

export const ROADMAP_BRIEF = `20 proposed features
3 developers
8-week target`;

export const SPRINT_WEEKS = 2;
export const FEATURE_EFFORT = 2;

export const PROPOSED_FEATURES: { name: string; dependsOn: string[] }[] = [
  { name: "Authentication", dependsOn: [] },
  { name: "User Profile", dependsOn: ["Authentication"] },
  { name: "Core Data Model", dependsOn: [] },
  { name: "Field Creation", dependsOn: ["Authentication", "Core Data Model"] },
  { name: "Field Editing", dependsOn: ["Field Creation"] },
  { name: "Field Details", dependsOn: ["Field Creation"] },
  { name: "Activities", dependsOn: ["Field Details"] },
  { name: "History", dependsOn: ["Activities"] },
  { name: "Reporting", dependsOn: ["History"] },
  { name: "Field Deletion", dependsOn: ["Field Details"] },
  { name: "Analytics", dependsOn: ["History"] },
  { name: "Team Invites", dependsOn: ["User Profile"] },
  { name: "Notifications", dependsOn: ["User Profile", "Activities"] },
  { name: "Offline Capture", dependsOn: ["Core Data Model", "Activities"] },
  { name: "Photo Evidence", dependsOn: ["Activities"] },
  { name: "Map", dependsOn: ["Field Details"] },
  { name: "Export", dependsOn: ["Reporting"] },
  { name: "Permissions", dependsOn: ["Authentication", "User Profile"] },
  { name: "Audit Log", dependsOn: ["Authentication", "Core Data Model"] },
  { name: "Search", dependsOn: ["Field Details", "Activities"] },
];

type Node = {
  id: string;
  name: string;
  order: number;
  dependsOn: string[];
};

export function readCapacity(text: string) {
  const developers = text.match(/\b(\d+)\s+(?:developers?|engineers?)\b/i);
  const weeks = text.match(/\b(\d+)\s*-?\s*weeks?\b/i);
  return {
    developers: developers ? Number(developers[1]) : null,
    weeks: weeks ? Number(weeks[1]) : null,
  };
}

export function isCapacityRoadmap(text: string) {
  const capacity = readCapacity(text);
  return (
    /\b20\s+proposed features\b/i.test(text) && capacity.developers !== null && capacity.weeks !== null
  );
}

function joinNames(names: string[]) {
  if (names.length <= 1) return names[0] ?? "";
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

function tree(groups: { name: string; children: string[] }[]) {
  return groups
    .map((group) => {
      const lines = group.children.map(
        (child, index) => `${index === group.children.length - 1 ? " └──" : " ├──"} ${child}`,
      );
      return [group.name, ...lines].join("\n");
    })
    .join("\n\n");
}

function schedule(nodes: Node[], developers: number, weeks: number) {
  const sprintCount = Math.max(1, Math.floor(weeks / SPRINT_WEEKS));
  const capacity = developers * SPRINT_WEEKS;
  const placed = new Map<string, number>();
  const buckets: Node[][] = Array.from({ length: sprintCount }, () => []);

  for (let sprint = 0; sprint < sprintCount; sprint += 1) {
    let used = 0;
    let guard = 0;
    while (used + FEATURE_EFFORT <= capacity && guard <= nodes.length) {
      guard += 1;
      const eligible = nodes
        .filter((node) => !placed.has(node.id))
        .filter((node) => node.dependsOn.every((dependency) => (placed.get(dependency) ?? sprint + 1) <= sprint))
        .sort((a, b) => a.order - b.order);
      const next = eligible[0];
      if (!next) break;
      placed.set(next.id, sprint);
      buckets[sprint]?.push(next);
      used += FEATURE_EFFORT;
    }
  }

  const deferred = nodes.filter((node) => !placed.has(node.id));
  return { buckets, placed, deferred, sprintCount, capacity };
}

function placementReason(node: Node, sprint: number, placed: Map<string, number>, names: Map<string, string>) {
  const label = (id: string) => names.get(id) ?? id;
  if (!node.dependsOn.length) {
    return "No dependency. It takes the next open developer-weeks in the earliest sprint.";
  }
  const same = node.dependsOn.filter((id) => placed.get(id) === sprint).map(label);
  const earlier = node.dependsOn.filter((id) => (placed.get(id) ?? sprint + 1) < sprint).map(label);
  if (same.length && earlier.length) {
    return `Depends on ${joinNames(node.dependsOn.map(label))}. ${joinNames(earlier)} finished earlier. ${joinNames(same)} is already in this sprint, so this follows it.`;
  }
  if (same.length) {
    return `Depends on ${joinNames(same)}, already placed earlier in this sprint.`;
  }
  return `Depends on ${joinNames(earlier)}, finished before this sprint.`;
}

function storiesFor(features: Feature[], persona: string): Story[] {
  return features.map((feature, index) => ({
    id: `S${index + 1}`,
    featureId: feature.id,
    persona,
    story: `As an ${persona.toLowerCase()}, I want ${feature.name.toLowerCase()}, so that the features which depend on it can start.`,
    acceptance: [`${feature.name} is ready for every feature that lists it as a dependency.`],
    tasks: [{ id: `T${index + 1}`, title: `Deliver ${feature.name}.`, lane: "backend" as const }],
    tests: [
      {
        id: `TC${index + 1}`,
        title: feature.name,
        steps: [`Finish ${feature.name}`],
        expected: `${feature.name} is available to its dependents.`,
      },
    ],
  }));
}

export function buildCapacityPlan(judgment: Judgment, source: string) {
  const capacity = readCapacity(source);
  const developers = capacity.developers ?? 3;
  const weeks = capacity.weeks ?? 8;
  const names = new Map(PROPOSED_FEATURES.map((feature, index) => [`F${index + 1}`, feature.name]));
  const idByName = new Map(PROPOSED_FEATURES.map((feature, index) => [feature.name, `F${index + 1}`]));
  const nodes: Node[] = PROPOSED_FEATURES.map((feature, index) => ({
    id: `F${index + 1}`,
    name: feature.name,
    order: index,
    dependsOn: feature.dependsOn.map((name) => idByName.get(name) ?? name),
  }));
  const { buckets, placed, deferred, sprintCount, capacity: sprintCapacity } = schedule(nodes, developers, weeks);
  const persona = judgment.personas[0]?.role ?? "Operator";
  const requirementByStatement = new Map(judgment.requirements.map((item) => [item.statement, item.id]));

  const features: Feature[] = nodes.map((node) => ({
    id: node.id,
    name: node.name,
    outcome: node.dependsOn.length
      ? `Unblocks the features that depend on ${node.name}.`
      : `${node.name} can start with no predecessor.`,
    requirementIds: [requirementByStatement.get(node.name) ?? `R${node.order + 1}`],
    scope: "must",
    rank: node.order + 1,
  }));

  const sprints: RoadmapSprint[] = buckets.map((bucket, index) => {
    const start = index * SPRINT_WEEKS + 1;
    const end = start + SPRINT_WEEKS - 1;
    const placements: RoadmapPlacement[] = bucket.map((node) => ({
      featureId: node.id,
      dependsOn: node.dependsOn.map((id) => names.get(id) ?? id),
      reason: placementReason(node, index, placed, names),
    }));
    return {
      id: `S${index + 1}`,
      name: `Sprint ${index + 1}`,
      window: `Weeks ${start}–${end}`,
      featureIds: bucket.map((node) => node.id),
      placements,
    };
  });

  const deferredPlacements: RoadmapPlacement[] = deferred.map((node) => ({
    featureId: node.id,
    dependsOn: node.dependsOn.map((id) => names.get(id) ?? id),
    reason: `Ready once its dependencies finish. ${developers} developers × ${weeks} weeks = ${developers * weeks} developer-weeks, and earlier features already use that budget.`,
  }));

  const fit = sprintCount * (sprintCapacity / FEATURE_EFFORT);
  const note = `Sprint membership comes from the dependency graph and the capacity in the request. A sprint is ${SPRINT_WEEKS} weeks. ${developers} developers × ${SPRINT_WEEKS} weeks = ${sprintCapacity} developer-weeks, and each of the ${nodes.length} proposed features is estimated at ${FEATURE_EFFORT} developer-weeks, so a sprint holds ${sprintCapacity / FEATURE_EFFORT} features. ${weeks} weeks gives ${sprintCount} sprints (${developers * weeks} developer-weeks). ${fit} features fit. The other ${nodes.length - fit} wait. A feature shares a sprint with a dependency only when that dependency is placed earlier in the same sprint. Sprint 3 carries the tight chain Activities, then History, then Reporting.`;

  const groups = [
    ...sprints.map((sprint) => ({
      name: sprint.name,
      children: sprint.featureIds.map((id) => names.get(id) ?? id),
    })),
    {
      name: "After week 8",
      children: deferred.map((node) => node.name),
    },
  ];

  const milestones: Milestone[] = [
    ...sprints.map((sprint, index) => ({
      id: `M${index + 1}`,
      name: sprint.name,
      goal: `${sprint.window}. ${developers} developers, ${sprintCapacity} developer-weeks, filled in dependency order.`,
      featureIds: sprint.featureIds,
      exitCriteria: sprint.placements.map((item) => {
        const name = names.get(item.featureId) ?? item.featureId;
        return `${name}: ${item.reason}`;
      }),
    })),
    {
      id: `M${sprints.length + 1}`,
      name: "After week 8",
      goal: "Still proposed. The 8-week budget is already spent.",
      featureIds: deferred.map((node) => node.id),
      exitCriteria: ["Replan with more developers, a longer target, or a smaller set."],
    },
  ];

  const roadmap: Roadmap = {
    developers,
    weeks,
    sprintWeeks: SPRINT_WEEKS,
    note,
    ascii: tree(groups),
    sprints,
    deferred: deferredPlacements,
  };

  return {
    features,
    stories: storiesFor(features, persona),
    priorities: scorePriorities(judgment, features),
    milestones,
    roadmap,
  };
}

export function roadmapFromMilestones(plan: ProductPlan): Roadmap {
  const capacity = readCapacity(`${plan.sourceText}\n${plan.constraints.join("\n")}`);
  const note =
    capacity.developers && !capacity.weeks
      ? `The source names ${capacity.developers} engineers. Release buckets follow the stated scope. Sprint dates start once a week target is stated.`
      : "Release buckets follow the stated scope. Sprint dates start once a team size and a week target are both stated.";
  const sprints: RoadmapSprint[] = plan.milestones.map((milestone) => ({
    id: milestone.id,
    name: milestone.name,
    window: "",
    featureIds: milestone.featureIds,
    placements: milestone.featureIds.map((featureId) => ({
      featureId,
      dependsOn: [],
      reason: milestone.goal,
    })),
  }));
  return {
    developers: capacity.developers,
    weeks: capacity.weeks,
    sprintWeeks: null,
    note,
    ascii: tree(
      sprints.map((sprint) => ({
        name: sprint.name,
        children: sprint.featureIds.map(
          (id) => plan.features.find((feature) => feature.id === id)?.name ?? id,
        ),
      })),
    ),
    sprints,
    deferred: [],
  };
}
