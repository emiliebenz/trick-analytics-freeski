-- Youth-App · Update 18: kein Video-Aufräumen mehr nach Stufenwechsel (Emilie 12.11.2026)
-- Videos bleiben, solange die Athlet:in im Nachwuchs aktiv ist; gelöscht wird nur, wenn sie mit dem Sport aufhört.
-- Darum keine Admin-Erinnerung «Video-Aufräumen» am 31. Mai mehr. Stichtag-Erinnerung (15. April) bleibt.
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
end $$;
