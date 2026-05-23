import { auth } from "@/auth";
import { NextResponse } from "next/server";

/**
 * Proxy de autenticación — corre SOLO en rutas /admin/*.
 *
 * Arquitectura de acceso:
 *  - Rutas públicas (/, /partidos, etc.) → sin proxy, sin overhead de sesión.
 *  - /admin/*  → requiere sesión activa con role ADMIN.
 *                Sin sesión → /login?callbackUrl=<ruta>
 *                Sesión sin role ADMIN → /login?error=no-permission
 */
export default auth((req) => {
  const session = req.auth;

  // Sin sesión activa → ir a login preservando la ruta de retorno
  if (!session) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", req.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Sesión activa pero el usuario no es ADMIN (no debería ocurrir
  // dado que authorize() ya rechaza no-admins, pero queda como red de seguridad)
  if (session.user?.role !== "ADMIN") {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("error", "no-permission");
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
});

export const config = {
  // El proxy corre únicamente en /admin y sus subrutas.
  // Todo lo demás (/, /partidos, /posiciones…) es 100% público.
  matcher: ["/admin/:path*"],
};
