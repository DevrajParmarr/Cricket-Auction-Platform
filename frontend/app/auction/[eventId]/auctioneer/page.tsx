"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import api from "@/lib/api";
import { useAuctionStore } from "@/store/auction";
import { AuctionSocket } from "@/lib/ws";
import AuctionPlayerCard from "@/components/AuctionPlayerCard";
import TeamSummary from "@/components/TeamSummary";
import BottomTabs, { type TabItem } from "@/components/auction/BottomTabs";
import ConfirmDialog from "@/components/auction/ConfirmDialog";
import PlayerListCard from "@/components/auction/PlayerListCard";
import { ToastViewport, useToast } from "@/components/auction/Toast";
import { formatINR } from "@/components/auction/format";
import {
  BoltIcon,
  CheckIcon,
  ChevronLeftIcon,
  EyeIcon,
  FlagIcon,
  GavelIcon,
  ListIcon,
  NextIcon,
  PauseIcon,
  PlayIcon,
  SearchIcon,
  TrophyIcon,
} from "@/components/auction/icons";

type Tab = "live" | "queue" | "sold" | "teams";
type Confirm = "hammer" | "finish" | null;

const LIST_ACTION_BTN =
  "inline-flex h-10 items-center gap-1.5 rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 text-xs font-semibold text-amber-300 transition [touch-action:manipulation] hover:bg-amber-400/20 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 disabled:cursor-not-allowed disabled:opacity-40";
const PRIMARY_BTN =
  "inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-amber-300 to-amber-500 px-5 font-bold text-black shadow-lg shadow-amber-500/25 transition [touch-action:manipulation] hover:brightness-110 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-950 disabled:cursor-not-allowed disabled:opacity-40";
const SECONDARY_BTN =
  "inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 font-semibold text-white transition [touch-action:manipulation] hover:bg-white/10 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 disabled:cursor-not-allowed disabled:opacity-40";
const DANGER_BTN =
  "inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-red-500/40 bg-red-500/10 px-4 font-semibold text-red-200 transition [touch-action:manipulation] hover:bg-red-500/20 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 disabled:cursor-not-allowed disabled:opacity-40";

const STATUS_LABEL: Record<string, string> = { active: "Live", paused: "Paused", completed: "Finished" };

export default function AuctioneerPage() {
  const router = useRouter();
  const { eventId } = useParams<{ eventId: string }>();
  const eid = parseInt(eventId);
  const store = useAuctionStore();
  const [hasAccess, setHasAccess] = useState(false);
  const [checkingAccess, setCheckingAccess] = useState(true);
  const [socket, setSocket] = useState<AuctionSocket | null>(null);
  const [status, setStatus] = useState("draft");
  const [scheduledAt, setScheduledAt] = useState<string | null>(null);
  const [playerNames, setPlayerNames] = useState<Record<number, string>>({});
  const [playerPhotos, setPlayerPhotos] = useState<Record<number, string>>({});
  const [teamRosters, setTeamRosters] = useState<Record<number, { player_id: number; sold_price: number }[]>>({});
  const [viewerCount, setViewerCount] = useState<number>(0);
  const [tab, setTab] = useState<Tab>("live");
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState<Confirm>(null);
  const { toast, show: showToast, dismiss: dismissToast } = useToast();

  const syncState = useCallback(async () => {
    const [{ data }, teamRes, viewerStatsRes] = await Promise.all([
      api.get(`/auction/events/${eid}/state`),
      api.get(`/auction/events/${eid}/teams`).catch(() => ({ data: [] })),
      api.get(`/auction/events/${eid}/viewer-stats`).catch(() => ({ data: null })),
    ]);
    store.setFullState({
      eventId: eid,
      status: data.status,
      timer: data.timer || 0,
      activePlayerId: data.active_player_id,
      teams: data.teams || [],
      players: data.players || [],
    });
    setStatus(data.status);
    setScheduledAt(data.scheduled_at || null);
    if (teamRes.data) {
      const map: Record<number, { player_id: number; sold_price: number }[]> = {};
      teamRes.data.forEach((t: { id: number; players: { player_id: number; sold_price: number }[] }) => {
        map[t.id] = t.players || [];
      });
      setTeamRosters(map);
    }
    // Set initial viewer count from API (especially important for completed events)
    if (viewerStatsRes.data) {
      const count = data.status === "completed"
        ? viewerStatsRes.data.total_unique_viewers
        : viewerStatsRes.data.live_viewers;
      setViewerCount(count || 0);
    }
  }, [eid]);

  useEffect(() => {
    const checkAccess = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          router.replace("/auth/login");
          return;
        }

        const [meRes, eventRes] = await Promise.all([
          api.get("/auth/me"),
          api.get(`/auction/events/${eid}`),
        ]);
        const me = meRes.data as { id: number; roles: string[] };
        const event = eventRes.data as { auctioneer_id: number | null };

        const isAuctioneerRole = (me.roles || []).includes("auctioneer");
        const isAssignedAuctioneer = event.auctioneer_id === me.id;

        if (!isAuctioneerRole || !isAssignedAuctioneer) {
          router.replace(`/auction/${eid}/spectate`);
          return;
        }

        setHasAccess(true);
      } catch {
        router.replace("/dashboard");
      } finally {
        setCheckingAccess(false);
      }
    };

    checkAccess();
  }, [eid, router]);

  useEffect(() => {
    if (!hasAccess) return;
    syncState();
  }, [eid, hasAccess, syncState]);

  // Only connect WebSocket for non-completed events
  useEffect(() => {
    if (!hasAccess) return;
    // Don't connect WebSocket for completed events
    if (status === "completed") return;

    const token = localStorage.getItem("token") || "";
    const ws = new AuctionSocket(eid, token);
    ws.connect();

    ws.on("*", (msg) => {
      if (msg.type === "timer_tick") store.setTimer(msg.remaining as number);
      if (msg.type === "new_bid")
        store.updateBid(msg.auction_player_id as number, msg.amount as number, msg.captain_id as number);
      if (msg.type === "player_sold")
        store.markPlayerSold(msg.auction_player_id as number, msg.sold_to_captain_id as number, msg.sold_price as number);
      if (msg.type === "player_unsold")
        store.markPlayerUnsold(msg.auction_player_id as number);
      if (msg.type === "player_up") {
        store.setActivePlayer(msg.auction_player_id as number, msg.base_price as number);
        setTab("live");
      }
      if (msg.type === "auction_paused") setStatus("paused");
      if (msg.type === "auction_resumed") setStatus("active");
      if (msg.type === "auction_completed") setStatus("completed");
      if (msg.type === "viewer_count") setViewerCount(msg.count as number);
    });

    setSocket(ws);
    return () => ws.disconnect();
  }, [eid, hasAccess, status]);

  // Fetch player names for display (only players in this event)
  useEffect(() => {
    const fetchNames = async () => {
      const { data } = await api.get(`/auction/events/${eid}/players-info`).catch(() => ({ data: [] }));
      const nameMap: Record<number, string> = {};
      const photoMap: Record<number, string> = {};
      data.forEach((row: { player_id: number; name: string; profile_photo?: string }) => {
        nameMap[row.player_id] = row.name;
        if (row.profile_photo) {
          photoMap[row.player_id] = row.profile_photo;
        }
      });
      setPlayerNames(nameMap);
      setPlayerPhotos(photoMap);
    };
    fetchNames();
  }, [eid]);

  const activeAP = store.players.find((p) => p.id === store.activePlayerId);
  const displayActiveAP = activeAP?.status === "active" ? activeAP : null;
  const isTimerRunning = status === "active" && !!displayActiveAP && store.timer > 0;
  const captainIds = new Set(
    store.teams
      .map((t) => t.captain_id)
      .filter((id): id is number => id !== null)
  );
  const pendingPlayers = store.players.filter(
    (p) => p.status === "pending" && !captainIds.has(p.player_id)
  );
  const soldPlayers = store.players.filter((p) => p.status === "sold");
  const unsoldPlayers = store.players.filter((p) => p.status === "unsold");
  const q = search.trim().toLowerCase();
  const matches = (playerId: number) => !q || (playerNames[playerId] || "").toLowerCase().includes(q);
  const visiblePending = pendingPlayers.filter((p) => matches(p.player_id));
  const visibleUnsold = unsoldPlayers.filter((p) => matches(p.player_id));

  const scheduledDate = scheduledAt ? new Date(scheduledAt) : null;
  const canStart =
    status !== "active" &&
    (!scheduledDate || scheduledDate <= new Date());

  const nameOf = (playerId: number) => playerNames[playerId] || `Player #${playerId}`;

  const getTeamName = (captainId: number) => {
    const team = store.teams.find((t) => t.captain_id === captainId);
    return team ? team.name : playerNames[captainId] || `Captain #${captainId}`;
  };

  const getTeamColor = (captainId: number) => store.teams.find((t) => t.captain_id === captainId)?.color;

  // Serialises control actions so double taps can't fire the same request twice
  const run = async (action: () => Promise<unknown>, success?: string) => {
    if (busy) return;
    setBusy(true);
    try {
      await action();
      if (success) showToast(success, "success");
    } catch (e: unknown) {
      const detail = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      showToast(detail || "Something went wrong. Please try again.", "error");
    } finally {
      setBusy(false);
    }
  };

  const startAuction = () =>
    run(() => api.post(`/auction/events/${eid}/start`).then(syncState), status === "paused" ? "Auction resumed" : "Auction started");
  const pauseAuction = () => run(() => api.post(`/auction/events/${eid}/pause`).then(syncState), "Auction paused");
  const nextPlayer = (auctionPlayerId?: number) =>
    run(() => api.post(`/auction/events/${eid}/next-player`, { player_id: auctionPlayerId || null }));

  const doHammer = () =>
    run(async () => {
      try {
        await api.post(`/auction/events/${eid}/hammer`);
      } finally {
        await syncState();
      }
    });

  const requestHammer = () => {
    if (!displayActiveAP) return;
    // Closing early is irreversible, so spell out the outcome first
    if (store.timer > 0) setConfirm("hammer");
    else doHammer();
  };

  const requestFinish = () => {
    if (pendingPlayers.length > 0) {
      showToast("Auction every pending player before finishing.", "warning");
      return;
    }
    setConfirm("finish");
  };

  const doFinish = () =>
    run(async () => {
      await api.post(`/auction/events/${eid}/finish`);
      await syncState();
    }, "Auction finished");

  if (checkingAccess) {
    return (
      <div className="min-h-dvh bg-gray-950 flex items-center justify-center gap-3 text-white/60">
        <span aria-hidden="true" className="h-5 w-5 animate-spin rounded-full border-2 border-amber-400 border-t-transparent" />
        Checking access…
      </div>
    );
  }

  if (!hasAccess) return null;

  const liveHasBid = !!displayActiveAP?.current_bidder_id;
  const liveAmount = displayActiveAP ? displayActiveAP.current_bid || displayActiveAP.base_price : 0;

  // One obvious next step, plus Pause/Finish as secondary actions
  const controls = (layout: "bar" | "header") => {
    if (status === "completed") return null;
    const wide = layout === "bar" ? "flex-1" : "";
    const secondaryLabel = (text: string) => <span className={layout === "bar" ? "sr-only sm:not-sr-only" : ""}>{text}</span>;

    if (status !== "active") {
      return (
        <>
          {status === "paused" && (
            <button
              className={DANGER_BTN}
              onClick={requestFinish}
              disabled={busy || pendingPlayers.length > 0}
              title={pendingPlayers.length > 0 ? "Auction every pending player before finishing" : undefined}
              aria-label="Finish auction"
            >
              <FlagIcon className="w-5 h-5" /> {secondaryLabel("Finish")}
            </button>
          )}
          <button className={`${PRIMARY_BTN} ${wide}`} onClick={startAuction} disabled={busy || !canStart}>
            <PlayIcon className="w-5 h-5" /> {status === "paused" ? "Resume auction" : "Start auction"}
          </button>
        </>
      );
    }

    return (
      <>
        <button className={SECONDARY_BTN} onClick={pauseAuction} disabled={busy} aria-label="Pause auction">
          <PauseIcon className="w-5 h-5" /> {secondaryLabel("Pause")}
        </button>
        {displayActiveAP ? (
          <button className={`${PRIMARY_BTN} ${wide}`} onClick={requestHammer} disabled={busy}>
            <GavelIcon className="w-5 h-5" />
            {liveHasBid ? (
              <>
                Sell · <span className="font-display text-xl tabular-nums">{formatINR(liveAmount)}</span>
              </>
            ) : (
              "Close · no bids"
            )}
          </button>
        ) : pendingPlayers.length > 0 ? (
          <button className={`${PRIMARY_BTN} ${wide}`} onClick={() => nextPlayer()} disabled={busy}>
            <NextIcon className="w-5 h-5" /> Next player
          </button>
        ) : (
          <button className={`${DANGER_BTN} ${wide}`} onClick={requestFinish} disabled={busy}>
            <FlagIcon className="w-5 h-5" /> Finish auction
          </button>
        )}
      </>
    );
  };

  const tabs: TabItem<Tab>[] = [
    { id: "live", label: "Live", icon: <BoltIcon className="w-5 h-5" /> },
    { id: "queue", label: "Queue", icon: <ListIcon className="w-5 h-5" />, badge: pendingPlayers.length },
    { id: "sold", label: "Sold", icon: <CheckIcon className="w-5 h-5" /> },
    { id: "teams", label: "Teams", icon: <TrophyIcon className="w-5 h-5" /> },
  ];

  const hasControls = status !== "completed";

  return (
    <div className="min-h-dvh bg-gray-950">
      <ToastViewport toast={toast} onDismiss={dismissToast} />

      <header className="sticky top-0 z-30 border-b border-white/10 bg-gray-950/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-3 sm:px-6 py-3">
          <button
            onClick={() => router.push("/dashboard")}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white/60 transition hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
            aria-label="Back to dashboard"
          >
            <ChevronLeftIcon className="w-5 h-5" />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="truncate font-display text-xl sm:text-2xl font-bold uppercase tracking-wide">Auctioneer</h1>
            <p className="flex items-center gap-2 text-xs text-white/55">
              <StatusDot status={status} />
              <span>{STATUS_LABEL[status] ?? "Not started"}</span>
              <span aria-hidden="true">·</span>
              <EyeIcon className="w-3.5 h-3.5" />
              <span>
                <span className="tabular-nums">{viewerCount}</span> {status === "completed" ? "watched" : "watching"}
              </span>
              {scheduledDate && status !== "completed" && status !== "active" && (
                <span className="hidden sm:inline">
                  · {scheduledDate.toLocaleString("en-IN", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                </span>
              )}
            </p>
          </div>
          {hasControls && <div className="hidden lg:flex items-center gap-2">{controls("header")}</div>}
        </div>
        {!canStart && status !== "active" && status !== "completed" && scheduledDate && (
          <p className="border-t border-white/5 px-4 py-1.5 text-center text-[11px] text-white/50">
            Start unlocks at {scheduledDate.toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
          </p>
        )}
      </header>

      <div
        className={`mx-auto grid max-w-7xl grid-cols-1 gap-6 p-3 sm:p-6 lg:grid-cols-3 lg:pb-6 ${
          hasControls ? "pb-[calc(10rem+env(safe-area-inset-bottom))]" : "pb-[calc(5rem+env(safe-area-inset-bottom))]"
        }`}
      >
        <div className="space-y-6 lg:col-span-2">
          {/* Live */}
          <section className={`${tab === "live" ? "" : "hidden"} lg:block`} aria-label="Live auction">
            {displayActiveAP ? (
              <AuctionPlayerCard
                playerName={nameOf(displayActiveAP.player_id)}
                playerPhoto={playerPhotos[displayActiveAP.player_id]}
                basePrice={displayActiveAP.base_price}
                currentBid={displayActiveAP.current_bid}
                currentBidderName={displayActiveAP.current_bidder_id ? getTeamName(displayActiveAP.current_bidder_id) : undefined}
                currentBidderColor={displayActiveAP.current_bidder_id ? getTeamColor(displayActiveAP.current_bidder_id) : undefined}
                timer={store.timer}
                status={displayActiveAP.status}
              />
            ) : (
              <div className="rounded-3xl border border-dashed border-white/10 bg-white/[0.02] px-6 py-14 text-center">
                <span className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full border border-white/10 bg-white/5 text-amber-300">
                  {status === "completed" ? <TrophyIcon className="w-8 h-8" /> : <GavelIcon className="w-8 h-8" />}
                </span>
                <h2 className="font-display text-3xl font-bold uppercase tracking-wide text-white">
                  {status === "completed"
                    ? "Auction finished"
                    : status === "active"
                    ? pendingPlayers.length > 0
                      ? "Ready for the next player"
                      : "Everyone has been auctioned"
                    : status === "paused"
                    ? "Auction paused"
                    : "Auction not started"}
                </h2>
                <p className="mx-auto mt-2 max-w-sm text-sm text-white/55">
                  {status === "completed"
                    ? `${soldPlayers.length} sold · ${unsoldPlayers.length} unsold`
                    : status === "active"
                    ? pendingPlayers.length > 0
                      ? "Tap Next player for a random pick, or choose someone from the queue."
                      : unsoldPlayers.length > 0
                      ? "Re-auction unsold players from the queue, or finish the auction."
                      : "Finish the auction to publish the results."
                    : status === "paused"
                    ? "Resume when everyone is back."
                    : `${pendingPlayers.length} players are waiting. Start when you're ready.`}
                </p>
                {status === "active" && (pendingPlayers.length > 0 || unsoldPlayers.length > 0) && (
                  <button type="button" onClick={() => setTab("queue")} className={`${SECONDARY_BTN} mt-5 lg:hidden`}>
                    <ListIcon className="w-5 h-5" /> Open queue
                  </button>
                )}
              </div>
            )}
          </section>

          {/* Teams */}
          <section className={`${tab === "teams" ? "" : "hidden"} lg:block`} aria-labelledby="teams-heading">
            <SectionHeading id="teams-heading" title="Teams" />
            <TeamSummary teams={store.teams} teamRosters={teamRosters} playerNames={playerNames} playerPhotos={playerPhotos} />
          </section>
        </div>

        <div className="space-y-6">
          {/* Queue: who can go next */}
          <section className={`${tab === "queue" ? "" : "hidden"} lg:block`} aria-labelledby="queue-heading">
            <SectionHeading id="queue-heading" title="Queue" meta={`${pendingPlayers.length} pending`} />
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
            {displayActiveAP && status === "active" && (
              <p className="mb-3 rounded-xl border border-amber-400/20 bg-amber-400/5 px-3 py-2 text-xs text-amber-200/80">
                Sell or close {nameOf(displayActiveAP.player_id)} before picking the next player.
              </p>
            )}
            <div className="space-y-2 lg:max-h-[26rem] lg:overflow-y-auto lg:pr-1 custom-scrollbar">
              {visiblePending.length === 0 ? (
                <EmptyNote>{q ? "No pending players match your search." : "No pending players."}</EmptyNote>
              ) : (
                visiblePending.map((p, i) => (
                  <PlayerListCard
                    key={p.id}
                    index={i}
                    name={nameOf(p.player_id)}
                    photo={playerPhotos[p.player_id]}
                    status="pending"
                    showStatus={false}
                    subtitle={`Base ${formatINR(p.base_price)}`}
                    action={
                      status !== "completed" && (
                        <button
                          className={LIST_ACTION_BTN}
                          onClick={() => nextPlayer(p.id)}
                          disabled={busy || status !== "active" || !!displayActiveAP}
                          aria-label={`Put ${nameOf(p.player_id)} up for auction`}
                        >
                          <GavelIcon className="w-3.5 h-3.5" />
                          Pick
                        </button>
                      )
                    }
                  />
                ))
              )}
            </div>

            {unsoldPlayers.length > 0 && (
              <>
                <h3 className="mb-2 mt-5 px-1 text-xs font-semibold uppercase tracking-wider text-white/50">
                  Unsold · {unsoldPlayers.length}
                </h3>
                <div className="space-y-2 lg:max-h-72 lg:overflow-y-auto lg:pr-1 custom-scrollbar">
                  {visibleUnsold.length === 0 ? (
                    <EmptyNote>No unsold players match your search.</EmptyNote>
                  ) : (
                    visibleUnsold.map((p, i) => {
                      const hasAnyBid = p.current_bid > p.base_price;
                      const canReauction = status !== "completed" && pendingPlayers.length === 0;
                      return (
                        <PlayerListCard
                          key={p.id}
                          index={i}
                          name={nameOf(p.player_id)}
                          photo={playerPhotos[p.player_id]}
                          status="unsold"
                          showStatus={!canReauction}
                          subtitle={hasAnyBid ? `Last bid ${formatINR(p.current_bid)}` : `Base ${formatINR(p.base_price)} · no bids`}
                          action={
                            canReauction && (
                              <button
                                className={LIST_ACTION_BTN}
                                onClick={() => nextPlayer(p.id)}
                                disabled={busy || status !== "active" || isTimerRunning}
                                title={isTimerRunning ? "Wait for current timer to finish before re-auctioning" : ""}
                              >
                                Re-auction
                              </button>
                            )
                          }
                        />
                      );
                    })
                  )}
                </div>
                {pendingPlayers.length > 0 && (
                  <p className="mt-2 px-1 text-[11px] text-white/40">Unsold players can be re-auctioned once the queue is empty.</p>
                )}
              </>
            )}
          </section>

          {/* Sold */}
          <section className={`${tab === "sold" ? "" : "hidden"} lg:block`} aria-labelledby="sold-heading">
            <SectionHeading id="sold-heading" title="Sold" meta={`${soldPlayers.length}`} />
            <div className="space-y-2 lg:max-h-80 lg:overflow-y-auto lg:pr-1 custom-scrollbar">
              {soldPlayers.length === 0 ? (
                <EmptyNote>No sold players yet.</EmptyNote>
              ) : (
                soldPlayers.map((p, i) => {
                  const team = p.current_bidder_id ? getTeamName(p.current_bidder_id) : "Unknown Team";
                  // Captains are recorded as sold to their own team for 0
                  const isCaptain = captainIds.has(p.player_id);
                  return (
                    <PlayerListCard
                      key={p.id}
                      index={i}
                      name={nameOf(p.player_id)}
                      photo={playerPhotos[p.player_id]}
                      status="sold"
                      price={isCaptain ? undefined : p.current_bid}
                      showStatus={!isCaptain}
                      subtitle={isCaptain ? `Captain · ${team}` : `Sold to ${team}`}
                    />
                  );
                })
              )}
            </div>
          </section>
        </div>
      </div>

      {/* Phone action bar, above the tabs */}
      {hasControls && (
        <div className="lg:hidden fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-30 border-t border-white/10 bg-gray-950/90 px-3 py-2.5 backdrop-blur-xl">
          <div className="flex items-center gap-2">{controls("bar")}</div>
        </div>
      )}

      <BottomTabs tabs={tabs} active={tab} onChange={setTab} />

      <ConfirmDialog
        open={confirm === "hammer" && !!displayActiveAP}
        title={liveHasBid ? "Sell now?" : "Close with no bids?"}
        message={
          displayActiveAP &&
          (liveHasBid ? (
            <>
              Sell <strong className="text-white">{nameOf(displayActiveAP.player_id)}</strong> to{" "}
              <strong className="text-white">{getTeamName(displayActiveAP.current_bidder_id as number)}</strong> for{" "}
              <strong className="text-amber-300">{formatINR(liveAmount)}</strong>? The timer still has {store.timer}s left.
            </>
          ) : (
            <>
              <strong className="text-white">{nameOf(displayActiveAP.player_id)}</strong> has no bids yet and will be marked unsold.
              You can re-auction them later.
            </>
          ))
        }
        confirmLabel={liveHasBid ? "Sell now" : "Mark unsold"}
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          setConfirm(null);
          doHammer();
        }}
      />
      <ConfirmDialog
        open={confirm === "finish"}
        title="Finish auction?"
        tone="danger"
        message={
          <>
            This publishes the final results. {unsoldPlayers.length > 0 && `${unsoldPlayers.length} unsold player${unsoldPlayers.length === 1 ? "" : "s"} will stay unsold. `}
            No further changes can be made.
          </>
        }
        confirmLabel="Finish auction"
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          setConfirm(null);
          doFinish();
        }}
      />
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

function EmptyNote({ children }: { children: React.ReactNode }) {
  return <p className="rounded-xl border border-dashed border-white/10 px-4 py-6 text-center text-sm text-white/45">{children}</p>;
}
