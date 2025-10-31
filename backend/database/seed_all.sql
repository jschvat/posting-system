-- ============================================================================
-- MASTER SEED SCRIPT - Load All Data
-- ============================================================================
-- Generated: 2025-10-31T15:47:39.490Z
--
-- This script loads all seed data in the correct order.
-- Alternatively, you can run individual seed files for specific data sections.
--
-- Usage:
--   psql -U <user> -d <database> -f seed_all.sql
--
-- Or load individual sections:
--   psql -U <user> -d <database> -f seeds/01_users.sql
--   psql -U <user> -d <database> -f seeds/02_follows.sql
--   psql -U <user> -d <database> -f seeds/03_posts.sql
--   psql -U <user> -d <database> -f seeds/04_groups.sql
--   psql -U <user> -d <database> -f seeds/05_messaging.sql
--   psql -U <user> -d <database> -f seeds/06_notifications.sql
--   psql -U <user> -d <database> -f seeds/07_ratings.sql
-- ============================================================================

\i seeds/01_users.sql
\i seeds/02_follows.sql
\i seeds/03_posts.sql
\i seeds/04_groups.sql
\i seeds/05_messaging.sql
\i seeds/06_notifications.sql
\i seeds/07_ratings.sql
