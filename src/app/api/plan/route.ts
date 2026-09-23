import { runProductManager } from "@/lib/agent";
import { friendlyModelError } from "@/lib/model-errors";
import { saveLatest } from "@/lib/store";
import type { ProductPlan } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 120;

function sse(event: string, data: unknown) {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

export async function POST(request: Request) {
  const encoder = new TextEncoder();
  let brief = "";
  let existing = "";
  let constraints = "";

  try {
    const body = (await request.json()) as {
      brief?: string;
      existing?: string;
      constraints?: string;
    };
    brief = body.brief ?? "";
    existing = body.existing ?? "";
    constraints = body.constraints ?? "";
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!brief.trim() && !existing.trim()) {
    return Response.json({ error: "Add an idea, a problem, or notes from the current product." }, { status: 400 });
  }

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(encoder.encode(sse(event, data)));
      };
      try {
        let plan: ProductPlan | null = null;
        await runProductManager({
          brief,
          existing,
          constraints,
          onEvent: (event) => {
            if (event.type === "step") send("step", event.step);
            if (event.type === "usage") send("usage", event.usage);
            if (event.type === "plan") {
              plan = event.plan;
              send("plan", event.plan);
            }
            if (event.type === "error") send("error", { message: event.message });
          },
        });
        if (plan) await saveLatest(plan);
        send("done", { ok: Boolean(plan) });
      } catch (error) {
        send("error", { message: friendlyModelError(error) });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
