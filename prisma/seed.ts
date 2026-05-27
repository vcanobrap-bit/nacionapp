/**
 * prisma/seed.ts
 * Ejecutar: npm run db:seed
 *
 * Crea datos de ejemplo: 1 admin, 4 jugadoras y 3 partidos.
 */

import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import {
  PrismaClient,
  Role,
  MatchStatus,
  MatchResult,
  PlayerStatus,
} from "../src/generated/prisma";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is not set.");

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

const SALT_ROUNDS = 12;

async function main() {
  console.log("🌱 Seeding database…");

  // ── Admin ──────────────────────────────────────────────
  const adminPassword = await bcrypt.hash("nacional123", SALT_ROUNDS);
  const admin = await prisma.user.upsert({
    where: { email: "vcanobra" },
    update: { password: adminPassword },
    create: {
      email: "vcanobra",
      password: adminPassword,
      role: Role.ADMIN,
      profile: {
        create: {
          firstName: "Admin",
          lastName: "Nación",
        },
      },
    },
  });
  console.log("  ✔ Admin:", admin.email);

  // ── Jugadoras ──────────────────────────────────────────
  const playerPassword = await bcrypt.hash("Player1234!", SALT_ROUNDS);

  const players = await Promise.all([
    prisma.user.upsert({
      where: { email: "jugadora1@nacion.com" },
      update: {},
      create: {
        email: "jugadora1@nacion.com",
        password: playerPassword,
        role: Role.PLAYER,
        profile: {
          create: {
            firstName: "Lucía",
            lastName: "González",
            idealPosition: "Delantera",
            number: 9,
            nationality: "Argentina",
            birthdate: new Date("2000-03-15"),
            joiningYear: 2019,
            status: PlayerStatus.AVAILABLE,
            bio: "Goleadora del equipo, veloz y técnica.",
          },
        },
      },
    }),
    prisma.user.upsert({
      where: { email: "jugadora2@nacion.com" },
      update: {},
      create: {
        email: "jugadora2@nacion.com",
        password: playerPassword,
        role: Role.PLAYER,
        profile: {
          create: {
            firstName: "Sofía",
            lastName: "Rodríguez",
            idealPosition: "Mediocampista",
            number: 8,
            nationality: "Argentina",
            birthdate: new Date("2001-07-22"),
            joiningYear: 2021,
            status: PlayerStatus.AVAILABLE,
          },
        },
      },
    }),
    prisma.user.upsert({
      where: { email: "jugadora3@nacion.com" },
      update: {},
      create: {
        email: "jugadora3@nacion.com",
        password: playerPassword,
        role: Role.PLAYER,
        profile: {
          create: {
            firstName: "Valentina",
            lastName: "Martínez",
            idealPosition: "Portera",
            number: 1,
            nationality: "Argentina",
            birthdate: new Date("1998-11-03"),
            joiningYear: 2017,
            status: PlayerStatus.AVAILABLE,
          },
        },
      },
    }),
    prisma.user.upsert({
      where: { email: "jugadora4@nacion.com" },
      update: {},
      create: {
        email: "jugadora4@nacion.com",
        password: playerPassword,
        role: Role.PLAYER,
        profile: {
          create: {
            firstName: "Camila",
            lastName: "Peralta",
            idealPosition: "Defensora",
            number: 4,
            nationality: "Argentina",
            birthdate: new Date("2002-05-18"),
            joiningYear: 2022,
            status: PlayerStatus.INJURED,
            adminComments: "Recuperándose de esguince de tobillo. Alta estimada: 2 semanas.",
          },
        },
      },
    }),
  ]);

  console.log("  ✔ Jugadoras:", players.map((p) => p.email).join(", "));

  // ── Partidos ───────────────────────────────────────────

  // Partido 1: FINISHED (resultado WIN)
  const match1 = await prisma.match.upsert({
    where: { id: "seed-match-1" },
    update: {},
    create: {
      id: "seed-match-1",
      date: new Date("2025-06-10T18:00:00Z"),
      opponent: "Boca Juniors Femenino",
      venue: "Estadio Alberto J. Armando",
      status: MatchStatus.FINISHED,
      result: MatchResult.WIN,
      homeScore: 3,
      awayScore: 1,
      createdById: admin.id,
      players: {
        create: [
          { userId: players[0].id, isTitular: true },
          { userId: players[1].id, isTitular: true },
          { userId: players[2].id, isTitular: true },
          { userId: players[3].id, isTitular: false },
        ],
      },
    },
  });

  // Partido 2: IN_PROGRESS (en curso, con once inicial definido)
  const match2 = await prisma.match.upsert({
    where: { id: "seed-match-2" },
    update: {},
    create: {
      id: "seed-match-2",
      date: new Date("2025-07-05T16:00:00Z"),
      opponent: "River Plate Femenino",
      venue: "Estadio Monumental",
      status: MatchStatus.IN_PROGRESS,
      createdById: admin.id,
      players: {
        create: [
          { userId: players[0].id, isTitular: true },
          { userId: players[1].id, isTitular: true },
          { userId: players[2].id, isTitular: true },
        ],
      },
    },
  });

  // Partido 3: PENDING (próximo)
  const match3 = await prisma.match.upsert({
    where: { id: "seed-match-3" },
    update: {},
    create: {
      id: "seed-match-3",
      date: new Date("2025-08-20T20:00:00Z"),
      opponent: "San Lorenzo Femenino",
      venue: "Estadio Pedro Bidegain",
      status: MatchStatus.PENDING,
      createdById: admin.id,
      players: {
        create: [
          { userId: players[0].id },
          { userId: players[1].id },
        ],
      },
    },
  });

  console.log(
    "  ✔ Partidos:",
    match1.opponent,
    `(${match1.status})`,
    "|",
    match2.opponent,
    `(${match2.status})`,
    "|",
    match3.opponent,
    `(${match3.status})`
  );

  console.log("\n✅ Seed completado.");
  console.log("\n📋 Credenciales de prueba:");
  console.log("   ADMIN  → vcanobra              / nacional123");
  console.log("   PLAYER → jugadora1@nacion.com  / Player1234!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
