-- ════════════════════════════════════════════════════════════════════════
-- Youth-App · Update 16: Admins vs. DVLP (Emilie 12.11.2026)
-- Bisher durfte jede Person mit Rolle «dvlp» alles. Neu:
--   Admin (profiles.is_admin = true): wie bisher alles (Rollen, Gruppen, Profile, Konten/Passwörter, Löschen).
--   DVLP ohne Admin (Nachwuchsverantwortliche): sieht alle Athlet:innen und die Selektion (nur lesen),
--     darf Tricks bewerten und kommentieren, aber nichts löschen und keine Profile, Rollen, Gruppen,
--     Konten oder Passwörter ändern.
-- Wer Admin ist, wird NICHT hier gesetzt (keine Personendaten im öffentlichen Repo):
-- direkt danach im SQL Editor ausführen (Beispiel):
--   update public.profiles set is_admin = true where id = '<profil-id>';
-- Im Youth-Projekt einmal ausführen: SQL Editor → New query → Run. Darf mehrmals ausgeführt werden.
-- ════════════════════════════════════════════════════════════════════════

-- 1) Admin-Merkmal
alter table public.profiles add column if not exists is_admin boolean not null default false;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select role = 'dvlp' and is_admin from profiles where user_id = auth.uid()), false)
$$;

-- 2) Gruppen: nur Admins schreiben
drop policy if exists groups_write on public.groups;
create policy groups_write on public.groups for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- 3) Profile: Admins alles; Coaches wie bisher ihre Athlet:innen (der Trigger unten lässt ihnen nur den Fokus);
--    DVLP ohne Admin und Athlet:innen ändern keine Profile
drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles for update to authenticated using (
  public.is_admin()
  or (public.my_role() = 'coach' and role = 'athlete' and public.can_see_athlete(id))
) with check (
  public.is_admin()
  or (public.my_role() = 'coach' and role = 'athlete' and public.can_see_athlete(id))
);

drop policy if exists profiles_insert on public.profiles;
create policy profiles_insert on public.profiles for insert to authenticated with check (
  public.is_admin()
  or (public.my_role() = 'coach' and role = 'athlete' and public.in_my_groups(group_id))
);

create or replace function public.guard_profile_update() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not public.is_admin()
     and (new.role is distinct from old.role or new.group_id is distinct from old.group_id
          or new.user_id is distinct from old.user_id or new.extra_coach_ids is distinct from old.extra_coach_ids
          or new.name is distinct from old.name or new.gender is distinct from old.gender or new.level is distinct from old.level
          or new.username is distinct from old.username or new.is_admin is distinct from old.is_admin
          or new.email is distinct from old.email) then
    raise exception 'Only admins can change name, gender, level, role, group, login link, username, e-mail, admin flag or extra coaches';
  end if;
  return new;
end $$;

-- 4) Löschen: Admins, Coaches (eigene Athlet:innen) und Athlet:innen (eigene, noch nicht bewertete Einträge)
drop policy if exists entries_delete on public.entries;
create policy entries_delete on public.entries for delete to authenticated using (
  public.is_admin()
  or (public.my_role() = 'coach' and public.can_see_athlete(athlete_id))
  or (athlete_id = public.my_profile_id() and status <> 'reviewed')
);

drop policy if exists trick_comments_delete on public.trick_comments;
create policy trick_comments_delete on public.trick_comments for delete to authenticated
  using (created_by = public.my_profile_id() or public.is_admin());

drop policy if exists videos_delete on storage.objects;
create policy videos_delete on storage.objects for delete to authenticated using (
  bucket_id = 'skills-videos' and (
    ((storage.foldername(name))[1])::uuid = public.my_profile_id()
    or public.is_admin()
    or (public.my_role() = 'coach' and public.can_see_athlete(((storage.foldername(name))[1])::uuid))
  )
);

-- 5) Erinnerung Video-Aufräumen (31. Mai) nur an Admins
create or replace function public.remind_selection_deadline() returns void
language plpgsql security definer set search_path = public as $$
declare
  today date := (now() at time zone 'Europe/Zurich')::date;
  season_end int := case when extract(month from today) >= 8 then extract(year from today)::int + 1 else extract(year from today)::int end;
  deadline date := make_date(season_end, 4, 30);
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

-- Kontrolle: wer ist DVLP, wer Admin?
select name, role, is_admin, user_id is not null as has_login from public.profiles where role = 'dvlp' order by is_admin desc, name;
