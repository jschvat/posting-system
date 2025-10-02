-- Migration: 002 - Follow and Share System
-- Description: Add tables for user follows, post shares, user stats, and timeline cache
-- Date: 2025-10-02

-- ============================================================================
-- FOLLOWS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS follows (
    id SERIAL PRIMARY KEY,
    follower_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    following_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'muted', 'blocked')),
    notifications_enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Constraints
    CONSTRAINT unique_follow UNIQUE (follower_id, following_id),
    CONSTRAINT no_self_follow CHECK (follower_id != following_id)
);

-- Indexes for follows table
CREATE INDEX IF NOT EXISTS idx_follows_follower_id ON follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_following_id ON follows(following_id);
CREATE INDEX IF NOT EXISTS idx_follows_status ON follows(status);
CREATE INDEX IF NOT EXISTS idx_follows_created_at ON follows(created_at);
CREATE INDEX IF NOT EXISTS idx_follows_composite ON follows(follower_id, following_id, status);

-- ============================================================================
-- SHARES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS shares (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    share_type VARCHAR(20) DEFAULT 'repost' CHECK (share_type IN ('repost', 'quote', 'external')),
    share_comment TEXT,
    visibility VARCHAR(20) DEFAULT 'public' CHECK (visibility IN ('public', 'friends', 'private')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- One share per user per post
    CONSTRAINT unique_user_share UNIQUE (user_id, post_id)
);

-- Indexes for shares table
CREATE INDEX IF NOT EXISTS idx_shares_user_id ON shares(user_id);
CREATE INDEX IF NOT EXISTS idx_shares_post_id ON shares(post_id);
CREATE INDEX IF NOT EXISTS idx_shares_type ON shares(share_type);
CREATE INDEX IF NOT EXISTS idx_shares_created_at ON shares(created_at);
CREATE INDEX IF NOT EXISTS idx_shares_composite ON shares(post_id, created_at DESC);

-- ============================================================================
-- USER STATS TABLE (Denormalized for Performance)
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_stats (
    user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    follower_count INTEGER DEFAULT 0,
    following_count INTEGER DEFAULT 0,
    post_count INTEGER DEFAULT 0,
    total_reactions_received INTEGER DEFAULT 0,
    total_shares_received INTEGER DEFAULT 0,
    total_comments_received INTEGER DEFAULT 0,
    engagement_score DECIMAL(10,2) DEFAULT 0,
    last_post_at TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for user_stats table
CREATE INDEX IF NOT EXISTS idx_user_stats_follower_count ON user_stats(follower_count DESC);
CREATE INDEX IF NOT EXISTS idx_user_stats_engagement_score ON user_stats(engagement_score DESC);
CREATE INDEX IF NOT EXISTS idx_user_stats_last_post_at ON user_stats(last_post_at DESC);

-- ============================================================================
-- TIMELINE CACHE TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS timeline_cache (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    score DECIMAL(10,2) NOT NULL DEFAULT 0,
    reason VARCHAR(50) NOT NULL, -- 'following', 'popular', 'shared', 'suggested'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP DEFAULT (CURRENT_TIMESTAMP + INTERVAL '7 days'),

    CONSTRAINT unique_user_post_timeline UNIQUE (user_id, post_id)
);

-- Indexes for timeline_cache table
CREATE INDEX IF NOT EXISTS idx_timeline_user_score ON timeline_cache(user_id, score DESC);
CREATE INDEX IF NOT EXISTS idx_timeline_user_created ON timeline_cache(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_timeline_post_id ON timeline_cache(post_id);
CREATE INDEX IF NOT EXISTS idx_timeline_expires_at ON timeline_cache(expires_at);
CREATE INDEX IF NOT EXISTS idx_timeline_reason ON timeline_cache(reason);

-- ============================================================================
-- TRIGGERS FOR AUTOMATIC STATS UPDATES
-- ============================================================================

-- Trigger for follows table updates
CREATE TRIGGER update_follows_updated_at BEFORE UPDATE ON follows
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- FUNCTIONS FOR STATS MANAGEMENT
-- ============================================================================

-- Function to update follower/following counts
CREATE OR REPLACE FUNCTION update_follow_counts()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        -- Increment following count for follower
        INSERT INTO user_stats (user_id, following_count)
        VALUES (NEW.follower_id, 1)
        ON CONFLICT (user_id) DO UPDATE
        SET following_count = user_stats.following_count + 1,
            updated_at = CURRENT_TIMESTAMP;

        -- Increment follower count for following
        INSERT INTO user_stats (user_id, follower_count)
        VALUES (NEW.following_id, 1)
        ON CONFLICT (user_id) DO UPDATE
        SET follower_count = user_stats.follower_count + 1,
            updated_at = CURRENT_TIMESTAMP;

    ELSIF (TG_OP = 'DELETE') THEN
        -- Decrement following count for follower
        UPDATE user_stats
        SET following_count = GREATEST(0, following_count - 1),
            updated_at = CURRENT_TIMESTAMP
        WHERE user_id = OLD.follower_id;

        -- Decrement follower count for following
        UPDATE user_stats
        SET follower_count = GREATEST(0, follower_count - 1),
            updated_at = CURRENT_TIMESTAMP
        WHERE user_id = OLD.following_id;
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update follow counts
CREATE TRIGGER trigger_update_follow_counts
AFTER INSERT OR DELETE ON follows
FOR EACH ROW EXECUTE FUNCTION update_follow_counts();

-- Function to update share counts
CREATE OR REPLACE FUNCTION update_share_counts()
RETURNS TRIGGER AS $$
DECLARE
    post_owner_id INTEGER;
BEGIN
    -- Get the post owner
    SELECT user_id INTO post_owner_id FROM posts WHERE id = NEW.post_id;

    IF (TG_OP = 'INSERT') THEN
        -- Increment share count for post owner
        UPDATE user_stats
        SET total_shares_received = total_shares_received + 1,
            updated_at = CURRENT_TIMESTAMP
        WHERE user_id = post_owner_id;

    ELSIF (TG_OP = 'DELETE') THEN
        -- Decrement share count for post owner
        UPDATE user_stats
        SET total_shares_received = GREATEST(0, total_shares_received - 1),
            updated_at = CURRENT_TIMESTAMP
        WHERE user_id = post_owner_id;
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update share counts
CREATE TRIGGER trigger_update_share_counts
AFTER INSERT OR DELETE ON shares
FOR EACH ROW EXECUTE FUNCTION update_share_counts();

-- Function to initialize user_stats for existing users
CREATE OR REPLACE FUNCTION initialize_user_stats()
RETURNS void AS $$
BEGIN
    INSERT INTO user_stats (user_id, post_count, last_post_at)
    SELECT
        u.id,
        COUNT(p.id),
        MAX(p.created_at)
    FROM users u
    LEFT JOIN posts p ON u.id = p.user_id
    WHERE NOT EXISTS (SELECT 1 FROM user_stats WHERE user_id = u.id)
    GROUP BY u.id;
END;
$$ LANGUAGE plpgsql;

-- Initialize stats for existing users
SELECT initialize_user_stats();

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE follows IS 'User follow relationships with status tracking';
COMMENT ON TABLE shares IS 'Post shares and reposts by users';
COMMENT ON TABLE user_stats IS 'Denormalized user statistics for performance';
COMMENT ON TABLE timeline_cache IS 'Pre-computed timeline entries with scoring';

COMMENT ON COLUMN follows.status IS 'active: normal follow, muted: following but notifications off, blocked: no longer following';
COMMENT ON COLUMN timeline_cache.score IS 'Calculated score (0-100) based on relevance algorithm';
COMMENT ON COLUMN timeline_cache.reason IS 'Why this post is in timeline: following, popular, shared, suggested';
COMMENT ON COLUMN timeline_cache.expires_at IS 'When this timeline entry should be removed';
