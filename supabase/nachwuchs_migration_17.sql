-- Youth-App · Update 17: Selektions-Stichtag 15. April statt 30. April (Emilie 12.11.2026)
-- Swiss-Ski teilt die Selektion bis 30. April mit; der Stand im Trick Collector wird darum schon am 15. April eingefroren.
-- Erinnerungen an die Athlet:innen 14, 7 und 1 Tag vor dem Stichtag. Im Youth-Projekt einmal ausführen.
create or replace function public.remind_selection_deadline() returns void
language plpgsql security definer set search_path = public as $$
declare
  today date := (now() at time zone 'Europe/Zurich')::date;
  season_end int := case when extract(month from today) >= 8 then extract(year from today)::int + 1 else extract(year from today)::int end;
  deadline date := make_date(season_end, 4, 15);
  days int := deadline - today;
begin
  if days in (14, 7, 1) then
    insert into notifications (user_id, entry_id, kind, text)
    select p.id, null, 'reminder', 'deadline:' || days
    from profiles p where p.role = 'athlete' and p.user_id is not null;
  end if;
  if extract(month from today) = 5 and extract(day from today) = 31 then
    insert into notifications (user_id, entry_id, kind, text)
    select p.id, null, 'cleanup', 'cleanup'
    from profiles p where p.role = 'dvlp' and p.is_admin and p.user_id is not null;
  end if;
end $$;
