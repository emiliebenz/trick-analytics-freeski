-- Freeski- UND Snowboard-App: Season review und Selektionsstand im Monitoring (Athlet:innen-Ebene)
-- In BEIDEN Supabase-Projekten (Freeski und Snowboard) je einmal ausführen: SQL Editor → New query → Run.
--
-- Inhalte kommen aus der Wettkampf-Auswertung (skripte_coachdecks/season_review_export.py auf dem Mac) als eigenes SQL
-- pro Sportart. Sie liegen bewusst NICHT in diesem Repo, weil das Repo öffentlich ist.
-- Die App liest season_review und selection_check nur; schreiben tut sie nur in season_review_input (Coach-Eingaben)
-- und, über «Set as goal», in die bestehende Tabelle standort (Assessment).

-- 1) Season review: pro Athlet:in und ausgewerteter Saison ein JSON aus der Pipeline
create table if not exists public.season_review (
  athlet      text not null,                 -- Name wie in der App
  saison      text not null,                 -- ausgewertete Saison, z. B. 2025/26
  inhalt      jsonb not null,
  erzeugt_am  timestamptz not null default now(),
  primary key (athlet, saison)
);

-- 2) Selektionsstand: pro Athlet:in und Kaderjahr ein JSON (Prüfung der Selektionsrichtlinien gegen die FIS-Resultate)
create table if not exists public.selection_check (
  athlet       text not null,
  kader_saison text not null,                -- Kaderjahr, z. B. 2027/28
  inhalt       jsonb not null,
  erzeugt_am   timestamptz not null default now(),
  primary key (athlet, kader_saison)
);

-- 3) Coach-Eingaben: Ziel, Plan, was die Daten verpassen (saison = ausgewertete Saison), Powertest (saison = Kaderjahr)
create table if not exists public.season_review_input (
  athlet      text not null,
  saison      text not null,
  feld        text not null,                 -- ziel | plan | fehlt | powertest
  wert        text,
  von         text,                          -- E-Mail des Coaches, der zuletzt gespeichert hat
  updated_at  timestamptz not null default now(),
  primary key (athlet, saison, feld)
);

-- 4) Zugriff: nur eingeloggte Coaches (alle Konten dieser App sind Coach-/Staff-Konten)
alter table public.season_review enable row level security;
alter table public.selection_check enable row level security;
alter table public.season_review_input enable row level security;

drop policy if exists season_review_select on public.season_review;
create policy season_review_select on public.season_review for select to authenticated using (true);
drop policy if exists selection_check_select on public.selection_check;
create policy selection_check_select on public.selection_check for select to authenticated using (true);

drop policy if exists season_review_input_select on public.season_review_input;
create policy season_review_input_select on public.season_review_input for select to authenticated using (true);
drop policy if exists season_review_input_insert on public.season_review_input;
create policy season_review_input_insert on public.season_review_input for insert to authenticated with check (true);
drop policy if exists season_review_input_update on public.season_review_input;
create policy season_review_input_update on public.season_review_input for update to authenticated using (true) with check (true);
