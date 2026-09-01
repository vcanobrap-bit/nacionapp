"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { parseStandingsText } from "@/lib/standings";

async function requireAdmin() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") throw new Error("No autorizado");
}

export type TournamentFormState = { error?: string; success?: string } | undefined;

// ── Crear campeonato ───────────────────────────────────────────────────────
export async function createTournamentAction(
  _prev: TournamentFormState,
  formData: FormData
): Promise<TournamentFormState> {
  await requireAdmin();

  const name = (formData.get("name") as string)?.trim();
  const yearRaw = formData.get("year") as string;

  if (!name) return { error: "El nombre del campeonato es obligatorio." };
  if (!yearRaw) return { error: "El año es obligatorio." };

  const year = parseInt(yearRaw, 10);
  if (isNaN(year) || year < 2000 || year > 2100) {
    return { error: "Año inválido." };
  }

  await prisma.tournament.create({ data: { name, year } });

  revalidatePath("/");
  return { success: `Campeonato "${name} ${year}" creado.` };
}

// ── Activar / desactivar ───────────────────────────────────────────────────
export async function toggleTournamentActiveAction(
  tournamentId: string
): Promise<{ error?: string }> {
  await requireAdmin();

  const t = await prisma.tournament.findUnique({ where: { id: tournamentId } });
  if (!t) return { error: "Campeonato no encontrado." };

  await prisma.tournament.update({
    where: { id: tournamentId },
    data: { isActive: !t.isActive },
  });

  revalidatePath("/");
  return {};
}

// ── Eliminar campeonato ────────────────────────────────────────────────────
// La FK usa onDelete: SetNull, así que los partidos quedan sin campeonato (no se pierden).
export async function deleteTournamentAction(
  tournamentId: string
): Promise<{ error?: string }> {
  await requireAdmin();

  await prisma.tournament.delete({ where: { id: tournamentId } });

  revalidatePath("/");
  return {};
}

// ═══════════════════════════════════════════════════════════
// TABLA DE POSICIONES OFICIAL (transcrita del pantallazo)
// ═══════════════════════════════════════════════════════════

export type StandingsFormState = { error?: string; success?: string } | undefined;

/**
 * Guarda una tabla completa como snapshot nuevo. No se edita la anterior:
 * cada publicación de la asociación es un snapshot, y la app muestra el más
 * reciente por torneo. Así queda historial y no hay conflictos de edición.
 */
export async function saveStandingsAction(
  _prev: StandingsFormState,
  formData: FormData
): Promise<StandingsFormState> {
  await requireAdmin();

  const tournamentId = (formData.get("tournamentId") as string) || "";
  const asOfRaw = (formData.get("asOf") as string) || "";
  const text = (formData.get("text") as string) || "";

  if (!tournamentId) return { error: "Elige el campeonato." };
  if (!asOfRaw) return { error: "Indica la fecha de la tabla." };

  const asOf = new Date(asOfRaw);
  if (isNaN(asOf.getTime())) return { error: "Fecha inválida." };

  const { rows, errors } = parseStandingsText(text);
  if (errors.length > 0) {
    return { error: `No se pudo leer la línea ${errors[0].line}: "${errors[0].text}". Formato: Equipo 45` };
  }
  if (rows.length < 2) return { error: "La tabla necesita al menos dos equipos." };

  await prisma.standingsSnapshot.create({
    data: {
      tournamentId,
      asOf,
      rows: { create: rows },
    },
  });

  revalidatePath("/");
  return { success: `Tabla guardada con ${rows.length} equipos.` };
}

/** Borra un snapshot (para deshacer una carga equivocada). */
export async function deleteStandingsSnapshotAction(
  snapshotId: string
): Promise<{ error?: string }> {
  await requireAdmin();
  await prisma.standingsSnapshot.delete({ where: { id: snapshotId } });
  revalidatePath("/");
  return {};
}
