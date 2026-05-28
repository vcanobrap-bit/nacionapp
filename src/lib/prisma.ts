/**
 * Singleton de PrismaClient para Next.js — Prisma 7 con Driver Adapter.
 *
 * Usa un Proxy para inicialización lazy: el cliente real se crea la primera
 * vez que se llama a un método (ej. prisma.user.findMany), no al importar
 * el módulo. Esto permite que Next.js importe este archivo durante el build
 * sin necesitar DATABASE_URL en tiempo de compilación.
 */

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set in environment variables.");
  }

  const adapter = new PrismaPg({ connectionString });

  return new PrismaClient({
    adapter,
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });
}

function getClient(): PrismaClient {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = createPrismaClient();
  }
  return globalForPrisma.prisma;
}

/**
 * Proxy lazy: el PrismaClient real se instancia solo cuando se usa por
 * primera vez. Permite importar este módulo en el build sin DATABASE_URL.
 */
export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    return Reflect.get(getClient(), prop, getClient());
  },
});
