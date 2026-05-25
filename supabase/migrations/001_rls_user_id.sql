-- =============================================
-- Migración 001: RLS por usuario
-- Ejecutar en Supabase SQL Editor
-- =============================================

-- 1. Agregar user_id a cosechas y ventas existentes
ALTER TABLE cosechas ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
ALTER TABLE ventas   ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

CREATE INDEX IF NOT EXISTS idx_cosechas_user ON cosechas(user_id);
CREATE INDEX IF NOT EXISTS idx_ventas_user   ON ventas(user_id);

-- 2. Crear tabla proveedores
CREATE TABLE IF NOT EXISTS proveedores (
  id         UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre     TEXT    NOT NULL,
  contacto   TEXT,
  telefono   TEXT,
  email      TEXT,
  notas      TEXT,
  user_id    UUID    NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_proveedores_user ON proveedores(user_id);

ALTER TABLE proveedores ENABLE ROW LEVEL SECURITY;
ALTER PUBLICATION supabase_realtime ADD TABLE proveedores;

-- 3. Eliminar políticas permisivas anteriores en cosechas y ventas
DROP POLICY IF EXISTS "Authenticated only" ON cosechas;
DROP POLICY IF EXISTS "Authenticated only" ON ventas;

-- 4. Políticas por usuario en cosechas
CREATE POLICY "cosechas_select" ON cosechas
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "cosechas_insert" ON cosechas
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "cosechas_update" ON cosechas
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "cosechas_delete" ON cosechas
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- 5. Políticas por usuario en ventas
CREATE POLICY "ventas_select" ON ventas
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "ventas_insert" ON ventas
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "ventas_update" ON ventas
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "ventas_delete" ON ventas
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- 6. Políticas por usuario en proveedores
CREATE POLICY "proveedores_select" ON proveedores
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "proveedores_insert" ON proveedores
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "proveedores_update" ON proveedores
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "proveedores_delete" ON proveedores
  FOR DELETE TO authenticated USING (auth.uid() = user_id);
