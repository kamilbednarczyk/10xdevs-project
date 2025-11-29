-- migration: enable rls policies
-- description: re-enables row level security and recreates policies
-- affected tables: public.generations, public.flashcards
-- notes:
--   - reverses 20251022000001_disable_rls_policies.sql
--   - restores the policies defined in 20251022000000_create_flashcards_schema.sql
--   - ensures authenticated users can only access their own data

-- ==================================================================
-- 1. enable row level security on both tables
-- ==================================================================
alter table public.flashcards enable row level security;
alter table public.generations enable row level security;

-- ==================================================================
-- 2. recreate rls policies for flashcards table
-- ==================================================================
-- policy: authenticated users can select their own flashcards
create policy "authenticated users can select own flashcards"
  on public.flashcards
  for select
  to authenticated
  using (auth.uid() = user_id);

-- policy: authenticated users can insert their own flashcards
create policy "authenticated users can insert own flashcards"
  on public.flashcards
  for insert
  to authenticated
  with check (auth.uid() = user_id);

-- policy: authenticated users can update their own flashcards
create policy "authenticated users can update own flashcards"
  on public.flashcards
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- policy: authenticated users can delete their own flashcards
create policy "authenticated users can delete own flashcards"
  on public.flashcards
  for delete
  to authenticated
  using (auth.uid() = user_id);

-- policy: anonymous users cannot select flashcards
create policy "anonymous users cannot select flashcards"
  on public.flashcards
  for select
  to anon
  using (false);

-- policy: anonymous users cannot insert flashcards
create policy "anonymous users cannot insert flashcards"
  on public.flashcards
  for insert
  to anon
  with check (false);

-- policy: anonymous users cannot update flashcards
create policy "anonymous users cannot update flashcards"
  on public.flashcards
  for update
  to anon
  using (false);

-- policy: anonymous users cannot delete flashcards
create policy "anonymous users cannot delete flashcards"
  on public.flashcards
  for delete
  to anon
  using (false);

-- ==================================================================
-- 3. recreate rls policies for generations table
-- ==================================================================
-- policy: authenticated users can select their own generations
create policy "authenticated users can select own generations"
  on public.generations
  for select
  to authenticated
  using (auth.uid() = user_id);

-- policy: authenticated users can insert their own generations
create policy "authenticated users can insert own generations"
  on public.generations
  for insert
  to authenticated
  with check (auth.uid() = user_id);

-- policy: authenticated users can update their own generations
create policy "authenticated users can update own generations"
  on public.generations
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- policy: authenticated users can delete their own generations
create policy "authenticated users can delete own generations"
  on public.generations
  for delete
  to authenticated
  using (auth.uid() = user_id);

-- policy: anonymous users cannot select generations
create policy "anonymous users cannot select generations"
  on public.generations
  for select
  to anon
  using (false);

-- policy: anonymous users cannot insert generations
create policy "anonymous users cannot insert generations"
  on public.generations
  for insert
  to anon
  with check (false);

-- policy: anonymous users cannot update generations
create policy "anonymous users cannot update generations"
  on public.generations
  for update
  to anon
  using (false);

-- policy: anonymous users cannot delete generations
create policy "anonymous users cannot delete generations"
  on public.generations
  for delete
  to anon
  using (false);

-- ==================================================================
-- migration complete
-- ==================================================================
-- summary:
--   - re-enabled rls on flashcards and generations
--   - restored 16 granular policies (4 per role per table)
--   - authenticated users can only access their own data
--   - anonymous users are explicitly denied access


