import { z } from "zod";

const evidence = z.enum(["stated", "inferred", "unknown"]);
const priority = z.enum(["must", "should", "later"]);

export const judgmentSchema = z.object({
  title: z.string(),
  maturity: z.enum(["problem", "solution"]),
  research: z.array(
    z.object({
      topic: z.string(),
      finding: z.string(),
      evidence,
      implication: z.string(),
    }),
  ),
  problem: z.object({
    statement: z.string(),
    who: z.string(),
    currentWorkaround: z.string(),
    costOfInaction: z.string(),
    success: z.array(z.string()),
    nonGoals: z.array(z.string()),
    openQuestions: z.array(z.string()),
  }),
  personas: z.array(
    z.object({
      name: z.string(),
      role: z.string(),
      context: z.string(),
      jobs: z.array(z.string()),
      pains: z.array(z.string()),
      success: z.string(),
      evidence,
    }),
  ),
  requirements: z.array(
    z.object({
      id: z.string(),
      priority,
      statement: z.string(),
      rationale: z.string(),
      persona: z.string(),
      evidence,
    }),
  ),
  constraints: z.array(z.string()),
  assumptions: z.array(z.string()),
  risks: z.array(z.string()),
});

function objectSchema(properties: Record<string, unknown>, required: string[]) {
  return { type: "object", properties, required };
}

const stringArray = { type: "array", items: { type: "string" } };

export const judgmentJsonSchema: Record<string, unknown> = objectSchema(
  {
    title: { type: "string" },
    maturity: { type: "string", enum: ["problem", "solution"] },
    research: {
      type: "array",
      items: objectSchema(
        {
          topic: { type: "string" },
          finding: { type: "string" },
          evidence: { type: "string", enum: ["stated", "inferred", "unknown"] },
          implication: { type: "string" },
        },
        ["topic", "finding", "evidence", "implication"],
      ),
    },
    problem: objectSchema(
      {
        statement: { type: "string" },
        who: { type: "string" },
        currentWorkaround: { type: "string" },
        costOfInaction: { type: "string" },
        success: stringArray,
        nonGoals: stringArray,
        openQuestions: stringArray,
      },
      [
        "statement",
        "who",
        "currentWorkaround",
        "costOfInaction",
        "success",
        "nonGoals",
        "openQuestions",
      ],
    ),
    personas: {
      type: "array",
      items: objectSchema(
        {
          name: { type: "string" },
          role: { type: "string" },
          context: { type: "string" },
          jobs: stringArray,
          pains: stringArray,
          success: { type: "string" },
          evidence: { type: "string", enum: ["stated", "inferred", "unknown"] },
        },
        ["name", "role", "context", "jobs", "pains", "success", "evidence"],
      ),
    },
    requirements: {
      type: "array",
      items: objectSchema(
        {
          id: { type: "string" },
          priority: { type: "string", enum: ["must", "should", "later"] },
          statement: { type: "string" },
          rationale: { type: "string" },
          persona: { type: "string" },
          evidence: { type: "string", enum: ["stated", "inferred", "unknown"] },
        },
        ["id", "priority", "statement", "rationale", "persona", "evidence"],
      ),
    },
    constraints: stringArray,
    assumptions: stringArray,
    risks: stringArray,
  },
  [
    "title",
    "maturity",
    "research",
    "problem",
    "personas",
    "requirements",
    "constraints",
    "assumptions",
    "risks",
  ],
);
