"use client";

import { useState, useEffect, useTransition, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  addHomeGoalAction,
  addAwayGoalAction,
  addCardAction,
  finishMatchAction,
  deleteEventAction,
  addSubstitutionAction,
  startFirstHalfAction,
  startHalfTimeAction,
  startSecondHalfAction,
  adjustClockAction,
} from "@/lib/actions/partidos";
import {
  clockSeconds,
  clockMinute,
  formatClock,
  isStoppageTime,
  PHASE_LABEL,
  type ClockState,
  type MatchPhase,
} from "@/lib/clock";
import type { LiveMatchData, MatchEventData } from "../page";

// ── Reloj ─────────────────────────────────────────────────────────────────
/**
 * Segundos de juego, actualizados cada segundo.
 *
 * `serverNow` se usa SOLO para el primer render, así el HTML del servidor y
 * el del cliente coinciden. Cada tick lee `Date.now()` directo.
 *
 * Antes se intentaba corregir el desfase del reloj del teléfono con un
 * `offset = serverNow − Date.now()` calculado al hidratar. Estaba mal: como
 * `serverNow` es del SSR, el offset absorbía el retraso de hidratación y lo
 * restaba a cada lectura, así que el reloj quedaba en 0:00 varios segundos y
 * después corría atrasado. Un teléfono con la hora mal puesta es raro; un
 * reloj que no arranca, no.
 */
function useMatchClock(clock: ClockState, serverNow: number): number {
  const [now, setNow] = useState(serverNow);

  useEffect(() => {
    // Con el reloj detenido (entretiempo) no hay nada que actualizar.
    if (!clock.periodStartedAt) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [clock.periodStartedAt]);

  return clockSeconds(clock, now);
}

// ── Icono de evento ───────────────────────────────────────────────────────
function EventIcon({ type, isOwn }: { type: string; isOwn: boolean }) {
  if (type === "GOAL")     return <span className={isOwn ? "text-emerald-400" : "text-red-400"}>⚽</span>;
  if (type === "AMARILLA") return <span>🟨</span>;
  if (type === "ROJA")     return <span>🟥</span>;
  if (type === "CAMBIO")   return <span>🔄</span>;
  return null;
}

// ── Feed de eventos, agrupado por tiempo ──────────────────────────────────
/**
 * Orden de los grupos. Las incidencias sin fase son de partidos anteriores a
 * que existiera el reloj: van juntas al final, sin encabezado.
 */
const PHASE_ORDER: MatchPhase[] = ["FIRST_HALF", "HALF_TIME", "SECOND_HALF"];

export function groupEventsByPhase(
  events: MatchEventData[]
): { phase: MatchPhase | null; events: MatchEventData[] }[] {
  const grupos = PHASE_ORDER.map((phase) => ({
    phase: phase as MatchPhase | null,
    events: events.filter((e) => e.phase === phase),
  })).filter((g) => g.events.length > 0);

  const sinFase = events.filter((e) => !e.phase);
  if (sinFase.length > 0) grupos.push({ phase: null, events: sinFase });
  return grupos;
}

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

  const grupos = groupEventsByPhase(events);

  return (
    <div className="mt-4 border-t border-white/[0.06] pt-4 space-y-3">
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600">
        Incidencias
      </p>

      {feedback && <p className="text-xs text-red-400">{feedback}</p>}

      {grupos.map((grupo) => (
        <div key={grupo.phase ?? "sin-fase"} className="space-y-1.5">
          {grupo.phase && (
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
              {PHASE_LABEL[grupo.phase]}
            </p>
          )}

          {grupo.events.map((ev) => (
            <div key={ev.id} className="flex items-center gap-2.5 text-sm group/ev">
              <EventIcon type={ev.type} isOwn={ev.isOwn} />

              <span className="text-[11px] font-bold text-slate-500 w-8 text-right shrink-0">
                {ev.minute != null ? `${ev.minute}'` : ""}
              </span>

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

              {/* Botón eliminar — solo admin. Visible siempre en táctil. */}
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => handleDelete(ev.id)}
                  disabled={deletingId === ev.id}
                  title="Eliminar incidencia"
                  className="shrink-0 opacity-100 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover/ev:opacity-100 w-5 h-5 flex items-center justify-center rounded-full text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-all disabled:opacity-30"
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
  phase,
  liveMinute,
}: {
  matchId: string;
  opponent: string;
  homeScore: number;
  awayScore: number;
  convocadas: NonNullable<LiveMatchData["convocadas"]>;
  phase: MatchPhase;
  /** Minuto que marca el reloj ahora; pre-llena el campo de la incidencia. */
  liveMinute: number;
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
  /** Cambios ya registrados sin cerrar el panel (el DT suele hacer varios). */
  const [cambiosHechos, setCambiosHechos]   = useState<string[]>([]);

  const enJuego     = phase === "FIRST_HALF" || phase === "SECOND_HALF";
  const enPrevia    = phase === "PRE";
  const enDescanso  = phase === "HALF_TIME";

  const titulares = convocadas.filter((p) => p.isTitular);
  const banca     = convocadas.filter((p) => !p.isTitular);

  const refresh = useCallback(() => {
    router.refresh();
    setActivePanel(null);
    setSelectedPlayer("");
    setPlayer2("");
    setMinuteInput("");
    setCambiosHechos([]);
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

  /** Abre un panel dejando el minuto pre-llenado con el reloj. */
  function openPanel(id: ActivePanel) {
    if (activePanel === id) {
      setActivePanel(null);
      return;
    }
    setActivePanel(id);
    setSelectedPlayer("");
    setPlayer2("");
    setCambiosHechos([]);
    // En el entretiempo el minuto va vacío a propósito: vacío significa
    // "pasó en el entretiempo"; si escriben un minuto, se atribuye al 1er tiempo.
    setMinuteInput(enDescanso ? "" : String(liveMinute));
  }

  const parseMinute = () => {
    const n = parseInt(minuteInput, 10);
    return isNaN(n) ? null : n;
  };

  // ── Fases ──
  function submitPhase(action: (id: string) => Promise<{ error?: string; success?: string }>) {
    startTransition(async () => handleResult(await action(matchId)));
  }

  function submitAdjust(delta: number) {
    startTransition(async () => {
      const res = await adjustClockAction(matchId, delta);
      if (res.error) setFeedback({ type: "err", msg: res.error });
      else router.refresh();
    });
  }

  // ── Incidencias ──
  function submitGoalHome() {
    startTransition(async () => {
      handleResult(await addHomeGoalAction(matchId, selectedPlayer || null, parseMinute()));
    });
  }

  function submitGoalVisita() {
    startTransition(async () => {
      handleResult(await addAwayGoalAction(matchId, parseMinute()));
    });
  }

  function submitCard() {
    if (!selectedPlayer) {
      setFeedback({ type: "err", msg: "Selecciona una jugadora." });
      return;
    }
    startTransition(async () => {
      handleResult(await addCardAction(matchId, cardType, selectedPlayer, parseMinute()));
    });
  }

  /**
   * Registra el cambio y deja el panel abierto: en el entretiempo el DT hace
   * dos o tres seguidos, y durante el partido el doble cambio es común.
   */
  function submitCambio() {
    if (!selectedPlayer || !player2) {
      setFeedback({ type: "err", msg: "Selecciona las dos jugadoras del cambio." });
      return;
    }
    const sale  = convocadas.find((p) => p.userId === selectedPlayer)?.name ?? "?";
    const entra = convocadas.find((p) => p.userId === player2)?.name ?? "?";

    startTransition(async () => {
      const res = await addSubstitutionAction(matchId, selectedPlayer, player2, parseMinute());
      if (res.error) {
        setFeedback({ type: "err", msg: res.error });
        return;
      }
      setCambiosHechos((prev) => [...prev, `${sale} → ${entra}`]);
      setSelectedPlayer("");
      setPlayer2("");
      router.refresh();
    });
  }

  function submitFinish() {
    startTransition(async () => handleResult(await finishMatchAction(matchId)));
  }

  const computedResult =
    homeScore > awayScore ? "Victoria 🏆" :
    homeScore < awayScore ? "Derrota" :
    "Empate";

  return (
    <div className="mt-4 border-t border-sky-500/15 pt-4">
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

      {/* ── PREVIA: todavía no empieza ── */}
      {enPrevia && (
        <div className="space-y-3">
          <div className="rounded-xl bg-white/[0.03] border border-white/10 p-3">
            <p className="text-xs text-slate-400 leading-relaxed">
              El partido está en <span className="text-white font-semibold">previa</span>:
              carga el once inicial mientras calientan. El reloj arranca cuando
              el árbitro dé el pitazo inicial.
            </p>
          </div>
          <button
            type="button"
            disabled={isPending}
            onClick={() => submitPhase(startFirstHalfAction)}
            className="w-full text-sm font-bold bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-white rounded-xl py-3 transition-all"
          >
            {isPending ? "…" : "▶  Iniciar 1er tiempo"}
          </button>
        </div>
      )}

      {/* ── EN JUEGO / ENTRETIEMPO ── */}
      {!enPrevia && (
        <>
          {/* Ajuste del reloj: red de seguridad si se arrancó tarde */}
          <div className="flex items-center justify-center gap-2 mb-3">
            <button
              type="button"
              disabled={isPending}
              onClick={() => submitAdjust(-60)}
              className="text-[10px] font-bold text-slate-400 hover:text-white border border-white/10 hover:border-white/20 rounded-full px-3 py-1 transition-all disabled:opacity-40"
            >
              −1 min
            </button>
            <span className="text-[10px] text-slate-600">ajustar reloj</span>
            <button
              type="button"
              disabled={isPending}
              onClick={() => submitAdjust(60)}
              className="text-[10px] font-bold text-slate-400 hover:text-white border border-white/10 hover:border-white/20 rounded-full px-3 py-1 transition-all disabled:opacity-40"
            >
              +1 min
            </button>
          </div>

          {/* Botones de incidencia. En el entretiempo no puede haber goles. */}
          <div className={`grid gap-1 mb-3 ${enDescanso ? "grid-cols-2" : "grid-cols-4"}`}>
            {(
              [
                ...(enJuego
                  ? ([
                      { id: "goal-home",   label: "⚽ Gol",     color: "bg-emerald-500/10 border-emerald-500/20 text-emerald-300 hover:bg-emerald-500/20" },
                      { id: "goal-visita", label: "⚽ Rival",   color: "bg-red-500/10     border-red-500/20     text-red-300     hover:bg-red-500/20"     },
                    ] as const)
                  : []),
                { id: "card",   label: "🟨 Tarjeta", color: "bg-amber-500/10  border-amber-500/20  text-amber-300  hover:bg-amber-500/20"  },
                { id: "cambio", label: "🔄 Cambio",  color: "bg-purple-500/10 border-purple-500/20 text-purple-300 hover:bg-purple-500/20" },
              ] as { id: ActivePanel; label: string; color: string }[]
            ).map(({ id, label, color }) => (
              <button
                key={id}
                type="button"
                disabled={isPending}
                onClick={() => openPanel(id)}
                className={`text-[10px] font-bold px-1 py-2 rounded-lg border transition-all duration-150 disabled:opacity-50 ${color} ${
                  activePanel === id ? "ring-1 ring-white/20" : ""
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Control de fase */}
          <div className="mb-3">
            {phase === "FIRST_HALF" && (
              <button
                type="button"
                disabled={isPending}
                onClick={() => submitPhase(startHalfTimeAction)}
                className="w-full text-xs font-bold bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/25 text-sky-200 rounded-xl py-2.5 transition-all disabled:opacity-50"
              >
                ⏸  Entretiempo
              </button>
            )}
            {phase === "HALF_TIME" && (
              <button
                type="button"
                disabled={isPending}
                onClick={() => submitPhase(startSecondHalfAction)}
                className="w-full text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-white rounded-xl py-2.5 transition-all disabled:opacity-50"
              >
                ▶  Iniciar 2do tiempo
              </button>
            )}
            {phase === "SECOND_HALF" && (
              <button
                type="button"
                disabled={isPending}
                onClick={() => openPanel("finish")}
                className={`w-full text-xs font-bold bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 text-blue-300 rounded-xl py-2.5 transition-all disabled:opacity-50 ${
                  activePanel === "finish" ? "ring-1 ring-white/20" : ""
                }`}
              >
                ✓  Finalizar partido
              </button>
            )}
          </div>
        </>
      )}

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
            <MinuteInput value={minuteInput} onChange={setMinuteInput} enDescanso={enDescanso} />
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
            <MinuteInput value={minuteInput} onChange={setMinuteInput} enDescanso={enDescanso} />
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
            <option value="">Selecciona una jugadora *</option>
            {convocadas.map((p) => (
              <option key={p.userId} value={p.userId}>
                {p.number ? `#${p.number} ` : ""}{p.name}
              </option>
            ))}
          </select>
          <div className="flex gap-2">
            <MinuteInput value={minuteInput} onChange={setMinuteInput} enDescanso={enDescanso} />
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

      {/* ── Panel: Sustitución (encadenable) ── */}
      {activePanel === "cambio" && (
        <div className="rounded-xl bg-purple-500/[0.05] border border-purple-500/15 p-3 space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-widest text-purple-400/70">
            🔄 Cambio {enDescanso && "— entretiempo"}
          </p>

          {/* Cambios ya anotados en esta tanda */}
          {cambiosHechos.length > 0 && (
            <div className="space-y-1 rounded-lg bg-emerald-500/[0.06] border border-emerald-500/15 px-2.5 py-2">
              {cambiosHechos.map((c, i) => (
                <p key={i} className="text-[11px] text-emerald-300 leading-snug">
                  ✓ {c}
                </p>
              ))}
            </div>
          )}

          <div className="space-y-2">
            <div>
              <p className="text-[10px] text-slate-500 mb-1">Sale (en cancha)</p>
              <select
                value={selectedPlayer}
                onChange={(e) => setSelectedPlayer(e.target.value)}
                className={FIELD + " bg-slate-900/80"}
              >
                <option value="">Selecciona quién sale *</option>
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
                <option value="">Selecciona quién entra *</option>
                {banca.map((p) => (
                  <option key={p.userId} value={p.userId}>
                    {p.number ? `#${p.number} ` : ""}{p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex gap-2">
            <MinuteInput value={minuteInput} onChange={setMinuteInput} enDescanso={enDescanso} />
            <button
              type="button"
              disabled={isPending}
              onClick={submitCambio}
              className="shrink-0 text-xs font-bold bg-purple-500 hover:bg-purple-400 disabled:opacity-50 text-white rounded-lg px-4 py-2 transition-all"
            >
              {isPending ? "…" : "Registrar"}
            </button>
          </div>

          {cambiosHechos.length > 0 && (
            <button
              type="button"
              onClick={() => setActivePanel(null)}
              className="w-full text-[11px] text-slate-500 hover:text-slate-300 transition-colors pt-1"
            >
              Listo, cerrar
            </button>
          )}

          {titulares.length === 0 && (
            <p className="text-[10px] text-slate-600">
              Define el once inicial antes de registrar cambios.
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
            <p className="text-xs text-slate-400 mt-1">Nacional vs {opponent}</p>
            <p className="text-sm font-semibold mt-2 text-blue-300">
              Resultado a guardar: <span className="text-white">{computedResult}</span>
            </p>
          </div>
          <p className="text-xs text-slate-500 text-center">
            El resultado se calcula automáticamente por el marcador. Esta acción no se puede deshacer.
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

/**
 * Campo de minuto. En el entretiempo dejarlo vacío significa "pasó en el
 * entretiempo"; escribir un minuto atribuye la incidencia al primer tiempo,
 * para cargar algo que se pasó por alto.
 */
function MinuteInput({
  value,
  onChange,
  enDescanso,
}: {
  value: string;
  onChange: (v: string) => void;
  enDescanso: boolean;
}) {
  return (
    <input
      type="number"
      inputMode="numeric"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={enDescanso ? "Min (vacío = entretiempo)" : "Minuto"}
      min={0}
      max={200}
      className={FIELD + " flex-1"}
    />
  );
}

// ════════════════════════════════════════════════════════════
// TARJETA EN VIVO — componente principal exportado
// ════════════════════════════════════════════════════════════
export default function LiveMatchCard({
  match,
  isAdmin,
  serverNow,
}: {
  match: LiveMatchData;
  isAdmin: boolean;
  serverNow: number;
}) {
  const clock: ClockState = {
    phase: match.phase,
    periodStartedAt: match.periodStartedAt,
    clockBaseSeconds: match.clockBaseSeconds,
    halfMinutes: match.halfMinutes,
  };
  const seconds = useMatchClock(clock, serverNow);
  const enAdicion = isStoppageTime(clock, seconds);
  const enPrevia = match.phase === "PRE";

  return (
    <div className="p-px rounded-2xl bg-gradient-to-br from-emerald-500/30 via-emerald-600/10 to-transparent">
      <div className="rounded-[15px] bg-gradient-to-br from-[#071A10] to-[#080D16] p-5 relative overflow-hidden">
        <div className="pointer-events-none absolute -right-8 -top-8 w-36 h-36 rounded-full bg-emerald-500/[0.08] blur-2xl" />

        {/* Header */}
        <div className="flex items-center justify-between mb-5 relative gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span
              className={`w-2 h-2 rounded-full shrink-0 ${
                enPrevia ? "bg-sky-400" : "bg-emerald-400 animate-pulse"
              }`}
            />
            <span
              className={`text-[10px] font-bold tracking-[0.18em] uppercase truncate ${
                enPrevia ? "text-sky-400/70" : "text-emerald-400/70"
              }`}
            >
              {enPrevia ? "Previa · comienza pronto" : "Partido en vivo"}
            </span>
          </div>
          {match.tournamentName && (
            <span className="text-[10px] text-slate-500 shrink-0">{match.tournamentName}</span>
          )}
        </div>

        {/* Marcador con reloj al centro */}
        <div className="flex items-start justify-between gap-3 relative mb-4">
          <div className="text-center flex-1 min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">
              Nacional
            </p>
            <p className="text-5xl font-semibold text-white leading-none" style={{ letterSpacing: "-0.02em" }}>
              {match.homeScore}
            </p>
          </div>

          <div className="shrink-0 text-center pt-1 w-24">
            {enPrevia ? (
              <p className="text-slate-600 font-bold text-xl">—</p>
            ) : (
              <p
                className={`text-xl font-bold tabular-nums leading-none ${
                  enAdicion ? "text-amber-400" : "text-white"
                }`}
                suppressHydrationWarning
              >
                {formatClock(seconds)}
              </p>
            )}
            <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500 mt-1.5">
              {PHASE_LABEL[match.phase]}
            </p>
            {match.venue && (
              <p className="text-[9px] text-slate-600 mt-1 leading-tight truncate">
                {match.venue}
              </p>
            )}
          </div>

          <div className="text-center flex-1 min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1 truncate">
              {match.opponent}
            </p>
            <p className="text-5xl font-semibold text-slate-400 leading-none" style={{ letterSpacing: "-0.02em" }}>
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
            phase={match.phase}
            liveMinute={clockMinute(seconds)}
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
