"use client";

import { useEffect, useRef, useState } from "react";
import jsQR from "jsqr";
import { Btn } from "./ui";

export function QrScanner({
  onScan,
  onClose,
}: {
  onScan: (value: string) => void;
  onClose: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [error, setError] = useState<string>("");
  const [active, setActive] = useState(false);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let raf = 0;
    let stopped = false;

    const start = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false,
        });
        if (stopped) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        video.setAttribute("playsinline", "true");
        await video.play();
        setActive(true);
        const canvas = canvasRef.current ?? document.createElement("canvas");
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        const tick = () => {
          if (stopped) return;
          if (ctx && video.readyState === video.HAVE_ENOUGH_DATA) {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const found = jsQR(image.data, image.width, image.height, {
              inversionAttempts: "dontInvert",
            });
            if (found?.data) {
              stopped = true;
              stream?.getTracks().forEach((track) => track.stop());
              onScan(found.data);
              return;
            }
          }
          raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
      } catch (err) {
        setError(
          err instanceof Error
            ? `Camera unavailable: ${err.message}. Type the code instead.`
            : "Camera unavailable. Type the code instead.",
        );
      }
    };

    void start();
    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, [onScan]);

  return (
    <div className="glass-deep space-y-3 rounded-2xl p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-white">Scan the pairing QR</p>
        <Btn tone="ghost" size="sm" onClick={onClose}>
          close
        </Btn>
      </div>
      <div className="relative overflow-hidden rounded-2xl bg-black">
        <video ref={videoRef} className="h-56 w-full object-cover" muted playsInline />
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-40 w-40 rounded-2xl border-2 border-orange-400/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.55)]" />
        </div>
      </div>
      <canvas ref={canvasRef} className="hidden" />
      {error ? <p className="text-xs text-amber-300">{error}</p> : null}
      {!error ? (
        <p className="text-xs text-slate-400">
          {active ? "Hold the sender's QR code inside the frame…" : "Starting camera…"}
        </p>
      ) : null}
    </div>
  );
}
