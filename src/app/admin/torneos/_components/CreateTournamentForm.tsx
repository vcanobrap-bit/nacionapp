"use client";

import { useActionState, useEffect, useRef } from "react";
import { createTournamentAction, type TournamentFormState } from "../actions";

export default function CreateTournamentForm() {
  const [state, action, pending] = useActionState<TournamentFormState, FormData>(
    createTournamentAction,
    undefined
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.success) formRef.current?.reset();
  }, [state?.success]);

  const field =
    "w-full rounded-xl bg-white/[0.04] border border-white/10 px-3 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/40 transition-all duration-150";

  return (
    <form ref={formRef} action={action} className="space-y-4">
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

      <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto] gap-3 items-end">
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wide">
            Nombre del campeonato <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            name="name"
            required
            placeholder="ej: Torneo Asociación Caupolicán"
            className={field}
          />
        </div>

        <div className="w-28">
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
            className={field}
          />
        </div>

        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center gap-2 rounded-full bg-white hover:bg-white/90 disabled:opacity-50 text-[#050B14] font-semibold text-sm px-5 py-2.5 transition-all duration-150 whitespace-nowrap"
        >
          {pending ? (
            <>
              <span className="w-3.5 h-3.5 border-2 border-[#050B14]/20 border-t-[#050B14] rounded-full animate-spin" />
              Creando…
            </>
          ) : (
            <>+ Agregar</>
          )}
        </button>
      </div>
    </form>
  );
}
