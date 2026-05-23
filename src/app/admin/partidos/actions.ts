"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { MatchStatus, MatchResult } from "@/generated/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

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

  await prisma.match.create({
    data: {
      date: new Date(date),
      opponent,
      venue,
      notes,
      status: MatchStatus.PENDING,
      createdById: session.user.id,
    },
  });

  revalidatePath("/admin/partidos");
  redirect("/admin/partidos");
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
    },
  });

  revalidatePath("/admin/partidos");
  return { success: "Partido actualizado." };
}

// ── Eliminar partido ───────────────────────────────────────────────────────
export async function deleteMatchAction(matchId: string) {
  await requireAdmin();
  await prisma.match.delete({ where: { id: matchId } });
  revalidatePath("/admin/partidos");
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
  return {};
}
