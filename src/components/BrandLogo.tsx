"use client";

import Image from "next/image";

type Props = {
  size?: "sm" | "md" | "lg" | "xl";
  showWordmark?: boolean;
  className?: string;
};

const SIZES = {
  sm: { box: 36, img: 34 },
  md: { box: 48, img: 46 },
  lg: { box: 64, img: 62 },
  xl: { box: 80, img: 78 },
};

/** Official SG16 TRANSFER logo (circular arrows + wordmark). */
export function BrandLogo({ size = "md", showWordmark = false, className = "" }: Props) {
  const dim = SIZES[size];
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <div
        className="relative shrink-0 overflow-hidden rounded-xl shadow-[0_0_24px_-4px_rgba(255,100,0,0.55)] ring-1 ring-orange-500/30"
        style={{ width: dim.box, height: dim.box }}
      >
        <Image
          src="/logo-sg16.jpg"
          alt="SG16 Transfer"
          width={dim.img}
          height={dim.img}
          className="h-full w-full object-cover"
          priority
        />
      </div>
      {showWordmark ? (
        <div className="min-w-0">
          <p className="text-sm font-black tracking-tight text-white">
            sg16<span className="text-orange-400">-transfer</span>
          </p>
        </div>
      ) : null}
    </div>
  );
}
