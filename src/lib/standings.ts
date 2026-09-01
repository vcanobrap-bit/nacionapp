/**
 * Tabla de posiciones oficial de la asociación.
 *
 * Se transcribe a mano desde un pantallazo: una fila por línea, "Equipo 45".
 * Este módulo es compartido por el Server Action (validar y guardar) y por el
 * modal (previsualizar mientras se escribe), así los dos ven exactamente lo
 * mismo.
 */

export interface ParsedStandingsRow {
  position: number;
  teamName: string;
  points: number;
}

export interface ParsedStandings {
  rows: ParsedStandingsRow[];
  /** Líneas que no se pudieron leer, con su número (1-based) para señalarlas. */
  errors: { line: number; text: string }[];
}

/**
 * Orden de la tabla: puntos de mayor a menor. `Array.sort` es estable, así
 * que los empates conservan el orden en que se cargaron — que es el único
 * desempate que conocemos (el de la asociación).
 *
 * Es la ÚNICA regla de orden y la usan el parser (previsualización y
 * guardado) y la serialización en page.tsx (para que valga también en
 * snapshots cargados antes de que existiera).
 */
export function sortByPoints<T extends { points: number }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => b.points - a.points);
}

/**
 * Acepta "Equipo 45", "3. Equipo 45", "3) Equipo 45", "Equipo 45 pts".
 * Un número de posición al inicio de la línea se ignora: la posición final
 * la da el orden por puntos (ver `sortByPoints`), no lo que se pegó.
 */
export function parseStandingsText(text: string): ParsedStandings {
  const leidas: { teamName: string; points: number }[] = [];
  const errors: ParsedStandings["errors"] = [];

  text.split(/\r?\n/).forEach((raw, i) => {
    const line = raw.trim();
    if (!line) return;
    // Quitar un número de posición al inicio ("3.", "3)", "3 -")
    const sinPos = line.replace(/^\d+\s*[.)\-:]?\s+/, "");
    const m = sinPos.match(/^(.+?)\s+(\d+)\s*(?:pts?\.?|puntos?)?$/i);
    if (!m) {
      errors.push({ line: i + 1, text: line });
      return;
    }
    leidas.push({ teamName: m[1].trim(), points: parseInt(m[2], 10) });
  });

  const rows: ParsedStandingsRow[] = sortByPoints(leidas).map((r, i) => ({
    position: i + 1,
    ...r,
  }));
  return { rows, errors };
}

/** ¿Esta fila somos nosotras? Se resalta en la tabla. */
export function isOurTeam(teamName: string): boolean {
  return teamName.toLowerCase().includes("nacional");
}

/** Fecha "actualizada al …" del disclaimer. Se guarda como medianoche UTC. */
export function formatAsOf(iso: string): string {
  return new Date(iso).toLocaleDateString("es-CL", {
    day: "numeric", month: "long", year: "numeric", timeZone: "UTC",
  });
}
