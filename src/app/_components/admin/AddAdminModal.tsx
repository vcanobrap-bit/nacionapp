"use client";

import { useActionState, useEffect, useState } from "react";
import { createAdminAction, type AdminFormState } from "@/app/admin/jugadoras/actions";

// ── Inner form ──────────────────────────────────────────────────────────────
function AddAdminForm({ onSuccess }: { onSuccess: () => void }) {
  const [state, action, pending] = useActionState<AdminFormState, FormData>(
    createAdminAction,
    undefined
  );

  useEffect(() => {
    if (state?.success) onSuccess();
  }, [state?.success, onSuccess]);

  const FIELD =
    "w-full rounded-xl bg-white/[0.04] border border-white/10 px-3 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-sky-500/40 focus:border-sky-500/40 transition-all duration-150";

  return (
    <form action={action} className="space-y-4">
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

      <div>
        <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wide">
          Usuario / Email <span className="text-red-400">*</span>
        </label>
        <input
          type="text"
          name="email"
          required
          placeholder="admin@ejemplo.com"
          className={FIELD}
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wide">
          Contraseña <span className="text-red-400">*</span>
        </label>
        <input
          type="password"
          name="password"
          required
          placeholder="Mín. 6 caracteres"
          className={FIELD}
        />
      </div>

      <div className="flex justify-end pt-2 border-t border-white/[0.06]">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center gap-2 rounded-full bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-white font-semibold text-sm px-6 py-2.5 transition-all duration-150"
        >
          {pending ? (
            <>
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Creando…
            </>
          ) : (
            "Crear administrador"
          )}
        </button>
      </div>
    </form>
  );
}

// ── Modal wrapper ───────────────────────────────────────────────────────────
export default function AddAdminModal() {
  const [open, setOpen]       = useState(false);
  const [modalKey, setModalKey] = useState(0);

  function openModal() {
    setModalKey((k) => k + 1);
    setOpen(true);
  }

  return (
    <>
      <button
        type="button"
        onClick={openModal}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-300 border border-amber-500/20 bg-amber-500/[0.06] hover:bg-amber-500/[0.12] hover:border-amber-500/30 px-3.5 py-2 rounded-full transition-all duration-150"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="w-3.5 h-3.5"
        >
          <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
        </svg>
        Agregar Administrador
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />

          <div className="relative w-full max-w-sm bg-[#080D16] border border-amber-500/20 rounded-2xl shadow-2xl p-6">
            <div className="flex items-start justify-between mb-5">
              <div>
                <h2 className="text-base font-semibold text-white leading-snug">
                  Nuevo Administrador
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Acceso completo al panel de gestión
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors shrink-0"
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

            <AddAdminForm key={modalKey} onSuccess={() => setOpen(false)} />

            <button
              type="button"
              onClick={() => setOpen(false)}
              className="mt-3 w-full text-center text-xs text-slate-500 hover:text-slate-300 transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </>
  );
}
