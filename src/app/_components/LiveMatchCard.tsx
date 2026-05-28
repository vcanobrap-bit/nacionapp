"use client";

import { useState, useTransition, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  addHomeGoalAction,
  addAwayGoalAction,
  addCardAction,
  finishMatchAction,
  deleteEventAction,
  addSubstitutionAction,
} from "@/app/admin/partidos/actions";
import type { LiveMatchData, MatchEventData } from "../page";

// ── Icono de evento ───────────────────────────────────────────────────────
function EventIcon({ type, isOwn }: { type: string; isOwn: boolean }) {
  if (type === "GOAL")     return <span className={isOwn ? "text-emerald-400" : "text-red-400"}>⚽</span>;
  if (type === "AMARILLA") return <span>🟨</span>;
  if (type === "ROJA")     return <span>🟥</span>;
  if (type === "CAMBIO")   return <span>🔄</span>;
  return null;
}

// ── Feed de eventos ───────────────────────────────────────────────────────
function EventFeed({
  events,
  opponent,
  isAdmin,
}: {
  events: MatchEventData[];
  opponent: string;
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  if (events.length === 0) return null;

  async function handleDelete(eventId: string) {
    setDeletingId(eventId);
    const res = await deleteEventAction(eventId);
    setDeletingId(null);
    if (res.error) {
      setFeedback(res.error);
      setTimeout(() => setFeedback(null), 3000);
    } else {
      router.refresh();
    }
  }

  return (
    <div className="mt-4 border-t border-white/[0.06] pt-4 space-y-1.5">
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600 mb-2">
        Incidencias
      </p>

      {feedback && (
        <p className="text-xs text-red-400 mb-2">{feedback}</p>
      )}

      {[...events].reverse().map((ev) => (
        <div key={ev.id} className="flex items-center gap-2.5 text-sm group/ev">
          <EventIcon type={ev.type} isOwn={ev.isOwn} />

          {ev.minute != null && (
            <span className="text-[11px] font-bold text-slate-500 w-8 text-right shrink-0">
              {ev.minute}&apos;
            </span>
          )}

          {ev.type === "CAMBIO" ? (
            <span className="text-slate-300 font-medium leading-tight flex-1 min-w-0 text-xs">
              Sale: <span className="text-white">{ev.playerName ?? "?"}</span>
              {" — "}Entra: <span className="text-emerald-300">{ev.player2Name ?? "?"}</span>
            </span>
          ) : (
            <span className={`flex-1 min-w-0 ${ev.isOwn ? "text-white" : "text-slate-400"} font-medium leading-tight`}>
              {ev.type === "GOAL"
                ? ev.isOwn
                  ? ev.playerName ?? "Sin asignar"
                  : opponent
                : ev.playerName ?? "Sin asignar"}
              {ev.type !== "GOAL" && (
                <span className="text-xs text-slate-600 ml-1">
                  {ev.type === "AMARILLA" ? "amarilla" : "roja"}
                </span>
              )}
            </span>
          )}

          {/* Botón eliminar — solo admin */}
          {isAdmin && (
            <button
              type="button"
              onClick={() => handleDelete(ev.id)}
              disabled={deletingId === ev.id}
              title="Eliminar incidencia"
              className="shrink-0 opacity-0 group-hover/ev:opacity-100 w-5 h-5 flex items-center justify-center rounded-full text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-all disabled:opacity-30"
            >
              {deletingId === ev.id ? (
                <span className="w-3 h-3 border border-slate-600 border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5">
                  <path d="M5.28 4.22a.75.75 0 0 0-1.06 1.06L6.94 8l-2.72 2.72a.75.75 0 1 0 1.06 1.06L8 9.06l2.72 2.72a.75.75 0 1 0 1.06-1.06L9.06 8l2.72-2.72a.75.75 0 0 0-1.06-1.06L8 6.94 5.28 4.22Z" />
                </svg>
              )}
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Once Inicial ─────────────────────────────────────────────────────────
function OnceList({
  players,
  events,
}: {
  players: LiveMatchData["once"];
  events: MatchEventData[];
}) {
  if (players.length === 0) return null;

  const order = ["Portera", "Defensora", "Mediocampista", "Delantera"];
  const groups: Record<string, typeof players> = {};
  for (const p of players) {
    const pos = p.position ?? "Otra";
    if (!groups[pos]) groups[pos] = [];
    groups[pos].push(p);
  }
  const sortedGroups = [
    ...order.filter((k) => groups[k]?.length),
    ...Object.keys(groups).filter((k) => !order.includes(k) && groups[k]?.length),
  ];

  const posIcon: Record<string, string> = {
    Portera: "🧤", Defensora: "🛡️", Mediocampista: "⚙️", Delantera: "⚡",
  };

  // Precomputar íconos por nombre de jugadora
  function getPlayerEventIcons(name: string) {
    return events.filter(
      (ev) => ev.isOwn && ev.playerName === name && ev.type !== "CAMBIO"
    );
  }

  return (
    <div className="mt-4 border-t border-white/[0.06] pt-4 space-y-3">
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600">
        🏟️ Once inicial
      </p>
      {sortedGroups.map((pos) => (
        <div key={pos}>
          <p className="text-xs font-semibold text-slate-500 mb-1.5">
            {posIcon[pos] ?? "👟"} {pos}s
          </p>
          <div className="space-y-1">
            {groups[pos].map((p) => {
              const playerEvents = getPlayerEventIcons(p.name);
              return (
                <div key={p.name} className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-white/5 border border-white/10 overflow-hidden shrink-0 flex items-center justify-center text-[10px]">
                    {p.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.avatarUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-white/40 font-bold">{p.name.charAt(0)}</span>
                    )}
                  </div>
                  {p.number != null && (
                    <span className="text-[10px] font-bold text-slate-600 w-4 text-right shrink-0">
                      #{p.number}
                    </span>
                  )}
                  <span className="text-xs font-medium text-slate-300 flex-1 min-w-0 truncate">
                    {p.name}
                  </span>
                  {/* Íconos de incidencias */}
                  {playerEvents.length > 0 && (
                    <span className="flex items-center gap-0.5 shrink-0 text-sm leading-none">
                      {playerEvents.map((ev, i) => (
                        <span key={i}>
                          {ev.type === "GOAL" ? "⚽" : ev.type === "AMARILLA" ? "🟨" : "🟥"}
                        </span>
                      ))}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Consola Admin ─────────────────────────────────────────────────────────
type ActivePanel = "goal-home" | "goal-visita" | "card" | "cambio" | "finish" | null;

const FIELD =
  "w-full rounded-lg bg-white/[0.05] border border-white/10 px-2.5 py-2 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-sky-500/40 transition-all [color-scheme:dark]";

function AdminConsole({
  matchId,
  opponent,
  homeScore,
  awayScore,
  convocadas,
}: {
  matchId: string;
  opponent: string;
  homeScore: number;
  awayScore: number;
  convocadas: NonNullable<LiveMatchData["convocadas"]>;
}) {
  const router = useRouter();
  const [activePanel, setActivePanel] = useState<ActivePanel>(null);
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ type: "ok" | "err"; msg: string } | null>(null);

  // Form state
  const [selectedPlayer, setSelectedPlayer] = useState<string>("");
  const [player2, setPlayer2]               = useState<string>("");
  const [minuteInput, setMinuteInput]       = useState<string>("");
  const [cardType, setCardType]             = useState<"AMARILLA" | "ROJA">("AMARILLA");

  const titulares = convocadas.filter((p) => p.isTitular);
  const banca     = convocadas.filter((p) => !p.isTitular);

  const refresh = useCallback(() => {
    router.refresh();
    setActivePanel(null);
    setSelectedPlayer("");
    setPlayer2("");
    setMinuteInput("");
  }, [router]);

  function handleResult(res: { error?: string; success?: string }) {
    if (res.error) {
      setFeedback({ type: "err", msg: res.error });
    } else {
      setFeedback({ type: "ok", msg: res.success ?? "OK" });
      setTimeout(() => setFeedback(null), 2500);
      refresh();
    }
  }

  const parseMinute = () => {
    const n = parseInt(minuteInput, 10);
    return isNaN(n) ? null : n;
  };

  function submitGoalHome() {
    startTransition(async () => {
      const res = await addHomeGoalAction(matchId, selectedPlayer || null, parseMinute());
      handleResult(res);
    });
  }

  function submitGoalVisita() {
    startTransition(async () => {
      const res = await addAwayGoalAction(matchId, parseMinute());
      handleResult(res);
    });
  }

  function submitCard() {
    if (!selectedPlayer) {
      setFeedback({ type: "err", msg: "Seleccioná una jugadora." });
      return;
    }
    startTransition(async () => {
      const res = await addCardAction(matchId, cardType, selectedPlayer, parseMinute());
      handleResult(res);
    });
  }

  function submitCambio() {
    if (!selectedPlayer || !player2) {
      setFeedback({ type: "err", msg: "Seleccioná las dos jugadoras del cambio." });
      return;
    }
    startTransition(async () => {
      const res = await addSubstitutionAction(matchId, selectedPlayer, player2, parseMinute());
      handleResult(res);
    });
  }

  function submitFinish() {
    startTransition(async () => {
      const res = await finishMatchAction(matchId);
      handleResult(res);
    });
  }

  const computedResult =
    homeScore > awayScore ? "Victoria 🏆" :
    homeScore < awayScore ? "Derrota" :
    "Empate";

  return (
    <div className="mt-4 border-t border-sky-500/15 pt-4">
      {/* Feedback banner */}
      {feedback && (
        <div
          className={`mb-3 rounded-lg px-3 py-2 text-xs font-medium border ${
            feedback.type === "err"
              ? "bg-red-500/10 border-red-500/20 text-red-300"
              : "bg-emerald-500/10 border-emerald-500/20 text-emerald-300"
          }`}
        >
          {feedback.msg}
        </div>
      )}

      {/* Quick action buttons */}
      <div className="grid grid-cols-5 gap-1 mb-3">
        {(
          [
            { id: "goal-home",  label: "⚽ Gol",      color: "bg-emerald-500/10 border-emerald-500/20 text-emerald-300 hover:bg-emerald-500/20" },
            { id: "goal-visita",label: "⚽ Rival",    color: "bg-red-500/10     border-red-500/20     text-red-300     hover:bg-red-500/20"     },
            { id: "card",       label: "🟨 Tarjeta",  color: "bg-amber-500/10   border-amber-500/20   text-amber-300   hover:bg-amber-500/20"   },
            { id: "cambio",     label: "🔄 Cambio",   color: "bg-purple-500/10  border-purple-500/20  text-purple-300  hover:bg-purple-500/20"  },
            { id: "finish",     label: "✓ Final",    color: "bg-blue-500/10    border-blue-500/20    text-blue-300    hover:bg-blue-500/20"    },
          ] as const
        ).map(({ id, label, color }) => (
          <button
            key={id}
            type="button"
            disabled={isPending}
            onClick={() => setActivePanel(activePanel === id ? null : id)}
            className={`text-[9px] font-bold px-1 py-2 rounded-lg border transition-all duration-150 disabled:opacity-50 ${color} ${
              activePanel === id ? "ring-1 ring-white/20" : ""
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── Panel: Gol propio ── */}
      {activePanel === "goal-home" && (
        <div className="rounded-xl bg-emerald-500/[0.05] border border-emerald-500/15 p-3 space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-400/70 mb-2">
            ⚽ Gol — ¿quién anotó?
          </p>
          <select
            value={selectedPlayer}
            onChange={(e) => setSelectedPlayer(e.target.value)}
            className={FIELD + " bg-slate-900/80"}
          >
            <option value="">Sin asignar</option>
            {convocadas.map((p) => (
              <option key={p.userId} value={p.userId}>
                {p.number ? `#${p.number} ` : ""}{p.name}
              </option>
            ))}
          </select>
          <div className="flex gap-2">
            <input
              type="number"
              value={minuteInput}
              onChange={(e) => setMinuteInput(e.target.value)}
              placeholder="Min (opcional)"
              min={1} max={120}
              className={FIELD + " flex-1"}
            />
            <button
              type="button"
              disabled={isPending}
              onClick={submitGoalHome}
              className="shrink-0 text-xs font-bold bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-white rounded-lg px-4 py-2 transition-all"
            >
              {isPending ? "…" : "Confirmar"}
            </button>
          </div>
        </div>
      )}

      {/* ── Panel: Gol rival ── */}
      {activePanel === "goal-visita" && (
        <div className="rounded-xl bg-red-500/[0.05] border border-red-500/15 p-3 space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-widest text-red-400/70 mb-2">
            ⚽ Gol rival — {opponent}
          </p>
          <div className="flex gap-2">
            <input
              type="number"
              value={minuteInput}
              onChange={(e) => setMinuteInput(e.target.value)}
              placeholder="Minuto (opcional)"
              min={1} max={120}
              className={FIELD + " flex-1"}
            />
            <button
              type="button"
              disabled={isPending}
              onClick={submitGoalVisita}
              className="shrink-0 text-xs font-bold bg-red-500 hover:bg-red-400 disabled:opacity-50 text-white rounded-lg px-4 py-2 transition-all"
            >
              {isPending ? "…" : "+1 Rival"}
            </button>
          </div>
        </div>
      )}

      {/* ── Panel: Tarjeta ── */}
      {activePanel === "card" && (
        <div className="rounded-xl bg-amber-500/[0.05] border border-amber-500/15 p-3 space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-widest text-amber-400/70 mb-2">
            Tarjeta
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setCardType("AMARILLA")}
              className={`flex-1 text-xs font-bold py-2 rounded-lg border transition-all ${
                cardType === "AMARILLA"
                  ? "bg-yellow-400/20 border-yellow-400/40 text-yellow-300"
                  : "border-white/10 text-slate-400 hover:bg-white/5"
              }`}
            >
              🟨 Amarilla
            </button>
            <button
              type="button"
              onClick={() => setCardType("ROJA")}
              className={`flex-1 text-xs font-bold py-2 rounded-lg border transition-all ${
                cardType === "ROJA"
                  ? "bg-red-500/20 border-red-500/40 text-red-300"
                  : "border-white/10 text-slate-400 hover:bg-white/5"
              }`}
            >
              🟥 Roja
            </button>
          </div>
          <select
            value={selectedPlayer}
            onChange={(e) => setSelectedPlayer(e.target.value)}
            className={FIELD + " bg-slate-900/80"}
          >
            <option value="">Seleccioná jugadora *</option>
            {convocadas.map((p) => (
              <option key={p.userId} value={p.userId}>
                {p.number ? `#${p.number} ` : ""}{p.name}
              </option>
            ))}
          </select>
          <div className="flex gap-2">
            <input
              type="number"
              value={minuteInput}
              onChange={(e) => setMinuteInput(e.target.value)}
              placeholder="Minuto (opcional)"
              min={1} max={120}
              className={FIELD + " flex-1"}
            />
            <button
              type="button"
              disabled={isPending}
              onClick={submitCard}
              className="shrink-0 text-xs font-bold bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-[#050B14] rounded-lg px-4 py-2 transition-all"
            >
              {isPending ? "…" : "Registrar"}
            </button>
          </div>
        </div>
      )}

      {/* ── Panel: Sustitución ── */}
      {activePanel === "cambio" && (
        <div className="rounded-xl bg-purple-500/[0.05] border border-purple-500/15 p-3 space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-widest text-purple-400/70 mb-2">
            🔄 Cambio
          </p>
          <div className="space-y-2">
            <div>
              <p className="text-[10px] text-slate-500 mb-1">Sale (titular)</p>
              <select
                value={selectedPlayer}
                onChange={(e) => setSelectedPlayer(e.target.value)}
                className={FIELD + " bg-slate-900/80"}
              >
                <option value="">Seleccioná quién sale *</option>
                {titulares.map((p) => (
                  <option key={p.userId} value={p.userId}>
                    {p.number ? `#${p.number} ` : ""}{p.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <p className="text-[10px] text-slate-500 mb-1">Entra (banca)</p>
              <select
                value={player2}
                onChange={(e) => setPlayer2(e.target.value)}
                className={FIELD + " bg-slate-900/80"}
              >
                <option value="">Seleccioná quién entra *</option>
                {banca.map((p) => (
                  <option key={p.userId} value={p.userId}>
                    {p.number ? `#${p.number} ` : ""}{p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <input
              type="number"
              value={minuteInput}
              onChange={(e) => setMinuteInput(e.target.value)}
              placeholder="Minuto (opcional)"
              min={1} max={120}
              className={FIELD + " flex-1"}
            />
            <button
              type="button"
              disabled={isPending}
              onClick={submitCambio}
              className="shrink-0 text-xs font-bold bg-purple-500 hover:bg-purple-400 disabled:opacity-50 text-white rounded-lg px-4 py-2 transition-all"
            >
              {isPending ? "…" : "Registrar"}
            </button>
          </div>
          {titulares.length === 0 && (
            <p className="text-[10px] text-slate-600">
              Definí el once inicial antes de registrar cambios.
            </p>
          )}
        </div>
      )}

      {/* ── Panel: Finalizar partido ── */}
      {activePanel === "finish" && (
        <div className="rounded-xl bg-blue-500/[0.05] border border-blue-500/20 p-4 space-y-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-blue-400/70">
            Finalizar partido
          </p>
          <div className="text-center py-2">
            <p className="text-2xl font-bold text-white tabular-nums">
              {homeScore}
              <span className="text-white/25 mx-2">-</span>
              {awayScore}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Nacional vs {opponent}
            </p>
            <p className="text-sm font-semibold mt-2 text-blue-300">
              Resultado a guardar: <span className="text-white">{computedResult}</span>
            </p>
          </div>
          <p className="text-xs text-slate-500 text-center">
            El resultado se calculará automáticamente por el marcador. Esta acción no se puede deshacer.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setActivePanel(null)}
              className="flex-1 text-xs font-semibold border border-white/10 text-slate-400 hover:text-white rounded-lg py-2 transition-all"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={submitFinish}
              className="flex-1 text-xs font-bold bg-white hover:bg-white/90 disabled:opacity-50 text-[#050B14] rounded-lg py-2 transition-all"
            >
              {isPending ? "Finalizando…" : "✓ Confirmar y finalizar"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// TARJETA EN VIVO — componente principal exportado
// ════════════════════════════════════════════════════════════
export default function LiveMatchCard({
  match,
  isAdmin,
}: {
  match: LiveMatchData;
  isAdmin: boolean;
}) {
  return (
    <div className="p-px rounded-2xl bg-gradient-to-br from-emerald-500/30 via-emerald-600/10 to-transparent">
      <div className="rounded-[15px] bg-gradient-to-br from-[#071A10] to-[#080D16] p-5 relative overflow-hidden">
        {/* Glow */}
        <div className="pointer-events-none absolute -right-8 -top-8 w-36 h-36 rounded-full bg-emerald-500/[0.08] blur-2xl" />

        {/* Header */}
        <div className="flex items-center justify-between mb-5 relative">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
            <span className="text-[10px] font-bold tracking-[0.18em] uppercase text-emerald-400/70">
              Partido en vivo
            </span>
          </div>
          {match.tournamentName && (
            <span className="text-[10px] text-slate-500">{match.tournamentName}</span>
          )}
        </div>

        {/* Marcador hero */}
        <div className="flex items-center justify-between gap-4 relative mb-4">
          <div className="text-center flex-1">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">
              Nacional
            </p>
            <p
              className="text-5xl font-semibold text-white leading-none"
              style={{ letterSpacing: "-0.02em" }}
            >
              {match.homeScore}
            </p>
          </div>

          <div className="shrink-0 text-center">
            <p className="text-slate-600 font-bold text-xl">—</p>
            {match.venue && (
              <p className="text-[9px] text-slate-600 mt-1 max-w-[80px] text-center leading-tight truncate">
                {match.venue}
              </p>
            )}
          </div>

          <div className="text-center flex-1">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1 truncate">
              {match.opponent}
            </p>
            <p
              className="text-5xl font-semibold text-slate-400 leading-none"
              style={{ letterSpacing: "-0.02em" }}
            >
              {match.awayScore}
            </p>
          </div>
        </div>

        {/* ── Consola admin ── */}
        {isAdmin && match.convocadas !== undefined && (
          <AdminConsole
            matchId={match.id}
            opponent={match.opponent}
            homeScore={match.homeScore}
            awayScore={match.awayScore}
            convocadas={match.convocadas}
          />
        )}

        {/* ── Feed de eventos ── */}
        <EventFeed events={match.events} opponent={match.opponent} isAdmin={isAdmin} />

        {/* ── Once inicial ── */}
        <OnceList players={match.once} events={match.events} />
      </div>
    </div>
  );
}
