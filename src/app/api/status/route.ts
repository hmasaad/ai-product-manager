import { modelConfigured } from "@/lib/model";

export const runtime = "nodejs";

export async function GET() {
  return Response.json({ configured: modelConfigured() });
}
