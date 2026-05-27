"use client";

import { useTransition } from "react";
import { toggleTournamentActiveAction, deleteTournamentAction } from "../actions";

export default function TournamentActions({
  tournamentId,
  tournamentName,
  isActive,
}: {
  tournamentId: string;
  tournamentName: string;
  isActive: boolean;
}) {
  const [isPendingToggle, startToggle] = useTransition();
  const [isPendingDelete, startDelete] = useTransition();

  function handleToggle() {
    startToggle(async () => { await toggleTournamentActiveAction(tournamentId); });
  }

  function handleDelete() {
    if (
      !confirm(
        `¿Eliminar el campeonato "${tournamentName}"?\n\nLos partidos asociados quedarán sin campeonato (no se eliminan).`
      )
    )
      return;
    startDelete(async () => { await deleteTournamentAction(tournamentId); });
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        disabled={isPendingToggle}
        onClick={handleToggle}
        className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors disabled:opacity-50 ${
          isActive
            ? "border-emerald-500/25 text-emerald-300 hover:bg-emerald-500/10"
            : "border-white/10 text-slate-400 hover:text-white hover:border-white/20"
        }`}
      >
        {isPendingToggle ? "…" : isActive ? "Activo" : "Inactivo"}
      </button>

      <button
        type="button"
        disabled={isPendingDelete}
        onClick={handleDelete}
        className="text-xs text-red-400 border border-red-500/20 hover:bg-red-500/10 disabled:opacity-50 rounded-full px-3 py-1.5 transition-colors"
      >
        {isPendingDelete ? "Eliminando…" : "Eliminar"}
      </button>
    </div>
  );
}
