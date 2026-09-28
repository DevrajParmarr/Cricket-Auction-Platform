"use client";

import AuctionTimer, { AUCTION_TIMER_SECONDS } from "@/components/auction/AuctionTimer";
import BidAmount from "@/components/auction/BidAmount";
import Confetti from "@/components/auction/Confetti";
import PlayerAvatar from "@/components/auction/PlayerAvatar";
import ResultStamp from "@/components/auction/ResultStamp";
import { formatINR } from "@/components/auction/format";
import { CheckIcon, CrossIcon, GavelIcon } from "@/components/auction/icons";

interface Props {
  playerName: string;
  playerPhoto?: string;
  basePrice: number;
  currentBid: number;
  currentBidderName?: string;
  /** Team colour of the highest bidder, used for the leader chip */
  currentBidderColor?: string;
  timer: number;
  timerTotal?: number;
  status: string;
}

const ACCENT = { live: "#f59e0b", sold: "#34d399", unsold: "#64748b", idle: "#475569" };

export default function AuctionPlayerCard({
  playerName,
  playerPhoto,
  basePrice,
  currentBid,
  currentBidderName,
  currentBidderColor,
  timer,
  timerTotal = AUCTION_TIMER_SECONDS,
  status,
}: Props) {
  const isLive = status === "active";
  const isSold = status === "sold";
  const isUnsold = status === "unsold";
  const hasBid = !!currentBidderName;
  const displayBid = currentBid > 0 ? currentBid : basePrice;
  const accent = isLive ? ACCENT.live : isSold ? ACCENT.sold : isUnsold ? ACCENT.unsold : ACCENT.idle;
  const bidderColor = currentBidderColor || ACCENT.live;
  const pulseKey = `${displayBid}-${currentBidderName ?? ""}`;

  return (
    <article
      aria-label={`${playerName} on auction`}
      className="relative rounded-3xl p-[1.5px] overflow-hidden shadow-2xl shadow-black/60"
    >
      {/* Border light: sweeps while bidding is open, rests once the hammer falls */}
      <div
        aria-hidden="true"
        className={`absolute left-1/2 top-1/2 w-[250%] aspect-square -ml-[125%] -mt-[125%] ${isLive ? "animate-spin-slow" : ""}`}
        style={{
          background: `conic-gradient(from 0deg, transparent 0deg, ${accent} 50deg, transparent 110deg, transparent 180deg, ${accent} 230deg, transparent 290deg)`,
        }}
      />

      <div className="relative h-full rounded-[calc(1.5rem-1.5px)] bg-gray-950 overflow-hidden">
        <div
          aria-hidden="true"
          className="absolute -top-28 -left-20 w-80 h-80 rounded-full blur-3xl opacity-25 transition-colors duration-700"
          style={{ background: accent }}
        />
        {/* Faint mowing stripes, like a cricket outfield */}
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-[0.035]"
          style={{ backgroundImage: "repeating-linear-gradient(100deg, #fff 0 34px, transparent 34px 68px)" }}
        />

        <div key={playerName} className="relative p-4 sm:p-7 animate-card-in">
          <div className="flex items-center justify-between gap-3 mb-4 sm:mb-6">
            <StatusBadge live={isLive} sold={isSold} unsold={isUnsold} />
            <p className="text-[11px] uppercase tracking-[0.2em] text-white/50">
              Base <span className="font-display text-lg tracking-normal text-white/85 ml-1">{formatINR(basePrice)}</span>
            </p>
          </div>

          <div className="flex items-center gap-3 sm:gap-6">
            <PlayerAvatar
              name={playerName}
              photo={playerPhoto}
              size="hero"
              tone={isLive ? "live" : isSold ? "sold" : isUnsold ? "unsold" : "none"}
            />
            <div className="flex-1 min-w-0">
              <p className="text-[10px] sm:text-[11px] uppercase tracking-[0.25em] sm:tracking-[0.3em] font-semibold mb-1 sm:mb-1.5" style={{ color: accent }}>
                {isLive ? "Now bidding" : isSold ? "Hammer down" : isUnsold ? "No takers" : "Up next"}
              </p>
              <h2
                className="font-display font-extrabold uppercase leading-[0.92] tracking-wide text-3xl sm:text-5xl text-white [overflow-wrap:anywhere]"
                style={{ textWrap: "balance" } as React.CSSProperties}
              >
                {playerName}
              </h2>
            </div>
            {isLive && <AuctionTimer seconds={timer} total={timerTotal} />}
            {(isSold || isUnsold) && (
              <div key={status} className="shrink-0 sm:pr-2">
                <ResultStamp result={isSold ? "sold" : "unsold"} />
              </div>
            )}
          </div>

          <div className="relative mt-4 sm:mt-7 rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-4 sm:px-5 sm:py-5">
            {/* Light sweep on every accepted bid */}
            <div aria-hidden="true" className="absolute inset-0 overflow-hidden rounded-2xl">
              <span
                key={pulseKey}
                className="absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-white/[0.12] to-transparent animate-sheen"
              />
            </div>

            <div className="relative flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 sm:gap-4">
              <div>
                <p className="text-[11px] uppercase tracking-[0.25em] text-white/50 mb-2 sm:mb-2.5">
                  {isSold ? "Sold for" : hasBid ? "Current bid" : "Opening bid"}
                </p>
                <BidAmount amount={displayBid} resetKey={playerName} pulseKey={pulseKey} />
              </div>

              <div className="flex sm:justify-end">
                {hasBid ? (
                  <div
                    key={currentBidderName}
                    className="inline-flex items-center gap-2.5 rounded-full border border-white/10 bg-white/5 pl-2.5 pr-4 py-2 animate-fade-up"
                  >
                    <span
                      aria-hidden="true"
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ background: bidderColor, boxShadow: `0 0 14px ${bidderColor}` }}
                    />
                    <span className="text-[11px] uppercase tracking-wider text-white/50">
                      {isSold ? "Won by" : "Leading"}
                    </span>
                    <span className="font-semibold text-white truncate max-w-[12rem]" title={currentBidderName}>
                      {currentBidderName}
                    </span>
                  </div>
                ) : (
                  isLive && (
                    <p className="inline-flex items-center gap-2 text-sm text-white/50">
                      <GavelIcon className="w-4 h-4 text-amber-400/80" />
                      Waiting for the first bid
                    </p>
                  )
                )}
              </div>
            </div>
          </div>
        </div>

        {isSold && <Confetti key={`${playerName}-confetti`} />}
      </div>
    </article>
  );
}

function StatusBadge({ live, sold, unsold }: { live: boolean; sold: boolean; unsold: boolean }) {
  if (live) {
    return (
      <span className="inline-flex items-center gap-2 rounded-full bg-red-500/15 border border-red-500/30 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-red-300">
        <span className="relative flex w-2 h-2" aria-hidden="true">
          <span className="absolute inset-0 rounded-full bg-red-400 animate-ping" />
          <span className="relative w-2 h-2 rounded-full bg-red-500" />
        </span>
        Live
      </span>
    );
  }
  if (sold) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-emerald-300">
        <CheckIcon className="w-3.5 h-3.5" /> Sold
      </span>
    );
  }
  if (unsold) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-white/5 border border-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-white/60">
        <CrossIcon className="w-3.5 h-3.5" /> Unsold
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full bg-white/5 border border-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-white/60">
      Up next
    </span>
  );
}
