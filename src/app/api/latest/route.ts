import { loadLatest } from "@/lib/store";

export const runtime = "nodejs";

export async function GET() {
  const plan = await loadLatest();
  return Response.json({ plan });
}
