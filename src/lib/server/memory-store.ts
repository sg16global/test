import type { Role } from "@/lib/protocol";

export type MemoryRoom = {
  code: string;
  status: string;
  senderName: string;
  senderDevice: string;
  receiverName: string | null;
  receiverDevice: string | null;
  offer: unknown;
  answer: unknown;
  createdAt: Date;
  updatedAt: Date;
  expiresAt: Date;
};

type MemorySignal = {
  id: number;
  roomCode: string;
  fromRole: Role;
  kind: string;
  payload: unknown;
  createdAt: Date;
};

type Store = {
  rooms: Map<string, MemoryRoom>;
  signals: MemorySignal[];
  signalSeq: number;
};

const globalStore = globalThis as typeof globalThis & { __sg16MemoryStore?: Store };

function store(): Store {
  if (!globalStore.__sg16MemoryStore) {
    globalStore.__sg16MemoryStore = {
      rooms: new Map(),
      signals: [],
      signalSeq: 0,
    };
  }
  return globalStore.__sg16MemoryStore;
}

export function memoryCodeExists(code: string) {
  return store().rooms.has(code);
}

export function memoryPruneStale() {
  const now = Date.now();
  const s = store();
  for (const [code, room] of s.rooms) {
    if (room.expiresAt.getTime() <= now) {
      s.rooms.delete(code);
      s.signals = s.signals.filter((row) => row.roomCode !== code);
    }
  }
}

export function memoryCreateRoom(input: {
  code: string;
  senderName: string;
  senderDevice: string;
  expiresAt: Date;
}) {
  const now = new Date();
  const room: MemoryRoom = {
    code: input.code,
    status: "waiting",
    senderName: input.senderName,
    senderDevice: input.senderDevice,
    receiverName: null,
    receiverDevice: null,
    offer: null,
    answer: null,
    createdAt: now,
    updatedAt: now,
    expiresAt: input.expiresAt,
  };
  store().rooms.set(input.code, room);
  return room;
}

export function memoryGetRoom(code: string) {
  const room = store().rooms.get(code);
  if (!room || room.expiresAt.getTime() <= Date.now()) return null;
  return room;
}

export function memoryTouchRoom(code: string) {
  const room = store().rooms.get(code);
  if (!room) return;
  room.updatedAt = new Date();
  room.expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 4);
}

export function memoryUpdateRoom(code: string, patch: Partial<MemoryRoom>) {
  const room = memoryGetRoom(code);
  if (!room) return null;
  Object.assign(room, patch, { updatedAt: new Date() });
  return room;
}

export function memoryDeleteRoom(code: string) {
  store().rooms.delete(code);
  const s = store();
  s.signals = s.signals.filter((row) => row.roomCode !== code);
}

export function memoryPushSignal(
  code: string,
  fromRole: Role,
  payload: unknown,
  kind = "candidate",
) {
  const s = store();
  s.signalSeq += 1;
  s.signals.push({
    id: s.signalSeq,
    roomCode: code,
    fromRole,
    kind,
    payload,
    createdAt: new Date(),
  });
}

export function memoryPullSignals(code: string, role: Role, after: number) {
  const s = store();
  const items = s.signals
    .filter((row) => row.roomCode === code && row.fromRole !== role && row.id > after)
    .slice(0, 60)
    .map((row) => ({
      id: row.id,
      kind: row.kind,
      payload: row.payload,
      createdAt: row.createdAt.toISOString(),
    }));
  s.signals = s.signals.filter((row) => row.roomCode !== code || row.id >= Math.max(after - 400, 0));
  return items;
}

export function memoryCountActive() {
  memoryPruneStale();
  return store().rooms.size;
}
