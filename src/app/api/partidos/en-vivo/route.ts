import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/partidos/en-vivo
 *
 * Devuelve el partido actualmente IN_PROGRESS con su once inicial.
 * Si no hay partido en curso, responde con { match: null }.
 * Es 100% pública — sin autenticación.
 */
export async function GET() {
  const match = await prisma.match.findFirst({
    where: { status: "IN_PROGRESS" },
    select: {
      id: true,
      opponent: true,
      venue: true,
      date: true,
      homeScore: true,
      awayScore: true,
      players: {
        where: { isTitular: true },
        select: {
          user: {
            select: {
              profile: {
                select: {
                  firstName: true,
                  lastName: true,
                  number: true,
                  idealPosition: true,
                  avatarUrl: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!match) {
    return NextResponse.json({ match: null });
  }

  const titulares = match.players
    .map((pm) => pm.user.profile)
    .filter(Boolean)
    .map((p) => ({
      name: `${p!.firstName} ${p!.lastName}`,
      number: p!.number,
      position: p!.idealPosition,
      avatarUrl: p!.avatarUrl,
    }));

  // Ordenar por posición
  const positionOrder = ["Portera", "Defensora", "Mediocampista", "Delantera"];
  titulares.sort((a, b) => {
    const ai = positionOrder.indexOf(a.position ?? "");
    const bi = positionOrder.indexOf(b.position ?? "");
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });

  return NextResponse.json({
    match: {
      id: match.id,
      opponent: match.opponent,
      venue: match.venue,
      date: match.date,
      homeScore: match.homeScore,
      awayScore: match.awayScore,
      titulares,
    },
  });
}
