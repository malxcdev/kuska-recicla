-- =====================================================================
-- KUSKA Recicla · esquema inicial para Supabase
--
-- Cómo usarlo: Supabase → SQL Editor → New query → pegar TODO → Run.
-- Ejecútalo una sola vez en un proyecto nuevo (crea tipos y tablas).
--
-- Seguridad:
--   * Todas las tablas tienen RLS (Row Level Security) activado.
--   * Los pedidos NO se insertan ni se editan directo desde la app: se usan
--     funciones (book_pickup, accept_pickup, …) que validan rol, estado y cupos.
--   * Solo "comercio" y "reciclador" pueden registrarse solos. Los roles
--     "empresa" y "municipio" se asignan a mano (ver el final del archivo).
-- =====================================================================

begin;

-- ---------------------------------------------------------------------
-- 1. Tipos
-- ---------------------------------------------------------------------
create type public.user_role      as enum ('comercio', 'reciclador', 'empresa', 'municipio');
create type public.material_type  as enum ('carton', 'plastico', 'organico', 'vidrio');
create type public.request_status as enum ('solicitado', 'asignado', 'recogido', 'entregado');
create type public.lot_status     as enum ('abierto', 'listo', 'despachado');

-- ---------------------------------------------------------------------
-- 2. Tablas
-- ---------------------------------------------------------------------
create table public.zones (
  id   text primary key check (id ~ '^[A-Z]$'),
  name text not null,
  area text not null
);

-- Un perfil por usuario de Supabase Auth (comercio, reciclador, empresa o municipio).
create table public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  role         public.user_role not null default 'comercio',
  name         text not null,
  contact_name text not null default '',
  phone        text not null default '',
  email        text not null default '',
  address      text not null default '',
  zone         text not null default 'A' references public.zones (id),
  created_at   timestamptz not null default now()
);

-- Horario de servicio de cada zona (lo define el municipio).
create table public.zone_schedules (
  zone                text primary key references public.zones (id) on delete cascade,
  weekdays            smallint[] not null default '{1,2,3,4,5,6}' check (weekdays <@ '{0,1,2,3,4,5,6}'::smallint[]), -- 0 = domingo
  stops_per_collector smallint not null default 3 check (stops_per_collector between 1 and 10),
  horizon_days        smallint not null default 14 check (horizon_days between 7 and 30)
);

create table public.schedule_slots (
  zone      text not null references public.zones (id) on delete cascade,
  slot_id   text not null,
  starts_at time not null,
  ends_at   time not null check (ends_at > starts_at),
  primary key (zone, slot_id)
);

-- Feriados y cierres. zone = null significa "todas las zonas".
create table public.service_closures (
  id         uuid primary key default gen_random_uuid(),
  date       date not null,
  zone       text references public.zones (id) on delete cascade,
  reason     text not null,
  created_by uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);
create index service_closures_date_idx on public.service_closures (date);

-- Semana tipo de cada reciclador: una fila por día y franja en que trabaja.
create table public.collector_availability (
  collector_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  weekday      smallint not null check (weekday between 0 and 6),
  slot_id      text not null,
  primary key (collector_id, weekday, slot_id)
);

create table public.collector_time_off (
  id           uuid primary key default gen_random_uuid(),
  collector_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  date         date not null,
  reason       text,
  unique (collector_id, date)
);

-- Pedidos de recojo. En la app el código visible es 'KR-' || lpad(id::text, 4, '0').
create table public.pickup_requests (
  id             bigint generated always as identity primary key,
  requester_id   uuid not null references public.profiles (id) on delete cascade,
  material       public.material_type not null,
  kg             smallint not null check (kg between 1 and 200),
  scheduled_date date not null,
  slot_id        text not null,
  slot_label     text not null,
  address        text not null,
  zone           text not null references public.zones (id),
  status         public.request_status not null default 'solicitado',
  collector_id   uuid references public.profiles (id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index pickup_requests_slot_idx      on public.pickup_requests (zone, scheduled_date, slot_id);
create index pickup_requests_collector_idx on public.pickup_requests (collector_id, scheduled_date);
create index pickup_requests_requester_idx on public.pickup_requests (requester_id);

create table public.lots (
  id          text primary key,
  material    public.material_type not null,
  kg          numeric(10, 1) not null default 0 check (kg >= 0),
  capacity_kg numeric(10, 1) not null check (capacity_kg > 0),
  status      public.lot_status not null default 'abierto'
);

-- ---------------------------------------------------------------------
-- 3. Funciones auxiliares
-- ---------------------------------------------------------------------
create function public.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;

create trigger pickup_requests_touch_updated_at
  before update on public.pickup_requests
  for each row execute function public.touch_updated_at();

-- Rol y zona del usuario conectado (se usan en las reglas de acceso).
create function public.my_role() returns public.user_role
language sql stable security definer set search_path = '' as $$
  select role from public.profiles where id = auth.uid()
$$;

create function public.my_zone() returns text
language sql stable security definer set search_path = '' as $$
  select zone from public.profiles where id = auth.uid()
$$;

-- "Hoy" en Perú, para no depender de la hora UTC del servidor.
create function public.local_today() returns date
language sql stable set search_path = '' as $$
  select (now() at time zone 'America/Lima')::date
$$;

-- Crea el perfil al registrarse. Solo comercio y reciclador pueden elegirse solos.
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  requested text := coalesce(new.raw_user_meta_data ->> 'role', 'comercio');
  full_name text := nullif(trim(coalesce(new.raw_user_meta_data ->> 'name', '')), '');
begin
  insert into public.profiles (id, role, name, contact_name, phone, email)
  values (
    new.id,
    case when requested in ('comercio', 'reciclador') then requested::public.user_role else 'comercio' end,
    coalesce(full_name, split_part(coalesce(new.email, ''), '@', 1), 'Usuario'),
    coalesce(full_name, ''),
    coalesce(new.raw_user_meta_data ->> 'phone', ''),
    coalesce(new.email, '')
  );
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------
-- 4. Asignación automática y cambios de estado de los pedidos
-- ---------------------------------------------------------------------

-- Reciclador con menos carga en la franja; si empatan, el de menos recojos ese
-- día. La carga se cuenta en todas las zonas (nadie puede estar en dos lugares).
create function public.pick_collector(p_zone text, p_date date, p_slot_id text, p_exclude uuid default null)
returns uuid
language sql stable security definer set search_path = '' as $$
  with candidates as (
    select
      a.collector_id,
      (select count(*) from public.pickup_requests r
        where r.collector_id = a.collector_id and r.scheduled_date = p_date and r.slot_id = p_slot_id) as slot_load,
      (select count(*) from public.pickup_requests r
        where r.collector_id = a.collector_id and r.scheduled_date = p_date) as day_load
    from public.collector_availability a
    join public.profiles p on p.id = a.collector_id and p.role = 'reciclador' and p.zone = p_zone
    where a.weekday = extract(dow from p_date)::smallint
      and a.slot_id = p_slot_id
      and a.collector_id is distinct from p_exclude
      and not exists (
        select 1 from public.collector_time_off t
        where t.collector_id = a.collector_id and t.date = p_date
      )
  )
  select c.collector_id
  from candidates c
  where c.slot_load < (select s.stops_per_collector from public.zone_schedules s where s.zone = p_zone)
  order by c.slot_load, c.day_load, c.collector_id
  limit 1
$$;

-- Programar un recojo (comercio). Valida el día y la franja, toma un candado
-- para que dos reservas simultáneas no se lleven el último cupo y asigna reciclador.
create function public.book_pickup(p_material public.material_type, p_kg smallint, p_date date, p_slot_id text)
returns public.pickup_requests
language plpgsql security definer set search_path = '' as $$
declare
  me      public.profiles;
  sched   public.zone_schedules;
  slot    public.schedule_slots;
  chosen  uuid;
  created public.pickup_requests;
  today   date := public.local_today();
begin
  select * into me from public.profiles where id = auth.uid();
  if not found or me.role <> 'comercio' then
    raise exception 'Solo un comercio puede programar recojos.';
  end if;
  if me.address = '' then
    raise exception 'Agrega la dirección de tu comercio antes de programar un recojo.';
  end if;
  if p_kg is null or p_kg not between 1 and 200 then
    raise exception 'La cantidad debe estar entre 1 y 200 kg.';
  end if;

  select * into sched from public.zone_schedules where zone = me.zone;
  if not found then
    raise exception 'Tu zona aún no tiene horario de recojo.';
  end if;
  if p_date <= today or p_date > today + sched.horizon_days then
    raise exception 'Elige un día dentro de los próximos % días.', sched.horizon_days;
  end if;
  if not (extract(dow from p_date)::smallint = any (sched.weekdays)) then
    raise exception 'Ese día no hay servicio en tu zona.';
  end if;
  if exists (select 1 from public.service_closures c where c.date = p_date and (c.zone is null or c.zone = me.zone)) then
    raise exception 'Ese día es feriado o no hay servicio.';
  end if;

  select * into slot from public.schedule_slots s where s.zone = me.zone and s.slot_id = p_slot_id;
  if not found then
    raise exception 'Esa franja no existe en tu zona.';
  end if;

  perform pg_advisory_xact_lock(hashtext(me.zone || ':' || p_date::text));

  chosen := public.pick_collector(me.zone, p_date, p_slot_id);
  if chosen is null then
    raise exception 'Ese horario se acaba de llenar. Elige otro.';
  end if;

  insert into public.pickup_requests
    (requester_id, material, kg, scheduled_date, slot_id, slot_label, address, zone, status, collector_id)
  values
    (me.id, p_material, p_kg, p_date, p_slot_id,
     to_char(slot.starts_at, 'HH24:MI') || ' – ' || to_char(slot.ends_at, 'HH24:MI'),
     me.address, me.zone, 'asignado', chosen)
  returning * into created;

  return created;
end $$;

-- "No puedo ir" (reciclador): pasa el pedido a otro reciclador disponible o,
-- si no hay nadie, lo devuelve a la lista de disponibles de la zona.
create function public.release_pickup(p_request_id bigint)
returns public.pickup_requests
language plpgsql security definer set search_path = '' as $$
declare
  req     public.pickup_requests;
  nxt     uuid;
  updated public.pickup_requests;
begin
  select * into req from public.pickup_requests where id = p_request_id for update;
  if not found or req.collector_id is distinct from auth.uid() or req.status <> 'asignado' then
    raise exception 'Solo puedes liberar un recojo que tengas asignado.';
  end if;

  perform pg_advisory_xact_lock(hashtext(req.zone || ':' || req.scheduled_date::text));
  nxt := public.pick_collector(req.zone, req.scheduled_date, req.slot_id, auth.uid());

  update public.pickup_requests
     set collector_id = nxt,
         status = case when nxt is null then 'solicitado'::public.request_status else 'asignado'::public.request_status end
   where id = p_request_id
  returning * into updated;

  return updated;
end $$;

-- Aceptar un pedido libre de su zona (reciclador).
create function public.accept_pickup(p_request_id bigint)
returns public.pickup_requests
language plpgsql security definer set search_path = '' as $$
declare
  updated public.pickup_requests;
begin
  if public.my_role() is distinct from 'reciclador' then
    raise exception 'Solo un reciclador puede aceptar recojos.';
  end if;
  update public.pickup_requests
     set collector_id = auth.uid(), status = 'asignado'
   where id = p_request_id and status = 'solicitado' and collector_id is null and zone = public.my_zone()
  returning * into updated;
  if not found then
    raise exception 'Ese recojo ya no está disponible.';
  end if;
  return updated;
end $$;

-- Marcar como recogido (el reciclador asignado).
create function public.mark_picked_up(p_request_id bigint)
returns public.pickup_requests
language plpgsql security definer set search_path = '' as $$
declare
  updated public.pickup_requests;
begin
  update public.pickup_requests
     set status = 'recogido'
   where id = p_request_id and status = 'asignado' and collector_id = auth.uid()
  returning * into updated;
  if not found then
    raise exception 'Solo puedes marcar como recogido un recojo que tengas asignado.';
  end if;
  return updated;
end $$;

-- Registrar la recepción en el centro (empresa).
create function public.receive_pickup(p_request_id bigint)
returns public.pickup_requests
language plpgsql security definer set search_path = '' as $$
declare
  updated public.pickup_requests;
begin
  if public.my_role() is distinct from 'empresa' then
    raise exception 'Solo una empresa puede registrar recepciones.';
  end if;
  update public.pickup_requests
     set status = 'entregado'
   where id = p_request_id and status = 'recogido'
  returning * into updated;
  if not found then
    raise exception 'Ese recojo no está pendiente de recepción.';
  end if;
  return updated;
end $$;

-- Carga de cada reciclador por día y franja, sin datos personales. La app la
-- usa para calcular los cupos libres del calendario.
create function public.collector_loads(p_from date, p_to date)
returns table (collector_id uuid, zone text, scheduled_date date, slot_id text, total integer)
language sql stable security definer set search_path = '' as $$
  select r.collector_id, r.zone, r.scheduled_date, r.slot_id, count(*)::integer
  from public.pickup_requests r
  where r.collector_id is not null and r.scheduled_date between p_from and p_to
  group by r.collector_id, r.zone, r.scheduled_date, r.slot_id
$$;

-- ---------------------------------------------------------------------
-- 5. Permisos y reglas de acceso (RLS)
-- ---------------------------------------------------------------------
alter table public.zones                  enable row level security;
alter table public.profiles               enable row level security;
alter table public.zone_schedules         enable row level security;
alter table public.schedule_slots         enable row level security;
alter table public.service_closures       enable row level security;
alter table public.collector_availability enable row level security;
alter table public.collector_time_off     enable row level security;
alter table public.pickup_requests        enable row level security;
alter table public.lots                   enable row level security;

-- Catálogo y calendario: lo leen todos los usuarios conectados; lo edita el municipio.
create policy "zonas: lectura" on public.zones for select to authenticated using (true);

create policy "horarios: lectura" on public.zone_schedules for select to authenticated using (true);
create policy "horarios: municipio" on public.zone_schedules for all to authenticated
  using (public.my_role() = 'municipio') with check (public.my_role() = 'municipio');

create policy "franjas: lectura" on public.schedule_slots for select to authenticated using (true);
create policy "franjas: municipio" on public.schedule_slots for all to authenticated
  using (public.my_role() = 'municipio') with check (public.my_role() = 'municipio');

create policy "cierres: lectura" on public.service_closures for select to authenticated using (true);
create policy "cierres: municipio" on public.service_closures for all to authenticated
  using (public.my_role() = 'municipio') with check (public.my_role() = 'municipio');

-- Perfiles: nombres y teléfonos visibles para coordinar recojos; cada uno edita
-- solo sus datos de contacto (nunca su rol).
create policy "perfiles: lectura" on public.profiles for select to authenticated using (true);
create policy "perfiles: editar el propio" on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());
revoke update on public.profiles from anon, authenticated;
grant update (contact_name, phone, address, zone) on public.profiles to authenticated;

-- Disponibilidad y días libres: los lee todo usuario conectado (para calcular
-- cupos); cada reciclador edita solo los suyos.
create policy "disponibilidad: lectura" on public.collector_availability for select to authenticated using (true);
create policy "disponibilidad: la propia" on public.collector_availability for all to authenticated
  using (collector_id = auth.uid() and public.my_role() = 'reciclador')
  with check (collector_id = auth.uid() and public.my_role() = 'reciclador');

create policy "dias libres: lectura" on public.collector_time_off for select to authenticated using (true);
create policy "dias libres: los propios" on public.collector_time_off for all to authenticated
  using (collector_id = auth.uid() and public.my_role() = 'reciclador')
  with check (collector_id = auth.uid() and public.my_role() = 'reciclador');

-- Pedidos: cada rol ve solo lo que le corresponde. No hay políticas de
-- insert/update/delete: todo cambio pasa por las funciones de la sección 4.
create policy "pedidos: lectura por rol" on public.pickup_requests for select to authenticated
  using (
    requester_id = auth.uid()
    or collector_id = auth.uid()
    or (public.my_role() = 'reciclador' and status = 'solicitado' and collector_id is null and zone = public.my_zone())
    or (public.my_role() = 'empresa' and status in ('recogido', 'entregado'))
    or public.my_role() = 'municipio'
  );

-- Lotes: los ve la empresa y el municipio; los gestiona la empresa.
create policy "lotes: lectura" on public.lots for select to authenticated
  using (public.my_role() in ('empresa', 'municipio'));
create policy "lotes: empresa" on public.lots for all to authenticated
  using (public.my_role() = 'empresa') with check (public.my_role() = 'empresa');

-- Funciones: los visitantes sin sesión no ejecutan nada; las internas no se exponen.
revoke execute on all functions in schema public from public, anon;
revoke execute on function public.pick_collector(text, date, text, uuid) from authenticated;
revoke execute on function public.handle_new_user() from authenticated;
grant execute on function public.my_role(), public.my_zone(), public.local_today() to authenticated;
grant execute on function
  public.book_pickup(public.material_type, smallint, date, text),
  public.release_pickup(bigint),
  public.accept_pickup(bigint),
  public.mark_picked_up(bigint),
  public.receive_pickup(bigint),
  public.collector_loads(date, date)
to authenticated;

-- ---------------------------------------------------------------------
-- 6. Datos iniciales
-- ---------------------------------------------------------------------
insert into public.zones (id, name, area) values
  ('A', 'Zona A', 'Av. Ejército'),
  ('B', 'Zona B', 'Puente Santiago'),
  ('C', 'Zona C', 'Zarzuela'),
  ('D', 'Zona D', 'Margen derecha');

-- Lunes a sábado, 3 recojos por reciclador y franja, reservas hasta 14 días.
insert into public.zone_schedules (zone) select id from public.zones;

insert into public.schedule_slots (zone, slot_id, starts_at, ends_at)
select z.id, s.slot_id, s.starts_at, s.ends_at
from public.zones z
cross join (values
  ('08-10', time '08:00', time '10:00'),
  ('10-12', time '10:00', time '12:00'),
  ('14-16', time '14:00', time '16:00')
) as s (slot_id, starts_at, ends_at);

insert into public.service_closures (date, zone, reason, created_by) values
  ('2026-12-08', null, 'Feriado: Inmaculada Concepción', null),
  ('2026-12-25', null, 'Feriado: Navidad', null),
  ('2027-01-01', null, 'Feriado: Año Nuevo', null);

insert into public.lots (id, material, kg, capacity_kg, status) values
  ('LC-018', 'carton',   386, 500, 'abierto'),
  ('LP-007', 'plastico', 142, 300, 'abierto'),
  ('LV-003', 'vidrio',   210, 250, 'listo'),
  ('LO-011', 'organico',  95, 400, 'abierto');

commit;

-- =====================================================================
-- Después de ejecutar:
--
-- 1. Crea las cuentas desde la app (o en Authentication → Users → Add user).
--    Al registrarse, a cada usuario se le crea su perfil automáticamente.
--
-- 2. Asigna a mano los roles que no se pueden elegir al registrarse:
--      update public.profiles set role = 'municipio' where email = 'correo-del-municipio@ejemplo.pe';
--      update public.profiles set role = 'empresa'   where email = 'correo-de-la-empresa@ejemplo.pe';
--
-- 3. Comprobación rápida:
--      select id, name, area from public.zones;                 -- 4 zonas
--      select zone, slot_id, starts_at, ends_at from public.schedule_slots;  -- 12 franjas
-- =====================================================================
