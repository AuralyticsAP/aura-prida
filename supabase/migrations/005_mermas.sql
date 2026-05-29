-- =============================================
-- Migración 005: Módulo Mermas
-- Ejecutar en Supabase SQL Editor
-- =============================================

CREATE TABLE IF NOT EXISTS mermas (
  id         UUID         DEFAULT gen_random_uuid() PRIMARY KEY,
  finca_id   BIGINT       NOT NULL REFERENCES fincas(id),
  producto   TEXT         NOT NULL,
  cantidad   NUMERIC(10,3) NOT NULL,
  unidad     TEXT         NOT NULL DEFAULT 'kg',
  motivo     TEXT         NOT NULL CHECK (motivo IN ('daño','vencimiento','plagas','clima','otro')),
  fecha      DATE         NOT NULL DEFAULT CURRENT_DATE,
  notas      TEXT,
  estado     TEXT         NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo','archivado')),
  user_id    UUID         NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ  DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mermas_user   ON mermas(user_id);
CREATE INDEX IF NOT EXISTS idx_mermas_finca  ON mermas(finca_id);
CREATE INDEX IF NOT EXISTS idx_mermas_fecha  ON mermas(fecha);
CREATE INDEX IF NOT EXISTS idx_mermas_estado ON mermas(estado);

ALTER TABLE mermas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mermas_select" ON mermas FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "mermas_insert" ON mermas FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "mermas_update" ON mermas FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "mermas_delete" ON mermas FOR DELETE TO authenticated USING (auth.uid() = user_id);
