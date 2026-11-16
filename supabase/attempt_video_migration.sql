-- Freeski- UND Snowboard-App: Sprung-Nummer, Protern-Clip und Video pro Versuch (Session Report)
-- In BEIDEN Supabase-Projekten (Freeski und Snowboard) je einmal ausführen: SQL Editor → New query → Run.
-- Reine Ergänzung: bestehende Zeilen bleiben unverändert (alle drei Spalten leer).
-- Der Bucket «trick-videos» und seine Policies kommen aus video_migration_fs_sb.sql.

-- Reihenfolge des Versuchs innerhalb der Session einer Athlet:in. Leer = Reihenfolge der Eingabe (created_at).
alter table public.tricks add column if not exists versuch_nr integer;
-- Verweis auf den Clip in Protern: wird seit 16.11.2026 nicht mehr genutzt (Feld aus der App entfernt), Spalte bleibt leer bestehen
alter table public.tricks add column if not exists clip_ref text;
-- Pfad des Videos im Bucket «trick-videos»
alter table public.tricks add column if not exists video_path text;
