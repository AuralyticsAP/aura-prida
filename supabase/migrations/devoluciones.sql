-- Módulo 4: Devoluciones
create table if not exists public.devoluciones (
  id               uuid primary key default gen_random_uuid(),
  finca_id         integer references public.fincas(id),
  cliente          text not null,
  producto         text not null,
  cantidad         numeric(10, 2) not null check (cantidad > 0),
  unidad           text not null,
  motivo           text not null,
  puede_revenderse boolean not null,
  precio_unitario  numeric(10, 2) not null check (precio_unitario >= 0),
  total            numeric(12, 2) not null,
  fecha            date not null,
  notas            text,
  estado           text not null default 'activo' check (estado in ('activo', 'archivado')),
  user_id          uuid references auth.users(id),
  created_at       timestamptz not null default now()
);

alter table public.devoluciones enable row level security;

create policy "auth read devoluciones"   on public.devoluciones for select using (auth.role() = 'authenticated');
create policy "auth insert devoluciones" on public.devoluciones for insert with check (auth.role() = 'authenticated');
create policy "auth update devoluciones" on public.devoluciones for update using (auth.role() = 'authenticated');
create policy "auth delete devoluciones" on public.devoluciones for delete using (auth.role() = 'authenticated');

create index devoluciones_fecha_idx  on public.devoluciones(fecha);
create index devoluciones_finca_idx  on public.devoluciones(finca_id);
create index devoluciones_estado_idx on public.devoluciones(estado);
