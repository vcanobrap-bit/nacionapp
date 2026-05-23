/**
 * Singleton de PrismaClient para Next.js — Prisma 7 con Driver Adapter.
 *
 * Prisma 7 ya no lee DATABASE_URL automáticamente desde el entorno.
 * El URL debe pasarse explícitamente vía un Driver Adapter (@prisma/adapter-pg).
 *
 * El singleton evita múltiples instancias durante el hot-reload de Next.js.
 */

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
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

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
