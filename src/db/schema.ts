import {
  bigint,
  index,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

/**
 * A room is a hand-shake space between two devices (sender + receiver).
 * Signaling payloads (SDP offer/answer) are stored here so a phone and a
 * laptop can find each other with a short 4-6 char code.
 */
export const rooms = pgTable(
  "rooms",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    code: varchar("code", { length: 12 }).notNull().unique(),
    status: varchar("status", { length: 16 }).notNull().default("waiting"),
    senderName: text("sender_name").notNull().default("Sender"),
    senderDevice: text("sender_device").notNull().default("unknown"),
    receiverName: text("receiver_name"),
    receiverDevice: text("receiver_device"),
    offer: jsonb("offer"),
    answer: jsonb("answer"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  },
  (table) => [index("rooms_expires_idx").on(table.expiresAt)],
);

/** ICE candidates + control messages relayed between the two peers. */
export const signals = pgTable(
  "signals",
  {
    id: serial("id").primaryKey(),
    roomCode: varchar("room_code", { length: 12 }).notNull(),
    fromRole: varchar("from_role", { length: 16 }).notNull(),
    kind: varchar("kind", { length: 24 }).notNull().default("candidate"),
    payload: jsonb("payload").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("signals_room_idx").on(table.roomCode, table.id)],
);

/** Every finished transfer (p2p or relay) is logged so the UI can show history. */
export const transfers = pgTable(
  "transfers",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    mode: varchar("mode", { length: 16 }).notNull().default("p2p"),
    fileName: text("file_name").notNull(),
    fileSize: bigint("file_size", { mode: "number" }).notNull().default(0),
    mimeType: text("mime_type").notNull().default("application/octet-stream"),
    senderDevice: text("sender_device").notNull().default("unknown"),
    receiverDevice: text("receiver_device").notNull().default("unknown"),
    durationMs: integer("duration_ms").notNull().default(0),
    throughputBps: bigint("throughput_bps", { mode: "number" }).notNull().default(0),
    network: varchar("network", { length: 24 }).notNull().default("lan"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("transfers_created_idx").on(table.createdAt)],
);

/** Cloud relay files: stored on disk, metadata in Postgres. */
export const relayFiles = pgTable(
  "relay_files",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    code: varchar("code", { length: 12 }).notNull().unique(),
    fileName: text("file_name").notNull(),
    mimeType: text("mime_type").notNull().default("application/octet-stream"),
    fileSize: bigint("file_size", { mode: "number" }).notNull().default(0),
    storedPath: text("stored_path").notNull(),
    senderName: text("sender_name").notNull().default("Sender"),
    senderDevice: text("sender_device").notNull().default("unknown"),
    downloads: integer("downloads").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  },
  (table) => [index("relay_files_expires_idx").on(table.expiresAt)],
);

export type Room = typeof rooms.$inferSelect;
export type Signal = typeof signals.$inferSelect;
export type Transfer = typeof transfers.$inferSelect;
export type RelayFile = typeof relayFiles.$inferSelect;
