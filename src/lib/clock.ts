/**
 * Reloj del partido.
 *
 * El reloj NO se guarda como "minutos transcurridos", sino como marcas de
 * tiempo: `periodStartedAt` (cuándo arrancó el período actual) y
 * `clockBaseSeconds` (en qué segundo arranca ese período). El minuto que se
 * muestra se calcula. Así el reloj sobrevive a un refresh, a que se apague el
 * teléfono, y da lo mismo en todos los dispositivos que estén mirando.
 */

/** Fases dentro de un partido IN_PROGRESS. */
export type MatchPhase = "PRE" | "FIRST_HALF" | "HALF_TIME" | "SECOND_HALF";

export const PHASE_LABEL: Record<MatchPhase, string> = {
  PRE: "Previa",
  FIRST_HALF: "1er tiempo",
  HALF_TIME: "Entretiempo",
  SECOND_HALF: "2do tiempo",
};

/** Fases en que el partido ya empezó y se pueden registrar incidencias. */
export function acceptsEvents(phase: MatchPhase): boolean {
  return phase !== "PRE";
}

export interface ClockState {
  phase: MatchPhase;
  /** ISO string, o null si el reloj está detenido. */
  periodStartedAt: string | null;
  clockBaseSeconds: number;
  halfMinutes: number;
}

/** Segundos de juego corridos, según el reloj. */
export function clockSeconds(c: ClockState, nowMs: number): number {
  if (c.phase === "PRE") return 0;
  if (!c.periodStartedAt) return c.clockBaseSeconds; // detenido (entretiempo)
  const startedMs = new Date(c.periodStartedAt).getTime();
  const corrido = Math.floor((nowMs - startedMs) / 1000);
  return c.clockBaseSeconds + Math.max(0, corrido);
}

/** `12:05` */
export function formatClock(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

/**
 * Minuto con que se registra una incidencia.
 *
 * Usa el piso para que coincida con lo que se ve en pantalla: si el reloj
 * marca 12:05, el minuto es 12. Pre-llenar 13 parecería un error.
 */
export function clockMinute(seconds: number): number {
  return Math.floor(seconds / 60);
}

/**
 * ¿El reloj pasó el tiempo reglamentario del período en curso?
 *
 * En fútbol amateur el árbitro no anuncia cuánta adición se juega, así que la
 * app no inventa un "+3": solo marca que ya se pasó del reglamentario y el
 * partido termina cuando el árbitro lo pite.
 */
export function isStoppageTime(c: ClockState, seconds: number): boolean {
  if (c.phase === "FIRST_HALF") return seconds >= c.halfMinutes * 60;
  if (c.phase === "SECOND_HALF") return seconds >= c.halfMinutes * 2 * 60;
  return false;
}
