-- Módulo: Gastos operativos
create table if not exists public.gastos (
  id          uuid primary key default gen_random_uuid(),
  finca_id    integer references public.fincas(id),
  categoria   text not null,
  descripcion text not null,
  monto       numeric(12, 2) not null check (monto > 0),
  proveedor   text,
  fecha       date not null,
  comprobante text,
  notas       text,
  estado      text not null default 'activo' check (estado in ('activo', 'archivado')),
  user_id     uuid references auth.users(id),
  created_at  timestamptz not null default now()
);

alter table public.gastos enable row level security;

create policy "auth read gastos"   on public.gastos for select using (auth.role() = 'authenticated');
create policy "auth insert gastos" on public.gastos for insert with check (auth.role() = 'authenticated');
create policy "auth update gastos" on public.gastos for update using (auth.role() = 'authenticated');
create policy "auth delete gastos" on public.gastos for delete using (auth.role() = 'authenticated');

create index gastos_fecha_idx     on public.gastos(fecha);
create index gastos_finca_idx     on public.gastos(finca_id);
create index gastos_estado_idx    on public.gastos(estado);
create index gastos_categoria_idx on public.gastos(categoria);
