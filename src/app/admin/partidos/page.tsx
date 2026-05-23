import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { deleteMatchAction } from "./actions";

export const metadata = { title: "Partidos · Admin · NacionApp" };

const STATUS_CONFIG = {
  PENDING:     { label: "Por jugar",  color: "text-slate-300  bg-slate-500/10  border-slate-500/20" },
  IN_PROGRESS: { label: "En curso",   color: "text-green-300  bg-green-500/10  border-green-500/20" },
  FINISHED:    { label: "Finalizado", color: "text-slate-400  bg-slate-500/5   border-slate-500/10" },
};

const RESULT_LABEL = { WIN: "Victoria", LOSS: "Derrota", DRAW: "Empate" };
const RESULT_COLOR = { WIN: "text-green-300", LOSS: "text-red-300", DRAW: "text-yellow-300" };

export default async function PartidosPage() {
  const matches = await prisma.match.findMany({
    orderBy: { date: "desc" },
    include: { _count: { select: { players: true } } },
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Partidos</h1>
          <p className="text-slate-400 text-sm mt-0.5">{matches.length} registrados</p>
        </div>
        <Link
          href="/admin/partidos/nuevo"
          className="inline-flex items-center gap-2 rounded-lg bg-sky-500 hover:bg-sky-400 text-white font-semibold text-sm px-4 py-2 transition-colors"
        >
          <span>+</span> Nuevo partido
        </Link>
      </div>

      {matches.length === 0 ? (
        <p className="text-slate-500 text-sm">No hay partidos aún.</p>
      ) : (
        <div className="space-y-3">
          {matches.map((match) => {
            const st = STATUS_CONFIG[match.status];
            const isLive = match.status === "IN_PROGRESS";

            return (
              <div
                key={match.id}
                className={`rounded-xl border ${isLive ? "border-green-500/30 bg-green-500/5" : "border-white/10 bg-white/5"} px-5 py-4`}
              >
                <div className="flex items-start gap-4">
                  {/* Live pulse */}
                  {isLive && (
                    <div className="flex items-center pt-0.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-green-400 animate-pulse" />
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-white">{match.opponent}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${st.color}`}>
                        {st.label}
                      </span>
                      {match.result && (
                        <span className={`text-xs font-bold ${RESULT_COLOR[match.result]}`}>
                          {RESULT_LABEL[match.result]}
                          {match.homeScore != null && match.awayScore != null
                            ? ` ${match.homeScore}-${match.awayScore}`
                            : ""}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      {new Date(match.date).toLocaleDateString("es-AR", {
                        weekday: "long",
                        day: "2-digit",
                        month: "long",
                        year: "numeric",
                      })}
                      {match.venue ? ` · ${match.venue}` : ""}
                      {` · ${match._count.players} jugadoras`}
                    </p>
                  </div>

                  {/* Acciones */}
                  <div className="flex items-center gap-2 shrink-0">
                    {match.status === "IN_PROGRESS" && (
                      <Link
                        href={`/admin/partidos/${match.id}/once`}
                        className="text-xs text-green-300 border border-green-500/30 hover:bg-green-500/10 rounded-lg px-3 py-1.5 transition-colors font-medium"
                      >
                        Once inicial
                      </Link>
                    )}
                    <Link
                      href={`/admin/partidos/${match.id}`}
                      className="text-xs text-slate-300 border border-white/10 hover:bg-white/10 rounded-lg px-3 py-1.5 transition-colors"
                    >
                      Editar
                    </Link>
                    <form
                      action={async () => {
                        "use server";
                        await deleteMatchAction(match.id);
                      }}
                    >
                      <button
                        type="submit"
                        className="text-xs text-red-400 border border-red-500/20 hover:bg-red-500/10 rounded-lg px-3 py-1.5 transition-colors"
                        onClick={(e) => {
                          if (!confirm(`¿Eliminar partido vs ${match.opponent}?`)) {
                            e.preventDefault();
                          }
                        }}
                      >
                        Eliminar
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
