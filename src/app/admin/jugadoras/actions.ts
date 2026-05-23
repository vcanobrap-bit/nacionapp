"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { PlayerStatus } from "@/generated/prisma";
import { revalidatePath } from "next/cache";

function requireAdmin() {
  return auth().then((session) => {
    if (!session || session.user.role !== "ADMIN") {
      throw new Error("No autorizado");
    }
    return session;
  });
}

export type PlayerFormState = { error?: string; success?: string } | undefined;

export async function updatePlayerAction(
  _prev: PlayerFormState,
  formData: FormData
): Promise<PlayerFormState> {
  await requireAdmin();

  const userId = formData.get("userId") as string;
  if (!userId) return { error: "ID de jugadora inválido." };

  const firstName = (formData.get("firstName") as string)?.trim();
  const lastName = (formData.get("lastName") as string)?.trim();

  if (!firstName || !lastName) {
    return { error: "Nombre y apellido son obligatorios." };
  }

  const birthdateRaw = formData.get("birthdate") as string;
  const joiningYearRaw = formData.get("joiningYear") as string;
  const numberRaw = formData.get("number") as string;

  await prisma.profile.update({
    where: { userId },
    data: {
      firstName,
      lastName,
      avatarUrl: (formData.get("avatarUrl") as string) || null,
      birthdate: birthdateRaw ? new Date(birthdateRaw) : null,
      joiningYear: joiningYearRaw ? parseInt(joiningYearRaw) : null,
      idealPosition: (formData.get("idealPosition") as string) || null,
      number: numberRaw ? parseInt(numberRaw) : null,
      nationality: (formData.get("nationality") as string) || null,
      bio: (formData.get("bio") as string) || null,
      // Campos privados (solo admin)
      status: (formData.get("status") as PlayerStatus) ?? PlayerStatus.AVAILABLE,
      adminComments: (formData.get("adminComments") as string) || null,
    },
  });

  revalidatePath("/admin/jugadoras");
  return { success: "Perfil actualizado correctamente." };
}
