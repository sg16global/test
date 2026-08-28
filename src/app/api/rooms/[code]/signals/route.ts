import { pullSignals, pushSignal, roomExists } from "@/lib/server/rooms";
import type { Role } from "@/lib/protocol";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ code: string }> };

function normalize(raw: string) {
  return raw.trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 12);
}

export async function GET(request: Request, ctx: Ctx) {
  const { code: raw } = await ctx.params;
  const code = normalize(raw);
  const url = new URL(request.url);
  const role = url.searchParams.get("role") === "receiver" ? "receiver" : "sender";
  const after = Number.parseInt(url.searchParams.get("after") ?? "0", 10) || 0;
  if (!(await roomExists(code))) return Response.json({ error: "room not found" }, { status: 404 });
  return Response.json({ items: await pullSignals(code, role as Role, after), serverTime: Date.now() });
}

export async function POST(request: Request, ctx: Ctx) {
  const { code: raw } = await ctx.params;
  const code = normalize(raw);
  const body = (await request.json().catch(() => ({}))) as { role?: string; kind?: string; payload?: unknown };
  const role: Role = body.role === "receiver" ? "receiver" : "sender";
  const kind = body.kind === "control" ? "control" : "candidate";
  if (!(await roomExists(code))) return Response.json({ error: "room not found" }, { status: 404 });
  await pushSignal(code, role, body.payload ?? {}, kind);
  return Response.json({ ok: true });
}
