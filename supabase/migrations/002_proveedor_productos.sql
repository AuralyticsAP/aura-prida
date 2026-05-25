-- =============================================
-- Migración 002: Tabla proveedor_productos
-- Ejecutar en Supabase SQL Editor
-- =============================================

CREATE TABLE IF NOT EXISTS proveedor_productos (
  id           UUID         DEFAULT gen_random_uuid() PRIMARY KEY,
  proveedor_id UUID         NOT NULL REFERENCES proveedores(id) ON DELETE CASCADE,
  nombre       TEXT         NOT NULL,
  precio       NUMERIC(10,2) NOT NULL,
  unidad       TEXT         NOT NULL DEFAULT 'kg',
  user_id      UUID         NOT NULL REFERENCES auth.users(id),
  created_at   TIMESTAMPTZ  DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pp_proveedor ON proveedor_productos(proveedor_id);
CREATE INDEX IF NOT EXISTS idx_pp_user      ON proveedor_productos(user_id);

ALTER TABLE proveedor_productos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pp_select" ON proveedor_productos FOR SELECT USING ((select auth.uid()) = user_id);
CREATE POLICY "pp_insert" ON proveedor_productos FOR INSERT WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "pp_update" ON proveedor_productos FOR UPDATE USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "pp_delete" ON proveedor_productos FOR DELETE USING ((select auth.uid()) = user_id);
