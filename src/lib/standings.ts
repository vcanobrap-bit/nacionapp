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
 * Acepta "Equipo 45", "3. Equipo 45", "3) Equipo 45", "Equipo 45 pts".
 * La posición NO se recalcula ordenando por puntos: se respeta el orden en
 * que la asociación publica la tabla, que puede tener desempates que no
 * conocemos. La posición es simplemente el número de fila.
 */
export function parseStandingsText(text: string): ParsedStandings {
  const rows: ParsedStandingsRow[] = [];
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
    rows.push({ position: rows.length + 1, teamName: m[1].trim(), points: parseInt(m[2], 10) });
  });

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
