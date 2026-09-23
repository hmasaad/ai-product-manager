import { FIELD_LEAVES, isFieldManagement } from "./field-management";
import type { Decomposition, DecompositionNode, ProductPlan, Story, TestCase } from "./types";

function testsFrom(story: Story): TestCase[] {
  return story.acceptance.slice(0, 4).map((line, index) => ({
    id: `${story.id}-TC${index + 1}`,
    title: line,
    steps: [`Sign in as ${story.persona}`, line],
    expected: line,
  }));
}

function asciiTree(root: string, names: string[]) {
  const body = names.map((name, index) => `${index === names.length - 1 ? "└──" : "├──"} ${name}`);
  return [root, "│", ...body].join("\n");
}

function nodeFrom(story: Story, name: string, scope: DecompositionNode["scope"]): DecompositionNode {
  return {
    featureId: story.featureId,
    name,
    scope,
    storyId: story.id,
    persona: story.persona,
    story: story.story,
    acceptance: story.acceptance,
    tasks: story.tasks,
    tests: story.tests,
  };
}

function catalogStories(plan: ProductPlan): Story[] | null {
  if (!isFieldManagement(plan.sourceText)) return null;
  let taskCount = 0;
  let testCount = 0;
  const nextTask = () => {
    taskCount += 1;
    return `T${taskCount}`;
  };
  const nextTest = () => {
    testCount += 1;
    return `TC${testCount}`;
  };
  const stories: Story[] = [];
  FIELD_LEAVES.forEach((leaf, index) => {
    const feature = plan.features.find((item) => item.name === leaf.name);
    if (!feature) return;
    const storyId = `S${index + 1}`;
    stories.push({
      id: storyId,
      featureId: feature.id,
      persona: leaf.persona,
      story: leaf.story,
      acceptance: leaf.acceptance,
      tasks: leaf.tasks.map((task) => ({ ...task, id: nextTask() })),
      tests: leaf.tests.map((test) => ({ ...test, id: nextTest() })),
    });
  });
  return stories.length === FIELD_LEAVES.length ? stories : null;
}

export function buildDecomposition(plan: ProductPlan): { stories: Story[]; decomposition: Decomposition } {
  const catalog = catalogStories(plan);
  const stories = (catalog ?? plan.stories).map((story) =>
    story.tests.length ? story : { ...story, tests: testsFrom(story) },
  );
  const byFeature = new Map(stories.map((story) => [story.featureId, story]));
  const ordered = catalog
    ? FIELD_LEAVES.map((leaf) => plan.features.find((feature) => feature.name === leaf.name)).filter(
        (feature): feature is NonNullable<typeof feature> => Boolean(feature),
      )
    : plan.features;
  const nodes = ordered
    .map((feature) => {
      const story = byFeature.get(feature.id);
      if (!story) return null;
      return nodeFrom(story, feature.name, feature.scope);
    })
    .filter((node): node is DecompositionNode => Boolean(node));
  const root = catalog ? "Field Management" : plan.title;
  return {
    stories,
    decomposition: {
      root,
      ascii: asciiTree(root, nodes.map((node) => node.name)),
      nodes,
    },
  };
}

export function decompositionMarkdown(plan: ProductPlan) {
  const tree = plan.decomposition;
  const body = tree.nodes
    .map((node) => {
      const acceptance = node.acceptance.map((line) => `- ${line}`).join("\n");
      const tasks = node.tasks.map((task) => `- ${task.id} · ${task.lane} — ${task.title}`).join("\n");
      const tests = node.tests
        .map(
          (test) =>
            `- ${test.id} ${test.title}\n  Steps: ${test.steps.join(" → ")}\n  Expected: ${test.expected}`,
        )
        .join("\n");
      return `### ${node.name}

Feature
${node.name} (${node.scope})

User story
${node.storyId}. ${node.story}

Acceptance criteria
${acceptance}

Engineering tasks
${tasks}

Test cases
${tests}`;
    })
    .join("\n\n");
  return `# Feature decomposition — ${tree.root}

\`\`\`
${tree.ascii}
\`\`\`

${body}
`;
}
