"use client";

import { useState } from "react";

type Size = "xs" | "sm" | "md" | "lg" | "xl" | "2xl";
type Tone = "none" | "live" | "sold" | "unsold";

const SIZES: Record<Size, { box: string; text: string; px: number }> = {
  xs: { box: "w-6 h-6", text: "text-[10px]", px: 24 },
  sm: { box: "w-8 h-8", text: "text-xs", px: 32 },
  md: { box: "w-10 h-10", text: "text-sm", px: 40 },
  lg: { box: "w-16 h-16", text: "text-xl", px: 64 },
  xl: { box: "w-24 h-24", text: "text-3xl", px: 96 },
  "2xl": { box: "w-32 h-32", text: "text-5xl", px: 128 },
};

const RINGS: Record<Tone, string> = {
  none: "ring-1 ring-white/10",
  live: "ring-2 ring-amber-400 ring-offset-2 ring-offset-gray-950 shadow-[0_0_32px_-4px_rgba(251,191,36,0.55)]",
  sold: "ring-2 ring-emerald-400 ring-offset-2 ring-offset-gray-950 shadow-[0_0_28px_-6px_rgba(52,211,153,0.5)]",
  unsold: "ring-1 ring-white/10",
};

// Stable per-name gradients so a player keeps the same colour everywhere
const GRADIENTS = [
  ["#f59e0b", "#b45309"],
  ["#10b981", "#047857"],
  ["#3b82f6", "#1d4ed8"],
  ["#8b5cf6", "#6d28d9"],
  ["#ec4899", "#be185d"],
  ["#14b8a6", "#0f766e"],
  ["#f97316", "#c2410c"],
  ["#6366f1", "#4338ca"],
];

function gradientFor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) | 0;
  const [from, to] = GRADIENTS[Math.abs(hash) % GRADIENTS.length];
  return `linear-gradient(135deg, ${from}, ${to})`;
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}

interface Props {
  name: string;
  photo?: string | null;
  size?: Size;
  tone?: Tone;
  className?: string;
}

export default function PlayerAvatar({ name, photo, size = "md", tone = "none", className = "" }: Props) {
  const [broken, setBroken] = useState(false);
  const s = SIZES[size];
  const dim = tone === "unsold" ? "grayscale opacity-60" : "";

  return (
    <div
      className={`relative shrink-0 rounded-full overflow-hidden ${s.box} ${RINGS[tone]} ${className}`}
      aria-hidden="true"
    >
      {photo && !broken ? (
        <img
          src={photo}
          alt=""
          width={s.px}
          height={s.px}
          loading="lazy"
          decoding="async"
          onError={() => setBroken(true)}
          className={`w-full h-full object-cover ${dim}`}
        />
      ) : (
        <div
          className={`w-full h-full flex items-center justify-center font-display font-bold text-white/95 tracking-wide ${s.text} ${dim}`}
          style={{ backgroundImage: gradientFor(name) }}
        >
          {initials(name)}
        </div>
      )}
    </div>
  );
}
