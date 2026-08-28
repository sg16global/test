"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { TransferSession } from "@/lib/peer/session";
import type { PeerInfo, ReceivedPayload, SessionStatus } from "@/lib/peer/session";
import type { LiveFileState } from "@/lib/protocol";
import { deviceEmoji } from "@/lib/peer/codec";
import { useDeviceInfo, useJoinCodeFromUrl } from "@/lib/client-hooks";
import { fileGlyph, formatBytes, formatSpeed, percent } from "@/lib/format";
import { Badge, Btn, Card, CodeInput, ProgressBar, StatusDot } from "./ui";
import { QrBox } from "./QrBox";
import { QrScanner } from "./QrScanner";
import { BrandLogo } from "./BrandLogo";
import { PlatformDownloads } from "./PlatformDownloads";
import { PromoStrip } from "./PromoStrip";
import { LanDirectPanel } from "./LanDirectPanel";

type Mode = "send" | "receive";

function saveBlob(payload: ReceivedPayload) {
  const link = document.createElement("a");
  link.href = payload.url;
  link.download = payload.name;
  document.body.appendChild(link);
  link.click();
  link.remove();
}

export function TransferApp() {
  const device = useDeviceInfo();
  const urlJoin = useJoinCodeFromUrl();
  const sessionRef = useRef<TransferSession | null>(null);

  const [modeOverride, setModeOverride] = useState<Mode | null>(null);
  const mode = modeOverride ?? (urlJoin.length >= 4 ? "receive" : "send");
  const [status, setStatus] = useState<SessionStatus>("idle");
  const [detail, setDetail] = useState("");
  const [code, setCode] = useState("");
  const [joinDraft, setJoinDraft] = useState<string | null>(null);
  const joinCode = joinDraft ?? urlJoin;
  const [codeCopied, setCodeCopied] = useState(false);
  const [lanSeedOffer, setLanSeedOffer] = useState("");
  const [peer, setPeer] = useState<PeerInfo>({});
  const [items, setItems] = useState<LiveFileState[]>([]);
  const [received, setReceived] = useState<ReceivedPayload[]>([]);
  const [speed, setSpeed] = useState(0);
  const [pending, setPending] = useState<File[]>([]);
  const [dragging, setDragging] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [busy, setBusy] = useState(false);
  const [autoSave, setAutoSave] = useState(true);
  const autoSaveRef = useRef(true);

  useEffect(() => {
    autoSaveRef.current = autoSave;
  }, [autoSave]);

  const autoJoinRef = useRef(false);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    }
    return () => {
      sessionRef.current?.close();
      sessionRef.current = null;
    };
  }, []);

  const resetState = () => {
    setCode("");
    setPeer({});
    setItems([]);
    setSpeed(0);
    setStatus("idle");
    setDetail("");
    setReceived([]);
  };

  const buildSession = useCallback(
    (role: "sender" | "receiver") => {
      sessionRef.current?.close();
      const session = new TransferSession(role, {
        onStatus: (next, note) => {
          setStatus(next);
          if (note) setDetail(note);
        },
        onCode: setCode,
        onPeer: setPeer,
        onItems: setItems,
        onSpeed: setSpeed,
        onReceived: (payload) => {
          setReceived((prev) => [payload, ...prev].slice(0, 30));
          if (autoSaveRef.current) saveBlob(payload);
        },
        onText: () => undefined,
      });
      session.identity = { name: device.label, device: device.kind };
      sessionRef.current = session;
      return session;
    },
    [device.label, device.kind],
  );

  const startAsSender = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    resetState();
    sessionRef.current = null;
    try {
      await buildSession("sender").startRoom(device.label, device.kind);
    } catch (error) {
      sessionRef.current = null;
      setStatus("failed");
      setDetail(error instanceof Error ? error.message : "could not start");
    } finally {
      setBusy(false);
    }
  }, [buildSession, busy, device.label, device.kind]);

  const connectAsReceiver = useCallback(
    async (rawCode: string) => {
      const cleaned = rawCode.toUpperCase().replace(/[^A-Z0-9]/g, "");
      if (cleaned.length < 4) return;
      setBusy(true);
      setStatus("connecting");
      setDetail("Looking up sender…");
      try {
        await buildSession("receiver").joinRoom(cleaned, device.label, device.kind);
      } catch (error) {
        setStatus("failed");
        setDetail(error instanceof Error ? error.message : "could not join");
      } finally {
        setBusy(false);
      }
    },
    [buildSession, device.label, device.kind],
  );

  useEffect(() => {
    if (urlJoin.length < 4 || autoJoinRef.current) return;
    autoJoinRef.current = true;
    void connectAsReceiver(urlJoin);
  }, [urlJoin, connectAsReceiver]);

  const lanCreateOffer = useCallback(async () => {
    sessionRef.current?.close();
    sessionRef.current = null;
    resetState();
    setStatus("waiting");
    return buildSession("sender").createManualOffer();
  }, [buildSession]);

  const lanAcceptOffer = useCallback(
    async (token: string) => {
      sessionRef.current?.close();
      sessionRef.current = null;
      resetState();
      setStatus("connecting");
      setDetail("Accepting offline offer…");
      return buildSession("receiver").acceptManualOffer(token);
    },
    [buildSession],
  );

  const lanCompletePairing = useCallback(async (token: string) => {
    const session = sessionRef.current;
    if (!session) throw new Error("Create an offer first");
    await session.completeManualPairing(token);
  }, []);

  const copyShareCode = useCallback(async () => {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 1500);
    } catch {
      setCodeCopied(false);
    }
  }, [code]);

  // Auto-create the room the moment the user opens Send mode, so the QR is
  // ready without an extra tap.
  useEffect(() => {
    if (mode === "send" && !code && !sessionRef.current && !busy) {
      void startAsSender();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  const addFiles = (list: FileList | File[] | null) => {
    if (!list) return;
    const files = Array.from(list as ArrayLike<File>);
    if (files.length === 0) return;
    setPending((prev) => [...prev, ...files]);
    // If already connected, ship immediately.
    if (sessionRef.current && status === "ready") {
      void sessionRef.current.sendFiles(files);
      setPending([]);
    }
  };

  // If the peer connects while we still have queued files, flush them.
  useEffect(() => {
    if (status === "ready" && pending.length > 0 && sessionRef.current) {
      const payload = pending;
      setPending([]);
      void sessionRef.current.sendFiles(payload);
    }
  }, [status, pending]);

  const onScan = useCallback(
    (value: string) => {
      setScanning(false);
      // A shared join URL like https://.../?join=ABCDE
      try {
        const url = new URL(value);
        const j = url.searchParams.get("join");
        if (j) {
          setModeOverride("receive");
          setJoinDraft(j.toUpperCase());
          void connectAsReceiver(j);
          return;
        }
      } catch {
        /* not a url */
      }
      const cleaned = value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 12);
      if (value.trim().startsWith("SG16")) {
        setModeOverride("receive");
        setLanSeedOffer(value.trim());
        return;
      }
      setModeOverride("receive");
      setJoinDraft(cleaned);
      void connectAsReceiver(cleaned);
    },
    [connectAsReceiver],
  );

  const shareUrl = useMemo(() => {
    if (!code) return "";
    if (typeof window === "undefined") return `https://sg16.transfer/?join=${code}`;
    return `${window.location.origin}/?join=${code}`;
  }, [code]);

  const totalBytes = items.reduce((sum, item) => sum + item.size, 0);
  const sentBytes = items.reduce((sum, item) => sum + item.sent, 0);
  const overall = totalBytes > 0 ? Math.round((sentBytes / totalBytes) * 100) : 0;
  const connected = status === "ready";

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Ambient background */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -left-40 -top-40 h-80 w-80 rounded-full bg-orange-600/15 blur-[90px]" />
        <div className="absolute right-0 top-36 h-72 w-72 rounded-full bg-orange-500/12 blur-[90px]" />
      </div>

      <header className="mx-auto flex max-w-2xl flex-col gap-3.5 px-3 pb-2 pt-4 sm:gap-4 sm:px-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <BrandLogo size="lg" />
            <div>
              <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl">
                sg16<span className="text-orange-400">-transfer</span>
              </h1>
              <p className="text-[11px] text-neutral-400 sm:text-xs">
                {deviceEmoji(device.kind)} {device.label} · super fast p2p sharing
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="glass-deep-subtle inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] text-orange-100">
              <StatusDot status={status} /> {status === "ready" ? "linked" : status}
            </span>
            {speed > 0 ? <Badge tone="emerald">{formatSpeed(speed)}</Badge> : null}
          </div>
        </div>

        <PromoStrip />

        <PlatformDownloads />

        <div className="glass-deep-subtle card-pop flex gap-1 rounded-xl p-1">
          {(
            [
              ["send", "🚀 Send"],
              ["receive", "📥 Receive"],
            ] as [Mode, string][]
          ).map(([value, label]) => (
            <button
              key={value}
              onClick={() => {
                if (value !== mode) {
                  sessionRef.current?.close();
                  sessionRef.current = null;
                  resetState();
                  setModeOverride(value);
                }
              }}
              className={`flex-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition ${
                mode === value
                  ? "bg-gradient-to-r from-orange-400 via-orange-500 to-amber-500 text-black shadow-[0_0_20px_-6px_rgba(255,120,0,0.7)]"
                  : "text-slate-300 hover:bg-white/5"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-3 pb-8 pt-4 sm:px-4">
        {mode === "send" ? (
          <div className="grid gap-3.5 md:grid-cols-[1fr_1fr] md:gap-4">
            {/* QR + code pane */}
            <Card className="flex flex-col items-center gap-2 text-center">
              <div className="flex flex-col items-center gap-0.5">
                <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400">scan to connect</p>
                <p className="text-[10px] text-slate-500">Any camera or Receive tab</p>
              </div>

              {code ? (
                <QrBox
                  value={shareUrl}
                  caption="Opens receiver on the other device."
                  size="sm"
                />
              ) : status === "failed" ? (
                <div className="flex h-[168px] w-full max-w-[180px] flex-col items-center justify-center gap-2 rounded-xl border border-rose-400/20 bg-rose-400/5 px-2 text-center">
                  <p className="text-xs font-semibold text-rose-200">Could not create room</p>
                  <p className="text-[10px] text-slate-400">{detail || "Check server / DATABASE_URL."}</p>
                  <Btn tone="soft" size="sm" onClick={() => void startAsSender()} disabled={busy}>
                    try again
                  </Btn>
                </div>
              ) : (
                <div className="glass-deep-subtle flex h-[168px] w-full max-w-[180px] items-center justify-center rounded-xl border border-dashed border-orange-500/15 text-[10px] text-neutral-500">
                  preparing your QR…
                </div>
              )}

              <div className="w-full space-y-1">
                <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">or type this code</p>
                <div className="flex items-center justify-center gap-1.5">
                  <p className="text-xl font-black tracking-[0.25em] text-white">{code || "•••••"}</p>
                  {code ? (
                    <Btn tone="ghost" size="sm" onClick={() => void copyShareCode()}>
                      {codeCopied ? "✓" : "copy"}
                    </Btn>
                  ) : null}
                </div>
              </div>

              {peer.device ? (
                <Badge tone="emerald">
                  {deviceEmoji(peer.device)} {peer.name ?? "peer"} connected
                </Badge>
              ) : (
                <p className="text-[11px] text-slate-400">{detail || "Waiting for the other device…"}</p>
              )}
            </Card>

            {/* Files pane */}
            <div className="flex flex-col gap-3.5 md:gap-4">
              <Card className="flex-1 space-y-2">
                <div
                  onDragOver={(event) => {
                    event.preventDefault();
                    setDragging(true);
                  }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={(event) => {
                    event.preventDefault();
                    setDragging(false);
                    addFiles(event.dataTransfer.files);
                  }}
                  className={`flex flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed p-3 text-center transition ${
                    dragging
                      ? "border-orange-400 bg-orange-500/10"
                      : "glass-deep-subtle border-orange-500/20"
                  }`}
                >
                  <p className="text-xl">📂</p>
                  <p className="text-xs font-semibold text-white">Drop or pick files</p>
                  <p className="text-[10px] text-slate-400">
                    Photos, videos, APKs, docs — any size
                  </p>
                  <label className="mt-1 cursor-pointer rounded-xl bg-gradient-to-r from-orange-400 via-orange-500 to-amber-600 px-4 py-1.5 text-xs font-semibold text-black shadow-[0_0_16px_-4px_rgba(255,120,0,0.7)]">
                    Choose files
                    <input
                      type="file"
                      multiple
                      className="hidden"
                      onChange={(event) => addFiles(event.target.files)}
                    />
                  </label>
                </div>

                {items.length === 0 && pending.length === 0 ? (
                  <p className="glass-deep-subtle rounded-lg p-2 text-center text-xs text-neutral-400">
                    {connected
                      ? "Ready — drop something to start streaming."
                      : "Pick files now, we'll send them the instant the peer connects."}
                  </p>
                ) : null}

                {pending.length > 0 ? (
                  <div className="space-y-1.5">
                    <p className="text-[11px] uppercase tracking-[0.2em] text-amber-300">
                      queued · sends on connect
                    </p>
                    {pending.map((file, index) => (
                      <div
                        key={`${file.name}-${index}`}
                        className="flex items-center justify-between rounded-xl border border-amber-400/20 bg-amber-400/5 px-2.5 py-1.5 text-xs"
                      >
                        <span className="truncate text-amber-100">
                          {fileGlyph(file.name)} {file.name}
                        </span>
                        <span className="text-amber-300/80">{formatBytes(file.size)}</span>
                      </div>
                    ))}
                  </div>
                ) : null}

                {items.length > 0 ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span>overall {overall}%</span>
                      <span>
                        {formatBytes(sentBytes)} / {formatBytes(totalBytes)}
                      </span>
                    </div>
                    <ProgressBar value={overall} />
                    <div className="max-h-[220px] space-y-2 overflow-y-auto pr-1">
                      {items.map((item) => (
                        <FileRow key={item.id} item={item} kind="send" />
                      ))}
                    </div>
                  </div>
                ) : null}
              </Card>

              {code ? (
                <Btn
                  tone="ghost"
                  size="sm"
                  onClick={() => {
                    sessionRef.current?.close();
                    sessionRef.current = null;
                    resetState();
                    void startAsSender();
                  }}
                >
                  ↻ new session
                </Btn>
              ) : null}

              <LanDirectPanel
                mode="send"
                disabled={busy || connected}
                onCreateOffer={lanCreateOffer}
                onAcceptOffer={lanAcceptOffer}
                onCompletePairing={lanCompletePairing}
              />
            </div>
          </div>
        ) : (
          <div className="grid gap-3.5 md:grid-cols-[1fr_1fr] md:gap-4">
            <Card className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-lg">📥</span>
                <div>
                  <h2 className="text-sm font-bold text-white">Enter code or scan QR</h2>
                  <p className="text-[10px] text-slate-400">Code from the sender screen.</p>
                </div>
              </div>

              <CodeInput
                value={joinCode}
                onChange={(event) =>
                  setJoinDraft(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))
                }
                placeholder="•••••"
                maxLength={8}
                inputMode="text"
                autoComplete="off"
                autoFocus
              />

              <div className="grid grid-cols-2 gap-1.5">
                <Btn
                  size="md"
                  onClick={() => connectAsReceiver(joinCode)}
                  disabled={busy || joinCode.length < 4}
                >
                  connect
                </Btn>
                <Btn size="md" tone="soft" onClick={() => setScanning((prev) => !prev)}>
                  {scanning ? "close" : "📷 scan QR"}
                </Btn>
              </div>

              {scanning ? <QrScanner onScan={onScan} onClose={() => setScanning(false)} /> : null}

              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                {peer.device ? (
                  <Badge tone="emerald">
                    {deviceEmoji(peer.device)} {peer.name ?? "sender"} linked
                  </Badge>
                ) : null}
                {detail ? <span className="text-slate-500">{detail}</span> : null}
              </div>

              <label className="flex cursor-pointer items-center gap-2 text-xs text-slate-400">
                <input
                  type="checkbox"
                  checked={autoSave}
                  onChange={(event) => setAutoSave(event.target.checked)}
                  className="h-4 w-4 accent-orange-500"
                />
                auto-save incoming files
              </label>

              <LanDirectPanel
                mode="receive"
                disabled={busy || connected}
                initialOffer={lanSeedOffer}
                onCreateOffer={lanCreateOffer}
                onAcceptOffer={lanAcceptOffer}
                onCompletePairing={lanCompletePairing}
              />
            </Card>

            <Card className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-slate-300">
                  Incoming
                </h3>
                <Badge tone={connected ? "emerald" : "slate"}>
                  {items.length ? `${items.length} file(s)` : "idle"}
                </Badge>
              </div>

              {items.length === 0 ? (
                <p className="glass-deep-subtle rounded-lg p-2 text-center text-[11px] text-neutral-400">
                  Waiting for the sender to push files…
                </p>
              ) : (
                <>
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>overall {overall}%</span>
                    <span>
                      {formatBytes(sentBytes)} / {formatBytes(totalBytes)}
                    </span>
                  </div>
                  <ProgressBar value={overall} />
                  <div className="max-h-[180px] space-y-1.5 overflow-y-auto pr-1">
                    {items.map((item) => (
                      <FileRow key={item.id} item={item} kind="recv" />
                    ))}
                  </div>
                </>
              )}

              {received.length > 0 ? (
                <div className="space-y-2 border-t border-white/5 pt-3">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">saved</p>
                  <div className="max-h-[160px] space-y-1.5 overflow-y-auto pr-1">
                    {received.map((payload) => (
                      <div
                        key={payload.id}
                        className="glass-deep-subtle flex items-center justify-between gap-3 rounded-xl px-3 py-2 text-xs"
                      >
                        <span className="truncate text-slate-200">
                          {fileGlyph(payload.name)} {payload.name}
                        </span>
                        <span className="flex shrink-0 items-center gap-2 text-slate-400">
                          {formatBytes(payload.size)}
                          <button
                            onClick={() => saveBlob(payload)}
                            className="rounded-xl bg-orange-500/15 px-2 py-1 text-orange-200 hover:bg-orange-500/25"
                          >
                            save
                          </button>
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </Card>
          </div>
        )}

        <div className="mt-5 grid gap-3 text-[10px] text-slate-400 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
          <Feat glyph="⚡" title="LAN speed">
            Direct peer-to-peer WebRTC — nothing goes through a server.
          </Feat>
          <Feat glyph="📷" title="QR pairing">
            Scan the QR from any device, tap once, connected.
          </Feat>
          <Feat glyph="📶" title="Offline mode">
            LAN Direct works with no internet — hotspot or local Wi-Fi only.
          </Feat>
          <Feat glyph="🔒" title="Private">
            No accounts, no cloud storage, room codes expire fast.
          </Feat>
        </div>
      </main>

      <footer className="mx-auto max-w-2xl space-y-3 px-3 pb-6 pt-2 text-center sm:px-4">
        <p className="text-xs font-semibold text-orange-300/90">
          Tell friends: open this link on any phone or PC — same app, instant transfer
        </p>
        <p className="text-[10px] text-neutral-500">
          sg16-transfer · Free · Android ⇄ iPhone ⇄ PC · P2P · No cloud storage
        </p>
      </footer>
    </div>
  );
}

function FileRow({ item, kind }: { item: LiveFileState; kind: "send" | "recv" }) {
  const pct = percent(item.sent, item.size);
  const label =
    item.status === "done"
      ? kind === "send"
        ? "✓ delivered"
        : "✓ saved"
      : item.status === "sending"
        ? kind === "send"
          ? "streaming…"
          : "receiving…"
        : "queued";
  return (
    <div className="glass-deep-subtle card-pop space-y-1 rounded-xl p-2.5">
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="truncate text-slate-200">
          {item.isText ? "📝" : fileGlyph(item.name)} {item.name}
        </span>
        <span className="shrink-0 text-slate-400">
          {formatBytes(item.sent)} / {formatBytes(item.size)}
        </span>
      </div>
      <ProgressBar value={pct} />
      <div className="flex items-center justify-between text-[11px] text-slate-500">
        <span>{pct}%</span>
        <span>
          {label}
          {item.status === "done" && item.speed > 0 ? ` · ${formatSpeed(item.speed)}` : ""}
        </span>
      </div>
    </div>
  );
}

function Feat({ glyph, title, children }: { glyph: string; title: string; children: string }) {
  return (
    <div className="glass-deep-subtle card-pop rounded-xl p-2.5">
      <p className="text-base">{glyph}</p>
      <p className="mt-0.5 text-xs font-semibold text-white">{title}</p>
      <p className="text-[10px] leading-relaxed text-slate-400">{children}</p>
    </div>
  );
}
