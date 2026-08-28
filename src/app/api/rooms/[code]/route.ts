import { deleteRoom, getRoom, touchRoom, updateRoom } from "@/lib/server/rooms";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ code: string }> };

function normalizeCode(raw: string) {
  return raw.trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 12);
}

export async function GET(_request: Request, ctx: Ctx) {
  const { code: raw } = await ctx.params;
  const code = normalizeCode(raw);
  const room = await getRoom(code);
  if (!room) return Response.json({ error: "room not found or expired" }, { status: 404 });
  await touchRoom(code);
  return Response.json({ room });
}

export async function PATCH(request: Request, ctx: Ctx) {
  const { code: raw } = await ctx.params;
  const code = normalizeCode(raw);
  const room = await getRoom(code);
  if (!room) return Response.json({ error: "room not found or expired" }, { status: 404 });
  const body = (await request.json().catch(() => ({}))) as { role?: string; offer?: { type?: string; sdp?: string }; answer?: { type?: string; sdp?: string }; status?: string; name?: string; device?: string };
  const patch: Record<string, unknown> = { updatedAt: new Date() };
  if (body.offer && body.offer.type === "offer" && typeof body.offer.sdp === "string") patch.offer = { type: "offer", sdp: body.offer.sdp };
  if (body.answer && body.answer.type === "answer" && typeof body.answer.sdp === "string") patch.answer = { type: "answer", sdp: body.answer.sdp };
  if (typeof body.status === "string" && ["waiting", "linked", "busy", "closed"].includes(body.status)) patch.status = body.status;
  if (body.role === "receiver") { if (typeof body.name === "string") patch.receiverName = body.name.slice(0, 40); if (typeof body.device === "string") patch.receiverDevice = body.device.slice(0, 40); patch.status = "linked"; }
  const updated = await updateRoom(code, patch);
  if (!updated) return Response.json({ error: "room not found or expired" }, { status: 404 });
  return Response.json({ room: updated });
}

export async function DELETE(_request: Request, ctx: Ctx) {
  await deleteRoom(normalizeCode((await ctx.params).code));
  return Response.json({ ok: true });
}
