"use client";

import type { ReactNode } from "react";
import PlayerAvatar from "./PlayerAvatar";
import { formatINR } from "./format";

type Status = "pending" | "active" | "sold" | "unsold";

const TONE: Record<Status, { bar: string; border: string }> = {
  pending: { bar: "bg-white/20", border: "border-white/[0.07]" },
  active: { bar: "bg-amber-400", border: "border-amber-400/30" },
  sold: { bar: "bg-emerald-400", border: "border-emerald-400/15" },
  unsold: { bar: "bg-red-500/70", border: "border-red-500/15" },
};

interface Props {
  name: string;
  photo?: string | null;
  status: Status;
  /** Sold price; shown instead of the status pill when the player is sold */
  price?: number;
  subtitle?: ReactNode;
  /** Optional control (e.g. Pick / Re-auction) rendered on the right */
  action?: ReactNode;
  /** Position in the list, used to stagger the entrance */
  index?: number;
  size?: "sm" | "md";
  /** Hide the pill when the surrounding list already says the status */
  showStatus?: boolean;
}

export default function PlayerListCard({ name, photo, status, price, subtitle, action, index = 0, size = "md", showStatus = true }: Props) {
  const tone = TONE[status];

  return (
    <div
      className={`group relative flex items-center gap-3 rounded-xl border ${tone.border} bg-gradient-to-r from-white/[0.05] to-white/[0.015] pl-4 pr-3 ${
        size === "sm" ? "py-2" : "py-2.5"
      } transition duration-200 ease-out hover:-translate-y-0.5 hover:border-white/20 hover:shadow-lg hover:shadow-black/40 animate-fade-up`}
      style={{ animationDelay: `${Math.min(index, 12) * 35}ms` }}
    >
      <span aria-hidden="true" className={`absolute left-1.5 top-2.5 bottom-2.5 w-[3px] rounded-full ${tone.bar}`} />

      <PlayerAvatar
        name={name}
        photo={photo}
        size={size === "sm" ? "sm" : "md"}
        tone={status === "unsold" ? "unsold" : "none"}
        className="transition-transform duration-200 group-hover:scale-105"
      />

      <div className="flex-1 min-w-0">
        <p
          className={`truncate font-medium ${size === "sm" ? "text-xs" : "text-sm"} ${
            status === "unsold" ? "text-white/60" : "text-white/95"
          }`}
          title={name}
        >
          {name}
        </p>
        {subtitle && <p className="truncate text-[11px] text-white/45">{subtitle}</p>}
      </div>

      {showStatus && <StatusPill status={status} price={price} />}
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

function StatusPill({ status, price }: { status: Status; price?: number }) {
  if (status === "sold" && price !== undefined) {
    return (
      <span className="shrink-0 font-display text-lg font-bold tabular-nums leading-none text-emerald-300">
        {formatINR(price)}
      </span>
    );
  }
  const styles: Record<Status, string> = {
    pending: "bg-white/[0.06] text-white/55",
    active: "bg-amber-400/15 text-amber-300",
    sold: "bg-emerald-400/15 text-emerald-300",
    unsold: "bg-red-500/10 text-red-300",
  };
  return (
    <span
      className={`shrink-0 inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${styles[status]}`}
    >
      {status === "active" && <span aria-hidden="true" className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />}
      {status === "active" ? "Live" : status}
    </span>
  );
}
