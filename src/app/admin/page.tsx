import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

export const metadata = { title: "Panel Admin · NacionApp" };

export default async function AdminPage() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") redirect("/login");

  // Stats rápidas
  const [totalPlayers, totalMatches, liveMatch] = await Promise.all([
    prisma.user.count({ where: { role: "PLAYER" } }),
    prisma.match.count(),
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
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-white">
          Panel de administración
        </h1>
        <p className="text-slate-400 mt-1 text-sm">
          Bienvenida,{" "}
          <span className="text-sky-400 font-medium">{session.user.email}</span>
        </p>
      </div>

      {/* Partido en vivo */}
      {liveMatch && (
        <div className="mb-6 flex items-center gap-3 rounded-xl border border-green-500/30 bg-green-500/10 px-5 py-4">
          <span className="w-2.5 h-2.5 rounded-full bg-green-400 animate-pulse shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-green-300">
              Partido en curso — vs. {liveMatch.opponent}
            </p>
            <p className="text-xs text-green-400/70 mt-0.5">
              Once inicial activo
            </p>
          </div>
          <Link
            href="/admin/partidos"
            className="text-xs text-green-300 hover:text-white border border-green-500/30 rounded-lg px-3 py-1.5 transition-colors"
          >
            Ver partido
          </Link>
        </div>
      )}

      {/* Módulos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {modules.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className="group rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 hover:border-sky-500/30 p-5 transition-all duration-200"
          >
            <span className="text-2xl block mb-3">{item.icon}</span>
            <h2 className="font-semibold text-white group-hover:text-sky-300 transition-colors">
              {item.label}
            </h2>
            <p className="text-slate-400 text-xs mt-1">{item.desc}</p>
            <p className="text-slate-500 text-xs mt-3 font-mono">{item.stat}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
