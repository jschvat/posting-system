-- ============================================================================
-- SEED SCRIPT: User ratings and reports
-- ============================================================================
-- Generated: 2025-10-31T15:47:39.487Z
--
-- Tables included:
--   - user_ratings
--   - rating_reports
--   - helpful_marks
--
-- Usage:
--   psql -U <user> -d <database> -f 07_ratings.sql
--
-- Note: Run these scripts in numerical order (01, 02, 03, etc.)
-- ============================================================================

BEGIN;

-- Temporarily disable triggers for faster bulk insert
SET session_replication_role = 'replica';

-- No data for user_ratings
-- No data for rating_reports
-- No data for helpful_marks
-- Re-enable triggers
SET session_replication_role = 'origin';

COMMIT;

-- Analyze tables for query optimization
ANALYZE user_ratings;
ANALYZE rating_reports;
ANALYZE helpful_marks;
