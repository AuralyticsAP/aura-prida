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

-- =============================================
-- Tabla de productos (lista dinámica)
-- =============================================
CREATE TABLE IF NOT EXISTS productos (
  id         UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre     TEXT    NOT NULL UNIQUE,
  activo     BOOLEAN NOT NULL DEFAULT true,
  orden      INT     NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_productos_activo ON productos(activo, orden);

ALTER TABLE productos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON productos FOR ALL USING (true) WITH CHECK (true);

-- Seed de productos iniciales
INSERT INTO productos (nombre, orden) VALUES
  ('Tomate',                        1),
  ('Zucchini',                      2),
  ('Rabanito',                      3),
  ('Espinaca',                      4),
  ('Remolacha',                     5),
  ('Mostaza China',                 6),
  ('Culantro castilla',             7),
  ('Culantro coyote',               8),
  ('Lechuga americana',             9),
  ('Lechuga roja',                 10),
  ('Lechuga freeze',               11),
  ('Lechuga Romana',               12),
  ('Lechuga boston',               13),
  ('Lechuga escarola',             14),
  ('Lechuga Iceberg',              15),
  ('Lechuga Hoja de roble verde',  16),
  ('Lechuga Hoja de roble roja',   17),
  ('Hierba buena',                 18),
  ('Perejil',                      19),
  ('Tomillo',                      20),
  ('Orégano',                      21),
  ('Albahaca',                     22),
  ('Romero',                       23),
  ('Zanahoria',                    24)
ON CONFLICT (nombre) DO NOTHING;

-- =============================================
-- Tabla de clientes (lista dinámica)
-- =============================================
CREATE TABLE IF NOT EXISTS clientes (
  id         UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre     TEXT    NOT NULL UNIQUE,
  activo     BOOLEAN NOT NULL DEFAULT true,
  orden      INT     NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_clientes_activo ON clientes(activo, orden);

ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON clientes FOR ALL USING (true) WITH CHECK (true);

-- Seed de clientes iniciales
INSERT INTO clientes (nombre, orden) VALUES
  ('Walmart y cadenas asociadas',  1),
  ('BM supermercados',             2),
  ('Perimercados',                 3),
  ('Mega súper',                   4),
  ('Automercado',                  5),
  ('Exportación Nicaragua',        6),
  ('Mercado de Cenada',            7),
  ('Cruceros',                     8),
  ('Fruta internacional',          9),
  ('Frumusa',                     10)
ON CONFLICT (nombre) DO NOTHING;
