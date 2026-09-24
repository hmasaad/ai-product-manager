import { structureEntry } from "./ledger";
import { emptyMemory, mergeMemory } from "./memory";
import type { LedgerEntry, ProductMemory, ProductPlan } from "./types";

const KEY = "pm:latest";
const MEMORY_KEY = "pm:memory";

export function savePlan(plan: ProductPlan) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(plan));
}

export function loadPlan(): ProductPlan | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as ProductPlan;
  } catch {
    return null;
  }
}

export async function fetchLatest(): Promise<ProductPlan | null> {
  const local = loadPlan();
  try {
    const response = await fetch("/api/latest");
    if (!response.ok) return local;
    const payload = (await response.json()) as { plan?: ProductPlan | null };
    if (!payload.plan) return local;
    if (!local) return payload.plan;
    return local.createdAt >= payload.plan.createdAt ? local : payload.plan;
  } catch {
    return local;
  }
}

export function loadMemoryLocal(): ProductMemory {
  if (typeof window === "undefined") return emptyMemory();
  const raw = window.localStorage.getItem(MEMORY_KEY);
  if (!raw) return emptyMemory();
  try {
    const parsed = JSON.parse(raw) as ProductMemory;
    return parsed?.items
      ? { ...emptyMemory(), ...parsed, products: parsed.products ?? (parsed.product ? [parsed.product] : []), ledger: (parsed.ledger ?? []).map((item) => structureEntry(item as LedgerEntry)), nextDecisionNumber: parsed.nextDecisionNumber ?? 1 }
      : emptyMemory();
  } catch {
    return emptyMemory();
  }
}

export function saveMemoryLocal(memory: ProductMemory) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(MEMORY_KEY, JSON.stringify(memory));
}

export async function fetchMemory(): Promise<ProductMemory> {
  const local = loadMemoryLocal();
  try {
    const response = await fetch("/api/memory");
    if (!response.ok) return local;
    const payload = (await response.json()) as { memory?: ProductMemory };
    const merged = mergeMemory(local, payload.memory ?? emptyMemory());
    saveMemoryLocal(merged);
    return merged;
  } catch {
    return local;
  }
}

export async function saveMemoryRemote(body: {
  feedback?: string;
  metrics?: string;
  ledger?: import("./types").LedgerEntry[];
  clear?: boolean;
}) {
  const response = await fetch("/api/memory", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error("Could not update product context.");
  const payload = (await response.json()) as { memory: ProductMemory };
  saveMemoryLocal(payload.memory);
  return payload.memory;
}

export async function fetchStatus() {
  const response = await fetch("/api/status");
  if (!response.ok) return { configured: false };
  return (await response.json()) as { configured: boolean };
}
