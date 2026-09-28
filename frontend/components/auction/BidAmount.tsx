"use client";

import { useEffect, useRef, useState } from "react";
import { formatINR } from "./format";
import { useAnimatedNumber } from "./useAnimatedNumber";

const SIZES = {
  lg: { amount: "text-6xl sm:text-7xl", delta: "text-2xl" },
  xl: { amount: "text-7xl sm:text-8xl", delta: "text-3xl" },
};

interface Props {
  amount: number;
  /** Changes when a different player comes up, so the counter snaps instead of tweening */
  resetKey: string | number;
  /** Changes on every accepted bid (amount + bidder), triggering the pop */
  pulseKey: string;
  size?: keyof typeof SIZES;
  className?: string;
}

export default function BidAmount({ amount, resetKey, pulseKey, size = "lg", className = "" }: Props) {
  const display = useAnimatedNumber(amount, resetKey);
  const prev = useRef({ amount, pulseKey, resetKey });
  const [bump, setBump] = useState<{ id: number; delta: number } | null>(null);

  useEffect(() => {
    const p = prev.current;
    if (p.resetKey !== resetKey) setBump(null);
    else if (p.pulseKey !== pulseKey) setBump({ id: Date.now(), delta: Math.max(0, amount - p.amount) });
    prev.current = { amount, pulseKey, resetKey };
  }, [amount, pulseKey, resetKey]);

  const s = SIZES[size];

  return (
    <div className={`relative inline-flex items-start ${className}`}>
      <span
        key={bump?.id ?? "rest"}
        aria-hidden="true"
        className={`inline-block font-display font-extrabold tabular-nums leading-none tracking-tight bg-gradient-to-b from-amber-100 via-amber-300 to-amber-500 bg-clip-text text-transparent drop-shadow-[0_4px_24px_rgba(245,158,11,0.35)] ${s.amount} ${
          bump ? "animate-bid-pop" : ""
        }`}
      >
        {formatINR(display)}
      </span>

      {bump && bump.delta > 0 && (
        <span
          key={`delta-${bump.id}`}
          aria-hidden="true"
          className={`absolute bottom-full right-0 mb-1 whitespace-nowrap font-display font-bold text-emerald-300 animate-float-up ${s.delta}`}
        >
          +{formatINR(bump.delta)}
        </span>
      )}

      <span className="sr-only" aria-live="polite">
        {formatINR(amount)}
      </span>
    </div>
  );
}
