"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { PlayerStatus } from "@/generated/prisma";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";

function requireAdmin() {
  return auth().then((session) => {
    if (!session || session.user.role !== "ADMIN") {
      throw new Error("No autorizado");
    }
    return session;
  });
}

export type PlayerFormState = { error?: string; success?: string } | undefined;
export type AdminFormState  = { error?: string; success?: string } | undefined;

// ── Actualizar jugadora ─────────────────────────────────────────────────────
export async function updatePlayerAction(
  _prev: PlayerFormState,
  formData: FormData
): Promise<PlayerFormState> {
  await requireAdmin();

  const userId = formData.get("userId") as string;
  if (!userId) return { error: "ID de jugadora inválido." };

  const firstName = (formData.get("firstName") as string)?.trim();
  const lastName  = (formData.get("lastName")  as string)?.trim();
  if (!firstName || !lastName) return { error: "Nombre y apellido son obligatorios." };

  const birthdateRaw  = formData.get("birthdate")   as string;
  const joiningYearRaw = formData.get("joiningYear") as string;
  const numberRaw      = formData.get("number")      as string;

  await prisma.profile.update({
    where: { userId },
    data: {
      firstName,
      lastName,
      avatarUrl:     (formData.get("avatarUrl")    as string) || null,
      birthdate:     birthdateRaw  ? new Date(birthdateRaw) : null,
      joiningYear:   joiningYearRaw ? parseInt(joiningYearRaw) : null,
      idealPosition: (formData.get("idealPosition") as string) || null,
      number:        numberRaw ? parseInt(numberRaw) : null,
      nationality:   (formData.get("nationality")  as string) || null,
      bio:           (formData.get("bio")           as string) || null,
      status:        (formData.get("status")        as PlayerStatus) ?? PlayerStatus.AVAILABLE,
      adminComments: (formData.get("adminComments") as string) || null,
    },
  });

  revalidatePath("/admin/jugadoras");
  revalidatePath("/");
  return { success: "Perfil actualizado correctamente." };
}

// ── Crear jugadora (sin credenciales de acceso) ─────────────────────────────
// Las jugadoras son perfiles deportivos, no usuarios de la plataforma.
// El email/password se genera internamente para cumplir la restricción del schema.
export async function createPlayerAction(
  _prev: PlayerFormState,
  formData: FormData
): Promise<PlayerFormState> {
  await requireAdmin();

  const firstName = (formData.get("firstName") as string)?.trim();
  const lastName  = (formData.get("lastName")  as string)?.trim();

  if (!firstName || !lastName) {
    return { error: "Nombre y apellido son obligatorios." };
  }

  const birthdateRaw   = formData.get("birthdate")    as string;
  const joiningYearRaw = formData.get("joiningYear")  as string;
  const numberRaw      = formData.get("number")        as string;
  const idealPosition  = (formData.get("idealPosition") as string) || null;

  // Generar credenciales placeholder — las jugadoras no pueden iniciar sesión
  // (authorize() bloquea todos los usuarios con role !== "ADMIN")
  const uid              = crypto.randomUUID();
  const placeholderEmail = `jugadora_${uid}@nacionapp.internal`;
  const hashedPassword   = await bcrypt.hash(crypto.randomUUID(), 12);

  await prisma.user.create({
    data: {
      email:    placeholderEmail,
      password: hashedPassword,
      role:     "PLAYER",
      profile: {
        create: {
          firstName,
          lastName,
          birthdate:     birthdateRaw   ? new Date(birthdateRaw) : null,
          joiningYear:   joiningYearRaw ? parseInt(joiningYearRaw, 10) : null,
          idealPosition,
          number:        numberRaw      ? parseInt(numberRaw, 10) : null,
          nationality:   "Argentina",
        },
      },
    },
  });

  revalidatePath("/admin/jugadoras");
  revalidatePath("/");
  return { success: "Jugadora creada correctamente." };
}

// ── Crear administrador ─────────────────────────────────────────────────────
export async function createAdminAction(
  _prev: AdminFormState,
  formData: FormData
): Promise<AdminFormState> {
  await requireAdmin();

  const email    = (formData.get("email")    as string)?.trim().toLowerCase();
  const password = formData.get("password")  as string;

  if (!email || !password) {
    return { error: "Usuario/email y contraseña son obligatorios." };
  }
  if (password.length < 6) {
    return { error: "La contraseña debe tener al menos 6 caracteres." };
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return { error: "Ya existe una cuenta con ese email." };

  const hashedPassword = await bcrypt.hash(password, 12);

  await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      role:     "ADMIN",
    },
  });

  return { success: `Administrador "${email}" creado correctamente.` };
}

// ── Eliminar jugadora ───────────────────────────────────────────────────────
export async function deletePlayerAction(userId: string): Promise<{ error?: string }> {
  await requireAdmin();
  await prisma.user.delete({ where: { id: userId, role: "PLAYER" } });
  revalidatePath("/admin/jugadoras");
  revalidatePath("/");
  return {};
}
