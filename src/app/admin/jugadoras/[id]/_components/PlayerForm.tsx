"use client";

import { useActionState } from "react";
import { updatePlayerAction, type PlayerFormState } from "../../actions";
import type { Profile } from "@/generated/prisma";

const POSITIONS = ["Portera", "Defensora", "Mediocampista", "Delantera"];

function toDateInput(d: Date | null | undefined): string {
  if (!d) return "";
  return new Date(d).toISOString().split("T")[0];
}

export default function PlayerForm({
  userId,
  profile,
}: {
  userId: string;
  profile: Profile | null;
}) {
  const [state, action, pending] = useActionState<PlayerFormState, FormData>(
    updatePlayerAction,
    undefined
  );

  return (
    <form action={action} className="space-y-8">
      <input type="hidden" name="userId" value={userId} />

      {/* Feedback */}
      {state?.error && (
        <div role="alert" className="rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-300">
          {state.error}
        </div>
      )}
      {state?.success && (
        <div role="status" className="rounded-lg bg-green-500/10 border border-green-500/20 px-4 py-3 text-sm text-green-300">
          {state.success}
        </div>
      )}

      {/* ── Información pública ──────────────────────── */}
      <section>
        <h2 className="text-xs uppercase tracking-widest text-slate-500 font-medium mb-4">
          Información pública
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Nombre" name="firstName" defaultValue={profile?.firstName} required />
          <Field label="Apellido" name="lastName" defaultValue={profile?.lastName} required />
          <Field label="Posición ideal" name="idealPosition" type="select" defaultValue={profile?.idealPosition ?? ""}>
            <option value="">Sin asignar</option>
            {POSITIONS.map((pos) => (
              <option key={pos} value={pos}>{pos}</option>
            ))}
          </Field>
          <Field label="Número de camiseta" name="number" type="number" defaultValue={profile?.number?.toString()} min="1" max="99" />
          <Field label="Fecha de nacimiento" name="birthdate" type="date" defaultValue={toDateInput(profile?.birthdate)} />
          <Field label="Año de incorporación" name="joiningYear" type="number" defaultValue={profile?.joiningYear?.toString()} min="2000" max="2030" />
          <Field label="Nacionalidad" name="nationality" defaultValue={profile?.nationality ?? "Argentina"} />
          <Field label="URL de foto (avatar)" name="avatarUrl" type="url" defaultValue={profile?.avatarUrl ?? ""} placeholder="https://..." />
        </div>
        <div className="mt-4">
          <label className="block text-sm text-slate-300 mb-1.5">Biografía pública</label>
          <textarea
            name="bio"
            rows={3}
            defaultValue={profile?.bio ?? ""}
            placeholder="Descripción breve visible al público..."
            className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500/50 resize-none"
          />
        </div>
      </section>

      {/* ── Información privada (solo admin) ─────────── */}
      <section className="border-t border-white/10 pt-6">
        <h2 className="text-xs uppercase tracking-widest text-amber-500/70 font-medium mb-1">
          Información privada — solo admins
        </h2>
        <p className="text-xs text-slate-500 mb-4">
          Estos campos no son visibles para el público ni para las jugadoras.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Estado físico" name="status" type="select" defaultValue={profile?.status ?? "AVAILABLE"}>
            <option value="AVAILABLE">✅ Disponible</option>
            <option value="INJURED">🚑 Lesionada</option>
          </Field>
        </div>
        <div className="mt-4">
          <label className="block text-sm text-slate-300 mb-1.5">
            Notas internas del cuerpo técnico
          </label>
          <textarea
            name="adminComments"
            rows={4}
            defaultValue={profile?.adminComments ?? ""}
            placeholder="Observaciones, lesiones, notas de seguimiento..."
            className="w-full rounded-lg bg-amber-500/5 border border-amber-500/20 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500/40 resize-none"
          />
        </div>
      </section>

      <div className="flex justify-end pt-2">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center gap-2 rounded-lg bg-sky-500 hover:bg-sky-400 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold text-sm px-6 py-2.5 transition-colors"
        >
          {pending ? (
            <>
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Guardando…
            </>
          ) : (
            "Guardar cambios"
          )}
        </button>
      </div>
    </form>
  );
}

// ── Helper Field component ──────────────────────────────
function Field({
  label,
  name,
  type = "text",
  defaultValue,
  required,
  children,
  ...rest
}: {
  label: string;
  name: string;
  type?: string;
  defaultValue?: string;
  required?: boolean;
  placeholder?: string;
  min?: string;
  max?: string;
  children?: React.ReactNode;
}) {
  const base =
    "w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500/50";

  return (
    <div>
      <label className="block text-sm text-slate-300 mb-1.5">
        {label}
        {required && <span className="text-red-400 ml-1">*</span>}
      </label>
      {type === "select" ? (
        <select name={name} defaultValue={defaultValue} className={base + " bg-slate-800"}>
          {children}
        </select>
      ) : (
        <input
          type={type}
          name={name}
          defaultValue={defaultValue}
          required={required}
          className={base}
          {...rest}
        />
      )}
    </div>
  );
}
