"use client";

import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from "react";

export function Card({ children, className = "", ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div {...rest} className={`glass-deep card-pop rounded-xl p-2.5 ${className}`}>
      {children}
    </div>
  );
}

type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  tone?: "primary" | "ghost" | "danger" | "soft";
  size?: "sm" | "md" | "lg";
};

export function Btn({ tone = "primary", size = "md", className = "", ...rest }: BtnProps) {
  const tones: Record<string, string> = {
    primary:
      "bg-gradient-to-r from-orange-400 via-orange-500 to-amber-600 text-black font-semibold shadow-[0_0_24px_-2px_rgba(255,120,0,0.9)] hover:brightness-110",
    soft: "bg-orange-500/10 text-orange-100 hover:bg-orange-500/15 border border-orange-500/20",
    ghost: "bg-transparent text-neutral-300 hover:text-orange-200 hover:bg-orange-500/10",
    danger: "bg-rose-500/20 text-rose-200 border border-rose-400/30 hover:bg-rose-500/30",
  };
  const sizes: Record<string, string> = {
    sm: "px-2.5 py-1 text-[11px]",
    md: "px-3 py-1.5 text-xs",
    lg: "px-4 py-2 text-sm",
  };
  return (
    <button
      {...rest}
      className={`inline-flex items-center justify-center gap-1.5 rounded-xl transition disabled:cursor-not-allowed disabled:opacity-40 ${tones[tone]} ${sizes[size]} ${className}`}
    />
  );
}

export function Badge({ children, tone = "orange" }: { children: ReactNode; tone?: string }) {
  const tones: Record<string, string> = {
    orange: "border-orange-500/30 bg-orange-500/12 text-orange-200",
    cyan: "border-orange-400/50 bg-orange-500/25 text-orange-100",
    violet: "border-orange-400/50 bg-orange-500/25 text-orange-100",
    amber: "border-amber-400/50 bg-amber-500/20 text-amber-100",
    emerald: "border-emerald-400/40 bg-emerald-400/15 text-emerald-200",
    slate: "border-orange-400/20 bg-orange-950/30 text-neutral-300",
    rose: "border-rose-400/40 bg-rose-400/15 text-rose-200",
  };
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide backdrop-blur-sm ${tones[tone] ?? tones.orange}`}
    >
      {children}
    </span>
  );
}

export function StatusDot({ status }: { status: string }) {
  const map: Record<string, string> = {
    idle: "bg-neutral-500",
    waiting: "bg-amber-400 animate-pulse",
    connecting: "bg-orange-400 animate-pulse shadow-[0_0_10px_rgba(255,120,0,1)]",
    ready: "bg-emerald-400",
    failed: "bg-rose-500",
    closed: "bg-neutral-600",
  };
  return <span className={`inline-block h-2 w-2 rounded-full ${map[status] ?? map.idle}`} />;
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block space-y-2">
      <span className="text-xs font-semibold uppercase tracking-[0.18em] text-orange-200/60">{label}</span>
      {children}
      {hint ? <span className="block text-xs text-neutral-500">{hint}</span> : null}
    </label>
  );
}

export function CodeInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`glass-input w-full rounded-xl px-3 py-2 text-center text-xl font-black uppercase tracking-[0.35em] text-orange-200 outline-none placeholder:tracking-[0.25em] placeholder:text-neutral-600 focus:border-orange-400/70 focus:shadow-[0_0_20px_-4px_rgba(255,120,0,0.6)] ${props.className ?? ""}`}
    />
  );
}

export function ProgressBar({ value }: { value: number }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-black/30 ring-1 ring-orange-500/20">
      <div
        className="h-full rounded-full bg-gradient-to-r from-orange-600 via-orange-400 to-amber-400 shadow-[0_0_14px_rgba(255,120,0,0.75)] transition-[width] duration-200"
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}
