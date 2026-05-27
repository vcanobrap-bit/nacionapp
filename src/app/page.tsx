import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import AppShell from "./_components/AppShell";

// Siempre server-rendered para datos frescos de Supabase
export const dynamic = "force-dynamic";

// ── Data types (serializable, sin objetos Date) ───────────────
export interface TournamentData {
  id: string;
  name: string;
  year: number;
  isActive: boolean;
}

export interface MatchData {
  id: string;
  date: string;        // ISO string
  opponent: string;
  venue: string | null;
  status: "PENDING" | "IN_PROGRESS" | "FINISHED";
  result: "WIN" | "LOSS" | "DRAW" | null;
  homeScore: number | null;
  awayScore: number | null;
  once: OncePlayer[];  // Solo isTitular=true (público)
  // Torneo / fixture
  tournamentId: string | null;
  tournamentName: string | null;
  round: number | null;
  fixtureRoundNumber: number | null;
  // Admin-only (undefined para visitantes)
  notes?: string | null;
  currentTitularIds?: string[];
}

export interface OncePlayer {
  name: string;
  number: number | null;
  position: string | null;
  avatarUrl: string | null;
}

export interface PlayerData {
  id: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  birthdate: string | null; // ISO string
  joiningYear: number | null;
  idealPosition: string | null;
  number: number | null;
  // Admin-only (undefined para visitantes)
  status?: "AVAILABLE" | "INJURED";
  adminComments?: string | null;
}

export interface StatsData {
  pj: number;           // Partidos jugados (FINISHED)
  v: number;            // Victorias
  e: number;            // Empates
  d: number;            // Derrotas
  gf: number;           // Goles a favor
  gc: number;           // Goles en contra
  ptsGanados: number;   // 3×V + 1×E
  ptsPendientes: number;// PENDING × 3 (escenario ideal)
  ptsIdeales: number;   // Ganados + Pendientes
  pendingCount: number;
  inProgressCount: number;
}

// ── Helpers ───────────────────────────────────────────────────
function computeStats(matches: { status: string; result: string | null; homeScore: number | null; awayScore: number | null }[]): StatsData {
  const finished = matches.filter((m) => m.status === "FINISHED");
  const pending  = matches.filter((m) => m.status === "PENDING");
  const live     = matches.filter((m) => m.status === "IN_PROGRESS");

  const v  = finished.filter((m) => m.result === "WIN").length;
  const e  = finished.filter((m) => m.result === "DRAW").length;
  const d  = finished.filter((m) => m.result === "LOSS").length;
  const gf = finished.reduce((s, m) => s + (m.homeScore ?? 0), 0);
  const gc = finished.reduce((s, m) => s + (m.awayScore ?? 0), 0);

  const ptsGanados    = v * 3 + e;
  const ptsPendientes = pending.length * 3;

  return {
    pj: finished.length,
    v, e, d, gf, gc,
    ptsGanados,
    ptsPendientes,
    ptsIdeales: ptsGanados + ptsPendientes,
    pendingCount: pending.length,
    inProgressCount: live.length,
  };
}

// ── Page (Server Component) ───────────────────────────────────
export default async function HomePage() {
  const [rawMatches, rawPlayers, rawTournaments] = await Promise.all([
    prisma.match.findMany({
      orderBy: { date: "asc" },
      include: {
        players: {
          include: {
            user: { include: { profile: true } },
          },
        },
        tournament: { select: { name: true } },
      },
    }),
    prisma.user.findMany({
      where: { role: "PLAYER" },
      include: { profile: true },
    }),
    prisma.tournament.findMany({
      orderBy: [{ year: "desc" }, { name: "asc" }],
    }),
  ]);

  // Serializar matches
  const matches: MatchData[] = rawMatches.map((m) => {
    const positionOrder = ["Portera", "Defensora", "Mediocampista", "Delantera"];
    const once: OncePlayer[] = m.players
      .filter((pm) => pm.isTitular)
      .map((pm) => ({
        name: `${pm.user.profile?.firstName ?? ""} ${pm.user.profile?.lastName ?? ""}`.trim(),
        number: pm.user.profile?.number ?? null,
        position: pm.user.profile?.idealPosition ?? null,
        avatarUrl: pm.user.profile?.avatarUrl ?? null,
      }))
      .sort((a, b) => {
        const ai = positionOrder.indexOf(a.position ?? "");
        const bi = positionOrder.indexOf(b.position ?? "");
        return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
      });

    return {
      id: m.id,
      date: m.date.toISOString(),
      opponent: m.opponent,
      venue: m.venue,
      status: m.status as MatchData["status"],
      result: m.result as MatchData["result"],
      homeScore: m.homeScore,
      awayScore: m.awayScore,
      once,
      tournamentId: m.tournamentId,
      tournamentName: m.tournament?.name ?? null,
      round: m.round,
      fixtureRoundNumber: m.fixtureRoundNumber,
    };
  });

  // Serializar jugadoras — ordenar por posición → apellido
  const positionOrder = ["Portera", "Defensora", "Mediocampista", "Delantera"];
  const players: PlayerData[] = rawPlayers
    .map((u) => ({
      id: u.id,
      firstName: u.profile?.firstName ?? "",
      lastName: u.profile?.lastName ?? "",
      avatarUrl: u.profile?.avatarUrl ?? null,
      birthdate: u.profile?.birthdate?.toISOString() ?? null,
      joiningYear: u.profile?.joiningYear ?? null,
      idealPosition: u.profile?.idealPosition ?? null,
      number: u.profile?.number ?? null,
    }))
    .sort((a, b) => {
      const ai = positionOrder.indexOf(a.idealPosition ?? "");
      const bi = positionOrder.indexOf(b.idealPosition ?? "");
      if (ai !== bi) return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
      return a.lastName.localeCompare(b.lastName);
    });

  // Serializar torneos
  const tournaments: TournamentData[] = rawTournaments.map((t) => ({
    id: t.id,
    name: t.name,
    year: t.year,
    isActive: t.isActive,
  }));

  const stats = computeStats(rawMatches);

  const session = await auth();
  const isAdmin = session?.user?.role === "ADMIN";
  const adminEmail = session?.user?.email ?? null;

  // Enriquecer datos con campos privados cuando es admin
  // matches[i] corresponde a rawMatches[i] (mismo orden, sin sort posterior)
  const adminMatches: MatchData[] = isAdmin
    ? rawMatches.map((m, i) => ({
        ...matches[i],
        notes: m.notes ?? null,
        currentTitularIds: m.players
          .filter((pm) => pm.isTitular)
          .map((pm) => pm.userId),
      }))
    : matches;

  // rawPlayers puede estar en orden diferente a players (que está sorted),
  // así que reconstruimos desde cero para admin.
  const adminPlayers: PlayerData[] = isAdmin
    ? rawPlayers
        .map((u) => ({
          id: u.id,
          firstName: u.profile?.firstName ?? "",
          lastName: u.profile?.lastName ?? "",
          avatarUrl: u.profile?.avatarUrl ?? null,
          birthdate: u.profile?.birthdate?.toISOString() ?? null,
          joiningYear: u.profile?.joiningYear ?? null,
          idealPosition: u.profile?.idealPosition ?? null,
          number: u.profile?.number ?? null,
          status: (u.profile?.status ?? "AVAILABLE") as "AVAILABLE" | "INJURED",
          adminComments: u.profile?.adminComments ?? null,
        }))
        .sort((a, b) => {
          const ai = positionOrder.indexOf(a.idealPosition ?? "");
          const bi = positionOrder.indexOf(b.idealPosition ?? "");
          if (ai !== bi) return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
          return a.lastName.localeCompare(b.lastName);
        })
    : players;

  return (
    <AppShell
      matches={adminMatches}
      players={adminPlayers}
      stats={stats}
      tournaments={tournaments}
      adminEmail={adminEmail}
    />
  );
}
