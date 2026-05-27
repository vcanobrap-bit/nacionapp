"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { MatchStatus, MatchResult, EventType } from "@/generated/prisma";
import { revalidatePath } from "next/cache";

async function requireAdmin() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") throw new Error("No autorizado");
  return session;
}

export type MatchFormState = { error?: string; success?: string } | undefined;

// ── Crear partido ──────────────────────────────────────────────────────────
export async function createMatchAction(
  _prev: MatchFormState,
  formData: FormData
): Promise<MatchFormState> {
  const session = await requireAdmin();

  const date = formData.get("date") as string;
  const opponent = (formData.get("opponent") as string)?.trim();
  const venue = (formData.get("venue") as string)?.trim() || null;
  const notes = (formData.get("notes") as string)?.trim() || null;

  if (!date || !opponent) return { error: "Fecha y rival son obligatorios." };

  const tournamentId = (formData.get("tournamentId") as string) || null;
  const roundRaw = formData.get("round") as string;
  const fixtureRoundNumberRaw = formData.get("fixtureRoundNumber") as string;

  await prisma.match.create({
    data: {
      date: new Date(date),
      opponent,
      venue,
      notes,
      status: MatchStatus.PENDING,
      createdById: session.user.id,
      tournamentId: tournamentId || null,
      round: roundRaw ? parseInt(roundRaw, 10) : null,
      fixtureRoundNumber: fixtureRoundNumberRaw ? parseInt(fixtureRoundNumberRaw, 10) : null,
    },
  });

  revalidatePath("/admin/partidos");
  revalidatePath("/");
  return { success: "Partido creado correctamente." };
}

// ── Actualizar partido (estado / resultado / notas) ────────────────────────
export async function updateMatchAction(
  _prev: MatchFormState,
  formData: FormData
): Promise<MatchFormState> {
  await requireAdmin();

  const matchId = formData.get("matchId") as string;
  if (!matchId) return { error: "ID de partido inválido." };

  const date = formData.get("date") as string;
  const opponent = (formData.get("opponent") as string)?.trim();
  const venue = (formData.get("venue") as string)?.trim() || null;
  const notes = (formData.get("notes") as string)?.trim() || null;
  const status = formData.get("status") as MatchStatus;

  const homeScoreRaw = formData.get("homeScore") as string | null;
  const awayScoreRaw = formData.get("awayScore") as string | null;
  const resultRaw = formData.get("result") as string | null;
  const result: MatchResult | null = (resultRaw && resultRaw !== "") ? resultRaw as MatchResult : null;
  const tournamentId = (formData.get("tournamentId") as string) || null;
  const roundRaw = formData.get("round") as string;
  const fixtureRoundNumberRaw = formData.get("fixtureRoundNumber") as string;

  if (!date || !opponent) return { error: "Fecha y rival son obligatorios." };
  if (status === MatchStatus.FINISHED && !result) {
    return { error: "Debe indicar el resultado para un partido FINALIZADO." };
  }

  const parseScore = (raw: string | null) => {
    if (!raw || raw === "") return null;
    const n = parseInt(raw, 10);
    return isNaN(n) ? null : n;
  };

  await prisma.match.update({
    where: { id: matchId },
    data: {
      date: new Date(date),
      opponent,
      venue,
      notes,
      status,
      result,
      homeScore: parseScore(homeScoreRaw),
      awayScore: parseScore(awayScoreRaw),
      tournamentId: tournamentId || null,
      round: roundRaw ? parseInt(roundRaw, 10) : null,
      fixtureRoundNumber: fixtureRoundNumberRaw ? parseInt(fixtureRoundNumberRaw, 10) : null,
    },
  });

  revalidatePath("/admin/partidos");
  revalidatePath("/");
  return { success: "Partido actualizado." };
}

// ── Eliminar partido ───────────────────────────────────────────────────────
export async function deleteMatchAction(matchId: string) {
  await requireAdmin();
  await prisma.match.delete({ where: { id: matchId } });
  revalidatePath("/admin/partidos");
  revalidatePath("/");
}

// ── Guardar once inicial ───────────────────────────────────────────────────
// Recibe una lista de playerIds que son titulares; los demás quedan en false.
export async function saveOnceInicialAction(
  matchId: string,
  titularIds: string[]
): Promise<{ error?: string; success?: string }> {
  await requireAdmin();

  if (titularIds.length > 11) {
    return { error: "El once inicial no puede tener más de 11 jugadoras." };
  }

  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: { players: true },
  });

  if (!match) return { error: "Partido no encontrado." };
  if (match.status !== MatchStatus.IN_PROGRESS) {
    return { error: "El once inicial solo se puede setear con el partido IN_PROGRESS." };
  }

  // Actualizar isTitular en bloque
  await prisma.$transaction(
    match.players.map((pm) =>
      prisma.playerMatch.update({
        where: { id: pm.id },
        data: { isTitular: titularIds.includes(pm.userId) },
      })
    )
  );

  revalidatePath(`/admin/partidos/${matchId}/once`);
  revalidatePath("/api/partidos/en-vivo");
  revalidatePath("/");
  return { success: "Once inicial guardado." };
}

// ── Setear titulares directamente desde la vista unificada ─────────────────
// Hace upsert de PlayerMatch para los titulares y setea isTitular=false al resto.
export async function setTitularesAction(
  matchId: string,
  titularIds: string[]
): Promise<{ error?: string; success?: string }> {
  await requireAdmin();

  if (titularIds.length > 11) {
    return { error: "El once inicial no puede tener más de 11 jugadoras." };
  }

  const match = await prisma.match.findUnique({ where: { id: matchId } });
  if (!match) return { error: "Partido no encontrado." };
  if (match.status !== MatchStatus.IN_PROGRESS) {
    return { error: "El once inicial solo se puede armar con el partido EN CURSO." };
  }

  // Upsert PlayerMatch para todos los titulares (auto-agrega si no están convocadas)
  if (titularIds.length > 0) {
    await prisma.$transaction(
      titularIds.map((userId) =>
        prisma.playerMatch.upsert({
          where: { userId_matchId: { userId, matchId } },
          update: { isTitular: true },
          create: { userId, matchId, isTitular: true },
        })
      )
    );
  }

  // Desmarcar titulares a los que ya estaban pero no están en la nueva lista
  await prisma.playerMatch.updateMany({
    where: { matchId, userId: { notIn: titularIds } },
    data: { isTitular: false },
  });

  revalidatePath("/");
  revalidatePath("/api/partidos/en-vivo");
  return { success: "Once inicial guardado." };
}

// ── Agregar jugadora a partido ─────────────────────────────────────────────
export async function addPlayerToMatchAction(
  matchId: string,
  userId: string
): Promise<{ error?: string }> {
  await requireAdmin();

  await prisma.playerMatch.upsert({
    where: { userId_matchId: { userId, matchId } },
    update: {},
    create: { userId, matchId },
  });

  revalidatePath(`/admin/partidos/${matchId}/once`);
  revalidatePath("/");
  return {};
}

// ── Quitar jugadora de partido ─────────────────────────────────────────────
export async function removePlayerFromMatchAction(
  matchId: string,
  userId: string
): Promise<{ error?: string }> {
  await requireAdmin();

  await prisma.playerMatch.deleteMany({ where: { userId, matchId } });
  revalidatePath(`/admin/partidos/${matchId}/once`);
  revalidatePath("/");
  return {};
}

// ═══════════════════════════════════════════════════════════
// ACCIONES DE PARTIDO EN VIVO
// ═══════════════════════════════════════════════════════════

function revalidateLive() {
  revalidatePath("/");
  revalidatePath("/api/partidos/en-vivo");
}

async function requireInProgress(matchId: string) {
  const match = await prisma.match.findUnique({ where: { id: matchId } });
  if (!match) throw new Error("Partido no encontrado.");
  if (match.status !== MatchStatus.IN_PROGRESS)
    throw new Error("El partido no está en curso.");
  return match;
}

// ── Registrar gol propio ───────────────────────────────────────────────────
export async function addHomeGoalAction(
  matchId: string,
  playerId: string | null,
  minute: number | null
): Promise<{ error?: string; success?: string }> {
  try {
    await requireAdmin();
    await requireInProgress(matchId);

    await prisma.$transaction([
      prisma.matchEvent.create({
        data: { matchId, type: EventType.GOAL, isOwn: true, playerId, minute },
      }),
      prisma.match.update({
        where: { id: matchId },
        data: { homeScore: { increment: 1 } },
      }),
    ]);

    revalidateLive();
    return { success: "¡Gol registrado!" };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

// ── Registrar gol del rival ────────────────────────────────────────────────
export async function addAwayGoalAction(
  matchId: string,
  minute: number | null
): Promise<{ error?: string; success?: string }> {
  try {
    await requireAdmin();
    await requireInProgress(matchId);

    await prisma.$transaction([
      prisma.matchEvent.create({
        data: { matchId, type: EventType.GOAL, isOwn: false, minute },
      }),
      prisma.match.update({
        where: { id: matchId },
        data: { awayScore: { increment: 1 } },
      }),
    ]);

    revalidateLive();
    return { success: "Gol rival registrado." };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

// ── Registrar tarjeta ──────────────────────────────────────────────────────
export async function addCardAction(
  matchId: string,
  type: "AMARILLA" | "ROJA",
  playerId: string,
  minute: number | null
): Promise<{ error?: string; success?: string }> {
  try {
    await requireAdmin();
    await requireInProgress(matchId);

    await prisma.matchEvent.create({
      data: {
        matchId,
        type: type === "AMARILLA" ? EventType.AMARILLA : EventType.ROJA,
        isOwn: true,
        playerId,
        minute,
      },
    });

    revalidateLive();
    return { success: "Tarjeta registrada." };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

// ── Finalizar partido ──────────────────────────────────────────────────────
// Calcula el resultado automáticamente a partir del marcador actual.
export async function finishMatchAction(
  matchId: string
): Promise<{ error?: string; success?: string }> {
  try {
    await requireAdmin();
    const match = await requireInProgress(matchId);

    const home = match.homeScore ?? 0;
    const away = match.awayScore ?? 0;
    const result: MatchResult =
      home > away ? MatchResult.WIN : home < away ? MatchResult.LOSS : MatchResult.DRAW;

    await prisma.match.update({
      where: { id: matchId },
      data: {
        status: MatchStatus.FINISHED,
        result,
        homeScore: home,
        awayScore: away,
      },
    });

    revalidateLive();
    revalidatePath("/admin/partidos");
    return { success: "Partido finalizado." };
  } catch (e) {
    return { error: (e as Error).message };
  }
}
