import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import MatchForm from "../_components/MatchForm";
import ConvocatoriaForm, { type ConvocatoriaPlayer } from "./_components/ConvocatoriaForm";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const match = await prisma.match.findUnique({ where: { id } });
  if (!match) return { title: "Partido no encontrado" };
  return { title: `vs ${match.opponent} · Admin · NacionApp` };
}

export default async function EditMatchPage({ params }: Props) {
  const { id } = await params;

  const [match, allPlayers, tournaments] = await Promise.all([
    prisma.match.findUnique({
      where: { id },
      include: {
        players: { select: { userId: true } },
      },
    }),
    prisma.user.findMany({
      where: { role: "PLAYER" },
      include: { profile: true },
      orderBy: { profile: { lastName: "asc" } },
    }),
    prisma.tournament.findMany({
      select: { id: true, name: true, year: true },
      orderBy: [{ year: "desc" }, { name: "asc" }],
    }),
  ]);

  if (!match) notFound();

  const convocadoIds = new Set(match.players.map((pm) => pm.userId));

  // Ordenar: posición → apellido
  const positionOrder = ["Portera", "Defensora", "Mediocampista", "Delantera"];
  const players: ConvocatoriaPlayer[] = allPlayers
    .map((u) => ({
      userId: u.id,
      firstName: u.profile?.firstName ?? "",
      lastName: u.profile?.lastName ?? "",
      number: u.profile?.number ?? null,
      idealPosition: u.profile?.idealPosition ?? null,
      avatarUrl: u.profile?.avatarUrl ?? null,
      isConvocado: convocadoIds.has(u.id),
    }))
    .sort((a, b) => {
      const ai = positionOrder.indexOf(a.idealPosition ?? "");
      const bi = positionOrder.indexOf(b.idealPosition ?? "");
      if (ai !== bi) return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
      return a.lastName.localeCompare(b.lastName);
    });

  const isLive = match.status === "IN_PROGRESS";

  return (
    <div className="max-w-2xl">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-slate-500 mb-6">
        <Link href="/admin/partidos" className="hover:text-white transition-colors">
          Partidos
        </Link>
        <span>/</span>
        <span className="text-white">vs {match.opponent}</span>
      </nav>

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          {isLive && <span className="w-2.5 h-2.5 rounded-full bg-green-400 animate-pulse shrink-0" />}
          <h1 className="text-2xl font-bold text-white">vs {match.opponent}</h1>
        </div>
        {isLive && (
          <Link
            href={`/admin/partidos/${match.id}/once`}
            className="inline-flex items-center gap-2 rounded-lg border border-green-500/30 bg-green-500/10 text-green-300 hover:bg-green-500/20 text-sm font-medium px-4 py-2 transition-colors"
          >
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            Once inicial
          </Link>
        )}
      </div>

      {/* Match form */}
      <MatchForm match={match} tournaments={tournaments} />

      {/* Convocatoria */}
      <section className="mt-10 border-t border-white/10 pt-8">
        <div className="mb-5">
          <h2 className="text-lg font-semibold text-white">Convocatoria</h2>
          <p className="text-xs text-slate-500 mt-1">
            Seleccioná las jugadoras que participan en este partido.
            {isLive && (
              <> Una vez convocadas podés <Link href={`/admin/partidos/${id}/once`} className="text-green-300 hover:text-white underline underline-offset-2">armar el once inicial</Link>.</>
            )}
          </p>
        </div>

        <ConvocatoriaForm matchId={id} players={players} />
      </section>
    </div>
  );
}
