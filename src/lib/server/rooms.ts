import { and, asc, eq, gt, lt, ne, sql } from "drizzle-orm";
import { db, isDbConfigured } from "@/db";
import { rooms, signals } from "@/db/schema";
import type { Role } from "@/lib/protocol";
import {
  memoryCodeExists,
  memoryCountActive,
  memoryCreateRoom,
  memoryDeleteRoom,
  memoryGetRoom,
  memoryPruneStale,
  memoryPullSignals,
  memoryPushSignal,
  memoryTouchRoom,
  memoryUpdateRoom,
  type MemoryRoom,
} from "./memory-store";

const ALPHABET = "ACDEFGHJKLMNPQRTUVWXY34679";

function randomCode(length: number) {
  let out = "";
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  for (let i = 0; i < length; i += 1) out += ALPHABET[bytes[i] % ALPHABET.length];
  return out;
}

async function codeTaken(code: string) {
  if (!isDbConfigured) return memoryCodeExists(code);
  const existing = await db!.select({ id: rooms.id }).from(rooms).where(eq(rooms.code, code)).limit(1);
  return existing.length > 0;
}

export async function generateCode(length = 5) {
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const code = randomCode(length);
    if (!(await codeTaken(code))) return code;
  }
  return `${randomCode(length - 1)}${Math.floor(Math.random() * 9) + 1}`;
}

export async function pruneStale() {
  if (!isDbConfigured) {
    memoryPruneStale();
    return;
  }
  try {
    const stale = await db!
      .select({ code: rooms.code })
      .from(rooms)
      .where(lt(rooms.expiresAt, new Date()))
      .limit(200);
    if (stale.length === 0) return;
    for (const row of stale) {
      await db!.delete(signals).where(eq(signals.roomCode, row.code));
      await db!.delete(rooms).where(eq(rooms.code, row.code));
    }
  } catch {
    /* best effort */
  }
}

export async function touchRoom(code: string) {
  if (!isDbConfigured) {
    memoryTouchRoom(code);
    return;
  }
  await db!
    .update(rooms)
    .set({ updatedAt: new Date(), expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 4) })
    .where(eq(rooms.code, code));
}

export async function pushSignal(code: string, fromRole: Role, payload: unknown, kind = "candidate") {
  if (!isDbConfigured) {
    memoryPushSignal(code, fromRole, payload, kind);
    return;
  }
  await db!.insert(signals).values({ roomCode: code, fromRole, payload: payload as object, kind });
}

export async function pullSignals(code: string, role: Role, after: number) {
  if (!isDbConfigured) return memoryPullSignals(code, role, after);

  const rows = await db!
    .select()
    .from(signals)
    .where(and(eq(signals.roomCode, code), ne(signals.fromRole, role), gt(signals.id, after)))
    .orderBy(asc(signals.id))
    .limit(60);

  await db!
    .delete(signals)
    .where(and(eq(signals.roomCode, code), lt(signals.id, Math.max(after - 400, 0))));

  return rows.map((row) => ({
    id: row.id,
    kind: row.kind,
    payload: row.payload,
    createdAt: row.createdAt?.toISOString?.() ?? null,
  }));
}

export async function roomExists(code: string) {
  if (!isDbConfigured) return memoryGetRoom(code) !== null;
  const rows = await db!
    .select({ id: rooms.id })
    .from(rooms)
    .where(and(eq(rooms.code, code), gt(rooms.expiresAt, new Date())))
    .limit(1);
  return rows.length > 0;
}

export async function countActive() {
  if (!isDbConfigured) return memoryCountActive();
  const rows = await db!.select({ n: sql<number>`count(*)::int` }).from(rooms);
  return rows[0]?.n ?? 0;
}

export type RoomView = {
  code: string;
  status: string;
  senderName: string;
  senderDevice: string;
  receiverName: string | null;
  receiverDevice: string | null;
  offer: unknown;
  answer: unknown;
  updatedAt: string;
};

function toView(room: MemoryRoom | (typeof rooms.$inferSelect)): RoomView {
  return {
    code: room.code,
    status: room.status,
    senderName: room.senderName,
    senderDevice: room.senderDevice,
    receiverName: room.receiverName ?? null,
    receiverDevice: room.receiverDevice ?? null,
    offer: room.offer,
    answer: room.answer,
    updatedAt: (room.updatedAt instanceof Date ? room.updatedAt : new Date(room.updatedAt)).toISOString(),
  };
}

export async function createRoom(input: {
  code: string;
  senderName: string;
  senderDevice: string;
  expiresAt: Date;
}) {
  if (!isDbConfigured) {
    return toView(
      memoryCreateRoom({
        code: input.code,
        senderName: input.senderName,
        senderDevice: input.senderDevice,
        expiresAt: input.expiresAt,
      }),
    );
  }
  await db!.insert(rooms).values({
    code: input.code,
    senderName: input.senderName,
    senderDevice: input.senderDevice,
    expiresAt: input.expiresAt,
  });
  const row = await getRoom(input.code);
  if (!row) throw new Error("failed to create room");
  return row;
}

export async function getRoom(code: string) {
  if (!isDbConfigured) {
    const room = memoryGetRoom(code);
    return room ? toView(room) : null;
  }
  const rows = await db!
    .select()
    .from(rooms)
    .where(and(eq(rooms.code, code), gt(rooms.expiresAt, new Date())))
    .limit(1);
  return rows[0] ? toView(rows[0]) : null;
}

export async function updateRoom(code: string, patch: Record<string, unknown>) {
  if (!isDbConfigured) {
    const room = memoryUpdateRoom(code, patch as Partial<MemoryRoom>);
    return room ? toView(room) : null;
  }
  const updated = await db!.update(rooms).set(patch).where(eq(rooms.code, code)).returning();
  return updated[0] ? toView(updated[0]) : null;
}

export async function deleteRoom(code: string) {
  if (!isDbConfigured) {
    memoryDeleteRoom(code);
    return;
  }
  await db!.delete(signals).where(eq(signals.roomCode, code));
  await db!.delete(rooms).where(eq(rooms.code, code));
}
