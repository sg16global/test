import { desc, gt } from "drizzle-orm";
import { db, isDbConfigured } from "@/db";
import { relayFiles } from "@/db/schema";
import { MAX_RELAY_BYTES, saveStream, sweepOrphans } from "@/lib/server/relay";
import { generateCode, pruneStale } from "@/lib/server/rooms";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!isDbConfigured) return Response.json({ error: "Cloud relay requires DATABASE_URL" }, { status: 503 });
  const url = new URL(request.url);
  const name = (url.searchParams.get("name") ?? "file").slice(0, 160);
  const mime = url.searchParams.get("mime") ?? "application/octet-stream";
  const from = (url.searchParams.get("from") ?? "Sender").slice(0, 40);
  const device = (url.searchParams.get("device") ?? "unknown").slice(0, 40);
  const declared = Number.parseInt(url.searchParams.get("size") ?? "0", 10) || 0;
  if (declared > MAX_RELAY_BYTES) return Response.json({ error: "File is larger than the 512 MB relay limit" }, { status: 413 });
  if (!request.body) return Response.json({ error: "Missing request body" }, { status: 400 });
  try {
    const saved = await saveStream(name, request.body);
    const code = await generateCode(6);
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 12);
    await db!.insert(relayFiles).values({ code, fileName: name, mimeType: mime.slice(0, 120), fileSize: saved.size, storedPath: saved.path, senderName: from, senderDevice: device, expiresAt });
    void sweepOrphans(new Set([saved.path]));
    return Response.json({ code, size: saved.size, expiresAt: expiresAt.toISOString() });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "upload failed" }, { status: 500 });
  }
}

export async function GET() {
  if (!isDbConfigured) return Response.json({ items: [] });
  await pruneStale();
  const rows = await db!.select({ code: relayFiles.code, fileName: relayFiles.fileName, fileSize: relayFiles.fileSize, mimeType: relayFiles.mimeType, senderName: relayFiles.senderName, senderDevice: relayFiles.senderDevice, downloads: relayFiles.downloads, createdAt: relayFiles.createdAt, expiresAt: relayFiles.expiresAt }).from(relayFiles).where(gt(relayFiles.expiresAt, new Date())).orderBy(desc(relayFiles.createdAt)).limit(12);
  return Response.json({ items: rows.map((row) => ({ ...row, createdAt: row.createdAt.toISOString(), expiresAt: row.expiresAt.toISOString() })) });
}
