import { and, eq, gt } from "drizzle-orm";
import { db, isDbConfigured } from "@/db";
import { relayFiles } from "@/db/schema";
import { openRelayFile, removeRelayFile } from "@/lib/server/relay";
import { logTransfer } from "@/lib/server/stats";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ code: string }> };

function normalize(raw: string) {
  return raw.trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 12);
}

export async function GET(request: Request, ctx: Ctx) {
  if (!isDbConfigured) {
    return Response.json({ error: "Cloud relay requires DATABASE_URL" }, { status: 503 });
  }
  const { code: raw } = await ctx.params;
  const code = normalize(raw);
  const rows = await db!.select().from(relayFiles).where(and(eq(relayFiles.code, code), gt(relayFiles.expiresAt, new Date()))).limit(1);
  const file = rows[0];
  if (!file) return Response.json({ error: "code not found or expired" }, { status: 404 });
  const url = new URL(request.url);
  if (url.searchParams.get("info")) {
    return Response.json({ file: { code: file.code, fileName: file.fileName, fileSize: file.fileSize, mimeType: file.mimeType, senderName: file.senderName, senderDevice: file.senderDevice, downloads: file.downloads, expiresAt: file.expiresAt.toISOString() } });
  }
  try {
    const blob = await openRelayFile(file.storedPath);
    await db!.update(relayFiles).set({ downloads: file.downloads + 1 }).where(eq(relayFiles.id, file.id));
    void logTransfer({ mode: "relay", fileName: file.fileName, fileSize: file.fileSize, mimeType: file.mimeType, senderDevice: file.senderDevice, receiverDevice: "downloader" });
    return new Response(blob.stream, { headers: { "Content-Type": file.mimeType || "application/octet-stream", "Content-Length": String(blob.size), "Content-Disposition": `attachment; filename="${encodeURIComponent(file.fileName)}"`, "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ error: "stored file is gone" }, { status: 410 });
  }
}

export async function DELETE(_request: Request, ctx: Ctx) {
  if (!isDbConfigured) return Response.json({ ok: true });
  const { code: raw } = await ctx.params;
  const code = normalize(raw);
  const rows = await db!.select().from(relayFiles).where(eq(relayFiles.code, code)).limit(1);
  const file = rows[0];
  if (file) { await removeRelayFile(file.storedPath); await db!.delete(relayFiles).where(eq(relayFiles.id, file.id)); }
  return Response.json({ ok: true });
}
