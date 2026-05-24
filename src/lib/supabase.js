import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export async function initializeTables() {
  const { error: e1 } = await supabase.rpc('exec_sql', {
    sql: `
      CREATE TABLE IF NOT EXISTS cosechas (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        fecha DATE NOT NULL DEFAULT CURRENT_DATE,
        producto TEXT NOT NULL,
        cantidad NUMERIC(10,2) NOT NULL,
        unidad TEXT NOT NULL,
        notas TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `
  }).catch(() => ({ error: null }))

  const { error: e2 } = await supabase.rpc('exec_sql', {
    sql: `
      CREATE TABLE IF NOT EXISTS ventas (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        fecha DATE NOT NULL DEFAULT CURRENT_DATE,
        producto TEXT NOT NULL,
        cantidad NUMERIC(10,2) NOT NULL,
        unidad TEXT NOT NULL,
        tipo_cliente TEXT NOT NULL,
        nombre_cliente TEXT NOT NULL,
        precio_unitario NUMERIC(10,2) NOT NULL,
        total NUMERIC(10,2) GENERATED ALWAYS AS (cantidad * precio_unitario) STORED,
        notas TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `
  }).catch(() => ({ error: null }))
}
