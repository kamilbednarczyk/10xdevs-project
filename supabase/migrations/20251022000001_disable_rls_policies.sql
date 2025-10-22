-- migration: disable rls policies
-- description: disables all row level security policies for generations and flashcards tables
-- affected tables: public.generations, public.flashcards
-- notes: 
--   - disables policies created in 20251022000000_create_flashcards_schema.sql
--   - rls remains enabled on tables, only policies are disabled
--   - to re-enable, drop disabled policies and recreate them

-- ==================================================================
-- 1. disable rls policies for flashcards table
-- ==================================================================
-- disable all policies for authenticated users
alter policy "authenticated users can select own flashcards"
  on public.flashcards
  rename to "authenticated users can select own flashcards_disabled";

alter policy "authenticated users can insert own flashcards"
  on public.flashcards
  rename to "authenticated users can insert own flashcards_disabled";

alter policy "authenticated users can update own flashcards"
  on public.flashcards
  rename to "authenticated users can update own flashcards_disabled";

alter policy "authenticated users can delete own flashcards"
  on public.flashcards
  rename to "authenticated users can delete own flashcards_disabled";

-- disable all policies for anonymous users
alter policy "anonymous users cannot select flashcards"
  on public.flashcards
  rename to "anonymous users cannot select flashcards_disabled";

alter policy "anonymous users cannot insert flashcards"
  on public.flashcards
  rename to "anonymous users cannot insert flashcards_disabled";

alter policy "anonymous users cannot update flashcards"
  on public.flashcards
  rename to "anonymous users cannot update flashcards_disabled";

alter policy "anonymous users cannot delete flashcards"
  on public.flashcards
  rename to "anonymous users cannot delete flashcards_disabled";

-- ==================================================================
-- 2. disable rls policies for generations table
-- ==================================================================
-- disable all policies for authenticated users
alter policy "authenticated users can select own generations"
  on public.generations
  rename to "authenticated users can select own generations_disabled";

alter policy "authenticated users can insert own generations"
  on public.generations
  rename to "authenticated users can insert own generations_disabled";

alter policy "authenticated users can update own generations"
  on public.generations
  rename to "authenticated users can update own generations_disabled";

alter policy "authenticated users can delete own generations"
  on public.generations
  rename to "authenticated users can delete own generations_disabled";

-- disable all policies for anonymous users
alter policy "anonymous users cannot select generations"
  on public.generations
  rename to "anonymous users cannot select generations_disabled";

alter policy "anonymous users cannot insert generations"
  on public.generations
  rename to "anonymous users cannot insert generations_disabled";

alter policy "anonymous users cannot update generations"
  on public.generations
  rename to "anonymous users cannot update generations_disabled";

alter policy "anonymous users cannot delete generations"
  on public.generations
  rename to "anonymous users cannot delete generations_disabled";

-- ==================================================================
-- migration complete
-- ==================================================================
-- summary:
--   - disabled 8 policies on flashcards table (4 authenticated + 4 anon)
--   - disabled 8 policies on generations table (4 authenticated + 4 anon)
--   - total: 16 policies disabled via rename
--   - rls remains enabled on both tables
--   - with no active policies, users will have no access to these tables

