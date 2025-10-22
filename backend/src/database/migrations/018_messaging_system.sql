-- Migration 018: Messaging System
-- Creates tables for direct messaging and group conversations

-- ============================================================================
-- CONVERSATIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS conversations (
    id SERIAL PRIMARY KEY,
    type VARCHAR(20) NOT NULL CHECK (type IN ('direct', 'group')),
    title VARCHAR(255), -- for group conversations
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, -- last message time
    last_message_id INTEGER -- will be FK to messages
);

CREATE INDEX idx_conversations_type ON conversations(type);
CREATE INDEX idx_conversations_created_by ON conversations(created_by);
CREATE INDEX idx_conversations_updated_at ON conversations(updated_at DESC);

-- ============================================================================
-- CONVERSATION PARTICIPANTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS conversation_participants (
    id SERIAL PRIMARY KEY,
    conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    left_at TIMESTAMP, -- NULL if still active
    role VARCHAR(20) DEFAULT 'member' CHECK (role IN ('admin', 'member')),
    muted BOOLEAN DEFAULT FALSE,
    archived BOOLEAN DEFAULT FALSE,
    last_read_at TIMESTAMP, -- track when user last read messages
    UNIQUE(conversation_id, user_id, left_at) -- allow rejoining after leaving
);

CREATE INDEX idx_conversation_participants_conversation ON conversation_participants(conversation_id);
CREATE INDEX idx_conversation_participants_user ON conversation_participants(user_id);
CREATE INDEX idx_conversation_participants_active ON conversation_participants(user_id, left_at) WHERE left_at IS NULL;

-- ============================================================================
-- MESSAGES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS messages (
    id SERIAL PRIMARY KEY,
    conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id INTEGER NOT NULL REFERENCES users(id) ON DELETE SET NULL,
    content TEXT,
    message_type VARCHAR(20) DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'file', 'system')),
    attachment_url VARCHAR(500),
    attachment_type VARCHAR(100), -- mime type
    attachment_size INTEGER, -- file size in bytes
    attachment_name VARCHAR(255), -- original filename
    reply_to_id INTEGER REFERENCES messages(id) ON DELETE SET NULL,
    edited_at TIMESTAMP,
    deleted_at TIMESTAMP, -- soft delete
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_messages_conversation ON messages(conversation_id, created_at DESC);
CREATE INDEX idx_messages_sender ON messages(sender_id);
CREATE INDEX idx_messages_reply_to ON messages(reply_to_id);
CREATE INDEX idx_messages_not_deleted ON messages(conversation_id) WHERE deleted_at IS NULL;

-- Add foreign key for last_message_id now that messages table exists
ALTER TABLE conversations
    ADD CONSTRAINT fk_conversations_last_message
    FOREIGN KEY (last_message_id) REFERENCES messages(id) ON DELETE SET NULL;

-- ============================================================================
-- MESSAGE READS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS message_reads (
    id SERIAL PRIMARY KEY,
    message_id INTEGER NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    read_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(message_id, user_id)
);

CREATE INDEX idx_message_reads_message ON message_reads(message_id);
CREATE INDEX idx_message_reads_user ON message_reads(user_id);

-- ============================================================================
-- TYPING INDICATORS TABLE (optional - could use Redis instead)
-- ============================================================================

CREATE TABLE IF NOT EXISTS typing_indicators (
    id SERIAL PRIMARY KEY,
    conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP DEFAULT (CURRENT_TIMESTAMP + INTERVAL '10 seconds'),
    UNIQUE(conversation_id, user_id)
);

CREATE INDEX idx_typing_indicators_conversation ON typing_indicators(conversation_id);
CREATE INDEX idx_typing_indicators_expires ON typing_indicators(expires_at);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Trigger to update conversation.updated_at when a new message is added
CREATE OR REPLACE FUNCTION update_conversation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE conversations
    SET updated_at = NEW.created_at,
        last_message_id = NEW.id
    WHERE id = NEW.conversation_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_conversation_timestamp
    AFTER INSERT ON messages
    FOR EACH ROW
    WHEN (NEW.deleted_at IS NULL)
    EXECUTE FUNCTION update_conversation_timestamp();

-- Trigger to update last_read_at when user reads messages
CREATE OR REPLACE FUNCTION update_participant_last_read()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE conversation_participants
    SET last_read_at = NEW.read_at
    WHERE conversation_id = (SELECT conversation_id FROM messages WHERE id = NEW.message_id)
      AND user_id = NEW.user_id
      AND (last_read_at IS NULL OR last_read_at < NEW.read_at);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_participant_last_read
    AFTER INSERT ON message_reads
    FOR EACH ROW
    EXECUTE FUNCTION update_participant_last_read();

-- Trigger to clean up expired typing indicators
CREATE OR REPLACE FUNCTION cleanup_expired_typing_indicators()
RETURNS void AS $$
BEGIN
    DELETE FROM typing_indicators WHERE expires_at < CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to get unread message count for a user in a conversation
CREATE OR REPLACE FUNCTION get_unread_count(p_conversation_id INTEGER, p_user_id INTEGER)
RETURNS INTEGER AS $$
DECLARE
    last_read TIMESTAMP;
    unread_count INTEGER;
BEGIN
    -- Get when user last read messages
    SELECT last_read_at INTO last_read
    FROM conversation_participants
    WHERE conversation_id = p_conversation_id AND user_id = p_user_id;

    -- Count messages after last read time
    SELECT COUNT(*) INTO unread_count
    FROM messages
    WHERE conversation_id = p_conversation_id
      AND sender_id != p_user_id
      AND deleted_at IS NULL
      AND (last_read IS NULL OR created_at > last_read);

    RETURN COALESCE(unread_count, 0);
END;
$$ LANGUAGE plpgsql;

-- Function to create a direct conversation between two users
CREATE OR REPLACE FUNCTION create_direct_conversation(
    p_user1_id INTEGER,
    p_user2_id INTEGER
)
RETURNS INTEGER AS $$
DECLARE
    existing_conv_id INTEGER;
    new_conv_id INTEGER;
BEGIN
    -- Check if direct conversation already exists
    SELECT c.id INTO existing_conv_id
    FROM conversations c
    INNER JOIN conversation_participants cp1 ON c.id = cp1.conversation_id
    INNER JOIN conversation_participants cp2 ON c.id = cp2.conversation_id
    WHERE c.type = 'direct'
      AND cp1.user_id = p_user1_id AND cp1.left_at IS NULL
      AND cp2.user_id = p_user2_id AND cp2.left_at IS NULL
      AND (SELECT COUNT(*) FROM conversation_participants WHERE conversation_id = c.id AND left_at IS NULL) = 2;

    IF existing_conv_id IS NOT NULL THEN
        RETURN existing_conv_id;
    END IF;

    -- Create new conversation
    INSERT INTO conversations (type, created_by)
    VALUES ('direct', p_user1_id)
    RETURNING id INTO new_conv_id;

    -- Add both participants
    INSERT INTO conversation_participants (conversation_id, user_id, role)
    VALUES
        (new_conv_id, p_user1_id, 'member'),
        (new_conv_id, p_user2_id, 'member');

    RETURN new_conv_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE conversations IS 'Stores conversation/chat threads';
COMMENT ON TABLE conversation_participants IS 'Maps users to conversations with their participation details';
COMMENT ON TABLE messages IS 'Stores individual messages within conversations';
COMMENT ON TABLE message_reads IS 'Tracks which messages have been read by which users';
COMMENT ON TABLE typing_indicators IS 'Tracks real-time typing indicators (consider using Redis in production)';

COMMENT ON COLUMN conversations.type IS 'Type of conversation: direct (1-on-1) or group';
COMMENT ON COLUMN conversations.last_message_id IS 'Most recent message for quick preview';
COMMENT ON COLUMN conversation_participants.left_at IS 'When user left conversation (NULL = still active)';
COMMENT ON COLUMN conversation_participants.last_read_at IS 'Last time user read messages in this conversation';
COMMENT ON COLUMN messages.deleted_at IS 'Soft delete timestamp - message content hidden but structure preserved';
COMMENT ON COLUMN messages.reply_to_id IS 'Reference to message being replied to';
