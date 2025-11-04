-- Migration 021: Message Search
-- Adds full-text search capability for messages

-- Add tsvector column for full-text search (generated automatically)
ALTER TABLE messages
ADD COLUMN IF NOT EXISTS content_tsv tsvector
GENERATED ALWAYS AS (to_tsvector('english', COALESCE(content, '') || ' ' || COALESCE(attachment_name, ''))) STORED;

-- Create GIN index for fast full-text search
CREATE INDEX IF NOT EXISTS idx_messages_content_search
ON messages USING GIN(content_tsv);

-- Add index for search within specific conversation
CREATE INDEX IF NOT EXISTS idx_messages_conv_search
ON messages(conversation_id, created_at DESC)
WHERE deleted_at IS NULL;

-- Comments
COMMENT ON COLUMN messages.content_tsv IS 'Full-text search vector for message content and attachment names';
