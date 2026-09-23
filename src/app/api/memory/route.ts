import { emptyMemory, mergeMemory, rememberLedger, rememberNotes } from "@/lib/memory";
import { loadMemory, saveMemory } from "@/lib/store";
import type { LedgerEntry, ProductMemory } from "@/lib/types";

export const runtime = "nodejs";

export async function GET() {
  return Response.json({ memory: await loadMemory() });
}

export async function PUT(request: Request) {
  try {
    const body = (await request.json()) as {
      memory?: ProductMemory;
      feedback?: string;
      metrics?: string;
      ledger?: LedgerEntry[];
      clear?: boolean;
    };
    if (body.clear) {
      const blank = emptyMemory();
      await saveMemory(blank);
      return Response.json({ memory: blank });
    }
    let memory = await loadMemory();
    if (body.memory) memory = mergeMemory(memory, body.memory);
    if (body.feedback || body.metrics) {
      memory = rememberNotes(memory, { feedback: body.feedback, metrics: body.metrics });
    }
    if (body.ledger?.length) memory = rememberLedger(memory, body.ledger);
    await saveMemory(memory);
    return Response.json({ memory });
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }
}
