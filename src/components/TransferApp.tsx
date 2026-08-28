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
      </header>
    </div>
  );
}
