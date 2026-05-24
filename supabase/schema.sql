-- =============================================
-- Prida App - Schema de base de datos
-- Ejecutar en Supabase SQL Editor
-- =============================================

-- Tabla de cosechas
CREATE TABLE IF NOT EXISTS cosechas (
  id          UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  fecha       DATE    NOT NULL DEFAULT CURRENT_DATE,
  producto    TEXT    NOT NULL,
  cantidad    NUMERIC(10,2) NOT NULL,
  unidad      TEXT    NOT NULL,
  notas       TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de ventas
CREATE TABLE IF NOT EXISTS ventas (
  id               UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  fecha            DATE    NOT NULL DEFAULT CURRENT_DATE,
  producto         TEXT    NOT NULL,
  cantidad         NUMERIC(10,2) NOT NULL,
  unidad           TEXT    NOT NULL,
  tipo_cliente     TEXT    NOT NULL,
  nombre_cliente   TEXT    NOT NULL,
  precio_unitario  NUMERIC(10,2) NOT NULL,
  total            NUMERIC(10,2) GENERATED ALWAYS AS (cantidad * precio_unitario) STORED,
  notas            TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para búsquedas por fecha
CREATE INDEX IF NOT EXISTS idx_cosechas_fecha ON cosechas(fecha);
CREATE INDEX IF NOT EXISTS idx_ventas_fecha   ON ventas(fecha);

-- Habilitar Row Level Security (opcional, para mayor seguridad)
ALTER TABLE cosechas ENABLE ROW LEVEL SECURITY;
ALTER TABLE ventas   ENABLE ROW LEVEL SECURITY;

-- Política pública (ajustar si se agrega autenticación)
CREATE POLICY "Allow all" ON cosechas FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON ventas   FOR ALL USING (true) WITH CHECK (true);

-- Habilitar Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE cosechas;
ALTER PUBLICATION supabase_realtime ADD TABLE ventas;
