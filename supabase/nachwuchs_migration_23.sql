-- Update 23: mehrere Coaches können den gleichen Trick bewerten.
-- Jede Coach-Bewertung liegt einzeln in entry_reviews (mit Namen sichtbar für Coaches und Athlet:in).
-- entries.crit / score / review_note / reviewed_by / reviewed_at bleiben das Gesamtergebnis, damit
-- Fortschritt, Skills-Check, Abzeichen, Selektion und Auswertungen unverändert weiterlaufen:
--   score       = Durchschnitt der Coach-Punkte, gerundet
--   crit        = pro Kriterium erfüllt, wenn die Mehrheit der Coaches es erfüllt gibt (Patt = nicht erfüllt)
--   reviewed_by = zuletzt bewertender Coach, reviewed_at = Zeitpunkt der letzten Bewertung
--   review_note = Feedback der letzten Bewertung (alle Einzel-Feedbacks stehen in entry_reviews)

create table if not exists public.entry_reviews (
  entry_id    uuid not null references public.entries(id) on delete cascade,
  coach_id    uuid not null references public.profiles(id) on delete cascade,
  coach_name  text,   -- Name zum Zeitpunkt der Bewertung: Athlet:innen dürfen Coach-Profile nicht lesen
  crit        jsonb not null,
  score       smallint not null,
  review_note text,
  reviewed_at timestamptz not null default now(),
  primary key (entry_id, coach_id)
);
create index if not exists entry_reviews_coach_idx on public.entry_reviews (coach_id);

alter table public.entry_reviews enable row level security;
grant select, insert, update, delete on public.entry_reviews to authenticated;
revoke all on public.entry_reviews from anon;

drop policy if exists entry_reviews_select on public.entry_reviews;
create policy entry_reviews_select on public.entry_reviews for select
  using (public.can_see_athlete((select e.athlete_id from public.entries e where e.id = entry_id)));

-- Coaches und DVLP schreiben nur ihre eigene Bewertung, und nur für Athlet:innen, die sie sehen
drop policy if exists entry_reviews_insert on public.entry_reviews;
create policy entry_reviews_insert on public.entry_reviews for insert
  with check (coach_id = public.my_profile_id()
    and public.my_role() in ('coach', 'dvlp')
    and public.can_see_athlete((select e.athlete_id from public.entries e where e.id = entry_id)));

drop policy if exists entry_reviews_update on public.entry_reviews;
create policy entry_reviews_update on public.entry_reviews for update
  using (coach_id = public.my_profile_id())
  with check (coach_id = public.my_profile_id()
    and public.my_role() in ('coach', 'dvlp')
    and public.can_see_athlete((select e.athlete_id from public.entries e where e.id = entry_id)));

drop policy if exists entry_reviews_delete on public.entry_reviews;
create policy entry_reviews_delete on public.entry_reviews for delete
  using (coach_id = public.my_profile_id() or public.is_admin());

-- Coach-Name und Zeitpunkt setzt die Datenbank, nicht die App
create or replace function public.entry_reviews_fill()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  select name into new.coach_name from profiles where id = new.coach_id;
  new.reviewed_at := now();
  return new;
end $$;

drop trigger if exists entry_reviews_fill on public.entry_reviews;
create trigger entry_reviews_fill before insert or update on public.entry_reviews
  for each row execute function public.entry_reviews_fill();

-- Gesamtergebnis in entries nachführen, sobald sich eine Einzelbewertung ändert
create or replace function public.entry_reviews_aggregate()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  eid uuid := coalesce(new.entry_id, old.entry_id);
  n int; avg_score numeric; agg jsonb; last_r entry_reviews%rowtype;
begin
  select count(*), avg(score) into n, avg_score from entry_reviews where entry_id = eid;
  if n = 0 then return null; end if;   -- letzte Bewertung entfernt: Eintrag bleibt, wie er ist
  select coalesce(jsonb_object_agg(k, (yes * 2 > cnt)), '{}'::jsonb) into agg from (
    select kv.key as k, count(*) filter (where kv.value = 'true'::jsonb) as yes, count(*) as cnt
    from entry_reviews r cross join lateral jsonb_each(r.crit) kv
    where r.entry_id = eid group by kv.key) s;
  select * into last_r from entry_reviews where entry_id = eid order by reviewed_at desc limit 1;
  update entries set status = 'reviewed', crit = agg, score = round(avg_score)::smallint,
         review_note = last_r.review_note, reviewed_by = last_r.coach_id, reviewed_at = last_r.reviewed_at
   where id = eid;
  return null;
end $$;

drop trigger if exists entry_reviews_aggregate on public.entry_reviews;
create trigger entry_reviews_aggregate after insert or update or delete on public.entry_reviews
  for each row execute function public.entry_reviews_aggregate();

-- Neues Video verlangt, Trick geändert oder Bewertung zurückgesetzt: Einzelbewertungen gelten nicht mehr
create or replace function public.entry_reviews_reset()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if old.status = 'reviewed' and (new.status <> 'reviewed' or new.crit is null) then
    delete from entry_reviews where entry_id = new.id;
  end if;
  return null;
end $$;

drop trigger if exists entries_reviews_reset on public.entries;
create trigger entries_reviews_reset after update on public.entries
  for each row execute function public.entry_reviews_reset();

-- Mitteilung an die Athlet:in auch dann, wenn ein weiterer Coach bewertet und der Durchschnitt gleich bleibt
create or replace function public.notify_entry()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  ath profiles%rowtype;
  me uuid := public.my_profile_id();
begin
  select * into ath from profiles where id = new.athlete_id;
  if new.status = 'pending' and (tg_op = 'INSERT' or old.status is distinct from 'pending') then
    insert into notifications (user_id, entry_id, kind, text)
      select c.id, new.id, 'submitted', ath.name || ': ' || new.label
      from profiles c
      where c.role = 'coach' and c.group_id is not null and c.group_id = ath.group_id
        and c.id is distinct from me;
  elsif new.status = 'reviewed'
        and (tg_op = 'INSERT' or old.status is distinct from 'reviewed' or old.score is distinct from new.score
             or old.reviewed_at is distinct from new.reviewed_at)
        and new.athlete_id is distinct from me then
    insert into notifications (user_id, entry_id, kind, text)
      values (new.athlete_id, new.id, 'reviewed',
              'Rated ' || new.score || '/' || (case when new.discipline = 'Halfpipe' then 5 else 4 end) || ': ' || new.label);
  elsif tg_op = 'UPDATE' and new.status = 'rework' and old.status is distinct from 'rework' then
    insert into notifications (user_id, entry_id, kind, text)
      values (new.athlete_id, new.id, 'rework', 'New video requested: ' || new.label);
  end if;
  return new;
end $$;

-- Bestehende Bewertungen übernehmen: die bisherige Bewertung wird die erste Einzelbewertung
-- (ohne Trigger, damit entries und Mitteilungen unverändert bleiben)
alter table public.entry_reviews disable trigger entry_reviews_aggregate;
alter table public.entry_reviews disable trigger entry_reviews_fill;
insert into public.entry_reviews (entry_id, coach_id, coach_name, crit, score, review_note, reviewed_at)
select e.id, e.reviewed_by, p.name, e.crit, e.score, e.review_note, coalesce(e.reviewed_at, e.updated_at, e.created_at)
from public.entries e
join public.profiles p on p.id = e.reviewed_by and p.role in ('coach', 'dvlp')
where e.status = 'reviewed' and e.crit is not null and e.score is not null
on conflict (entry_id, coach_id) do nothing;
alter table public.entry_reviews enable trigger entry_reviews_aggregate;
alter table public.entry_reviews enable trigger entry_reviews_fill;
