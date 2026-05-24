"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import type { Match, MatchStatus, MatchResult } from "@/generated/prisma";
import { createMatchAction, updateMatchAction, type MatchFormState } from "../actions";

interface Props {
  match?: Match;
}

function toDatetimeLocal(d: Date | string | null | undefined): string {
  if (!d) return "";
  return new Date(d).toISOString().slice(0, 16);
}

const STATUS_OPTIONS: { value: MatchStatus; label: string }[] = [
  { value: "PENDING",     label: "Por jugar"  },
  { value: "IN_PROGRESS", label: "En curso"   },
  { value: "FINISHED",    label: "Finalizado" },
];

const RESULT_OPTIONS: { value: MatchResult | ""; label: string }[] = [
  { value: "",     label: "Seleccioná un resultado" },
  { value: "WIN",  label: "Victoria"                },
  { value: "LOSS", label: "Derrota"                 },
  { value: "DRAW", label: "Empate"                  },
];

export default function MatchForm({ match }: Props) {
  const action = match ? updateMatchAction : createMatchAction;
  const [state, formAction, pending] = useActionState<MatchFormState, FormData>(
    action,
    undefined
  );

  const [status, setStatus] = useState<MatchStatus>(match?.status ?? "PENDING");

  const isFinished   = status === "FINISHED";
  const isInProgress = status === "IN_PROGRESS";

  // Shared input class
  const field =
    "w-full rounded-xl bg-white/[0.04] border border-white/10 px-3 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/40 transition-all duration-150";

  return (
    <form action={formAction} className="space-y-5">
      {match && <input type="hidden" name="matchId" value={match.id} />}

      {state?.error && (
        <div role="alert" className="rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-300">
          {state.error}
        </div>
      )}
      {state?.success && (
        <div role="status" className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-4 py-3 text-sm text-emerald-300">
          {state.success}
        </div>
      )}

      {/* Datos básicos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wide">
            Rival <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            name="opponent"
            required
            defaultValue={match?.opponent}
            placeholder="Nombre del equipo rival"
            className={field}
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wide">
            Fecha y hora <span className="text-red-400">*</span>
          </label>
          <input
            type="datetime-local"
            name="date"
            required
            defaultValue={toDatetimeLocal(match?.date)}
            className={field + " [color-scheme:dark]"}
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wide">
            Estadio / Cancha
          </label>
          <input
            type="text"
            name="venue"
            defaultValue={match?.venue ?? ""}
            placeholder="Opcional"
            className={field}
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wide">
            Estado
          </label>
          <select
            name="status"
            value={status}
            onChange={(e) => setStatus(e.target.value as MatchStatus)}
            className={field + " [color-scheme:dark]"}
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* CTA once inicial — solo cuando EN CURSO */}
      {isInProgress && match && (
        <div className="flex items-center gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.06] px-5 py-4">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-emerald-300">Partido en curso</p>
            <p className="text-xs text-emerald-400/60 mt-0.5">
              Podés armar el once inicial con las jugadoras convocadas.
            </p>
          </div>
          <Link
            href={`/admin/partidos/${match.id}/once`}
            className="text-xs font-semibold text-emerald-300 border border-emerald-500/20 hover:bg-emerald-500/10 rounded-full px-4 py-1.5 transition-colors whitespace-nowrap"
          >
            Once inicial →
          </Link>
        </div>
      )}

      {/* Resultado — solo cuando FINALIZADO */}
      {isFinished && (
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 space-y-4">
          <p className="text-xs uppercase tracking-widest text-slate-500 font-medium">
            Resultado del partido
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-1">
              <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wide">
                Resultado <span className="text-red-400">*</span>
              </label>
              <select
                name="result"
                defaultValue={match?.result ?? ""}
                className={field + " [color-scheme:dark]"}
                required
              >
                {RESULT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
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
                className={field}
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
                className={field}
              />
            </div>
          </div>
        </div>
      )}

      {/* Notas internas */}
      <div>
        <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wide">
          Notas internas
        </label>
        <textarea
          name="notes"
          rows={2}
          defaultValue={match?.notes ?? ""}
          placeholder="Observaciones del partido..."
          className={field + " resize-none"}
        />
      </div>

      <div className="flex justify-end">
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
          ) : match ? "Guardar cambios" : "Crear partido"}
        </button>
      </div>
    </form>
  );
}
