"use client";

import { useEffect, useState } from "react";
import { formatINR } from "./format";
import { CheckIcon, MinusIcon, PlusIcon, WalletIcon } from "./icons";

interface Props {
  /** Active auction-player id; a new player resets the chosen amount */
  resetKey: number | string;
  /** Lowest valid bid right now (base price for the opening bid, else current + step) */
  minAmount: number;
  /** Highest valid bid right now (increment cap and remaining budget applied, snapped to step) */
  maxAmount: number;
  step: number;
  budgetLeft: number;
  slotsLeft: number;
  isLeading: boolean;
  leadingAmount?: number;
  /** Why the captain can't bid at all right now, if anything */
  blockedReason?: string;
  busy: boolean;
  onBid: (amount: number) => void;
}

/**
 * Captain bid controls. Amounts can only move in valid steps inside [min, max],
 * so the common case is a single tap on the big button.
 */
export default function BidPanel({
  resetKey,
  minAmount,
  maxAmount,
  step,
  budgetLeft,
  slotsLeft,
  isLeading,
  leadingAmount,
  blockedReason,
  busy,
  onBid,
}: Props) {
  const [amount, setAmount] = useState(minAmount);
  const hasRange = maxAmount >= minAmount;

  useEffect(() => {
    setAmount(minAmount);
  }, [resetKey, minAmount]);

  useEffect(() => {
    setAmount((a) => (a > maxAmount ? Math.max(minAmount, maxAmount) : a));
  }, [maxAmount, minAmount]);

  const chips = Array.from(new Set([minAmount, minAmount + step, minAmount + step * 4])).filter((v) => v <= maxAmount);
  const canBid = hasRange && !isLeading && !blockedReason && !busy;

  return (
    <section
      aria-label="Place a bid"
      className="rounded-2xl border border-white/10 bg-gray-900/95 p-4 sm:p-5 shadow-2xl shadow-black/60 backdrop-blur-xl"
    >
      {isLeading ? (
        <div className="flex items-center gap-3 rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-4">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-400/20 text-emerald-300">
            <CheckIcon className="w-5 h-5" />
          </span>
          <div>
            <p className="font-semibold text-emerald-200">
              You&apos;re leading{leadingAmount ? ` at ${formatINR(leadingAmount)}` : ""}
            </p>
            <p className="text-sm text-emerald-200/70">Wait for another team to bid before raising.</p>
          </div>
        </div>
      ) : blockedReason || !hasRange ? (
        <div className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-4 text-center text-sm text-white/70">
          {blockedReason || "No valid bid fits your remaining budget."}
        </div>
      ) : (
        <>
          <div className="flex items-center gap-3">
            <StepButton label={`Lower bid by ${formatINR(step)}`} onClick={() => setAmount((a) => Math.max(minAmount, a - step))} disabled={busy || amount <= minAmount}>
              <MinusIcon className="w-5 h-5" />
            </StepButton>
            <div className="flex-1 text-center">
              <p className="text-[10px] uppercase tracking-[0.25em] text-white/45">Your bid</p>
              <output aria-live="polite" className="block font-display text-4xl font-bold tabular-nums leading-tight text-white">
                {formatINR(amount)}
              </output>
            </div>
            <StepButton label={`Raise bid by ${formatINR(step)}`} onClick={() => setAmount((a) => Math.min(maxAmount, a + step))} disabled={busy || amount >= maxAmount}>
              <PlusIcon className="w-5 h-5" />
            </StepButton>
          </div>

          {chips.length > 1 && (
            <div className="mt-3 grid gap-2" style={{ gridTemplateColumns: `repeat(${chips.length}, minmax(0, 1fr))` }}>
              {chips.map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setAmount(v)}
                  disabled={busy}
                  aria-pressed={amount === v}
                  className={`h-11 rounded-xl border text-sm font-semibold tabular-nums transition [touch-action:manipulation] active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${
                    amount === v
                      ? "border-amber-400/60 bg-amber-400/15 text-amber-200"
                      : "border-white/10 bg-white/[0.04] text-white/75 hover:bg-white/[0.08]"
                  }`}
                >
                  {formatINR(v)}
                </button>
              ))}
            </div>
          )}

          <button
            type="button"
            onClick={() => onBid(amount)}
            disabled={!canBid}
            className="mt-3 flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-amber-300 to-amber-500 text-lg font-bold text-black shadow-lg shadow-amber-500/25 transition [touch-action:manipulation] hover:brightness-110 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? (
              <>
                <span aria-hidden="true" className="h-5 w-5 animate-spin rounded-full border-2 border-black/30 border-t-black" />
                Placing bid…
              </>
            ) : (
              <>
                Bid <span className="font-display text-2xl tabular-nums">{formatINR(amount)}</span>
              </>
            )}
          </button>
        </>
      )}

      <dl className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-white/55">
        <div className="flex items-center gap-1.5">
          <WalletIcon className="w-3.5 h-3.5" />
          <dt className="sr-only">Budget left</dt>
          <dd>
            <span className="font-semibold text-white/80 tabular-nums">{formatINR(budgetLeft)}</span> left
          </dd>
        </div>
        <div>
          <dt className="sr-only">Squad slots left</dt>
          <dd>
            <span className="font-semibold text-white/80 tabular-nums">{slotsLeft}</span> slot{slotsLeft === 1 ? "" : "s"} left
          </dd>
        </div>
        {hasRange && !isLeading && !blockedReason && (
          <div>
            <dt className="sr-only">Highest allowed bid</dt>
            <dd>
              Max <span className="font-semibold text-white/80 tabular-nums">{formatINR(maxAmount)}</span>
            </dd>
          </div>
        )}
      </dl>
    </section>
  );
}

function StepButton({ label, onClick, disabled, children }: { label: string; onClick: () => void; disabled: boolean; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-white/15 bg-white/5 text-white transition [touch-action:manipulation] hover:bg-white/10 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 disabled:opacity-30"
    >
      {children}
    </button>
  );
}
