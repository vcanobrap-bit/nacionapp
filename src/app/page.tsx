import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

interface Props {
  params: Promise<{ id: string }>;
}

// ── Helpers ────────────────────────────────────────────────────
function calcAge(date: Date): number {
  const today = new Date();
  let age = today.getFullYear() - date.getUTCFullYear();
  const m = today.getMonth() - date.getUTCMonth();
  if (m < 0 || (m === 0 && today.getDate() < date.getUTCDate())) age--;
  return age;
}

function formatDate(date: Date): string {
  // La fecha de nacimiento se guarda como medianoche UTC: formatear en UTC
  // para que no se corra un día según la zona horaria del servidor.
  return date.toLocaleDateString("es-AR", {
    day: "numeric", month: "long", year: "numeric", timeZone: "UTC",
  });
}

// ── Position tokens (dark glass theme) ────────────────────────
const POSITION_STYLE: Record<string, { label: string; badge: string; accent: string; glow: string }> = {
  Portera:       { label: "Portera",       badge: "bg-amber-500/10   border-amber-500/20   text-amber-300",   accent: "text-amber-300",   glow: "shadow-amber-500/15"   },
  Defensora:     { label: "Defensora",     badge: "bg-blue-500/10    border-blue-500/20    text-blue-300",    accent: "text-blue-300",    glow: "shadow-blue-500/15"    },
  Mediocampista: { label: "Mediocampista", badge: "bg-emerald-500/10 border-emerald-500/20 text-emerald-300", accent: "text-emerald-300", glow: "shadow-emerald-500/15" },
  Delantera:     { label: "Delantera",     badge: "bg-rose-500/10    border-rose-500/20    text-rose-300",    accent: "text-rose-300",    glow: "shadow-rose-500/15"    },
};

const POSITION_ICON: Record<string, string> = {
  Portera: "🧤", Defensora: "🛡️", Mediocampista: "⚙️", Delantera: "⚡",
};

// ── Metadata ───────────────────────────────────────────────────
export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const user = await prisma.user.findUnique({
    where: { id, role: "PLAYER" },
    include: { profile: true },
  });
  if (!user?.profile) return { title: "Jugadora · NacionApp" };
  const { firstName, lastName } = user.profile;
  return {
    title: `${firstName} ${lastName} · NacionApp`,
    description: `Perfil de ${firstName} ${lastName} — Selección Argentina Femenina.`,
  };
}

// ── Page ───────────────────────────────────────────────────────
export default async function PlayerProfilePage({ params }: Props) {
  const { id } = await params;

  const [user, pj, titular] = await Promise.all([
    prisma.user.findUnique({
      where: { id, role: "PLAYER" },
      include: { profile: true },
    }),
    prisma.playerMatch.count({
      where: { userId: id, match: { status: "FINISHED" } },
    }),
    prisma.playerMatch.count({
      where: { userId: id, isTitular: true, match: { status: "FINISHED" } },
    }),
  ]);

  if (!user || !user.profile) notFound();

  const p        = user.profile;
  const posStyle = POSITION_STYLE[p.idealPosition ?? ""];
  const posIcon  = POSITION_ICON[p.idealPosition ?? ""] ?? "👟";
  const age      = p.birthdate ? calcAge(p.birthdate) : null;

  return (
    <div className="min-h-screen bg-[#020617] text-white flex flex-col">

      {/* ── Top bar ───────────────────────────────────────── */}
      <header className="sticky top-0 z-20 bg-[#020617]/80 backdrop-blur-xl border-b border-white/[0.06]">
        <div className="max-w-xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none">
              <path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Plantel
          </Link>

          <Image
            src="/img/logo.svg"
            alt="Selección Argentina Femenina"
            width={30}
            height={36}
            className="opacity-90"
          />
        </div>
      </header>

      {/* ── Hero ──────────────────────────────────────────── */}
      <section className="max-w-xl mx-auto w-full px-4 pt-10 pb-8 flex flex-col items-center text-center">

        {/* Avatar con glow de posición */}
        <div
          className={`w-28 h-28 rounded-full bg-white/5 border border-white/10 overflow-hidden flex items-center justify-center mb-5 shadow-2xl ${posStyle?.glow ?? ""}`}
        >
          {p.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={p.avatarUrl}
              alt={`${p.firstName} ${p.lastName}`}
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-5xl">{posIcon}</span>
          )}
        </div>

        {/* Número */}
        {p.number != null && (
          <p className={`text-sm font-bold tracking-widest mb-1 ${posStyle?.accent ?? "text-blue-400"}`}>
            #{p.number}
          </p>
        )}

        {/* Nombre */}
        <h1 className="text-3xl font-semibold tracking-tight leading-tight">
          {p.firstName}
          <br />
          {p.lastName}
        </h1>

        {/* Position badge */}
        {p.idealPosition && (
          <span className={`mt-3 inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full border ${posStyle?.badge ?? "bg-white/5 border-white/10 text-slate-400"}`}>
            <span>{posIcon}</span>
            {p.idealPosition}
          </span>
        )}
      </section>

      {/* ── Info cards ────────────────────────────────────── */}
      <section className="max-w-xl mx-auto w-full px-4 pb-8 space-y-3">

        {/* Birthdate + Age */}
        {p.birthdate && (
          <InfoRow icon="🎂" label="Cumpleaños">
            {formatDate(p.birthdate)}
            {age != null && (
              <span className="text-slate-600 ml-2">({age} años)</span>
            )}
          </InfoRow>
        )}

        {/* Joining year */}
        {p.joiningYear && (
          <InfoRow icon="🗓️" label="En la Selección">
            Desde {p.joiningYear}
            <span className="text-slate-600 ml-2">
              ({new Date().getFullYear() - p.joiningYear} temporadas)
            </span>
          </InfoRow>
        )}

        {/* Nationality */}
        {p.nationality && (
          <InfoRow icon="🌍" label="Nacionalidad">
            {p.nationality}
          </InfoRow>
        )}

        {/* Stats row */}
        {pj > 0 && (
          <div className="grid grid-cols-2 gap-3 pt-1">
            <StatCard value={pj}     label="Partidos jugados" accent={posStyle?.accent ?? "text-blue-300"} />
            <StatCard value={titular} label="Veces titular"   accent={posStyle?.accent ?? "text-blue-300"} />
          </div>
        )}

        {/* Bio */}
        {p.bio && (
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-4 mt-2">
            <p className="text-xs uppercase tracking-widest text-slate-600 font-semibold mb-2">
              Sobre ella
            </p>
            <p className="text-sm text-slate-300 leading-relaxed">{p.bio}</p>
          </div>
        )}
      </section>

      {/* ── Footer ────────────────────────────────────────── */}
      <footer className="mt-auto border-t border-white/[0.06] py-6 text-center">
        <p className="text-xs text-slate-700">
          © {new Date().getFullYear()} NacionApp · Equipo Nacional Femenino - 🔴🔵
        </p>
      </footer>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────
function InfoRow({
  icon, label, children,
}: {
  icon: string; label: string; children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-4 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3.5">
      <span className="text-lg leading-none pt-0.5 shrink-0">{icon}</span>
      <div>
        <p className="text-xs text-slate-500 font-medium mb-0.5">{label}</p>
        <p className="text-sm font-semibold text-white">{children}</p>
      </div>
    </div>
  );
}

function StatCard({
  value, label, accent,
}: {
  value: number; label: string; accent: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-4 text-center">
      <p className={`text-3xl font-semibold ${accent}`}>{value}</p>
      <p className="text-xs text-slate-500 font-medium mt-1 leading-tight">{label}</p>
    </div>
  );
}
