import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import PlayerForm from "./_components/PlayerForm";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const user = await prisma.user.findUnique({
    where: { id, role: "PLAYER" },
    include: { profile: true },
  });
  if (!user) return { title: "Jugadora no encontrada" };
  return {
    title: `${user.profile?.firstName ?? ""} ${user.profile?.lastName ?? ""} · Admin · NacionApp`,
  };
}

export default async function EditPlayerPage({ params }: Props) {
  const { id } = await params;

  const user = await prisma.user.findUnique({
    where: { id, role: "PLAYER" },
    include: { profile: true },
  });

  if (!user) notFound();

  const { profile } = user;
  const fullName = `${profile?.firstName ?? ""} ${profile?.lastName ?? ""}`.trim();

  // Historial de partidos
  const history = await prisma.playerMatch.findMany({
    where: { userId: id },
    include: { match: { select: { date: true, opponent: true, result: true, status: true } } },
    orderBy: { match: { date: "desc" } },
    take: 10,
  });

  const titularCount = history.filter((h) => h.isTitular).length;

  return (
    <div className="max-w-2xl">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-slate-500 mb-6">
        <Link href="/admin/jugadoras" className="hover:text-white transition-colors">
          Jugadoras
        </Link>
        <span>/</span>
        <span className="text-white">{fullName || "Jugadora"}</span>
      </nav>

      <h1 className="text-2xl font-bold text-white mb-6">
        {fullName || "Editar jugadora"}
      </h1>

      <PlayerForm userId={user.id} profile={profile} />

      {/* Historial de partidos */}
      {history.length > 0 && (
        <section className="mt-10 border-t border-white/10 pt-8">
          <h2 className="text-sm font-semibold text-slate-300 mb-1">
            Historial de partidos
          </h2>
          <p className="text-xs text-slate-500 mb-4">
            {history.length} convocatorias · {titularCount} como titular
          </p>
          <ul className="space-y-2">
            {history.map((h) => (
              <li
                key={h.id}
                className="flex items-center gap-3 rounded-lg bg-white/5 border border-white/5 px-4 py-2.5 text-sm"
              >
                <span className={`w-2 h-2 rounded-full shrink-0 ${h.isTitular ? "bg-sky-400" : "bg-slate-600"}`} />
                <span className="flex-1 text-white">{h.match.opponent}</span>
                <span className="text-slate-500 text-xs">
                  {new Date(h.match.date).toLocaleDateString("es-AR", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}
                </span>
                {h.isTitular && (
                  <span className="text-xs text-sky-300 font-medium">Titular</span>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
