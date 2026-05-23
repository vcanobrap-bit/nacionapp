import type { Role } from "@/generated/prisma";
import type { DefaultSession } from "next-auth";

/**
 * Extendemos los tipos globales de Auth.js para incluir `role` e `id`
 * en Session y JWT, evitando castings manuales en componentes.
 */
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: Role;
    } & DefaultSession["user"];
  }

  interface User {
    role: Role;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: Role;
  }
}
