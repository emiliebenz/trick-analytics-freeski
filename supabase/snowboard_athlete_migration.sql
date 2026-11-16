-- Snowboard-App (Elite): Athlet:innen-Logins, Startpasswort-Pflicht und Athletensicht in Reports
-- NUR im Snowboard-Projekt (oevjddfliqhtfvutllyf). Am 16.11.2026 ausgeführt, als zwei Migrationen
-- (athlete_logins, password_change_and_athlete_videos). Wiederholbar (idempotent), bis auf den
-- einmaligen Abschnitt «Einmalig» unten.
--
-- Entspricht runcheck_athlete_migration.sql + password_change_migration.sql + report_videos_athlete_migration.sql
-- aus dem Freeski-Projekt, aber OHNE Run-Check (keine Tabelle run_checks; der Reiter bleibt über
-- CFG.runCheck in js/config.js ausgeblendet). Snowboard-Athlet:innen sehen Assessment und Reports.
-- Die Edge Function athlete-accounts ist im Snowboard-Projekt mit demselben Code deployt.

-- ── Tabellen ───────────────────────────────

create table if not exists public.app_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.athlete_accounts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  athlet text not null unique,          -- Name wie in js/config.js (Spalte athlet in standort/tricks)
  username text not null unique,        -- Login: <username>@login.trick-analyses.invalid
  must_change_pw boolean not null default true,
  created_at timestamptz not null default now()
);


alter table public.app_admins enable row level security;
alter table public.athlete_accounts enable row level security;

-- ─────────────────────────────── Hilfsfunktionen ───────────────────────────────

create or replace function public.is_athlete() returns boolean
  language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.athlete_accounts where user_id = auth.uid());
$$;

create or replace function public.my_athlete() returns text
  language sql stable security definer set search_path = public as $$
  select athlet from public.athlete_accounts where user_id = auth.uid();
$$;

create or replace function public.is_app_admin() returns boolean
  language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.app_admins where user_id = auth.uid());
$$;

-- Ordnername im Video-Bucket, gleich gebildet wie in js/kern.js (athlet.replace(/[^\w-]+/g, '_'))
create or replace function public.video_folder(name text) returns text
  language sql immutable set search_path = public as $$
  select regexp_replace(coalesce(name, 'athlete'), '[^A-Za-z0-9_-]+', '_', 'g');
$$;

-- Die Hilfsfunktionen braucht nur, wer angemeldet ist (Policies laufen mit der Rolle authenticated)
revoke all on function public.is_athlete() from public, anon;
revoke all on function public.my_athlete() from public, anon;
revoke all on function public.is_app_admin() from public, anon;
revoke all on function public.video_folder(text) from public, anon;
grant execute on function public.is_athlete() to authenticated;
grant execute on function public.my_athlete() to authenticated;
grant execute on function public.is_app_admin() to authenticated;
grant execute on function public.video_folder(text) to authenticated;

-- Nach dem ersten Login: Athlet:in hat das Startpasswort ersetzt
create or replace function public.athlete_password_changed() returns void
  language sql volatile security definer set search_path = public as $$
  update public.athlete_accounts set must_change_pw = false where user_id = auth.uid();
$$;

revoke all on function public.athlete_password_changed() from public, anon;
grant execute on function public.athlete_password_changed() to authenticated;

-- ─────────────────────────────── Bestehende Tabellen: Athlet:innen ausschliessen ───────────────────────────────

drop policy if exists "coaches readable by authenticated" on public.coaches;
create policy "coaches readable by authenticated" on public.coaches
  for select to authenticated using (not (select public.is_athlete()));

drop policy if exists "season_review_select" on public.season_review;
create policy "season_review_select" on public.season_review
  for select to authenticated using (not (select public.is_athlete()));

drop policy if exists "season_review_input_insert" on public.season_review_input;
create policy "season_review_input_insert" on public.season_review_input
  for insert to authenticated with check (not (select public.is_athlete()));
drop policy if exists "season_review_input_select" on public.season_review_input;
create policy "season_review_input_select" on public.season_review_input
  for select to authenticated using (not (select public.is_athlete()));
drop policy if exists "season_review_input_update" on public.season_review_input;
create policy "season_review_input_update" on public.season_review_input
  for update to authenticated using (not (select public.is_athlete())) with check (not (select public.is_athlete()));

drop policy if exists "season_review_input_log_insert" on public.season_review_input_log;
create policy "season_review_input_log_insert" on public.season_review_input_log
  for insert to authenticated with check (not (select public.is_athlete()));
drop policy if exists "season_review_input_log_select" on public.season_review_input_log;
create policy "season_review_input_log_select" on public.season_review_input_log
  for select to authenticated using (not (select public.is_athlete()));

drop policy if exists "selection_check_select" on public.selection_check;
create policy "selection_check_select" on public.selection_check
  for select to authenticated using (not (select public.is_athlete()));

drop policy if exists "session_reports for authenticated" on public.session_reports;
create policy "session_reports for authenticated" on public.session_reports
  for all to authenticated using (not (select public.is_athlete())) with check (not (select public.is_athlete()));

drop policy if exists "standort for authenticated" on public.standort;
create policy "standort for authenticated" on public.standort
  for all to authenticated using (not (select public.is_athlete())) with check (not (select public.is_athlete()));
drop policy if exists "standort own athlete read" on public.standort;
create policy "standort own athlete read" on public.standort
  for select to authenticated using (athlet = (select public.my_athlete()));

drop policy if exists "tricks for authenticated" on public.tricks;
create policy "tricks for authenticated" on public.tricks
  for all to authenticated using (not (select public.is_athlete())) with check (not (select public.is_athlete()));
drop policy if exists "tricks own athlete read" on public.tricks;
create policy "tricks own athlete read" on public.tricks
  for select to authenticated using (athlet = (select public.my_athlete()));

drop policy if exists "trick_comments for authenticated" on public.trick_comments;
create policy "trick_comments for authenticated" on public.trick_comments
  for all to authenticated using (not (select public.is_athlete())) with check (not (select public.is_athlete()));

drop policy if exists "trick_status readable by authenticated" on public.trick_status;
create policy "trick_status readable by authenticated" on public.trick_status
  for select to authenticated using (not (select public.is_athlete()));

drop policy if exists "trick_videos_insert" on storage.objects;
create policy "trick_videos_insert" on storage.objects
  for insert to authenticated with check (bucket_id = 'trick-videos' and not (select public.is_athlete()));
drop policy if exists "trick_videos_update" on storage.objects;
create policy "trick_videos_update" on storage.objects
  for update to authenticated using (bucket_id = 'trick-videos' and not (select public.is_athlete()));
drop policy if exists "trick_videos_delete" on storage.objects;
create policy "trick_videos_delete" on storage.objects
  for delete to authenticated using (bucket_id = 'trick-videos' and not (select public.is_athlete()));

-- ─────────────────────────────── Neue Tabellen: Policies ───────────────────────────────

drop policy if exists "app_admins own row" on public.app_admins;
create policy "app_admins own row" on public.app_admins
  for select to authenticated using (user_id = auth.uid());

drop policy if exists "athlete_accounts own or admin" on public.athlete_accounts;
create policy "athlete_accounts own or admin" on public.athlete_accounts
  for select to authenticated using (user_id = auth.uid() or (select public.is_app_admin()));

-- ─────────────────────────────── Startpasswort ───────────────────────────────
-- Wer in password_change_required steht, muss beim nächsten Öffnen der App ein eigenes Passwort setzen.
-- Neue Konten kommen per Trigger automatisch hinein; die App ruft danach password_changed() auf.

create table if not exists public.password_change_required (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.password_change_required enable row level security;
drop policy if exists "password_change_required own" on public.password_change_required;
create policy "password_change_required own" on public.password_change_required
  for select to authenticated using (user_id = auth.uid());

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

create or replace function public.password_changed() returns void
  language sql volatile security definer set search_path = public as $$
  delete from public.password_change_required where user_id = auth.uid();
  update public.athlete_accounts set must_change_pw = false where user_id = auth.uid();
$$;
revoke all on function public.password_changed() from public, anon;
grant execute on function public.password_changed() to authenticated;

create or replace function public.athlete_password_changed() returns void
  language sql volatile security definer set search_path = public as $$
  delete from public.password_change_required where user_id = auth.uid();
  update public.athlete_accounts set must_change_pw = false where user_id = auth.uid();
$$;

-- ─────────────────────────────── Videos für Athlet:innen (Reports) ───────────────────────────────
-- Eigener Ordner oder jedes Video, das in einer eigenen tricks-Zeile steht. Schreiben nur Coaches.

create or replace function public.is_my_trick_video(path text) returns boolean
  language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.tricks where video_path = path and athlet = public.my_athlete());
$$;
revoke all on function public.is_my_trick_video(text) from public, anon;
grant execute on function public.is_my_trick_video(text) to authenticated;
create index if not exists tricks_video_path_idx on public.tricks (video_path) where video_path is not null;

drop policy if exists "trick_videos_select" on storage.objects;
create policy "trick_videos_select" on storage.objects
  for select to authenticated using (
    bucket_id = 'trick-videos' and (
      not (select public.is_athlete())
      or (storage.foldername(name))[1] = public.video_folder((select public.my_athlete()))
      or public.is_my_trick_video(name)
    ));

-- ── Einmalig, am 16.11.2026 ausgeführt (nicht wiederholen) ──
-- password_change_required: bestehende Konten wurden NICHT markiert, nur neue Konten, die sich
-- noch nie angemeldet hatten (last_sign_in_at is null). app_admins: von Hand gepflegt, in beiden
-- Projekten dieselben Personen. Namen und Adressen stehen bewusst nicht im (öffentlichen) Repo.
