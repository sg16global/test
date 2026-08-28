import { CHUNK_SIZE, HIGH_WATER, LOW_WATER } from "@/lib/protocol";
import type { LiveFileState, QueueItem, Role } from "@/lib/protocol";
import { packDescription, unpackDescription } from "./codec";

export type SessionStatus = "idle" | "waiting" | "connecting" | "ready" | "failed" | "closed";

export type PeerInfo = { name?: string | null; device?: string | null };

export type ReceivedPayload = {
  id: string;
  name: string;
  size: number;
  mime: string;
  url: string;
  blob: Blob;
  isText: boolean;
};

export type SessionEvents = {
  onStatus?: (status: SessionStatus, detail?: string) => void;
  onCode?: (code: string) => void;
  onPeer?: (info: PeerInfo) => void;
  onItems?: (items: LiveFileState[]) => void;
  onText?: (text: string) => void;
  onSpeed?: (bytesPerSecond: number) => void;
  onReceived?: (payload: ReceivedPayload) => void;
  onLog?: (line: string) => void;
};

const ICE_SERVERS: RTCIceServer[] = [
  {
    urls: [
      "stun:stun.l.google.com:19302",
      "stun:stun1.l.google.com:19302",
      "stun:stun2.l.google.com:19302",
      "stun:stun.cloudflare.com:3478",
    ],
  },
];

function normalizeCode(raw: string) {
  return raw.trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 12);
}

/**
 * When the app runs inside the Android APK (Capacitor WebView) there is no
 * bundled backend, so all `/api/*` calls have to hit the deployed website.
 * NEXT_PUBLIC_API_BASE lets you override this at build time; otherwise same-origin.
 */
const API_BASE =
  typeof process !== "undefined" && process.env && process.env.NEXT_PUBLIC_API_BASE
    ? process.env.NEXT_PUBLIC_API_BASE.replace(/\/$/, "")
    : "";

function api(path: string) {
  return `${API_BASE}${path}`;
}

function rid() {
  return Math.random().toString(36).slice(2, 10);
}

export class TransferSession {
  readonly role: Role;
  /** Friendly identity advertised to the peer once the tunnel opens. */
  identity: { name: string; device: string } = { name: "", device: "" };
  private events: SessionEvents;
  private pc: RTCPeerConnection | null = null;
  private dc: RTCDataChannel | null = null;
  private codeValue = "";
  private signalCursor = 0;
  private stopped = false;
  private items: LiveFileState[] = [];
  private incoming: {
    meta: LiveFileState;
    parts: BlobPart[];
    received: number;
    ackAt: number;
    startedAt: number;
  } | null = null;
  private bytesWindow = 0;
  private windowStart = 0;
  private lastEmit = 0;
  private pendingFiles: File[] = [];

  constructor(role: Role, events: SessionEvents) {
    this.role = role;
    this.events = events;
  }

  get code() {
    return this.codeValue;
  }

  get connectionState() {
    return this.pc?.connectionState ?? "new";
  }

  private log(line: string) {
    this.events.onLog?.(line);
  }

  private status(status: SessionStatus, detail?: string) {
    this.events.onStatus?.(status, detail);
  }

  private emitItems(force = false) {
    const now = Date.now();
    if (!force && now - this.lastEmit < 120) return;
    this.lastEmit = now;
    this.events.onItems?.(this.items.map((item) => ({ ...item })));
  }

  private tally(bytes: number) {
    const now = Date.now();
    if (!this.windowStart) this.windowStart = now;
    this.bytesWindow += bytes;
    const elapsed = now - this.windowStart;
    if (elapsed >= 500) {
      this.events.onSpeed?.((this.bytesWindow / elapsed) * 1000);
      this.bytesWindow = 0;
      this.windowStart = now;
    }
  }

  private createPeer() {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS, iceCandidatePoolSize: 4 });
    pc.onicecandidate = (event) => {
      if (event.candidate && this.codeValue) {
        void this.postSignal({ candidate: event.candidate.toJSON() }, "candidate");
      }
    };
    pc.onconnectionstatechange = () => {
      const state = pc.connectionState;
      if (state === "connected") this.log("peer-to-peer tunnel established");
      if (state === "failed") this.status("failed", "Connection failed — try again or use LAN Direct");
      if (state === "disconnected") this.log("peer temporarily disconnected, re-negotiating");
    };
    this.pc = pc;
    return pc;
  }

  private setupChannel(channel: RTCDataChannel) {
    channel.binaryType = "arraybuffer";
    channel.bufferedAmountLowThreshold = LOW_WATER;
    channel.onopen = () => {
      this.status("ready");
      this.stopSignalLoops();
      this.send({ t: "hello", name: this.identity.name || "peer", device: this.identity.device || "web" });
      if (this.pendingFiles.length > 0) {
        const files = this.pendingFiles;
        this.pendingFiles = [];
        void this.sendFiles(files);
      }
    };
    channel.onclose = () => {
      if (!this.stopped) this.status("closed", "Peer closed the link");
    };
    channel.onmessage = (event) => this.handleMessage(event.data);
    this.dc = channel;
  }

  private send(message: unknown) {
    if (this.dc?.readyState === "open") {
      this.dc.send(JSON.stringify(message));
      return true;
    }
    return false;
  }

  private async postSignal(payload: unknown, kind: "candidate" | "control") {
    if (!this.codeValue) return;
    try {
      await fetch(api(`/api/rooms/${this.codeValue}/signals`), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ role: this.role, kind, payload }),
        cache: "no-store",
      });
    } catch {
      /* ignore transient network errors */
    }
  }

  /* ---------------------------------------------------------------- sender */

  async startRoom(name: string, device: string) {
    this.identity = { name, device };
    const res = await fetch(api("/api/rooms"), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name, device }),
    });
    if (!res.ok) throw new Error("Could not create a transfer room");
    const data = (await res.json()) as { code: string };
    this.codeValue = data.code;
    this.events.onCode?.(data.code);
    this.status("waiting", "Share the code — waiting for the other device");

    const pc = this.createPeer();
    this.setupChannel(pc.createDataChannel("sg16-transfer", { ordered: true }));

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    await this.patchRoom({ offer: { type: "offer", sdp: pc.localDescription?.sdp ?? offer.sdp } });
    this.startSignalLoop();
    void this.watchForAnswer();
    return data.code;
  }

  private async patchRoom(body: Record<string, unknown>) {
    if (!this.codeValue) return null;
    const res = await fetch(api(`/api/rooms/${this.codeValue}`), {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ role: this.role, ...body }),
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { room: Record<string, unknown> };
    return data.room;
  }

  private async watchForAnswer() {
    for (let attempt = 0; attempt < 400 && !this.stopped; attempt += 1) {
      if (this.pc?.connectionState === "connected" || this.dc?.readyState === "open") return;
      const room = await this.fetchRoom();
      if (room?.answer) {
        const answer = room.answer as { type: string; sdp: string };
        if (this.pc && !this.pc.currentRemoteDescription) {
          await this.pc.setRemoteDescription({ type: "answer", sdp: answer.sdp });
          this.status("connecting", "Handshake complete — opening fast lane");
          this.events.onPeer?.({
            name: room.receiverName as string | null,
            device: room.receiverDevice as string | null,
          });
          return;
        }
      }
      await sleep(700);
    }
  }

  private async fetchRoom() {
    if (!this.codeValue) return null;
    try {
      const res = await fetch(api(`/api/rooms/${this.codeValue}`), { cache: "no-store" });
      if (!res.ok) return null;
      const data = (await res.json()) as { room: Record<string, unknown> };
      return data.room;
    } catch {
      return null;
    }
  }

  /* -------------------------------------------------------------- receiver */

  async joinRoom(rawCode: string, name: string, device: string) {
    this.identity = { name, device };
    const code = normalizeCode(rawCode);
    if (code.length < 4) throw new Error("Enter the code shown on the sender device");
    this.codeValue = code;
    this.events.onCode?.(code);

    let room: Record<string, unknown> | null = null;
    for (let attempt = 0; attempt < 20; attempt += 1) {
      room = await this.fetchRoom();
      if (room?.offer) break;
      if (attempt === 19) throw new Error("That code is not live right now");
      await sleep(600);
    }
    if (!room?.offer) throw new Error("That code is not live right now");

    this.status("connecting", "Found the sender — shaking hands");
    const offer = room.offer as { type: string; sdp: string };
    const pc = this.createPeer();
    pc.ondatachannel = (event) => this.setupChannel(event.channel);
    await pc.setRemoteDescription({ type: "offer", sdp: offer.sdp });
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    await this.patchRoom({
      answer: { type: "answer", sdp: pc.localDescription?.sdp ?? answer.sdp },
      name,
      device,
    });
    this.startSignalLoop();
    this.events.onPeer?.({
      name: (room.senderName as string | null) ?? null,
      device: (room.senderDevice as string | null) ?? null,
    });
  }

  /* ------------------------------------------------------- signal polling */

  private signalTimer: ReturnType<typeof setTimeout> | null = null;

  private startSignalLoop() {
    if (this.signalTimer) return;
    const tick = async () => {
      this.signalTimer = null;
      if (this.stopped || !this.codeValue) return;
      if (this.dc?.readyState === "open") return;
      try {
        const url = api(`/api/rooms/${this.codeValue}/signals?role=${this.role}&after=${this.signalCursor}`);
        const res = await fetch(url, { cache: "no-store" });
        if (res.ok) {
          const data = (await res.json()) as {
            items: { id: number; kind: string; payload: { candidate?: RTCIceCandidateInit } }[];
          };
          for (const item of data.items) {
            this.signalCursor = Math.max(this.signalCursor, item.id);
            if (item.kind === "candidate" && item.payload?.candidate && this.pc) {
              try {
                await this.pc.addIceCandidate(item.payload.candidate);
              } catch {
                /* stale candidate */
              }
            }
          }
        }
      } catch {
        /* keep polling */
      }
      if (!this.stopped) this.signalTimer = setTimeout(tick, 600);
    };
    this.signalTimer = setTimeout(tick, 250);
  }

  private stopSignalLoops() {
    if (this.signalTimer) clearTimeout(this.signalTimer);
    this.signalTimer = null;
  }

  /* ----------------------------------------------------- LAN direct tokens */

  async createManualOffer() {
    const pc = this.createPeer();
    this.setupChannel(pc.createDataChannel("sg16-transfer", { ordered: true }));
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    await waitForIce(pc);
    const token = await packDescription({
      type: "offer",
      sdp: pc.localDescription?.sdp ?? offer.sdp ?? "",
    });
    this.status("waiting", "Let the other device scan or paste this code");
    return token;
  }

  async acceptManualOffer(rawToken: string) {
    const desc = await unpackDescription(rawToken);
    if (!desc || desc.type !== "offer") throw new Error("That pairing code looks invalid");
    const pc = this.createPeer();
    pc.ondatachannel = (event) => this.setupChannel(event.channel);
    await pc.setRemoteDescription({ type: "offer", sdp: desc.sdp });
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    await waitForIce(pc);
    this.status("connecting", "Pairing code accepted — opening fast lane");
    return packDescription({ type: "answer", sdp: pc.localDescription?.sdp ?? answer.sdp ?? "" });
  }

  async completeManualPairing(rawToken: string) {
    const desc = await unpackDescription(rawToken);
    if (!desc || desc.type !== "answer") throw new Error("That reply code looks invalid");
    if (!this.pc) throw new Error("Session lost — start again");
    await this.pc.setRemoteDescription({ type: "answer", sdp: desc.sdp });
    this.status("connecting", "Reply accepted — connecting");
  }

  /* ------------------------------------------------------------ transfers */

  async sendFiles(files: File[]) {
    if (files.length === 0) return;
    if (this.dc?.readyState !== "open") {
      this.pendingFiles = [...this.pendingFiles, ...files];
      this.log(`${files.length} file(s) queued until the link opens`);
      return;
    }
    const queue: QueueItem[] = files.map((file) => ({
      id: rid(),
      name: file.name,
      size: file.size,
      mime: file.type || "application/octet-stream",
      file,
    }));
    this.items = [
      ...this.items,
      ...queue.map((item) => ({
        id: item.id,
        name: item.name,
        size: item.size,
        mime: item.mime,
        sent: 0,
        status: "queued" as const,
        speed: 0,
      })),
    ];
    this.emitItems(true);
    this.send({ t: "queue", files: queue.map(({ id, name, size, mime }) => ({ id, name, size, mime })) });

    for (const item of queue) {
      const live = this.items.find((entry) => entry.id === item.id);
      if (live) live.status = "sending";
      this.emitItems(true);
      const started = Date.now();
      this.send({ t: "begin", id: item.id });
      const file = item.file as File;
      const reader = file.stream().getReader();
      let offset = 0;
      const current = this.items.find((entry) => entry.id === item.id);
      let carry: Uint8Array | null = null;
      // Stream + slice into CHUNK_SIZE frames so we never buffer the whole file.
      while (!this.stopped) {
        const { value, done } = await reader.read();
        if (done && !carry) break;
        const incoming = value ?? new Uint8Array(0);
        let combined: Uint8Array;
        if (carry) {
          combined = new Uint8Array(carry.length + incoming.length);
          combined.set(carry);
          combined.set(incoming, carry.length);
          carry = null;
        } else {
          combined = incoming;
        }
        let cursor = 0;
        while (cursor + CHUNK_SIZE <= combined.length) {
          if (this.dc?.readyState !== "open") {
            reader.cancel().catch(() => undefined);
            return;
          }
          const frame = combined.slice(cursor, cursor + CHUNK_SIZE);
          this.dc.send(frame.buffer as ArrayBuffer);
          cursor += CHUNK_SIZE;
          offset += CHUNK_SIZE;
          if (current) current.sent = offset;
          this.tally(CHUNK_SIZE);
          this.emitItems();
          if (this.dc.bufferedAmount > HIGH_WATER) await this.drain();
        }
        const leftover = combined.length - cursor;
        if (leftover > 0) {
          if (done) {
            if (this.dc?.readyState !== "open") return;
            const tail = combined.slice(cursor);
            this.dc.send(tail.buffer as ArrayBuffer);
            offset += tail.byteLength;
            if (current) current.sent = offset;
            this.tally(tail.byteLength);
            this.emitItems();
          } else {
            carry = combined.slice(cursor);
          }
        }
        if (done) break;
      }
      this.send({ t: "end", id: item.id });
      const finished = this.items.find((entry) => entry.id === item.id);
      if (finished) {
        finished.status = "done";
        finished.speed = file.size / Math.max(1, (Date.now() - started) / 1000);
      }
      this.emitItems(true);
      void this.logTransfer(item, Date.now() - started);
    }
  }

  async sendText(text: string) {
    if (!text.trim()) return;
    if (this.dc?.readyState !== "open") {
      this.log("Link is not open yet");
      return;
    }
    const id = rid();
    this.items = [
      ...this.items,
      {
        id,
        name: "Shared text",
        size: text.length,
        mime: "text/plain",
        sent: text.length,
        status: "done",
        speed: 0,
        isText: true,
      },
    ];
    this.emitItems(true);
    this.send({ t: "text", body: text });
    void this.logTransfer(
      { id, name: "Shared text", size: text.length, mime: "text/plain" },
      50,
    );
  }

  private async drain() {
    const dc = this.dc;
    if (!dc) return;
    if (typeof dc.bufferedAmountLowThreshold === "number" && "onbufferedamountlow" in dc) {
      await new Promise<void>((resolve) => {
        let settled = false;
        const done = () => {
          if (settled) return;
          settled = true;
          dc.removeEventListener("bufferedamountlow", done);
          resolve();
        };
        dc.addEventListener("bufferedamountlow", done);
        setTimeout(done, 700);
      });
      return;
    }
    while (dc.bufferedAmount > HIGH_WATER && dc.readyState === "open") {
      await sleep(10);
    }
  }

  private async logTransfer(item: QueueItem, durationMs: number) {
    try {
      await fetch(api("/api/transfers"), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          mode: "p2p",
          fileName: item.name,
          fileSize: item.size,
          mimeType: item.mime,
          senderDevice: this.role === "sender" ? "sender" : "receiver",
          receiverDevice: this.role === "sender" ? "receiver" : "sender",
          durationMs,
          throughputBps: (item.size / Math.max(0.05, durationMs / 1000)),
          network: navigator.onLine ? "lan" : "offline-lan",
        }),
      });
    } catch {
      /* offline is fine */
    }
  }

  /* ------------------------------------------------------------- incoming */

  private handleMessage(data: unknown) {
    if (typeof data !== "string") {
      this.handleChunk(data as ArrayBuffer);
      return;
    }
    let message: Record<string, unknown>;
    try {
      message = JSON.parse(data) as Record<string, unknown>;
    } catch {
      return;
    }
    const type = message.t as string;

    if (type === "queue") {
      const files = (message.files ?? []) as { id: string; name: string; size: number; mime: string }[];
      this.items = [
        ...this.items,
        ...files.map((file) => ({
          id: file.id,
          name: file.name,
          size: file.size,
          mime: file.mime,
          sent: 0,
          status: "queued" as const,
          speed: 0,
        })),
      ];
      this.emitItems(true);
      return;
    }

    if (type === "begin") {
      const id = message.id as string;
      const meta = this.items.find((item) => item.id === id);
      if (meta) meta.status = "sending";
      this.incoming = {
        meta:
          meta ?? {
            id,
            name: "file",
            size: 0,
            mime: "application/octet-stream",
            sent: 0,
            status: "sending",
            speed: 0,
          },
        parts: [],
        received: 0,
        ackAt: 0,
        startedAt: Date.now(),
      };
      this.emitItems(true);
      return;
    }

    if (type === "end") {
      const id = message.id as string;
      const current = this.incoming;
      this.incoming = null;
      if (!current || current.meta.id !== id) return;
      const blob = new Blob(current.parts, { type: current.meta.mime || "application/octet-stream" });
      current.meta.status = "done";
      current.meta.sent = blob.size;
      current.meta.speed = blob.size / Math.max(0.05, (Date.now() - current.startedAt) / 1000);
      this.emitItems(true);
      this.send({ t: "received", id });
      this.events.onReceived?.({
        id,
        name: current.meta.name,
        size: blob.size,
        mime: current.meta.mime,
        url: URL.createObjectURL(blob),
        blob,
        isText: false,
      });
      return;
    }

    if (type === "hello") {
      this.events.onPeer?.({
        name: typeof message.name === "string" ? message.name : null,
        device: typeof message.device === "string" ? message.device : null,
      });
      return;
    }

    if (type === "text") {
      const body = String(message.body ?? "");
      this.events.onText?.(body);
      return;
    }

    if (type === "ack") {
      const id = message.id as string;
      const meta = this.items.find((item) => item.id === id);
      if (meta) {
        meta.sent = Math.max(meta.sent, Number(message.bytes ?? 0));
        this.emitItems(true);
      }
      return;
    }

    if (type === "received") {
      const meta = this.items.find((item) => item.id === message.id);
      if (meta) {
        meta.status = "done";
        this.emitItems(true);
      }
    }
  }

  private handleChunk(buffer: ArrayBuffer) {
    const current = this.incoming;
    if (!current) return;
    current.parts.push(buffer);
    current.received += buffer.byteLength;
    current.meta.sent = current.received;
    this.tally(buffer.byteLength);
    this.emitItems();
    if (current.received - current.ackAt > 512 * 1024) {
      current.ackAt = current.received;
      this.send({ t: "ack", id: current.meta.id, bytes: current.received });
    }
  }

  close() {
    this.stopped = true;
    this.stopSignalLoops();
    try {
      this.dc?.close();
    } catch {
      /* noop */
    }
    try {
      this.pc?.close();
    } catch {
      /* noop */
    }
    if (this.codeValue) {
      void fetch(api(`/api/rooms/${this.codeValue}`), { method: "DELETE" }).catch(() => undefined);
    }
    this.status("closed");
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForIce(pc: RTCPeerConnection, timeoutMs = 2500) {
  if (pc.iceGatheringState === "complete") return;
  await new Promise<void>((resolve) => {
    const done = () => {
      pc.removeEventListener("icegatheringstatechange", done);
      clearTimeout(timer);
      resolve();
    };
    const timer = setTimeout(done, timeoutMs);
    pc.addEventListener("icegatheringstatechange", done);
  });
}
