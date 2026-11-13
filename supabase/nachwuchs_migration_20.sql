-- Youth-App · Update 20 (Emilie 13.11.2026)
-- Selektions-Stichtag neu 25. April (vorher 15. April).
-- JWM: Für U18 (Jahrgang Saison-Endjahr minus 18 und jünger, 2026/27 = 2009+) zählt der Stand am 31. Januar.
-- Nur Push-Erinnerung 14/7/1 Tage vorher, nichts wird gesperrt.
create or replace function public.remind_selection_deadline() returns void
language plpgsql security definer set search_path = public as $$
declare
  today date := (now() at time zone 'Europe/Zurich')::date;
  season_end int := case when extract(month from today) >= 8 then extract(year from today)::int + 1 else extract(year from today)::int end;
  days int := make_date(season_end, 4, 25) - today;
  jwm_days int := make_date(season_end, 1, 31) - today;
begin
  if days in (14, 7, 1) then
    insert into notifications (user_id, entry_id, kind, text)
    select p.id, null, 'reminder', 'deadline:' || days
    from profiles p where p.role = 'athlete' and p.user_id is not null;
  end if;
  if jwm_days in (14, 7, 1) then
    insert into notifications (user_id, entry_id, kind, text)
    select p.id, null, 'reminder', 'jwm:' || jwm_days
    from profiles p where p.role = 'athlete' and p.user_id is not null
      and p.birthdate is not null and extract(year from p.birthdate)::int >= season_end - 18;
  end if;
end $$;
