import { createReadStream } from "node:fs";
import { readdir, stat } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import type { ReadableStream as NodeWebReadableStream } from "node:stream/web";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DOWNLOAD_DIR = "downloads";

async function findLatestApk() {
  const dir = path.join(process.cwd(), "public", DOWNLOAD_DIR);
  try {
    const files = await readdir(dir);
    const apks: { name: string; mtimeMs: number; size: number }[] = [];
    for (const name of files) {
      if (!name.toLowerCase().endsWith(".apk")) continue;
      const info = await stat(path.join(dir, name));
      if (info.isFile()) apks.push({ name, mtimeMs: info.mtimeMs, size: info.size });
    }
    apks.sort((a, b) => b.mtimeMs - a.mtimeMs);
    if (apks.length === 0) return null;
    const best = apks[0];
    return { ...best, fullPath: path.join(dir, best.name) };
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const apk = await findLatestApk();
  if (url.searchParams.get("info")) {
    return Response.json({ available: Boolean(apk), fileName: apk?.name ?? null, size: apk?.size ?? 0, updatedAt: apk ? new Date(apk.mtimeMs).toISOString() : null });
  }
  if (!apk) {
    return Response.json({ error: "APK not built yet", hint: "Run npm run build:apk" }, { status: 404 });
  }
  const stream = createReadStream(apk.fullPath);
  const webStream = Readable.toWeb(stream) as unknown as NodeWebReadableStream<Uint8Array>;
  return new Response(webStream as unknown as ReadableStream<Uint8Array>, {
    headers: {
      "Content-Type": "application/vnd.android.package-archive",
      "Content-Length": String(apk.size),
      "Content-Disposition": `attachment; filename="${apk.name}"`,
      "Cache-Control": "no-store",
    },
  });
}
