# NacionApp

App de gestión de **Nacional Femenino**: plantel, partidos, estadísticas y seguimiento
de partido en vivo. Pública para las hinchas, con administración integrada para el
cuerpo técnico.

## Funcionalidad

**Vista pública** — una sola pantalla con tres pestañas:

- **Posiciones** — puntos ganados, pendientes e ideales; PJ/V/E/D, goles a favor y en
  contra; tarjeta del próximo partido y del partido en vivo cuando lo hay.
- **Partidos** — agrupados por rueda y fecha, con once inicial, marcador y bitácora de
  incidencias. Estados: *Por jugar*, *En curso*, *Finalizado* y *Reagendado*.
- **Plantel** — jugadoras por posición, con ficha individual en `/jugadoras/[id]`.

**Administración** — no hay panel aparte: con sesión de admin aparecen controles sobre
la misma vista pública.

- Alta y edición de jugadoras (datos públicos + estado físico y notas internas privadas).
- Alta y edición de partidos, campeonatos y armado del once inicial.
- **Consola de partido en vivo**: fases (previa, 1er tiempo, entretiempo, 2do tiempo)
  con reloj que retoma en el reglamentario, goles propios y rivales, tarjetas,
  sustituciones —incluidas las del entretiempo— y cierre con resultado automático.
- Las incidencias cargadas en vivo quedan como **bitácora** del partido una vez jugado.

**API pública** — `GET /api/partidos/en-vivo` devuelve el partido en curso con su once
titular, o `{ match: null }`.

## Desarrollo

```bash
npm install
npm run dev        # http://localhost:3000
```

Variables de entorno (`.env`):

| Variable | Uso |
|---|---|
| `DATABASE_URL` | Conexión de runtime — Supabase Transaction Pooler (puerto 6543, `?pgbouncer=true`) |
| `DIRECT_URL` | Migraciones y `db push` — Supabase Session Pooler (puerto 5432) |
| `AUTH_SECRET` | Secreto de Auth.js |

### Scripts

```bash
npm run dev          # Servidor de desarrollo
npm run build        # prisma generate + next build
npm run db:push      # Sincronizar schema con Supabase
npm run db:generate  # Regenerar el cliente Prisma
npm run db:seed      # Poblar con datos de ejemplo
npm run db:studio    # Prisma Studio
npm run lint         # ESLint
npm run test:clock   # Verifica la lógica del reloj del partido
npm run test:standings # Verifica el parser de la tabla oficial
```

## Estructura

```
src/
├── app/
│   ├── page.tsx              # Home: carga los datos y arma la vista completa
│   ├── _components/          # UI pública (AppShell, LiveMatchCard, …)
│   │   └── admin/            # Modales de administración
│   ├── jugadoras/[id]/       # Ficha pública de jugadora
│   ├── login/                # Ingreso de administradoras
│   └── api/                  # Endpoints (auth + partido en vivo)
├── lib/
│   ├── actions/              # Server Actions por dominio
│   └── prisma.ts             # Singleton lazy del cliente Prisma
└── auth.ts                   # Configuración de Auth.js
```

## Stack

Next.js 16 (App Router) · React 19 · Tailwind CSS v4 · Prisma 7 con Driver Adapter
(`@prisma/adapter-pg`) · Auth.js v5 · Supabase PostgreSQL. Desplegada en Vercel desde `main`.

Detalles de arquitectura, convenciones y trampas del stack: [`CLAUDE.md`](./CLAUDE.md).
Sistema de diseño visual: [`DESIGN.md`](./DESIGN.md).

## Deploy

Vercel despliega automáticamente cada push a `main`.

> ⚠️ **El deploy no corre migraciones.** Si un cambio agrega un valor a un enum del
> schema de Prisma, el build pasa igual pero la app falla en runtime al usarlo. Hay que
> aplicarlo a mano contra la base de producción, por ejemplo:
>
> ```sql
> ALTER TYPE "MatchStatus" ADD VALUE 'POSTPONED';
> ```
