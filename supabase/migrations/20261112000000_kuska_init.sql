-- KUSKA Recicla · esquema inicial para Supabase
-- Idempotente: se puede ejecutar varias veces sin romper nada.
-- Ejecutar en el SQL Editor del proyecto o con `supabase db push`.

begin;

create extension if not exists pgcrypto;

/* ---------------------------------------------------------------------------
   1. Perfiles: una fila por usuario de Supabase Auth (1:1 con auth.users)
   --------------------------------------------------------------------------- */

create table if not exists public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  role         text not null default 'comercio'
               check (role in ('comercio', 'reciclador', 'empresa', 'municipio')),
  name         text not null default '',
  contact_name text not null default '',
  phone        text not null default '',
  email        text not null default '',
  address      text not null default '',
  zone         text not null default 'A' check (zone in ('A', 'B', 'C', 'D')),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists profiles_role_idx on public.profiles (role);

/* ---------------------------------------------------------------------------
   2. Pedidos de recojo
   --------------------------------------------------------------------------- */

create sequence if not exists public.pickup_request_code_seq start with 1;

create table if not exists public.pickup_requests (
  id             text primary key
                 default 'KR-' || lpad(nextval('public.pickup_request_code_seq')::text, 4, '0'),
  requester_id   uuid not null references public.profiles (id) on delete cascade,
  material       text not null check (material in ('carton', 'plastico', 'organico', 'vidrio')),
  kg             numeric(10, 2) not null check (kg > 0),
  scheduled_date date not null,
  slot_id        text not null,
  slot           text not null,
  address        text not null default '',
  zone           text not null check (zone in ('A', 'B', 'C', 'D')),
  status         text not null default 'solicitado'
                 check (status in ('solicitado', 'asignado', 'recogido', 'entregado')),
  collector_id   uuid references public.profiles (id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists pickup_requests_requester_idx on public.pickup_requests (requester_id);
create index if not exists pickup_requests_collector_idx on public.pickup_requests (collector_id);
create index if not exists pickup_requests_schedule_idx on public.pickup_requests (scheduled_date, zone);
create index if not exists pickup_requests_status_idx on public.pickup_requests (status);

/* ---------------------------------------------------------------------------
   3. Lotes, calendario de servicio y disponibilidad de recicladores
   --------------------------------------------------------------------------- */

create table if not exists public.lots (
  id          text primary key,
  material    text not null check (material in ('carton', 'plastico', 'organico', 'vidrio')),
  kg          numeric(10, 2) not null default 0 check (kg >= 0),
  capacity_kg numeric(10, 2) not null default 0 check (capacity_kg > 0),
  status      text not null default 'abierto' check (status in ('abierto', 'listo', 'despachado')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.zone_schedules (
  zone               text primary key check (zone in ('A', 'B', 'C', 'D')),
  weekdays           int[] not null default array[1, 2, 3, 4, 5, 6],
  slots              jsonb not null default '[]'::jsonb,
  stops_per_collector int not null default 3 check (stops_per_collector > 0),
  horizon_days       int not null default 14 check (horizon_days > 0),
  updated_at         timestamptz not null default now()
);

create table if not exists public.service_closures (
  id         text primary key,
  date       date not null,
  zone       text check (zone in ('A', 'B', 'C', 'D')),
  reason     text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists service_closures_date_idx on public.service_closures (date);

create table if not exists public.collector_availability (
  collector_id uuid primary key references public.profiles (id) on delete cascade,
  zone         text not null check (zone in ('A', 'B', 'C', 'D')),
  weekly       jsonb not null default '{}'::jsonb,
  updated_at   timestamptz not null default now()
);

create table if not exists public.collector_time_off (
  id           text primary key,
  collector_id uuid not null references public.profiles (id) on delete cascade,
  date         date not null,
  reason       text,
  created_at   timestamptz not null default now()
);

create index if not exists collector_time_off_collector_idx on public.collector_time_off (collector_id, date);

/* ---------------------------------------------------------------------------
   4. Utilidades
   --------------------------------------------------------------------------- */

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create or replace function public.actor_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

drop trigger if exists profiles_touch_updated_at on public.profiles;
create trigger profiles_touch_updated_at before update on public.profiles
  for each row execute function public.touch_updated_at();

drop trigger if exists pickup_requests_touch_updated_at on public.pickup_requests;
create trigger pickup_requests_touch_updated_at before update on public.pickup_requests
  for each row execute function public.touch_updated_at();

drop trigger if exists lots_touch_updated_at on public.lots;
create trigger lots_touch_updated_at before update on public.lots
  for each row execute function public.touch_updated_at();

drop trigger if exists zone_schedules_touch_updated_at on public.zone_schedules;
create trigger zone_schedules_touch_updated_at before update on public.zone_schedules
  for each row execute function public.touch_updated_at();

drop trigger if exists collector_availability_touch_updated_at on public.collector_availability;
create trigger collector_availability_touch_updated_at before update on public.collector_availability
  for each row execute function public.touch_updated_at();

/* Perfil automático al registrarse (toma rol, nombre y celular de los metadatos). */
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  meta_role text;
begin
  meta_role := coalesce(new.raw_user_meta_data ->> 'role', 'comercio');
  if meta_role not in ('comercio', 'reciclador', 'empresa', 'municipio') then
    meta_role := 'comercio';
  end if;

  insert into public.profiles (id, role, name, contact_name, phone, email)
  values (
    new.id,
    meta_role,
    coalesce(new.raw_user_meta_data ->> 'name', ''),
    coalesce(new.raw_user_meta_data ->> 'name', ''),
    coalesce(new.raw_user_meta_data ->> 'phone', ''),
    coalesce(new.email, '')
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

/* ---------------------------------------------------------------------------
   5. Seguridad a nivel de fila
   --------------------------------------------------------------------------- */

alter table public.profiles             enable row level security;
alter table public.pickup_requests      enable row level security;
alter table public.lots                 enable row level security;
alter table public.zone_schedules       enable row level security;
alter table public.service_closures     enable row level security;
alter table public.collector_availability enable row level security;
alter table public.collector_time_off   enable row level security;

-- Perfiles: todos los participantes de la red se ven entre sí; cada uno edita el suyo
-- y no puede cambiarse el rol.
drop policy if exists "profiles_select" on public.profiles;
create policy "profiles_select" on public.profiles
  for select to authenticated using (true);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
  for insert to authenticated with check (id = auth.uid());

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid() and role = public.actor_role());

-- Pedidos: lectura para toda la red; cada comercio crea los suyos; municipio y
-- recicladores actualizan estado y asignación.
drop policy if exists "requests_select" on public.pickup_requests;
create policy "requests_select" on public.pickup_requests
  for select to authenticated using (true);

drop policy if exists "requests_insert_own" on public.pickup_requests;
create policy "requests_insert_own" on public.pickup_requests
  for insert to authenticated with check (requester_id = auth.uid());

drop policy if exists "requests_update_network" on public.pickup_requests;
create policy "requests_update_network" on public.pickup_requests
  for update to authenticated
  using (true)
  with check (true);

-- Catálogo y calendario: lectura para todos; escritura del municipio.
drop policy if exists "lots_select" on public.lots;
create policy "lots_select" on public.lots
  for select to authenticated using (true);

drop policy if exists "lots_write_municipio" on public.lots;
create policy "lots_write_municipio" on public.lots
  for all to authenticated
  using (public.actor_role() = 'municipio')
  with check (public.actor_role() = 'municipio');

drop policy if exists "zone_schedules_select" on public.zone_schedules;
create policy "zone_schedules_select" on public.zone_schedules
  for select to authenticated using (true);

drop policy if exists "zone_schedules_write_municipio" on public.zone_schedules;
create policy "zone_schedules_write_municipio" on public.zone_schedules
  for all to authenticated
  using (public.actor_role() = 'municipio')
  with check (public.actor_role() = 'municipio');

drop policy if exists "service_closures_select" on public.service_closures;
create policy "service_closures_select" on public.service_closures
  for select to authenticated using (true);

drop policy if exists "service_closures_write_municipio" on public.service_closures;
create policy "service_closures_write_municipio" on public.service_closures
  for all to authenticated
  using (public.actor_role() = 'municipio')
  with check (public.actor_role() = 'municipio');

-- Disponibilidad: el reciclador edita la suya, el municipio puede editar todas.
drop policy if exists "availability_select" on public.collector_availability;
create policy "availability_select" on public.collector_availability
  for select to authenticated using (true);

drop policy if exists "availability_write" on public.collector_availability;
create policy "availability_write" on public.collector_availability
  for all to authenticated
  using (collector_id = auth.uid() or public.actor_role() = 'municipio')
  with check (collector_id = auth.uid() or public.actor_role() = 'municipio');

drop policy if exists "time_off_select" on public.collector_time_off;
create policy "time_off_select" on public.collector_time_off
  for select to authenticated using (true);

drop policy if exists "time_off_write" on public.collector_time_off;
create policy "time_off_write" on public.collector_time_off
  for all to authenticated
  using (collector_id = auth.uid() or public.actor_role() = 'municipio')
  with check (collector_id = auth.uid() or public.actor_role() = 'municipio');

/* ---------------------------------------------------------------------------
   6. Permisos para los roles de PostgREST
   --------------------------------------------------------------------------- */

grant usage on schema public to anon, authenticated;
grant select                         on public.profiles, public.pickup_requests, public.lots,
                                        public.zone_schedules, public.service_closures,
                                        public.collector_availability, public.collector_time_off
                                     to authenticated;
grant insert, update                 on public.profiles, public.pickup_requests to authenticated;
grant insert, update, delete         on public.lots, public.zone_schedules, public.service_closures,
                                        public.collector_availability, public.collector_time_off
                                     to authenticated;
grant usage, select                  on sequence public.pickup_request_code_seq to authenticated;

/* ---------------------------------------------------------------------------
   7. Datos iniciales de configuración (no dependen de usuarios)
   --------------------------------------------------------------------------- */

insert into public.lots (id, material, kg, capacity_kg, status) values
  ('LC-018', 'carton',   386, 500, 'abierto'),
  ('LP-007', 'plastico', 142, 300, 'abierto'),
  ('LV-003', 'vidrio',   210, 250, 'listo'),
  ('LO-011', 'organico',  95, 400, 'abierto'),
  ('LP-006', 'plastico', 300, 300, 'listo'),
  ('LC-017', 'carton',   500, 500, 'despachado')
on conflict (id) do nothing;

insert into public.zone_schedules (zone, weekdays, slots, stops_per_collector, horizon_days) values
  ('A', array[1,2,3,4,5,6], '[{"id":"08-10","start":"08:00","end":"10:00"},{"id":"10-12","start":"10:00","end":"12:00"},{"id":"14-16","start":"14:00","end":"16:00"}]'::jsonb, 3, 14),
  ('B', array[1,2,3,4,5,6], '[{"id":"08-10","start":"08:00","end":"10:00"},{"id":"10-12","start":"10:00","end":"12:00"},{"id":"14-16","start":"14:00","end":"16:00"}]'::jsonb, 3, 14),
  ('C', array[1,2,3,4,5,6], '[{"id":"08-10","start":"08:00","end":"10:00"},{"id":"10-12","start":"10:00","end":"12:00"},{"id":"14-16","start":"14:00","end":"16:00"}]'::jsonb, 3, 14),
  ('D', array[1,2,3,4,5,6], '[{"id":"08-10","start":"08:00","end":"10:00"},{"id":"10-12","start":"10:00","end":"12:00"},{"id":"14-16","start":"14:00","end":"16:00"}]'::jsonb, 3, 14)
on conflict (zone) do nothing;

insert into public.service_closures (id, date, zone, reason) values
  ('cl-inmaculada', '2026-12-08', null, 'Feriado: Inmaculada Concepción')
on conflict (id) do nothing;

commit;
