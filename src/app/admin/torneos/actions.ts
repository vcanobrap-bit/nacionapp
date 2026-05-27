"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

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

  revalidatePath("/admin/torneos");
  revalidatePath("/admin/partidos/nuevo");
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

  revalidatePath("/admin/torneos");
  return {};
}

// ── Eliminar campeonato ────────────────────────────────────────────────────
// La FK usa onDelete: SetNull, así que los partidos quedan sin campeonato (no se pierden).
export async function deleteTournamentAction(
  tournamentId: string
): Promise<{ error?: string }> {
  await requireAdmin();

  await prisma.tournament.delete({ where: { id: tournamentId } });

  revalidatePath("/admin/torneos");
  revalidatePath("/admin/partidos");
  revalidatePath("/");
  return {};
}
