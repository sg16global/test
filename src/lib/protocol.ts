/** Shared transfer protocol constants + types used by both browser and server. */

export const ROLES = ["sender", "receiver"] as const;
export type Role = (typeof ROLES)[number];

export type SdpPayload = { type: "offer" | "answer"; sdp: string };

export type SignalPayload =
  | { kind: "candidate"; candidate: RTCIceCandidateInit }
  | { kind: "control"; action: "hello" | "cancel" | "complete"; device?: string; name?: string };

/** 64 KB is the biggest chunk every major browser can push through a datachannel. */
export const CHUNK_SIZE = 64 * 1024;
/** Keep the pipe full — 8 MB in-flight before we pause, drain to 2 MB. */
export const HIGH_WATER = 8 * 1024 * 1024;
export const LOW_WATER = 2 * 1024 * 1024;

export type OutgoingControl =
  | { t: "queue"; files: { id: string; name: string; size: number; mime: string }[] }
  | { t: "begin"; id: string }
  | { t: "end"; id: string }
  | { t: "text"; body: string }
  | { t: "ack"; id: string; bytes: number }
  | { t: "received"; id: string }
  | { t: "decline"; reason: string };

export type IncomingControl =
  | OutgoingControl
  | { t: "hello"; name: string; device: string };

export type TransferDirection = "p2p" | "relay";

export type QueueItem = {
  id: string;
  name: string;
  size: number;
  mime: string;
  file?: File;
};

export type LiveFileState = {
  id: string;
  name: string;
  size: number;
  mime: string;
  sent: number;
  status: "queued" | "sending" | "done" | "failed";
  speed: number;
  isText?: boolean;
};
