-- migration: add generations pagination index
-- description: creates composite index on (user_id, created_at DESC) for optimal pagination performance
-- affected tables: public.generations
-- notes: 
--   - optimizes GET /api/generations endpoint which fetches paginated list sorted by created_at DESC
--   - this composite index supports both filtering by user_id and ordering by created_at
--   - the existing idx_generations_user_id index will remain for other query patterns

-- ==================================================================
-- 1. create composite index for pagination queries
-- ==================================================================
-- purpose: optimize paginated queries that fetch generation history for a user
-- query pattern: "SELECT * FROM generations WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?"
-- the DESC ordering in the index matches the query's ORDER BY clause for maximum efficiency
create index if not exists idx_generations_user_created_desc 
  on public.generations (user_id, created_at desc);

comment on index idx_generations_user_created_desc is 'optimizes paginated queries fetching generation history by user, ordered by creation date descending';

-- ==================================================================
-- migration complete
-- ==================================================================
-- summary:
--   - added composite index (user_id, created_at DESC) on generations table
--   - supports efficient pagination for GET /api/generations endpoint
--   - query planner can use this index for both filtering and sorting in one pass

