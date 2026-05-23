"use client";

import { useState } from "react";
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
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatBirthdate(iso: string): string {
  return new Date(iso).toLocaleDateString("es-AR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

// ── Constants ─────────────────────────────────────────────────
const POSITION_STYLE: Record<string, string> = {
  Portera:       "bg-amber-100   text-amber-800  border-amber-200",
  Defensora:     "bg-sky-100     text-sky-800    border-sky-200",
  Mediocampista: "bg-emerald-100 text-emerald-800 border-emerald-200",
  Delantera:     "bg-rose-100    text-rose-800   border-rose-200",
};

const POSITION_ICON: Record<string, string> = {
  Portera:       "🧤",
  Defensora:     "🛡️",
  Mediocampista: "⚙️",
  Delantera:     "⚡",
};

// ── Main component ────────────────────────────────────────────
export default function AppShell({
  matches,
  players,
  stats,
}: {
  matches: MatchData[];
  players: PlayerData[];
  stats: StatsData;
}) {
  const [tab, setTab] = useState<Tab>("posiciones");

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: "posiciones", label: "Posiciones", icon: "📊" },
    { id: "partidos",   label: "Partidos",   icon: "⚽" },
    { id: "plantel",    label: "Plantel",    icon: "👥" },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      {/* ── Header ──────────────────────────────────────── */}
      <header className="bg-gradient-to-br from-sky-600 via-sky-500 to-sky-400 text-white shadow-lg shadow-sky-500/20">
        <div className="max-w-xl mx-auto px-4 pt-8 pb-5">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-white/20 backdrop-blur border border-white/30 flex items-center justify-center text-2xl shadow-inner">
              🇦🇷
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight leading-none">
                NacionApp
              </h1>
              <p className="text-sky-100 text-xs font-medium mt-0.5 tracking-wide uppercase">
                Selección Argentina Femenina
              </p>
            </div>
          </div>

          {/* Live badge */}
          {stats.inProgressCount > 0 && (
            <div className="mt-4 inline-flex items-center gap-2 bg-green-400/20 border border-green-300/40 text-green-100 text-xs font-semibold px-3 py-1.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-green-300 animate-pulse" />
              Partido en curso
            </div>
          )}
        </div>

        {/* ── Tab bar ─────────────────────────────────── */}
        <div className="max-w-xl mx-auto px-4">
          <div className="flex">
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex-1 flex flex-col items-center gap-0.5 py-3 text-xs font-bold tracking-wide transition-all border-b-2 ${
                  tab === t.id
                    ? "border-white text-white"
                    : "border-transparent text-sky-200 hover:text-white"
                }`}
              >
                <span className="text-base">{t.icon}</span>
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* ── Content ─────────────────────────────────────── */}
      <main className="flex-1 max-w-xl mx-auto w-full px-4 py-6">
        {tab === "posiciones" && <PosicionesTab stats={stats} matches={matches} />}
        {tab === "partidos"   && <PartidosTab   matches={matches} />}
        {tab === "plantel"    && <PlantelTab     players={players} />}
      </main>

      {/* ── Footer ──────────────────────────────────────── */}
      <footer className="text-center text-xs text-slate-400 py-6 border-t border-slate-200">
        © {new Date().getFullYear()} NacionApp · Selección Argentina Femenina
      </footer>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// TAB 1 — POSICIONES
// ════════════════════════════════════════════════════════════
function PosicionesTab({ stats, matches }: { stats: StatsData; matches: MatchData[] }) {
  const dif = stats.gf - stats.gc;

  return (
    <div className="space-y-4">
      {/* Puntos ganados — hero card */}
      <div className="rounded-2xl bg-gradient-to-br from-sky-500 to-sky-600 text-white p-5 shadow-lg shadow-sky-200">
        <p className="text-sky-100 text-xs font-bold uppercase tracking-widest mb-1">
          Puntos ganados
        </p>
        <p className="text-6xl font-black leading-none">{stats.ptsGanados}</p>
        <p className="text-sky-200 text-sm mt-1">
          en {stats.pj} partido{stats.pj !== 1 ? "s" : ""} jugado{stats.pj !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Proyección de puntos */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard
          label="Ganados"
          value={stats.ptsGanados}
          sub={`${stats.pj} jugados`}
          accent="sky"
        />
        <StatCard
          label="Pendientes"
          value={`+${stats.ptsPendientes}`}
          sub={`${stats.pendingCount} por jugar`}
          accent="amber"
        />
        <StatCard
          label="Ideales"
          value={stats.ptsIdeales}
          sub="escenario ideal"
          accent="emerald"
        />
      </div>

      {/* Rendimiento */}
      <div className="rounded-2xl bg-white border border-slate-100 shadow-sm p-4">
        <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">
          Rendimiento
        </p>
        <div className="grid grid-cols-4 gap-2 text-center mb-4">
          {[
            { label: "PJ", value: stats.pj },
            { label: "V",  value: stats.v,  color: "text-green-600"  },
            { label: "E",  value: stats.e,  color: "text-amber-600"  },
            { label: "D",  value: stats.d,  color: "text-red-500"    },
          ].map(({ label, value, color }) => (
            <div key={label}>
              <p className={`text-2xl font-black ${color ?? "text-slate-700"}`}>{value}</p>
              <p className="text-xs text-slate-400 font-semibold mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {/* Goles */}
        <div className="grid grid-cols-3 gap-2 text-center border-t border-slate-100 pt-3">
          {[
            { label: "Goles a favor",   value: stats.gf },
            { label: "Goles en contra", value: stats.gc },
            { label: "Diferencia",      value: dif >= 0 ? `+${dif}` : dif, color: dif > 0 ? "text-green-600" : dif < 0 ? "text-red-500" : "text-slate-600" },
          ].map(({ label, value, color }) => (
            <div key={label}>
              <p className={`text-xl font-black ${color ?? "text-slate-700"}`}>{value}</p>
              <p className="text-xs text-slate-400 leading-tight mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Barra de progreso visual */}
      {stats.ptsIdeales > 0 && (
        <div className="rounded-2xl bg-white border border-slate-100 shadow-sm p-4">
          <div className="flex justify-between items-center mb-2">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
              Progreso hacia el ideal
            </p>
            <p className="text-xs font-bold text-sky-600">
              {Math.round((stats.ptsGanados / stats.ptsIdeales) * 100)}%
            </p>
          </div>
          <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-sky-400 to-sky-500 rounded-full transition-all duration-700"
              style={{ width: `${Math.round((stats.ptsGanados / stats.ptsIdeales) * 100)}%` }}
            />
          </div>
          <div className="flex justify-between mt-1.5">
            <p className="text-xs text-slate-400">{stats.ptsGanados} pts</p>
            <p className="text-xs text-slate-400">{stats.ptsIdeales} pts</p>
          </div>
        </div>
      )}

      {/* Sin datos */}
      {stats.pj === 0 && stats.pendingCount === 0 && (
        <EmptyState icon="📊" message="No hay partidos registrados todavía." />
      )}
    </div>
  );
}

function StatCard({
  label, value, sub, accent,
}: {
  label: string;
  value: string | number;
  sub: string;
  accent: "sky" | "amber" | "emerald";
}) {
  const colors = {
    sky:     "bg-sky-50     border-sky-100     text-sky-600",
    amber:   "bg-amber-50   border-amber-100   text-amber-600",
    emerald: "bg-emerald-50 border-emerald-100 text-emerald-600",
  };
  return (
    <div className={`rounded-xl border p-3 text-center ${colors[accent]}`}>
      <p className="text-2xl font-black">{value}</p>
      <p className="text-xs font-bold mt-0.5">{label}</p>
      <p className="text-xs opacity-70 mt-0.5 leading-tight">{sub}</p>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// TAB 2 — PARTIDOS
// ════════════════════════════════════════════════════════════
function PartidosTab({ matches }: { matches: MatchData[] }) {
  // Orden: EN JUEGO → PENDIENTES (asc) → FINALIZADOS (desc)
  const live     = matches.filter((m) => m.status === "IN_PROGRESS");
  const pending  = [...matches.filter((m) => m.status === "PENDING")]
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const finished = [...matches.filter((m) => m.status === "FINISHED")]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const sorted = [...live, ...pending, ...finished];

  if (sorted.length === 0) {
    return <EmptyState icon="⚽" message="No hay partidos registrados todavía." />;
  }

  return (
    <div className="space-y-3">
      {pending.length > 0 && live.length === 0 && (
        <div className="text-xs font-semibold text-slate-400 uppercase tracking-widest pb-1">
          Próximo partido — {formatDate(pending[0].date, { weekday: "long", day: "numeric", month: "long" })}
        </div>
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
  const isPending  = match.status === "PENDING";

  const statusConfig = {
    IN_PROGRESS: { label: "En juego",   bg: "bg-green-100  text-green-700  border-green-200" },
    PENDING:     { label: "Pendiente",  bg: "bg-slate-100  text-slate-600  border-slate-200" },
    FINISHED:    { label: "Finalizado", bg: "bg-sky-50     text-sky-700    border-sky-100"   },
  }[match.status];

  const resultConfig = match.result
    ? {
        WIN:  { label: "Victoria", color: "text-green-600" },
        LOSS: { label: "Derrota",  color: "text-red-500"   },
        DRAW: { label: "Empate",   color: "text-amber-600" },
      }[match.result]
    : null;

  return (
    <div
      className={`rounded-2xl border shadow-sm overflow-hidden ${
        isLive
          ? "border-green-200 bg-white shadow-green-100"
          : "border-slate-100 bg-white"
      }`}
    >
      {/* Live header */}
      {isLive && (
        <div className="bg-gradient-to-r from-green-500 to-emerald-500 px-4 py-2 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
          <span className="text-white text-xs font-black uppercase tracking-widest">
            Partido en curso
          </span>
        </div>
      )}

      <div className="p-4">
        {/* Opponent + score */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span
                className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${statusConfig.bg}`}
              >
                {statusConfig.label}
              </span>
              {resultConfig && (
                <span className={`text-xs font-black ${resultConfig.color}`}>
                  {resultConfig.label}
                </span>
              )}
            </div>
            <h3 className="font-black text-slate-900 text-base leading-tight">
              vs {match.opponent}
            </h3>
          </div>

          {/* Score */}
          {(isFinished || isLive) &&
            match.homeScore != null &&
            match.awayScore != null && (
            <div className="text-right shrink-0">
              <p className="text-3xl font-black text-slate-900 leading-none">
                {match.homeScore}
                <span className="text-slate-300 mx-1">-</span>
                {match.awayScore}
              </p>
            </div>
          )}
        </div>

        {/* Date + venue */}
        <p className="text-xs text-slate-400 mt-2 leading-relaxed">
          {formatDate(match.date, {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
          {match.venue && (
            <>
              <br />
              <span className="text-slate-400">📍 {match.venue}</span>
            </>
          )}
        </p>

        {/* Once inicial — solo en partidos en juego o finalizados con titulares */}
        {match.once.length > 0 && (
          <div className="mt-4 border-t border-slate-100 pt-4">
            <p className="text-xs font-black uppercase tracking-widest text-slate-500 mb-3">
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
          <p className="text-xs font-semibold text-slate-400 mb-1.5">
            {POSITION_ICON[pos] ?? "👟"} {pos}s
          </p>
          <div className="space-y-1.5">
            {groups[pos].map((p) => (
              <div key={p.name} className="flex items-center gap-2.5">
                {/* Mini avatar */}
                <div className="w-7 h-7 rounded-full bg-slate-100 border border-slate-200 shrink-0 flex items-center justify-center text-xs overflow-hidden">
                  {p.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.avatarUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-slate-500 font-bold">
                      {p.name.charAt(0)}
                    </span>
                  )}
                </div>
                {p.number != null && (
                  <span className="text-xs font-black text-slate-400 w-5 text-right shrink-0">
                    #{p.number}
                  </span>
                )}
                <span className="text-sm font-semibold text-slate-800">{p.name}</span>
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
    return <EmptyState icon="👥" message="No hay jugadoras en el plantel todavía." />;
  }

  // Agrupar por posición
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
    <div className="space-y-6">
      {sortedGroups.map((pos) => (
        <div key={pos}>
          {/* Group header */}
          <div className="flex items-center gap-2 mb-3">
            <span className="text-lg">{POSITION_ICON[pos] ?? "👟"}</span>
            <h2 className="font-black text-slate-700 text-sm uppercase tracking-widest">
              {pos}s
            </h2>
            <span className="text-xs text-slate-400 font-medium">
              ({groups[pos].length})
            </span>
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
  const posStyle = POSITION_STYLE[player.idealPosition ?? ""] ?? "bg-slate-100 text-slate-600 border-slate-200";
  const posIcon  = POSITION_ICON[player.idealPosition ?? ""]  ?? "👟";
  const age      = player.birthdate ? calcAge(player.birthdate) : null;
  const bdFormatted = player.birthdate ? formatBirthdate(player.birthdate) : null;

  return (
    <div className="rounded-2xl bg-white border border-slate-100 shadow-sm p-4 flex flex-col items-center text-center">
      {/* Avatar */}
      <div className="w-16 h-16 rounded-full bg-slate-100 border-2 border-slate-200 overflow-hidden flex items-center justify-center mb-3 shrink-0">
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

      {/* Number badge */}
      {player.number != null && (
        <span className="text-xs font-black text-slate-400 mb-1">
          #{player.number}
        </span>
      )}

      {/* Name */}
      <h3 className="font-black text-slate-900 text-sm leading-tight">
        {player.firstName}
      </h3>
      <h3 className="font-black text-slate-900 text-sm leading-tight mb-2">
        {player.lastName}
      </h3>

      {/* Position badge */}
      <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border mb-3 ${posStyle}`}>
        {player.idealPosition ?? "Sin posición"}
      </span>

      {/* Details */}
      <div className="w-full space-y-1 text-xs text-slate-500">
        {bdFormatted && (
          <div className="flex items-start justify-between gap-1">
            <span className="text-slate-400">🎂</span>
            <span className="flex-1 text-right leading-tight">
              {bdFormatted}
              {age != null && (
                <span className="text-slate-400"> ({age} años)</span>
              )}
            </span>
          </div>
        )}
        {player.joiningYear && (
          <div className="flex items-center justify-between">
            <span className="text-slate-400">🗓️</span>
            <span>Desde {player.joiningYear}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Shared ────────────────────────────────────────────────────
function EmptyState({ icon, message }: { icon: string; message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <span className="text-5xl mb-4">{icon}</span>
      <p className="text-slate-400 text-sm font-medium">{message}</p>
    </div>
  );
}
