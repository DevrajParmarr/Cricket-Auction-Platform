"use client";

import { formatClock } from "./format";

// Matches TIMER_SECONDS in backend/app/services/auction_service.py; each bid resets to this
export const AUCTION_TIMER_SECONDS = 180;

type Stage = "calm" | "warning" | "critical";

const STAGE: Record<Stage, { stroke: string; text: string; glow: string; label: string }> = {
  calm: { stroke: "#34d399", text: "text-emerald-300", glow: "bg-emerald-400/25", label: "time left" },
  warning: { stroke: "#fbbf24", text: "text-amber-300", glow: "bg-amber-400/30", label: "hurry up" },
  critical: { stroke: "#ef4444", text: "text-red-400", glow: "bg-red-500/45", label: "last call" },
};

const SIZES = {
  md: { box: "w-24 h-24 sm:w-28 sm:h-28", stroke: 7, time: "text-3xl sm:text-4xl", label: "text-[9px] sm:text-[10px]", ticks: 0 },
  xl: { box: "w-64 h-64 sm:w-72 sm:h-72", stroke: 5, time: "text-8xl", label: "text-sm", ticks: 60 },
};

interface Props {
  seconds: number;
  total?: number;
  size?: keyof typeof SIZES;
  paused?: boolean;
  className?: string;
}

export default function AuctionTimer({
  seconds,
  total = AUCTION_TIMER_SECONDS,
  size = "md",
  paused = false,
  className = "",
}: Props) {
  const s = Math.max(0, seconds);
  const stage: Stage = s <= 10 ? "critical" : s <= 30 ? "warning" : "calm";
  const cfg = STAGE[stage];
  const dims = SIZES[size];

  const r = 50 - dims.stroke / 2 - (dims.ticks ? 5 : 1);
  const circumference = 2 * Math.PI * r;
  const progress = Math.min(1, s / total);
  const urgent = stage === "critical" && s > 0 && !paused;

  const mins = Math.floor(s / 60);
  const secs = s % 60;
  const spoken = mins > 0 ? `${mins} minute${mins > 1 ? "s" : ""} ${secs} seconds` : `${secs} seconds`;

  return (
    <div className={`relative inline-flex items-center justify-center shrink-0 ${dims.box} ${className}`}>
      {/* Stage-coloured halo; only pulses in the final seconds */}
      <div
        aria-hidden="true"
        className={`absolute inset-3 rounded-full blur-2xl transition-colors duration-500 ${cfg.glow} ${
          urgent ? "animate-glow-pulse" : "opacity-40"
        }`}
      />

      <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full -rotate-90" aria-hidden="true">
        {dims.ticks > 0 &&
          Array.from({ length: dims.ticks }, (_, i) => {
            const a = (i / dims.ticks) * 2 * Math.PI;
            const major = i % 5 === 0;
            const r1 = 49;
            const r2 = major ? 45.5 : 47;
            return (
              <line
                key={i}
                x1={50 + r1 * Math.cos(a)}
                y1={50 + r1 * Math.sin(a)}
                x2={50 + r2 * Math.cos(a)}
                y2={50 + r2 * Math.sin(a)}
                stroke="white"
                strokeOpacity={major ? 0.25 : 0.1}
                strokeWidth={major ? 0.8 : 0.5}
              />
            );
          })}
        <circle cx="50" cy="50" r={r} fill="none" stroke="white" strokeOpacity="0.08" strokeWidth={dims.stroke} />
        <circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          stroke={cfg.stroke}
          strokeWidth={dims.stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - progress)}
          // Linear 1s drain matches the server's 1s ticks; a bid "refills" the ring the same way
          style={{ transition: "stroke-dashoffset 1s linear, stroke 400ms ease" }}
        />
      </svg>

      <div
        role="timer"
        aria-label={`${spoken} remaining`}
        className="relative flex flex-col items-center leading-none"
      >
        <span
          className={`font-display font-bold tabular-nums tracking-tight transition-colors duration-500 ${dims.time} ${cfg.text} ${
            urgent ? "animate-heartbeat" : ""
          }`}
        >
          {formatClock(s)}
        </span>
        <span className={`mt-1 uppercase tracking-[0.2em] font-semibold text-white/50 ${dims.label}`}>
          {paused ? "paused" : s === 0 ? "closing" : stage === "critical" && size === "xl" ? "going, going…" : cfg.label}
        </span>
      </div>

      {/* Announce stage changes only, never every tick */}
      <span className="sr-only" aria-live="polite">
        {stage === "critical" ? "Final 10 seconds" : stage === "warning" ? "Under 30 seconds left" : ""}
      </span>
    </div>
  );
}
