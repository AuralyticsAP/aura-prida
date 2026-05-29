-- =============================================
-- Migración 003: Módulo Fincas
-- Ejecutar en Supabase SQL Editor
-- =============================================

-- 1. Crear tabla fincas
CREATE TABLE IF NOT EXISTS fincas (
  id         BIGSERIAL    PRIMARY KEY,
  nombre     TEXT         NOT NULL UNIQUE,
  activo     BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ  DEFAULT NOW()
);

-- 2. Precargar las dos fincas de Prida
INSERT INTO fincas (nombre) VALUES ('Dulce Nombre'), ('Taras')
  ON CONFLICT (nombre) DO NOTHING;

-- 3. Habilitar RLS — lectura para cualquier usuario autenticado
ALTER TABLE fincas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fincas_select" ON fincas
  FOR SELECT TO authenticated USING (activo = TRUE);

-- 4. Agregar finca_id a cosechas y ventas
ALTER TABLE cosechas ADD COLUMN IF NOT EXISTS finca_id BIGINT REFERENCES fincas(id);
ALTER TABLE ventas   ADD COLUMN IF NOT EXISTS finca_id BIGINT REFERENCES fincas(id);

CREATE INDEX IF NOT EXISTS idx_cosechas_finca ON cosechas(finca_id);
CREATE INDEX IF NOT EXISTS idx_ventas_finca   ON ventas(finca_id);
