"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Btn } from "./ui";

const QR_SIZES = {
  sm: { render: 168, canvas: 200, box: 168 },
  md: { render: 200, canvas: 240, box: 200 },
} as const;

export function QrBox({
  value,
  caption,
  compact = false,
  size = "sm",
}: {
  value: string;
  caption?: string;
  compact?: boolean;
  size?: keyof typeof QR_SIZES;
}) {
  const dims = compact ? QR_SIZES.sm : QR_SIZES[size];
  const [dataUrl, setDataUrl] = useState<string>("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const build = async () => {
      try {
        const url = await QRCode.toDataURL(value, {
          errorCorrectionLevel: "L",
          margin: 1,
          width: dims.canvas,
          color: { dark: "#020617ff", light: "#ffffffff" },
        });
        if (!cancelled) setDataUrl(url);
      } catch {
        if (!cancelled) setDataUrl("");
      }
    };
    void build();
    return () => {
      cancelled = true;
    };
  }, [value, dims.canvas]);

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="rounded-2xl bg-white p-1.5 shadow-[0_0_40px_-10px_rgba(255,120,0,0.75)]">
        {dataUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={dataUrl}
            alt="Scan to connect"
            width={dims.render}
            height={dims.render}
            className="block"
          />
        ) : (
          <div
            className="flex items-center justify-center text-[10px] text-slate-500"
            style={{ width: dims.box, height: dims.box }}
          >
            building QR…
          </div>
        )}
      </div>
      {caption ? <p className="max-w-[220px] text-center text-[10px] leading-snug text-slate-400">{caption}</p> : null}
      <Btn
        tone="soft"
        size="sm"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(value);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          } catch {
            setCopied(false);
          }
        }}
      >
        {copied ? "✓ copied" : "copy link"}
      </Btn>
    </div>
  );
}
