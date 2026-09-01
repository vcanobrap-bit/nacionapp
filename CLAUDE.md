# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

# NacionApp — Contexto del proyecto

**Nacional Femenino** — app de gestión del plantel, partidos y estadísticas.

## Stack exacto (no asumir versiones antiguas)

| Tecnología | Versión | Notas críticas |
|---|---|---|
| Next.js | 16.2.6 | App Router. Si se agrega middleware, el archivo es `proxy.ts` (no `middleware.ts`) |
| React | 19.2.4 | `useActionState` en lugar de `useFormState` |
| Tailwind CSS | v4 | Config vía PostCSS, sin `tailwind.config.js` |
| Prisma | 7.8.x | **Breaking**: URL en `prisma.config.ts`, requiere Driver Adapter |
| `@prisma/adapter-pg` | 7.8.x | Obligatorio al instanciar `PrismaClient` |
| Auth.js (next-auth) | v5 beta | `src/auth.ts`, no `pages/api/auth` |
| bcryptjs | 3.x | Para hashear passwords (12 salt rounds) |
| TypeScript | 5.x | `strict: true` |

## Arquitectura de acceso — UNA sola interfaz

**No hay panel `/admin`.** La administración vive *sobre la vista pública*: la admin
navega la misma app que las hinchas y edita en el lugar mediante modales y botones
que solo aparecen con sesión ADMIN. Al iniciar sesión se vuelve a `/`.

> **Decisión de arquitectura (no revertir sin motivo).** Antes existían dos UIs de
> admin en paralelo: las rutas `/admin/*` y los modales sobre la vista pública. Cada
> cambio había que hacerlo dos veces y se desincronizaban. Se eliminó `/admin/*` y los
> modales quedaron como interfaz oficial. **Al agregar funcionalidad de admin, va en un
> modal/control inline sobre la vista pública — nunca en una ruta nueva.**

- **Todas las rutas son públicas**; no hay middleware de rutas (`src/proxy.ts` fue eliminado).
- La autorización vive **exclusivamente en los Server Actions**: cada mutación empieza
  con `requireAdmin()` (verifica `auth()` y `role === "ADMIN"` y lanza si no).
  Al agregar un Server Action nuevo, **empezarlo siempre con `requireAdmin()`**.
- Los datos privados (`status`, `adminComments`) se filtran en `src/app/page.tsx`:
  solo se serializan al cliente si `isAdmin`.
- Solo usuarios con `role: "ADMIN"` pueden autenticarse. Los `PLAYER` son rechazados en `authorize()`.

### Componentes de administración

| Componente | Propósito |
|---|---|
| `_components/admin/MatchModal.tsx` | Crear/editar partido + armar once inicial |
| `_components/admin/PlayerModal.tsx` | Crear/editar jugadora (datos públicos y privados) |
| `_components/admin/TournamentModal.tsx` | Crear campeonatos, activar/desactivar, eliminar |
| `_components/admin/AddAdminModal.tsx` | Alta de otro usuario administrador |
| `_components/admin/StandingsModal.tsx` | Transcribir la tabla oficial de la asociación |
| `_components/LiveMatchCard.tsx` | Consola de partido en vivo: goles, tarjetas, cambios, finalizar |

## Base de datos — Supabase PostgreSQL

- **Runtime** (app): Transaction Pooler, puerto 6543 (`DATABASE_URL`, `?pgbouncer=true`)
- **Migraciones/push**: Session Pooler, puerto 5432 (`DIRECT_URL`)
- Instancia Prisma para auth: `src/auth.ts` crea su propio cliente (no usa el singleton global)
- Singleton global: `src/lib/prisma.ts`

## Modelos clave

```
User         → id, email, password, role (ADMIN | PLAYER)
Profile      → firstName, lastName, avatarUrl, birthdate, joiningYear, idealPosition,
               number, bio [PÚBLICO]
               status (AVAILABLE | INJURED), adminComments [PRIVADO/ADMIN]
Tournament   → name, year, isActive — campeonatos; FK SetNull en Match al borrar
Match        → date, opponent, venue,
               status (PENDING | IN_PROGRESS | FINISHED | POSTPONED),
               result (WIN | LOSS | DRAW), homeScore, awayScore, notes,
               tournamentId?, round?, fixtureRoundNumber?
MatchEvent   → matchId, type (GOAL | AMARILLA | ROJA | CAMBIO), isOwn (bool),
               playerId?  → autora del gol/tarjeta, o la que SALE en un CAMBIO
               player2Id? → solo CAMBIO: la que ENTRA
               minute?
PlayerMatch  → userId, matchId, isTitular (bool) — convocatoria y titularidad
```

### Semántica de `MatchStatus`

- `PENDING` — por jugar, con fecha confirmada.
- `IN_PROGRESS` — en curso; habilita la consola en vivo y el armado del once.
- `FINISHED` — jugado; muestra resultado + bitácora de incidencias.
- `POSTPONED` ("Reagendado") — **reprogramado sin fecha nueva**. Cuenta como partido
  pendiente para los puntos ideales, pero se **excluye** del cálculo de "próximo
  partido" (no tiene fecha confiable). En la UI muestra "Nueva fecha a confirmar".

### Bitácora del partido

Los `MatchEvent` se cargan en vivo desde `LiveMatchCard` y siguen visibles cuando el
partido pasa a `FINISHED`: `src/app/page.tsx` los serializa en `MatchData.events` y
`AppShell` los renderiza con `BitacoraList`. Al tocar los eventos, recordar que hay
**dos** superficies que los muestran: la tarjeta en vivo y la bitácora del partido jugado.

## Partido en vivo — fases y reloj

`MatchStatus.IN_PROGRESS` significa "este partido se gestiona en vivo", **no**
"la pelota está rodando". Adentro vive `Match.phase`:

| Fase | En la cancha | Qué habilita |
|---|---|---|
| `PRE` | Camarín y calentamiento | Cargar el once. Sin reloj. **Sin incidencias.** |
| `FIRST_HALF` | Pitazo inicial | Reloj desde 0. Incidencias con minuto. |
| `HALF_TIME` | Descanso | Reloj congelado. Cambios del DT sin minuto. |
| `SECOND_HALF` | Vuelta | Reloj retoma en `halfMinutes*60`. |

El motivo del `PRE`: el once se carga ~40 minutos antes del partido, y antes
había que marcar el partido "en curso" solo para poder cargarlo, mostrando
"En juego" mientras el equipo todavía calentaba.

### El reloj se guarda como marcas de tiempo, no como minutos

`periodStartedAt` (cuándo arrancó el período) + `clockBaseSeconds` (en qué
segundo arranca). El minuto se **calcula** (`src/lib/clock.ts`). Así el reloj
sobrevive a un refresh, a que se apague el teléfono y es igual en todos los
dispositivos. **Nunca** guardar un contador de minutos en estado de React.

**El 2do tiempo retoma en el reglamentario del primero** (30:00 con tiempos de
30), no en 0 ni donde haya terminado el 1er tiempo con su adición. Es la
convención del fútbol y hace comparables los minutos entre partidos.
`npm run test:clock` verifica esta regla.

`serverNow` viaja de `page.tsx` al cliente **solo para el primer render**, para
que el HTML del servidor y el del cliente coincidan. Cada tick del reloj lee
`Date.now()` directo.

> **No agregar corrección de desfase del reloj del teléfono.** Se intentó con
> `offset = serverNow − Date.now()` calculado al hidratar, y estaba mal: como
> `serverNow` es del SSR, el offset absorbía el retraso de hidratación (1–5 s en
> un teléfono) y lo restaba a cada lectura. Resultado: el reloj quedaba en 0:00
> varios segundos y luego corría atrasado — "el reloj no corre". Un teléfono con
> la hora mal puesta es raro; un reloj que no arranca, no. Si algún día hace
> falta, la corrección debe medirse con un round-trip, nunca contra el SSR.

### Flujo guiado el día del partido

Para que la usuaria no se pierda entre pantallas, el modal encadena los pasos:

1. Guardar el partido como **"En curso"** no cierra el modal: muestra un prompt
   "¿Cargar el once inicial ahora?" con "Completar después". Aparece si quedó en
   curso **sin once cargado** (`needsLineup`), no al editar uno que ya tiene once
   (por ejemplo, las notas a mitad de partido). Mientras se muestra,
   `PartidoForm` se **desmonta**: si siguiera montado, su efecto de éxito se
   re-dispararía en cada refresh y el prompt se abriría en bucle.
2. Guardar el once (`onLineupSaved`) cierra el modal y lleva a **Posiciones**
   con scroll arriba: ahí está la tarjeta en vivo con "▶ Iniciar 1er tiempo".

`AppShell` guarda `editingMatchId` y deriva el partido desde `matches`, no el
objeto: así, tras un `router.refresh()`, el modal ve el estado y los titulares
frescos en vez de la copia capturada al abrirlo.

### Espectadores: sondeo mientras hay partido en vivo

La página se renderiza en el servidor una vez. El admin ve sus cambios porque
cada acción llama a `router.refresh()` en su cliente; nadie más se entera.
`LiveRefresher` (en `AppShell`) llama a `router.refresh()` cada 6 s **solo
mientras `liveMatch !== null`**, pausado con la pestaña en segundo plano y
con refresh inmediato al volver. Cuando el partido termina, el siguiente
refresh trae `liveMatch = null` y el sondeo se apaga solo.

`router.refresh()` conserva el estado del cliente, así que un refresh en
medio de un formulario o con un desplegable abierto no se nota. El reloj
**no** depende del sondeo: recibe `periodStartedAt` una vez y corre local.

Si el sondeo llega a pesar (muchos espectadores), dos escalones:
1. Endpoint mínimo `¿cambió algo?` y refrescar solo si sí. Mismo refresh,
   disparador barato.
2. Supabase Realtime sobre `matches` y `match_events` disparando el mismo
   `router.refresh()`. Requiere `@supabase/supabase-js` en el cliente, la
   clave anónima como `NEXT_PUBLIC_*`, activar Realtime en esas tablas y una
   política RLS de lectura anónima — cada uno es un paso manual en Supabase.

### Fútbol amateur: sin "+3" de adición

El árbitro no anuncia cuánta adición se juega y no hay tablero. La app **no
inventa** un `30+2`: el reloj sigue corriendo (32:15) y solo se pone **ámbar**
al pasar el reglamentario. Por eso la bitácora se agrupa por tiempo en vez de
usar notación: sin ella el minuto 32 sería ambiguo (¿adición del primero, o
minuto 2 del segundo, que arranca en 30?).

### La regla del minuto en el entretiempo

Con el partido en `HALF_TIME`, el minuto que se escriba decide la fase real de
la incidencia (`contextoIncidencia` en `lib/actions/partidos.ts`):

- **Sin minuto** → ocurrió en el entretiempo (los cambios del DT en el camarín).
- **Con minuto** → es algo del primer tiempo que se carga tarde ("nos olvidamos
  del gol del 22"), y se guarda como `FIRST_HALF`.

Como las incidencias del entretiempo no llevan minuto, da lo mismo cuándo se
carguen: sirve para el camarín, donde suele no haber señal.

## Vista de Partidos — jerarquía desplegable

La pestaña Partidos agrupa en tres niveles, todos colapsables
(`groupByTournament` en `AppShell.tsx`):

```
Torneo          → desplegado si NO está finalizado
  Rueda         → desplegada solo si está "live" o "current"
    Partido     → SIEMPRE arranca contraído
```

Estados de rueda (`RoundState`), que definen badge y despliegue por defecto:

| Estado | Significado | Arranca abierta |
|---|---|---|
| `live` | tiene un partido en curso | sí |
| `current` | arrancó pero no terminó | sí |
| `next` | **próxima rueda**: no arrancó y una rueda anterior sigue abierta | no |
| `upcoming` | no arrancó y no es la inmediata siguiente | no |
| `finished` | todos sus partidos jugados | no |

Dentro de una rueda los partidos se ordenan con el que está en curso primero
y luego del más reciente al más antiguo (`sortMatchesInRound`).

Contraído, un partido muestra solo rival, etiqueta de estado/resultado y
marcador. El resto (fecha, cancha, bitácora, once inicial) va en el desplegable.

## Puntos — nunca se suman entre torneos

`PosicionesTab` renderiza un bloque `TournamentPoints` **por campeonato**, en
este orden: hero con los puntos de la **rueda actual** → `Rendimiento` de ESA
rueda (PJ/V/E/D, GF/GC — por rueda, no por torneo) → total del campeonato →
`RuedasAnteriores` (colapsado, una línea por rueda terminada).

Cuando termina una rueda y empieza la siguiente, `currentRound()` cambia solo:
el hero pasa a la nueva y la anterior aparece en "Ruedas anteriores". No hay
nada que "cerrar" a mano. Los puntos de torneos distintos jamás se agregan.

## Tabla oficial de la asociación (pestaña Tabla)

La asociación publica cada ciertas semanas un pantallazo con **solo nombre y
puntos acumulados** — sin PJ, goles ni nada más. Se transcribe a mano desde
`StandingsModal` (textarea, una fila por línea: `Equipo 45`) con
previsualización que usa el **mismo parser** que el servidor
(`src/lib/standings.ts`), así lo que se ve es lo que se guarda.

- Cada carga es un `StandingsSnapshot` completo con sus `StandingsRow`. No se
  edita: se guarda historial y la app muestra **el más reciente por torneo**.
- La tabla se **ordena por puntos de mayor a menor** con `sortByPoints`, la única
  regla de orden: la usan el parser (previsualización y guardado) y la
  serialización en `page.tsx`, así vale también para snapshots cargados antes.
  Empates conservan el orden de carga (sort estable).
- `asOf` es la fecha de la tabla según la asociación (no la de carga). Va en
  el disclaimer "Actualizada al …", que deja claro que no es en vivo.
- Nuestra fila se resalta con `isOurTeam()` (contiene "nacional").

## La pestaña activa vive en la URL

`/` → Posiciones · `/?tab=tabla` · `/?tab=partidos` · `/?tab=plantel`. `page.tsx` lee `?tab=`
(validado con `parseTab`) y lo pasa como `initialTab`; el servidor renderiza la
pestaña correcta de entrada. En el cliente, **cambiar de pestaña va siempre por
`changeTab()`**, que actualiza el estado y la URL con `history.replaceState`
(sin round-trip; Next.js lo integra con su router). Así un refresh —incluido el
sondeo del partido en vivo— no te devuelve a Posiciones, y cualquier enlace de
vuelta puede apuntar a una pestaña: la ficha de jugadora vuelve a `/?tab=plantel`,
no a `/`.

## Rutas

| Ruta | Descripción |
|---|---|
| `/` | App completa (4 tabs) + controles de admin inline si hay sesión |
| `/jugadoras/[id]` | Ficha pública de la jugadora |
| `/login` | Ingreso de administradoras → redirige a `/` |

## API pública

| Endpoint | Descripción |
|---|---|
| `GET /api/partidos/en-vivo` | Partido `IN_PROGRESS` con once titular y eventos (o `{ match: null }`) |

## Importaciones Prisma

El cliente Prisma se genera en `src/generated/prisma` (no en `@prisma/client`):

```ts
import { PrismaClient, MatchStatus, EventType } from "@/generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";
```

## Convenciones del proyecto

- **Server Actions en `src/lib/actions/{jugadoras,partidos,torneos}.ts`** — agrupados por
  dominio, fuera de `src/app/` (no están atados a ninguna ruta).
- Client Components en `_components/`; los de administración en `_components/admin/`.
- Todos los formularios usan `useActionState` (React 19) — nunca `useState` manual para forms
- Server Actions protegen sus mutaciones con `requireAdmin()` (llama a `auth()` y verifica `role`)
- Nombres y textos en **español de Chile**: tuteo, nunca voseo rioplatense
  ("Selecciona", no "Seleccioná"; "Puedes", no "Podés"). Fechas con locale `es-CL`.
- `revalidatePath("/")` después de toda mutación (y `/api/partidos/en-vivo` si toca el partido en curso)
- **Un Server Action que llama a `revalidatePath` refresca los props ANTES de que
  `useActionState` entregue su resultado.** Por eso, en un efecto de éxito, nunca
  derivar "¿cambió X?" comparando contra un prop que la propia acción modifica: al
  correr el efecto, el prop ya tiene el valor nuevo y la comparación da falso. Fue
  el bug del prompt del once: `becameLive = status === "IN_PROGRESS" && !wasLive`
  siempre daba `false` porque `match.status` ya era `IN_PROGRESS`. Decidir con un
  dato que la acción **no** toca (ahí, `currentTitularIds`). Reproducible en jsdom
  simulando la revalidación dentro de la acción.
- **No resetear estado desde un `useEffect`** (ESLint `react-hooks/set-state-in-effect` lo marca
  como error). Para que un modal arranque limpio, montar el contenido condicionalmente con una
  `key` derivada de los props — ver `MatchModal` (wrapper + `MatchModalContent`).
- **Modales montados dentro de `<main>` necesitan `ModalPortal`**: `main` tiene `z-10` y
  crea un contexto de apilamiento, así que un `fixed z-50` interno igual queda por debajo
  del header (`z-20`). `MatchModal`/`PlayerModal` se montan en la raíz de `AppShell` y no
  lo necesitan; `TournamentModal` y `AddAdminModal` sí.
- **Nada que dependa solo de `hover`**: en táctil no existe. Para revelar controles al pasar
  el mouse, usar `opacity-100 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover/x:opacity-100`
  para que en móvil queden siempre visibles.
- Sistema de diseño visual documentado en `DESIGN.md` (glass surfaces, gradientes, radios, motion)

## Scripts npm

```bash
npm run dev          # Servidor de desarrollo
npm run build        # prisma generate + next build
npm run db:push      # Sincronizar schema con Supabase (dev)
npm run db:generate  # Regenerar cliente Prisma
npm run db:seed      # Poblar con datos de ejemplo (tsx prisma/seed.ts)
npm run db:studio    # Prisma Studio
npm run lint         # ESLint
npm run test:clock   # Reglas del reloj (retoma en 30:00, etc.)
npm run test:standings # Parser de la tabla oficial
```

## Gotchas importantes

1. **Prisma 7**: `PrismaClient` siempre necesita `adapter: new PrismaPg({ connectionString })`. Sin el adapter, lanza `PrismaClientInitializationError`.
2. **Prisma client path**: importar desde `@/generated/prisma`, nunca desde `@prisma/client`.
3. **Next.js 16**: si se agrega middleware, el archivo se llama `src/proxy.ts`, no `middleware.ts`. Hoy **no hay** middleware: la autorización vive en `requireAdmin()` dentro de cada Server Action.
4. **Auth.js v5**: los redirects exitosos de `signIn` se lanzan como error (`NEXT_REDIRECT`). Re-propagarlos con `throw error` en el catch.
5. **Tailwind v4**: no existe `tailwind.config.js`; la configuración va en CSS con `@theme`.
6. **`db:push --accept-data-loss`**: usar cuando se renombran enums o columnas en dev (datos se re-crean con seed).
7. **Acciones de partido en vivo** (`addHomeGoalAction`, `addAwayGoalAction`, `addCardAction`, `finishMatchAction`): solo funcionan con `status === IN_PROGRESS`; `finishMatchAction` calcula el resultado automáticamente del marcador.
8. **Lazy Prisma singleton**: `src/lib/prisma.ts` usa un Proxy para inicialización lazy. Vercel marca `DATABASE_URL` como variable sensible (solo runtime), por lo que el cliente Prisma **no** puede instanciarse durante el build. Nunca mover la inicialización fuera del Proxy o se romperá el build en producción.
9. **⚠️ Agregar un valor a un enum requiere tocar la base a mano.** El deploy de Vercel corre
   `prisma generate` + `next build`, pero **nunca** aplica migraciones. Si agregás un valor a un
   enum del schema, el build pasa y el deploy queda verde, pero **falla en runtime** al guardar
   ese valor, porque el tipo en Postgres no lo conoce. Hay que correrlo contra producción
   (SQL Editor de Supabase o `psql`):
   ```sql
   ALTER TYPE "MatchStatus" ADD VALUE 'POSTPONED';
   ```
   Vale para cualquier enum (`MatchStatus`, `EventType`, `PlayerStatus`, `MatchResult`, `Role`).
   Verificar con: `SELECT unnest(enum_range(NULL::"MatchStatus"));`

   Lo mismo aplica a **columnas nuevas**. Generar el SQL exacto con:
   ```bash
   npx prisma migrate diff --from-schema <schema-viejo> --to-schema prisma/schema.prisma --script
   ```
   Por eso `Match.phase` es `String` y no un enum: las fases son lo que más
   probable es que crezca (prórroga, penales) y cada valor nuevo costaría otro
   `ALTER TYPE` a mano contra producción.
