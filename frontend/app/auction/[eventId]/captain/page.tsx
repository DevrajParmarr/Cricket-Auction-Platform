"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import api from "@/lib/api";
import { useAuctionStore } from "@/store/auction";
import { useAuthStore } from "@/store/auth";
import { AuctionSocket } from "@/lib/ws";
import AuctionPlayerCard from "@/components/AuctionPlayerCard";
import TeamSummary from "@/components/TeamSummary";
import BidPanel from "@/components/auction/BidPanel";
import BottomTabs, { type TabItem } from "@/components/auction/BottomTabs";
import PlayerListCard from "@/components/auction/PlayerListCard";
import { ToastViewport, useToast } from "@/components/auction/Toast";
import { formatINR } from "@/components/auction/format";
import {
  BoltIcon,
  ChevronLeftIcon,
  EyeIcon,
  ListIcon,
  SearchIcon,
  StarIcon,
  TrophyIcon,
  UsersIcon,
} from "@/components/auction/icons";

interface TeamDetail {
  id: number;
  name: string;
  budget: number;
  spent: number;
  max_players: number;
  players: { id: number; player_id: number; sold_price: number }[];
}

interface EventMeta {
  name: string;
  scheduled_at: string | null;
  status: string;
  logo: string | null;
}

interface CompletedSummary {
  highest_bid_player: { player_name: string; sold_price: number; team_name: string } | null;
  strongest_team: {
    team_name: string;
    overall_rating: number;
    batting_avg: number;
    bowling_avg: number;
    fielding_avg: number;
    player_count: number;
  } | null;
  teams: {
    team_id: number;
    team_name: string;
    spent: number;
    remaining: number;
    player_count: number;
    players: { player_id: number; name: string; sold_price: number; rating_score: number }[];
  }[];
  unsold_players: { player_id: number; name: string; base_price: number; last_bid: number }[];
  stats: { total_players: number; sold_count: number; unsold_count: number };
}

type Tab = "live" | "team" | "players" | "teams";

const getMinBidStep = (currentBid: number) => {
  if (currentBid >= 100000) return 10000;
  if (currentBid >= 10000) return 1000;
  if (currentBid >= 1000) return 100;
  return 50;
};

const BID_DEBOUNCE_MS = 2000;

const STATUS_LABEL: Record<string, string> = { active: "Live", paused: "Paused", completed: "Finished" };

export default function CaptainPage() {
  const router = useRouter();
  const { eventId } = useParams<{ eventId: string }>();
  const eid = parseInt(eventId);
  const store = useAuctionStore();
  const authUser = useAuthStore((s) => s.user);
  const [hasAccess, setHasAccess] = useState(false);
  const [checkingAccess, setCheckingAccess] = useState(true);
  // The auth store is only filled on login/dashboard, so a refresh here would lose it; use /auth/me instead
  const [myId, setMyId] = useState<number | null>(null);
  const myIdRef = useRef<number | null>(null);
  const [myTeam, setMyTeam] = useState<TeamDetail | null>(null);
  const [playerNames, setPlayerNames] = useState<Record<number, string>>({});
  const [playerPhotos, setPlayerPhotos] = useState<Record<number, string>>({});
  const [isLoadingPlayers, setIsLoadingPlayers] = useState(true);
  const [bidding, setBidding] = useState(false);
  const [lastBidTime, setLastBidTime] = useState(0);
  const [eventMeta, setEventMeta] = useState<EventMeta | null>(null);
  const [completedSummary, setCompletedSummary] = useState<CompletedSummary | null>(null);
  const [teamRosters, setTeamRosters] = useState<Record<number, { player_id: number; sold_price: number }[]>>({});
  const [bookmarked, setBookmarked] = useState<number[]>([]);
  const [playerFilter, setPlayerFilter] = useState<"all" | "pending" | "unsold">("pending");
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<Tab>("live");
  const [socket, setSocket] = useState<AuctionSocket | null>(null);
  const [viewerCount, setViewerCount] = useState<number>(0);
  const { toast, show: showToast, dismiss: dismissToast } = useToast();

  const userId = myId ?? authUser?.id ?? null;
  const BOOKMARK_KEY = `captain_bookmarks_${eid}`;

  // Load bookmarks from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(BOOKMARK_KEY);
      if (stored) setBookmarked(JSON.parse(stored));
    } catch {}
  }, [BOOKMARK_KEY]);

  const toggleBookmark = (id: number) => {
    setBookmarked((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      try { localStorage.setItem(BOOKMARK_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  };

  useEffect(() => {
    const checkAccess = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          router.replace("/auth/login");
          return;
        }

        const meRes = await api.get("/auth/me");
        const me = meRes.data as { id: number; roles: string[] };
        const isCaptainRole = (me.roles || []).includes("captain");
        if (!isCaptainRole) {
          router.replace(`/auction/${eid}/spectate`);
          return;
        }
        setMyId(me.id);
        myIdRef.current = me.id;

        // Must be assigned as captain in this event.
        await api.get(`/auction/events/${eid}/my-team`);
        setHasAccess(true);
      } catch {
        router.replace(`/auction/${eid}/spectate`);
      } finally {
        setCheckingAccess(false);
      }
    };

    checkAccess();
  }, [eid, router]);

  const syncState = useCallback(async () => {
    const [stateRes, teamRes, eventRes, teamsRes, viewerStatsRes] = await Promise.all([
      api.get(`/auction/events/${eid}/state`),
      api.get(`/auction/events/${eid}/my-team`).catch(() => ({ data: null })),
      api.get(`/auction/events/${eid}`).catch(() => ({ data: null })),
      api.get(`/auction/events/${eid}/teams`).catch(() => ({ data: [] })),
      api.get(`/auction/events/${eid}/viewer-stats`).catch(() => ({ data: null })),
    ]);
    store.setFullState({
      eventId: eid,
      status: stateRes.data.status,
      timer: stateRes.data.timer || 0,
      activePlayerId: stateRes.data.active_player_id,
      teams: stateRes.data.teams || [],
      players: stateRes.data.players || [],
    });
    setMyTeam(teamRes.data);
    if (eventRes.data) {
      setEventMeta({
        name: eventRes.data.name,
        scheduled_at: eventRes.data.scheduled_at ?? null,
        status: eventRes.data.status,
        logo: eventRes.data.logo ?? null,
      });
    }
    if (teamsRes.data) {
      const map: Record<number, { player_id: number; sold_price: number }[]> = {};
      teamsRes.data.forEach((t: { id: number; players: { player_id: number; sold_price: number }[] }) => {
        map[t.id] = t.players || [];
      });
      setTeamRosters(map);
    }
    // Set initial viewer count from API (especially important for completed events)
    if (viewerStatsRes.data) {
      const count = stateRes.data.status === "completed"
        ? viewerStatsRes.data.total_unique_viewers
        : viewerStatsRes.data.live_viewers;
      setViewerCount(count || 0);
    }
  }, [eid]);

  useEffect(() => {
    if (!hasAccess) return;
    syncState();

    // Fetch player names regardless of event status
    api.get(`/auction/events/${eid}/players-info`).then(({ data }) => {
      const nameMap: Record<number, string> = {};
      const photoMap: Record<number, string> = {};
      data.forEach((row: { player_id: number; name: string; profile_photo?: string }) => {
        nameMap[row.player_id] = row.name;
        if (row.profile_photo) photoMap[row.player_id] = row.profile_photo;
      });
      setPlayerNames(nameMap);
      setPlayerPhotos(photoMap);
      setIsLoadingPlayers(false);
    }).catch(() => {
      setIsLoadingPlayers(false);
    });
  }, [eid, hasAccess, syncState]);

  // Only connect WebSocket for non-completed events
  useEffect(() => {
    if (!hasAccess) return;
    // Don't connect WebSocket for completed events
    if (store.status === "completed") return;

    const token = localStorage.getItem("token") || "";
    const ws = new AuctionSocket(eid, token);
    ws.connect();

    ws.on("*", (msg) => {
      if (msg.type === "timer_tick") store.setTimer(msg.remaining as number);
      if (msg.type === "new_bid") {
        const me = myIdRef.current;
        const prevBidder = useAuctionStore
          .getState()
          .players.find((p) => p.id === (msg.auction_player_id as number))?.current_bidder_id;
        store.updateBid(msg.auction_player_id as number, msg.amount as number, msg.captain_id as number);
        if (me && prevBidder === me && msg.captain_id !== me) {
          const rival = useAuctionStore.getState().teams.find((t) => t.captain_id === msg.captain_id)?.name ?? "Another team";
          showToast(`Outbid! ${rival} bid ${formatINR(msg.amount as number)}`, "warning");
          navigator.vibrate?.([80, 40, 80]);
        }
      }
      if (msg.type === "player_sold") {
        store.markPlayerSold(msg.auction_player_id as number, msg.sold_to_captain_id as number, msg.sold_price as number);
        syncState();
      }
      if (msg.type === "player_unsold") {
        store.markPlayerUnsold(msg.auction_player_id as number);
      }
      if (msg.type === "player_up") {
        store.setActivePlayer(msg.auction_player_id as number, msg.base_price as number);
        // Bring captains back to the bidding view when a new player comes up
        setTab("live");
      }
      if (msg.type === "auction_resumed") store.setFullState({ status: "active" });
      if (msg.type === "auction_paused") store.setFullState({ status: "paused" });
      if (msg.type === "auction_completed") store.setFullState({ status: "completed" });
      if (msg.type === "viewer_count") setViewerCount(msg.count as number);
    });

    setSocket(ws);
    return () => ws.disconnect();
  }, [eid, hasAccess, store.status, syncState, showToast]);

  useEffect(() => {
    if (!hasAccess || store.status !== "completed") {
      setCompletedSummary(null);
      return;
    }
    api.get(`/auction/events/${eid}/summary`)
      .then(({ data }) => setCompletedSummary(data as CompletedSummary))
      .catch(() => setCompletedSummary(null));
  }, [eid, hasAccess, store.status]);

  const activeAP = store.players.find((p) => p.id === store.activePlayerId);
  const remaining = myTeam ? myTeam.budget - myTeam.spent : 0;
  const slotsLeft = myTeam ? myTeam.max_players - myTeam.players.length : 0;
  const myColor = store.teams.find((t) => t.captain_id === userId)?.color || "#f59e0b";
  const captainIds = new Set(
    store.teams
      .map((t) => t.captain_id)
      .filter((id): id is number => id !== null)
  );
  const pendingPlayers = store.players.filter(
    (p) => p.status === "pending" && p.player_id !== userId && !captainIds.has(p.player_id)
  );
  const unsoldPlayers = store.players.filter(
    (p) => p.status === "unsold" && p.player_id !== userId && !captainIds.has(p.player_id)
  );

  // Pending + unsold, filtered by tab and search, shortlisted floated to top
  const filteredPlayers = (() => {
    let base: typeof store.players = [];
    if (playerFilter === "all") base = [...pendingPlayers, ...unsoldPlayers];
    else if (playerFilter === "pending") base = pendingPlayers;
    else base = unsoldPlayers;
    const q = search.trim().toLowerCase();
    if (q) base = base.filter((p) => (playerNames[p.player_id] || "").toLowerCase().includes(q));
    const starred = base.filter((p) => bookmarked.includes(p.id));
    const rest = base.filter((p) => !bookmarked.includes(p.id));
    return [...starred, ...rest];
  })();

  const getTeamName = (captainId: number) => {
    const team = store.teams.find((t) => t.captain_id === captainId);
    return team ? team.name : playerNames[captainId] || `Captain #${captainId}`;
  };

  // Bid limits mirror backend place_bid: step tiers, opening bid at base, max raise = min(50% of bid, 5% of budget)
  const isMyBid = !!activeAP && activeAP.current_bidder_id === userId;
  const effectiveBid = activeAP ? (activeAP.current_bid || activeAP.base_price) : 0;
  const minBidStep = getMinBidStep(effectiveBid);
  const isFirstBid = !activeAP?.current_bidder_id;
  const minAmount = isFirstBid ? effectiveBid : effectiveBid + minBidStep;
  const fiftyPercentIncrement = Math.floor(effectiveBid / 2);
  const fivePercentOfBudget = myTeam ? Math.floor(myTeam.budget * 0.05) : fiftyPercentIncrement;
  const maxIncrement = Math.min(fiftyPercentIncrement, fivePercentOfBudget);
  const maxByRule = effectiveBid + Math.floor(maxIncrement / minBidStep) * minBidStep;
  const maxByBudget = remaining >= effectiveBid ? effectiveBid + Math.floor((remaining - effectiveBid) / minBidStep) * minBidStep : -1;
  const maxAmount = Math.min(maxByRule, maxByBudget);
  const isResultState = activeAP?.status === "sold" || activeAP?.status === "unsold";
  const iWonPlayer = !!activeAP && activeAP.status === "sold" && activeAP.current_bidder_id === userId;

  const blockedReason =
    store.status === "paused"
      ? "Auction is paused. Bidding resumes when the auctioneer restarts."
      : store.status !== "active"
      ? "Bidding hasn't started yet."
      : !myTeam
      ? "Loading your team…"
      : slotsLeft <= 0
      ? "Your squad is full."
      : activeAP && activeAP.player_id === userId
      ? "You can't bid on yourself."
      : maxAmount < minAmount
      ? `Not enough budget. You have ${formatINR(remaining)} left.`
      : undefined;

  const placeBid = async (amount: number) => {
    const now = Date.now();
    if (now - lastBidTime < BID_DEBOUNCE_MS) {
      showToast("Hold on, one bid every 2 seconds.", "info");
      return;
    }
    setLastBidTime(now);
    setBidding(true);
    try {
      await api.post(`/auction/events/${eid}/bid`, { amount });
      showToast(`Bid placed: ${formatINR(amount)}`, "success");
      navigator.vibrate?.(30);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      showToast(msg || "Bid failed. Please try again.", "error");
    } finally {
      setBidding(false);
    }
  };

  if (checkingAccess) {
    return (
      <div className="min-h-dvh bg-gray-950 flex items-center justify-center gap-3 text-white/60">
        <span aria-hidden="true" className="h-5 w-5 animate-spin rounded-full border-2 border-amber-400 border-t-transparent" />
        Checking access…
      </div>
    );
  }
  if (!hasAccess) return null;

  const tabs: TabItem<Tab>[] = [
    { id: "live", label: "Live", icon: <BoltIcon className="w-5 h-5" /> },
    { id: "team", label: "My team", icon: <UsersIcon className="w-5 h-5" /> },
    { id: "players", label: "Players", icon: <ListIcon className="w-5 h-5" /> },
    { id: "teams", label: "Teams", icon: <TrophyIcon className="w-5 h-5" /> },
  ];
  const budgetLeftPct = myTeam && myTeam.budget > 0 ? Math.max(0, (remaining / myTeam.budget) * 100) : 0;

  return (
    <div className="min-h-dvh lg:h-dvh bg-gray-950 flex flex-col">
      <ToastViewport toast={toast} onDismiss={dismissToast} />

      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-white/10 bg-gray-950/85 backdrop-blur-xl">
        <div className="flex items-center gap-3 px-3 sm:px-6 py-3">
          <button
            onClick={() => router.push("/dashboard")}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white/60 transition hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
            aria-label="Back to dashboard"
          >
            <ChevronLeftIcon className="w-5 h-5" />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="truncate font-display text-xl sm:text-2xl font-bold uppercase tracking-wide">
              {myTeam ? myTeam.name : "Captain"}
            </h1>
            <p className="flex items-center gap-2 text-xs text-white/55">
              <StatusDot status={store.status} />
              {STATUS_LABEL[store.status] ?? "Not started"}
              <span aria-hidden="true">·</span>
              <EyeIcon className="w-3.5 h-3.5" />
              <span className="tabular-nums">{viewerCount}</span>
              <span className="sr-only">{store.status === "completed" ? "watched" : "watching"}</span>
              {eventMeta?.scheduled_at && store.status !== "completed" && store.status !== "active" && (
                <span className="hidden sm:inline">
                  · {new Date(eventMeta.scheduled_at).toLocaleString("en-IN", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                </span>
              )}
            </p>
          </div>
          {myTeam && (
            <div className="flex items-center gap-4 sm:gap-6 text-right">
              <div className="hidden sm:block">
                <p className="font-display text-2xl font-bold tabular-nums leading-none">
                  {myTeam.players.length}<span className="text-white/40">/{myTeam.max_players}</span>
                </p>
                <p className="mt-1 text-[10px] uppercase tracking-wider text-white/45">Squad</p>
              </div>
              <div>
                <p className="font-display text-2xl sm:text-3xl font-bold tabular-nums leading-none text-amber-300">{formatINR(remaining)}</p>
                <p className="mt-1 text-[10px] uppercase tracking-wider text-white/45">Budget left</p>
              </div>
            </div>
          )}
        </div>
        {myTeam && (
          <div className="h-0.5 w-full bg-white/5" aria-hidden="true">
            <div className="h-full transition-[width] duration-700" style={{ width: `${budgetLeftPct}%`, background: myColor }} />
          </div>
        )}
      </header>

      <div className="flex-1 flex flex-col lg:flex-row lg:overflow-hidden">
        {/* Live bidding */}
        <main
          className={`${tab === "live" ? "block" : "hidden"} lg:block flex-1 lg:overflow-y-auto p-3 sm:p-6 pb-[calc(5rem+env(safe-area-inset-bottom))] lg:pb-6`}
        >
          {activeAP ? (
            <div className="mx-auto max-w-2xl space-y-3 sm:space-y-4">
              <AuctionPlayerCard
                playerName={playerNames[activeAP.player_id] || `Player #${activeAP.player_id}`}
                playerPhoto={playerPhotos[activeAP.player_id]}
                basePrice={activeAP.base_price}
                currentBid={activeAP.current_bid}
                currentBidderName={activeAP.current_bidder_id ? getTeamName(activeAP.current_bidder_id) : undefined}
                currentBidderColor={
                  activeAP.current_bidder_id
                    ? store.teams.find((t) => t.captain_id === activeAP.current_bidder_id)?.color
                    : undefined
                }
                timer={store.timer}
                status={activeAP.status}
              />
              {!isResultState ? (
                <div className="sticky bottom-[calc(4.5rem+env(safe-area-inset-bottom))] lg:bottom-4 z-20">
                  <BidPanel
                    resetKey={activeAP.id}
                    minAmount={minAmount}
                    maxAmount={maxAmount}
                    step={minBidStep}
                    budgetLeft={remaining}
                    slotsLeft={slotsLeft}
                    isLeading={isMyBid}
                    leadingAmount={isMyBid ? activeAP.current_bid : undefined}
                    blockedReason={blockedReason}
                    busy={bidding}
                    onBid={placeBid}
                  />
                </div>
              ) : (
                <div
                  className={`rounded-2xl border p-5 text-center animate-fade-up ${
                    iWonPlayer
                      ? "border-emerald-400/40 bg-emerald-500/10"
                      : activeAP.status === "sold"
                      ? "border-white/10 bg-white/[0.04]"
                      : "border-red-500/30 bg-red-500/10"
                  }`}
                >
                  <p className={`font-display text-2xl font-bold uppercase tracking-wide ${iWonPlayer ? "text-emerald-300" : "text-white"}`}>
                    {iWonPlayer ? "You got the player!" : activeAP.status === "sold" ? "Player sold" : "Player unsold"}
                  </p>
                  <p className="mt-1 text-sm text-white/70">
                    {activeAP.status === "sold"
                      ? `Sold to ${getTeamName(activeAP.current_bidder_id as number)} for ${formatINR(activeAP.current_bid)}`
                      : `${playerNames[activeAP.player_id] || `Player #${activeAP.player_id}`} goes back to the pool.`}
                  </p>
                  <p className="mt-3 text-xs uppercase tracking-[0.2em] text-white/40">Waiting for the next player…</p>
                </div>
              )}
            </div>
          ) : (
            <div className="mx-auto flex max-w-lg flex-col items-center justify-center text-center">
              {store.status === "completed" ? (
                <div className="w-full max-w-3xl text-left">
                  <div className="text-center mb-6">
                    {eventMeta?.logo ? (
                      <div className="w-24 h-24 mx-auto mb-4 rounded-2xl overflow-hidden bg-gray-800 border border-gray-700 shadow-lg">
                        <img src={eventMeta.logo} alt="" className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <TrophyIcon className="mx-auto mb-4 h-16 w-16 text-amber-400" />
                    )}
                    <h2 className="font-display text-4xl font-bold uppercase tracking-wide text-white">Auction completed</h2>
                    <p className="text-white/55 mt-2">Final summary for captains</p>
                  </div>
                  {completedSummary ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-3 gap-3">
                        <SummaryStat label="Total" value={completedSummary.stats.total_players} />
                        <SummaryStat label="Sold" value={completedSummary.stats.sold_count} tone="text-emerald-300" />
                        <SummaryStat label="Unsold" value={completedSummary.stats.unsold_count} tone="text-red-300" />
                      </div>

                      {completedSummary.highest_bid_player && (
                        <div className="rounded-2xl border border-amber-400/30 bg-white/[0.03] p-4">
                          <p className="text-xs uppercase tracking-wider text-white/50 mb-1">Highest bid</p>
                          <p className="text-lg font-bold text-white">{completedSummary.highest_bid_player.player_name}</p>
                          <p className="text-sm text-amber-300">
                            {formatINR(completedSummary.highest_bid_player.sold_price)} · {completedSummary.highest_bid_player.team_name}
                          </p>
                        </div>
                      )}

                      {completedSummary.strongest_team && (
                        <div className="rounded-2xl border border-blue-400/30 bg-white/[0.03] p-4">
                          <p className="text-xs uppercase tracking-wider text-white/50 mb-1">Most powerful team (ratings)</p>
                          <p className="text-lg font-bold text-white">{completedSummary.strongest_team.team_name}</p>
                          <p className="text-sm text-blue-300">Overall avg: {completedSummary.strongest_team.overall_rating}</p>
                          <p className="text-xs text-white/55 mt-1">
                            Bat {completedSummary.strongest_team.batting_avg} · Bowl {completedSummary.strongest_team.bowling_avg} · Field {completedSummary.strongest_team.fielding_avg}
                          </p>
                        </div>
                      )}

                      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                        <p className="text-xs uppercase tracking-wider text-white/50 mb-2">Unsold players</p>
                        <div className="space-y-1.5 max-h-48 overflow-y-auto custom-scrollbar pr-1">
                          {completedSummary.unsold_players.length === 0 ? (
                            <p className="text-sm text-white/45">No unsold players</p>
                          ) : (
                            completedSummary.unsold_players.map((p) => (
                              <div key={p.player_id} className="flex items-center justify-between rounded-lg bg-white/[0.04] px-3 py-2 text-sm">
                                <span className="truncate text-white/80">{p.name}</span>
                                <span className="text-red-300 tabular-nums">Base {formatINR(p.base_price)}</span>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-white/50 text-center">Loading summary…</p>
                  )}
                </div>
              ) : (
                <div className="py-10 sm:py-16">
                  <div className="relative mx-auto mb-6 flex h-20 w-20 items-center justify-center">
                    {store.status === "active" && <span aria-hidden="true" className="absolute inset-0 rounded-full bg-amber-400/20 animate-ping" />}
                    <span className="relative flex h-20 w-20 items-center justify-center rounded-full border border-white/10 bg-white/5 text-amber-300">
                      <BoltIcon className="w-9 h-9" />
                    </span>
                  </div>
                  <h2 className="font-display text-3xl font-bold uppercase tracking-wide text-white">
                    {store.status === "active"
                      ? "Next player coming up"
                      : store.status === "paused"
                      ? "Auction is paused"
                      : "Auction not started yet"}
                  </h2>
                  <p className="mt-2 text-sm text-white/55">
                    {store.status === "active"
                      ? "Stay here. Bidding opens as soon as the auctioneer brings up a player."
                      : "Meanwhile, shortlist the players you want in the Players tab."}
                  </p>
                  {store.status !== "active" && (
                    <button
                      type="button"
                      onClick={() => setTab("players")}
                      className="lg:hidden mt-5 inline-flex h-11 items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 text-sm font-semibold text-white hover:bg-white/10"
                    >
                      <StarIcon className="w-4 h-4" /> Build your shortlist
                    </button>
                  )}
                </div>
              )}
              {store.status !== "completed" && store.status !== "active" && eventMeta?.scheduled_at && (
                <div className="w-full rounded-2xl border border-white/10 bg-white/[0.03] p-6">
                  <p className="text-xs text-white/50 uppercase tracking-widest font-semibold mb-2">Event schedule</p>
                  <p className="text-lg font-medium text-amber-300">
                    {new Date(eventMeta.scheduled_at).toLocaleString("en-IN", {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </p>
                  <p className="font-display text-4xl font-bold text-white mt-1">
                    {new Date(eventMeta.scheduled_at).toLocaleString("en-IN", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              )}
            </div>
          )}
        </main>

        {/* Side panel: separate tabs on phones, one scrolling column from lg */}
        <aside
          className={`${tab === "live" ? "hidden" : "flex"} lg:flex w-full lg:w-[400px] shrink-0 flex-col gap-8 lg:border-l border-white/10 lg:bg-gray-900/40 lg:overflow-y-auto p-3 sm:p-6 lg:p-5 pb-[calc(5rem+env(safe-area-inset-bottom))] lg:pb-5`}
        >
          {/* My team */}
          <section className={`${tab === "team" ? "" : "hidden"} lg:block`} aria-labelledby="my-team-heading">
            <SectionHeading id="my-team-heading" title="My squad" meta={myTeam ? `${myTeam.players.length}/${myTeam.max_players}` : undefined} />
            {myTeam && (
              <div className="mb-3 grid grid-cols-2 gap-2">
                <MiniStat label="Spent" value={formatINR(myTeam.spent)} />
                <MiniStat label="Left" value={formatINR(remaining)} tone="text-amber-300" />
              </div>
            )}
            {myTeam && myTeam.players.length > 0 ? (
              <div className="space-y-2">
                {myTeam.players.map((tp, i) => (
                  <PlayerListCard
                    key={tp.id}
                    index={i}
                    name={playerNames[tp.player_id] || `Player #${tp.player_id}`}
                    photo={playerPhotos[tp.player_id]}
                    status="sold"
                    price={tp.sold_price}
                    subtitle={tp.sold_price === 0 ? "Captain" : undefined}
                  />
                ))}
              </div>
            ) : (
              <EmptyNote>No players yet. Win a bid to add one.</EmptyNote>
            )}
          </section>

          {/* Players to bid on */}
          <section className={`${tab === "players" ? "" : "hidden"} lg:block`} aria-labelledby="players-heading">
            <SectionHeading id="players-heading" title="Players" meta={`${pendingPlayers.length} left`} />
            <label className="relative mb-3 block">
              <span className="sr-only">Search players</span>
              <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name"
                className="h-11 w-full rounded-xl border border-white/10 bg-white/[0.04] pl-9 pr-3 text-base sm:text-sm text-white placeholder-white/35 focus:border-amber-400/60 focus:outline-none focus:ring-2 focus:ring-amber-400/20"
              />
            </label>
            <div role="group" aria-label="Filter players" className="mb-3 grid grid-cols-3 gap-1 rounded-xl bg-white/[0.04] p-1">
              {([
                ["pending", "Remaining", pendingPlayers.length],
                ["unsold", "Unsold", unsoldPlayers.length],
                ["all", "All", pendingPlayers.length + unsoldPlayers.length],
              ] as [typeof playerFilter, string, number][]).map(([val, label, count]) => (
                <button
                  key={val}
                  type="button"
                  aria-pressed={playerFilter === val}
                  className={`h-9 rounded-lg text-xs font-semibold transition-colors ${
                    playerFilter === val ? "bg-white/10 text-white" : "text-white/50 hover:text-white/80"
                  }`}
                  onClick={() => setPlayerFilter(val)}
                >
                  {label} <span className="tabular-nums text-white/40">{count}</span>
                </button>
              ))}
            </div>
            <p className="mb-2 flex items-center gap-1.5 px-1 text-[11px] text-white/45">
              <StarIcon className="w-3.5 h-3.5 text-amber-400" filled /> Star players to shortlist them. Shortlisted players stay on top.
            </p>

            <div className="space-y-2">
              {isLoadingPlayers ? (
                <div className="flex items-center justify-center gap-3 py-10 text-sm text-white/50">
                  <span aria-hidden="true" className="h-5 w-5 animate-spin rounded-full border-2 border-amber-400 border-t-transparent" />
                  Loading players…
                </div>
              ) : filteredPlayers.length === 0 ? (
                <EmptyNote>{search ? "No players match your search." : "No players in this category."}</EmptyNote>
              ) : (
                filteredPlayers.map((p, i) => {
                  const isBookmarked = bookmarked.includes(p.id);
                  const name = playerNames[p.player_id] || `Player #${p.player_id}`;
                  return (
                    <PlayerListCard
                      key={p.id}
                      index={i}
                      name={name}
                      photo={playerPhotos[p.player_id]}
                      status={p.status}
                      showStatus={p.status === "unsold"}
                      subtitle={isBookmarked ? "Shortlisted" : `Base ${formatINR(p.base_price)}`}
                      action={
                        <button
                          type="button"
                          aria-pressed={isBookmarked}
                          aria-label={isBookmarked ? `Remove ${name} from shortlist` : `Shortlist ${name}`}
                          onClick={() => toggleBookmark(p.id)}
                          className="flex h-10 w-10 items-center justify-center rounded-lg transition hover:bg-white/10 active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
                        >
                          <StarIcon filled={isBookmarked} className={`w-5 h-5 ${isBookmarked ? "text-amber-400" : "text-white/35"}`} />
                        </button>
                      }
                    />
                  );
                })
              )}
            </div>
          </section>

          {/* All teams */}
          <section className={`${tab === "teams" ? "" : "hidden"} lg:block`} aria-labelledby="teams-heading">
            <SectionHeading id="teams-heading" title="Teams" />
            <TeamSummary
              teams={store.teams}
              highlightCaptainId={userId}
              teamRosters={teamRosters}
              playerNames={playerNames}
              playerPhotos={playerPhotos}
              singleColumn
            />
          </section>
        </aside>
      </div>

      <BottomTabs tabs={tabs} active={tab} onChange={setTab} />
    </div>
  );
}

function StatusDot({ status }: { status: string }) {
  const color = status === "active" ? "bg-emerald-400" : status === "paused" ? "bg-amber-400" : status === "completed" ? "bg-blue-400" : "bg-white/30";
  return (
    <span className="relative flex h-2 w-2" aria-hidden="true">
      {status === "active" && <span className="absolute inset-0 rounded-full bg-emerald-400 animate-ping" />}
      <span className={`relative h-2 w-2 rounded-full ${color}`} />
    </span>
  );
}

function SectionHeading({ id, title, meta }: { id: string; title: string; meta?: string }) {
  return (
    <div className="mb-3 flex items-baseline justify-between px-1">
      <h2 id={id} className="font-display text-xl font-bold uppercase tracking-wide text-white">{title}</h2>
      {meta && <span className="text-xs font-semibold text-white/45 tabular-nums">{meta}</span>}
    </div>
  );
}

function MiniStat({ label, value, tone = "text-white" }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5">
      <p className="text-[10px] uppercase tracking-wider text-white/45">{label}</p>
      <p className={`font-display text-xl font-bold tabular-nums ${tone}`}>{value}</p>
    </div>
  );
}

function SummaryStat({ label, value, tone = "text-white" }: { label: string; value: number; tone?: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-center">
      <p className="text-xs uppercase tracking-wider text-white/50">{label}</p>
      <p className={`font-display text-3xl font-bold tabular-nums ${tone}`}>{value}</p>
    </div>
  );
}

function EmptyNote({ children }: { children: React.ReactNode }) {
  return <p className="rounded-xl border border-dashed border-white/10 px-4 py-6 text-center text-sm text-white/45">{children}</p>;
}
