-- =============================================
-- Migración 004: Módulo Compras
-- Ejecutar en Supabase SQL Editor
-- =============================================

CREATE TABLE IF NOT EXISTS compras (
  id              UUID          DEFAULT gen_random_uuid() PRIMARY KEY,
  finca_id        BIGINT        NOT NULL REFERENCES fincas(id),
  proveedor_id    UUID          REFERENCES proveedores(id) ON DELETE SET NULL,
  producto        TEXT          NOT NULL,
  cantidad        NUMERIC(10,3) NOT NULL,
  unidad          TEXT          NOT NULL DEFAULT 'kg',
  precio_unitario NUMERIC(10,2) NOT NULL,
  total           NUMERIC(12,2) NOT NULL,
  fecha           DATE          NOT NULL DEFAULT CURRENT_DATE,
  notas           TEXT,
  estado          TEXT          NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo', 'archivado')),
  user_id         UUID          NOT NULL REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ   DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_compras_user   ON compras(user_id);
CREATE INDEX IF NOT EXISTS idx_compras_finca  ON compras(finca_id);
CREATE INDEX IF NOT EXISTS idx_compras_fecha  ON compras(fecha);
CREATE INDEX IF NOT EXISTS idx_compras_estado ON compras(estado);

ALTER TABLE compras ENABLE ROW LEVEL SECURITY;

CREATE POLICY "compras_select" ON compras FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "compras_insert" ON compras FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "compras_update" ON compras FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "compras_delete" ON compras FOR DELETE TO authenticated USING (auth.uid() = user_id);
