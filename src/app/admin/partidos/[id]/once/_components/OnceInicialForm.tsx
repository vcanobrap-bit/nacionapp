"use client";

import { useState, useTransition } from "react";
import { saveOnceInicialAction } from "../../../actions";

interface Player {
  userId: string;
  isTitular: boolean;
  firstName: string;
  lastName: string;
  number: number | null;
  idealPosition: string | null;
  avatarUrl: string | null;
}

export default function OnceInicialForm({
  matchId,
  players,
}: {
  matchId: string;
  players: Player[];
}) {
  const [titulares, setTitulares] = useState<Set<string>>(
    new Set(players.filter((p) => p.isTitular).map((p) => p.userId))
  );
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  function toggle(userId: string) {
    setTitulares((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) {
        next.delete(userId);
      } else {
        if (next.size >= 11) {
          setMessage({ type: "error", text: "Ya seleccionaste 11 titulares." });
          return prev;
        }
        next.add(userId);
      }
      setMessage(null);
      return next;
    });
  }

  function handleSave() {
    startTransition(async () => {
      const result = await saveOnceInicialAction(matchId, Array.from(titulares));
      if (result.error) setMessage({ type: "error", text: result.error });
      else setMessage({ type: "success", text: result.success ?? "Guardado." });
    });
  }

  const count = titulares.size;

  return (
    <div className="space-y-4">
      {/* Counter */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-400">
          <span className={`font-bold text-lg ${count === 11 ? "text-green-400" : "text-sky-300"}`}>
            {count}
          </span>
          {" "}/ 11 titulares seleccionadas
        </p>
        <button
          onClick={handleSave}
          disabled={isPending || count === 0}
          className="inline-flex items-center gap-2 rounded-lg bg-green-600 hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm px-5 py-2 transition-colors"
        >
          {isPending ? (
            <>
              <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Guardando…
            </>
          ) : (
            "Guardar once inicial"
          )}
        </button>
      </div>

      {/* Feedback */}
      {message && (
        <div
          role={message.type === "error" ? "alert" : "status"}
          className={`rounded-lg px-4 py-3 text-sm border ${
            message.type === "error"
              ? "bg-red-500/10 border-red-500/20 text-red-300"
              : "bg-green-500/10 border-green-500/20 text-green-300"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Player grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {players.map((p) => {
          const selected = titulares.has(p.userId);
          return (
            <button
              key={p.userId}
              type="button"
              onClick={() => toggle(p.userId)}
              className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-all ${
                selected
                  ? "border-sky-500/50 bg-sky-500/10 ring-1 ring-sky-500/30"
                  : "border-white/10 bg-white/5 hover:bg-white/10"
              }`}
            >
              {/* Avatar */}
              <div className="w-10 h-10 rounded-full bg-slate-700 border border-white/10 overflow-hidden shrink-0 flex items-center justify-center text-base">
                {p.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.avatarUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  "👟"
                )}
              </div>

              <div className="flex-1 min-w-0">
                <p className={`font-semibold text-sm truncate ${selected ? "text-sky-200" : "text-white"}`}>
                  {p.firstName} {p.lastName}
                </p>
                <p className="text-xs text-slate-400 truncate">
                  {p.number ? `#${p.number} · ` : ""}
                  {p.idealPosition ?? "Sin posición"}
                </p>
              </div>

              {/* Checkbox visual */}
              <div
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                  selected
                    ? "border-sky-400 bg-sky-500"
                    : "border-slate-600 bg-transparent"
                }`}
              >
                {selected && (
                  <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none">
                    <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
