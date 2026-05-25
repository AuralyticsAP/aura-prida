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
-- Migración: Sistema de archivado
-- Ejecutar en Supabase SQL Editor
-- =============================================

ALTER TABLE cosechas    ADD COLUMN IF NOT EXISTS estado TEXT NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo', 'archivado'));
ALTER TABLE ventas      ADD COLUMN IF NOT EXISTS estado TEXT NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo', 'archivado'));
ALTER TABLE proveedores ADD COLUMN IF NOT EXISTS estado TEXT NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo', 'archivado'));

CREATE INDEX IF NOT EXISTS idx_cosechas_estado    ON cosechas(estado);
CREATE INDEX IF NOT EXISTS idx_ventas_estado      ON ventas(estado);
CREATE INDEX IF NOT EXISTS idx_proveedores_estado ON proveedores(estado);

-- =============================================
-- Migración: Sistema de roles y permisos
-- =============================================

-- Tabla de perfiles (espejo de auth.users accesible desde el cliente)
CREATE TABLE IF NOT EXISTS profiles (
  id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email      TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_read"   ON profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_insert" ON profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- Tabla de roles
CREATE TABLE IF NOT EXISTS user_roles (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role       TEXT NOT NULL CHECK (role IN ('admin', 'editor', 'viewer')) DEFAULT 'viewer',
  activo     BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- Función anti-recursión para verificar si el usuario actual es admin
CREATE OR REPLACE FUNCTION is_admin_user()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid() AND role = 'admin' AND activo = true
  );
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Políticas de user_roles
CREATE POLICY "roles_read"   ON user_roles FOR SELECT TO authenticated USING (true);
CREATE POLICY "roles_insert" ON user_roles FOR INSERT TO authenticated WITH CHECK (is_admin_user());
CREATE POLICY "roles_update" ON user_roles FOR UPDATE TO authenticated USING (is_admin_user());
CREATE POLICY "roles_delete" ON user_roles FOR DELETE TO authenticated USING (is_admin_user());

-- Trigger: crear perfil y rol automáticamente al registrarse
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email)
  VALUES (NEW.id, NEW.email)
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO user_roles (user_id, role)
  VALUES (
    NEW.id,
    CASE WHEN NEW.email IN (
      'agrocomercialprida@gmail.com',
      'luis.matarrita@auralyticsap.com',
      'minor.guillen@auralyticsap.com'
    ) THEN 'admin' ELSE 'viewer' END
  )
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Migrar usuarios existentes (ejecutar una sola vez)
INSERT INTO profiles (id, email)
SELECT id, email FROM auth.users
ON CONFLICT (id) DO NOTHING;

INSERT INTO user_roles (user_id, role)
SELECT id, 'viewer' FROM auth.users
ON CONFLICT (user_id) DO NOTHING;

-- Asignar admin a agrocomercialprida@gmail.com
UPDATE user_roles ur
SET role = 'admin'
FROM auth.users au
WHERE au.id = ur.user_id
  AND au.email = 'agrocomercialprida@gmail.com';

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
