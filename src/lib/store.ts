import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { ProductPlan } from "./types";

const FILE = path.join(process.cwd(), "data", "latest.json");

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
