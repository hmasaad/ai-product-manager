import type {
  ApproachAlternative,
  ApproachPosture,
  ApproachStep,
  ClientApproach,
  ProductPlan,
} from "./types";

export const APPROACH_NOTE =
  "When the request is a business idea, the plan names the approach to suggest to the client: the first slice, what to confirm, and what to hold. A problem brief stays a validation plan. Stated scope stays the signed v1.";

export const APPROACH_ASCII = `Client request
       │
       ↓
   Name the job
       │
       ↓
Recommend an approach
       │
       ├──── First slice
       │
       ├──── Confirm with the client
       │
       └──── Hold for later`;

export const APPROACH_LABEL: Record<ApproachPosture, string> = {
  validate: "Validate first",
  "proposed-mvp": "Propose an MVP",
  "stated-scope": "Ship the stated v1",
  repair: "Fix the named failures",
};

export function emptyClientApproach(): ClientApproach {
  return {
    note: APPROACH_NOTE,
    ascii: APPROACH_ASCII,
    posture: "validate",
    headline: "",
    pitch: "",
    firstSlice: "",
    steps: [],
    later: [],
    questions: [],
    alternatives: [],
  };
}

function unique(lines: string[]) {
  const seen = new Set<string>();
  return lines.filter((line) => {
    const key = line.replace(/\s+/g, " ").trim();
    if (key.length < 3 || seen.has(key.toLowerCase())) return false;
    seen.add(key.toLowerCase());
    return true;
  });
}

function musts(plan: ProductPlan) {
  return plan.requirements.filter((item) => item.priority === "must");
}

function laters(plan: ProductPlan) {
  return unique([
    ...plan.requirements.filter((item) => item.priority === "later").map((item) => item.statement),
    ...plan.discovery.futureScope.map((item) => item.text),
    ...plan.problem.nonGoals,
  ]).slice(0, 5);
}

function questionsOf(plan: ProductPlan) {
  return unique([...plan.problem.openQuestions, ...plan.discovery.questions]).slice(0, 5);
}

function postureOf(plan: ProductPlan): ApproachPosture {
  if (plan.maturity === "problem") return "validate";
  if (plan.proposed) return "proposed-mvp";
  if (plan.input.existing.trim() && plan.recommendations.some((item) => item.evidence.some((line) => line.evidence === "stated"))) {
    return "repair";
  }
  return "stated-scope";
}

function alternativesOf(plan: ProductPlan, posture: ApproachPosture): ApproachAlternative[] {
  if (posture === "validate") {
    return [
      {
        title: "Design a product from this sentence",
        reason: "The source names a problem and no mechanism. A booking app, an API, or a new queue would be invented.",
      },
    ];
  }
  const competitors = plan.discovery.competitors
    .filter((item) => !/^not named$/i.test(item.name))
    .slice(0, 2)
    .map((item) => ({
      title: `Copy ${item.name}`,
      reason: item.note,
    }));
  if (posture === "proposed-mvp") {
    return uniqueTitles([
      {
        title: "Keep today's workaround",
        reason: plan.problem.costOfInaction || "The record stays wherever people already write.",
      },
      ...competitors,
      {
        title: "Build past the named job in v1",
        reason: "The request named a job, not a platform. Extra surface waits on a buyer.",
      },
    ]);
  }
  if (posture === "repair") {
    const hold = plan.constraints.find((line) => /do not redesign/i.test(line));
    return [
      {
        title: "Redesign the whole surface",
        reason: hold || "The source names specific failures. A rebuild is a different bet.",
      },
    ];
  }
  const cityworks = plan.constraints.find((line) => /cityworks remains|do not replace cityworks/i.test(line));
  if (cityworks) {
    return [{ title: "Replace CityWorks in v1", reason: cityworks }];
  }
  return competitors.slice(0, 2);
}

function uniqueTitles(items: ApproachAlternative[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = item.title.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function stepsOf(plan: ProductPlan, posture: ApproachPosture): ApproachStep[] {
  if (posture === "validate") {
    return [
      {
        title: "Watch the named people do the job",
        detail: `Sit with ${plan.problem.who || "the people named in the source"} and record what they do today.`,
      },
      {
        title: "Name the number that should move",
        detail: plan.problem.success[0] || plan.discovery.successMetrics[0]?.text || "Ask which number should move before anyone designs software.",
      },
      {
        title: "Hold the product bet",
        detail: "A problem brief is a validation plan. No architecture and no sprint until that work exits.",
      },
    ];
  }
  if (posture === "repair") {
    return plan.recommendations.slice(0, 4).map((item) => ({
      title: item.opportunity,
      detail: `${item.userImpact.reason} Confidence ${item.confidence.toFixed(2)}.`,
    }));
  }
  const mvp = plan.discovery.mvpDefinition.filter((item) => item.text.length > 3).slice(0, 5);
  if (mvp.length) {
    return mvp.map((item, index) => ({
      title: index === 0 ? "First slice" : `Then ${item.text.replace(/^./, (letter) => letter.toLowerCase())}`,
      detail: item.text,
    }));
  }
  return musts(plan)
    .slice(0, 5)
    .map((item, index) => ({
      title: index === 0 ? "First slice" : item.statement,
      detail: item.statement,
    }));
}

function articleFor(title: string) {
  return /^[aeiou]/i.test(title) ? "an" : "a";
}

function situationLine(plan: ProductPlan) {
  const first = plan.problem.statement.split(/[.\n]/)[0]?.replace(/\.$/, "").trim() ?? plan.title;
  return first;
}

function headlineOf(plan: ProductPlan, posture: ApproachPosture) {
  if (posture === "validate") return `Suggest validation for ${plan.title}, not a product bet.`;
  if (posture === "proposed-mvp") return `Suggest ${articleFor(plan.title)} ${plan.title} MVP to the client.`;
  if (posture === "repair") return `Suggest fixing ${plan.recommendations[0]?.opportunity ?? plan.title} first.`;
  return `Suggest shipping the stated ${plan.title} v1.`;
}

function pitchOf(plan: ProductPlan, posture: ApproachPosture, firstSlice: string) {
  if (posture === "validate") {
    return `Suggest sitting with ${plan.problem.who || "the people named in the source"} and recording what they do today. ${situationLine(plan)}. Do not design a product until the open questions have an owner.`;
  }
  if (posture === "proposed-mvp") {
    const later = laters(plan)[0];
    return `Suggest this first slice to the client: ${firstSlice} ${later ? `Hold ${later.replace(/\.$/, "")} until a buyer confirms who does the work and what done means.` : "Treat the rest as later until a buyer confirms the first job."}`;
  }
  if (posture === "repair") {
    const names = plan.recommendations.slice(0, 3).map((item) => item.opportunity).join(", ");
    return `Suggest fixing ${names || "the named failures"} on the surface people already use. A full redesign is a different bet.`;
  }
  const constraint = plan.constraints.find((line) => /cityworks|okta|do not/i.test(line));
  return `The client already named the must-haves. Suggest v1 as ${firstSlice}${constraint ? ` ${constraint}` : ""}`;
}

function firstSliceOf(plan: ProductPlan, posture: ApproachPosture) {
  if (posture === "validate") {
    return `Sit with ${plan.problem.who || "the people named in the source"} and record what they do today.`;
  }
  if (posture === "repair") {
    return plan.recommendations[0]?.opportunity || plan.title;
  }
  const named = musts(plan)
    .slice(0, 3)
    .map((item) => item.statement.replace(/\.$/, ""));
  if (named.length) return `${named.join("; ")}.`;
  const mvp = plan.discovery.mvpDefinition.slice(0, 3).map((item) => item.text.replace(/\.$/, ""));
  if (mvp.length) return `${mvp.join("; ")}.`;
  return plan.features[0]?.outcome || plan.title;
}

export function buildClientApproach(plan: ProductPlan): ClientApproach {
  const posture = postureOf(plan);
  const firstSlice = firstSliceOf(plan, posture);
  return {
    note: APPROACH_NOTE,
    ascii: APPROACH_ASCII,
    posture,
    headline: headlineOf(plan, posture),
    pitch: pitchOf(plan, posture, firstSlice),
    firstSlice,
    steps: stepsOf(plan, posture),
    later: laters(plan),
    questions: questionsOf(plan),
    alternatives: alternativesOf(plan, posture),
  };
}

export function approachMarkdown(plan: ProductPlan) {
  const approach = plan.approach;
  if (!approach?.headline) return "No client approach was written.";
  const steps = approach.steps.map((item) => `- ${item.title}: ${item.detail}`).join("\n");
  const later = approach.later.map((line) => `- ${line}`).join("\n") || "- None named.";
  const questions = approach.questions.map((line) => `- ${line}`).join("\n") || "- None named.";
  const alternatives = approach.alternatives.map((item) => `- ${item.title}: ${item.reason}`).join("\n") || "- None named.";
  return `${approach.headline}

${approach.pitch}

First slice: ${approach.firstSlice}

Steps:
${steps}

Hold for later:
${later}

Confirm with the client:
${questions}

Other approaches:
${alternatives}`;
}
