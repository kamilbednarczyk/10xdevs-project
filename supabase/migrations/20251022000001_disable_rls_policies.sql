-- migration: disable rls policies
-- description: drops all row level security policies and disables rls for generations and flashcards tables
-- affected tables: public.generations, public.flashcards
-- notes: 
--   - drops policies created in 20251022000000_create_flashcards_schema.sql
--   - disables rls entirely on both tables
--   - to re-enable, recreate policies and enable rls

-- ==================================================================
-- 1. drop rls policies for flashcards table
-- ==================================================================
drop policy if exists "authenticated users can select own flashcards" on public.flashcards;
drop policy if exists "authenticated users can insert own flashcards" on public.flashcards;
drop policy if exists "authenticated users can update own flashcards" on public.flashcards;
drop policy if exists "authenticated users can delete own flashcards" on public.flashcards;
drop policy if exists "anonymous users cannot select flashcards" on public.flashcards;
drop policy if exists "anonymous users cannot insert flashcards" on public.flashcards;
drop policy if exists "anonymous users cannot update flashcards" on public.flashcards;
drop policy if exists "anonymous users cannot delete flashcards" on public.flashcards;

-- ==================================================================
-- 2. drop rls policies for generations table
-- ==================================================================
drop policy if exists "authenticated users can select own generations" on public.generations;
drop policy if exists "authenticated users can insert own generations" on public.generations;
drop policy if exists "authenticated users can update own generations" on public.generations;
drop policy if exists "authenticated users can delete own generations" on public.generations;
drop policy if exists "anonymous users cannot select generations" on public.generations;
drop policy if exists "anonymous users cannot insert generations" on public.generations;
drop policy if exists "anonymous users cannot update generations" on public.generations;
drop policy if exists "anonymous users cannot delete generations" on public.generations;

-- ==================================================================
-- 3. disable rls entirely on both tables
-- ==================================================================
alter table public.flashcards disable row level security;
alter table public.generations disable row level security;

-- ==================================================================
-- migration complete
-- ==================================================================
-- summary:
--   - dropped 8 policies on flashcards table (4 authenticated + 4 anon)
--   - dropped 8 policies on generations table (4 authenticated + 4 anon)
--   - disabled rls on both tables
--   - total: 16 policies removed, rls fully disabled

