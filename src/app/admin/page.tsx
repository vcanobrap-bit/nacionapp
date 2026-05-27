import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

export const metadata = { title: "Panel Admin · NacionApp" };

export default async function AdminPage() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") redirect("/login");

  const [totalPlayers, totalMatches, totalTournaments, liveMatch] = await Promise.all([
    prisma.user.count({ where: { role: "PLAYER" } }),
    prisma.match.count(),
    prisma.tournament.count(),
    prisma.match.findFirst({
      where: { status: "IN_PROGRESS" },
      select: { opponent: true, date: true },
    }),
  ]);

  const modules = [
    {
      label: "Jugadoras",
      icon: "👩",
      desc: "Gestionar el plantel, posiciones y estado físico",
      href: "/admin/jugadoras",
      stat: `${totalPlayers} jugadoras`,
    },
    {
      label: "Partidos",
      icon: "⚽",
      desc: "Crear partidos, marcar titulares y cargar resultados",
      href: "/admin/partidos",
      stat: `${totalMatches} partidos`,
    },
    {
      label: "Campeonatos",
      icon: "🏆",
      desc: "Crear y gestionar torneos, ruedas y fixtures",
      href: "/admin/torneos",
      stat: `${totalTournaments} campeonato${totalTournaments !== 1 ? "s" : ""}`,
    },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-semibold text-white tracking-tight">
          Panel de administración
        </h1>
        <p className="text-slate-500 mt-1 text-sm">
          Bienvenida,{" "}
          <span className="text-blue-400 font-medium">{session.user.email}</span>
        </p>
      </div>

      {/* Partido en vivo */}
      {liveMatch && (
        <div className="mb-6 flex items-center gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.06] px-5 py-4">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-emerald-300">
              Partido en curso — vs. {liveMatch.opponent}
            </p>
            <p className="text-xs text-emerald-400/60 mt-0.5">Once inicial activo</p>
          </div>
          <Link
            href="/admin/partidos"
            className="text-xs text-emerald-300 border border-emerald-500/20 hover:bg-emerald-500/10 rounded-full px-3 py-1.5 transition-colors whitespace-nowrap"
          >
            Ver partido
          </Link>
        </div>
      )}

      {/* Módulos — gradient border shell */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {modules.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className="group p-px rounded-2xl bg-gradient-to-br from-white/[0.08] to-white/[0.02] hover:from-blue-500/20 hover:to-white/[0.02] transition-all duration-200"
          >
            <div className="rounded-[15px] bg-gradient-to-br from-[#0A1525] to-[#060D1A] p-5 h-full">
              <span className="text-2xl block mb-3">{item.icon}</span>
              <h2 className="font-semibold text-white group-hover:text-blue-300 transition-colors">
                {item.label}
              </h2>
              <p className="text-slate-500 text-xs mt-1">{item.desc}</p>
              <p className="text-slate-600 text-xs mt-3 font-mono">{item.stat}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
