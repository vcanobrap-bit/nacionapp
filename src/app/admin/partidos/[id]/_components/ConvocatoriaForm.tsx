"use client";

import { useState } from "react";
import { addPlayerToMatchAction, removePlayerFromMatchAction } from "../../actions";

export interface ConvocatoriaPlayer {
  userId: string;
  firstName: string;
  lastName: string;
  number: number | null;
  idealPosition: string | null;
  avatarUrl: string | null;
  isConvocado: boolean;
}

const POSITION_ORDER = ["Portera", "Defensora", "Mediocampista", "Delantera"];

const POSITION_COLOR: Record<string, string> = {
  Portera:       "text-amber-300",
  Defensora:     "text-sky-300",
  Mediocampista: "text-emerald-300",
  Delantera:     "text-rose-300",
};

export default function ConvocatoriaForm({
  matchId,
  players,
}: {
  matchId: string;
  players: ConvocatoriaPlayer[];
}) {
  const [convocados, setConvocados] = useState<Set<string>>(
    new Set(players.filter((p) => p.isConvocado).map((p) => p.userId))
  );
  const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  async function toggle(userId: string) {
    const wasConvocado = convocados.has(userId);

    // Optimistic update
    setConvocados((prev) => {
      const next = new Set(prev);
      wasConvocado ? next.delete(userId) : next.add(userId);
      return next;
    });
    setLoadingIds((prev) => new Set([...prev, userId]));
    setError(null);

    try {
      const result = wasConvocado
        ? await removePlayerFromMatchAction(matchId, userId)
        : await addPlayerToMatchAction(matchId, userId);
      if (result.error) {
        // Revert
        setConvocados((prev) => {
          const next = new Set(prev);
          wasConvocado ? next.add(userId) : next.delete(userId);
          return next;
        });
        setError(result.error);
      }
    } catch {
      // Revert
      setConvocados((prev) => {
        const next = new Set(prev);
        wasConvocado ? next.add(userId) : next.delete(userId);
        return next;
      });
      setError("Error al actualizar la convocatoria.");
    } finally {
      setLoadingIds((prev) => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
    }
  }

  const convocadoCount = convocados.size;

  // Group by position
  const groups = POSITION_ORDER.map((pos) => ({
    pos,
    players: players.filter((p) => p.idealPosition === pos),
  })).filter((g) => g.players.length > 0);

  const sinPosicion = players.filter(
    (p) => !p.idealPosition || !POSITION_ORDER.includes(p.idealPosition)
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-400">
          <span className={`font-bold text-base tabular-nums ${convocadoCount > 0 ? "text-sky-300" : "text-slate-500"}`}>
            {convocadoCount}
          </span>{" "}
          {convocadoCount === 1 ? "jugadora convocada" : "jugadoras convocadas"}
        </p>
      </div>

      {/* Error */}
      {error && (
        <div role="alert" className="rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {/* No players */}
      {players.length === 0 && (
        <p className="text-sm text-slate-500">No hay jugadoras en el plantel.</p>
      )}

      {/* Position groups */}
      {groups.map(({ pos, players: group }) => (
        <div key={pos}>
          <p className={`text-xs uppercase tracking-wider font-semibold mb-2 ${POSITION_COLOR[pos] ?? "text-slate-400"}`}>
            {pos}s
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {group.map((p) => (
              <PlayerToggle
                key={p.userId}
                player={p}
                selected={convocados.has(p.userId)}
                isLoading={loadingIds.has(p.userId)}
                onToggle={() => toggle(p.userId)}
              />
            ))}
          </div>
        </div>
      ))}

      {sinPosicion.length > 0 && (
        <div>
          <p className="text-xs uppercase tracking-wider font-semibold mb-2 text-slate-400">
            Sin posición
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {sinPosicion.map((p) => (
              <PlayerToggle
                key={p.userId}
                player={p}
                selected={convocados.has(p.userId)}
                isLoading={loadingIds.has(p.userId)}
                onToggle={() => toggle(p.userId)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function PlayerToggle({
  player,
  selected,
  isLoading,
  onToggle,
}: {
  player: ConvocatoriaPlayer;
  selected: boolean;
  isLoading: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      disabled={isLoading}
      onClick={onToggle}
      className={`flex items-center gap-3 rounded-xl border px-3.5 py-3 text-left transition-all disabled:opacity-60 ${
        selected
          ? "border-sky-500/40 bg-sky-500/10 hover:bg-sky-500/20"
          : "border-white/10 bg-white/5 hover:bg-white/10"
      }`}
    >
      {/* Avatar */}
      <div className="w-9 h-9 rounded-full bg-slate-700 border border-white/10 overflow-hidden shrink-0 flex items-center justify-center text-sm">
        {player.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={player.avatarUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          "👟"
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium truncate leading-tight ${selected ? "text-sky-200" : "text-white"}`}>
          {player.firstName} {player.lastName}
        </p>
        <p className="text-xs text-slate-500 truncate mt-0.5">
          {player.number ? `#${player.number}` : ""}
          {player.number && player.idealPosition ? " · " : ""}
          {player.idealPosition ?? "Sin posición"}
        </p>
      </div>

      {/* Toggle indicator */}
      <div
        className={`w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center transition-all ${
          isLoading
            ? "border-slate-500"
            : selected
              ? "border-sky-400 bg-sky-500"
              : "border-slate-600"
        }`}
      >
        {isLoading ? (
          <span className="w-2.5 h-2.5 border border-slate-400 border-t-white rounded-full animate-spin" />
        ) : selected ? (
          <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none">
            <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ) : null}
      </div>
    </button>
  );
}
