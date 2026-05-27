import { prisma } from "@/lib/prisma";
import Link from "next/link";
import AddPlayerModal from "./_components/AddPlayerModal";

export const metadata = { title: "Jugadoras · Admin · NacionApp" };

const STATUS_LABEL = {
  AVAILABLE: { label: "Disponible", color: "text-emerald-300 bg-emerald-500/10 border-emerald-500/20" },
  INJURED:   { label: "Lesionada",  color: "text-red-300   bg-red-500/10   border-red-500/20"   },
};

const POSITION_ICON: Record<string, string> = {
  Portera:       "🧤",
  Defensora:     "🛡️",
  Mediocampista: "⚙️",
  Delantera:     "⚡",
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
          <h1 className="text-2xl font-semibold text-white tracking-tight">Jugadoras</h1>
          <p className="text-slate-500 text-sm mt-0.5">{players.length} en el plantel</p>
        </div>
        <AddPlayerModal />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {players.map((player) => {
          const p = player.profile;
          const statusInfo = STATUS_LABEL[p?.status ?? "AVAILABLE"];
          const posIcon = POSITION_ICON[p?.idealPosition ?? ""] ?? "👟";

          return (
            <Link
              key={player.id}
              href={`/admin/jugadoras/${player.id}`}
              className="group rounded-2xl border border-white/10 bg-white/[0.04] hover:bg-white/[0.07] hover:border-white/20 p-4 transition-all duration-150"
            >
              <div className="flex items-start gap-3">
                {/* Avatar */}
                <div className="w-11 h-11 rounded-full bg-white/5 border border-white/10 overflow-hidden shrink-0 flex items-center justify-center text-lg">
                  {p?.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.avatarUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span>{posIcon}</span>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-white group-hover:text-blue-300 transition-colors truncate text-sm">
                    {p?.firstName} {p?.lastName}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
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
                <p className="mt-3 text-xs text-amber-300/60 border-t border-white/[0.06] pt-3 line-clamp-2">
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
