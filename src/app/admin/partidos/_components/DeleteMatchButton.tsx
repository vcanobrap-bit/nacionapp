"use client";

import { useTransition } from "react";
import { deleteMatchAction } from "../actions";

export default function DeleteMatchButton({
  matchId,
  opponent,
}: {
  matchId: string;
  opponent: string;
}) {
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    if (!confirm(`¿Eliminar partido vs ${opponent}?`)) return;
    startTransition(() => deleteMatchAction(matchId));
  }

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={handleClick}
      className="text-xs text-red-400 border border-red-500/20 hover:bg-red-500/10 disabled:opacity-50 rounded-full px-3 py-1.5 transition-colors"
    >
      {isPending ? "Eliminando…" : "Eliminar"}
    </button>
  );
}
