"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import WebGLBackground from "./WebGLBackground";
import type { MatchData, PlayerData, StatsData, OncePlayer } from "../page";

// ── Types ─────────────────────────────────────────────────────
type Tab = "posiciones" | "partidos" | "plantel";

// ── Helpers ───────────────────────────────────────────────────
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

// ── Design tokens ─────────────────────────────────────────────
const POSITION_STYLE: Record<string, { badge: string; accent: string; glow: string }> = {
  Portera:       { badge: "bg-amber-500/10 border-amber-500/20 text-amber-300",     accent: "text-amber-300",    glow: "shadow-amber-500/20"   },
  Defensora:     { badge: "bg-blue-500/10  border-blue-500/20  text-blue-300",      accent: "text-blue-300",     glow: "shadow-blue-500/20"    },
  Mediocampista: { badge: "bg-emerald-500/10 border-emerald-500/20 text-emerald-300", accent: "text-emerald-300", glow: "shadow-emerald-500/20" },
  Delantera:     { badge: "bg-rose-500/10  border-rose-500/20  text-rose-300",      accent: "text-rose-300",     glow: "shadow-rose-500/20"    },
};

const POSITION_ICON: Record<string, string> = {
  Portera: "🧤", Defensora: "🛡️", Mediocampista: "⚙️", Delantera: "⚡",
};

// ── Main component ────────────────────────────────────────────
export default function AppShell({
  matches, players, stats,
}: {
  matches: MatchData[];
  players: PlayerData[];
  stats: StatsData;
}) {
  const [tab, setTab] = useState<Tab>("posiciones");

  const tabs: { id: Tab; label: string }[] = [
    { id: "posiciones", label: "Posiciones" },
    { id: "partidos",   label: "Partidos"   },
    { id: "plantel",    label: "Plantel"    },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-[#020617] text-white relative">
      {/* WebGL dot-matrix background */}
      <WebGLBackground />

      {/* ── Header ──────────────────────────────────────── */}
      <header className="sticky top-0 z-20 border-b border-white/[0.06] bg-[#020617]/80 backdrop-blur-xl">
        <div className="max-w-xl mx-auto px-4 pt-4 pb-3">

          {/* Brand row */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Image
                src="/img/logo.svg"
                alt="Selección Argentina Femenina"
                width={32}
                height={38}
                className="shrink-0 drop-shadow-lg"
              />
              <div>
                <h1 className="text-sm font-semibold text-white leading-none tracking-tight">
                  NacionApp
                </h1>
                <p className="text-[10px] text-slate-500 font-medium tracking-wider uppercase mt-0.5">
                  Selección Argentina Femenina
                </p>
              </div>
            </div>

            {stats.inProgressCount > 0 && (
              <div className="inline-flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-semibold px-3 py-1.5 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                En vivo
              </div>
            )}
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
        {tab === "posiciones" && <PosicionesTab stats={stats} />}
        {tab === "partidos"   && <PartidosTab   matches={matches} />}
        {tab === "plantel"    && <PlantelTab     players={players} />}
      </main>

      {/* ── Footer ──────────────────────────────────────── */}
      <footer className="relative z-10 border-t border-white/[0.06] py-6 text-center">
        <p className="text-xs text-slate-600">
          © {new Date().getFullYear()} NacionApp · Selección Argentina Femenina
        </p>
      </footer>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// TAB 1 — POSICIONES
// ════════════════════════════════════════════════════════════
function PosicionesTab({ stats }: { stats: StatsData }) {
  const dif = stats.gf - stats.gc;

  return (
    <div className="space-y-3">

      {/* Hero — puntos ganados (gradient border shell) */}
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

          {/* Progreso */}
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
        <MiniStat label="Ganados"    value={stats.ptsGanados}          sub={`${stats.pj} jugados`}          color="text-blue-400"    />
        <MiniStat label="Pendientes" value={`+${stats.ptsPendientes}`}  sub={`${stats.pendingCount} por jugar`} color="text-amber-400"   />
        <MiniStat label="Ideal"      value={stats.ptsIdeales}           sub="máximo posible"                 color="text-emerald-400" />
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
function PartidosTab({ matches }: { matches: MatchData[] }) {
  const live     = matches.filter((m) => m.status === "IN_PROGRESS");
  const pending  = [...matches.filter((m) => m.status === "PENDING")]
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const finished = [...matches.filter((m) => m.status === "FINISHED")]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const sorted = [...live, ...pending, ...finished];

  if (sorted.length === 0) {
    return <EmptyState message="No hay partidos registrados todavía." />;
  }

  return (
    <div className="space-y-3">
      {pending.length > 0 && live.length === 0 && (
        <p className="text-xs font-semibold text-slate-600 uppercase tracking-widest pb-1">
          Próximo — {formatDate(pending[0].date, { weekday: "long", day: "numeric", month: "long" })}
        </p>
      )}
      {sorted.map((match) => (
        <MatchCard key={match.id} match={match} />
      ))}
    </div>
  );
}

function MatchCard({ match }: { match: MatchData }) {
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

          {(isFinished || isLive) && match.homeScore != null && match.awayScore != null && (
            <div className="text-right shrink-0">
              <p className="text-3xl font-semibold text-white leading-none">
                {match.homeScore}
                <span className="text-white/25 mx-1">-</span>
                {match.awayScore}
              </p>
            </div>
          )}
        </div>

        <p className="text-xs text-slate-500 mt-2 leading-relaxed">
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
function PlantelTab({ players }: { players: PlayerData[] }) {
  if (players.length === 0) {
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
              <PlayerCard key={player.id} player={player} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function PlayerCard({ player }: { player: PlayerData }) {
  const posStyle = POSITION_STYLE[player.idealPosition ?? ""] ?? {
    badge: "bg-white/5 border-white/10 text-slate-400",
    accent: "text-slate-400",
    glow: "",
  };
  const posIcon      = POSITION_ICON[player.idealPosition ?? ""] ?? "👟";
  const age          = player.birthdate ? calcAge(player.birthdate) : null;
  const bdFormatted  = player.birthdate ? formatBirthdate(player.birthdate) : null;

  return (
    <Link
      href={`/jugadoras/${player.id}`}
      className={`group rounded-2xl border border-white/10 bg-white/[0.04] hover:bg-white/[0.07] hover:border-white/20 p-4 flex flex-col items-center text-center transition-all duration-150`}
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

      <p className={`mt-3 text-xs font-semibold opacity-0 group-hover:opacity-100 transition-opacity ${posStyle.accent}`}>
        Ver perfil →
      </p>
    </Link>
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
