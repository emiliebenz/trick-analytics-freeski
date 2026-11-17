-- Update 21: fehlgeschlagene Logins protokollieren (nur für Admins sichtbar, 30 Tage aufbewahrt)
-- Die App ruft log_login_failure() nach «Invalid login credentials» auf. Gespeichert wird nur die Eingabe
-- im Feld «E-Mail oder Benutzername» (nie das Passwort) plus das zugeordnete Profil, falls es eins gibt.

create table if not exists public.login_failures (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  input text not null,
  profile_id uuid references public.profiles(id) on delete set null,
  reason text not null
);
create index if not exists login_failures_created_idx on public.login_failures (created_at desc);
alter table public.login_failures enable row level security;
drop policy if exists login_failures_admin_read on public.login_failures;
create policy login_failures_admin_read on public.login_failures for select using (public.is_admin());

-- reason: wrong_password · email_instead_of_username · no_account · unknown
create or replace function public.log_login_failure(p_input text, p_login text)
returns void language plpgsql security definer set search_path = public as $$
declare v_in text := left(btrim(coalesce(p_input, '')), 80);
        v_login text := lower(left(btrim(coalesce(p_login, '')), 120));
        v_prof profiles%rowtype; v_reason text;
begin
  if v_in = '' or v_login = '' then return; end if;
  -- Schutz gegen Fluten der Tabelle (anonym aufrufbar)
  if (select count(*) from login_failures where created_at > now() - interval '1 hour') >= 300 then return; end if;
  if v_login like '%@login.trick-collector.invalid' then
    select * into v_prof from profiles where lower(username) = split_part(v_login, '@', 1) limit 1;
  else
    select * into v_prof from profiles p
      where lower(p.email) = v_login or p.user_id in (select id from auth.users where lower(email) = v_login)
      order by (p.user_id is not null) desc limit 1;
  end if;
  v_reason := case
    when v_prof.id is null then 'unknown'
    when v_prof.user_id is null then 'no_account'
    when v_prof.role = 'athlete' and v_login not like '%@login.trick-collector.invalid' then 'email_instead_of_username'
    else 'wrong_password' end;
  insert into login_failures (input, profile_id, reason) values (v_in, v_prof.id, v_reason);
end $$;
revoke all on function public.log_login_failure(text, text) from public;
grant execute on function public.log_login_failure(text, text) to anon, authenticated;

-- Übersicht für Admins: pro Person (oder unbekannter Eingabe) Anzahl, letzter Versuch, seither eingeloggt?
create or replace function public.login_failures_summary()
returns table (name text, grp text, input text, reason text, attempts int, last_at timestamptz, logged_in_since boolean)
language sql stable security definer set search_path = public as $$
  select coalesce(max(p.name), max(f.input)), max(g.name), max(f.input), (array_agg(f.reason order by f.created_at desc))[1],
         count(*)::int, max(f.created_at),
         coalesce(max(u.last_sign_in_at) > max(f.created_at), false)
  from login_failures f
  left join profiles p on p.id = f.profile_id
  left join groups g on g.id = p.group_id
  left join auth.users u on u.id = p.user_id
  where public.is_admin() and f.created_at > now() - interval '30 days'
  group by coalesce(p.id::text, lower(f.input))
  order by max(f.created_at) desc
$$;
revoke all on function public.login_failures_summary() from public;
grant execute on function public.login_failures_summary() to authenticated;

-- nach 30 Tagen löschen
select cron.schedule('login-failures-cleanup', '17 3 * * *',
  $$delete from public.login_failures where created_at < now() - interval '30 days'$$);
