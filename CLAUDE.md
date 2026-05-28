# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

# NacionApp — Contexto del proyecto

**Selección Argentina Femenina de Fútbol** — app de gestión del plantel, partidos y estadísticas.

## Stack exacto (no asumir versiones antiguas)

| Tecnología | Versión | Notas críticas |
|---|---|---|
| Next.js | 16.2.6 | App Router, `proxy.ts` (no `middleware.ts`) |
| React | 19.2.4 | `useActionState` en lugar de `useFormState` |
| Tailwind CSS | v4 | Config vía PostCSS, sin `tailwind.config.js` |
| Prisma | 7.8.x | **Breaking**: URL en `prisma.config.ts`, requiere Driver Adapter |
| `@prisma/adapter-pg` | 7.8.x | Obligatorio al instanciar `PrismaClient` |
| Auth.js (next-auth) | v5 beta | `src/auth.ts`, no `pages/api/auth` |
| bcryptjs | 3.x | Para hashear passwords (12 salt rounds) |
| TypeScript | 5.x | `strict: true` |

## Arquitectura de acceso

- **Rutas públicas** (`/`, `/partidos`, `/posiciones`): sin autenticación, sin overhead de sesión.
- **`/admin/*`**: protegidas por `src/proxy.ts` — redirige a `/login` sin sesión activa.
- Solo usuarios con `role: "ADMIN"` pueden autenticarse. Los `PLAYER` son rechazados en `authorize()`.

## Base de datos — Supabase PostgreSQL

- **Runtime** (app): Transaction Pooler, puerto 6543 (`DATABASE_URL`, `?pgbouncer=true`)
- **Migraciones/push**: Session Pooler, puerto 5432 (`DIRECT_URL`)
- Instancia Prisma para auth: `src/auth.ts` crea su propio cliente (no usa el singleton global)
- Singleton global: `src/lib/prisma.ts`

## Modelos clave

```
User         → id, email, password, role (ADMIN | PLAYER)
Profile      → firstName, lastName, avatarUrl, birthdate, joiningYear, idealPosition,
               number, nationality, bio [PÚBLICO]
               status (AVAILABLE | INJURED), adminComments [PRIVADO/ADMIN]
Tournament   → name, year, isActive — campeonatos; FK SetNull en Match al borrar
Match        → date, opponent, venue, status (PENDING | IN_PROGRESS | FINISHED),
               result (WIN | LOSS | DRAW), homeScore, awayScore, notes,
               tournamentId?, round?, fixtureRoundNumber?
MatchEvent   → matchId, type (GOAL | AMARILLA | ROJA), isOwn (bool),
               playerId?, minute? — incidencias del partido en vivo
PlayerMatch  → userId, matchId, isTitular (bool) — convocatoria y titularidad
```

## Rutas del panel admin

| Ruta | Propósito |
|---|---|
| `/admin` | Dashboard con stats |
| `/admin/jugadoras` | Listado del plantel |
| `/admin/jugadoras/[id]` | Edición completa + historial |
| `/admin/partidos` | Listado de partidos |
| `/admin/partidos/nuevo` | Crear partido |
| `/admin/partidos/[id]` | Editar partido (estado, resultado, score, torneo) |
| `/admin/partidos/[id]/once` | Convocatoria + once inicial — solo con `IN_PROGRESS` |
| `/admin/torneos` | Gestión de campeonatos |

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

- Server Actions en `actions.ts` junto a su ruta; Client Components en `_components/`
- Todos los formularios usan `useActionState` (React 19) — nunca `useState` manual para forms
- Server Actions protegen sus mutaciones con `requireAdmin()` (llama a `auth()` y verifica `role`)
- Nombres en español (variables, labels, mensajes de error)
- Clases Tailwind: tema `slate-950` / `sky-500` para el admin, gradiente `slate-900 → blue-950` para login
- `revalidatePath` después de toda mutación
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
```

## Gotchas importantes

1. **Prisma 7**: `PrismaClient` siempre necesita `adapter: new PrismaPg({ connectionString })`. Sin el adapter, lanza `PrismaClientInitializationError`.
2. **Prisma client path**: importar desde `@/generated/prisma`, nunca desde `@prisma/client`.
3. **Next.js 16**: el archivo de middleware se llama `src/proxy.ts`, no `middleware.ts`.
4. **Auth.js v5**: los redirects exitosos de `signIn` se lanzan como error (`NEXT_REDIRECT`). Re-propagarlos con `throw error` en el catch.
5. **Tailwind v4**: no existe `tailwind.config.js`; la configuración va en CSS con `@theme`.
6. **`db:push --accept-data-loss`**: usar cuando se renombran enums o columnas en dev (datos se re-crean con seed).
7. **Acciones de partido en vivo** (`addHomeGoalAction`, `addAwayGoalAction`, `addCardAction`, `finishMatchAction`): solo funcionan con `status === IN_PROGRESS`; `finishMatchAction` calcula el resultado automáticamente del marcador.
8. **Lazy Prisma singleton**: `src/lib/prisma.ts` usa un Proxy para inicialización lazy. Vercel marca `DATABASE_URL` como variable sensible (solo runtime), por lo que el cliente Prisma **no** puede instanciarse durante el build. Nunca mover la inicialización fuera del Proxy o se romperá el build en producción.
