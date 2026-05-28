"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import WebGLBackground from "./WebGLBackground";
import { logoutAction } from "@/app/auth-actions";
import MatchModal from "./admin/MatchModal";
import PlayerModal from "./admin/PlayerModal";
import AddAdminModal from "./admin/AddAdminModal";
import LiveMatchCard from "./LiveMatchCard";
import type { MatchData, PlayerData, StatsData, OncePlayer, TournamentData, LiveMatchData } from "../page";

// ── Types ─────────────────────────────────────────────────
type Tab = "posiciones" | "partidos" | "plantel";

// ── Helpers ───────────────────────────────────────────────
function calcAge(iso: string): number {
  const birth = new Date(iso);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

function formatDate(iso: string, opts?: Intl.DateTimeFormatOptions): string {
  return new Date(iso).toLocaleDateString("es-AR", opts ?? {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
}

function formatBirthdate(iso: string): string {
  return new Date(iso).toLocaleDateString("es-AR", {
    day: "numeric", month: "long", year: "numeric",
  });
}

// Computa StatsData desde un subset de matches (uso client-side)
function computeStatsFromMatches(matches: MatchData[]): StatsData {
  const finished = matches.filter((m) => m.status === "FINISHED");
  const pending  = matches.filter((m) => m.status === "PENDING");
  const live     = matches.filter((m) => m.status === "IN_PROGRESS");

  const v  = finished.filter((m) => m.result === "WIN").length;
  const e  = finished.filter((m) => m.result === "DRAW").length;
  const d  = finished.filter((m) => m.result === "LOSS").length;
  const gf = finished.reduce((s, m) => s + (m.homeScore ?? 0), 0);
  const gc = finished.reduce((s, m) => s + (m.awayScore ?? 0), 0);

  const ptsGanados    = v * 3 + e;
  const ptsPendientes = pending.length * 3;

  return {
    pj: finished.length,
    v, e, d, gf, gc,
    ptsGanados,
    ptsPendientes,
    ptsIdeales: ptsGanados + ptsPendientes,
    pendingCount: pending.length,
    inProgressCount: live.length,
  };
}

// ── Design tokens ─────────────────────────────────────────
const POSITION_STYLE: Record<string, { badge: string; accent: string; glow: string }> = {
  Portera:       { badge: "bg-amber-500/10 border-amber-500/20 text-amber-300",     accent: "text-amber-300",    glow: "shadow-amber-500/20"   },
  Defensora:     { badge: "bg-blue-500/10  border-blue-500/20  text-blue-300",      accent: "text-blue-300",     glow: "shadow-blue-500/20"    },
  Mediocampista: { badge: "bg-emerald-500/10 border-emerald-500/20 text-emerald-300", accent: "text-emerald-300", glow: "shadow-emerald-500/20" },
  Delantera:     { badge: "bg-rose-500/10  border-rose-500/20  text-rose-300",      accent: "text-rose-300",     glow: "shadow-rose-500/20"    },
};

const POSITION_ICON: Record<string, string> = {
  Portera: "🧤", Defensora: "🛡️", Mediocampista: "⚙️", Delantera: "⚡",
};

// ── Icon helpers ─────────────────────────────────────────
function PlusIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
      <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
    </svg>
  );
}

function PencilIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3">
      <path d="M13.488 2.513a1.75 1.75 0 0 0-2.475 0L6.75 6.774a2.75 2.75 0 0 0-.596.892l-.848 2.047a.75.75 0 0 0 .98.98l2.047-.848a2.75 2.75 0 0 0 .892-.596l4.261-4.263a1.75 1.75 0 0 0 0-2.474Z" />
      <path d="M4.75 3.5c-.69 0-1.25.56-1.25 1.25v6.5c0 .69.56 1.25 1.25 1.25h6.5c.69 0 1.25-.56 1.25-1.25V9a.75.75 0 0 1 1.5 0v2.25A2.75 2.75 0 0 1 11.25 14h-6.5A2.75 2.75 0 0 1 2 11.25v-6.5A2.75 2.75 0 0 1 4.75 2H7a.75.75 0 0 1 0 1.5H4.75Z" />
    </svg>
  );
}

// ── Main component ────────────────────────────────────────
export default function AppShell({
  matches, players, stats, tournaments, adminEmail, liveMatch,
}: {
  matches: MatchData[];
  players: PlayerData[];
  stats: StatsData;
  tournaments: TournamentData[];
  adminEmail: string | null;
  liveMatch: LiveMatchData | null;
}) {
  const isAdmin = adminEmail !== null;

  const [tab, setTab] = useState<Tab>("posiciones");
  const [selectedTournamentId, setSelectedTournamentId] = useState<string | null>(null);

  // ── Modal state ──────────────────────────────────────────
  const [matchModalOpen, setMatchModalOpen] = useState(false);
  const [editingMatch, setEditingMatch] = useState<MatchData | undefined>(undefined);
  const [matchInitialTab, setMatchInitialTab] = useState<"partido" | "once">("partido");
  const [playerModalOpen, setPlayerModalOpen] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<PlayerData | undefined>(undefined);

  function openNewMatch() {
    setEditingMatch(undefined);
    setMatchInitialTab("partido");
    setMatchModalOpen(true);
  }
  function openEditMatch(match: MatchData) {
    setEditingMatch(match);
    setMatchInitialTab("partido");
    setMatchModalOpen(true);
  }
  function openCompleteOnce(match: MatchData) {
    setEditingMatch(match);
    setMatchInitialTab("once");
    setMatchModalOpen(true);
  }
  function openNewPlayer() {
    setEditingPlayer(undefined);
    setPlayerModalOpen(true);
  }
  function openEditPlayer(player: PlayerData) {
    setEditingPlayer(player);
    setPlayerModalOpen(true);
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: "posiciones", label: "Posiciones" },
    { id: "partidos",   label: "Partidos"   },
    { id: "plantel",    label: "Plantel"    },
  ];

  // Matches filtrados por torneo seleccionado
  const filteredMatches = selectedTournamentId
    ? matches.filter((m) => m.tournamentId === selectedTournamentId)
    : matches;

  // Stats sobre el subset filtrado (rápido cliente-side)
  const filteredStats = selectedTournamentId
    ? computeStatsFromMatches(filteredMatches)
    : stats;

  // Próximo partido en el subset filtrado
  const nextMatch =
    filteredMatches
      .filter((m) => m.status === "PENDING")
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0] ?? null;

  // Hay partido en vivo en el subset?
  const hasLive = filteredMatches.some((m) => m.status === "IN_PROGRESS");
  const hasLiveGlobal = matches.some((m) => m.status === "IN_PROGRESS");

  return (
    <div className="flex flex-col min-h-screen bg-[#020617] text-white relative">
      {/* WebGL dot-matrix background */}
      <WebGLBackground />

      {/* ── Header ──────────────────────────────────────── */}
      <header className="sticky top-0 z-20 border-b border-white/[0.06] bg-[#020617]/80 backdrop-blur-xl">
        <div className="max-w-xl mx-auto px-4 pt-4 pb-3">

          {/* Brand row */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3 min-w-0">
              <Image
                src="/img/logo.svg"
                alt="Selección Argentina Femenina"
                width={32}
                height={38}
                className="shrink-0 drop-shadow-lg"
              />
              <div className="min-w-0">
                <h1 className="text-sm font-semibold text-white leading-none tracking-tight">
                  NacionApp
                </h1>
                <p className="text-[10px] text-slate-500 font-medium tracking-wider uppercase mt-0.5">
                  Equipo Nacional - Femenino - 🔴🔵
                </p>
              </div>
            </div>

            {/* Right: live badge + admin indicator */}
            <div className="flex items-center gap-2 shrink-0">
              {hasLiveGlobal && (
                <div className="inline-flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-semibold px-3 py-1.5 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  En vivo
                </div>
              )}
              <AdminBar adminEmail={adminEmail} />
            </div>
          </div>

          {/* Tab pills */}
          <div className="flex p-1 gap-0.5 bg-white/[0.04] rounded-full border border-white/[0.06]">
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex-1 text-xs font-semibold py-2 rounded-full transition-all duration-150 ${
                  tab === t.id
                    ? "bg-white text-[#050B14] shadow-sm"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* ── Content ─────────────────────────────────────── */}
      <main className="relative z-10 flex-1 max-w-xl mx-auto w-full px-4 py-6">

        {/* ── Selector de campeonato (Posiciones + Partidos) ── */}
        {tab !== "plantel" && tournaments.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-2 mb-5 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            <button
              onClick={() => setSelectedTournamentId(null)}
              className={`shrink-0 text-xs font-semibold px-3.5 py-1.5 rounded-full border transition-all duration-150 ${
                selectedTournamentId === null
                  ? "bg-white text-[#050B14] border-white"
                  : "border-white/10 text-slate-400 hover:text-white hover:border-white/20"
              }`}
            >
              Todos
            </button>
            {tournaments.map((t) => (
              <button
                key={t.id}
                onClick={() => setSelectedTournamentId(t.id)}
                className={`shrink-0 text-xs font-semibold px-3.5 py-1.5 rounded-full border transition-all duration-150 ${
                  selectedTournamentId === t.id
                    ? "bg-white text-[#050B14] border-white"
                    : "border-white/10 text-slate-400 hover:text-white hover:border-white/20"
                }`}
              >
                {t.name} {t.year}
              </button>
            ))}
          </div>
        )}

        {tab === "posiciones" && (
          <PosicionesTab
            stats={filteredStats}
            nextMatch={nextMatch}
            hasLive={hasLive}
            liveMatch={liveMatch}
            isAdmin={isAdmin}
          />
        )}
        {tab === "partidos" && (
          <PartidosTab
            matches={filteredMatches}
            isAdmin={isAdmin}
            onAddMatch={openNewMatch}
            onEditMatch={openEditMatch}
            onCompleteOnce={openCompleteOnce}
          />
        )}
        {tab === "plantel" && (
          <PlantelTab
            players={players}
            isAdmin={isAdmin}
            onAddPlayer={openNewPlayer}
            onEditPlayer={openEditPlayer}
          />
        )}
      </main>

      {/* ── Footer ──────────────────────────────────────── */}
      <footer className="relative z-10 border-t border-white/[0.06] py-6 text-center">
        <p className="text-xs text-slate-600">
          © {new Date().getFullYear()} NacionApp · Nacional Femenino - 🔴🔵
        </p>
      </footer>

      {/* ── Modales Admin ───────────────────────────────── */}
      {isAdmin && (
        <>
          <MatchModal
            isOpen={matchModalOpen}
            onClose={() => setMatchModalOpen(false)}
            match={editingMatch}
            tournaments={tournaments}
            players={players}
            initialTab={matchInitialTab}
          />
          <PlayerModal
            isOpen={playerModalOpen}
            onClose={() => setPlayerModalOpen(false)}
            player={editingPlayer}
          />
        </>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// CARD — PRÓXIMO PARTIDO
// ════════════════════════════════════════════════════════════
function ProximoPartidoCard({ match }: { match: MatchData }) {
  const date = new Date(match.date);

  const todayMidnight = new Date();
  todayMidnight.setHours(0, 0, 0, 0);
  const matchMidnight = new Date(date);
  matchMidnight.setHours(0, 0, 0, 0);
  const diffDays = Math.round(
    (matchMidnight.getTime() - todayMidnight.getTime()) / 86_400_000
  );

  const countdownLabel =
    diffDays < 0    ? "Fecha pasada" :
    diffDays === 0  ? "¡Hoy!"        :
    diffDays === 1  ? "Mañana"       :
    diffDays < 14   ? `En ${diffDays} días` :
                      `En ${Math.round(diffDays / 7)} semanas`;

  const countdownStyle =
    diffDays === 0  ? "bg-emerald-500/15 border-emerald-500/25 text-emerald-300" :
    diffDays === 1  ? "bg-sky-500/15     border-sky-500/25     text-sky-300"     :
    diffDays < 0    ? "bg-amber-500/10   border-amber-500/20   text-amber-400"   :
                      "bg-white/[0.05]   border-white/10       text-slate-400";

  const weekday  = date.toLocaleDateString("es-AR", { weekday: "long" });
  const dayNum   = date.toLocaleDateString("es-AR", { day: "numeric" });
  const monthStr = date.toLocaleDateString("es-AR", { month: "long" });
  const year     = date.getFullYear();

  return (
    <div className="p-px rounded-2xl bg-gradient-to-br from-sky-500/20 via-blue-600/10 to-transparent">
      <div className="rounded-[15px] bg-gradient-to-br from-[#071828] to-[#080D16] p-5 relative overflow-hidden">

        <div className="pointer-events-none absolute -right-10 -top-10 w-40 h-40 rounded-full bg-sky-500/[0.07] blur-2xl" />

        <div className="flex items-center justify-between mb-4 relative">
          <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-sky-400/50">
            Próximo partido
          </p>
          {(match.tournamentName || match.round != null || match.fixtureRoundNumber != null) && (
            <p className="text-[10px] text-slate-500 text-right">
              {match.tournamentName ?? ""}
              {match.round != null ? ` · R${match.round}` : ""}
              {match.fixtureRoundNumber != null ? ` · Fecha ${match.fixtureRoundNumber}` : ""}
            </p>
          )}
        </div>

        <p
          className="text-4xl font-bold text-white leading-none capitalize relative"
          style={{ letterSpacing: "-0.015em" }}
          suppressHydrationWarning
        >
          {weekday}
        </p>

        <p className="text-sm text-slate-500 mt-1.5 mb-5 capitalize relative" suppressHydrationWarning>
          {dayNum} de {monthStr} · {year}
        </p>

        <div className="border-t border-white/[0.07] mb-4" />

        <div className="flex items-start justify-between gap-3 relative">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600 mb-0.5">vs</p>
            <p className="font-bold text-white text-base leading-snug">{match.opponent}</p>
            {match.venue && (
              <p className="text-xs text-slate-500 mt-2 flex items-center gap-1.5">
                <span className="shrink-0">📍</span>
                <span className="truncate">{match.venue}</span>
              </p>
            )}
          </div>

          <span
            className={`shrink-0 mt-0.5 px-3 py-1.5 rounded-full border text-xs font-bold whitespace-nowrap ${countdownStyle}`}
            suppressHydrationWarning
          >
            {countdownLabel}
          </span>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// TAB 1 — POSICIONES
// ════════════════════════════════════════════════════════════
function PosicionesTab({
  stats,
  nextMatch,
  hasLive,
  liveMatch,
  isAdmin,
}: {
  stats: StatsData;
  nextMatch: MatchData | null;
  hasLive: boolean;
  liveMatch: LiveMatchData | null;
  isAdmin: boolean;
}) {
  const dif = stats.gf - stats.gc;

  return (
    <div className="space-y-3">

      {/* Tarjeta en vivo — prioritaria cuando hay partido en curso */}
      {liveMatch && (
        <LiveMatchCard match={liveMatch} isAdmin={isAdmin} />
      )}

      {nextMatch && !hasLive && <ProximoPartidoCard match={nextMatch} />}

      {/* Hero — puntos ganados */}
      <div className="p-px rounded-2xl bg-gradient-to-br from-blue-500/25 to-white/[0.03]">
        <div className="rounded-[15px] bg-gradient-to-br from-[#0F1E35] to-[#080D16] p-5">
          <p className="text-xs font-semibold text-blue-400/70 uppercase tracking-widest mb-1">
            Puntos ganados
          </p>
          <p className="text-6xl font-semibold leading-none tracking-tight">
            {stats.ptsGanados}
          </p>
          <p className="text-slate-500 text-sm mt-1.5">
            en {stats.pj} partido{stats.pj !== 1 ? "s" : ""} jugado{stats.pj !== 1 ? "s" : ""}
          </p>

          {stats.ptsIdeales > 0 && (
            <div className="mt-4">
              <div className="flex justify-between items-center mb-1.5">
                <p className="text-xs text-slate-600">Progreso hacia el ideal</p>
                <p className="text-xs font-semibold text-blue-400">
                  {Math.round((stats.ptsGanados / stats.ptsIdeales) * 100)}%
                </p>
              </div>
              <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-blue-400 rounded-full transition-all duration-700"
                  style={{ width: `${Math.round((stats.ptsGanados / stats.ptsIdeales) * 100)}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mini stats */}
      <div className="grid grid-cols-3 gap-2">
        <MiniStat label="Ganados"    value={stats.ptsGanados}          sub={`${stats.pj} jugados`}             color="text-blue-400"    />
        <MiniStat label="Pendientes" value={`+${stats.ptsPendientes}`}  sub={`${stats.pendingCount} por jugar`} color="text-amber-400"   />
        <MiniStat label="Ideal"      value={stats.ptsIdeales}           sub="máximo posible"                    color="text-emerald-400" />
      </div>

      {/* Rendimiento */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-600 mb-4">
          Rendimiento
        </p>
        <div className="grid grid-cols-4 gap-3 text-center mb-4">
          {[
            { label: "PJ", value: stats.pj, color: "text-white"       },
            { label: "V",  value: stats.v,  color: "text-emerald-400" },
            { label: "E",  value: stats.e,  color: "text-amber-400"   },
            { label: "D",  value: stats.d,  color: "text-rose-400"    },
          ].map(({ label, value, color }) => (
            <div key={label}>
              <p className={`text-2xl font-semibold ${color}`}>{value}</p>
              <p className="text-xs text-slate-500 font-medium mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-2 text-center border-t border-white/[0.06] pt-3">
          {[
            { label: "Goles a favor",   value: stats.gf, color: "text-white" },
            { label: "Goles en contra", value: stats.gc, color: "text-white" },
            {
              label: "Diferencia",
              value: dif >= 0 ? `+${dif}` : dif,
              color: dif > 0 ? "text-emerald-400" : dif < 0 ? "text-rose-400" : "text-white",
            },
          ].map(({ label, value, color }) => (
            <div key={label}>
              <p className={`text-xl font-semibold ${color}`}>{value}</p>
              <p className="text-xs text-slate-500 leading-tight mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {stats.pj === 0 && stats.pendingCount === 0 && (
        <EmptyState message="No hay partidos registrados todavía." />
      )}
    </div>
  );
}

function MiniStat({
  label, value, sub, color,
}: {
  label: string; value: string | number; sub: string; color: string;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3 text-center">
      <p className={`text-2xl font-semibold ${color}`}>{value}</p>
      <p className="text-xs font-medium text-white mt-0.5">{label}</p>
      <p className="text-[10px] text-slate-500 mt-0.5 leading-tight">{sub}</p>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// TAB 2 — PARTIDOS
// ════════════════════════════════════════════════════════════
const STATUS_PRIORITY: Record<string, number> = {
  IN_PROGRESS: 0,
  PENDING: 1,
  FINISHED: 2,
};

function sortGroup(ms: MatchData[]): MatchData[] {
  return [...ms].sort((a, b) => {
    const sp = (STATUS_PRIORITY[a.status] ?? 1) - (STATUS_PRIORITY[b.status] ?? 1);
    if (sp !== 0) return sp;
    const fn = (a.fixtureRoundNumber ?? 999) - (b.fixtureRoundNumber ?? 999);
    if (fn !== 0) return fn;
    return new Date(a.date).getTime() - new Date(b.date).getTime();
  });
}

function PartidosTab({
  matches,
  isAdmin,
  onAddMatch,
  onEditMatch,
  onCompleteOnce,
}: {
  matches: MatchData[];
  isAdmin: boolean;
  onAddMatch: () => void;
  onEditMatch: (m: MatchData) => void;
  onCompleteOnce: (m: MatchData) => void;
}) {
  if (matches.length === 0 && !isAdmin) {
    return <EmptyState message="No hay partidos en este campeonato todavía." />;
  }

  const usesRounds = matches.some((m) => m.round != null);

  const renderCards = (ms: MatchData[]) =>
    ms.map((m) => (
      <MatchCard
        key={m.id}
        match={m}
        isAdmin={isAdmin}
        onEdit={() => onEditMatch(m)}
        onCompleteOnce={() => onCompleteOnce(m)}
      />
    ));

  return (
    <div className="space-y-5">
      {/* ── Botón mágico: Agregar partido ─── */}
      {isAdmin && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={onAddMatch}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-sky-300 border border-sky-500/20 bg-sky-500/[0.06] hover:bg-sky-500/[0.12] hover:border-sky-500/30 px-3.5 py-2 rounded-full transition-all duration-150"
          >
            <PlusIcon />
            Nuevo partido
          </button>
        </div>
      )}

      {matches.length === 0 && isAdmin && (
        <EmptyState message="No hay partidos todavía. Creá el primero." />
      )}

      {usesRounds ? (
        (() => {
          const roundsMap = new Map<number, MatchData[]>();
          const noRound: MatchData[] = [];
          for (const m of matches) {
            if (m.round != null) {
              if (!roundsMap.has(m.round)) roundsMap.set(m.round, []);
              roundsMap.get(m.round)!.push(m);
            } else {
              noRound.push(m);
            }
          }
          const sortedRounds = Array.from(roundsMap.entries()).sort(([a], [b]) => a - b);

          return (
            <div className="space-y-8">
              {sortedRounds.map(([round, roundMatches]) => (
                <div key={round}>
                  <div className="flex items-center gap-3 mb-3">
                    <p className="text-xs font-bold uppercase tracking-widest text-slate-500">
                      Rueda {round}
                    </p>
                    <div className="flex-1 h-px bg-white/[0.07]" />
                    <p className="text-[10px] text-slate-600">
                      {roundMatches.length} {roundMatches.length === 1 ? "partido" : "partidos"}
                    </p>
                  </div>
                  <div className="space-y-3">{renderCards(sortGroup(roundMatches))}</div>
                </div>
              ))}
              {noRound.length > 0 && (
                <div>
                  <div className="flex items-center gap-3 mb-3">
                    <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Sin rueda</p>
                    <div className="flex-1 h-px bg-white/[0.07]" />
                  </div>
                  <div className="space-y-3">{renderCards(sortGroup(noRound))}</div>
                </div>
              )}
            </div>
          );
        })()
      ) : (
        (() => {
          const live     = matches.filter((m) => m.status === "IN_PROGRESS");
          const pending  = [...matches.filter((m) => m.status === "PENDING")]
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
          const finished = [...matches.filter((m) => m.status === "FINISHED")]
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
          const sorted = [...live, ...pending, ...finished];

          return (
            <div className="space-y-3">
              {pending.length > 0 && live.length === 0 && (
                <p className="text-xs font-semibold text-slate-600 uppercase tracking-widest pb-1">
                  Próximo — {formatDate(pending[0].date, { weekday: "long", day: "numeric", month: "long" })}
                </p>
              )}
              {renderCards(sorted)}
            </div>
          );
        })()
      )}
    </div>
  );
}

function MatchCard({
  match,
  isAdmin,
  onEdit,
  onCompleteOnce,
}: {
  match: MatchData;
  isAdmin: boolean;
  onEdit: () => void;
  onCompleteOnce?: () => void;
}) {
  const isLive     = match.status === "IN_PROGRESS";
  const isFinished = match.status === "FINISHED";

  const statusBadge = {
    IN_PROGRESS: "bg-emerald-500/10 border-emerald-500/20 text-emerald-300",
    PENDING:     "bg-white/5        border-white/10        text-slate-400",
    FINISHED:    "bg-blue-500/10    border-blue-500/20     text-blue-300",
  }[match.status];

  const statusLabel = {
    IN_PROGRESS: "En juego",
    PENDING:     "Pendiente",
    FINISHED:    "Finalizado",
  }[match.status];

  const resultBadge = match.result
    ? {
        WIN:  { label: "Victoria", color: "text-emerald-400" },
        LOSS: { label: "Derrota",  color: "text-rose-400"    },
        DRAW: { label: "Empate",   color: "text-amber-400"   },
      }[match.result]
    : null;

  return (
    <div
      className={`rounded-2xl border overflow-hidden transition-all duration-150 ${
        isLive
          ? "border-emerald-500/20 bg-emerald-500/[0.04]"
          : "border-white/10 bg-white/[0.04]"
      }`}
    >
      {isLive && (
        <div className="bg-gradient-to-r from-emerald-600/80 to-emerald-500/80 backdrop-blur px-4 py-2 flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
          <span className="text-white text-xs font-bold uppercase tracking-widest">
            Partido en curso
          </span>
        </div>
      )}

      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap mb-1.5">
              <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${statusBadge}`}>
                {statusLabel}
              </span>
              {resultBadge && (
                <span className={`text-xs font-bold ${resultBadge.color}`}>
                  {resultBadge.label}
                </span>
              )}
            </div>
            <h3 className="font-bold text-white text-base leading-tight">
              vs {match.opponent}
            </h3>
          </div>

          <div className="flex items-start gap-2 shrink-0">
            {(isFinished || isLive) && match.homeScore != null && match.awayScore != null && (
              <div className="text-right">
                <p className="text-3xl font-semibold text-white leading-none">
                  {match.homeScore}
                  <span className="text-white/25 mx-1">-</span>
                  {match.awayScore}
                </p>
              </div>
            )}

            {/* ✏️ Botón mágico admin */}
            {isAdmin && (
              <button
                type="button"
                onClick={onEdit}
                title="Editar partido"
                className="w-7 h-7 rounded-full bg-white/[0.06] border border-white/10 hover:bg-white/[0.12] hover:border-white/20 flex items-center justify-center text-slate-400 hover:text-white transition-all duration-150 shrink-0"
              >
                <PencilIcon />
              </button>
            )}
          </div>
        </div>

        <p className="text-xs text-slate-500 mt-2 leading-relaxed">
          {match.fixtureRoundNumber != null && (
            <span className="font-semibold text-slate-400">
              Fecha {match.fixtureRoundNumber} ·{" "}
            </span>
          )}
          {formatDate(match.date, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          {match.venue && (
            <>
              <br />
              <span>📍 {match.venue}</span>
            </>
          )}
        </p>

        {match.once.length > 0 && (
          <div className="mt-4 border-t border-white/[0.06] pt-4">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-600 mb-3">
              {isLive ? "🏟️ Once inicial" : "Once inicial"}
            </p>
            <OnceInicialList players={match.once} />
          </div>
        )}

        {/* Admin hint: once inicial disponible */}
        {isAdmin && isLive && match.once.length === 0 && (
          <button
            type="button"
            onClick={onCompleteOnce ?? onEdit}
            className="mt-3 w-full text-xs text-emerald-400/70 border border-emerald-500/10 hover:border-emerald-500/20 hover:text-emerald-300 rounded-xl py-2 transition-all text-center"
          >
            ⚽ Completar once inicial →
          </button>
        )}
      </div>
    </div>
  );
}

function OnceInicialList({ players }: { players: OncePlayer[] }) {
  const groups: Record<string, OncePlayer[]> = {};
  const order = ["Portera", "Defensora", "Mediocampista", "Delantera"];

  for (const p of players) {
    const pos = p.position ?? "Otra";
    if (!groups[pos]) groups[pos] = [];
    groups[pos].push(p);
  }

  const sortedGroups = [
    ...order.filter((k) => groups[k]?.length),
    ...Object.keys(groups).filter((k) => !order.includes(k) && groups[k]?.length),
  ];

  return (
    <div className="space-y-3">
      {sortedGroups.map((pos) => (
        <div key={pos}>
          <p className="text-xs font-semibold text-slate-500 mb-1.5">
            {POSITION_ICON[pos] ?? "👟"} {pos}s
          </p>
          <div className="space-y-1.5">
            {groups[pos].map((p) => (
              <div key={p.name} className="flex items-center gap-2.5">
                <div className="w-6 h-6 rounded-full bg-white/5 border border-white/10 shrink-0 flex items-center justify-center text-xs overflow-hidden">
                  {p.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.avatarUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-white/50 font-bold">{p.name.charAt(0)}</span>
                  )}
                </div>
                {p.number != null && (
                  <span className="text-xs font-bold text-slate-500 w-5 text-right shrink-0">
                    #{p.number}
                  </span>
                )}
                <span className="text-sm font-medium text-slate-300">{p.name}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// TAB 3 — PLANTEL
// ════════════════════════════════════════════════════════════
function PlantelTab({
  players,
  isAdmin,
  onAddPlayer,
  onEditPlayer,
}: {
  players: PlayerData[];
  isAdmin: boolean;
  onAddPlayer: () => void;
  onEditPlayer: (p: PlayerData) => void;
}) {
  if (players.length === 0 && !isAdmin) {
    return <EmptyState message="No hay jugadoras en el plantel todavía." />;
  }

  const posOrder = ["Portera", "Defensora", "Mediocampista", "Delantera"];
  const groups: Record<string, PlayerData[]> = {};

  for (const p of players) {
    const pos = p.idealPosition ?? "Sin posición";
    if (!groups[pos]) groups[pos] = [];
    groups[pos].push(p);
  }

  const sortedGroups = [
    ...posOrder.filter((k) => groups[k]),
    ...Object.keys(groups).filter((k) => !posOrder.includes(k) && groups[k]),
  ];

  return (
    <div className="space-y-8">
      {/* ── Botones admin ─── */}
      {isAdmin && (
        <div className="flex items-center justify-end gap-2 flex-wrap">
          <AddAdminModal />
          <button
            type="button"
            onClick={onAddPlayer}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-sky-300 border border-sky-500/20 bg-sky-500/[0.06] hover:bg-sky-500/[0.12] hover:border-sky-500/30 px-3.5 py-2 rounded-full transition-all duration-150"
          >
            <PlusIcon />
            Agregar jugadora
          </button>
        </div>
      )}

      {players.length === 0 && isAdmin && (
        <EmptyState message="No hay jugadoras todavía. Agregá la primera." />
      )}

      {sortedGroups.map((pos) => (
        <div key={pos}>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-base">{POSITION_ICON[pos] ?? "👟"}</span>
            <h2 className="font-semibold text-slate-400 text-xs uppercase tracking-widest">
              {pos}s
            </h2>
            <span className="text-xs text-slate-600">({groups[pos].length})</span>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {groups[pos].map((player) => (
              <PlayerCard
                key={player.id}
                player={player}
                isAdmin={isAdmin}
                onEdit={() => onEditPlayer(player)}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function PlayerCard({
  player,
  isAdmin,
  onEdit,
}: {
  player: PlayerData;
  isAdmin: boolean;
  onEdit: () => void;
}) {
  const posStyle = POSITION_STYLE[player.idealPosition ?? ""] ?? {
    badge: "bg-white/5 border-white/10 text-slate-400",
    accent: "text-slate-400",
    glow: "",
  };
  const posIcon     = POSITION_ICON[player.idealPosition ?? ""] ?? "👟";
  const age         = player.birthdate ? calcAge(player.birthdate) : null;
  const bdFormatted = player.birthdate ? formatBirthdate(player.birthdate) : null;

  return (
    <div className="relative group/card">
      <Link
        href={`/jugadoras/${player.id}`}
        className="rounded-2xl border border-white/10 bg-white/[0.04] hover:bg-white/[0.07] hover:border-white/20 p-4 flex flex-col items-center text-center transition-all duration-150 block"
      >
        {/* Avatar */}
        <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 overflow-hidden flex items-center justify-center mb-3 shrink-0">
          {player.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={player.avatarUrl}
              alt={`${player.firstName} ${player.lastName}`}
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-2xl">{posIcon}</span>
          )}
        </div>

        {player.number != null && (
          <span className={`text-xs font-bold mb-1 ${posStyle.accent}`}>
            #{player.number}
          </span>
        )}

        <h3 className="font-bold text-white text-sm leading-tight">{player.firstName}</h3>
        <h3 className="font-bold text-white text-sm leading-tight mb-2">{player.lastName}</h3>

        <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border mb-3 ${posStyle.badge}`}>
          {player.idealPosition ?? "Sin posición"}
        </span>

        <div className="w-full space-y-1 text-xs text-slate-500">
          {bdFormatted && (
            <div className="flex items-start justify-between gap-1">
              <span>🎂</span>
              <span className="flex-1 text-right leading-tight">
                {bdFormatted}
                {age != null && <span className="text-slate-600"> ({age})</span>}
              </span>
            </div>
          )}
          {player.joiningYear && (
            <div className="flex items-center justify-between">
              <span>🗓️</span>
              <span>Desde {player.joiningYear}</span>
            </div>
          )}
        </div>

        {/* Admin status badge */}
        {isAdmin && player.status === "INJURED" && (
          <span className="mt-2 text-[10px] font-semibold text-amber-400/80 border border-amber-500/20 px-2 py-0.5 rounded-full">
            🚑 Lesionada
          </span>
        )}

        <p className={`mt-3 text-xs font-semibold opacity-0 group-hover/card:opacity-100 transition-opacity ${posStyle.accent}`}>
          Ver perfil →
        </p>
      </Link>

      {/* ✏️ Botón mágico admin — overlay */}
      {isAdmin && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onEdit();
          }}
          title="Editar jugadora"
          className="absolute top-2 right-2 w-7 h-7 rounded-full bg-[#0a101e]/90 border border-white/10 hover:bg-sky-500/20 hover:border-sky-500/30 flex items-center justify-center text-slate-400 hover:text-sky-300 transition-all duration-150 opacity-0 group-hover/card:opacity-100 z-10"
        >
          <PencilIcon />
        </button>
      )}
    </div>
  );
}

// ── Admin bar ─────────────────────────────────────────────────
function AdminBar({ adminEmail }: { adminEmail: string | null }) {
  if (!adminEmail) {
    return (
      <Link
        href="/login"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white border border-white/10 hover:border-white/20 bg-white/[0.03] hover:bg-white/[0.07] px-3 py-1.5 rounded-full transition-all duration-150"
      >
        <svg
          width="11" height="11" viewBox="0 0 24 24"
          fill="none" stroke="currentColor" strokeWidth="2.5"
          strokeLinecap="round" strokeLinejoin="round"
          className="shrink-0"
        >
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
        Ingresar
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      {/* Admin badge */}
      <span className="hidden sm:flex items-center gap-1 text-[10px] font-semibold text-sky-400/80 bg-sky-500/[0.07] border border-sky-500/15 px-2.5 py-1 rounded-full">
        <span className="w-1 h-1 rounded-full bg-sky-400" />
        Admin
      </span>

      {/* Email — solo visible en pantallas medianas+ */}
      <span className="hidden md:block text-[10px] text-slate-600 max-w-[120px] truncate font-medium">
        {adminEmail}
      </span>

      {/* Salir */}
      <form action={logoutAction}>
        <button
          type="submit"
          className="text-xs font-semibold text-slate-500 hover:text-white border border-white/[0.08] hover:border-white/20 bg-transparent hover:bg-white/[0.05] px-2.5 py-1.5 rounded-full transition-all duration-150 cursor-pointer"
        >
          Salir
        </button>
      </form>
    </div>
  );
}

// ── Shared ────────────────────────────────────────────────────
function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <p className="text-slate-500 text-sm font-medium">{message}</p>
    </div>
  );
}
