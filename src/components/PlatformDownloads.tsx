"use client";

import { useEffect, useState } from "react";
import { Badge, Btn } from "./ui";
import { BrandLogo } from "./BrandLogo";
import { formatBytes } from "@/lib/format";
import { useInstallPlatform, useOsHint, useStandaloneApp } from "@/lib/client-hooks";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: string }>;
};

type ApkInfo = {
  available: boolean;
  fileName: string | null;
  size: number;
  updatedAt: string | null;
};

function ShareIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className} aria-hidden>
      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
      <polyline points="16 6 12 2 8 6" />
      <line x1="12" y1="2" x2="12" y2="15" />
    </svg>
  );
}

function PlusSquareIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className} aria-hidden>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <line x1="12" y1="8" x2="12" y2="16" />
      <line x1="8" y1="12" x2="16" y2="12" />
    </svg>
  );
}

function PrimaryCta({
  children,
  href,
  onClick,
}: {
  children: React.ReactNode;
  href?: string;
  onClick?: () => void;
}) {
  const cls =
    "platform-cta inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-orange-400 via-orange-500 to-amber-500 px-3 py-2.5 text-xs font-bold text-black shadow-[0_0_24px_-2px_rgba(255,120,0,0.85)] transition hover:brightness-110";
  if (href) {
    return (
      <a href={href} className={cls}>
        {children}
      </a>
    );
  }
  return (
    <button type="button" className={cls} onClick={onClick}>
      {children}
    </button>
  );
}

function IosInstallGuide({ onClose }: { onClose: () => void }) {
  const steps = [
    { n: 1, title: "Open in Safari", body: "Chrome on iOS cannot add home-screen apps.", icon: "🧭" },
    { n: 2, title: "Tap Share", body: "Bottom bar → square with arrow up.", icon: "share" },
    { n: 3, title: "Add to Home Screen", body: 'Scroll → tap "Add to Home Screen".', icon: "plus" },
    { n: 4, title: "Tap Add", body: "sg16-transfer sits on your home screen like a native app.", icon: "✓" },
  ];

  return (
    <div className="glass-deep card-pop mt-3 overflow-hidden rounded-xl">
      <div className="flex items-center justify-between border-b border-orange-500/20 px-3 py-2">
        <div>
          <p className="text-xs font-bold text-white">Install on iPhone / iPad</p>
          <p className="text-[10px] text-orange-200/70">Full-screen · one tap · works offline</p>
        </div>
        <button type="button" onClick={onClose} className="rounded-lg px-2 py-1 text-[10px] text-neutral-400 hover:text-white">
          close
        </button>
      </div>
      <div className="grid gap-2 p-3 sm:grid-cols-2">
        {steps.map((step) => (
          <div key={step.n} className="glass-deep-subtle flex gap-2.5 rounded-lg p-2.5">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-orange-500/25 text-[11px] font-bold text-orange-300">
              {step.n}
            </span>
            <div>
              <p className="flex items-center gap-1.5 text-xs font-semibold text-white">
                {step.title}
                {step.icon === "share" ? <ShareIcon className="h-3.5 w-3.5 text-orange-400" /> : null}
                {step.icon === "plus" ? <PlusSquareIcon className="h-3.5 w-3.5 text-orange-400" /> : null}
                {step.icon !== "share" && step.icon !== "plus" ? <span>{step.icon}</span> : null}
              </p>
              <p className="mt-0.5 text-[10px] text-neutral-400">{step.body}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-3 border-t border-orange-500/15 bg-orange-500/5 px-3 py-2.5">
        <BrandLogo size="sm" className="gap-0" />
        <p className="text-[10px] text-neutral-400">Opens full-screen from your home screen — same LAN-speed transfers.</p>
      </div>
    </div>
  );
}

function AndroidInstallGuide({ onClose, apkUrl, apkSize }: { onClose: () => void; apkUrl: string; apkSize?: number }) {
  return (
    <div className="glass-deep card-pop mt-3 overflow-hidden rounded-xl">
      <div className="flex items-center justify-between border-b border-orange-500/20 px-3 py-2">
        <div>
          <p className="text-xs font-bold text-white">Install on Android</p>
          <p className="text-[10px] text-orange-200/70">APK or Chrome home-screen app</p>
        </div>
        <button type="button" onClick={onClose} className="rounded-lg px-2 py-1 text-[10px] text-neutral-400 hover:text-white">
          close
        </button>
      </div>
      <div className="space-y-2 p-3">
        {apkSize ? (
          <div className="glass-deep-subtle rounded-lg p-2.5">
            <p className="text-xs font-semibold text-white">Option A — Download APK</p>
            <p className="mt-1 text-[10px] text-neutral-400">Tap install, allow unknown sources if asked.</p>
            <PrimaryCta href={apkUrl} >
              📦 Download APK · {formatBytes(apkSize)}
            </PrimaryCta>
          </div>
        ) : null}
        <div className="glass-deep-subtle rounded-lg p-2.5">
          <p className="text-xs font-semibold text-white">{apkSize ? "Option B" : "Option A"} — Chrome app</p>
          <p className="mt-1 text-[10px] text-neutral-400">
            Open in <b className="text-orange-200">Chrome</b> → menu <b className="text-orange-200">⋮</b> →{" "}
            <b className="text-orange-200">Install app</b> or <b className="text-orange-200">Add to Home screen</b>.
          </p>
        </div>
        {!apkSize ? (
          <p className="text-[10px] text-neutral-500">
            APK builds via GitHub Actions when Android SDK is available — use Chrome install now.
          </p>
        ) : null}
      </div>
    </div>
  );
}

function WindowsInstallHint({ onClose }: { onClose: () => void }) {
  return (
    <div className="glass-deep card-pop mt-3 rounded-xl p-3 text-[10px] leading-relaxed text-neutral-400">
      <div className="mb-2 flex items-center justify-between">
        <p className="font-bold text-orange-100">Install on Windows</p>
        <button type="button" onClick={onClose} className="text-neutral-500 hover:text-white">
          close
        </button>
      </div>
      <p>
        <b className="text-white">Chrome / Edge:</b> click the <b className="text-white">Install</b> (⊕) icon in the
        address bar, or Menu <b className="text-white">⋯</b> → <b className="text-white">Apps</b> →{" "}
        <b className="text-white">Install sg16-transfer</b>.
      </p>
      <p className="mt-1.5 text-neutral-500">Pin to taskbar — runs in its own window like a native app.</p>
    </div>
  );
}

export function PlatformDownloads() {
  const [apk, setApk] = useState<ApkInfo | null>(null);
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [iosGuide, setIosGuide] = useState<"auto" | "open" | "closed">("auto");
  const [androidGuide, setAndroidGuide] = useState(false);
  const [windowsGuide, setWindowsGuide] = useState(false);
  const [copied, setCopied] = useState(false);
  const installed = useStandaloneApp();
  const platform = useInstallPlatform();
  const os = useOsHint();
  const showIosGuide = iosGuide === "open" || (iosGuide === "auto" && platform === "ios");

  useEffect(() => {
    const onPrompt = (event: Event) => {
      event.preventDefault();
      setPrompt(event as BeforeInstallPromptEvent);
    };
    const onInstalled = () => setPrompt(null);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);

    const apiBase = (process.env.NEXT_PUBLIC_API_BASE ?? "").replace(/\/$/, "");
    void fetch(`${apiBase}/api/download?info=1`, { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => data && setApk(data as ApkInfo))
      .catch(() => undefined);

    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const apiBase = (process.env.NEXT_PUBLIC_API_BASE ?? "").replace(/\/$/, "");
  const apkUrl = `${apiBase}/api/download`;

  const shareSite = async () => {
    const url = window.location.origin;
    try {
      if (navigator.share) {
        await navigator.share({ title: "sg16-transfer", text: "Super fast file sharing", url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* cancelled */
    }
  };

  const runInstallPrompt = async () => {
    if (!prompt) return false;
    await prompt.prompt();
    await prompt.userChoice.catch(() => undefined);
    setPrompt(null);
    return true;
  };

  const installWindows = async () => {
    if (await runInstallPrompt()) return;
    setWindowsGuide(true);
  };

  const installAndroid = async () => {
    if (apk?.available) return;
    if (platform === "android" && (await runInstallPrompt())) return;
    setAndroidGuide(true);
  };

  if (installed) {
    return (
      <div className="glass-deep card-pop flex items-center justify-between rounded-xl px-3 py-2.5 text-xs text-emerald-200">
        <span className="flex items-center gap-2">
          <span>✓</span> App installed — launch from home screen or taskbar
        </span>
        <Badge tone="emerald">installed</Badge>
      </div>
    );
  }

  const isWindowsYou = platform === "desktop" && (os === "windows" || os === "linux" || os === "other");
  const isAndroidYou = platform === "android";
  const isIosYou = platform === "ios";

  const platformCardClass = (active: boolean) =>
    `platform-card glass-deep card-pop rounded-xl p-3 transition ${active ? "card-pop-active ring-1 ring-orange-400/30" : ""}`;

  return (
    <div className="glass-deep card-pop space-y-3 rounded-xl p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <BrandLogo size="sm" />
          <div>
            <p className="text-xs font-bold text-white sm:text-sm">Get sg16-transfer on your device</p>
            <p className="text-[10px] text-orange-200/80">Free · Windows, Android &amp; iPhone</p>
          </div>
        </div>
        <Btn tone="soft" size="sm" onClick={() => void shareSite()}>
          {copied ? "✓ copied" : "share link"}
        </Btn>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className={platformCardClass(isWindowsYou)}>
          <div className="mb-2 flex items-center gap-2">
            <span className="text-2xl">💻</span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-white">Windows</p>
              <p className="text-[10px] text-neutral-400">Desktop app</p>
            </div>
            {isWindowsYou ? <Badge tone="orange">you</Badge> : null}
          </div>
          <p className="mb-3 text-[10px] leading-relaxed text-neutral-400">
            Install in Chrome or Edge. Own window — pin to taskbar.
          </p>
          <PrimaryCta onClick={() => void installWindows()}>
            {prompt && isWindowsYou ? "⬇ Install for Windows" : "💻 Install app"}
          </PrimaryCta>
        </div>

        <div className={platformCardClass(isAndroidYou)}>
          <div className="mb-2 flex items-center gap-2">
            <span className="text-2xl">🤖</span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-white">Android</p>
              <p className="text-[10px] text-neutral-400">APK or app install</p>
            </div>
            {isAndroidYou ? <Badge tone="orange">you</Badge> : null}
          </div>
          <p className="mb-3 text-[10px] leading-relaxed text-neutral-400">
            Download APK or install from Chrome — works like a native app.
          </p>
          {apk?.available ? (
            <PrimaryCta href={apkUrl}>
              📦 Download APK
              <span className="rounded bg-black/20 px-1 py-0.5 font-mono text-[9px]">{formatBytes(apk.size)}</span>
            </PrimaryCta>
          ) : (
            <PrimaryCta onClick={() => void installAndroid()}>
              {prompt && isAndroidYou ? "⬇ Install app" : "🤖 Get Android app"}
            </PrimaryCta>
          )}
        </div>

        <div className={platformCardClass(isIosYou)}>
          <div className="mb-2 flex items-center gap-2">
            <span className="text-2xl">📱</span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-white">iPhone / iPad</p>
              <p className="text-[10px] text-neutral-400">Home Screen app</p>
            </div>
            {isIosYou ? <Badge tone="orange">you</Badge> : null}
          </div>
          <p className="mb-3 text-[10px] leading-relaxed text-neutral-400">
            Add to Home Screen from Safari — full-screen, no App Store.
          </p>
          <PrimaryCta onClick={() => setIosGuide(showIosGuide ? "closed" : "open")}>
            {showIosGuide ? "Hide guide" : "📱 Add to Home Screen"}
          </PrimaryCta>
        </div>
      </div>

      {windowsGuide ? <WindowsInstallHint onClose={() => setWindowsGuide(false)} /> : null}
      {androidGuide ? (
        <AndroidInstallGuide onClose={() => setAndroidGuide(false)} apkUrl={apkUrl} apkSize={apk?.size} />
      ) : null}
      {showIosGuide ? <IosInstallGuide onClose={() => setIosGuide("closed")} /> : null}
    </div>
  );
}
