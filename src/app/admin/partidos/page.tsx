import { prisma } from "@/lib/prisma";
import Link from "next/link";
import DeleteMatchButton from "./_components/DeleteMatchButton";

export const metadata = { title: "Partidos · Admin · NacionApp" };

const STATUS_CONFIG = {
  PENDING:     { label: "Por jugar",  color: "text-slate-400  bg-white/5      border-white/10"        },
  IN_PROGRESS: { label: "En curso",   color: "text-emerald-300 bg-emerald-500/10 border-emerald-500/20" },
  FINISHED:    { label: "Finalizado", color: "text-blue-300   bg-blue-500/10  border-blue-500/20"     },
  POSTPONED:   { label: "Reagendado", color: "text-amber-300  bg-amber-500/10 border-amber-500/20"    },
};

const RESULT_LABEL = { WIN: "Victoria", LOSS: "Derrota", DRAW: "Empate" };
const RESULT_COLOR = { WIN: "text-emerald-300", LOSS: "text-red-300", DRAW: "text-amber-300" };

export default async function PartidosPage() {
  const matches = await prisma.match.findMany({
    orderBy: { date: "desc" },
    include: {
      _count: { select: { players: true } },
      tournament: { select: { name: true, year: true } },
    },
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-white tracking-tight">Partidos</h1>
          <p className="text-slate-500 text-sm mt-0.5">{matches.length} registrados</p>
        </div>
        <Link
          href="/admin/partidos/nuevo"
          className="inline-flex items-center gap-2 rounded-full bg-white hover:bg-white/90 text-[#050B14] font-semibold text-sm px-4 py-2 transition-colors"
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
                className={`rounded-2xl border px-5 py-4 transition-all duration-150 ${
                  isLive
                    ? "border-emerald-500/20 bg-emerald-500/[0.04]"
                    : "border-white/10 bg-white/[0.04]"
                }`}
              >
                <div className="flex items-start gap-4">
                  {/* Live pulse */}
                  {isLive && (
                    <div className="flex items-center pt-0.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-white text-sm">{match.opponent}</span>
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
                    <p className="text-xs text-slate-500 mt-1">
                      {match.tournament && (
                        <span className="text-blue-400/70 font-medium">
                          {match.tournament.name} {match.tournament.year}
                          {match.round != null ? ` · R${match.round}` : ""}
                          {match.fixtureRoundNumber != null ? ` · F${match.fixtureRoundNumber}` : ""}
                          {" · "}
                        </span>
                      )}
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
                        className="text-xs text-emerald-300 border border-emerald-500/20 hover:bg-emerald-500/10 rounded-full px-3 py-1.5 transition-colors font-medium"
                      >
                        Once inicial
                      </Link>
                    )}
                    <Link
                      href={`/admin/partidos/${match.id}`}
                      className="text-xs text-slate-400 hover:text-white border border-white/10 hover:border-white/20 rounded-full px-3 py-1.5 transition-all"
                    >
                      Editar
                    </Link>
                    <DeleteMatchButton matchId={match.id} opponent={match.opponent} />
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
