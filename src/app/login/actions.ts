"use server";

import { signIn } from "@/auth";
import { AuthError } from "next-auth";

export type LoginState = {
  error?: string;
} | undefined;

/**
 * Server Action para iniciar sesión con credenciales.
 *
 * - Si las credenciales son válidas, Auth.js redirige automáticamente
 *   (lanza un error NEXT_REDIRECT que debe re-propagarse).
 * - Si fallan, devuelve un mensaje de error tipado para el formulario.
 */
export async function loginAction(
  _prevState: LoginState,
  formData: FormData
): Promise<LoginState> {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  // El login es exclusivo para admins → destino por defecto es /admin
  const callbackUrl = (formData.get("callbackUrl") as string) || "/admin";

  // Validación básica en servidor
  if (!email || !password) {
    return { error: "Completá todos los campos." };
  }

  try {
    await signIn("credentials", {
      email,
      password,
      redirectTo: callbackUrl,
    });
  } catch (error) {
    // Auth.js implementa redirects como errores — los re-propagamos
    if (error instanceof AuthError) {
      switch (error.type) {
        case "CredentialsSignin":
          return { error: "Usuario o contraseña incorrectos." };
        case "CallbackRouteError":
          return { error: "Usuario o contraseña incorrectos." };
        default:
          return { error: "Ocurrió un error. Intentá de nuevo." };
      }
    }
    // Re-lanzar para que Next.js maneje el redirect exitoso
    throw error;
  }
}
