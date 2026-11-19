-- Update 22: log_login_failure() gibt den Grund zurück, damit die Login-Seite «Benutzername nicht gefunden»
-- oder «Passwort falsch» anzeigen kann. Rückgabetyp ändert sich (void → text), deshalb zuerst löschen.
drop function if exists public.log_login_failure(text, text);
create or replace function public.log_login_failure(p_input text, p_login text)
returns text language plpgsql security definer set search_path = public as $$
declare v_in text := left(btrim(coalesce(p_input, '')), 80);
        v_login text := lower(left(btrim(coalesce(p_login, '')), 120));
        v_prof profiles%rowtype; v_reason text;
begin
  if v_in = '' or v_login = '' then return null; end if;
  -- Schutz gegen Fluten der Tabelle (anonym aufrufbar)
  if (select count(*) from login_failures where created_at > now() - interval '1 hour') >= 300 then return null; end if;
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
  return v_reason;
end $$;
revoke all on function public.log_login_failure(text, text) from public;
grant execute on function public.log_login_failure(text, text) to anon, authenticated;
