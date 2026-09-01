import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import AppShell from "./_components/AppShell";
import type { MatchPhase } from "@/lib/clock";
import { sortByPoints } from "@/lib/standings";

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
  status: "PENDING" | "IN_PROGRESS" | "FINISHED" | "POSTPONED";
  result: "WIN" | "LOSS" | "DRAW" | null;
  homeScore: number | null;
  awayScore: number | null;
  once: OncePlayer[];  // Solo isTitular=true (público)
  events: MatchEventData[]; // Bitácora: goles, tarjetas y cambios
  // Torneo / fixture
  tournamentId: string | null;
  tournamentName: string | null;
  round: number | null;
  fixtureRoundNumber: number | null;
  halfMinutes: number;
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

export interface MatchEventData {
  id: string;
  type: "GOAL" | "AMARILLA" | "ROJA" | "CAMBIO";
  isOwn: boolean;
  minute: number | null;
  playerName: string | null;   // autora del gol/tarjeta; o jugadora que Sale en CAMBIO
  player2Name: string | null;  // jugadora que Entra en CAMBIO (null para otros tipos)
  /// Tiempo en que ocurrió. Agrupa la bitácora; null en partidos viejos.
  phase: MatchPhase | null;
}

export interface LiveMatchConvocada {
  userId: string;
  name: string;
  number: number | null;
  position: string | null;
  isTitular: boolean;
}

export interface LiveMatchData {
  id: string;
  opponent: string;
  venue: string | null;
  homeScore: number;
  awayScore: number;
  tournamentName: string | null;
  once: OncePlayer[];
  events: MatchEventData[];
  // ── Fase y reloj ──
  phase: MatchPhase;
  periodStartedAt: string | null; // ISO, null = reloj detenido
  clockBaseSeconds: number;
  halfMinutes: number;
  // Admin-only
  convocadas?: LiveMatchConvocada[];
}

/** Tabla oficial de la asociación: el snapshot más reciente de un torneo. */
export interface StandingsData {
  id: string;
  tournamentId: string;
  tournamentName: string;
  asOf: string; // ISO, medianoche UTC
  rows: { position: number; teamName: string; points: number }[];
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

// ── Pestaña activa en la URL ─────────────────────────────────
// La pestaña vive en `?tab=`: así el servidor renderiza la correcta de entrada
// (sin parpadeo), un refresh no te devuelve a Posiciones, y un enlace puede
// apuntar a una pestaña concreta — p. ej. "‹ Plantel" desde la ficha de jugadora.
export type Tab = "posiciones" | "tabla" | "partidos" | "plantel";
const TABS: readonly Tab[] = ["posiciones", "tabla", "partidos", "plantel"];
function parseTab(raw: string | undefined): Tab {
  return (TABS as readonly string[]).includes(raw ?? "") ? (raw as Tab) : "posiciones";
}

// ── Page (Server Component) ───────────────────────────────────
export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  const initialTab = parseTab(tab);

  const [rawMatches, rawPlayers, rawTournaments, rawStandings] = await Promise.all([
    prisma.match.findMany({
      orderBy: { date: "asc" },
      include: {
        players: {
          include: {
            user: { include: { profile: true } },
          },
        },
        tournament: { select: { name: true } },
        events: {
          orderBy: { createdAt: "asc" },
          include: {
            player:  { include: { profile: true } },
            player2: { include: { profile: true } },
          },
        },
      },
    }),
    prisma.user.findMany({
      where: { role: "PLAYER" },
      include: { profile: true },
    }),
    prisma.tournament.findMany({
      orderBy: [{ year: "desc" }, { name: "asc" }],
    }),
    // Tablas oficiales: más reciente primero; abajo se queda una por torneo
    prisma.standingsSnapshot.findMany({
      orderBy: [{ asOf: "desc" }, { createdAt: "desc" }],
      include: {
        rows: { orderBy: { position: "asc" } },
        tournament: { select: { name: true } },
      },
    }),
  ]);

  // Una tabla por torneo: la publicación más reciente
  const standings: StandingsData[] = [];
  const vistos = new Set<string>();
  for (const s of rawStandings) {
    if (vistos.has(s.tournamentId)) continue;
    vistos.add(s.tournamentId);
    standings.push({
      id: s.id,
      tournamentId: s.tournamentId,
      tournamentName: s.tournament.name,
      asOf: s.asOf.toISOString(),
      // Orden por puntos también acá: los snapshots cargados antes de que
      // existiera sortByPoints tienen `position` en orden de pegado.
      rows: sortByPoints(s.rows).map((r, i) => ({ position: i + 1, teamName: r.teamName, points: r.points })),
    });
  }

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

    const events: MatchEventData[] = m.events.map((ev) => ({
      id:          ev.id,
      type:        ev.type as MatchEventData["type"],
      isOwn:       ev.isOwn,
      minute:      ev.minute,
      playerName:  ev.player?.profile
        ? `${ev.player.profile.firstName} ${ev.player.profile.lastName}`.trim()
        : null,
      player2Name: ev.player2?.profile
        ? `${ev.player2.profile.firstName} ${ev.player2.profile.lastName}`.trim()
        : null,
      phase: (ev.phase as MatchPhase | null) ?? null,
    }));

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
      events,
      tournamentId: m.tournamentId,
      tournamentName: m.tournament?.name ?? null,
      round: m.round,
      fixtureRoundNumber: m.fixtureRoundNumber,
      halfMinutes: m.halfMinutes,
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

  // ── Partido en vivo con eventos ────────────────────────────────
  const rawLive = rawMatches.find((m) => m.status === "IN_PROGRESS") ?? null;

  const liveMatch: LiveMatchData | null = rawLive
    ? {
        id: rawLive.id,
        opponent: rawLive.opponent,
        venue: rawLive.venue,
        homeScore: rawLive.homeScore ?? 0,
        awayScore: rawLive.awayScore ?? 0,
        tournamentName: rawLive.tournament?.name ?? null,
        phase: rawLive.phase as MatchPhase,
        periodStartedAt: rawLive.periodStartedAt?.toISOString() ?? null,
        clockBaseSeconds: rawLive.clockBaseSeconds,
        halfMinutes: rawLive.halfMinutes,
        once: rawLive.players
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
          }),
        events: rawLive.events.map((ev) => ({
          id:          ev.id,
          type:        ev.type as MatchEventData["type"],
          isOwn:       ev.isOwn,
          minute:      ev.minute,
          playerName:  ev.player?.profile
            ? `${ev.player.profile.firstName} ${ev.player.profile.lastName}`.trim()
            : null,
          player2Name: ev.player2?.profile
            ? `${ev.player2.profile.firstName} ${ev.player2.profile.lastName}`.trim()
            : null,
          phase: (ev.phase as MatchPhase | null) ?? null,
        })),
        // Admin: lista para los botones de acción — todo el plantel inscrito,
        // marcando quiénes son titulares en este partido (para Sale/Entra en cambios)
        convocadas: isAdmin
          ? (() => {
              const titularIds = new Set(
                rawLive.players.filter((pm) => pm.isTitular).map((pm) => pm.userId)
              );
              return rawPlayers.map((u) => ({
                userId:    u.id,
                name:      `${u.profile?.firstName ?? ""} ${u.profile?.lastName ?? ""}`.trim(),
                number:    u.profile?.number ?? null,
                position:  u.profile?.idealPosition ?? null,
                isTitular: titularIds.has(u.id),
              }));
            })()
              .sort((a, b) => {
                const ai = positionOrder.indexOf(a.position ?? "");
                const bi = positionOrder.indexOf(b.position ?? "");
                if (ai !== bi) return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
                return a.name.localeCompare(b.name);
              })
          : undefined,
      }
    : null;

  return (
    <AppShell
      initialTab={initialTab}
      // Server Component: se renderiza una vez por request, así que leer el
      // reloj acá es estable. El cliente usa este valor para corregir el
      // desfase de la hora de su dispositivo al mostrar el reloj del partido.
      // eslint-disable-next-line react-hooks/purity
      serverNow={Date.now()}
      matches={adminMatches}
      players={adminPlayers}
      tournaments={tournaments}
      standings={standings}
      adminEmail={adminEmail}
      liveMatch={liveMatch}
    />
  );
}
