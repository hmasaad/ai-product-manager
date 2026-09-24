import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { structureEntry } from "./ledger";
import { emptyMemory } from "./memory";
import type { LedgerEntry, ProductMemory, ProductPlan } from "./types";

const FILE = path.join(process.cwd(), "data", "latest.json");
const MEMORY = path.join(process.cwd(), "data", "memory.json");

export async function saveLatest(plan: ProductPlan) {
  await mkdir(path.dirname(FILE), { recursive: true });
  await writeFile(FILE, JSON.stringify(plan, null, 2), "utf8");
}

export async function loadLatest(): Promise<ProductPlan | null> {
  try {
    const raw = await readFile(FILE, "utf8");
    return JSON.parse(raw) as ProductPlan;
  } catch {
    return null;
  }
}

export async function saveMemory(memory: ProductMemory) {
  await mkdir(path.dirname(MEMORY), { recursive: true });
  await writeFile(MEMORY, JSON.stringify(memory, null, 2), "utf8");
}

export async function loadMemory(): Promise<ProductMemory> {
  try {
    const raw = await readFile(MEMORY, "utf8");
    const parsed = JSON.parse(raw) as ProductMemory;
    if (!parsed || !Array.isArray(parsed.items)) return emptyMemory();
    return {
      ...emptyMemory(),
      ...parsed,
      products: parsed.products ?? (parsed.product ? [parsed.product] : []),
      ledger: (parsed.ledger ?? []).map((item) => structureEntry(item as LedgerEntry)),
      nextDecisionNumber: parsed.nextDecisionNumber ?? 1,
    };
  } catch {
    return emptyMemory();
  }
}
