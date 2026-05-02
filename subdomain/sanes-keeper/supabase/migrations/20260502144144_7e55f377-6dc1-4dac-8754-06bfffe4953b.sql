-- Tabla sanes
create table public.sanes (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  monto_cuota numeric not null check (monto_cuota >= 0),
  frecuencia text not null check (frecuencia in ('semanal','quincenal')),
  numero_semanas int not null check (numero_semanas > 0),
  banquero_id uuid not null references auth.users(id) on delete cascade,
  public_token text not null unique,
  created_at timestamptz not null default now()
);

-- Tabla participantes
create table public.participantes (
  id uuid primary key default gen_random_uuid(),
  san_id uuid not null references public.sanes(id) on delete cascade,
  nombre text not null,
  turno_cobro int not null,
  created_at timestamptz not null default now()
);
create index participantes_san_id_idx on public.participantes(san_id);

-- Tabla pagos
create table public.pagos (
  id uuid primary key default gen_random_uuid(),
  participante_id uuid not null references public.participantes(id) on delete cascade,
  san_id uuid not null references public.sanes(id) on delete cascade,
  numero_semana int not null,
  estatus text not null default 'pendiente' check (estatus in ('pagado','pendiente')),
  metodo_pago text,
  updated_at timestamptz not null default now()
);
create index pagos_san_id_idx on public.pagos(san_id);
create index pagos_part_idx on public.pagos(participante_id);
create unique index pagos_unique on public.pagos(participante_id, numero_semana);

-- Función security definer para evitar recursión en RLS
create or replace function public.is_san_owner(_san_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.sanes
    where id = _san_id and banquero_id = auth.uid()
  )
$$;

-- Habilitar RLS
alter table public.sanes enable row level security;
alter table public.participantes enable row level security;
alter table public.pagos enable row level security;

-- Políticas SANES
create policy "Sanes: lectura pública"
  on public.sanes for select
  using (true);

create policy "Sanes: banquero crea"
  on public.sanes for insert
  to authenticated
  with check (banquero_id = auth.uid());

create policy "Sanes: banquero actualiza"
  on public.sanes for update
  to authenticated
  using (banquero_id = auth.uid())
  with check (banquero_id = auth.uid());

create policy "Sanes: banquero elimina"
  on public.sanes for delete
  to authenticated
  using (banquero_id = auth.uid());

-- Políticas PARTICIPANTES
create policy "Participantes: lectura pública"
  on public.participantes for select
  using (true);

create policy "Participantes: banquero inserta"
  on public.participantes for insert
  to authenticated
  with check (public.is_san_owner(san_id));

create policy "Participantes: banquero actualiza"
  on public.participantes for update
  to authenticated
  using (public.is_san_owner(san_id))
  with check (public.is_san_owner(san_id));

create policy "Participantes: banquero elimina"
  on public.participantes for delete
  to authenticated
  using (public.is_san_owner(san_id));

-- Políticas PAGOS
create policy "Pagos: lectura pública"
  on public.pagos for select
  using (true);

create policy "Pagos: banquero inserta"
  on public.pagos for insert
  to authenticated
  with check (public.is_san_owner(san_id));

create policy "Pagos: banquero actualiza"
  on public.pagos for update
  to authenticated
  using (public.is_san_owner(san_id))
  with check (public.is_san_owner(san_id));

create policy "Pagos: banquero elimina"
  on public.pagos for delete
  to authenticated
  using (public.is_san_owner(san_id));