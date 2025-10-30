-- Migration 020: Group Chat Integration
-- Adds optional group chat functionality to community groups
-- Date: 2024-10-28

-- ============================================================================
-- ADD CONVERSATION LINK TO GROUPS
-- ============================================================================

-- Add conversation_id to groups table
ALTER TABLE groups
ADD COLUMN IF NOT EXISTS conversation_id INTEGER REFERENCES conversations(id) ON DELETE SET NULL;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_groups_conversation ON groups(conversation_id);

-- Add comment
COMMENT ON COLUMN groups.conversation_id IS 'Optional group chat conversation for members. Null if chat is disabled.';

-- ============================================================================
-- ADD GROUP LINK TO CONVERSATIONS
-- ============================================================================

-- Add group_id to conversations table for reverse lookup
ALTER TABLE conversations
ADD COLUMN IF NOT EXISTS group_id INTEGER REFERENCES groups(id) ON DELETE SET NULL;

-- Add index
CREATE INDEX IF NOT EXISTS idx_conversations_group ON conversations(group_id);

-- Add comment
COMMENT ON COLUMN conversations.group_id IS 'Associated group if this is a group-wide chat. Null for regular group chats and direct messages.';

-- ============================================================================
-- AUTOMATIC MEMBER SYNC TRIGGERS
-- ============================================================================

-- Function: Auto-add members to group chat when they join
CREATE OR REPLACE FUNCTION sync_group_chat_on_join()
RETURNS TRIGGER AS $$
DECLARE
  v_conversation_id INTEGER;
  v_chat_enabled BOOLEAN;
BEGIN
  -- Only process active members
  IF NEW.status = 'active' THEN
    -- Get group's conversation ID and chat enabled status
    SELECT
      conversation_id,
      COALESCE((settings->>'chat_enabled')::boolean, false)
    INTO v_conversation_id, v_chat_enabled
    FROM groups
    WHERE id = NEW.group_id;

    -- If group has chat enabled, add user to conversation
    IF v_conversation_id IS NOT NULL AND v_chat_enabled = true THEN
      INSERT INTO conversation_participants (conversation_id, user_id, role, joined_at)
      VALUES (v_conversation_id, NEW.user_id, 'member', CURRENT_TIMESTAMP)
      ON CONFLICT (conversation_id, user_id, left_at)
      WHERE left_at IS NULL
      DO NOTHING;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Call sync function when member joins
DROP TRIGGER IF EXISTS trigger_sync_group_chat_on_join ON group_memberships;
CREATE TRIGGER trigger_sync_group_chat_on_join
AFTER INSERT OR UPDATE ON group_memberships
FOR EACH ROW
WHEN (NEW.status = 'active')
EXECUTE FUNCTION sync_group_chat_on_join();

-- Function: Auto-remove members from group chat when they leave
CREATE OR REPLACE FUNCTION sync_group_chat_on_leave()
RETURNS TRIGGER AS $$
DECLARE
  v_conversation_id INTEGER;
BEGIN
  -- Only process when member becomes inactive
  IF OLD.status = 'active' AND NEW.status != 'active' THEN
    -- Get group's conversation ID
    SELECT conversation_id INTO v_conversation_id
    FROM groups
    WHERE id = NEW.group_id;

    -- If group has a chat, mark participant as left
    IF v_conversation_id IS NOT NULL THEN
      UPDATE conversation_participants
      SET left_at = CURRENT_TIMESTAMP
      WHERE conversation_id = v_conversation_id
        AND user_id = NEW.user_id
        AND left_at IS NULL;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Call sync function when member leaves
DROP TRIGGER IF EXISTS trigger_sync_group_chat_on_leave ON group_memberships;
CREATE TRIGGER trigger_sync_group_chat_on_leave
AFTER UPDATE ON group_memberships
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status)
EXECUTE FUNCTION sync_group_chat_on_leave();

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function: Get group chat for a user (checks membership)
CREATE OR REPLACE FUNCTION get_group_chat(p_group_id INTEGER, p_user_id INTEGER)
RETURNS TABLE (
  conversation_id INTEGER,
  is_member BOOLEAN,
  chat_enabled BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    g.conversation_id,
    EXISTS (
      SELECT 1 FROM group_memberships gm
      WHERE gm.group_id = p_group_id
        AND gm.user_id = p_user_id
        AND gm.status = 'active'
    ) as is_member,
    COALESCE((g.settings->>'chat_enabled')::boolean, false) as chat_enabled
  FROM groups g
  WHERE g.id = p_group_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- DATA VALIDATION
-- ============================================================================

-- Ensure conversation type is 'group' when linked to a group
CREATE OR REPLACE FUNCTION validate_group_conversation()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.group_id IS NOT NULL THEN
    IF NEW.type != 'group' THEN
      RAISE EXCEPTION 'Group conversations must have type = group';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_validate_group_conversation ON conversations;
CREATE TRIGGER trigger_validate_group_conversation
BEFORE INSERT OR UPDATE ON conversations
FOR EACH ROW
WHEN (NEW.group_id IS NOT NULL)
EXECUTE FUNCTION validate_group_conversation();

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Migration 020: Group Chat Integration completed successfully';
  RAISE NOTICE 'Groups can now have optional group chats enabled by admins';
  RAISE NOTICE 'Members are automatically synced when joining/leaving groups';
END $$;
