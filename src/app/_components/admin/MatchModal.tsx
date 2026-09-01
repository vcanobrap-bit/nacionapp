"use client";

import { useActionState, useState, useEffect, useTransition, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  createMatchAction,
  updateMatchAction,
  deleteMatchAction,
  setTitularesAction,
  type MatchFormState,
} from "@/lib/actions/partidos";
import type { MatchData, PlayerData, TournamentData } from "@/app/page";

// ── Shared styles ──────────────────────────────────────────────────────────
const FIELD =
  "w-full rounded-xl bg-white/[0.04] border border-white/10 px-3 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/40 transition-all duration-150";

function toDatetimeLocal(iso: string | null | undefined): string {
  if (!iso) return "";
  return new Date(iso).toISOString().slice(0, 16);
}

type MatchStatus = "PENDING" | "IN_PROGRESS" | "FINISHED" | "POSTPONED";
type Tab = "partido" | "once";

const POSITION_ORDER = ["Portera", "Defensora", "Mediocampista", "Delantera"];

// ════════════════════════════════════════════════════════════
// TAB 1 — FORM DEL PARTIDO
// ════════════════════════════════════════════════════════════
function PartidoForm({
  match,
  tournaments,
  onSuccess,
  onDeleteSuccess,
}: {
  match?: MatchData;
  tournaments: TournamentData[];
  /** `needsLineup`: quedó en curso y todavía no tiene once inicial cargado. */
  onSuccess: (info: { needsLineup: boolean }) => void;
  onDeleteSuccess: () => void;
}) {
  const action = match ? updateMatchAction : createMatchAction;
  const [state, formAction, pending] = useActionState<MatchFormState, FormData>(
    action,
    undefined
  );
  const [status, setStatus] = useState<MatchStatus>(
    (match?.status ?? "PENDING") as MatchStatus
  );
  const [deleting, startDelete] = useTransition();

  // La pregunta correcta es "¿quedó en curso SIN once?", no "¿acaba de pasar a
  // en curso?". La segunda dependía de comparar con `match.status`, y ese prop
  // se refresca DENTRO de la acción (updateMatchAction llama a revalidatePath),
  // así que al correr este efecto el partido ya figuraba en curso y la
  // comparación daba falso: el prompt nunca aparecía. El once, en cambio, no
  // cambia al guardar el partido, así que la decisión es estable.
  const lineupCount = match?.currentTitularIds?.length ?? 0;
  useEffect(() => {
    if (state?.success) {
      onSuccess({ needsLineup: status === "IN_PROGRESS" && lineupCount === 0 });
    }
  }, [state?.success, onSuccess, status, lineupCount]);

  function handleDelete() {
    if (!match) return;
    if (
      !confirm(
        `¿Eliminar el partido vs ${match.opponent}?\n\nEsta acción no se puede deshacer.`
      )
    )
      return;
    startDelete(async () => {
      await deleteMatchAction(match.id);
      onDeleteSuccess();
    });
  }

  return (
    <form action={formAction} className="space-y-5">
      {match && <input type="hidden" name="matchId" value={match.id} />}

      {state?.error && (
        <div
          role="alert"
          className="rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-300"
        >
          {state.error}
        </div>
      )}

      {/* ── Datos básicos ───────────────────────────────────── */}
      {/* Una columna en móvil: el input datetime-local de iOS tiene un ancho
          mínimo propio y en dos columnas se desborda sobre el campo vecino.
          `min-w-0` deja que los hijos del grid se encojan en pantallas grandes. */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="min-w-0">
          <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wide">
            Rival <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            name="opponent"
            required
            defaultValue={match?.opponent}
            placeholder="Brasil"
            className={FIELD}
          />
        </div>
        <div className="min-w-0">
          <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wide">
            Fecha y hora <span className="text-red-400">*</span>
          </label>
          <input
            type="datetime-local"
            name="date"
            required
            defaultValue={toDatetimeLocal(match?.date)}
            className={FIELD + " [color-scheme:dark]"}
          />
        </div>
        <div className="min-w-0">
          <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wide">
            Estadio / Cancha
          </label>
          <input
            type="text"
            name="venue"
            defaultValue={match?.venue ?? ""}
            placeholder="Opcional"
            className={FIELD}
          />
        </div>
        <div className="min-w-0">
          <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wide">
            Estado
          </label>
          <select
            name="status"
            value={status}
            onChange={(e) => setStatus(e.target.value as MatchStatus)}
            className={FIELD + " [color-scheme:dark] bg-slate-900/80"}
          >
            <option value="PENDING">Por jugar</option>
            <option value="IN_PROGRESS">En curso</option>
            <option value="FINISHED">Finalizado</option>
            <option value="POSTPONED">Reagendado</option>
          </select>
          {status === "POSTPONED" && (
            <p className="text-[10px] text-amber-400/70 mt-1.5 leading-snug">
              El partido no se mostrará como próximo hasta que le asignes
              una nueva fecha y lo vuelvas a &quot;Por jugar&quot;.
            </p>
          )}
        </div>
      </div>

      {/* ── Campeonato ─────────────────────────────────────── */}
      <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4 space-y-3">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-600">
          Campeonato
        </p>
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-3 sm:col-span-1">
            <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wide">
              Torneo
            </label>
            <select
              name="tournamentId"
              defaultValue={match?.tournamentId ?? ""}
              className={FIELD + " [color-scheme:dark] bg-slate-900/80"}
            >
              <option value="">Sin campeonato</option>
              {tournaments.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} {t.year}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wide">
              Rueda
            </label>
            <input
              type="number"
              name="round"
              min="1"
              max="10"
              defaultValue={match?.round?.toString() ?? ""}
              placeholder="1"
              className={FIELD}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wide">
              Fecha Nº
            </label>
            <input
              type="number"
              name="fixtureRoundNumber"
              min="1"
              max="100"
              defaultValue={match?.fixtureRoundNumber?.toString() ?? ""}
              placeholder="5"
              className={FIELD}
            />
          </div>
        </div>

        <div className="w-40">
          <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wide">
            Minutos por tiempo
          </label>
          <input
            type="number"
            name="halfMinutes"
            min="1"
            max="60"
            defaultValue={(match?.halfMinutes ?? 30).toString()}
            className={FIELD}
          />
          <p className="text-[10px] text-slate-600 mt-1 leading-snug">
            Define dónde retoma el reloj en el 2do tiempo.
          </p>
        </div>
      </div>

      {/* ── Resultado — solo FINISHED ───────────────────────── */}
      {status === "FINISHED" && (
        <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-600">
            Resultado del partido
          </p>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wide">
                Resultado <span className="text-red-400">*</span>
              </label>
              <select
                name="result"
                defaultValue={match?.result ?? ""}
                required
                className={FIELD + " [color-scheme:dark] bg-slate-900/80"}
              >
                <option value="">Selecciona</option>
                <option value="WIN">Victoria</option>
                <option value="LOSS">Derrota</option>
                <option value="DRAW">Empate</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wide">
                Goles propios
              </label>
              <input
                type="number"
                name="homeScore"
                min="0"
                defaultValue={match?.homeScore?.toString() ?? ""}
                placeholder="0"
                className={FIELD}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wide">
                Goles rival
              </label>
              <input
                type="number"
                name="awayScore"
                min="0"
                defaultValue={match?.awayScore?.toString() ?? ""}
                placeholder="0"
                className={FIELD}
              />
            </div>
          </div>
        </div>
      )}

      {/* ── Notas internas ──────────────────────────────────── */}
      <div>
        <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wide">
          Notas internas
        </label>
        <textarea
          name="notes"
          rows={2}
          defaultValue={match?.notes ?? ""}
          placeholder="Observaciones del partido…"
          className={FIELD + " resize-none"}
        />
      </div>

      {/* ── Actions ─────────────────────────────────────────── */}
      <div className="flex items-center justify-between pt-2 border-t border-white/[0.06]">
        {match ? (
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="text-xs text-red-400 hover:text-red-300 border border-red-500/20 hover:bg-red-500/[0.08] px-3 py-1.5 rounded-full transition-all disabled:opacity-50"
          >
            {deleting ? "Eliminando…" : "Eliminar partido"}
          </button>
        ) : (
          <div />
        )}
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center gap-2 rounded-full bg-white hover:bg-white/90 disabled:opacity-50 text-[#050B14] font-semibold text-sm px-6 py-2.5 transition-all duration-150"
        >
          {pending ? (
            <>
              <span className="w-4 h-4 border-2 border-[#050B14]/20 border-t-[#050B14] rounded-full animate-spin" />
              {match ? "Guardando…" : "Creando…"}
            </>
          ) : match ? (
            "Guardar cambios"
          ) : (
            "Crear partido"
          )}
        </button>
      </div>
    </form>
  );
}

// ════════════════════════════════════════════════════════════
// TAB 2 — ONCE INICIAL
// ════════════════════════════════════════════════════════════
function OnceInicialPanel({
  matchId,
  players,
  currentTitularIds,
  onSaved,
}: {
  matchId: string;
  players: PlayerData[];
  currentTitularIds: string[];
  /** Se llama tras guardar con éxito: la app lleva al inicio a ver la tarjeta en vivo. */
  onSaved: () => void;
}) {
  const router = useRouter();
  const [titulares, setTitulares] = useState<Set<string>>(
    new Set(currentTitularIds)
  );
  const [msg, setMsg] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [isPending, startTransition] = useTransition();

  function toggle(userId: string) {
    setTitulares((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) {
        next.delete(userId);
      } else {
        if (next.size >= 11) {
          setMsg({ type: "error", text: "Ya seleccionaste 11 titulares." });
          return prev;
        }
        next.add(userId);
      }
      setMsg(null);
      return next;
    });
  }

  function handleSave() {
    startTransition(async () => {
      const result = await setTitularesAction(matchId, Array.from(titulares));
      if (result.error) {
        setMsg({ type: "error", text: result.error });
      } else {
        router.refresh();
        onSaved();
      }
    });
  }

  // Agrupar jugadoras por posición
  const groups: Record<string, PlayerData[]> = {};
  for (const p of players) {
    const pos = p.idealPosition ?? "Sin posición";
    if (!groups[pos]) groups[pos] = [];
    groups[pos].push(p);
  }
  const sortedGroups = [
    ...POSITION_ORDER.filter((k) => groups[k]),
    ...Object.keys(groups).filter(
      (k) => !POSITION_ORDER.includes(k) && groups[k]
    ),
  ];

  return (
    <div className="space-y-4">
      {/* Counter + save */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-400">
          <span
            className={`font-bold text-lg tabular-nums ${
              titulares.size === 11 ? "text-emerald-400" : "text-sky-300"
            }`}
          >
            {titulares.size}
          </span>{" "}
          / 11 titulares
        </p>
        <button
          type="button"
          onClick={handleSave}
          disabled={isPending}
          className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/90 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold text-xs px-4 py-2 transition-all"
        >
          {isPending ? (
            <>
              <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Guardando…
            </>
          ) : (
            "Guardar once"
          )}
        </button>
      </div>

      {msg && (
        <div
          role={msg.type === "error" ? "alert" : "status"}
          className={`rounded-xl px-4 py-3 text-sm border ${
            msg.type === "error"
              ? "bg-red-500/10 border-red-500/20 text-red-300"
              : "bg-emerald-500/10 border-emerald-500/20 text-emerald-300"
          }`}
        >
          {msg.text}
        </div>
      )}

      {/* Player grid by position */}
      {sortedGroups.map((pos) => (
        <div key={pos}>
          <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">
            {pos}s
          </p>
          <div className="grid grid-cols-2 gap-2">
            {groups[pos].map((p) => {
              const selected = titulares.has(p.id);
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => toggle(p.id)}
                  className={`flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left transition-all duration-150 ${
                    selected
                      ? "border-sky-500/40 bg-sky-500/[0.08] hover:bg-sky-500/[0.12]"
                      : "border-white/10 bg-white/[0.04] hover:bg-white/[0.07]"
                  }`}
                >
                  {/* Avatar */}
                  <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 overflow-hidden shrink-0 flex items-center justify-center text-sm">
                    {p.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={p.avatarUrl}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      "👟"
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-xs font-semibold truncate leading-tight ${
                        selected ? "text-sky-200" : "text-white"
                      }`}
                    >
                      {p.firstName} {p.lastName}
                    </p>
                    {p.number != null && (
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        #{p.number}
                      </p>
                    )}
                  </div>
                  {/* Checkbox visual */}
                  <div
                    className={`w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center transition-all ${
                      selected
                        ? "border-sky-400 bg-sky-500"
                        : "border-slate-600"
                    }`}
                  >
                    {selected && (
                      <svg
                        className="w-2.5 h-2.5 text-white"
                        viewBox="0 0 12 12"
                        fill="none"
                      >
                        <path
                          d="M2 6l3 3 5-5"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ))}

      {players.length === 0 && (
        <p className="text-sm text-slate-500 text-center py-6">
          No hay jugadoras en el plantel todavía.
        </p>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// MODAL PRINCIPAL
// ════════════════════════════════════════════════════════════
type MatchModalProps = {
  isOpen: boolean;
  onClose: () => void;
  /** Tras guardar el once: cerrar y llevar al inicio, donde está la tarjeta en vivo. */
  onLineupSaved: () => void;
  match?: MatchData;
  tournaments: TournamentData[];
  players: PlayerData[];
  initialTab?: Tab;
};

/**
 * Wrapper: monta el contenido solo cuando el modal está abierto, con una key
 * derivada del partido y la pestaña inicial. Así todo el estado interno
 * (pestaña activa, formulario) arranca limpio en cada apertura, sin necesidad
 * de resetearlo desde un efecto.
 */
export default function MatchModal(props: MatchModalProps) {
  if (!props.isOpen) return null;
  return (
    <MatchModalContent
      key={`${props.match?.id ?? "new"}:${props.initialTab ?? "partido"}`}
      {...props}
    />
  );
}

function MatchModalContent({
  onClose,
  onLineupSaved,
  match,
  tournaments,
  players,
  initialTab = "partido",
}: MatchModalProps) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>(initialTab);
  /**
   * El partido quedó en curso sin once inicial: en vez de cerrar, se ofrece
   * cargarlo ahí mismo, para no dejar a la usuaria buscando dónde seguir.
   * Mientras está activo, el formulario se desmonta: si siguiera montado, su
   * efecto de éxito se volvería a disparar en cada refresh y esto se abriría en
   * bucle.
   */
  const [askOnce, setAskOnce] = useState(false);

  const isEdit = !!match;
  const isInProgress = match?.status === "IN_PROGRESS";
  const showOnceTab = isEdit && isInProgress;

  const closeAndRefresh = useCallback(() => {
    onClose();
    router.refresh();
  }, [onClose, router]);

  const handleSaved = useCallback(
    ({ needsLineup }: { needsLineup: boolean }) => {
      if (needsLineup && isEdit) {
        setAskOnce(true);
        router.refresh();
      } else {
        closeAndRefresh();
      }
    },
    [isEdit, router, closeAndRefresh]
  );

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Dialog */}
      <div className="relative w-full sm:max-w-2xl bg-[#080D16] border border-white/[0.08] rounded-t-3xl sm:rounded-2xl shadow-2xl max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between p-5 shrink-0">
          <div>
            <h2 className="text-base font-semibold text-white leading-snug">
              {isEdit ? `vs ${match.opponent}` : "Nuevo partido"}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {isEdit
                ? "Modifica los datos del partido"
                : "Completa los datos del nuevo partido"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors shrink-0 mt-0.5"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="w-5 h-5"
            >
              <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
            </svg>
          </button>
        </div>

        {/* Tabs — solo cuando IN_PROGRESS en modo edición */}
        {showOnceTab && !askOnce && (
          <div className="flex px-5 gap-2 pb-3 border-b border-white/[0.06] shrink-0">
            <button
              onClick={() => setTab("partido")}
              className={`text-xs font-semibold px-3.5 py-1.5 rounded-full border transition-all duration-150 ${
                tab === "partido"
                  ? "bg-white text-[#050B14] border-white"
                  : "border-white/10 text-slate-400 hover:text-white hover:border-white/20"
              }`}
            >
              Partido
            </button>
            <button
              onClick={() => setTab("once")}
              className={`text-xs font-semibold px-3.5 py-1.5 rounded-full border transition-all duration-150 ${
                tab === "once"
                  ? "bg-white text-[#050B14] border-white"
                  : "border-white/10 text-slate-400 hover:text-white hover:border-white/20"
              }`}
            >
              ⚽ Once inicial
            </button>
          </div>
        )}

        {/* Content — scrollable */}
        <div className="overflow-y-auto flex-1 p-5">
          {askOnce && (
            <div className="space-y-4 py-2">
              <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.06] p-5 text-center">
                <p className="text-2xl mb-2">🏟️</p>
                <h3 className="text-base font-semibold text-white leading-snug">
                  El partido quedó en previa
                </h3>
                <p className="text-sm text-slate-400 mt-2 leading-relaxed">
                  ¿Quieres cargar el once inicial ahora? Así queda publicado
                  antes del pitazo y el reloj arranca desde la tarjeta en vivo.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setAskOnce(false);
                  setTab("once");
                }}
                className="w-full rounded-full bg-emerald-500 hover:bg-emerald-400 text-white font-semibold text-sm py-3 transition-all"
              >
                ⚽ Cargar el once inicial
              </button>
              <button
                type="button"
                onClick={closeAndRefresh}
                className="w-full text-xs text-slate-500 hover:text-slate-300 transition-colors py-1"
              >
                Completar después
              </button>
            </div>
          )}
          {tab === "partido" && !askOnce && (
            <PartidoForm
              match={match}
              tournaments={tournaments}
              onSuccess={handleSaved}
              onDeleteSuccess={closeAndRefresh}
            />
          )}
          {tab === "once" && !askOnce && match && (
            <OnceInicialPanel
              matchId={match.id}
              players={players}
              currentTitularIds={match.currentTitularIds ?? []}
              onSaved={onLineupSaved}
            />
          )}
        </div>
      </div>
    </div>
  );
}
