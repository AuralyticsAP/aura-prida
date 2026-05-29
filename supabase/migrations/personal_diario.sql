-- Módulo 5: Personal por finca
create table if not exists public.personal_diario (
  id                uuid primary key default gen_random_uuid(),
  finca_id          integer references public.fincas(id),
  fecha             date not null,
  cantidad_personas integer not null check (cantidad_personas > 0),
  tipo_labor        text not null,
  notas             text,
  estado            text not null default 'activo' check (estado in ('activo', 'archivado')),
  user_id           uuid references auth.users(id),
  created_at        timestamptz not null default now()
);

alter table public.personal_diario enable row level security;

create policy "auth read personal"   on public.personal_diario for select using (auth.role() = 'authenticated');
create policy "auth insert personal" on public.personal_diario for insert with check (auth.role() = 'authenticated');
create policy "auth update personal" on public.personal_diario for update using (auth.role() = 'authenticated');
create policy "auth delete personal" on public.personal_diario for delete using (auth.role() = 'authenticated');

create index personal_fecha_idx  on public.personal_diario(fecha);
create index personal_finca_idx  on public.personal_diario(finca_id);
create index personal_estado_idx on public.personal_diario(estado);
