-- Migration: 017 - Add Polls for Group Posts
-- Description: Add poll options and votes tables for group posts
-- Date: 2025-10-21
-- Requires: existing group_posts table

-- =====================================================
-- CREATE POLL OPTIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS poll_options (
    id SERIAL PRIMARY KEY,
    post_id INTEGER NOT NULL REFERENCES group_posts(id) ON DELETE CASCADE,
    option_text VARCHAR(200) NOT NULL,
    option_order INTEGER NOT NULL DEFAULT 0,
    vote_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT poll_options_unique UNIQUE(post_id, option_order)
);

-- =====================================================
-- CREATE POLL VOTES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS poll_votes (
    id SERIAL PRIMARY KEY,
    post_id INTEGER NOT NULL REFERENCES group_posts(id) ON DELETE CASCADE,
    option_id INTEGER NOT NULL REFERENCES poll_options(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT poll_votes_unique UNIQUE(post_id, user_id)
);

-- =====================================================
-- ADD POLL METADATA TO GROUP POSTS
-- =====================================================
ALTER TABLE group_posts ADD COLUMN IF NOT EXISTS poll_question VARCHAR(500);
ALTER TABLE group_posts ADD COLUMN IF NOT EXISTS poll_ends_at TIMESTAMP;
ALTER TABLE group_posts ADD COLUMN IF NOT EXISTS poll_allow_multiple BOOLEAN DEFAULT FALSE;
ALTER TABLE group_posts ADD COLUMN IF NOT EXISTS poll_total_votes INTEGER DEFAULT 0;

-- =====================================================
-- CREATE INDEXES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_poll_options_post ON poll_options(post_id);
CREATE INDEX IF NOT EXISTS idx_poll_votes_post ON poll_votes(post_id);
CREATE INDEX IF NOT EXISTS idx_poll_votes_user ON poll_votes(user_id);
CREATE INDEX IF NOT EXISTS idx_poll_votes_option ON poll_votes(option_id);
CREATE INDEX IF NOT EXISTS idx_group_posts_poll ON group_posts(post_type) WHERE post_type = 'poll';

-- =====================================================
-- CREATE TRIGGER TO UPDATE VOTE COUNTS
-- =====================================================
CREATE OR REPLACE FUNCTION update_poll_vote_counts()
RETURNS TRIGGER AS $$
BEGIN
    -- Update option vote count
    IF TG_OP = 'INSERT' THEN
        UPDATE poll_options
        SET vote_count = vote_count + 1
        WHERE id = NEW.option_id;

        UPDATE group_posts
        SET poll_total_votes = poll_total_votes + 1
        WHERE id = NEW.post_id;

    ELSIF TG_OP = 'DELETE' THEN
        UPDATE poll_options
        SET vote_count = vote_count - 1
        WHERE id = OLD.option_id;

        UPDATE group_posts
        SET poll_total_votes = poll_total_votes - 1
        WHERE id = OLD.post_id;

    ELSIF TG_OP = 'UPDATE' THEN
        -- Remove vote from old option
        UPDATE poll_options
        SET vote_count = vote_count - 1
        WHERE id = OLD.option_id;

        -- Add vote to new option
        UPDATE poll_options
        SET vote_count = vote_count + 1
        WHERE id = NEW.option_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_poll_vote_counts
    AFTER INSERT OR UPDATE OR DELETE ON poll_votes
    FOR EACH ROW
    EXECUTE FUNCTION update_poll_vote_counts();

-- =====================================================
-- ADD COMMENTS
-- =====================================================
COMMENT ON TABLE poll_options IS 'Poll options for group post polls';
COMMENT ON TABLE poll_votes IS 'User votes on poll options';
COMMENT ON COLUMN group_posts.poll_question IS 'Question text for poll posts';
COMMENT ON COLUMN group_posts.poll_ends_at IS 'When the poll closes (NULL = never)';
COMMENT ON COLUMN group_posts.poll_allow_multiple IS 'Allow users to vote for multiple options';
COMMENT ON COLUMN group_posts.poll_total_votes IS 'Total number of votes cast on this poll';
