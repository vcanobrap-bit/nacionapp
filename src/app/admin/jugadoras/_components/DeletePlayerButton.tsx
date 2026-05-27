"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { deletePlayerAction } from "../actions";

export default function DeletePlayerButton({
  userId,
  playerName,
}: {
  userId: string;
  playerName: string;
}) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleClick() {
    if (
      !confirm(
        `¿Eliminar a ${playerName} del plantel?\n\nEsta acción eliminará su perfil y todo el historial de partidos. No se puede deshacer.`
      )
    )
      return;

    startTransition(async () => {
      const result = await deletePlayerAction(userId);
      if (!result.error) {
        router.push("/admin/jugadoras");
      }
    });
  }

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={handleClick}
      className="inline-flex items-center gap-1.5 text-xs text-red-400 border border-red-500/20 hover:bg-red-500/10 hover:border-red-500/40 disabled:opacity-50 disabled:cursor-not-allowed rounded-full px-3 py-1.5 transition-colors"
    >
      {isPending ? (
        <>
          <span className="w-3 h-3 border border-red-400/40 border-t-red-400 rounded-full animate-spin" />
          Eliminando…
        </>
      ) : (
        <>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 16 16"
            fill="currentColor"
            className="w-3 h-3"
          >
            <path
              fillRule="evenodd"
              d="M5 3.25V4H2.75a.75.75 0 0 0 0 1.5h.3l.815 8.15A1.5 1.5 0 0 0 5.357 15h5.285a1.5 1.5 0 0 0 1.493-1.35l.815-8.15h.3a.75.75 0 0 0 0-1.5H11v-.75A2.25 2.25 0 0 0 8.75 1h-1.5A2.25 2.25 0 0 0 5 3.25Zm2.25-.75a.75.75 0 0 0-.75.75V4h3v-.75a.75.75 0 0 0-.75-.75h-1.5ZM6.05 6a.75.75 0 0 1 .787.713l.275 5.5a.75.75 0 0 1-1.498.075l-.275-5.5A.75.75 0 0 1 6.05 6Zm3.9 0a.75.75 0 0 1 .712.787l-.275 5.5a.75.75 0 0 1-1.498-.075l.275-5.5a.75.75 0 0 1 .786-.711Z"
              clipRule="evenodd"
            />
          </svg>
          Eliminar jugadora
        </>
      )}
    </button>
  );
}
