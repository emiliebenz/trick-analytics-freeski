-- Youth-App · Update 15: Athlet:innen melden sich mit Benutzername an (Emilie 2.11.2026)
-- Jede Athlet:in bekommt einen Benutzernamen (z.B. lena.muster). Supabase braucht intern eine E-Mail,
-- darum hat das Konto die Platzhalter-Adresse <benutzername>@login.trick-collector.invalid (erhält nie Mails).
-- Coaches und Admins bleiben bei ihrer E-Mail.
-- Im Youth-Projekt einmal ausführen: SQL Editor → New query → Run.

-- 1) Benutzername (eindeutig, Gross/Klein egal)
alter table public.profiles add column if not exists username text;
create unique index if not exists profiles_username_key on public.profiles (lower(username));

-- 2) Neues Konto verknüpfen: Athlet:innen über den Benutzernamen, alle anderen über die E-Mail
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update public.profiles set user_id = new.id
    where user_id is null and (
      (role <> 'athlete' and lower(email) = lower(new.email))
      or (role = 'athlete' and username is not null and lower(username) || '@login.trick-collector.invalid' = lower(new.email)));
  if not found then
    raise exception 'E-Mail % ist in der Youth-App nicht freigeschaltet', new.email;
  end if;
  return new;
end $$;

-- 3) Konto selbst per E-Mail aktivieren nur noch für Coaches und Admins
create or replace function public.can_register(p_email text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where lower(email) = lower(trim(p_email)) and user_id is null and role <> 'athlete')
$$;

-- 4) Benutzername dürfen nur Admins ändern
create or replace function public.guard_profile_update() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and coalesce(public.my_role(), '') <> 'dvlp'
     and (new.role is distinct from old.role or new.group_id is distinct from old.group_id
          or new.user_id is distinct from old.user_id or new.extra_coach_ids is distinct from old.extra_coach_ids
          or new.name is distinct from old.name or new.gender is distinct from old.gender or new.level is distinct from old.level
          or new.username is distinct from old.username) then
    raise exception 'Only admins can change name, gender, level, role, group, login link, username or extra coaches';
  end if;
  return new;
end $$;
