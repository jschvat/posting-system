-- ============================================================================
-- SEED SCRIPT: Notifications and preferences
-- ============================================================================
-- Generated: 2025-10-31T15:47:39.484Z
--
-- Tables included:
--   - notifications
--   - notification_preferences
--   - notification_batches
--
-- Usage:
--   psql -U <user> -d <database> -f 06_notifications.sql
--
-- Note: Run these scripts in numerical order (01, 02, 03, etc.)
-- ============================================================================

BEGIN;

-- Temporarily disable triggers for faster bulk insert
SET session_replication_role = 'replica';

-- No data for notifications
-- No data for notification_preferences
-- No data for notification_batches
-- Re-enable triggers
SET session_replication_role = 'origin';

COMMIT;

-- Analyze tables for query optimization
ANALYZE notifications;
ANALYZE notification_preferences;
ANALYZE notification_batches;
