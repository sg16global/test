import { createReadStream, createWriteStream } from "node:fs";
import { mkdir, readdir, rm, stat, unlink } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import type { ReadableStream as NodeWebReadableStream } from "node:stream/web";

export const MAX_RELAY_BYTES = 512 * 1024 * 1024;

const RELAY_FOLDER = ".sg16-data";

export function relayDir() {
  const override = process.env.SG16_DATA_DIR;
  if (override && override.startsWith("/")) return override;
  return path.join(process.cwd(), RELAY_FOLDER);
}

export async function ensureRelayDir() {
  const dir = relayDir();
  await mkdir(dir, { recursive: true });
  return dir;
}

export async function saveStream(
  fileName: string,
  body: ReadableStream<Uint8Array> | null,
) {
  const dir = await ensureRelayDir();
  const safe = fileName.replace(/[^\w.\-()+ ]+/g, "_").slice(0, 120) || "file";
  const target = path.join(dir, `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safe}`);
  let written = 0;
  if (!body) throw new Error("empty body");
  const nodeStream = Readable.fromWeb(body as unknown as NodeWebReadableStream<Uint8Array>);
  const out = createWriteStream(target);
  nodeStream.on("data", (chunk: Buffer) => {
    written += chunk.length;
    if (written > MAX_RELAY_BYTES) {
      nodeStream.destroy(new Error("File larger than relay limit"));
    }
  });
  await pipeline(nodeStream, out);
  return { path: target, size: written };
}

export async function openRelayFile(storedPath: string) {
  const info = await stat(storedPath);
  const nodeStream = createReadStream(storedPath);
  const webStream = Readable.toWeb(nodeStream) as unknown as ReadableStream<Uint8Array>;
  return { size: info.size, stream: webStream };
}

export async function removeRelayFile(storedPath: string) {
  try {
    await unlink(storedPath);
  } catch {
    /* already gone */
  }
}

/** Best-effort cleanup of stored blobs whose metadata rows expired. */
export async function sweepOrphans(keep: Set<string>) {
  try {
    const dir = relayDir();
    const entries = await readdir(dir);
    const now = Date.now();
    for (const entry of entries) {
      if (keep.has(entry)) continue;
      const full = path.join(dir, entry);
      const info = await stat(full).catch(() => null);
      if (!info?.isFile()) continue;
      if (now - info.mtimeMs > 1000 * 60 * 60 * 12) await rm(full, { force: true });
    }
  } catch {
    /* noop */
  }
}
