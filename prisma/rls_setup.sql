-- =============================================================
-- RLS Setup — NacionApp
-- =============================================================
-- Propósito: bloquear el acceso directo a todas las tablas a
--   través de la REST API pública de Supabase (PostgREST).
--
-- Contexto:
--   - TODA la lógica de la app pasa por Prisma (role: postgres),
--     que es superuser y bypasses RLS por diseño.
--   - Este script SOLO bloquea el acceso via anon/authenticated
--     a través de https://<proyecto>.supabase.co/rest/v1/*
--
-- Cómo ejecutar:
--   Supabase Dashboard → SQL Editor → pegar y ejecutar.
--   NO ejecutar via psql con DIRECT_URL (mismo efecto, pero
--   conviene tener trazabilidad en el dashboard).
--
-- Re-ejecución:
--   Es idempotente: IF NOT EXISTS / OR REPLACE evita errores
--   si se corre más de una vez.
--
-- Importante:
--   `prisma db push` NO toca políticas RLS. Este script es un
--   setup único que sobrevive a futuros pushes del schema.
-- =============================================================

-- ── 1. Habilitar RLS en todas las tablas ─────────────────────

ALTER TABLE public.users          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournaments    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_events   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_matches ENABLE ROW LEVEL SECURITY;

-- ── 2. Sin políticas permisivas = acceso denegado por defecto ─
--
-- PostgreSQL deniega todas las operaciones cuando RLS está
-- habilitado y no existe ninguna política permisiva.
-- No hace falta agregar un DENY explícito.
--
-- Verificación: después de ejecutar este script, la alerta de
-- Supabase debería desaparecer y las llamadas REST con anon key
-- deberían retornar:
--   { "code": "42501", "message": "permission denied for table ..." }
-- =============================================================
