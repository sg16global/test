import { isDbConfigured } from "@/db";
import { desc, sql } from "drizzle-orm";
import { db } from "@/db";
import { transfers } from "@/db/schema";

export type TransferLog = {
  mode: string;
  fileName: string;
  fileSize: number;
  mimeType?: string;
  senderDevice?: string;
  receiverDevice?: string;
  durationMs?: number;
  throughputBps?: number;
  network?: string;
};

export async function logTransfer(entry: TransferLog) {
  if (!isDbConfigured) return;
  try {
    await db!.insert(transfers).values({
      mode: entry.mode === "relay" ? "relay" : "p2p",
      fileName: entry.fileName.slice(0, 200) || "file",
      fileSize: Math.max(0, Math.round(entry.fileSize || 0)),
      mimeType: (entry.mimeType ?? "application/octet-stream").slice(0, 120),
      senderDevice: (entry.senderDevice ?? "unknown").slice(0, 40),
      receiverDevice: (entry.receiverDevice ?? "unknown").slice(0, 40),
      durationMs: Math.max(0, Math.round(entry.durationMs ?? 0)),
      throughputBps: Math.max(0, Math.round(entry.throughputBps ?? 0)),
      network: (entry.network ?? "lan").slice(0, 24),
    });
  } catch {
    /* logging must never break a transfer */
  }
}

export async function recentTransfers(limit = 12) {
  if (!isDbConfigured) return [];
  return db!.select().from(transfers).orderBy(desc(transfers.createdAt)).limit(limit);
}

export async function transferStats() {
  if (!isDbConfigured) {
    return { total: 0, bytes: 0, avgSpeed: 0, fastest: 0 };
  }
  const rows = await db!
    .select({
      total: sql<number>`count(*)::int`,
      bytes: sql<number>`coalesce(sum(${transfers.fileSize}), 0)::bigint`,
      avgSpeed: sql<number>`coalesce(avg(nullif(${transfers.throughputBps}, 0)), 0)::bigint`,
      fastest: sql<number>`coalesce(max(${transfers.throughputBps}), 0)::bigint`,
    })
    .from(transfers);
  const row = rows[0];
  return {
    total: Number(row?.total ?? 0),
    bytes: Number(row?.bytes ?? 0),
    avgSpeed: Number(row?.avgSpeed ?? 0),
    fastest: Number(row?.fastest ?? 0),
  };
}
