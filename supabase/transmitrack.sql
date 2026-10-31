-- TransmiTrack (planeador TransMilenio): base de datos del panel de admin en Supabase.
--
-- Idea: la red original son los 3 CSV. Cada cambio del admin (cerrar, eliminar estación, crear línea,
-- deshacer...) se guarda como una fila en public.transmi_cambios, en orden. Al abrir la app, el motor
-- carga los CSV y vuelve a aplicar esas filas en el mismo orden: como el motor es determinista, todos
-- los dispositivos llegan exactamente a la misma red (incluidas las pilas de deshacer/rehacer).
--
-- Seguridad: cualquiera puede LEER los cambios, pero nadie puede escribir directo en la tabla.
-- Solo se escribe con las funciones transmi_registrar / transmi_reiniciar, que piden el PIN.
-- El PIN se guarda cifrado con bcrypt en un esquema privado y hay límite de intentos.

-- Esquema privado (no expuesto por la API): PIN cifrado e intentos.
create schema if not exists transmi;
revoke all on schema transmi from public, anon, authenticated;

create table transmi.config (
  id int primary key default 1 check (id = 1),
  pin_hash text not null
);
-- El PIN NO va en el repositorio: al aplicar este archivo, reemplaza :'pin_admin' por el PIN real
-- (en psql: \set pin_admin '....'), o ejecuta solo esta línea aparte en el editor SQL de Supabase.
insert into transmi.config (pin_hash) values (extensions.crypt(:'pin_admin', extensions.gen_salt('bf', 10)));

create table transmi.intentos (
  id bigserial primary key,
  ip text not null,
  ok boolean not null,
  creado timestamptz not null default now()
);
create index intentos_ip_creado on transmi.intentos (ip, creado);
create index intentos_creado on transmi.intentos (creado);
alter table transmi.config enable row level security;
alter table transmi.intentos enable row level security;

-- Público: cualquiera lee los cambios (así todos ven la misma red); nadie escribe directo.
create table public.transmi_cambios (
  id bigserial primary key,
  creado timestamptz not null default now(),
  op text not null check (op in ('cerrar','reabrir','agregar_parada','quitar_parada','crear_estacion','eliminar_estacion',
                                 'crear_ruta','eliminar_ruta','deshacer','rehacer','deshacer_cambio','rehacer_cambio')),
  args jsonb not null default '[]'::jsonb check (jsonb_typeof(args) = 'array' and pg_column_size(args) < 4000),
  descripcion text not null default '' check (char_length(descripcion) <= 300)
);
alter table public.transmi_cambios enable row level security;
create policy "todos leen los cambios" on public.transmi_cambios for select to anon, authenticated using (true);
revoke insert, update, delete, truncate on public.transmi_cambios from anon, authenticated;
grant select on public.transmi_cambios to anon, authenticated;

-- Revisa el PIN con límite de intentos: 5 fallos por IP o 30 en total en 15 minutos bloquean.
-- Devuelve jsonb (no lanza error) para que el intento fallido SÍ quede guardado.
create or replace function transmi.revisar_pin(p_pin text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_ip text;
  v_fallas_ip int;
  v_fallas int;
  v_ok boolean;
begin
  v_ip := split_part(coalesce(current_setting('request.headers', true)::json ->> 'x-forwarded-for', 'desconocida'), ',', 1);
  delete from transmi.intentos where creado < now() - interval '1 day';
  select count(*) into v_fallas_ip from transmi.intentos where ip = v_ip and not ok and creado > now() - interval '15 minutes';
  select count(*) into v_fallas from transmi.intentos where not ok and creado > now() - interval '15 minutes';
  if v_fallas_ip >= 5 or v_fallas >= 30 then
    return jsonb_build_object('ok', false, 'bloqueado', true, 'error', 'Demasiados intentos. Espera 15 minutos.');
  end if;
  select c.pin_hash = extensions.crypt(coalesce(p_pin, ''), c.pin_hash) into v_ok from transmi.config c where c.id = 1;
  v_ok := coalesce(v_ok, false);
  insert into transmi.intentos (ip, ok) values (v_ip, v_ok);
  if not v_ok then
    return jsonb_build_object('ok', false, 'bloqueado', false, 'error', 'PIN incorrecto',
                              'quedan', greatest(0, 4 - v_fallas_ip));
  end if;
  return jsonb_build_object('ok', true);
end $$;
revoke all on function transmi.revisar_pin(text) from public, anon, authenticated;

create or replace function public.transmi_verificar_pin(p_pin text) returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  return transmi.revisar_pin(p_pin);
end $$;

-- Registra un cambio solo si el PIN es correcto.
create or replace function public.transmi_registrar(p_pin text, p_op text, p_args jsonb, p_descripcion text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_res jsonb;
  v_fila public.transmi_cambios;
begin
  v_res := transmi.revisar_pin(p_pin);
  if not (v_res ->> 'ok')::boolean then return v_res; end if;
  if (select count(*) from public.transmi_cambios) >= 5000 then
    return jsonb_build_object('ok', false, 'error', 'El historial está lleno. Restablece la red.');
  end if;
  insert into public.transmi_cambios (op, args, descripcion)
  values (p_op, coalesce(p_args, '[]'::jsonb), left(coalesce(p_descripcion, ''), 300))
  returning * into v_fila;
  return jsonb_build_object('ok', true, 'id', v_fila.id, 'creado', v_fila.creado);
exception when check_violation then
  return jsonb_build_object('ok', false, 'error', 'Cambio inválido');
end $$;

-- Borra todo el historial (la red vuelve a la original de los CSV). También pide PIN.
create or replace function public.transmi_reiniciar(p_pin text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_res jsonb;
begin
  v_res := transmi.revisar_pin(p_pin);
  if not (v_res ->> 'ok')::boolean then return v_res; end if;
  delete from public.transmi_cambios where true;
  return jsonb_build_object('ok', true);
end $$;

revoke all on function public.transmi_verificar_pin(text) from public;
revoke all on function public.transmi_registrar(text, text, jsonb, text) from public;
revoke all on function public.transmi_reiniciar(text) from public;
grant execute on function public.transmi_verificar_pin(text) to anon, authenticated;
grant execute on function public.transmi_registrar(text, text, jsonb, text) to anon, authenticated;
grant execute on function public.transmi_reiniciar(text) to anon, authenticated;

-- Tiempo real: las apps abiertas se enteran de cada cambio al instante.
alter publication supabase_realtime add table public.transmi_cambios;
