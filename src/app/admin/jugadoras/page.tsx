import { prisma } from "@/lib/prisma";
import Link from "next/link";

export const metadata = { title: "Jugadoras · Admin · NacionApp" };

const STATUS_LABEL = {
  AVAILABLE: { label: "Disponible", color: "text-green-300 bg-green-500/10 border-green-500/20" },
  INJURED:   { label: "Lesionada",  color: "text-red-300   bg-red-500/10   border-red-500/20"   },
};

const POSITION_ICON: Record<string, string> = {
  Portera:        "🧤",
  Defensora:      "🛡️",
  Mediocampista:  "⚙️",
  Delantera:      "⚡",
};

export default async function JugadorasPage() {
  const players = await prisma.user.findMany({
    where: { role: "PLAYER" },
    include: { profile: true },
    orderBy: { profile: { lastName: "asc" } },
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Jugadoras</h1>
          <p className="text-slate-400 text-sm mt-0.5">{players.length} en el plantel</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {players.map((player) => {
          const p = player.profile;
          const statusInfo = STATUS_LABEL[p?.status ?? "AVAILABLE"];
          const posIcon = POSITION_ICON[p?.idealPosition ?? ""] ?? "👟";

          return (
            <Link
              key={player.id}
              href={`/admin/jugadoras/${player.id}`}
              className="group rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 hover:border-sky-500/30 p-5 transition-all"
            >
              <div className="flex items-start gap-3">
                {/* Avatar */}
                <div className="w-12 h-12 rounded-full bg-slate-700 border border-white/10 overflow-hidden shrink-0 flex items-center justify-center text-xl">
                  {p?.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.avatarUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span>{posIcon}</span>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-white group-hover:text-sky-300 transition-colors truncate">
                    {p?.firstName} {p?.lastName}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {p?.number ? `#${p.number} · ` : ""}
                    {p?.idealPosition ?? "Sin posición"}
                  </p>
                  <span
                    className={`inline-block mt-2 text-xs px-2 py-0.5 rounded-full border font-medium ${statusInfo.color}`}
                  >
                    {statusInfo.label}
                  </span>
                </div>
              </div>

              {p?.adminComments && (
                <p className="mt-3 text-xs text-amber-300/70 border-t border-white/5 pt-3 line-clamp-2">
                  📝 {p.adminComments}
                </p>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
