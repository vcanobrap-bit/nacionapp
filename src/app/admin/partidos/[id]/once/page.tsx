import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import OnceInicialForm from "./_components/OnceInicialForm";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const match = await prisma.match.findUnique({ where: { id } });
  if (!match) return { title: "Partido no encontrado" };
  return { title: `Once inicial · vs ${match.opponent} · Admin` };
}

export default async function OnceInicialPage({ params }: Props) {
  const { id } = await params;

  const match = await prisma.match.findUnique({
    where: { id },
    include: {
      players: {
        include: {
          user: {
            include: { profile: true },
          },
        },
      },
    },
  });

  if (!match) notFound();

  // Solo tiene sentido cuando el partido está en curso
  if (match.status !== "IN_PROGRESS") {
    redirect(`/admin/partidos/${id}`);
  }

  const players = match.players.map((pm) => ({
    userId: pm.userId,
    isTitular: pm.isTitular,
    firstName: pm.user.profile?.firstName ?? "",
    lastName: pm.user.profile?.lastName ?? "",
    number: pm.user.profile?.number ?? null,
    idealPosition: pm.user.profile?.idealPosition ?? null,
    avatarUrl: pm.user.profile?.avatarUrl ?? null,
  }));

  // Ordenar: porteras primero, luego por número
  const positionOrder = ["Portera", "Defensora", "Mediocampista", "Delantera"];
  players.sort((a, b) => {
    const ai = positionOrder.indexOf(a.idealPosition ?? "");
    const bi = positionOrder.indexOf(b.idealPosition ?? "");
    if (ai !== bi) return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    return (a.number ?? 99) - (b.number ?? 99);
  });

  return (
    <div className="max-w-2xl">
      <nav className="flex items-center gap-2 text-sm text-slate-500 mb-6">
        <Link href="/admin/partidos" className="hover:text-white transition-colors">
          Partidos
        </Link>
        <span>/</span>
        <Link href={`/admin/partidos/${id}`} className="hover:text-white transition-colors">
          vs {match.opponent}
        </Link>
        <span>/</span>
        <span className="text-white">Once inicial</span>
      </nav>

      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <span className="w-2.5 h-2.5 rounded-full bg-green-400 animate-pulse" />
          <h1 className="text-2xl font-bold text-white">Once inicial</h1>
        </div>
        <p className="text-slate-400 text-sm">
          vs {match.opponent} · En curso
        </p>
        {players.length === 0 && (
          <p className="mt-3 text-sm text-amber-300/70">
            ⚠️ No hay jugadoras convocadas. Agregalas desde{" "}
            <Link href={`/admin/partidos/${id}`} className="underline hover:text-white">
              la edición del partido
            </Link>
            .
          </p>
        )}
      </div>

      <OnceInicialForm matchId={id} players={players} />
    </div>
  );
}
