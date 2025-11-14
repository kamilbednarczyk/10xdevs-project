-- migration: add flashcards sorting indexes
-- description: adds composite indexes to optimize GET /api/flashcards endpoint with sorting
-- affected tables: public.flashcards
-- notes: 
--   - optimizes queries that list flashcards with sorting by created_at or updated_at
--   - complements existing idx_flashcards_user_due_date index
--   - improves performance for paginated list views

-- ==================================================================
-- 1. create composite index for user_id + created_at
-- ==================================================================
-- purpose: optimizes queries that list flashcards sorted by creation date
-- query pattern: "SELECT * FROM flashcards WHERE user_id = X ORDER BY created_at DESC/ASC"
create index if not exists idx_flashcards_user_created_at 
  on public.flashcards (user_id, created_at desc);

comment on index idx_flashcards_user_created_at is 'optimizes listing flashcards by user sorted by creation date (default sort)';

-- ==================================================================
-- 2. create composite index for user_id + updated_at
-- ==================================================================
-- purpose: optimizes queries that list flashcards sorted by last update date
-- query pattern: "SELECT * FROM flashcards WHERE user_id = X ORDER BY updated_at DESC/ASC"
create index if not exists idx_flashcards_user_updated_at 
  on public.flashcards (user_id, updated_at desc);

comment on index idx_flashcards_user_updated_at is 'optimizes listing flashcards by user sorted by last update date';

-- ==================================================================
-- migration complete
-- ==================================================================
-- summary:
--   - added idx_flashcards_user_created_at for sorting by creation date
--   - added idx_flashcards_user_updated_at for sorting by last update
--   - both indexes use DESC order as it's the default sort direction
--   - existing idx_flashcards_user_due_date already handles due_date sorting

