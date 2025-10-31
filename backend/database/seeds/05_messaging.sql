-- ============================================================================
-- SEED SCRIPT: Conversations and messages
-- ============================================================================
-- Generated: 2025-10-31T15:47:39.480Z
--
-- Tables included:
--   - conversations
--   - conversation_participants
--   - messages
--   - message_reads
--   - message_reactions
--   - typing_indicators
--
-- Usage:
--   psql -U <user> -d <database> -f 05_messaging.sql
--
-- Note: Run these scripts in numerical order (01, 02, 03, etc.)
-- ============================================================================

BEGIN;

-- Temporarily disable triggers for faster bulk insert
SET session_replication_role = 'replica';

-- Insert data into conversations (4 rows)
INSERT INTO conversations (id, type, title, created_by, created_at, updated_at, last_message_id, group_id)
VALUES
  (1, 'direct', NULL, 22, '"2025-10-28T11:28:35.636Z"', '"2025-10-28T11:28:35.636Z"', NULL, NULL),
  (2, 'direct', NULL, 22, '"2025-10-28T11:36:56.465Z"', '"2025-10-28T11:36:56.465Z"', NULL, NULL),
  (3, 'direct', NULL, 22, '"2025-10-28T11:36:56.465Z"', '"2025-10-28T11:36:56.465Z"', NULL, NULL),
  (4, 'group', 'Tech Community Chat', 30, '"2025-10-30T09:55:07.438Z"', '"2025-10-30T22:14:50.843Z"', 2, 6);
SELECT setval('conversations_id_seq', 4, true);

-- Insert data into conversation_participants (11 rows)
INSERT INTO conversation_participants (id, conversation_id, user_id, joined_at, left_at, role, muted, archived, last_read_at)
VALUES
  (1, 1, 22, '"2025-10-28T11:28:35.636Z"', NULL, 'member', FALSE, FALSE, NULL),
  (2, 1, 12, '"2025-10-28T11:28:35.636Z"', NULL, 'member', FALSE, FALSE, NULL),
  (3, 2, 22, '"2025-10-28T11:36:56.465Z"', NULL, 'member', FALSE, FALSE, NULL),
  (4, 2, 14, '"2025-10-28T11:36:56.465Z"', NULL, 'member', FALSE, FALSE, NULL),
  (5, 3, 22, '"2025-10-28T11:36:56.465Z"', NULL, 'member', FALSE, FALSE, NULL),
  (6, 3, 14, '"2025-10-28T11:36:56.465Z"', NULL, 'member', FALSE, FALSE, NULL),
  (7, 4, 30, '"2025-10-30T09:55:07.463Z"', NULL, 'member', FALSE, FALSE, NULL),
  (8, 4, 31, '"2025-10-30T09:55:07.468Z"', NULL, 'member', FALSE, FALSE, NULL),
  (9, 4, 32, '"2025-10-30T09:55:07.472Z"', NULL, 'member', FALSE, FALSE, NULL),
  (10, 4, 33, '"2025-10-30T09:55:07.475Z"', NULL, 'member', FALSE, FALSE, NULL),
  (11, 4, 39, '"2025-10-30T09:55:07.479Z"', NULL, 'member', FALSE, FALSE, NULL);
SELECT setval('conversation_participants_id_seq', 11, true);

-- Insert data into messages (2 rows)
INSERT INTO messages (id, conversation_id, sender_id, content, message_type, attachment_url, attachment_type, attachment_size, attachment_name, reply_to_id, edited_at, deleted_at, created_at)
VALUES
  (1, 4, 30, 'testing', 'text', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '"2025-10-30T22:09:29.908Z"'),
  (2, 4, 30, 'test message', 'text', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '"2025-10-30T22:14:50.843Z"');
SELECT setval('messages_id_seq', 2, true);

-- No data for message_reads
-- No data for message_reactions
-- No data for typing_indicators
-- Re-enable triggers
SET session_replication_role = 'origin';

COMMIT;

-- Analyze tables for query optimization
ANALYZE conversations;
ANALYZE conversation_participants;
ANALYZE messages;
ANALYZE message_reads;
ANALYZE message_reactions;
ANALYZE typing_indicators;
