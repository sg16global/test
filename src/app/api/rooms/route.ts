import { createRoom, generateCode, pruneStale } from "@/lib/server/rooms";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** POST /api/rooms -> create a handshake room and return its short code. */
export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      name?: string;
      device?: string;
    };
    await pruneStale();
    const code = await generateCode(5);
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 4);
    await createRoom({
      code,
      senderName: (body.name ?? "Sender").toString().slice(0, 40),
      senderDevice: (body.device ?? "unknown").toString().slice(0, 40),
      expiresAt,
    });
    return Response.json({ code, expiresAt: expiresAt.toISOString() });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "failed to create room" },
      { status: 500 },
    );
  }
}
