-- Freeski-App (Elite): Run-Check und Logins für Athlet:innen
-- NUR im Freeski-Projekt ausführen (nvibrxtqknkmsiccauzs). Snowboard folgt später.
-- Einmal ausführen: SQL Editor → New query → Run. Die Datei ist wiederholbar (idempotent).
--
-- Was sich ändert:
-- 1. Neue Tabellen app_admins, athlete_accounts, run_checks.
-- 2. Alle bestehenden Policies («authenticated darf alles») gelten neu nur noch für Konten,
--    die KEINE Athlet:innen sind. Für die heutigen Coach-Konten ändert sich damit nichts.
-- 3. Athlet:innen dürfen nur ihr eigenes Assessment (standort, tricks) lesen, ihre Videos
--    abspielen und ihre eigenen Runs im Run-Check bearbeiten.
--
-- Wer Athlet:in ist, entscheidet allein die Tabelle athlete_accounts. Zeilen dort schreibt
-- nur die Edge Function «athlete-accounts» (Service Role), nie der Client.

-- ─────────────────────────────── Tabellen ───────────────────────────────

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

create table if not exists public.run_checks (
  id text primary key,                  -- ID aus der App (wie im bisherigen Run-Check)
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  athlet text not null,
  draft jsonb not null,                 -- Arbeitsstand: {name, event, disc, items, upd}
  pub jsonb,                            -- für Coaches gespeicherter Stand: {name, event, items, at}
  coach_note text,
  coach_ts timestamptz,
  coach_by text,
  deleted boolean not null default false,
  updated_at timestamptz not null default now()
);
create index if not exists run_checks_athlet_idx on public.run_checks (athlet);
create index if not exists run_checks_user_idx on public.run_checks (user_id);

alter table public.app_admins enable row level security;
alter table public.athlete_accounts enable row level security;
alter table public.run_checks enable row level security;

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

-- Videos: Coaches wie bisher, Athlet:innen nur lesen und nur im eigenen Ordner
drop policy if exists "trick_videos_select" on storage.objects;
create policy "trick_videos_select" on storage.objects
  for select to authenticated using (
    bucket_id = 'trick-videos' and (
      not (select public.is_athlete())
      or (storage.foldername(name))[1] = public.video_folder((select public.my_athlete()))
    ));
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

-- Run-Check: Athlet:innen verwalten ihre eigenen Runs
drop policy if exists "run_checks athlete own" on public.run_checks;
create policy "run_checks athlete own" on public.run_checks
  for all to authenticated
  using (user_id = auth.uid() and athlet = (select public.my_athlete()))
  with check (user_id = auth.uid() and athlet = (select public.my_athlete()));

-- Run-Check: Coaches sehen alle Runs und schreiben Feedback (Trigger unten schützt den Rest)
drop policy if exists "run_checks coach read" on public.run_checks;
create policy "run_checks coach read" on public.run_checks
  for select to authenticated using (not (select public.is_athlete()));
drop policy if exists "run_checks coach feedback" on public.run_checks;
create policy "run_checks coach feedback" on public.run_checks
  for update to authenticated using (not (select public.is_athlete())) with check (not (select public.is_athlete()));

-- Athlet:innen können kein Feedback schreiben, Coaches nur das Feedback ändern
create or replace function public.run_checks_guard() returns trigger
  language plpgsql security invoker set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    new.coach_note := null; new.coach_ts := null; new.coach_by := null;
  elsif public.is_athlete() then
    new.coach_note := old.coach_note; new.coach_ts := old.coach_ts; new.coach_by := old.coach_by;
  else
    new.id := old.id; new.user_id := old.user_id; new.athlet := old.athlet;
    new.draft := old.draft; new.pub := old.pub; new.deleted := old.deleted;
    new.coach_ts := now();
    new.coach_by := coalesce(auth.jwt() ->> 'email', new.coach_by);
  end if;
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists run_checks_guard on public.run_checks;
create trigger run_checks_guard before insert or update on public.run_checks
  for each row execute function public.run_checks_guard();
-- Nur als Trigger gedacht, nicht per RPC aufrufbar
revoke all on function public.run_checks_guard() from public, anon, authenticated;

-- ─────────────────────────────── Admin ───────────────────────────────

insert into public.app_admins (user_id)
  select id from auth.users where lower(email) = 'emilie.benz@swiss-ski.ch'
  on conflict do nothing;
