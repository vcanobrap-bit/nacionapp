import { parseStandingsText, isOurTeam, formatAsOf } from "./standings";

let fallos = 0;
function chk(nombre: string, real: unknown, esperado: unknown) {
  const ok = JSON.stringify(real) === JSON.stringify(esperado);
  if (!ok) fallos++;
  console.log(`${ok ? "✓" : "✗"} ${nombre}${ok ? "" : `\n    real:     ${JSON.stringify(real)}\n    esperado: ${JSON.stringify(esperado)}`}`);
}

// ── Formatos que llegan de una transcripción a mano ──
const r = (position: number, teamName: string, points: number) => ({ position, teamName, points });

chk("Equipo y puntos", parseStandingsText("Nacional 45").rows, [r(1, "Nacional", 45)]);
chk("Nombre de varias palabras", parseStandingsText("Deportivo Lota 38").rows, [r(1, "Deportivo Lota", 38)]);
chk("Con 'pts'", parseStandingsText("Huachipato 30 pts").rows, [r(1, "Huachipato", 30)]);
chk("Con 'puntos'", parseStandingsText("Naval 12 puntos").rows, [r(1, "Naval", 12)]);
chk("Número de posición '3.' se ignora: la posición es la fila",
  parseStandingsText("3. Arturo Prat 42").rows, [r(1, "Arturo Prat", 42)]);
chk("Posición con paréntesis '3)'", parseStandingsText("3) Arturo Prat 42").rows, [r(1, "Arturo Prat", 42)]);
chk("Posición con guion '1 - '", parseStandingsText("1 - Nacional 45").rows, [r(1, "Nacional", 45)]);
chk("Nombre que termina en número no se confunde con los puntos",
  parseStandingsText("Colo Colo 2 45").rows, [r(1, "Colo Colo 2", 45)]);
chk("Espacios alrededor se recortan", parseStandingsText("   Nacional   45   ").rows, [r(1, "Nacional", 45)]);

// ── Varias filas, líneas vacías y saltos de Windows ──
const tabla = "Nacional 45\r\n\r\nArturo Prat 42\r\nDeportivo Lota 38\n";
chk("Tabla completa: posiciones 1,2,3 en orden de publicación",
  parseStandingsText(tabla).rows, [r(1, "Nacional", 45), r(2, "Arturo Prat", 42), r(3, "Deportivo Lota", 38)]);
chk("Sin errores en una tabla bien escrita", parseStandingsText(tabla).errors, []);

// ── El orden NO se recalcula por puntos: se respeta el de la asociación ──
chk("Puntos desordenados se respetan tal cual (desempates desconocidos)",
  parseStandingsText("Naval 30\nNacional 45").rows, [r(1, "Naval", 30), r(2, "Nacional", 45)]);

// ── Líneas que no se entienden se reportan con su número ──
const conError = parseStandingsText("Nacional 45\nEsta línea no tiene puntos\nNaval 30");
chk("Línea sin puntos → error con número de línea",
  conError.errors, [{ line: 2, text: "Esta línea no tiene puntos" }]);
chk("Las filas válidas se conservan y renumeran sin contar la mala",
  conError.rows, [r(1, "Nacional", 45), r(2, "Naval", 30)]);
chk("Texto vacío → sin filas ni errores", parseStandingsText("  \n\n "), { rows: [], errors: [] });

// ── Nuestra fila ──
chk("'Nacional' somos nosotras", isOurTeam("Nacional"), true);
chk("'C.D. Nacional Fem.' también", isOurTeam("C.D. Nacional Fem."), true);
chk("Mayúsculas no importan", isOurTeam("NACIONAL"), true);
chk("'Arturo Prat' no", isOurTeam("Arturo Prat"), false);

// ── Fecha del disclaimer: medianoche UTC, formateada en UTC (no se corre un día) ──
const f = formatAsOf("2026-09-01T00:00:00.000Z");
chk("Fecha se muestra el mismo día, no el anterior", f.includes("1") && f.includes("septiembre") && f.includes("2026"), true);

console.log(fallos === 0 ? "\nTODO OK" : `\n${fallos} FALLOS`);
process.exit(fallos === 0 ? 0 : 1);
