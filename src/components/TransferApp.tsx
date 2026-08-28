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

  useEffect(() => {
    if (mode === "send" && !code && !sessionRef.current && !busy) {
      void startAsSender();
    }
  }, [mode]);

  const addFiles = (list: FileList | File[] | null) => {
    if (!list) return;
    const files = Array.from(list as ArrayLike<File>);
    if (files.length === 0) return;
    setPending((prev) => [...prev, ...files]);
    if (sessionRef.current && status === "ready") {
      void sessionRef.current.sendFiles(files);
      setPending([]);
    }
  };

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
      try {
        const url = new URL(value);
        const j = url.searchParams.get("join");
        if (j) {
          setModeOverride("receive");
          setJoinDraft(j.toUpperCase());
          void connectAsReceiver(j);
          return;
        }
      } catch {}
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
          {([["send", "🚀 Send"], ["receive", "📥 Receive"]] as [Mode, string][]).map(([value, label]) => (
            <button key={value} onClick={() => { if (value !== mode) { sessionRef.current?.close(); sessionRef.current = null; resetState(); setModeOverride(value); } }} className={`flex-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition ${mode === value ? "bg-gradient-to-r from-orange-400 via-orange-500 to-amber-500 text-black shadow-[0_0_20px_-6px_rgba(255,120,0,0.7)]" : "text-slate-300 hover:bg-white/5"}`}>{label}</button>
          ))}
        </div>
      </header>
      <main className="mx-auto max-w-2xl px-3 pb-8 pt-4 sm:px-4">
        {mode === "send" ? (
          <div className="grid gap-3.5 md:grid-cols-[1fr_1fr] md:gap-4">
            <Card className="flex flex-col items-center gap-2 text-center">
              <div className="flex flex-col items-center gap-0.5">
                <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400">scan to connect</p>
                <p className="text-[10px] text-slate-500">Any camera or Receive tab</p>
              </div>
              {code ? <QrBox value={shareUrl} caption="Opens receiver on the other device." size="sm" /> : status === "failed" ? (
                <div className="flex h-[168px] w-full max-w-[180px] flex-col items-center justify-center gap-2 rounded-xl border border-rose-400/20 bg-rose-400/5 px-2 text-center">
                  <p className="text-xs font-semibold text-rose-200">Could not create room</p>
                  <p className="text-[10px] text-slate-400">{detail || "Check server / DATABASE_URL."}</p>
                  <Btn tone="soft" size="sm" onClick={() => void startAsSender()} disabled={busy}>try again</Btn>
                </div>
              ) : (
                <div className="glass-deep-subtle flex h-[168px] w-full max-w-[180px] items-center justify-center rounded-xl border border-dashed border-orange-500/15 text-[10px] text-neutral-500">preparing your QR…</div>
              )}
              <div className="w-full space-y-1">
                <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">or type this code</p>
                <div className="flex items-center justify-center gap-1.5">
                  <p className="text-xl font-black tracking-[0.25em] text-white">{code || "•••••"}</p>
                  {code ? <Btn tone="ghost" size="sm" onClick={() => void copyShareCode()}>{codeCopied ? "✓" : "copy"}</Btn> : null}
                </div>
              </div>
              {peer.device ? <Badge tone="emerald">{deviceEmoji(peer.device)} {peer.name ?? "peer"} connected</Badge> : <p className="text-[11px] text-slate-400">{detail || "Waiting for the other device…"}</p>}
            </Card>
            <div className="flex flex-col gap-3.5 md:gap-4">
              <Card className="flex-1 space-y-2">
                <div onDragOver={(e) => { e.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={(e) => { e.preventDefault(); setDragging(false); addFiles(e.dataTransfer.files); }} className={`flex flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed p-3 text-center transition ${dragging ? "border-orange-400 bg-orange-500/10" : "glass-deep-subtle border-orange-500/20"}`}>
                  <p className="text-xl">📂</p>
                  <p className="text-xs font-semibold text-white">Drop or pick files</p>
                  <label className="mt-1 cursor-pointer rounded-xl bg-gradient-to-r from-orange-400 via-orange-500 to-amber-600 px-4 py-1.5 text-xs font-semibold text-black"><input type="file" multiple className="hidden" onChange={(e) => addFiles(e.target.files)} />Choose files</label>
                </div>
              </Card>
            </div>
          </div>
        ) : null}
      </main>
    </div>
  );
}
