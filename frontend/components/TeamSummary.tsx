"use client";

import { TeamState } from "@/store/auction";
import PlayerAvatar from "@/components/auction/PlayerAvatar";
import { formatINR } from "@/components/auction/format";
import { ChevronDownIcon } from "@/components/auction/icons";

interface Props {
  teams: TeamState[];
  highlightCaptainId?: number | null;
  teamRosters?: Record<number, { player_id: number; sold_price: number }[]>;
  playerNames?: Record<number, string>;
  playerPhotos?: Record<number, string>;
  /** Force one column, for narrow side panels */
  singleColumn?: boolean;
}

export default function TeamSummary({ teams, highlightCaptainId, teamRosters = {}, playerNames = {}, playerPhotos = {}, singleColumn = false }: Props) {
  if (teams.length === 0) {
    return <p className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-6 text-center text-sm text-white/50">No teams yet.</p>;
  }

  return (
    <div className={`grid grid-cols-1 gap-3 ${singleColumn ? "" : "sm:grid-cols-2"}`}>
      {teams.map((team, i) => {
        const remaining = team.budget - team.spent;
        const leftPct = team.budget > 0 ? Math.max(0, (remaining / team.budget) * 100) : 0;
        const isMine = team.captain_id != null && team.captain_id === highlightCaptainId;
        const color = team.color || "#3B82F6";
        const roster = teamRosters[team.id] || [];
        const low = remaining < team.budget * 0.2;

        return (
          <details
            key={team.id}
            className={`group overflow-hidden rounded-2xl border bg-white/[0.03] animate-fade-up ${
              isMine ? "border-amber-400/50 shadow-[0_0_30px_-12px_rgba(251,191,36,0.5)]" : "border-white/10"
            }`}
            style={{ animationDelay: `${i * 40}ms` }}
          >
            <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3 min-h-[64px] [&::-webkit-details-marker]:hidden focus-visible:outline-none focus-visible:bg-white/5">
              <span aria-hidden="true" className="h-9 w-1.5 shrink-0 rounded-full" style={{ background: color, boxShadow: `0 0 12px ${color}` }} />
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 truncate font-display text-lg font-bold uppercase tracking-wide text-white">
                  {team.name}
                  {isMine && <span className="rounded bg-amber-400/15 px-1.5 py-0.5 font-sans text-[10px] font-bold tracking-wider text-amber-300">YOU</span>}
                </p>
                <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                  <div className="h-full rounded-full transition-[width] duration-700" style={{ width: `${leftPct}%`, background: color }} />
                </div>
              </div>
              <div className="shrink-0 text-right">
                <p className={`font-display text-lg font-bold tabular-nums leading-none ${low ? "text-red-300" : "text-emerald-300"}`}>
                  {formatINR(remaining)}
                </p>
                <p className="mt-1 text-[11px] text-white/50 tabular-nums">
                  {team.player_count}/{team.max_players} players
                </p>
              </div>
              <ChevronDownIcon className="w-4 h-4 shrink-0 text-white/40 transition-transform duration-200 group-open:rotate-180" />
            </summary>

            <div className="border-t border-white/10 px-3 py-3">
              <p className="mb-2 px-1 text-[11px] text-white/45">
                Spent <span className="font-semibold text-white/70 tabular-nums">{formatINR(team.spent)}</span> of {formatINR(team.budget)}
              </p>
              {roster.length === 0 ? (
                <p className="px-1 text-xs italic text-white/40">No players yet</p>
              ) : (
                <ul className="space-y-1.5">
                  {roster.map((rp, idx) => {
                    const name = playerNames[rp.player_id] || `Player #${rp.player_id}`;
                    return (
                      <li key={`${team.id}-${rp.player_id}-${idx}`} className="flex items-center gap-2.5 rounded-lg bg-white/[0.04] px-2 py-1.5">
                        <PlayerAvatar name={name} photo={playerPhotos[rp.player_id]} size="xs" />
                        <span className="flex-1 truncate text-sm text-white/85">{name}</span>
                        <span className="font-display font-semibold tabular-nums text-amber-300">
                          {rp.sold_price === 0 ? "Captain" : formatINR(rp.sold_price)}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </details>
        );
      })}
    </div>
  );
}
