"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createTournamentAction,
  toggleTournamentActiveAction,
  deleteTournamentAction,
  type TournamentFormState,
} from "@/lib/actions/torneos";
import type { TournamentData } from "@/app/page";
import ModalPortal from "./ModalPortal";

const FIELD =
  "w-full rounded-xl bg-white/[0.04] border border-white/10 px-3 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-sky-500/40 focus:border-sky-500/40 transition-all duration-150";

// ── Form de creación ────────────────────────────────────────────────────────
function CreateTournamentForm({ onSuccess }: { onSuccess: () => void }) {
  const [state, action, pending] = useActionState<TournamentFormState, FormData>(
    createTournamentAction,
    undefined
  );

  useEffect(() => {
    if (state?.success) onSuccess();
  }, [state?.success, onSuccess]);

  return (
    <form action={action} className="space-y-3">
      {state?.error && (
        <div
          role="alert"
          className="rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-300"
        >
          {state.error}
        </div>
      )}
      {state?.success && (
        <div
          role="status"
          className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-4 py-3 text-sm text-emerald-300"
        >
          {state.success}
        </div>
      )}

      <div className="grid grid-cols-[1fr_auto] gap-2">
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wide">
            Nombre <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            name="name"
            required
            placeholder="ej: Torneo Apertura"
            className={FIELD}
          />
        </div>
        <div className="w-24">
          <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wide">
            Año <span className="text-red-400">*</span>
          </label>
          <input
            type="number"
            name="year"
            required
            min="2000"
            max="2100"
            defaultValue={new Date().getFullYear()}
            className={FIELD}
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={pending}
        className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-white font-semibold text-sm px-6 py-2.5 transition-all duration-150"
      >
        {pending ? (
          <>
            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Creando…
          </>
        ) : (
          "Crear campeonato"
        )}
      </button>
    </form>
  );
}

// ── Fila de campeonato existente ────────────────────────────────────────────
function TournamentRow({ tournament }: { tournament: TournamentData }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleToggle() {
    startTransition(async () => {
      const res = await toggleTournamentActiveAction(tournament.id);
      if (res.error) setError(res.error);
      else router.refresh();
    });
  }

  function handleDelete() {
    if (
      !confirm(
        `¿Eliminar el campeonato "${tournament.name} ${tournament.year}"?\n\n` +
          `Los partidos asociados NO se borran: quedan sin campeonato.`
      )
    )
      return;

    startTransition(async () => {
      const res = await deleteTournamentAction(tournament.id);
      if (res.error) setError(res.error);
      else router.refresh();
    });
  }

  return (
    <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-white truncate">
          {tournament.name}{" "}
          <span className="text-slate-500 font-normal">{tournament.year}</span>
        </p>
        {error && <p className="text-[10px] text-red-400 mt-0.5">{error}</p>}
      </div>

      <button
        type="button"
        onClick={handleToggle}
        disabled={isPending}
        title={tournament.isActive ? "Desactivar" : "Activar"}
        className={`shrink-0 text-[10px] font-bold px-2.5 py-1 rounded-full border transition-all disabled:opacity-40 ${
          tournament.isActive
            ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-300 hover:bg-emerald-500/20"
            : "bg-white/5 border-white/10 text-slate-500 hover:bg-white/10"
        }`}
      >
        {tournament.isActive ? "Activo" : "Inactivo"}
      </button>

      <button
        type="button"
        onClick={handleDelete}
        disabled={isPending}
        title="Eliminar campeonato"
        className="shrink-0 w-6 h-6 flex items-center justify-center rounded-full text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-all disabled:opacity-40"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 16 16"
          fill="currentColor"
          className="w-3.5 h-3.5"
        >
          <path d="M5.28 4.22a.75.75 0 0 0-1.06 1.06L6.94 8l-2.72 2.72a.75.75 0 1 0 1.06 1.06L8 9.06l2.72 2.72a.75.75 0 1 0 1.06-1.06L9.06 8l2.72-2.72a.75.75 0 0 0-1.06-1.06L8 6.94 5.28 4.22Z" />
        </svg>
      </button>
    </div>
  );
}

// ── Modal ───────────────────────────────────────────────────────────────────
export default function TournamentModal({
  tournaments,
}: {
  tournaments: TournamentData[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [formKey, setFormKey] = useState(0);

  function openModal() {
    setFormKey((k) => k + 1);
    setOpen(true);
  }

  return (
    <>
      <button
        type="button"
        onClick={openModal}
        title="Gestionar campeonatos"
        className="shrink-0 inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white border border-white/10 hover:border-white/20 px-3 py-1.5 rounded-full transition-all duration-150"
      >
        🏆 Campeonatos
      </button>

      {open && (
        <ModalPortal>
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />

          <div className="relative w-full max-w-md bg-[#080D16] border border-white/[0.08] rounded-2xl shadow-2xl max-h-[85vh] flex flex-col">
            <div className="flex items-start justify-between p-5 shrink-0">
              <div>
                <h2 className="text-base font-semibold text-white leading-snug">
                  Campeonatos
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Crea y gestiona los torneos del club
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors shrink-0 mt-0.5"
                aria-label="Cerrar"
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

            <div className="overflow-y-auto flex-1 px-5 pb-5 space-y-5">
              <CreateTournamentForm
                key={formKey}
                onSuccess={() => {
                  setFormKey((k) => k + 1);
                  router.refresh();
                }}
              />

              <div className="space-y-2 border-t border-white/[0.06] pt-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600">
                  Existentes ({tournaments.length})
                </p>
                {tournaments.length === 0 ? (
                  <p className="text-xs text-slate-600 py-2">
                    Todavía no hay campeonatos.
                  </p>
                ) : (
                  tournaments.map((t) => (
                    <TournamentRow key={t.id} tournament={t} />
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
        </ModalPortal>
      )}
    </>
  );
}
