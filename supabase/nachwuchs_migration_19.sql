-- Update 19: Nur Admin darf neue Athlet:innen-Profile anlegen (Coaches nicht mehr)
drop policy if exists profiles_insert on public.profiles;
create policy profiles_insert on public.profiles for insert to authenticated with check (
  public.is_admin()
);
