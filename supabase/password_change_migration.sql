-- Freeski-App: eigenes Passwort statt Startpasswort, für ALLE Konten (Coaches und Athlet:innen)
-- NUR im Freeski-Projekt ausführen (nvibrxtqknkmsiccauzs). Setzt runcheck_athlete_migration.sql voraus.
--
-- Wer in password_change_required steht, muss beim nächsten Öffnen der App ein eigenes Passwort setzen.
-- Neue Konten (im Supabase-Dashboard oder im Reiter «Accounts» angelegt) kommen per Trigger automatisch hinein.
-- Die App ruft nach jedem Passwortwechsel password_changed() auf und entfernt damit den Eintrag.
-- Admins (Tabelle app_admins) werden direkt in der Datenbank gepflegt, nicht über diese Datei.

create table if not exists public.password_change_required (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.password_change_required enable row level security;

drop policy if exists "password_change_required own" on public.password_change_required;
create policy "password_change_required own" on public.password_change_required
  for select to authenticated using (user_id = auth.uid());

-- Jedes neue Konto muss sein Startpasswort ersetzen
create or replace function public.flag_new_user_password() returns trigger
  language plpgsql security definer set search_path = public as $$
begin
  insert into public.password_change_required (user_id) values (new.id) on conflict do nothing;
  return new;
end $$;
revoke all on function public.flag_new_user_password() from public, anon, authenticated;

drop trigger if exists flag_new_user_password on auth.users;
create trigger flag_new_user_password after insert on auth.users
  for each row execute function public.flag_new_user_password();

-- Eigenes Passwort gesetzt: Markierung entfernen (auch der Status im Reiter «Accounts»)
create or replace function public.password_changed() returns void
  language sql volatile security definer set search_path = public as $$
  delete from public.password_change_required where user_id = auth.uid();
  update public.athlete_accounts set must_change_pw = false where user_id = auth.uid();
$$;
revoke all on function public.password_changed() from public, anon;
grant execute on function public.password_changed() to authenticated;

-- Früherer Name aus der ersten Version der App: gleiche Wirkung
create or replace function public.athlete_password_changed() returns void
  language sql volatile security definer set search_path = public as $$
  delete from public.password_change_required where user_id = auth.uid();
  update public.athlete_accounts set must_change_pw = false where user_id = auth.uid();
$$;

-- ── Einmalig, am 14.11.2026 ausgeführt: bestehende Konten mit vorgegebenem Startpasswort markieren ──
-- Alle Athlet:innen-Logins, die ihr Startpasswort noch haben, und Konten, die direkt im Dashboard
-- mit Passwort angelegt wurden (bestätigt beim Anlegen, ohne Einladung und ohne Passwort-Reset).
-- Nicht erneut ausführen: Wer sein Passwort inzwischen geändert hat, würde sonst wieder gefragt.
insert into public.password_change_required (user_id)
  select user_id from public.athlete_accounts where must_change_pw
  on conflict do nothing;
insert into public.password_change_required (user_id)
  select u.id from auth.users u
  where u.email_confirmed_at = u.created_at and u.invited_at is null and u.recovery_sent_at is null
    and u.created_at < '2026-11-15'
    and not exists (select 1 from public.athlete_accounts a where a.user_id = u.id)
  on conflict do nothing;
