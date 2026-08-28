"use client";

import { Badge } from "./ui";

const PLATFORMS = [
  { icon: "💻", label: "Windows" },
  { icon: "🤖", label: "Android" },
  { icon: "📱", label: "iPhone" },
];

const HIGHLIGHTS = [
  { icon: "⚡", text: "LAN-speed P2P" },
  { icon: "📷", text: "QR in 1 tap" },
  { icon: "🔒", text: "No account" },
  { icon: "📶", text: "Works offline" },
];

/** Hero promo — ~60% more visible marketing strip at top of app. */
export function PromoStrip() {
  return (
    <div className="glass-deep card-pop overflow-hidden rounded-xl px-2.5 py-2 sm:px-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge tone="amber">free</Badge>
            <Badge tone="orange">no signup</Badge>
            <Badge tone="emerald">private</Badge>
          </div>
          <p className="text-xs font-bold leading-snug text-white sm:text-sm">
            Share files at <span className="text-orange-400">LAN speed</span> — phone to laptop,
            any device.
          </p>
          <p className="text-[11px] leading-relaxed text-neutral-400">
            Open this same site on both devices, scan QR or type the code, send photos, videos,
            APKs &amp; docs direct — nothing stored on a server.
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5 text-right">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-orange-400/80">
            works on
          </p>
          <div className="flex flex-wrap justify-end gap-1">
            {PLATFORMS.map((p) => (
              <span
                key={p.label}
                className="glass-deep-subtle rounded-lg px-2 py-1 text-[10px] font-medium text-orange-100"
              >
                {p.icon} {p.label}
              </span>
            ))}
          </div>
        </div>
      </div>
      <div className="mt-2 flex flex-wrap gap-1 border-t border-orange-500/15 pt-2">
        {HIGHLIGHTS.map((h) => (
          <span
            key={h.text}
            className="rounded-lg bg-orange-500/10 px-2 py-1 text-[10px] font-medium text-orange-200/90"
          >
            {h.icon} {h.text}
          </span>
        ))}
      </div>
    </div>
  );
}
