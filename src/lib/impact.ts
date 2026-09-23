import { contentWords } from "./text";
import type {
  ChangeImpact,
  ImpactLevel,
  ProductInput,
  ProductMemory,
  ProductPlan,
  Story,
} from "./types";

export const IMPACT_NOTE =
  "A requirement change is a blast radius. The chain is features, APIs, database, screens, permissions, tests, documentation, and security. That list is the handoff to the architect and the developer.";

export const IMPACT_ASCII = `Requirement change
       ↓
Affected features
       ↓
Affected APIs
       ↓
Database changes
       ↓
Mobile screens
       ↓
Permissions
       ↓
Tests
       ↓
Documentation
       ↓
Security implications`;

const TOPIC_ALIASES: [RegExp, string][] = [
  [/\btransactions?\b|\bledger\b|\bposted entries\b|\bappend-only\b/i, "transaction"],
  [/\bcityworks\b|\bsystem of record\b|\bwork-order\b/i, "cityworks"],
  [/\bbilling\b|\binvoice\b|\bpayment\b|\bamount due\b/i, "billing"],
  [/\bexport\b|\breports?\b/i, "export"],
  [/\bfield\b|\bfarm\b/i, "field"],
  [/\binspection\b|\bpacket\b|\boffline\b|\bsync\b/i, "inspection"],
];

const SKIP = new Set(["delete", "create", "update", "change", "export", "replace", "remove", "build", "allow", "users"]);

function topics(text: string) {
  const aliases = new Set<string>();
  for (const [pattern, topic] of TOPIC_ALIASES) {
    if (pattern.test(text)) aliases.add(topic);
  }
  if (aliases.size) return aliases;
  const found = new Set<string>();
  for (const word of contentWords(text)) {
    if (word.length >= 6 && !SKIP.has(word)) found.add(word);
  }
  return found;
}

function shareTopic(left: string, right: string) {
  const a = topics(left);
  const b = topics(right);
  for (const topic of a) {
    if (b.has(topic)) return true;
  }
  return false;
}

function statements(text: string) {
  return text
    .split(/\n+|(?<=[.!?])\s+(?=[A-Z“"])/)
    .map((line) => line.replace(/^[-*#>\d.)\s]+/, "").replace(/^["“]|["”]$/g, "").replace(/\s+/g, " ").trim())
    .filter((line) => line.length >= 12 && !/^#{1,6}\s/.test(line));
}

function unique(lines: string[]) {
  const seen = new Set<string>();
  return lines.filter((line) => {
    const key = line.replace(/\s+/g, " ").trim().toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function hasPriorSurface(input: ProductInput, memory?: ProductMemory) {
  return Boolean(input.existing.trim() || input.constraints.trim() || memory?.items.length);
}

function severityOf(change: string, plan: ProductPlan): ImpactLevel {
  if (plan.conflicts.some((item) => /delete|immutable|replace|redesign/i.test(item.rule + item.newRequirement))) {
    return "high";
  }
  if (/\b(delete|replace|immutable|append-only)\b/i.test(`${change} ${plan.sourceText}`)) return "high";
  if (/\b(edit|modify|export|payment)\b/i.test(change)) return "medium";
  return "low";
}

function layerTree(impact: ChangeImpact) {
  const block = (title: string, items: string[]) =>
    `${title}\n${items.length ? items.map((item) => `  • ${item}`).join("\n") : "  • None named from the source."}`;
  return `Requirement change
  • ${impact.change}

${block("Affected features", impact.features)}

${block("Affected APIs", impact.apis)}

${block("Database changes", impact.database)}

${block("Mobile screens", impact.screens)}

${block("Permissions", impact.permissions)}

${block("Tests", impact.tests)}

${block("Documentation", impact.documentation)}

${block("Security implications", impact.security)}`;
}

export function analyzeImpact(plan: ProductPlan, memory?: ProductMemory): ChangeImpact[] {
  const input = plan.input;
  if (!hasPriorSurface(input, memory)) return [];

  const changes = statements(input.brief);
  const prior = [input.existing, input.constraints, ...(memory?.items ?? []).map((item) => item.text)].join("\n");
  const impacts: ChangeImpact[] = [];

  for (const change of changes) {
    const relatedFeatures = plan.features.filter((feature) =>
      shareTopic(change, `${feature.name} ${feature.outcome}`),
    );
    const relatedStories = plan.stories.filter((story) =>
      relatedFeatures.some((feature) => feature.id === story.featureId) || shareTopic(change, story.story),
    );
    const relatedMemory = (memory?.items ?? [])
      .filter((item) => (item.kind === "feature" || item.kind === "limitation" || item.kind === "constraint") && shareTopic(change, item.text))
      .map((item) => item.text);

    const features = unique([
      ...relatedFeatures.map((feature) => feature.name),
      ...relatedMemory,
      ...statements(input.existing).filter((line) => shareTopic(change, line)),
    ]);

    const apis = unique([
      ...relatedStories.flatMap((story) =>
        story.tasks.filter((task) => task.lane === "backend").map((task) => `API: ${task.title}`),
      ),
      ...(/delete/i.test(change) ? ["Delete API for a submitted transaction"] : []),
      ...(/edit|modify|update/i.test(change) && /transaction/i.test(change)
        ? ["Update API for a submitted transaction"]
        : []),
      ...(/replace cityworks|write back/i.test(change) ? ["Write path to the system of record"] : []),
      ...(/export/i.test(change) ? ["Export API for the named report"] : []),
      ...(/payment|amount due|card/i.test(change) ? ["Payment completion API on the invoice"] : []),
    ]);

    const database = unique([
      ...statements(input.constraints).filter((line) =>
        /ledger|append-only|retain|database|record|invoice|photo/i.test(line),
      ),
      ...(/append-only|immutable|ledger/i.test(prior) && /delete/i.test(change)
        ? ["Posted rows cannot be removed without a revision or tombstone policy."]
        : []),
      ...(/append-only|immutable|ledger/i.test(prior) && /edit|modify/i.test(change)
        ? ["An edit of a posted row needs a revision, not an overwrite."]
        : []),
      ...(/payment|invoice/i.test(change) ? ["Invoice and payment records that already show amount due."] : []),
    ]);

    const screens = unique([
      ...relatedStories.flatMap((story) =>
        story.tasks.filter((task) => task.lane === "client").map((task) => task.title),
      ),
      ...(/delete/i.test(change) ? ["Transaction detail — delete confirmation"] : []),
      ...(/edit|modify/i.test(change) && /transaction/i.test(change) ? ["Transaction detail — edit submitted values"] : []),
      ...(/invoice|payment|amount due/i.test(change) ? ["Invoice page and payment completion"] : []),
    ]);

    const permissions = unique([
      ...(/delete|edit|replace/i.test(change) && !/\b(permission|role|only the|rbac)\b/i.test(plan.sourceText)
        ? ["Who may perform this change was not named."]
        : []),
      ...(/okta|sso/i.test(plan.sourceText) ? ["Staff identity stays on the recorded SSO tenant."] : []),
    ]);

    const tests = unique([
      ...relatedStories.flatMap((story: Story) => story.tests.map((test) => `${test.id} ${test.title}`)),
      ...(/delete/i.test(change) ? ["Delete a submitted transaction", "Reject a delete when the ledger is append-only"] : []),
      ...(/edit/i.test(change) && /transaction/i.test(change) ? ["Edit creates a revision, or is rejected"] : []),
    ]);

    const documentation = unique([
      ...statements(input.existing).filter((line) => /immutable|policy|retain|do not/i.test(line)),
      ...(/immutable|append-only|ledger/i.test(prior) ? ["Update the ledger policy before this ships."] : []),
      ...(/cityworks|system of record/i.test(prior) ? ["Keep the system-of-record contract in the architect brief."] : []),
      ...(/redesign|billing portal/i.test(plan.sourceText) ? ["Billing portal copy stays inside the no-redesign bound."] : []),
    ]);

    const security = unique([
      ...(/delete/i.test(change)
        ? ["Irreversible delete; audit who deleted, when, and which record."]
        : []),
      ...(/edit|modify/i.test(change) && /transaction|inspection/i.test(change)
        ? ["A silent overwrite hides the original evidence."]
        : []),
      ...(/photo|evidence|packet/i.test(plan.sourceText) ? ["Evidence files cannot live only on the device."] : []),
      ...(/payment|card|amount due/i.test(change) ? ["A paid invoice that still looks due is a trust failure."] : []),
    ]);

    const hasSignal = [features, apis, database, screens, permissions, tests, documentation, security].some(
      (layer) => layer.length > 0,
    );
    if (!hasSignal) continue;

    const impact: ChangeImpact = {
      change,
      severity: severityOf(change, plan),
      features,
      apis,
      database,
      screens,
      permissions,
      tests,
      documentation,
      security,
      ascii: IMPACT_ASCII,
    };
    impact.ascii = `${IMPACT_ASCII}

${layerTree(impact)}`;
    impacts.push(impact);
  }

  return impacts;
}

export function impactMarkdown(plan: ProductPlan) {
  if (!plan.impacts?.length) return "No requirement change against a prior surface.";
  return plan.impacts
    .map(
      (item) => `⚠ Change impact (${item.severity})

${item.ascii}`,
    )
    .join("\n\n");
}
