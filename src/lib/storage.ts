import type { ProductPlan } from "./types";

const KEY = "pm:latest";

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

export async function fetchStatus() {
  const response = await fetch("/api/status");
  if (!response.ok) return { configured: false };
  return (await response.json()) as { configured: boolean };
}
