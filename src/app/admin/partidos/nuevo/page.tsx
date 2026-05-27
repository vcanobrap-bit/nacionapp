import Link from "next/link";
import { prisma } from "@/lib/prisma";
import MatchForm from "../_components/MatchForm";

export const metadata = { title: "Nuevo partido · Admin · NacionApp" };

export default async function NuevoPartidoPage() {
  const tournaments = await prisma.tournament.findMany({
    select: { id: true, name: true, year: true },
    orderBy: [{ year: "desc" }, { name: "asc" }],
  });

  return (
    <div className="max-w-2xl">
      <nav className="flex items-center gap-2 text-sm text-slate-500 mb-6">
        <Link href="/admin/partidos" className="hover:text-white transition-colors">
          Partidos
        </Link>
        <span>/</span>
        <span className="text-white">Nuevo partido</span>
      </nav>

      <h1 className="text-2xl font-bold text-white mb-6">Nuevo partido</h1>

      <MatchForm tournaments={tournaments} />
    </div>
  );
}
