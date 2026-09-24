import { clip, contentWords } from "./text";
import type {
  DecisionLineage,
  Evidence,
  GraphAnswer,
  GraphEdge,
  GraphNode,
  GraphNodeKind,
  LineageLayer,
  LineageStep,
  ProductGraph,
  ProductPlan,
} from "./types";

export const GRAPH_NOTE =
  "The product is a graph: customer, problem, opportunity, feature, requirement, then the decision, risk, experiment, and metric that hang off it, and the outcome they aim for. Decision lineage walks customer feedback to evidence, assumption, decision, feature, engineering, and product outcome, then back to new evidence. Questions walk those links instead of restating the PRD.";

export const GRAPH_ASCII = `Customer
   │
   ↓
Problem
   │
   ↓
Opportunity
   │
   ↓
Feature
   │
   ↓
Requirement
   │
   ├──── Decision
   │
   ├──── Risk
   │
   ├──── Experiment
   │
   └──── Metric
          │
          ↓
       Outcome`;

export const GRAPH_BIGGEST = "Which features are solving the biggest customer problems?";
export const GRAPH_WEAK = "Which roadmap items have weak evidence?";
export const GRAPH_ASSUMPTIONS = "Which requirements depend on unvalidated assumptions?";
export const GRAPH_FEEDBACK = "Which decisions are affected by this new customer feedback?";
export const GRAPH_CAUSED = "What caused this feature to exist?";

export const LINEAGE_ASCII = `Customer Feedback
       │
       ↓
   Evidence
       │
       ↓
   Assumption
       │
       ↓
   Decision
       │
       ↓
    Feature
       │
       ↓
   Engineering
       │
       ↓
    Product
    Outcome
       │
       └──────────→ New Evidence`;

export const LINEAGE_LAYERS: LineageLayer[] = ["feedback", "evidence", "assumption", "decision", "feature", "engineering", "outcome"];

const BRANCH: GraphNodeKind[] = ["decision", "risk", "experiment", "metric"];

function overlap(left: string, right: string) {
  const hay = new Set(contentWords(right));
  return contentWords(left).filter((word) => hay.has(word)).length;
}

function linked(left: string, right: string, min = 2) {
  return overlap(left, right) >= min;
}

export function emptyProductGraph(): ProductGraph {
  return { note: GRAPH_NOTE, ascii: GRAPH_ASCII, lineageAscii: LINEAGE_ASCII, nodes: [], edges: [], lineages: [] };
}

function node(id: string, kind: GraphNodeKind, label: string, evidence: Evidence, ref?: string): GraphNode {
  return { id, kind, label: clip(label, 180), evidence, ref };
}

function addNode(nodes: GraphNode[], item: GraphNode) {
  if (!item.label || nodes.some((current) => current.id === item.id)) return;
  nodes.push(item);
}

function addEdge(edges: GraphEdge[], from: string, to: string, ids: Set<string>) {
  if (!ids.has(from) || !ids.has(to)) return;
  if (edges.some((item) => item.from === from && item.to === to)) return;
  edges.push({ from, to });
}

function labeled(source: string, name: string) {
  const inline = new RegExp(`(?:^|\\n)\\s*${name}\\s*:\\s*([^\\n]+)`, "i").exec(source);
  if (inline?.[1]?.trim()) return inline[1].trim();
  const block = new RegExp(
    `(?:^|\\n)\\s*${name}\\s*:\\s*\\n([\\s\\S]*?)(?=\\n\\s*(?:Customer feedback|Evidence|Assumption|Decision|Feature|Engineering|Product outcome|New evidence)\\s*:|$)`,
    "i",
  ).exec(`\n${source}\n`);
  return block?.[1]
    ?.split("\n")
    .map((line) => line.replace(/^[-*•]\s*/, "").trim())
    .filter((line) => line.length > 1)
    .join(" ")
    .trim() ?? "";
}

function parseStatedLineage(source: string) {
  if (!/Customer feedback:|Product outcome:|Engineering:/i.test(source)) return null;
  const feedback = labeled(source, "Customer feedback");
  const evidence = labeled(source, "Evidence");
  const assumption = labeled(source, "Assumption");
  const decision = labeled(source, "Decision");
  const feature = labeled(source, "Feature");
  const engineering = labeled(source, "Engineering");
  const outcome = labeled(source, "Product outcome");
  const newEvidence = labeled(source, "New evidence");
  if (!feedback && !feature && !decision) return null;
  return { feedback, evidence, assumption, decision, feature, engineering, outcome, newEvidence };
}

function causedBy(steps: LineageStep[]) {
  const named = steps.filter((item) => item.label);
  if (!named.length) return "No lineage is stored for this feature yet.";
  return named.map((item) => `${item.layer}: ${item.label}`).join(" → ");
}

function bestId(nodes: GraphNode[], blob: string, kinds: GraphNodeKind[], min = 1) {
  const pool = nodes.filter((item) => kinds.includes(item.kind));
  const ranked = [...pool].sort((a, b) => overlap(blob, b.label) - overlap(blob, a.label));
  const hit = ranked[0];
  if (!hit || overlap(blob, hit.label) < min) return undefined;
  return hit.id;
}

export function buildProductGraph(plan: ProductPlan): ProductGraph {
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];

  const customers = plan.personas.length
    ? plan.personas
    : plan.discovery.targetUsers.map((user) => ({
        name: user.role,
        role: user.role,
        context: user.why,
        jobs: [] as string[],
        pains: [] as string[],
        success: "",
        evidence: user.evidence,
      }));
  customers.forEach((persona, index) => {
    addNode(nodes, node(`CUS-${index + 1}`, "customer", `${persona.role}: ${persona.context}`, persona.evidence));
  });
  if (!customers.length) {
    addNode(nodes, node("CUS-1", "customer", plan.problem.who || "The people named in the source", "unknown"));
  }

  const problems = plan.discovery.userProblems.length
    ? plan.discovery.userProblems
    : [{ text: plan.problem.statement, evidence: "stated" as Evidence }];
  problems.forEach((item, index) => {
    addNode(nodes, node(`PRB-${index + 1}`, "problem", item.text, item.evidence));
  });

  const opportunities = plan.recommendations.length
    ? plan.recommendations.map((item) => ({ text: item.opportunity, evidence: item.evidence[0]?.evidence ?? "inferred", ref: item.featureId }))
    : plan.discovery.userNeeds.map((item) => ({ text: item.need, evidence: item.evidence, ref: undefined as string | undefined }));
  opportunities.forEach((item, index) => {
    addNode(nodes, node(`OPP-${index + 1}`, "opportunity", item.text, item.evidence, item.ref));
  });

  for (const feature of plan.features) {
    addNode(nodes, node(`FEA-${feature.id}`, "feature", feature.name, feature.scope === "must" ? "stated" : "inferred", feature.id));
    addNode(nodes, node(`OUT-${feature.id}`, "outcome", feature.outcome, "inferred", feature.id));
  }

  for (const requirement of plan.requirements) {
    addNode(nodes, node(`REQ-${requirement.id}`, "requirement", requirement.statement, requirement.evidence, requirement.id));
  }

  for (const entry of plan.decisionLedger?.entries ?? []) {
    addNode(
      nodes,
      node(
        `DEC-${entry.number}`,
        "decision",
        `Decision #${entry.number}: ${entry.question}${entry.decision ? ` → ${entry.decision}` : ""}`,
        entry.status === "recorded" ? "stated" : "inferred",
        String(entry.number),
      ),
    );
  }

  for (const register of plan.riskAnalysis?.registers ?? []) {
    const card = register.risks.find((item) => item.kind === "product") ?? register.risks[0];
    if (!card) continue;
    addNode(nodes, node(`RSK-${register.featureId}`, "risk", card.risk, "inferred", register.featureId));
  }

  for (const experiment of plan.experiments ?? []) {
    addNode(nodes, node(`EXP-${experiment.id}`, "experiment", experiment.hypothesis, experiment.evidence, experiment.featureId));
  }

  const metrics = [
    ...plan.discovery.successMetrics.map((item, index) => ({ id: `MET-S${index + 1}`, text: item.text, evidence: item.evidence })),
    ...(plan.analytics?.signals ?? []).slice(0, 6).map((item) => ({ id: `MET-${item.id}`, text: item.detail, evidence: item.evidence })),
  ];
  for (const item of metrics) {
    addNode(nodes, node(item.id, "metric", item.text, item.evidence));
  }

  const ids = new Set(nodes.map((item) => item.id));
  const customersN = nodes.filter((item) => item.kind === "customer");
  const problemsN = nodes.filter((item) => item.kind === "problem");
  const oppsN = nodes.filter((item) => item.kind === "opportunity");
  const featuresN = nodes.filter((item) => item.kind === "feature");

  for (const customer of customersN) {
    const hit = bestId(problemsN, customer.label, ["problem"], 1);
    addEdge(edges, customer.id, hit ?? problemsN[0]?.id ?? "", ids);
  }

  for (const problem of problemsN) {
    const opp = bestId(oppsN, problem.label, ["opportunity"], 1);
    if (opp) addEdge(edges, problem.id, opp, ids);
    const rankedFeatures = [...featuresN]
      .map((feature) => {
        const row = plan.features.find((item) => item.id === feature.ref);
        return { feature, hits: overlap(problem.label, `${feature.label} ${row?.outcome ?? ""}`) + (row?.scope === "must" ? 1 : 0) };
      })
      .sort((a, b) => b.hits - a.hits)
      .filter((item) => item.hits >= 1)
      .slice(0, 4);
    for (const item of rankedFeatures) addEdge(edges, problem.id, item.feature.id, ids);
  }

  for (const opportunity of oppsN) {
    const byRef = opportunity.ref ? `FEA-${opportunity.ref}` : undefined;
    const feature = (byRef && ids.has(byRef) ? byRef : undefined) ?? bestId(featuresN, opportunity.label, ["feature"], 1);
    if (feature) addEdge(edges, opportunity.id, feature, ids);
    const problem = bestId(problemsN, opportunity.label, ["problem"], 1);
    if (problem) addEdge(edges, problem, opportunity.id, ids);
  }

  for (const feature of plan.features) {
    const fid = `FEA-${feature.id}`;
    for (const requirementId of feature.requirementIds) addEdge(edges, fid, `REQ-${requirementId}`, ids);
    addEdge(edges, fid, `OUT-${feature.id}`, ids);
    addEdge(edges, `RSK-${feature.id}`, `OUT-${feature.id}`, ids);
    if (ids.has(`RSK-${feature.id}`)) addEdge(edges, fid, `RSK-${feature.id}`, ids);
    const requirement = feature.requirementIds[0];
    if (requirement) {
      addEdge(edges, `REQ-${requirement}`, `RSK-${feature.id}`, ids);
      addEdge(edges, `REQ-${requirement}`, `OUT-${feature.id}`, ids);
    }
  }

  for (const experiment of plan.experiments ?? []) {
    const eid = `EXP-${experiment.id}`;
    const featureId = experiment.featureId
      ? `FEA-${experiment.featureId}`
      : bestId(featuresN, experiment.hypothesis, ["feature"], 1);
    if (featureId) addEdge(edges, featureId, eid, ids);
    const requirementId = bestId(nodes, experiment.hypothesis, ["requirement"], 1);
    if (requirementId) addEdge(edges, requirementId, eid, ids);
    const outcome = featureId?.replace("FEA-", "OUT-");
    if (outcome) addEdge(edges, eid, outcome, ids);
  }

  for (const metric of nodes.filter((item) => item.kind === "metric")) {
    const featureId = bestId(featuresN, metric.label, ["feature"], 1);
    const requirementId = bestId(nodes, metric.label, ["requirement"], 1);
    if (requirementId) addEdge(edges, requirementId, metric.id, ids);
    else if (featureId) addEdge(edges, featureId, metric.id, ids);
    const outcome = featureId ? `OUT-${featureId.replace("FEA-", "")}` : bestId(nodes, metric.label, ["outcome"], 1);
    if (outcome) addEdge(edges, metric.id, outcome, ids);
  }

  for (const decision of nodes.filter((item) => item.kind === "decision")) {
    const requirementId = bestId(nodes, decision.label, ["requirement"], 2);
    const featureId = bestId(featuresN, decision.label, ["feature"], 2);
    if (requirementId) addEdge(edges, requirementId, decision.id, ids);
    else if (featureId) addEdge(edges, featureId, decision.id, ids);
  }

  const lineages = attachLineage(plan, nodes, edges);
  ids.clear();
  for (const item of nodes) ids.add(item.id);

  return { note: GRAPH_NOTE, ascii: GRAPH_ASCII, lineageAscii: LINEAGE_ASCII, nodes, edges, lineages };
}

function pickEngineering(plan: ProductPlan, featureId: string, blob: string) {
  const story = plan.stories.find((item) => item.featureId === featureId);
  const fromStory = story?.tasks.find((item) => item.lane === "backend" || item.lane === "qa") ?? story?.tasks[0];
  if (fromStory?.title) return fromStory.title;
  const node = plan.decomposition?.nodes.find((item) => item.featureId === featureId);
  const fromNode = node?.tasks.find((item) => item.lane === "backend" || item.lane === "qa") ?? node?.tasks[0];
  if (fromNode?.title) return fromNode.title;
  const requirement = plan.requirements.find((item) => featureId && plan.features.find((row) => row.id === featureId)?.requirementIds.includes(item.id));
  return requirement?.statement || blob;
}

function attachLineage(plan: ProductPlan, nodes: GraphNode[], edges: GraphEdge[]): DecisionLineage[] {
  const ids = () => new Set(nodes.map((item) => item.id));
  const stated = parseStatedLineage(plan.sourceText);
  const lineages: DecisionLineage[] = [];

  const addStep = (steps: LineageStep[], layer: LineageLayer, id: string, label: string, evidence: Evidence) => {
    if (!label) return;
    addNode(nodes, node(id, layer === "outcome" ? "outcome" : layer, label, evidence));
    steps.push({ layer, label, evidence, nodeId: id });
  };

  if (stated && (stated.feature || stated.decision)) {
    const steps: LineageStep[] = [];
    addStep(steps, "feedback", "FBK-stated", stated.feedback, "stated");
    addStep(steps, "evidence", "EVD-stated", stated.evidence, "stated");
    addStep(steps, "assumption", "ASM-stated", stated.assumption, "stated");
    const statedFeature = plan.features.find((item) => Boolean(stated.feature) && linked(item.name, stated.feature, 1));
    addStep(steps, "decision", "DEC-stated", stated.decision, "stated");
    addStep(steps, "feature", statedFeature ? `FEA-${statedFeature.id}` : "FEA-stated", stated.feature, "stated");
    addStep(steps, "engineering", "ENG-stated", stated.engineering, "stated");
    addStep(steps, "outcome", "OUT-stated", stated.outcome, "stated");
    if (stated.newEvidence) addStep(steps, "evidence", "EVD-new", stated.newEvidence, "stated");
    const liveIds = ids();
    for (let index = 0; index < steps.length - 1; index += 1) {
      addEdge(edges, steps[index].nodeId ?? "", steps[index + 1].nodeId ?? "", liveIds);
    }
    if (stated.newEvidence && steps[0]?.nodeId) {
      addEdge(edges, steps[steps.length - 1].nodeId ?? "", steps.find((item) => item.layer === "evidence")?.nodeId ?? "", liveIds);
    }
    lineages.push({
      id: "LIN-stated",
      feature: stated.feature || stated.decision,
      featureId: statedFeature?.id,
      steps: steps.filter((item) => item.nodeId !== "EVD-new" || item.layer === "evidence"),
      causedBy: causedBy(steps.filter((item) => item.nodeId !== "EVD-new")),
    });
    return lineages;
  }

  for (const feature of plan.features) {
    if (lineages.some((item) => item.featureId === feature.id)) continue;
    const blob = `${feature.name} ${feature.outcome}`;
    const feedback =
      plan.discovery.userProblems.find((item) => linked(item.text, blob, 1))?.text ||
      plan.problem.statement;
    const entry = [...(plan.decisionLedger?.entries ?? [])]
      .sort((a, b) => (b.version ?? 1) - (a.version ?? 1))
      .find((item) => linked(`${item.question} ${item.decision} ${item.assumptions.map((row) => row.statement || row.text).join(" ")}`, blob, 1));
    const evidenceText =
      entry?.observations[0]?.statement ||
      entry?.observations[0]?.text ||
      entry?.evidence[0]?.text ||
      "";
    const assumptionText = entry?.assumptions[0]?.statement || entry?.assumptions[0]?.text || "";
    const decisionText = entry ? `${entry.decisionId || `DEC-${entry.number}`}${entry.version ? ` v${entry.version}` : ""} ${entry.decision}`.trim() : "";
    const engineering = pickEngineering(plan, feature.id, blob);
    const review = (plan.decisionReevaluation?.cases ?? []).find(
      (item) => entry && item.decisionNumber === entry.number,
    );
    const steps: LineageStep[] = [];
    addStep(steps, "feedback", `FBK-${feature.id}`, feedback, plan.discovery.userProblems[0]?.evidence ?? "inferred");
    addStep(steps, "evidence", `EVD-${feature.id}`, evidenceText, evidenceText ? "stated" : "unknown");
    addStep(steps, "assumption", `ASM-${feature.id}`, assumptionText, assumptionText ? "stated" : "unknown");
    addStep(steps, "decision", entry ? `DEC-${entry.number}` : `DEC-${feature.id}`, decisionText || entry?.question || "", entry?.status === "recorded" ? "stated" : "inferred");
    addStep(steps, "feature", `FEA-${feature.id}`, feature.name, feature.scope === "must" ? "stated" : "inferred");
    addStep(steps, "engineering", `ENG-${feature.id}`, engineering, engineering ? "inferred" : "unknown");
    addStep(steps, "outcome", `OUT-${feature.id}`, feature.outcome, "inferred");
    if (review?.evidence.text) addStep(steps, "evidence", `EVD-new-${feature.id}`, review.evidence.text, review.evidence.evidence);
    const liveIds = ids();
    const chain = steps.filter((item) => item.label);
    for (let index = 0; index < chain.length - 1; index += 1) {
      addEdge(edges, chain[index].nodeId ?? "", chain[index + 1].nodeId ?? "", liveIds);
    }
    lineages.push({
      id: `LIN-${feature.id}`,
      feature: feature.name,
      featureId: feature.id,
      steps: chain.filter((item) => !item.nodeId?.startsWith("EVD-new") || item.layer === "evidence"),
      causedBy: causedBy(chain.filter((item) => !item.nodeId?.startsWith("EVD-new"))),
    });
  }

  return lineages;
}

function neighbors(graph: ProductGraph, id: string, direction: "out" | "in" | "both" = "both") {
  return graph.edges
    .filter((item) => (direction !== "in" && item.from === id) || (direction !== "out" && item.to === id))
    .map((item) => (item.from === id ? item.to : item.from));
}

function walk(graph: ProductGraph, start: string, kinds: GraphNodeKind[]) {
  const found: GraphNode[] = [];
  const seen = new Set<string>();
  const queue = [start];
  while (queue.length) {
    const id = queue.shift();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    const node = graph.nodes.find((item) => item.id === id);
    if (node && kinds.includes(node.kind)) found.push(node);
    for (const next of neighbors(graph, id)) queue.push(next);
  }
  return found;
}

function problemWeight(plan: ProductPlan, graph: ProductGraph, problem: GraphNode) {
  const walked = walk(graph, problem.id, ["feature"]);
  const extra = graph.nodes.filter((item) => {
    if (item.kind !== "feature") return false;
    const row = plan.features.find((feature) => feature.id === item.ref);
    return Boolean(row && overlap(problem.label, `${row.name} ${row.outcome}`) >= 1);
  });
  const features = [...new Map([...walked, ...extra].map((item) => [item.id, item])).values()];
  let score = problem.evidence === "stated" ? 2 : 0;
  for (const feature of features) {
    const row = plan.features.find((item) => item.id === feature.ref);
    if (row?.scope === "must") score += 3;
    if (row?.scope === "should") score += 1;
    if (/offline|sync|packet|paper|payment|amount due|export/i.test(`${feature.label} ${problem.label}`)) score += 2;
    const rec = plan.recommendations.find(
      (item) => item.featureId === row?.id || (item.userImpact.level === "high" && linked(item.opportunity, feature.label)),
    );
    if (rec?.userImpact.level === "high") score += 3;
    if (rec?.evidence.some((line) => /\d/.test(line.text) && line.evidence === "stated")) score += 4;
  }
  if (plan.maturity === "problem") {
    if (/validate/i.test(features.map((item) => item.label).join(" "))) score += 2;
  }
  return { score, features };
}

function biggest(plan: ProductPlan, graph: ProductGraph): GraphAnswer {
  const ranked = graph.nodes
    .filter((item) => item.kind === "problem")
    .map((problem) => ({ problem, ...problemWeight(plan, graph, problem) }))
    .sort((a, b) => b.score - a.score);
  const top = ranked.filter((item) => item.features.length).slice(0, 3);
  const features = [...new Map(top.flatMap((item) => item.features).map((item) => [item.id, item])).values()];
  if (plan.maturity === "problem") {
    const validate = features.find((item) => /validate/i.test(item.label));
    const answer = validate
      ? `${validate.label} is the work on this problem: ${top[0]?.problem.label}. A product bet is still gated.`
      : `The named problem is ${plan.problem.statement} Validation is the next step.`;
    return { query: GRAPH_BIGGEST, kind: "biggest", nodes: [top[0]?.problem, validate].filter(Boolean) as GraphNode[], answer };
  }
  if (!features.length) {
    return { query: GRAPH_BIGGEST, kind: "biggest", nodes: [], answer: "No feature is linked to a named customer problem yet." };
  }
  const answer = top
    .map((item) => `${item.features.map((feature) => feature.label).join(", ")} sit on: ${item.problem.label}`)
    .join(" ");
  return { query: GRAPH_BIGGEST, kind: "biggest", nodes: [...top.map((item) => item.problem), ...features], answer };
}

function weak(plan: ProductPlan, graph: ProductGraph): GraphAnswer {
  const roadmapIds = new Set([
    ...(plan.roadmap?.sprints ?? []).flatMap((sprint) => sprint.featureIds),
    ...(plan.roadmap?.deferred ?? []),
    ...plan.features.filter((item) => item.scope === "later").map((item) => item.id),
  ]);
  const nodes = graph.nodes.filter((item) => {
    if (item.kind !== "feature" || !item.ref) return false;
    const feature = plan.features.find((row) => row.id === item.ref);
    if (!feature) return false;
    const onRoadmap = roadmapIds.has(feature.id) || plan.proposed;
    if (!onRoadmap) return false;
    const rec = plan.recommendations.find((row) => row.featureId === feature.id);
    const reqs = plan.requirements.filter((row) => feature.requirementIds.includes(row.id));
    const weakReq = reqs.length ? reqs.every((row) => row.evidence !== "stated") : plan.proposed;
    const later = feature.scope === "later";
    const lowConfidence = rec != null && rec.confidence < 0.5;
    return Boolean(plan.proposed || later || weakReq || lowConfidence);
  });
  if (!nodes.length) {
    return { query: GRAPH_WEAK, kind: "weak", nodes: [], answer: "No roadmap item is marked as weak evidence." };
  }
  const answer = nodes.map((item) => item.label).join(", ") + " sit on inferred, later, or uncounted evidence.";
  return { query: GRAPH_WEAK, kind: "weak", nodes, answer };
}

function assumptions(plan: ProductPlan, graph: ProductGraph): GraphAnswer {
  const open = [
    ...plan.decisions.filter((item) => item.status === "assumption" || item.status === "needsValidation" || item.status === "unknown"),
    ...plan.decisionLedger.entries.flatMap((entry) =>
      entry.assumptions
        .filter((item) => item.health === "untested" || item.health === "stale")
        .map((item) => ({ decision: item.text, status: item.health })),
    ),
  ];
  const nodes = graph.nodes.filter((item) => {
    if (item.kind !== "requirement") return false;
    return open.some((row) => linked(item.label, "decision" in row ? row.decision : "", 2) || linked(item.label, String("decision" in row ? row.decision : ""), 1));
  });
  const extra = plan.requirements.filter((item) =>
    open.some((row) => {
      const text = "decision" in row ? row.decision : "";
      return linked(item.statement, text, 2) || (/\bexport\b/i.test(item.statement) && /pdf|export/i.test(text));
    }),
  );
  for (const item of extra) {
    const node = graph.nodes.find((row) => row.ref === item.id && row.kind === "requirement");
    if (node && !nodes.some((row) => row.id === node.id)) nodes.push(node);
  }
  if (!nodes.length) {
    return { query: GRAPH_ASSUMPTIONS, kind: "assumptions", nodes: [], answer: "No requirement is hanging on an unvalidated assumption." };
  }
  const named = open
    .map((row) => ("decision" in row ? row.decision : ""))
    .filter((text) => /pdf|assumption|proposed|validation/i.test(text))
    .slice(0, 2);
  const answer = `${nodes.map((item) => item.label).join(" ")} ${named.length ? `Depends on: ${named.join(" ")}` : "Depends on an assumption that is still open."}`;
  return { query: GRAPH_ASSUMPTIONS, kind: "assumptions", nodes, answer };
}

function feedback(plan: ProductPlan, graph: ProductGraph, corpus: string): GraphAnswer {
  const blob = [
    corpus,
    plan.sourceText,
    ...(plan.decisionReevaluation?.cases ?? []).map((item) => `${item.assumption} ${item.evidence.text}`),
    ...(plan.context?.alreadyExists ?? []).map((item) => item.text),
  ].join("\n");
  const hasFeedback = /feedback|usage increased|no longer|packets?|support|complain/i.test(blob);
  const nodes = graph.nodes.filter((item) => {
    if (item.kind !== "decision") return false;
    if (!hasFeedback) return false;
    return (
      linked(item.label, blob, 2) ||
      (/#142|offline|queue and sync/i.test(item.label) && /offline|38%|rarely need offline/i.test(blob)) ||
      (/cityworks|offline|packet|inspection/i.test(item.label) && /packet|offline|inspector/i.test(blob))
    );
  });
  const reviews = (plan.decisionReevaluation?.cases ?? []).filter((item) => item.verdict === "review" || item.verdict === "reconsider");
  for (const item of reviews) {
    const node = graph.nodes.find((row) => row.kind === "decision" && row.ref === String(item.decisionNumber));
    if (node && !nodes.some((row) => row.id === node.id)) nodes.push(node);
  }
  if (!nodes.length) {
    return { query: GRAPH_FEEDBACK, kind: "feedback", nodes: [], answer: "No recorded decision is moved by new customer feedback on this plan." };
  }
  const answer = nodes.map((item) => item.label).join(" ");
  return { query: GRAPH_FEEDBACK, kind: "feedback", nodes, answer };
}

function caused(plan: ProductPlan, graph: ProductGraph, query: string): GraphAnswer {
  const words = contentWords(query.replace(/what caused|this feature to exist|why does|to exist|feature/gi, ""));
  const lineages = graph.lineages ?? [];
  const hit =
    lineages.find((item) => words.some((word) => item.feature.toLowerCase().includes(word))) ||
    lineages.find((item) => item.id === "LIN-stated") ||
    lineages[0];
  if (!hit) {
    return { query: GRAPH_CAUSED, kind: "caused", nodes: [], answer: "No feature has a stored lineage yet." };
  }
  const nodes = hit.steps
    .map((step) => graph.nodes.find((item) => item.id === step.nodeId))
    .filter((item): item is GraphNode => Boolean(item));
  return {
    query,
    kind: "caused",
    nodes,
    answer: `${hit.feature} exists because ${hit.causedBy.replace(/\.+$/, "")}.`,
  };
}

export function askGraph(plan: ProductPlan, query: string, extra?: { corpus?: string }): GraphAnswer {
  const graph = plan.productGraph ?? emptyProductGraph();
  const text = query.trim();
  if (!text) return { query, kind: "search", nodes: [], answer: "Ask which features sit on the biggest problems, which roadmap items are weakly evidenced, which requirements hang on assumptions, which decisions a new note moves, or what caused a feature to exist." };
  if (/biggest customer problems|features are solving/i.test(text)) return biggest(plan, graph);
  if (/weak evidence|roadmap items have weak/i.test(text)) return weak(plan, graph);
  if (/unvalidated assumptions|depend on unvalidated/i.test(text)) return assumptions(plan, graph);
  if (/affected by this new customer feedback|new customer feedback/i.test(text)) return feedback(plan, graph, extra?.corpus ?? "");
  if (/caused this feature|feature to exist|why does this feature/i.test(text)) return caused(plan, graph, text);
  const words = contentWords(text);
  const nodes = graph.nodes.filter((item) => words.some((word) => item.label.toLowerCase().includes(word)));
  return {
    query,
    kind: "search",
    nodes,
    answer: nodes.length ? nodes.map((item) => `${item.kind}: ${item.label}`).join(" ") : "No graph node matches that question.",
  };
}

export function graphMarkdown(plan: ProductPlan) {
  const graph = plan.productGraph;
  if (!graph?.nodes.length) return "The product knowledge graph is empty.";
  const lines = graph.nodes.map((item) => `- ${item.kind}: ${item.label} (${item.evidence})`);
  return `${GRAPH_ASCII}

${graph.lineageAscii ?? LINEAGE_ASCII}

${lines.join("\n")}`;
}

export function graphPaths(plan: ProductPlan) {
  const graph = plan.productGraph ?? emptyProductGraph();
  return graph.nodes
    .filter((item) => item.kind === "feature")
    .map((feature) => {
      const problem = walk(graph, feature.id, ["problem"])[0];
      const customer = problem ? walk(graph, problem.id, ["customer"])[0] : walk(graph, feature.id, ["customer"])[0];
      const opportunity = walk(graph, feature.id, ["opportunity"])[0];
      const requirement = neighbors(graph, feature.id, "out")
        .map((id) => graph.nodes.find((item) => item.id === id && item.kind === "requirement"))
        .find(Boolean);
      const branches = BRANCH.map((kind) => walk(graph, feature.id, [kind])[0]).filter(Boolean);
      const outcome = walk(graph, feature.id, ["outcome"])[0];
      return { feature, customer, problem, opportunity, requirement, branches, outcome };
    });
}
