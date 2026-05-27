import { prisma } from "@/lib/prisma";
import CreateTournamentForm from "./_components/CreateTournamentForm";
import TournamentActions from "./_components/TournamentActions";

export const metadata = { title: "Campeonatos · Admin · NacionApp" };

export default async function TorneosPage() {
  const tournaments = await prisma.tournament.findMany({
    orderBy: [{ year: "desc" }, { name: "asc" }],
    include: { _count: { select: { matches: true } } },
  });

  return (
    <div className="max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-white tracking-tight">Campeonatos</h1>
        <p className="text-slate-500 text-sm mt-0.5">
          {tournaments.length} registrado{tournaments.length !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Formulario de creación */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 mb-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-4">
          Nuevo campeonato
        </p>
        <CreateTournamentForm />
      </div>

      {/* Lista */}
      {tournaments.length === 0 ? (
        <p className="text-slate-500 text-sm text-center py-12">
          No hay campeonatos registrados todavía.
        </p>
      ) : (
        <div className="space-y-2">
          {tournaments.map((t) => (
            <div
              key={t.id}
              className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-4"
            >
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-white text-sm truncate">
                  {t.name}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {t.year} · {t._count.matches} partido{t._count.matches !== 1 ? "s" : ""}
                </p>
              </div>
              <TournamentActions
                tournamentId={t.id}
                tournamentName={`${t.name} ${t.year}`}
                isActive={t.isActive}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
