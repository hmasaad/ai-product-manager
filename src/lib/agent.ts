import { contentWords } from "./text";
import { buildJudgment } from "./grounded";
import { modelConfigured, generateStructured } from "./model";
import { friendlyModelError } from "./model-errors";
import { judgmentPrompt, JUDGMENT_SYSTEM } from "./prompts";
import { planFromJudgment } from "./planner";
import { PIPELINE } from "./roster";
import { judgmentJsonSchema, judgmentSchema } from "./schemas";
import type { AgentStepEvent, Judgment, ModelUsage, ProductInput, ProductPlan } from "./types";

export type AgentEvent =
  | { type: "step"; step: AgentStepEvent }
  | { type: "plan"; plan: ProductPlan }
  | { type: "usage"; usage: ModelUsage }
  | { type: "error"; message: string };

function covers(blob: string, statement: string) {
  const words = contentWords(statement);
  if (!words.length) return true;
  const hits = words.filter((word) => blob.includes(word));
  return hits.length >= Math.min(2, words.length);
}

function keepsScope(grounded: Judgment, edited: Judgment) {
  if (grounded.maturity === "problem") return edited.maturity === "problem";
  const blob = edited.requirements.map((item) => item.statement.toLowerCase()).join("\n");
  return grounded.requirements
    .filter((item) => item.priority === "must" && item.evidence === "stated")
    .every((item) => covers(blob, item.statement));
}

export async function runProductManager(input: {
  brief: string;
  existing: string;
  constraints: string;
  onEvent: (event: AgentEvent) => void;
}) {
  const productInput: ProductInput = {
    brief: input.brief,
    existing: input.existing,
    constraints: input.constraints,
  };
  const grounded = buildJudgment(productInput);
  let judgment = grounded;
  let mode: ProductPlan["mode"] = "grounded";
  let note = "";
  let usage: ModelUsage | undefined;

  const send = (id: AgentStepEvent["id"]) => {
    const step = PIPELINE.find((item) => item.id === id);
    if (!step) return;
    input.onEvent({ type: "step", step });
  };

  send("research");

  if (modelConfigured()) {
    try {
      const result = await generateStructured({
        schema: judgmentSchema,
        jsonSchema: judgmentJsonSchema,
        system: JUDGMENT_SYSTEM,
        prompt: judgmentPrompt(productInput.brief + "\n" + productInput.existing + "\n" + productInput.constraints, grounded),
      });
      usage = result.usage;
      input.onEvent({ type: "usage", usage });
      if (keepsScope(grounded, result.object)) {
        judgment = {
          ...result.object,
          requirements: result.object.requirements.map((item, index) => ({
            ...item,
            id: `R${index + 1}`,
          })),
        };
        mode = "model";
      } else {
        note = "Kept the grounded plan. The model dropped stated scope or turned a problem into a build.";
      }
    } catch (error) {
      note = friendlyModelError(error);
    }
  }

  send("problem");
  send("personas");
  send("prd");
  send("features");
  send("stories");
  send("priority");
  send("roadmap");
  send("handoff");

  const plan = planFromJudgment({ input: productInput, judgment, mode, note, usage });
  input.onEvent({ type: "plan", plan });
  return plan;
}
