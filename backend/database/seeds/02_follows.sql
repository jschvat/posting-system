-- ============================================================================
-- SEED SCRIPT: Follow relationships between users
-- ============================================================================
-- Generated: 2025-10-31T15:47:39.453Z
--
-- Tables included:
--   - follows
--
-- Usage:
--   psql -U <user> -d <database> -f 02_follows.sql
--
-- Note: Run these scripts in numerical order (01, 02, 03, etc.)
-- ============================================================================

BEGIN;

-- Temporarily disable triggers for faster bulk insert
SET session_replication_role = 'replica';

-- Insert data into follows (1 rows)
INSERT INTO follows (id, follower_id, following_id, status, notifications_enabled, created_at, updated_at)
VALUES
  (7, 22, 14, 'active', TRUE, '"2025-10-03T22:26:42.811Z"', '"2025-10-03T22:26:42.811Z"');
SELECT setval('follows_id_seq', 7, true);

-- Re-enable triggers
SET session_replication_role = 'origin';

COMMIT;

-- Analyze tables for query optimization
ANALYZE follows;
