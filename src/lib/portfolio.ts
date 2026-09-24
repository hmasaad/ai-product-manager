import { conflictsWith, featureHit } from "./memory";
import { clip, contentWords } from "./text";
import type {
  Evidence,
  PortfolioBet,
  PortfolioBetKind,
  PortfolioFinding,
  PortfolioFindingKind,
  PortfolioInitiative,
  PortfolioProduct,
  ProductMemory,
  ProductPlan,
  ProductPortfolio,
} from "./types";

export const PORTFOLIO_NOTE =
  "The portfolio reads every remembered product and the current plan. It names duplicated initiatives, conflicting roadmaps, shared dependencies, resource constraints, strategic gaps, weak evidence, and risky assumptions. Then it names the bets, the evidence for each, the trade-offs, and what is still missing. A person chooses. Totals stay unnamed unless stated.";

export const PORTFOLIO_QUESTION =
  "Where should the next capacity go, which products compete, what should we combine or pause, and what information are we still missing?";

export const PORTFOLIO_INTELLIGENCE_ASCII = `                    PORTFOLIO INTELLIGENCE
                             │
       ┌─────────────────────┼─────────────────────┐
       ↓                     ↓                     ↓
     Products            Capacity              Evidence
       │                     │                     │
       └─────────────────────┼─────────────────────┘
                             ↓
                     Portfolio Analysis
                             ↓
             ┌───────────────┼───────────────┐
             ↓               ↓               ↓
           Bets           Trade-offs        Missing
             │               │               │
             └───────────────┼───────────────┘
                             ↓
                    Human Portfolio Call
                             ↓
                     Portfolio Record`;

export const PORTFOLIO_LABEL: Record<PortfolioFindingKind, string> = {
  duplicate: "Duplicated initiatives",
  conflict: "Conflicting roadmaps",
  dependency: "Shared dependencies",
  constraint: "Resource constraints",
  gap: "Strategic gaps",
  evidence: "Weak evidence",
  assumption: "Risky assumptions",
};

export const PORTFOLIO_BET_LABEL: Record<PortfolioBetKind, string> = {
  invest: "Invest",
  pause: "Pause",
  combine: "Combine",
  validate: "Validate",
  sequence: "Sequence",
  hold: "Hold",
};

const SKIP_SOURCE = /^(user feedback|product metrics)$/i;
const SKIP_PRODUCT = /^(user feedback|product metrics)$|^decision #\d+|should be re-checked|^product monitor\b/i;
const GENERIC = new Set([
  "field",
  "user",
  "users",
  "data",
  "product",
  "system",
  "access",
  "review",
  "record",
  "work",
  "plan",
  "app",
  "feature",
]);
const SPECIFIC = new Set([
  "offline",
  "cityworks",
  "okta",
  "contractor",
  "kubernetes",
  "microservice",
  "billing",
  "invoice",
  "template",
  "payment",
  "transaction",
]);

const SYSTEMS: { name: string; pattern: RegExp }[] = [
  { name: "CityWorks", pattern: /cityworks/i },
  { name: "Okta", pattern: /\bokta\b/i },
  { name: "one codebase", pattern: /one codebase/i },
  { name: "Kubernetes", pattern: /\bkubernetes\b/i },
  { name: "microservices", pattern: /microservices?/i },
  { name: "append-only ledger", pattern: /append-only|immutable/i },
];

function addName(names: string[], value: string, allowDecisionTitle = false) {
  const clean = value.replace(/\s+/g, " ").trim();
  if (clean.length < 2) return;
  if (SKIP_SOURCE.test(clean)) return;
  if (!allowDecisionTitle && SKIP_PRODUCT.test(clean)) return;
  if (names.some((name) => name.toLowerCase() === clean.toLowerCase())) return;
  names.push(clean);
}

export function rememberedProducts(memory?: ProductMemory): string[] {
  const names: string[] = [];
  for (const name of memory?.products ?? []) addName(names, name);
  if (memory?.product) addName(names, memory.product);
  for (const item of memory?.items ?? []) addName(names, item.source);
  return names;
}

function pad(text: string, width: number) {
  const clipped = clip(text, width);
  if (clipped.length >= width) return clipped;
  const extra = width - clipped.length;
  const left = Math.floor(extra / 2);
  return `${" ".repeat(left)}${clipped}${" ".repeat(extra - left)}`;
}

function treeAscii(products: PortfolioProduct[]) {
  const names = products.map((item) => item.name);
  if (!names.length) {
    return `                 PRODUCT PORTFOLIO
                       │
                       ↓
                 Portfolio View`;
  }
  if (names.length === 1) {
    return `                 PRODUCT PORTFOLIO
                       │
                       ↓
${pad(names[0], 45).trimEnd()}
                       │
                    Features
                       │
                       ↓
                 Portfolio View`;
  }
  if (names.length === 2) {
    return `                 PRODUCT PORTFOLIO
                       │
        ┌──────────────┴──────────────┐
        ↓                             ↓
   ${clip(names[0], 16).padEnd(16)}              ${clip(names[1], 16)}
        │                             │
     Features                      Features
        │                             │
        └──────────────┬──────────────┘
                       ↓
                 Portfolio View`;
  }
  return `                 PRODUCT PORTFOLIO
                       │
        ┌──────────────┼──────────────┐
        ↓              ↓              ↓
   ${clip(names[0], 12).padEnd(12)}    ${clip(names[1], 12).padEnd(12)}    ${clip(names[2], 12)}
        │              │              │
     Features       Features       Features
        │              │              │
        └──────────────┼──────────────┘
                       ↓
                 Portfolio View`;
}

function distinctive(text: string) {
  return [...new Set(contentWords(text))].filter((word) => !GENERIC.has(word));
}

function sameInitiative(left: string, right: string) {
  const a = left.replace(/\s+/g, " ").trim().toLowerCase();
  const b = right.replace(/\s+/g, " ").trim().toLowerCase();
  if (a.length < 3 || b.length < 3) return false;
  if (a === b || a.includes(b) || b.includes(a)) return true;
  const wa = distinctive(left);
  const wb = distinctive(right);
  const hits = wa.filter((word) => wb.includes(word));
  if (hits.length >= 2) return true;
  if (hits.some((word) => SPECIFIC.has(word) || word.length >= 8)) return true;
  return featureHit(left, right) || featureHit(right, left);
}

function featureName(text: string) {
  return text.split("—")[0]?.replace(/^Held for later:\s*/i, "").split(":")[0]?.trim() ?? text;
}

function initiative(
  product: string,
  name: string,
  evidence: Evidence,
  index: number,
): PortfolioInitiative {
  return { id: `INI-${index}`, product, name, evidence };
}

function collectInitiatives(plan: ProductPlan, memory?: ProductMemory): PortfolioInitiative[] {
  const items: PortfolioInitiative[] = [];
  let index = 1;
  for (const feature of plan.features) {
    items.push(initiative(plan.title, feature.name, feature.scope === "later" ? "inferred" : "stated", index));
    index += 1;
  }
  for (const rec of plan.recommendations ?? []) {
    if (items.some((item) => item.product === plan.title && sameInitiative(item.name, rec.opportunity))) continue;
    items.push(initiative(plan.title, rec.opportunity, rec.evidence[0]?.evidence ?? "inferred", index));
    index += 1;
  }
  for (const item of memory?.items ?? []) {
    if (item.kind !== "feature" && !(item.kind === "decision" && /^Held for later:/i.test(item.text))) continue;
    if (SKIP_PRODUCT.test(item.source) && item.source !== plan.title) continue;
    const product = SKIP_SOURCE.test(item.source) ? memory?.product || "Remembered product" : item.source;
    const name = featureName(item.text);
    if (items.some((row) => row.product === product && sameInitiative(row.name, name))) continue;
    items.push(initiative(product, name, item.evidence, index));
    index += 1;
  }
  return items;
}

function collectProducts(plan: ProductPlan, memory: ProductMemory | undefined, initiatives: PortfolioInitiative[]): PortfolioProduct[] {
  const names: string[] = [];
  for (const name of rememberedProducts(memory)) addName(names, name);
  addName(names, plan.title, true);
  return names.map((name) => {
    const features = initiatives.filter((item) => item.product === name).map((item) => item.name);
    const fromMemory = (memory?.items ?? []).filter((item) => item.source === name && item.kind === "feature");
    const evidence = fromMemory.length && fromMemory.every((item) => item.evidence === "stated") ? "stated" : features.length ? "inferred" : "unknown";
    return { name, features: features.slice(0, 12), evidence };
  });
}

function finding(
  kind: PortfolioFindingKind,
  title: string,
  detail: string,
  products: string[],
  initiatives: string[],
  evidence: Evidence,
  index: number,
): PortfolioFinding {
  return {
    id: `PF-${kind}-${index}`,
    kind,
    title,
    detail,
    products: [...new Set(products.filter(Boolean))],
    initiatives: [...new Set(initiatives.filter(Boolean))],
    evidence,
  };
}

function duplicates(initiatives: PortfolioInitiative[], plan: ProductPlan): PortfolioFinding[] {
  const items: PortfolioFinding[] = [];
  for (let i = 0; i < initiatives.length; i += 1) {
    for (let j = i + 1; j < initiatives.length; j += 1) {
      const left = initiatives[i];
      const right = initiatives[j];
      if (left.product === right.product) continue;
      if (!sameInitiative(left.name, right.name)) continue;
      items.push(
        finding(
          "duplicate",
          `${left.name} appears on more than one product`,
          `${left.product} and ${right.product} both carry ${left.name}.`,
          [left.product, right.product],
          [left.name, right.name],
          left.evidence === "stated" || right.evidence === "stated" ? "stated" : "inferred",
          items.length + 1,
        ),
      );
    }
  }
  for (const hit of plan.context?.alreadyExists ?? []) {
    const name = featureName(hit.text);
    if (items.some((item) => item.initiatives.some((line) => sameInitiative(line, name)))) continue;
    items.push(
      finding("duplicate", `${name} is already on the portfolio`, hit.text, [plan.title, plan.context.product].filter(Boolean), [name], "stated", items.length + 1),
    );
  }
  return items.slice(0, 6);
}

function conflicts(plan: ProductPlan, memory: ProductMemory | undefined, initiatives: PortfolioInitiative[]): PortfolioFinding[] {
  const items: PortfolioFinding[] = [];
  for (const clash of plan.conflicts ?? []) {
    items.push(
      finding(
        "conflict",
        "A new requirement crosses a recorded line",
        `${clash.newRequirement} vs ${clash.existingRequirement}. ${clash.resolution}`,
        [plan.title, plan.context?.product].filter(Boolean),
        [clash.newRequirement, clash.existingRequirement],
        "stated",
        items.length + 1,
      ),
    );
  }
  for (const hit of plan.context?.conflicts ?? []) {
    items.push(
      finding("conflict", "A recorded decision still stands", hit.text, [plan.title, plan.context.product].filter(Boolean), [hit.text], "stated", items.length + 1),
    );
  }
  const later = initiatives.filter((item) => /later|held/i.test(item.name) || item.evidence === "inferred");
  const now = plan.features.filter((item) => item.scope === "must");
  for (const feature of now) {
    const held = later.find((item) => item.product !== plan.title && sameInitiative(item.name, feature.name));
    if (!held) continue;
    items.push(
      finding(
        "conflict",
        `${feature.name} is later on one product and required here`,
        `${held.product} held ${held.name}. ${plan.title} asks for it now.`,
        [held.product, plan.title],
        [held.name, feature.name],
        "inferred",
        items.length + 1,
      ),
    );
  }
  const request = plan.input.brief;
  for (const item of memory?.items ?? []) {
    if (item.kind !== "decision" && item.kind !== "constraint") continue;
    if (!conflictsWith(request, item.text)) continue;
    if (items.some((row) => row.detail.includes(item.text.slice(0, 40)))) continue;
    items.push(
      finding("conflict", "Roadmaps disagree on a recorded decision", item.text, [item.source, plan.title], [featureName(item.text)], "stated", items.length + 1),
    );
  }
  return items.slice(0, 6);
}

function dependencies(plan: ProductPlan, memory: ProductMemory | undefined, products: PortfolioProduct[]): PortfolioFinding[] {
  const corpus = (name: string) => {
    const fromPlan = name === plan.title ? [plan.sourceText, ...plan.constraints, ...plan.features.map((item) => item.name)] : [];
    const fromMemory = (memory?.items ?? [])
      .filter((item) => item.source === name || (name === memory?.product && SKIP_SOURCE.test(item.source)))
      .map((item) => item.text);
    return [...fromPlan, ...fromMemory].join("\n");
  };
  const items: PortfolioFinding[] = [];
  for (const system of SYSTEMS) {
    const hits = products.filter((product) => system.pattern.test(corpus(product.name)));
    if (!hits.length) continue;
    const multiProduct = hits.length >= 2;
    const statedOnPlan = system.pattern.test([...plan.constraints, plan.sourceText].join("\n"));
    if (!multiProduct && !statedOnPlan) continue;
    items.push(
      finding(
        "dependency",
        multiProduct ? `${system.name} is shared` : `${system.name} is a shared dependency on ${hits[0].name}`,
        multiProduct
          ? `${hits.map((item) => item.name).join(" and ")} both sit on ${system.name}.`
          : `More than one slice on ${hits[0].name} sits on ${system.name}.`,
        hits.map((item) => item.name),
        [system.name],
        "stated",
        items.length + 1,
      ),
    );
  }
  return items.slice(0, 6);
}

function resources(plan: ProductPlan, memory: ProductMemory | undefined, products: PortfolioProduct[]): PortfolioFinding[] {
  const items: PortfolioFinding[] = [];
  for (const product of products) {
    const blob =
      product.name === plan.title
        ? [plan.sourceText, ...plan.constraints, plan.roadmap?.note ?? ""].join("\n")
        : (memory?.items ?? [])
            .filter((item) => item.source === product.name && (item.kind === "constraint" || item.kind === "roadmap" || item.kind === "limitation"))
            .map((item) => item.text)
            .join("\n");
    const team = blob.match(/(\d+)\s+(engineers?|developers?)/i);
    const weeks = blob.match(/(\d+)\s*-?\s*week/i);
    if (!team && !weeks) continue;
    const parts = [
      team ? `${team[1]} ${team[2]}` : "",
      weeks ? `${weeks[1]}-week target` : "",
    ].filter(Boolean);
    items.push(
      finding(
        "constraint",
        `${product.name} names a resource limit`,
        `Stated: ${parts.join(", ")}.`,
        [product.name],
        parts,
        "stated",
        items.length + 1,
      ),
    );
  }
  if (items.length >= 2) {
    items.unshift(
      finding(
        "constraint",
        "More than one product names a team size",
        items.map((item) => item.detail).join(" "),
        items.flatMap((item) => item.products),
        items.flatMap((item) => item.initiatives),
        "stated",
        0,
      ),
    );
  }
  return items.slice(0, 6);
}

function gaps(plan: ProductPlan, products: PortfolioProduct[], initiatives: PortfolioInitiative[]): PortfolioFinding[] {
  const items: PortfolioFinding[] = [];
  if (plan.maturity === "problem") {
    items.push(
      finding(
        "gap",
        "Validation sits ahead of a product bet",
        "The current request is a problem. The portfolio has no signed build for it yet.",
        [plan.title],
        ["Validate the problem"],
        "stated",
        1,
      ),
    );
  }
  const later = plan.features.filter((item) => item.scope === "later");
  for (const feature of later.slice(0, 2)) {
    items.push(
      finding(
        "gap",
        `${feature.name} is later scope, outside the current bet`,
        `${plan.title} holds ${feature.name} for later.`,
        [plan.title],
        [feature.name],
        "inferred",
        items.length + 1,
      ),
    );
  }
  for (const product of products) {
    if (product.name === plan.title) continue;
    const rememberedLater = initiatives.filter((item) => item.product === product.name && /portal|later/i.test(item.name));
    for (const item of rememberedLater.slice(0, 1)) {
      items.push(
        finding(
          "gap",
          `${item.name} is still outside the current bet`,
          `${product.name} recorded ${item.name} as later scope.`,
          [product.name],
          [item.name],
          "inferred",
          items.length + 1,
        ),
      );
    }
  }
  return items.slice(0, 6);
}

function weakEvidence(plan: ProductPlan, initiatives: PortfolioInitiative[]): PortfolioFinding[] {
  const items: PortfolioFinding[] = [];
  if (plan.proposed) {
    items.push(
      finding(
        "evidence",
        `${plan.title} is a proposed MVP`,
        "The request is a one-line build. Evidence quality stays weak until buyers and measures are confirmed.",
        [plan.title],
        plan.features.slice(0, 3).map((item) => item.name),
        "inferred",
        1,
      ),
    );
  }
  for (const item of plan.opportunityScoring?.items ?? []) {
    const quality = item.factors.find((factor) => factor.key === "evidenceQuality");
    if (!quality || quality.score > 2) continue;
    items.push(
      finding(
        "evidence",
        `${item.opportunity} has weak evidence`,
        quality.reason,
        [plan.title],
        [item.opportunity],
        quality.evidence,
        items.length + 1,
      ),
    );
  }
  for (const feature of plan.features.filter((item) => item.scope === "later")) {
    items.push(
      finding("evidence", `${feature.name} sits on later, uncounted evidence`, `${plan.title} left ${feature.name} out of the current release.`, [plan.title], [feature.name], "inferred", items.length + 1),
    );
  }
  for (const item of initiatives) {
    if (item.product === plan.title) continue;
    if (item.evidence !== "inferred") continue;
    if (!/later|portal|proposed/i.test(item.name)) continue;
    items.push(
      finding("evidence", `${item.name} on ${item.product} has weak evidence`, `${item.name} was inferred or held for later.`, [item.product], [item.name], "inferred", items.length + 1),
    );
  }
  return items.slice(0, 6);
}

function riskyAssumptions(plan: ProductPlan): PortfolioFinding[] {
  const items: PortfolioFinding[] = [];
  for (const item of plan.decisions ?? []) {
    if (item.status !== "assumption" && item.status !== "needsValidation" && item.status !== "unknown") continue;
    if (item.status === "unknown" && plan.requirements.some((row) => row.statement === item.decision)) continue;
    items.push(
      finding(
        "assumption",
        item.decision,
        item.validation ?? "This stays open until someone validates it.",
        [plan.title],
        [item.decision],
        item.status === "assumption" ? "inferred" : "unknown",
        items.length + 1,
      ),
    );
  }
  for (const entry of plan.decisionLedger?.entries ?? []) {
    for (const assumption of entry.assumptions.filter((item) => item.health === "untested" || item.health === "stale")) {
      items.push(
        finding(
          "assumption",
          `Decision #${entry.number} hangs on ${assumption.health} assumption`,
          assumption.text,
          [plan.title],
          [assumption.text],
          assumption.health === "stale" ? "stated" : "inferred",
          items.length + 1,
        ),
      );
    }
  }
  for (const item of plan.decisionReevaluation?.cases ?? []) {
    if (item.verdict !== "review" && item.verdict !== "reconsider") continue;
    items.push(
      finding("assumption", item.recommendation, `${item.warning} ${item.assumption}`, [plan.title], [item.assumption], item.evidence.evidence, items.length + 1),
    );
  }
  return items.slice(0, 6);
}

function fact(text: string, evidence: Evidence = "stated") {
  return { text, evidence };
}

function bet(input: {
  id: string;
  kind: PortfolioBetKind;
  title: string;
  summary: string;
  evidence: { text: string; evidence: Evidence }[];
  tradeoffs: string[];
  risks: string[];
  missing: string[];
  products: string[];
}): PortfolioBet {
  return input;
}

function holdBet(products: string[], missing: string[]): PortfolioBet {
  return bet({
    id: "BET-hold",
    kind: "hold",
    title: "Hold — gather the missing information",
    summary: "Do not move capacity until the open portfolio questions have an owner.",
    evidence: [fact("A portfolio call can wait.", "inferred")],
    tradeoffs: ["Time is spent on a portfolio review instead of a ship.", "Current work stays on the products already funded."],
    risks: ["Waiting can be read as a silent no on a later slice."],
    missing,
    products,
  });
}

function namesOf(products: PortfolioProduct[]) {
  return products.map((item) => item.name);
}

function crossProductDuplicate(findings: PortfolioFinding[]) {
  return findings.find((item) => item.kind === "duplicate" && new Set(item.products).size >= 2);
}

function questionOf(plan: ProductPlan, products: PortfolioProduct[], findings: PortfolioFinding[]) {
  const clash = plan.conflicts[0];
  if (clash && /cityworks/i.test(`${clash.newRequirement} ${clash.existingRequirement}`)) {
    return "How should the portfolio treat CityWorks versus a contractor portal?";
  }
  if (clash) return `How should the portfolio resolve ${clash.newRequirement.replace(/^"|"$/g, "")}?`;
  const duplicate = crossProductDuplicate(findings);
  if (duplicate && products.length >= 2) {
    const work = duplicate.initiatives[0] || duplicate.title;
    return `Should ${work} live on more than one product?`;
  }
  if (products.length >= 2) {
    return `Where should the next capacity go across ${namesOf(products).slice(0, 3).join(" and ")}?`;
  }
  if (plan.maturity === "problem") return `Should the portfolio fund a product for ${plan.title}?`;
  if (plan.proposed) return `Should ${plan.title} become a funded product on the portfolio?`;
  return `Should the next capacity stay on ${plan.title}?`;
}

function productContext(products: PortfolioProduct[]) {
  const lines = products.slice(0, 4).map((item) =>
    fact(`${item.name}: ${item.features.slice(0, 4).join(", ") || "No features recorded."}`, item.evidence),
  );
  if (!lines.length) lines.push(fact("No remembered product was named.", "unknown"));
  return { kind: "products" as const, lines };
}

function capacityContext(plan: ProductPlan, findings: PortfolioFinding[]) {
  const limits = findings.filter((item) => item.kind === "constraint");
  const deps = findings.filter((item) => item.kind === "dependency");
  const lines = [...limits, ...deps].slice(0, 5).map((item) => fact(item.detail, item.evidence));
  if (!lines.length && plan.roadmap?.developers) {
    lines.push(fact(`${plan.roadmap.developers} developers on the current roadmap.`, "stated"));
  }
  if (!lines.length) lines.push(fact("No named team size or shared system was loaded.", "unknown"));
  return { kind: "capacity" as const, lines: lines.slice(0, 5) };
}

function evidenceContext(plan: ProductPlan, findings: PortfolioFinding[]) {
  const lines = [
    ...findings
      .filter((item) => item.kind === "evidence" || item.kind === "assumption" || item.kind === "gap")
      .slice(0, 4)
      .map((item) => fact(item.title, item.evidence)),
  ];
  if (plan.proposed) lines.unshift(fact(`${plan.title} is a proposed MVP.`, "inferred"));
  if (!lines.length) lines.push(fact("No named portfolio evidence gap was loaded.", "unknown"));
  return { kind: "evidence" as const, lines: lines.slice(0, 5) };
}

function uniqueBets(options: PortfolioBet[]) {
  const seen = new Set<string>();
  return options.filter((item) => {
    const key = item.title.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function fromConflict(plan: ProductPlan, products: PortfolioProduct[]): PortfolioBet[] {
  const clash = plan.conflicts[0];
  if (!clash) return [];
  const blob = `${clash.newRequirement} ${clash.existingRequirement} ${clash.resolution}`;
  const cityworks = /cityworks/i.test(blob);
  const names = namesOf(products);
  const missing = [clash.resolution, "Which product owns the system of record after this call."];
  return [
    bet({
      id: "BET-keep",
      kind: "invest",
      title: cityworks ? "Keep CityWorks as the system of record" : "Keep the recorded line",
      summary: cityworks
        ? "CityWorks remains the work-order system of record. A contractor portal stays later."
        : `${clash.existingRequirement} still stands.`,
      evidence: [fact(clash.existingRequirement, "stated"), fact(clash.resolution, "stated")],
      tradeoffs: ["The new request stays out of this release.", "Recorded architecture stays simple."],
      risks: ["People who asked for the change still have the original workaround."],
      missing,
      products: names,
    }),
    bet({
      id: "BET-pause",
      kind: "pause",
      title: cityworks ? "Replace CityWorks with a contractor portal" : "Ship the new requirement across the portfolio",
      summary: cityworks
        ? "A contractor portal becomes the funded bet and CityWorks is replaced."
        : `${clash.newRequirement} would move onto the portfolio.`,
      evidence: [fact(clash.newRequirement, "stated")],
      tradeoffs: ["A recorded decision is reopened.", "Capacity leaves the current product."],
      risks: ["Two systems of record can sit in parallel while the cutover is undefined."],
      missing,
      products: names,
    }),
    holdBet(names, missing),
  ];
}

function fromDuplicate(findings: PortfolioFinding[], products: PortfolioProduct[]): PortfolioBet[] {
  const duplicate = crossProductDuplicate(findings);
  if (!duplicate) return [];
  const work = duplicate.initiatives[0] || duplicate.title;
  const names = [...new Set([...duplicate.products, ...namesOf(products)].filter(Boolean))].slice(0, 3);
  if (names.length < 2) return [];
  const missing = [
    `Which product should own ${work}.`,
    "Whether a second copy is a stated requirement or an inferred overlap.",
  ];
  return [
    bet({
      id: "BET-combine",
      kind: "combine",
      title: `Combine ${work} into one initiative`,
      summary: `${names[0]} and ${names[1]} both carry ${work}. One owner keeps the work from forking.`,
      evidence: [fact(duplicate.detail, duplicate.evidence)],
      tradeoffs: ["One product waits on the shared slice.", "A second copy is not funded."],
      risks: ["The paused product can look unfinished until the shared slice lands."],
      missing,
      products: names,
    }),
    bet({
      id: "BET-split",
      kind: "sequence",
      title: `Run ${names[0]} and ${names[1]} in parallel`,
      summary: "Each product keeps its own copy. Capacity splits.",
      evidence: [fact(duplicate.detail, duplicate.evidence)],
      tradeoffs: ["Delivery moves on both products.", "The same work can drift."],
      risks: ["Two designs for the same job can conflict later."],
      missing,
      products: names,
    }),
    holdBet(names, missing),
  ];
}

function fromMulti(products: PortfolioProduct[], findings: PortfolioFinding[]): PortfolioBet[] {
  if (products.length < 2) return [];
  const names = namesOf(products);
  const shared = findings.find((item) => item.kind === "dependency");
  const limit = findings.find((item) => item.kind === "constraint");
  const missing = [
    "Which product the next sprint belongs to.",
    limit?.detail || "Whether the named team can cover more than one product.",
  ];
  return [
    bet({
      id: "BET-sequence",
      kind: "sequence",
      title: shared ? `Sequence on ${shared.initiatives[0] ?? "the shared system"} first` : `Keep the next capacity on ${names[0]}`,
      summary: shared
        ? `${shared.detail} Sequence the shared system before a second product ships.`
        : `${names[0]} is already on the portfolio. A second product waits.`,
      evidence: [shared ? fact(shared.detail, shared.evidence) : fact(`${names[0]} is already remembered.`, "stated"), ...(limit ? [fact(limit.detail, limit.evidence)] : [])],
      tradeoffs: ["The remembered product stays funded.", "The new product waits for capacity."],
      risks: ["A waiting product can be treated as dropped."],
      missing,
      products: names,
    }),
    bet({
      id: "BET-split",
      kind: "pause",
      title: `Split capacity across ${names[0]} and ${names[1]}`,
      summary: "Both products stay active. Each slice gets a thinner team.",
      evidence: [fact(`${names.join(" and ")} are both on the portfolio.`, "stated"), ...(limit ? [fact(limit.detail, limit.evidence)] : [])],
      tradeoffs: ["More than one product moves.", "Each product gets less of the named team."],
      risks: ["A shared system can be changed twice."],
      missing,
      products: names,
    }),
    holdBet(names, missing),
  ];
}

function fromProblem(plan: ProductPlan, products: PortfolioProduct[]): PortfolioBet[] {
  const names = namesOf(products);
  const missing = [
    "What people do today when this happens, and what they would accept instead.",
    "What number should move if the problem gets smaller.",
  ];
  return [
    bet({
      id: "BET-validate",
      kind: "validate",
      title: "Validate the problem before a portfolio bet",
      summary: "This request is a problem. The portfolio has no signed product for it yet.",
      evidence: [fact(plan.problem.statement, "stated")],
      tradeoffs: ["Discovery stays ahead of a build.", "No new product is funded."],
      risks: ["A later reader can treat the problem statement as a product bet."],
      missing,
      products: names,
    }),
    holdBet(names, missing),
  ];
}

function fromProposed(plan: ProductPlan, products: PortfolioProduct[]): PortfolioBet[] {
  const names = namesOf(products);
  const missing = ["Who the buyers are, and which measure would prove the MVP."];
  return [
    bet({
      id: "BET-proposed",
      kind: "validate",
      title: "Keep this as a proposed MVP",
      summary: "The request is a one-line build. It stays labeled as a proposal on the portfolio.",
      evidence: [fact(`${plan.title} is a proposed MVP.`, "inferred")],
      tradeoffs: ["The idea stays visible.", "Capacity stays off a signed build."],
      risks: ["A proposal can be read as a funded product."],
      missing,
      products: names,
    }),
    holdBet(names, missing),
  ];
}

function fromCurrent(plan: ProductPlan, products: PortfolioProduct[], findings: PortfolioFinding[]): PortfolioBet[] {
  const names = namesOf(products);
  const later = plan.features.find((item) => item.scope === "later");
  const limit = findings.find((item) => item.kind === "constraint");
  const system = findings.find((item) => item.kind === "dependency");
  const missing = [
    later ? `When ${later.name} should leave later scope.` : "Whether a second product is even in play.",
    "What evidence would justify moving capacity.",
  ];
  const options = [
    bet({
      id: "BET-keep",
      kind: "invest",
      title: `Keep the current bet on ${plan.title}`,
      summary: system
        ? `${system.detail} Capacity stays on the named product.`
        : "The next capacity stays on the product already in front of the team.",
      evidence: [
        fact(`${plan.title} is the current product.`, "stated"),
        ...(limit ? [fact(limit.detail, limit.evidence)] : []),
        ...(system ? [fact(system.detail, system.evidence)] : []),
      ],
      tradeoffs: ["Later scope waits.", "The current product keeps the named team."],
      risks: ["A later slice can stay later longer than people expect."],
      missing,
      products: names,
    }),
  ];
  if (later) {
    options.push(
      bet({
        id: "BET-later",
        kind: "pause",
        title: `Hold ${later.name} for later`,
        summary: `${plan.title} already named ${later.name} as later scope.`,
        evidence: [fact(`${later.name} is later scope.`, "stated")],
        tradeoffs: ["The current bet stays narrow.", `${later.name} is not funded now.`],
        risks: ["A later slice can be read as dropped."],
        missing,
        products: names,
      }),
    );
  }
  options.push(holdBet(names, missing));
  return options;
}

function buildBets(plan: ProductPlan, products: PortfolioProduct[], findings: PortfolioFinding[]): PortfolioBet[] {
  let options: PortfolioBet[] = [];
  if (plan.conflicts.length) options = fromConflict(plan, products);
  else if (crossProductDuplicate(findings) && products.length >= 2) options = fromDuplicate(findings, products);
  else if (products.length >= 2) options = fromMulti(products, findings);
  else if (plan.maturity === "problem") options = fromProblem(plan, products);
  else if (plan.proposed) options = fromProposed(plan, products);
  else options = fromCurrent(plan, products, findings);
  options = uniqueBets(options);
  if (options.length < 2) options.push(holdBet(namesOf(products), plan.problem.openQuestions.slice(0, 2)));
  return options.slice(0, 5);
}

export function emptyPortfolio(): ProductPortfolio {
  return {
    note: PORTFOLIO_NOTE,
    ascii: treeAscii([]),
    engineAscii: PORTFOLIO_INTELLIGENCE_ASCII,
    question: PORTFOLIO_QUESTION,
    contexts: [],
    products: [],
    findings: [],
    options: [],
    missing: [],
    record: {
      id: "PF-record",
      question: PORTFOLIO_QUESTION,
      status: "pending",
    },
  };
}

export function buildPortfolio(plan: ProductPlan, memory?: ProductMemory): ProductPortfolio {
  const initiatives = collectInitiatives(plan, memory);
  const products = collectProducts(plan, memory, initiatives);
  const findings = [
    ...duplicates(initiatives, plan),
    ...conflicts(plan, memory, initiatives),
    ...dependencies(plan, memory, products),
    ...resources(plan, memory, products),
    ...gaps(plan, products, initiatives),
    ...weakEvidence(plan, initiatives),
    ...riskyAssumptions(plan),
  ];
  const question = questionOf(plan, products, findings);
  const options = buildBets(plan, products, findings);
  const missing = [...new Set(options.flatMap((item) => item.missing))].slice(0, 6);
  return {
    note: PORTFOLIO_NOTE,
    ascii: treeAscii(products),
    engineAscii: PORTFOLIO_INTELLIGENCE_ASCII,
    question,
    contexts: [productContext(products), capacityContext(plan, findings), evidenceContext(plan, findings)],
    products,
    findings,
    options,
    missing,
    record: {
      id: "PF-record",
      question,
      status: "pending",
    },
  };
}

export function applyPortfolioChoice(plan: ProductPlan, optionId: string): ProductPlan {
  const option = plan.portfolio.options.find((item) => item.id === optionId);
  if (!option) return plan;
  return {
    ...plan,
    portfolio: {
      ...plan.portfolio,
      record: {
        id: "PF-record",
        question: plan.portfolio.question,
        status: "chosen",
        chosenOptionId: option.id,
        rationale: option.summary,
        at: new Date().toISOString(),
      },
    },
  };
}

export function portfolioMarkdown(plan: ProductPlan) {
  const board = plan.portfolio;
  if (!board) return "No portfolio view was produced.";
  const products = board.products
    .map((item) => `- ${item.name}: ${item.features.slice(0, 6).join(", ") || "No features recorded."}`)
    .join("\n");
  const findings = board.findings.length
    ? board.findings.map((item) => `- ${PORTFOLIO_LABEL[item.kind]}: ${item.title} — ${item.detail}`).join("\n")
    : "- No cross-product finding was named.";
  const bets = board.options.length
    ? board.options
        .map((item) => {
          const evidence = item.evidence.map((line) => `  - ${line.text} (${line.evidence})`).join("\n");
          return `### ${PORTFOLIO_BET_LABEL[item.kind]} — ${item.title}\n\n${item.summary}\n\nEvidence:\n${evidence}\n\nTrade-offs:\n${item.tradeoffs.map((line) => `- ${line}`).join("\n")}\n\nStill missing:\n${item.missing.map((line) => `- ${line}`).join("\n")}`;
        })
        .join("\n\n")
    : "- No portfolio bet was named.";
  return `${board.note}

${board.question}

${PORTFOLIO_QUESTION}

\`\`\`
${board.ascii}
\`\`\`

\`\`\`
${board.engineAscii}
\`\`\`

Products:
${products || "- None named."}

Findings:
${findings}

Bets (${board.record.status}${board.record.chosenOptionId ? ` — ${board.record.chosenOptionId}` : ""}):
${bets}`;
}
