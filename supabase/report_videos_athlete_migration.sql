-- Freeski-App (Elite): Athlet:innen sehen im Reiter «Reports» ihre eigenen Session-Videos
-- NUR im Freeski-Projekt ausführen (nvibrxtqknkmsiccauzs). Setzt runcheck_athlete_migration.sql und
-- attempt_video_migration.sql voraus. Einmal ausführen: SQL Editor → New query → Run. Wiederholbar (idempotent).
--
-- Warum: Videos zu Versuchen lagen bis 14.11.2026 im Ordner des Kurznamens (z.B. «Max_M_»), die Policy
-- trick_videos_select erlaubte Athlet:innen aber nur den Ordner ihres vollen Namens. Neue Videos landen jetzt im
-- Ordner des vollen Namens (js/kern.js, sbAttPickVideo). Damit auch die älteren abspielbar sind, darf eine Athlet:in
-- zusätzlich jedes Video lesen, das in einer ihrer eigenen tricks-Zeilen steht. Schreiben bleibt Coaches vorbehalten.

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
