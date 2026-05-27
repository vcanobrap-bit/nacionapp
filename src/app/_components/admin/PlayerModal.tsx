"use client";

import { useActionState, useState, useEffect, useTransition, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  createPlayerAction,
  updatePlayerAction,
  deletePlayerAction,
  type PlayerFormState,
} from "@/app/admin/jugadoras/actions";
import type { PlayerData } from "@/app/page";

// ── Shared styles ──────────────────────────────────────────────────────────
const FIELD =
  "w-full rounded-xl bg-white/[0.04] border border-white/10 px-3 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-sky-500/40 focus:border-sky-500/40 transition-all duration-150";

const POSITIONS = ["Portera", "Defensora", "Mediocampista", "Delantera"];

function toDateInput(iso: string | null | undefined): string {
  if (!iso) return "";
  return new Date(iso).toISOString().split("T")[0];
}

// ── Helper field ───────────────────────────────────────────────────────────
function F({
  label,
  name,
  type = "text",
  required,
  defaultValue,
  children,
  className,
  ...rest
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  defaultValue?: string;
  placeholder?: string;
  min?: string;
  max?: string;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wide">
        {label}
        {required && <span className="text-red-400 ml-1">*</span>}
      </label>
      {type === "select" ? (
        <select
          name={name}
          defaultValue={defaultValue}
          className={FIELD + " [color-scheme:dark] bg-slate-900/80 " + (className ?? "")}
        >
          {children}
        </select>
      ) : type === "textarea" ? (
        <textarea
          name={name}
          defaultValue={defaultValue}
          className={FIELD + " resize-none " + (className ?? "")}
          {...(rest as React.TextareaHTMLAttributes<HTMLTextAreaElement>)}
        />
      ) : (
        <input
          type={type}
          name={name}
          required={required}
          defaultValue={defaultValue}
          className={FIELD + " " + (className ?? "")}
          {...(rest as React.InputHTMLAttributes<HTMLInputElement>)}
        />
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// FORM — CREAR
// ════════════════════════════════════════════════════════════
function CreateForm({ onSuccess }: { onSuccess: () => void }) {
  const [state, formAction, pending] = useActionState<PlayerFormState, FormData>(
    createPlayerAction,
    undefined
  );

  useEffect(() => {
    if (state?.success) onSuccess();
  }, [state?.success, onSuccess]);

  return (
    <form action={formAction} className="space-y-4">
      {state?.error && (
        <div
          role="alert"
          className="rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-300"
        >
          {state.error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <F label="Nombre" name="firstName" required />
        <F label="Apellido" name="lastName" required />
      </div>

      <F
        label="Email"
        name="email"
        type="email"
        required
        placeholder="jugadora@ejemplo.com"
      />
      <F
        label="Contraseña inicial"
        name="password"
        type="password"
        required
        placeholder="Mín. 6 caracteres"
      />

      <div className="grid grid-cols-2 gap-3">
        <F label="Fecha de nacimiento" name="birthdate" type="date" />
        <F
          label="Año de ingreso"
          name="joiningYear"
          type="number"
          min="2000"
          max="2030"
          placeholder="2024"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <F label="Posición ideal" name="idealPosition" type="select">
          <option value="">Sin asignar</option>
          {POSITIONS.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </F>
        <F
          label="Nº camiseta"
          name="number"
          type="number"
          min="1"
          max="99"
          placeholder="10"
        />
      </div>

      <div className="flex justify-end pt-2 border-t border-white/[0.06]">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center gap-2 rounded-full bg-white hover:bg-white/90 disabled:opacity-50 text-[#050B14] font-semibold text-sm px-6 py-2.5 transition-all duration-150"
        >
          {pending ? (
            <>
              <span className="w-4 h-4 border-2 border-[#050B14]/20 border-t-[#050B14] rounded-full animate-spin" />
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

// ════════════════════════════════════════════════════════════
// FORM — EDITAR
// ════════════════════════════════════════════════════════════
function EditForm({
  player,
  onSuccess,
  onDeleteSuccess,
}: {
  player: PlayerData;
  onSuccess: () => void;
  onDeleteSuccess: () => void;
}) {
  const [state, formAction, pending] = useActionState<PlayerFormState, FormData>(
    updatePlayerAction,
    undefined
  );
  const [deleting, startDelete] = useTransition();

  useEffect(() => {
    if (state?.success) onSuccess();
  }, [state?.success, onSuccess]);

  function handleDelete() {
    if (
      !confirm(
        `¿Eliminar a ${player.firstName} ${player.lastName} del plantel?\n\nEsta acción eliminará su perfil y todo el historial de partidos. No se puede deshacer.`
      )
    )
      return;
    startDelete(async () => {
      await deletePlayerAction(player.id);
      onDeleteSuccess();
    });
  }

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="userId" value={player.id} />

      {state?.error && (
        <div
          role="alert"
          className="rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-300"
        >
          {state.error}
        </div>
      )}

      {/* ── Información pública ─────────────────────────────── */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-3">
          Información pública
        </p>
        <div className="grid grid-cols-2 gap-3">
          <F
            label="Nombre"
            name="firstName"
            required
            defaultValue={player.firstName}
          />
          <F
            label="Apellido"
            name="lastName"
            required
            defaultValue={player.lastName}
          />
          <F
            label="Posición ideal"
            name="idealPosition"
            type="select"
            defaultValue={player.idealPosition ?? ""}
          >
            <option value="">Sin asignar</option>
            {POSITIONS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </F>
          <F
            label="Nº camiseta"
            name="number"
            type="number"
            min="1"
            max="99"
            defaultValue={player.number?.toString() ?? ""}
            placeholder="10"
          />
          <F
            label="Fecha de nacimiento"
            name="birthdate"
            type="date"
            defaultValue={toDateInput(player.birthdate)}
          />
          <F
            label="Año de ingreso"
            name="joiningYear"
            type="number"
            min="2000"
            max="2030"
            defaultValue={player.joiningYear?.toString() ?? ""}
          />
          <div className="col-span-2">
            <F
              label="URL de foto (avatar)"
              name="avatarUrl"
              type="url"
              defaultValue={player.avatarUrl ?? ""}
              placeholder="https://..."
            />
          </div>
          <F
            label="Nacionalidad"
            name="nationality"
            defaultValue="Argentina"
          />
        </div>
      </div>

      {/* ── Información privada (admin) ─────────────────────── */}
      <div className="border-t border-white/[0.06] pt-4">
        <p className="text-xs font-semibold uppercase tracking-widest text-amber-500/70 mb-3">
          Admin — privado
        </p>
        <F
          label="Estado físico"
          name="status"
          type="select"
          defaultValue={player.status ?? "AVAILABLE"}
        >
          <option value="AVAILABLE">✅ Disponible</option>
          <option value="INJURED">🚑 Lesionada</option>
        </F>
        <div className="mt-3">
          <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wide">
            Notas internas
          </label>
          <textarea
            name="adminComments"
            rows={3}
            defaultValue={player.adminComments ?? ""}
            placeholder="Observaciones, lesiones, seguimiento…"
            className={
              FIELD +
              " resize-none bg-amber-500/[0.03] border-amber-500/20 focus:ring-amber-500/40 focus:border-amber-500/40"
            }
          />
        </div>
      </div>

      {/* ── Actions ─────────────────────────────────────────── */}
      <div className="flex items-center justify-between pt-2 border-t border-white/[0.06]">
        <button
          type="button"
          onClick={handleDelete}
          disabled={deleting}
          className="text-xs text-red-400 hover:text-red-300 border border-red-500/20 hover:bg-red-500/[0.08] px-3 py-1.5 rounded-full transition-all disabled:opacity-50"
        >
          {deleting ? "Eliminando…" : "Eliminar jugadora"}
        </button>
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center gap-2 rounded-full bg-white hover:bg-white/90 disabled:opacity-50 text-[#050B14] font-semibold text-sm px-6 py-2.5 transition-all duration-150"
        >
          {pending ? (
            <>
              <span className="w-4 h-4 border-2 border-[#050B14]/20 border-t-[#050B14] rounded-full animate-spin" />
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

// ════════════════════════════════════════════════════════════
// MODAL PRINCIPAL
// ════════════════════════════════════════════════════════════
export default function PlayerModal({
  isOpen,
  onClose,
  player,
}: {
  isOpen: boolean;
  onClose: () => void;
  player?: PlayerData; // undefined = crear nueva
}) {
  const router = useRouter();
  const [formKey, setFormKey] = useState(0);
  const isEdit = !!player;

  useEffect(() => {
    if (isOpen) setFormKey((k) => k + 1);
  }, [isOpen, player?.id]);

  const handleSuccess = useCallback(() => {
    onClose();
    router.refresh();
  }, [onClose, router]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Dialog */}
      <div className="relative w-full sm:max-w-lg bg-[#080D16] border border-white/[0.08] rounded-t-3xl sm:rounded-2xl shadow-2xl max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-white/[0.06] shrink-0">
          <div>
            <h2 className="text-base font-semibold text-white leading-snug">
              {isEdit
                ? `${player.firstName} ${player.lastName}`
                : "Nueva jugadora"}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {isEdit
                ? "Editá el perfil y datos del cuerpo técnico"
                : "Se crea con rol Jugadora — no puede acceder como admin"}
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
              <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z"
              />
            </svg>
          </button>
        </div>

        {/* Content — scrollable */}
        <div className="overflow-y-auto flex-1 p-5">
          {isEdit ? (
            <EditForm
              key={formKey}
              player={player}
              onSuccess={handleSuccess}
              onDeleteSuccess={handleSuccess}
            />
          ) : (
            <CreateForm key={formKey} onSuccess={handleSuccess} />
          )}
        </div>
      </div>
    </div>
  );
}
