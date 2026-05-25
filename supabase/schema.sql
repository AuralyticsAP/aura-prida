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
  user_id     UUID    NOT NULL REFERENCES auth.users(id),
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
  user_id          UUID    NOT NULL REFERENCES auth.users(id),
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de proveedores
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

-- Índices
CREATE INDEX IF NOT EXISTS idx_cosechas_fecha ON cosechas(fecha);
CREATE INDEX IF NOT EXISTS idx_cosechas_user  ON cosechas(user_id);
CREATE INDEX IF NOT EXISTS idx_ventas_fecha   ON ventas(fecha);
CREATE INDEX IF NOT EXISTS idx_ventas_user    ON ventas(user_id);
CREATE INDEX IF NOT EXISTS idx_proveedores_user ON proveedores(user_id);

-- Habilitar RLS
ALTER TABLE cosechas    ENABLE ROW LEVEL SECURITY;
ALTER TABLE ventas      ENABLE ROW LEVEL SECURITY;
ALTER TABLE proveedores ENABLE ROW LEVEL SECURITY;

-- Políticas por usuario: cosechas
CREATE POLICY "cosechas_select" ON cosechas FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "cosechas_insert" ON cosechas FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "cosechas_update" ON cosechas FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "cosechas_delete" ON cosechas FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Políticas por usuario: ventas
CREATE POLICY "ventas_select" ON ventas FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "ventas_insert" ON ventas FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "ventas_update" ON ventas FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "ventas_delete" ON ventas FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Políticas por usuario: proveedores
CREATE POLICY "proveedores_select" ON proveedores FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "proveedores_insert" ON proveedores FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "proveedores_update" ON proveedores FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "proveedores_delete" ON proveedores FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Habilitar Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE cosechas;
ALTER PUBLICATION supabase_realtime ADD TABLE ventas;
ALTER PUBLICATION supabase_realtime ADD TABLE proveedores;

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
CREATE POLICY "Authenticated only" ON productos FOR ALL TO authenticated USING (true) WITH CHECK (true);

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
CREATE POLICY "Authenticated only" ON clientes FOR ALL TO authenticated USING (true) WITH CHECK (true);

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
