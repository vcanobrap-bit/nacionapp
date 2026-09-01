"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  saveStandingsAction,
  deleteStandingsSnapshotAction,
  type StandingsFormState,
} from "@/lib/actions/torneos";
import { parseStandingsText, isOurTeam, formatAsOf } from "@/lib/standings";
import type { TournamentData, StandingsData } from "@/app/page";
import ModalPortal from "./ModalPortal";

const FIELD =
  "w-full rounded-xl bg-white/[0.04] border border-white/10 px-3 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-sky-500/40 focus:border-sky-500/40 transition-all duration-150";

/** Hoy en formato YYYY-MM-DD, con la fecha local (no UTC). */
function hoyLocal(): string {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

// ── Form de carga con previsualización ─────────────────────────────────────
function StandingsForm({
  tournaments,
  onSuccess,
}: {
  tournaments: TournamentData[];
  onSuccess: () => void;
}) {
  const [state, action, pending] = useActionState<StandingsFormState, FormData>(
    saveStandingsAction,
    undefined
  );
  const [text, setText] = useState("");

  useEffect(() => {
    if (state?.success) onSuccess();
  }, [state?.success, onSuccess]);

  // La previsualización usa el MISMO parser que el servidor: lo que se ve es
  // lo que se guarda.
  const { rows, errors } = parseStandingsText(text);
  const activo = tournaments.find((t) => t.isActive) ?? tournaments[0];

  return (
    <form action={action} className="space-y-3">
      {state?.error && (
        <div role="alert" className="rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-300">
          {state.error}
        </div>
      )}

      <div className="grid grid-cols-[1fr_auto] gap-2">
        <div className="min-w-0">
          <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wide">
            Campeonato
          </label>
          <select name="tournamentId" defaultValue={activo?.id ?? ""} className={FIELD + " [color-scheme:dark] bg-slate-900/80"}>
            {tournaments.map((t) => (
              <option key={t.id} value={t.id}>{t.name} {t.year}</option>
            ))}
          </select>
        </div>
        <div className="w-36">
          <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wide">
            Fecha de la tabla
          </label>
          <input type="date" name="asOf" required defaultValue={hoyLocal()} className={FIELD + " [color-scheme:dark]"} />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wide">
          Equipos y puntos <span className="text-slate-600 normal-case tracking-normal">— uno por línea; se ordenan solos por puntos</span>
        </label>
        <textarea
          name="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={8}
          placeholder={"Nacional 45\nArturo Prat 42\nDeportivo Lota 38"}
          className={FIELD + " font-mono text-xs resize-y"}
        />
      </div>

      {/* Previsualización */}
      {(rows.length > 0 || errors.length > 0) && (
        <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] overflow-hidden">
          {rows.map((r) => (
            <div
              key={r.position}
              className={`flex items-center gap-3 px-3 py-1.5 text-xs border-b border-white/[0.04] last:border-b-0 ${
                isOurTeam(r.teamName) ? "bg-sky-500/[0.08]" : ""
              }`}
            >
              <span className="w-5 text-right text-slate-600 font-bold tabular-nums">{r.position}</span>
              <span className={`flex-1 truncate ${isOurTeam(r.teamName) ? "text-sky-200 font-bold" : "text-slate-300"}`}>
                {r.teamName}
              </span>
              <span className="text-slate-400 font-semibold tabular-nums">{r.points}</span>
            </div>
          ))}
          {errors.map((e) => (
            <div key={e.line} className="px-3 py-1.5 text-xs text-red-300 bg-red-500/[0.06]">
              Línea {e.line} no se entiende: <span className="font-mono">{e.text}</span>
            </div>
          ))}
        </div>
      )}

      <button
        type="submit"
        disabled={pending || rows.length < 2 || errors.length > 0}
        className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-white font-semibold text-sm px-6 py-2.5 transition-all duration-150"
      >
        {pending ? (
          <>
            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Guardando…
          </>
        ) : rows.length > 0 ? (
          `Guardar tabla (${rows.length} equipos)`
        ) : (
          "Guardar tabla"
        )}
      </button>
    </form>
  );
}

// ── Tablas ya cargadas (para deshacer) ─────────────────────────────────────
function SnapshotRow({ s }: { s: StandingsData }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    if (!confirm(`¿Borrar la tabla de ${s.tournamentName} del ${formatAsOf(s.asOf)}?\n\nSi hay una publicación anterior, volverá a mostrarse esa.`)) return;
    startTransition(async () => {
      await deleteStandingsSnapshotAction(s.id);
      router.refresh();
    });
  }

  return (
    <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-white truncate">{s.tournamentName}</p>
        <p className="text-[10px] text-slate-500">{formatAsOf(s.asOf)} · {s.rows.length} equipos</p>
      </div>
      <button
        type="button"
        onClick={handleDelete}
        disabled={isPending}
        title="Borrar esta tabla"
        className="shrink-0 w-6 h-6 flex items-center justify-center rounded-full text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-all disabled:opacity-40"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5">
          <path d="M5.28 4.22a.75.75 0 0 0-1.06 1.06L6.94 8l-2.72 2.72a.75.75 0 1 0 1.06 1.06L8 9.06l2.72 2.72a.75.75 0 1 0 1.06-1.06L9.06 8l2.72-2.72a.75.75 0 0 0-1.06-1.06L8 6.94 5.28 4.22Z" />
        </svg>
      </button>
    </div>
  );
}

// ── Modal ───────────────────────────────────────────────────────────────────
export default function StandingsModal({
  tournaments,
  standings,
}: {
  tournaments: TournamentData[];
  standings: StandingsData[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-sky-300 border border-sky-500/20 bg-sky-500/[0.06] hover:bg-sky-500/[0.12] hover:border-sky-500/30 px-3.5 py-2 rounded-full transition-all duration-150"
      >
        📋 Actualizar tabla
      </button>

      {open && (
        <ModalPortal>
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setOpen(false)} />

          <div className="relative w-full max-w-md bg-[#080D16] border border-white/[0.08] rounded-2xl shadow-2xl max-h-[88vh] flex flex-col">
            <div className="flex items-start justify-between p-5 shrink-0">
              <div>
                <h2 className="text-base font-semibold text-white leading-snug">Tabla oficial</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Transcribe la tabla que publica la asociación
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors shrink-0 mt-0.5"
                aria-label="Cerrar"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                  <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
                </svg>
              </button>
            </div>

            <div className="overflow-y-auto flex-1 px-5 pb-5 space-y-5">
              <StandingsForm
                tournaments={tournaments}
                onSuccess={() => { setOpen(false); router.refresh(); }}
              />

              {standings.length > 0 && (
                <div className="space-y-2 border-t border-white/[0.06] pt-4">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600">
                    Tablas vigentes
                  </p>
                  {standings.map((s) => <SnapshotRow key={s.id} s={s} />)}
                </div>
              )}
            </div>
          </div>
        </div>
        </ModalPortal>
      )}
    </>
  );
}
