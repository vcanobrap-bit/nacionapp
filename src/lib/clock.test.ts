import { clockSeconds, formatClock, clockMinute, isStoppageTime, type ClockState } from "./clock";

let fallos = 0;
function chk(nombre: string, real: unknown, esperado: unknown) {
  const ok = real === esperado;
  if (!ok) fallos++;
  console.log(`${ok ? "✓" : "✗"} ${nombre}: ${real}${ok ? "" : ` (esperaba ${esperado})`}`);
}

const T0 = new Date("2026-09-03T20:30:00Z").getTime();
const base = { halfMinutes: 30 };

// ── Previa: sin reloj ──
chk("Previa marca 0", clockSeconds(
  { ...base, phase: "PRE", periodStartedAt: null, clockBaseSeconds: 0 }, T0), 0);

// ── 1er tiempo: corre desde 0 ──
const t1: ClockState = { ...base, phase: "FIRST_HALF",
  periodStartedAt: new Date(T0).toISOString(), clockBaseSeconds: 0 };
chk("1T a los 12:05", formatClock(clockSeconds(t1, T0 + 725_000)), "12:05");
chk("1T minuto de incidencia coincide con pantalla", clockMinute(clockSeconds(t1, T0 + 725_000)), 12);
chk("1T sin adición al minuto 12", isStoppageTime(t1, clockSeconds(t1, T0 + 725_000)), false);
chk("1T en adición pasados los 30", isStoppageTime(t1, clockSeconds(t1, T0 + 1_950_000)), true);

// ── Entretiempo: congelado en 33:12 ──
const et: ClockState = { ...base, phase: "HALF_TIME",
  periodStartedAt: null, clockBaseSeconds: 33 * 60 + 12 };
chk("Entretiempo congelado", formatClock(clockSeconds(et, T0 + 9_999_999)), "33:12");

// ── 2do tiempo: RETOMA EN 30:00, no en 0 ni en 33 ──
const T2 = T0 + 45 * 60_000;
const t2: ClockState = { ...base, phase: "SECOND_HALF",
  periodStartedAt: new Date(T2).toISOString(), clockBaseSeconds: 30 * 60 };
chk("2T arranca en 30:00", formatClock(clockSeconds(t2, T2)), "30:00");
chk("2T a los 5 min marca 35:00", formatClock(clockSeconds(t2, T2 + 300_000)), "35:00");
chk("2T sin adición al minuto 58", isStoppageTime(t2, clockSeconds(t2, T2 + 28 * 60_000)), false);
chk("2T en adición pasados los 60", isStoppageTime(t2, clockSeconds(t2, T2 + 31 * 60_000)), true);

// ── Torneo de 45 minutos: el 2T retoma en 45:00 ──
const t45: ClockState = { halfMinutes: 45, phase: "SECOND_HALF",
  periodStartedAt: new Date(T2).toISOString(), clockBaseSeconds: 45 * 60 };
chk("Con tiempos de 45, el 2T retoma en 45:00", formatClock(clockSeconds(t45, T2)), "45:00");

console.log(fallos === 0 ? "\nTODO OK" : `\n${fallos} FALLOS`);
process.exit(fallos === 0 ? 0 : 1);
