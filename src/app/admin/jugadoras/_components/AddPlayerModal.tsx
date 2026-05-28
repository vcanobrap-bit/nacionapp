"use client";

import { useActionState, useEffect, useState } from "react";
import { createPlayerAction, type PlayerFormState } from "../actions";

const POSITIONS = ["Portera", "Defensora", "Mediocampista", "Delantera"];

// ── Inner form — se remonta con `key` al abrir el modal ────────────────────
function AddPlayerForm({ onSuccess }: { onSuccess: () => void }) {
  const [state, action, pending] = useActionState<PlayerFormState, FormData>(
    createPlayerAction,
    undefined
  );

  useEffect(() => {
    if (state?.success) onSuccess();
  }, [state?.success, onSuccess]);

  return (
    <form action={action} className="space-y-4">
      {state?.error && (
        <div
          role="alert"
          className="rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-300"
        >
          {state.error}
        </div>
      )}

      {/* Nombre y Apellido */}
      <div className="grid grid-cols-2 gap-3">
        <MField label="Nombre" name="firstName" required />
        <MField label="Apellido" name="lastName" required />
      </div>

      {/* Fecha e ingreso */}
      <div className="grid grid-cols-2 gap-3">
        <MField label="Fecha de nacimiento" name="birthdate" type="date" />
        <MField
          label="Año de ingreso"
          name="joiningYear"
          type="number"
          min="2000"
          max="2030"
          placeholder="2024"
        />
      </div>

      {/* Posición y número */}
      <div className="grid grid-cols-2 gap-3">
        <MField label="Posición ideal" name="idealPosition" type="select">
          <option value="">Sin asignar</option>
          {POSITIONS.map((pos) => (
            <option key={pos} value={pos}>
              {pos}
            </option>
          ))}
        </MField>
        <MField
          label="Nº de camiseta"
          name="number"
          type="number"
          min="1"
          max="99"
          placeholder="10"
        />
      </div>

      <div className="flex justify-end gap-3 pt-2 border-t border-white/[0.06]">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center gap-2 bg-sky-500 hover:bg-sky-400 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold text-sm px-5 py-2 rounded-lg transition-colors"
        >
          {pending ? (
            <>
              <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Creando…
            </>
          ) : (
            "Crear jugadora"
          )}
        </button>
      </div>
    </form>
  );
}

// ── Modal wrapper ───────────────────────────────────────────────────────────
export default function AddPlayerModal() {
  const [open, setOpen] = useState(false);
  const [modalKey, setModalKey] = useState(0);

  function openModal() {
    setModalKey((k) => k + 1); // remonta el form → estado limpio
    setOpen(true);
  }

  return (
    <>
      {/* Trigger */}
      <button
        type="button"
        onClick={openModal}
        className="inline-flex items-center gap-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-white font-semibold text-sm px-4 py-2 transition-colors"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="w-4 h-4"
        >
          <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
        </svg>
        Agregar jugadora
      </button>

      {/* Overlay + dialog */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />

          {/* Panel */}
          <div className="relative w-full max-w-lg bg-slate-900 border border-white/10 rounded-2xl shadow-2xl p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-lg font-semibold text-white">Nueva jugadora</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Perfil deportivo — sin acceso a la plataforma.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                aria-label="Cerrar"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                  <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
                </svg>
              </button>
            </div>

            {/* Form (remontado cada vez que se abre) */}
            <AddPlayerForm key={modalKey} onSuccess={() => setOpen(false)} />

            {/* Cancel link dentro del panel */}
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

// ── Helper field ────────────────────────────────────────────────────────────
function MField({
  label,
  name,
  type = "text",
  required,
  children,
  ...rest
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
  min?: string;
  max?: string;
  children?: React.ReactNode;
}) {
  const base =
    "w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500/50 transition-colors";

  return (
    <div>
      <label className="block text-xs text-slate-400 mb-1.5">
        {label}
        {required && <span className="text-red-400 ml-1">*</span>}
      </label>
      {type === "select" ? (
        <select name={name} className={base + " bg-slate-800/80"}>
          {children}
        </select>
      ) : (
        <input
          type={type}
          name={name}
          required={required}
          className={base}
          {...rest}
        />
      )}
    </div>
  );
}
