-- Verlauf der Coach-Eingaben (Season review → Coach input): jede Speicherung eine Zeile, damit die Einträge mehrerer
-- Coaches sichtbar bleiben. Einmal pro Supabase-Projekt (Freeski und Snowboard) im SQL Editor ausführen.
-- Die App schreibt bei «Save» weiterhin den aktuellen Wert nach season_review_input und zusätzlich eine Zeile hierhin.
create table if not exists public.season_review_input_log (
  id          bigserial primary key,
  athlet      text not null,
  saison      text not null,
  feld        text not null,                 -- ziel | plan | fehlt | urteil:<runde>:<kriterium|kommentar>:<email>
  wert        text,
  von         text,                          -- E-Mail des Coaches
  created_at  timestamptz not null default now()
);
create index if not exists season_review_input_log_idx on public.season_review_input_log (athlet, saison, feld, created_at desc);

alter table public.season_review_input_log enable row level security;
drop policy if exists season_review_input_log_select on public.season_review_input_log;
create policy season_review_input_log_select on public.season_review_input_log for select to authenticated using (true);
drop policy if exists season_review_input_log_insert on public.season_review_input_log;
create policy season_review_input_log_insert on public.season_review_input_log for insert to authenticated with check (true);

-- bisherige Werte als ersten Verlaufseintrag übernehmen (nur einmal, bei leerer Tabelle)
insert into public.season_review_input_log (athlet, saison, feld, wert, von, created_at)
select athlet, saison, feld, wert, von, updated_at from public.season_review_input
where (feld in ('ziel', 'plan', 'fehlt') or feld like 'urteil:%') and coalesce(wert, '') <> ''
  and not exists (select 1 from public.season_review_input_log);
