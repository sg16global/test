import { logTransfer, recentTransfers, transferStats } from "@/lib/server/stats";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  await logTransfer({
    mode: typeof body.mode === "string" ? body.mode : "p2p",
    fileName: typeof body.fileName === "string" ? body.fileName : "file",
    fileSize: Number(body.fileSize ?? 0),
    mimeType: typeof body.mimeType === "string" ? body.mimeType : undefined,
    senderDevice: typeof body.senderDevice === "string" ? body.senderDevice : undefined,
    receiverDevice: typeof body.receiverDevice === "string" ? body.receiverDevice : undefined,
    durationMs: Number(body.durationMs ?? 0),
    throughputBps: Number(body.throughputBps ?? 0),
    network: typeof body.network === "string" ? body.network : undefined,
  });
  return Response.json({ ok: true });
}

export async function GET() {
  const [items, stats] = await Promise.all([recentTransfers(12), transferStats()]);
  return Response.json({
    stats,
    items: items.map((row) => ({
      id: row.id,
      mode: row.mode,
      fileName: row.fileName,
      fileSize: Number(row.fileSize),
      senderDevice: row.senderDevice,
      receiverDevice: row.receiverDevice,
      durationMs: row.durationMs,
      throughputBps: Number(row.throughputBps),
      network: row.network,
      createdAt: row.createdAt.toISOString(),
    })),
  });
}
