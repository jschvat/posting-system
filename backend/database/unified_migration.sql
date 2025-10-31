-- ============================================================================
-- UNIFIED DATABASE MIGRATION SCRIPT
-- ============================================================================
-- Description: Complete database schema for posting-system application
-- Generated: 2025-10-31T15:49:03.448Z
--
-- This script creates the entire database schema from scratch, including:
-- - Extensions
-- Enum types
-- - Tables (in dependency order)
-- - Indexes
-- - Functions and stored procedures
-- - Triggers
--
-- Usage:
--   psql -U <user> -d <database> -f unified_migration.sql
--
-- Note: This script is idempotent and can be run multiple times safely
-- ============================================================================

-- ============================================================================
-- SECTION 1: EXTENSIONS
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS ltree;


-- ============================================================================
-- MIGRATION: 001_initial_schema.sql
-- ============================================================================
-- Migration: 001 - Initial Schema
-- Description: Create base tables for social media platform
-- Date: 2025-10-02

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    bio TEXT,
    avatar_url VARCHAR(500),
    is_active BOOLEAN DEFAULT TRUE,
    email_verified BOOLEAN DEFAULT FALSE,
    email_verification_token VARCHAR(255),
    password_reset_token VARCHAR(255),
    password_reset_expires TIMESTAMP,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Posts table
CREATE TABLE IF NOT EXISTS posts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    privacy_level VARCHAR(20) DEFAULT 'public' CHECK (privacy_level IN ('public', 'friends', 'private')),
    is_published BOOLEAN DEFAULT TRUE,
    is_archived BOOLEAN DEFAULT FALSE,
    views_count INTEGER DEFAULT 0,
    scheduled_for TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Comments table
CREATE TABLE IF NOT EXISTS comments (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    parent_id INTEGER REFERENCES comments(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    is_published BOOLEAN DEFAULT TRUE,
    depth INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Media table
CREATE TABLE IF NOT EXISTS media (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    post_id INTEGER REFERENCES posts(id) ON DELETE CASCADE,
    comment_id INTEGER REFERENCES comments(id) ON DELETE CASCADE,
    filename VARCHAR(255) NOT NULL,
    original_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_url VARCHAR(500) NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    file_size INTEGER NOT NULL,
    media_type VARCHAR(20) NOT NULL CHECK (media_type IN ('image', 'video', 'audio', 'document')),
    width INTEGER,
    height INTEGER,
    duration INTEGER,
    alt_text VARCHAR(500),
    is_processed BOOLEAN DEFAULT FALSE,
    thumbnail_path VARCHAR(500),
    thumbnail_url VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT media_belongs_to_post_or_comment CHECK (
        (post_id IS NOT NULL AND comment_id IS NULL) OR
        (post_id IS NULL AND comment_id IS NOT NULL)
    )
);

-- Reactions table
CREATE TABLE IF NOT EXISTS reactions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    post_id INTEGER REFERENCES posts(id) ON DELETE CASCADE,
    comment_id INTEGER REFERENCES comments(id) ON DELETE CASCADE,
    emoji_name VARCHAR(50) NOT NULL,
    emoji_unicode VARCHAR(20) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT reaction_belongs_to_post_or_comment CHECK (
        (post_id IS NOT NULL AND comment_id IS NULL) OR
        (post_id IS NULL AND comment_id IS NOT NULL)
    ),
    CONSTRAINT unique_user_post_emoji UNIQUE (user_id, post_id, emoji_name),
    CONSTRAINT unique_user_comment_emoji UNIQUE (user_id, comment_id, emoji_name)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);

CREATE INDEX IF NOT EXISTS idx_posts_user_id ON posts(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_privacy_level ON posts(privacy_level);
CREATE INDEX IF NOT EXISTS idx_posts_published ON posts(is_published);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at);

CREATE INDEX IF NOT EXISTS idx_comments_user_id ON comments(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_post_id ON comments(post_id);
CREATE INDEX IF NOT EXISTS idx_comments_parent_id ON comments(parent_id);
CREATE INDEX IF NOT EXISTS idx_comments_created_at ON comments(created_at);

CREATE INDEX IF NOT EXISTS idx_media_user_id ON media(user_id);
CREATE INDEX IF NOT EXISTS idx_media_post_id ON media(post_id);
CREATE INDEX IF NOT EXISTS idx_media_comment_id ON media(comment_id);
CREATE INDEX IF NOT EXISTS idx_media_type ON media(media_type);

CREATE INDEX IF NOT EXISTS idx_reactions_user_id ON reactions(user_id);
CREATE INDEX IF NOT EXISTS idx_reactions_post_id ON reactions(post_id);
CREATE INDEX IF NOT EXISTS idx_reactions_comment_id ON reactions(comment_id);
CREATE INDEX IF NOT EXISTS idx_reactions_emoji_name ON reactions(emoji_name);

-- Triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_posts_updated_at BEFORE UPDATE ON posts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_comments_updated_at BEFORE UPDATE ON comments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_media_updated_at BEFORE UPDATE ON media
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reactions_updated_at BEFORE UPDATE ON reactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ============================================================================
-- MIGRATION: add_file_url_to_media.sql
-- ============================================================================
-- Migration: Add file_url column to media table if it doesn't exist
-- This ensures media records have a proper URL field for accessing files

-- Add file_url column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'media' AND column_name = 'file_url'
    ) THEN
        ALTER TABLE media ADD COLUMN file_url VARCHAR(500);

        -- Update existing records to generate file_url from file_path
        UPDATE media
        SET file_url = CONCAT('/uploads/', file_path)
        WHERE file_url IS NULL;

        -- Make file_url NOT NULL after populating existing records
        ALTER TABLE media ALTER COLUMN file_url SET NOT NULL;

        RAISE NOTICE 'Added file_url column to media table';
    ELSE
        RAISE NOTICE 'file_url column already exists';
    END IF;
END $$;


-- ============================================================================
-- MIGRATION: 002_follow_share_system.sql
-- ============================================================================
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
DROP TRIGGER IF EXISTS update_follows_updated_at ON follows;
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
DROP TRIGGER IF EXISTS trigger_update_follow_counts ON follows;
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
DROP TRIGGER IF EXISTS trigger_update_share_counts ON shares;
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


-- ============================================================================
-- MIGRATION: 003_comment_tracking_system.sql
-- ============================================================================
-- Migration: 003 - Comment Interaction Tracking System
-- Description: Add tables for tracking comment interactions and metrics
-- Date: 2025-10-03

-- ============================================================================
-- COMMENT INTERACTIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS comment_interactions (
    id SERIAL PRIMARY KEY,
    comment_id INTEGER NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
    interaction_type VARCHAR(50) NOT NULL CHECK (interaction_type IN ('view', 'reply', 'reaction', 'share', 'deep_read', 'quote')),
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    session_id VARCHAR(255),
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Indexes for comment_interactions table
CREATE INDEX IF NOT EXISTS idx_comment_interactions_comment_type ON comment_interactions(comment_id, interaction_type);
CREATE INDEX IF NOT EXISTS idx_comment_interactions_user_id ON comment_interactions(user_id);
CREATE INDEX IF NOT EXISTS idx_comment_interactions_session_id ON comment_interactions(session_id);
CREATE INDEX IF NOT EXISTS idx_comment_interactions_created_at ON comment_interactions(created_at);

-- ============================================================================
-- COMMENT METRICS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS comment_metrics (
    comment_id INTEGER PRIMARY KEY REFERENCES comments(id) ON DELETE CASCADE,
    view_count INTEGER DEFAULT 0,
    unique_view_count INTEGER DEFAULT 0,
    reply_count INTEGER DEFAULT 0,
    reaction_count INTEGER DEFAULT 0,
    share_count INTEGER DEFAULT 0,
    deep_read_count INTEGER DEFAULT 0,
    total_interaction_count INTEGER DEFAULT 0,
    recency_score DOUBLE PRECISION DEFAULT 0.0,
    interaction_rate DOUBLE PRECISION DEFAULT 0.0,
    engagement_score DOUBLE PRECISION DEFAULT 0.0,
    combined_algorithm_score DOUBLE PRECISION DEFAULT 0.0,
    first_interaction_at TIMESTAMP,
    last_interaction_at TIMESTAMP,
    peak_interaction_period TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    last_updated TIMESTAMP DEFAULT NOW()
);

-- Indexes for comment_metrics table
CREATE INDEX IF NOT EXISTS idx_comment_metrics_algorithm_score ON comment_metrics(combined_algorithm_score DESC);
CREATE INDEX IF NOT EXISTS idx_comment_metrics_interaction_rate ON comment_metrics(interaction_rate DESC);
CREATE INDEX IF NOT EXISTS idx_comment_metrics_last_interaction ON comment_metrics(last_interaction_at DESC);

-- ============================================================================
-- TRIGGER FUNCTION FOR COMMENT METRICS
-- ============================================================================

-- Function to update comment metrics based on interactions
CREATE OR REPLACE FUNCTION update_comment_metrics()
RETURNS TRIGGER AS $$
BEGIN
    -- Upsert comment_metrics record
    INSERT INTO comment_metrics (
        comment_id,
        view_count,
        unique_view_count,
        reply_count,
        reaction_count,
        share_count,
        deep_read_count,
        total_interaction_count,
        first_interaction_at,
        last_interaction_at
    )
    VALUES (
        NEW.comment_id,
        CASE WHEN NEW.interaction_type = 'view' THEN 1 ELSE 0 END,
        0, -- Will be calculated separately
        CASE WHEN NEW.interaction_type = 'reply' THEN 1 ELSE 0 END,
        CASE WHEN NEW.interaction_type = 'reaction' THEN 1 ELSE 0 END,
        CASE WHEN NEW.interaction_type = 'share' THEN 1 ELSE 0 END,
        CASE WHEN NEW.interaction_type = 'deep_read' THEN 1 ELSE 0 END,
        1,
        NEW.created_at,
        NEW.created_at
    )
    ON CONFLICT (comment_id) DO UPDATE
    SET
        view_count = comment_metrics.view_count + CASE WHEN NEW.interaction_type = 'view' THEN 1 ELSE 0 END,
        reply_count = comment_metrics.reply_count + CASE WHEN NEW.interaction_type = 'reply' THEN 1 ELSE 0 END,
        reaction_count = comment_metrics.reaction_count + CASE WHEN NEW.interaction_type = 'reaction' THEN 1 ELSE 0 END,
        share_count = comment_metrics.share_count + CASE WHEN NEW.interaction_type = 'share' THEN 1 ELSE 0 END,
        deep_read_count = comment_metrics.deep_read_count + CASE WHEN NEW.interaction_type = 'deep_read' THEN 1 ELSE 0 END,
        total_interaction_count = comment_metrics.total_interaction_count + 1,
        last_interaction_at = NEW.created_at,
        last_updated = NOW();

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update comment metrics on interaction
DROP TRIGGER IF EXISTS comment_interaction_metrics_trigger ON comment_interactions;
CREATE TRIGGER comment_interaction_metrics_trigger
AFTER INSERT ON comment_interactions
FOR EACH ROW EXECUTE FUNCTION update_comment_metrics();

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE comment_interactions IS 'Tracks all interactions with comments (views, replies, reactions, etc)';
COMMENT ON TABLE comment_metrics IS 'Aggregated metrics and scores for comment engagement';
COMMENT ON COLUMN comment_interactions.interaction_type IS 'Type of interaction: view, reply, reaction, share, deep_read, quote';
COMMENT ON COLUMN comment_metrics.combined_algorithm_score IS 'Combined score for ranking comments by engagement and relevance';


-- ============================================================================
-- MIGRATION: 004_rating_reputation_system.sql
-- ============================================================================
-- Migration: 004 - Rating and Reputation System
-- Description: User rating and reputation system with trust metrics
-- Date: 2025-10-03

-- ============================================================================
-- USER RATINGS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_ratings (
    id SERIAL PRIMARY KEY,
    rater_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    rated_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    rating_type VARCHAR(50) NOT NULL CHECK (rating_type IN ('profile', 'post', 'comment', 'interaction')),
    rating_value INTEGER NOT NULL CHECK (rating_value >= 1 AND rating_value <= 5),
    context_type VARCHAR(50), -- 'post', 'comment', 'message', 'general'
    context_id INTEGER, -- ID of post/comment if applicable
    review_text TEXT,
    is_anonymous BOOLEAN DEFAULT FALSE,
    is_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Constraints
    CONSTRAINT unique_rating UNIQUE (rater_id, rated_user_id, context_type, context_id),
    CONSTRAINT no_self_rating CHECK (rater_id != rated_user_id)
);

-- Indexes for user_ratings
CREATE INDEX IF NOT EXISTS idx_user_ratings_rater ON user_ratings(rater_id);
CREATE INDEX IF NOT EXISTS idx_user_ratings_rated_user ON user_ratings(rated_user_id);
CREATE INDEX IF NOT EXISTS idx_user_ratings_type ON user_ratings(rating_type);
CREATE INDEX IF NOT EXISTS idx_user_ratings_created ON user_ratings(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_ratings_context ON user_ratings(context_type, context_id);

-- ============================================================================
-- USER REPUTATION TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_reputation (
    user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,

    -- Rating metrics
    total_ratings_received INTEGER DEFAULT 0,
    average_rating DECIMAL(3,2) DEFAULT 0.00,
    rating_distribution JSONB DEFAULT '{"1":0,"2":0,"3":0,"4":0,"5":0}'::jsonb,

    -- Reputation score (0-1000)
    reputation_score INTEGER DEFAULT 0,
    reputation_level VARCHAR(20) DEFAULT 'newcomer' CHECK (reputation_level IN ('newcomer', 'member', 'contributor', 'veteran', 'expert', 'legend')),

    -- Breakdown by category
    post_rating_avg DECIMAL(3,2) DEFAULT 0.00,
    comment_rating_avg DECIMAL(3,2) DEFAULT 0.00,
    interaction_rating_avg DECIMAL(3,2) DEFAULT 0.00,

    -- Trust metrics
    verified_ratings_count INTEGER DEFAULT 0,
    positive_ratings_count INTEGER DEFAULT 0,
    neutral_ratings_count INTEGER DEFAULT 0,
    negative_ratings_count INTEGER DEFAULT 0,

    -- Activity metrics
    helpful_count INTEGER DEFAULT 0,
    reported_count INTEGER DEFAULT 0,
    quality_posts_count INTEGER DEFAULT 0,
    quality_comments_count INTEGER DEFAULT 0,

    -- Badges and achievements
    badges JSONB DEFAULT '[]'::jsonb,
    achievements JSONB DEFAULT '[]'::jsonb,

    -- Timeline
    first_rating_at TIMESTAMP,
    last_rating_at TIMESTAMP,
    reputation_peak INTEGER DEFAULT 0,
    reputation_peak_at TIMESTAMP,

    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for user_reputation
CREATE INDEX IF NOT EXISTS idx_user_reputation_score ON user_reputation(reputation_score DESC);
CREATE INDEX IF NOT EXISTS idx_user_reputation_level ON user_reputation(reputation_level);
CREATE INDEX IF NOT EXISTS idx_user_reputation_avg_rating ON user_reputation(average_rating DESC);

-- ============================================================================
-- RATING REPORTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS rating_reports (
    id SERIAL PRIMARY KEY,
    rating_id INTEGER NOT NULL REFERENCES user_ratings(id) ON DELETE CASCADE,
    reporter_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    report_reason VARCHAR(50) NOT NULL CHECK (report_reason IN ('spam', 'inappropriate', 'fake', 'harassment', 'other')),
    report_details TEXT,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved', 'dismissed')),
    reviewed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMP,
    resolution_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for rating_reports
CREATE INDEX IF NOT EXISTS idx_rating_reports_rating ON rating_reports(rating_id);
CREATE INDEX IF NOT EXISTS idx_rating_reports_reporter ON rating_reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_rating_reports_status ON rating_reports(status);

-- ============================================================================
-- HELPFUL MARKS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS helpful_marks (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    target_type VARCHAR(20) NOT NULL CHECK (target_type IN ('post', 'comment', 'user')),
    target_id INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT unique_helpful_mark UNIQUE (user_id, target_type, target_id)
);

-- Indexes for helpful_marks
CREATE INDEX IF NOT EXISTS idx_helpful_marks_target ON helpful_marks(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_helpful_marks_user ON helpful_marks(user_id);

-- ============================================================================
-- TRIGGER FUNCTIONS
-- ============================================================================

-- Trigger to update user_ratings updated_at
DROP TRIGGER IF EXISTS update_user_ratings_updated_at ON user_ratings;
CREATE TRIGGER update_user_ratings_updated_at BEFORE UPDATE ON user_ratings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger to update user_reputation updated_at
DROP TRIGGER IF EXISTS update_user_reputation_updated_at ON user_reputation;
CREATE TRIGGER update_user_reputation_updated_at BEFORE UPDATE ON user_reputation
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to update user reputation when ratings change
CREATE OR REPLACE FUNCTION update_user_reputation()
RETURNS TRIGGER AS $$
DECLARE
    target_user_id INTEGER;
    avg_rating DECIMAL(3,2);
    total_count INTEGER;
    pos_count INTEGER;
    neu_count INTEGER;
    neg_count INTEGER;
    verified_count INTEGER;
    dist JSONB;
    post_avg DECIMAL(3,2);
    comment_avg DECIMAL(3,2);
    interaction_avg DECIMAL(3,2);
    first_rating TIMESTAMP;
BEGIN
    -- Determine which user's reputation to update
    IF (TG_OP = 'DELETE') THEN
        target_user_id := OLD.rated_user_id;
    ELSE
        target_user_id := NEW.rated_user_id;
    END IF;

    -- Calculate aggregated metrics
    SELECT
        COALESCE(AVG(rating_value), 0),
        COUNT(*),
        COUNT(*) FILTER (WHERE rating_value >= 4),
        COUNT(*) FILTER (WHERE rating_value = 3),
        COUNT(*) FILTER (WHERE rating_value <= 2),
        COUNT(*) FILTER (WHERE is_verified = true),
        jsonb_build_object(
            '1', COUNT(*) FILTER (WHERE rating_value = 1),
            '2', COUNT(*) FILTER (WHERE rating_value = 2),
            '3', COUNT(*) FILTER (WHERE rating_value = 3),
            '4', COUNT(*) FILTER (WHERE rating_value = 4),
            '5', COUNT(*) FILTER (WHERE rating_value = 5)
        ),
        MIN(created_at)
    INTO avg_rating, total_count, pos_count, neu_count, neg_count, verified_count, dist, first_rating
    FROM user_ratings
    WHERE rated_user_id = target_user_id;

    -- Calculate category averages
    SELECT COALESCE(AVG(rating_value), 0) INTO post_avg
    FROM user_ratings WHERE rated_user_id = target_user_id AND rating_type = 'post';

    SELECT COALESCE(AVG(rating_value), 0) INTO comment_avg
    FROM user_ratings WHERE rated_user_id = target_user_id AND rating_type = 'comment';

    SELECT COALESCE(AVG(rating_value), 0) INTO interaction_avg
    FROM user_ratings WHERE rated_user_id = target_user_id AND rating_type = 'interaction';

    -- Upsert reputation record
    INSERT INTO user_reputation (
        user_id,
        total_ratings_received,
        average_rating,
        rating_distribution,
        positive_ratings_count,
        neutral_ratings_count,
        negative_ratings_count,
        verified_ratings_count,
        post_rating_avg,
        comment_rating_avg,
        interaction_rating_avg,
        first_rating_at,
        last_rating_at
    ) VALUES (
        target_user_id,
        total_count,
        avg_rating,
        dist,
        pos_count,
        neu_count,
        neg_count,
        verified_count,
        post_avg,
        comment_avg,
        interaction_avg,
        first_rating,
        CURRENT_TIMESTAMP
    )
    ON CONFLICT (user_id) DO UPDATE SET
        total_ratings_received = total_count,
        average_rating = avg_rating,
        rating_distribution = dist,
        positive_ratings_count = pos_count,
        neutral_ratings_count = neu_count,
        negative_ratings_count = neg_count,
        verified_ratings_count = verified_count,
        post_rating_avg = post_avg,
        comment_rating_avg = comment_avg,
        interaction_rating_avg = interaction_avg,
        first_rating_at = COALESCE(user_reputation.first_rating_at, first_rating),
        last_rating_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update reputation on rating changes
DROP TRIGGER IF EXISTS trigger_update_user_reputation ON user_ratings;
CREATE TRIGGER trigger_update_user_reputation
AFTER INSERT OR UPDATE OR DELETE ON user_ratings
FOR EACH ROW EXECUTE FUNCTION update_user_reputation();

-- Function to calculate reputation score
CREATE OR REPLACE FUNCTION calculate_reputation_score(p_user_id INTEGER)
RETURNS INTEGER AS $$
DECLARE
    v_score INTEGER := 0;
    v_avg_rating DECIMAL(3,2);
    v_total_ratings INTEGER;
    v_quality_posts INTEGER;
    v_quality_comments INTEGER;
    v_helpful INTEGER;
    v_verified INTEGER;
    v_reported INTEGER;
    v_level VARCHAR(20);
BEGIN
    -- Get reputation data
    SELECT
        COALESCE(average_rating, 0),
        COALESCE(total_ratings_received, 0),
        COALESCE(verified_ratings_count, 0),
        COALESCE(helpful_count, 0),
        COALESCE(reported_count, 0),
        COALESCE(quality_posts_count, 0),
        COALESCE(quality_comments_count, 0)
    INTO
        v_avg_rating,
        v_total_ratings,
        v_verified,
        v_helpful,
        v_reported,
        v_quality_posts,
        v_quality_comments
    FROM user_reputation
    WHERE user_id = p_user_id;

    -- If no reputation record, return 0
    IF v_avg_rating IS NULL THEN
        RETURN 0;
    END IF;

    -- Base score from average rating (max 500)
    v_score := v_score + (v_avg_rating * 100)::INTEGER;

    -- Volume bonus (max 100)
    v_score := v_score + LEAST(v_total_ratings * 2, 100);

    -- Quality content bonus (max 250)
    v_score := v_score + LEAST(v_quality_posts * 5, 150);
    v_score := v_score + LEAST(v_quality_comments * 3, 100);

    -- Helpful bonus (max 100)
    v_score := v_score + LEAST(v_helpful * 2, 100);

    -- Verified bonus (max 50)
    v_score := v_score + LEAST(v_verified * 3, 50);

    -- Penalties
    v_score := v_score - (v_reported * 10);

    -- Clamp to 0-1000
    v_score := GREATEST(0, LEAST(1000, v_score));

    -- Determine level
    IF v_score >= 850 THEN v_level := 'legend';
    ELSIF v_score >= 700 THEN v_level := 'expert';
    ELSIF v_score >= 500 THEN v_level := 'veteran';
    ELSIF v_score >= 300 THEN v_level := 'contributor';
    ELSIF v_score >= 100 THEN v_level := 'member';
    ELSE v_level := 'newcomer';
    END IF;

    -- Update reputation
    UPDATE user_reputation
    SET
        reputation_score = v_score,
        reputation_level = v_level,
        reputation_peak = GREATEST(COALESCE(reputation_peak, 0), v_score),
        reputation_peak_at = CASE
            WHEN v_score > COALESCE(reputation_peak, 0) THEN CURRENT_TIMESTAMP
            ELSE reputation_peak_at
        END,
        updated_at = CURRENT_TIMESTAMP
    WHERE user_id = p_user_id;

    RETURN v_score;
END;
$$ LANGUAGE plpgsql;

-- Function to update helpful count
CREATE OR REPLACE FUNCTION update_helpful_count()
RETURNS TRIGGER AS $$
DECLARE
    target_user_id INTEGER;
BEGIN
    -- Get the user who created the content
    IF NEW.target_type = 'post' THEN
        SELECT user_id INTO target_user_id FROM posts WHERE id = NEW.target_id;
    ELSIF NEW.target_type = 'comment' THEN
        SELECT user_id INTO target_user_id FROM comments WHERE id = NEW.target_id;
    ELSIF NEW.target_type = 'user' THEN
        target_user_id := NEW.target_id;
    END IF;

    IF target_user_id IS NOT NULL THEN
        -- Increment helpful count
        INSERT INTO user_reputation (user_id, helpful_count)
        VALUES (target_user_id, 1)
        ON CONFLICT (user_id) DO UPDATE
        SET helpful_count = user_reputation.helpful_count + 1,
            updated_at = CURRENT_TIMESTAMP;

        -- Recalculate reputation score
        PERFORM calculate_reputation_score(target_user_id);
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update helpful count
DROP TRIGGER IF EXISTS trigger_update_helpful_count ON helpful_marks;
CREATE TRIGGER trigger_update_helpful_count
AFTER INSERT ON helpful_marks
FOR EACH ROW EXECUTE FUNCTION update_helpful_count();

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE user_ratings IS 'User ratings with context and reviews';
COMMENT ON TABLE user_reputation IS 'Aggregated user reputation scores and metrics';
COMMENT ON TABLE rating_reports IS 'Reports for disputed or inappropriate ratings';
COMMENT ON TABLE helpful_marks IS 'Track when users mark content as helpful';

COMMENT ON COLUMN user_ratings.rating_type IS 'Category: profile, post, comment, interaction';
COMMENT ON COLUMN user_ratings.context_type IS 'What was rated: post, comment, message, general';
COMMENT ON COLUMN user_ratings.is_verified IS 'Rating from verified interaction';
COMMENT ON COLUMN user_reputation.reputation_score IS 'Calculated score 0-1000';
COMMENT ON COLUMN user_reputation.reputation_level IS 'Level: newcomer, member, contributor, veteran, expert, legend';


-- ============================================================================
-- MIGRATION: 005_comment_metrics_helpers.sql
-- ============================================================================
-- Migration: 005 - Comment Metrics Helper Functions
-- Description: Add helper functions for comment engagement scoring
-- Date: 2025-10-04

-- ============================================================================
-- HELPER FUNCTIONS FOR COMMENT METRICS
-- ============================================================================

-- Function to calculate recency score
CREATE OR REPLACE FUNCTION calculate_recency_score(comment_created_at TIMESTAMP)
RETURNS DOUBLE PRECISION AS $$
BEGIN
  -- Higher score for newer comments (max 100, decays over 30 days)
  RETURN GREATEST(0, 100 - EXTRACT(EPOCH FROM (NOW() - comment_created_at)) / 86400 / 30 * 100);
END;
$$ LANGUAGE plpgsql;

-- Function to calculate interaction rate
CREATE OR REPLACE FUNCTION calculate_interaction_rate(total_interactions INTEGER, created_at TIMESTAMP)
RETURNS DOUBLE PRECISION AS $$
DECLARE
  hours_since_creation FLOAT;
BEGIN
  hours_since_creation := EXTRACT(EPOCH FROM (NOW() - created_at)) / 3600;
  IF hours_since_creation <= 0 THEN
    RETURN 0;
  END IF;
  RETURN total_interactions::FLOAT / hours_since_creation;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate engagement score
CREATE OR REPLACE FUNCTION calculate_engagement_score(reply_count INTEGER, reaction_count INTEGER, deep_read_count INTEGER, view_count INTEGER)
RETURNS DOUBLE PRECISION AS $$
BEGIN
  IF view_count = 0 THEN
    RETURN 0;
  END IF;

  -- Engagement score based on interaction ratios
  RETURN (
    (reply_count * 10.0) +
    (reaction_count * 5.0) +
    (deep_read_count * 2.0)
  ) / view_count::FLOAT * 100;
END;
$$ LANGUAGE plpgsql;

-- Update the comment_metrics trigger function with full scoring algorithm
CREATE OR REPLACE FUNCTION update_comment_metrics()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert metrics record if it doesn't exist
  INSERT INTO comment_metrics (comment_id, first_interaction_at)
  VALUES (NEW.comment_id, NEW.created_at)
  ON CONFLICT (comment_id) DO NOTHING;

  -- Update aggregated counts and scores
  UPDATE comment_metrics SET
    view_count = view_count + CASE WHEN NEW.interaction_type = 'view' THEN 1 ELSE 0 END,
    reply_count = reply_count + CASE WHEN NEW.interaction_type = 'reply' THEN 1 ELSE 0 END,
    reaction_count = reaction_count + CASE WHEN NEW.interaction_type = 'reaction' THEN 1 ELSE 0 END,
    share_count = share_count + CASE WHEN NEW.interaction_type = 'share' THEN 1 ELSE 0 END,
    deep_read_count = deep_read_count + CASE WHEN NEW.interaction_type = 'deep_read' THEN 1 ELSE 0 END,
    total_interaction_count = total_interaction_count + 1,
    last_interaction_at = NEW.created_at,
    last_updated = NOW()
  WHERE comment_id = NEW.comment_id;

  -- Recalculate algorithm scores
  UPDATE comment_metrics cm SET
    recency_score = calculate_recency_score(c.created_at),
    interaction_rate = calculate_interaction_rate(cm.total_interaction_count, c.created_at),
    engagement_score = calculate_engagement_score(cm.reply_count, cm.reaction_count, cm.deep_read_count, cm.view_count),
    combined_algorithm_score = (
      calculate_recency_score(c.created_at) * 0.3 +
      calculate_interaction_rate(cm.total_interaction_count, c.created_at) * 0.4 +
      calculate_engagement_score(cm.reply_count, cm.reaction_count, cm.deep_read_count, cm.view_count) * 0.3
    )
  FROM comments c
  WHERE cm.comment_id = NEW.comment_id AND c.id = NEW.comment_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate trigger with updated function
DROP TRIGGER IF EXISTS comment_interaction_metrics_trigger ON comment_interactions;
CREATE TRIGGER comment_interaction_metrics_trigger
AFTER INSERT ON comment_interactions
FOR EACH ROW EXECUTE FUNCTION update_comment_metrics();

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON FUNCTION calculate_recency_score IS 'Calculate recency score (0-100) based on comment age, decays over 30 days';
COMMENT ON FUNCTION calculate_interaction_rate IS 'Calculate interaction rate (interactions per hour since creation)';
COMMENT ON FUNCTION calculate_engagement_score IS 'Calculate engagement score based on interaction quality vs view count';


-- ============================================================================
-- MIGRATION: 006_geolocation_system.sql
-- ============================================================================
-- Migration: 006 - Geolocation System
-- Description: Add geolocation support for finding nearby users
-- Date: 2025-10-04
-- Note: Uses Haversine formula for distance calculations (pure PostgreSQL, no PostGIS required)

-- ============================================================================
-- ADD LOCATION FIELDS TO USERS TABLE
-- ============================================================================

-- Add location fields
ALTER TABLE users ADD COLUMN IF NOT EXISTS location_latitude DECIMAL(10, 7);
ALTER TABLE users ADD COLUMN IF NOT EXISTS location_longitude DECIMAL(10, 7);
ALTER TABLE users ADD COLUMN IF NOT EXISTS location_city VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS location_state VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS location_country VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS location_updated_at TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS location_accuracy INTEGER; -- in meters
ALTER TABLE users ADD COLUMN IF NOT EXISTS location_sharing VARCHAR(20) DEFAULT 'off'
  CHECK (location_sharing IN ('exact', 'city', 'off'));
ALTER TABLE users ADD COLUMN IF NOT EXISTS show_distance_in_profile BOOLEAN DEFAULT FALSE;

-- Add indexes for efficient location queries
CREATE INDEX IF NOT EXISTS idx_users_location_coords ON users(location_latitude, location_longitude);
CREATE INDEX IF NOT EXISTS idx_users_location_sharing ON users(location_sharing);
CREATE INDEX IF NOT EXISTS idx_users_location_updated ON users(location_updated_at);

-- ============================================================================
-- LOCATION HISTORY TABLE
-- ============================================================================
-- Track location changes for privacy and debugging
CREATE TABLE IF NOT EXISTS location_history (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    location_latitude DECIMAL(10, 7) NOT NULL,
    location_longitude DECIMAL(10, 7) NOT NULL,
    location_city VARCHAR(100),
    location_state VARCHAR(100),
    location_country VARCHAR(100),
    accuracy INTEGER,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for location_history
CREATE INDEX IF NOT EXISTS idx_location_history_user_id ON location_history(user_id);
CREATE INDEX IF NOT EXISTS idx_location_history_created_at ON location_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_location_history_coords ON location_history(location_latitude, location_longitude);

-- ============================================================================
-- NEARBY SEARCH CACHE TABLE
-- ============================================================================
-- Cache nearby user searches for performance
CREATE TABLE IF NOT EXISTS nearby_search_cache (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    search_lat DECIMAL(10, 7) NOT NULL,
    search_lon DECIMAL(10, 7) NOT NULL,
    radius_miles INTEGER NOT NULL,
    nearby_user_ids INTEGER[] NOT NULL,
    result_count INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP DEFAULT (CURRENT_TIMESTAMP + INTERVAL '15 minutes')
);

-- Indexes for nearby_search_cache
CREATE INDEX IF NOT EXISTS idx_nearby_cache_user_id ON nearby_search_cache(user_id);
CREATE INDEX IF NOT EXISTS idx_nearby_cache_expires_at ON nearby_search_cache(expires_at);
CREATE INDEX IF NOT EXISTS idx_nearby_cache_coords ON nearby_search_cache(search_lat, search_lon);

-- ============================================================================
-- HELPER FUNCTIONS FOR GEOLOCATION
-- ============================================================================

-- Function to calculate distance between two points in miles using Haversine formula
-- This is accurate for distances up to a few hundred miles
CREATE OR REPLACE FUNCTION calculate_distance_miles(
    lat1 DECIMAL,
    lon1 DECIMAL,
    lat2 DECIMAL,
    lon2 DECIMAL
)
RETURNS DECIMAL(10, 2) AS $$
DECLARE
    R DECIMAL := 3959; -- Earth's radius in miles
    dLat DECIMAL;
    dLon DECIMAL;
    a DECIMAL;
    c DECIMAL;
BEGIN
    IF lat1 IS NULL OR lon1 IS NULL OR lat2 IS NULL OR lon2 IS NULL THEN
        RETURN NULL;
    END IF;

    -- Convert degrees to radians
    dLat := RADIANS(lat2 - lat1);
    dLon := RADIANS(lon2 - lon1);

    -- Haversine formula
    a := SIN(dLat / 2) * SIN(dLat / 2) +
         COS(RADIANS(lat1)) * COS(RADIANS(lat2)) *
         SIN(dLon / 2) * SIN(dLon / 2);
    c := 2 * ATAN2(SQRT(a), SQRT(1 - a));

    RETURN (R * c)::DECIMAL(10, 2);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to find users within radius (in miles)
CREATE OR REPLACE FUNCTION find_nearby_users(
    p_user_id INTEGER,
    p_lat DECIMAL(10, 7),
    p_lon DECIMAL(10, 7),
    p_radius_miles INTEGER DEFAULT 25,
    p_limit INTEGER DEFAULT 50,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    user_id INTEGER,
    username VARCHAR,
    first_name VARCHAR,
    last_name VARCHAR,
    avatar_url VARCHAR,
    distance_miles DECIMAL(10, 2),
    location_city VARCHAR,
    location_state VARCHAR,
    location_sharing VARCHAR
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        u.id,
        u.username,
        u.first_name,
        u.last_name,
        u.avatar_url,
        calculate_distance_miles(p_lat, p_lon, u.location_latitude, u.location_longitude) as distance_miles,
        u.location_city,
        u.location_state,
        u.location_sharing
    FROM users u
    WHERE
        u.id != p_user_id -- Exclude the searching user
        AND u.location_latitude IS NOT NULL
        AND u.location_longitude IS NOT NULL
        AND u.location_sharing != 'off'
        AND u.is_active = TRUE
        -- Rough bounding box filter for performance (before calculating exact distance)
        -- 1 degree latitude ≈ 69 miles, 1 degree longitude varies but ~69 miles at equator
        AND u.location_latitude BETWEEN p_lat - (p_radius_miles / 69.0) AND p_lat + (p_radius_miles / 69.0)
        AND u.location_longitude BETWEEN p_lon - (p_radius_miles / 69.0) AND p_lon + (p_radius_miles / 69.0)
        AND calculate_distance_miles(p_lat, p_lon, u.location_latitude, u.location_longitude) <= p_radius_miles
    ORDER BY distance_miles
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;

-- Function to update user location
CREATE OR REPLACE FUNCTION update_user_location(
    p_user_id INTEGER,
    p_lat DECIMAL(10, 7),
    p_lon DECIMAL(10, 7),
    p_city VARCHAR DEFAULT NULL,
    p_state VARCHAR DEFAULT NULL,
    p_country VARCHAR DEFAULT NULL,
    p_accuracy INTEGER DEFAULT NULL,
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
    -- Update users table
    UPDATE users
    SET
        location_latitude = p_lat,
        location_longitude = p_lon,
        location_city = COALESCE(p_city, location_city),
        location_state = COALESCE(p_state, location_state),
        location_country = COALESCE(p_country, location_country),
        location_accuracy = COALESCE(p_accuracy, location_accuracy),
        location_updated_at = CURRENT_TIMESTAMP
    WHERE id = p_user_id;

    -- Add to location history
    INSERT INTO location_history (
        user_id,
        location_latitude,
        location_longitude,
        location_city,
        location_state,
        location_country,
        accuracy,
        ip_address,
        user_agent
    ) VALUES (
        p_user_id,
        p_lat,
        p_lon,
        p_city,
        p_state,
        p_country,
        p_accuracy,
        p_ip_address,
        p_user_agent
    );

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Function to cleanup expired cache entries
CREATE OR REPLACE FUNCTION cleanup_nearby_search_cache()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM nearby_search_cache
    WHERE expires_at < CURRENT_TIMESTAMP;

    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to get user's current location
CREATE OR REPLACE FUNCTION get_user_location(p_user_id INTEGER)
RETURNS TABLE (
    latitude DECIMAL(10, 7),
    longitude DECIMAL(10, 7),
    city VARCHAR,
    state VARCHAR,
    country VARCHAR,
    accuracy INTEGER,
    updated_at TIMESTAMP,
    sharing VARCHAR
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        u.location_latitude,
        u.location_longitude,
        u.location_city,
        u.location_state,
        u.location_country,
        u.location_accuracy,
        u.location_updated_at,
        u.location_sharing
    FROM users u
    WHERE u.id = p_user_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- PRIVACY AND CLEANUP
-- ============================================================================

-- Trigger to limit location history to last 100 entries per user
CREATE OR REPLACE FUNCTION limit_location_history()
RETURNS TRIGGER AS $$
BEGIN
    -- Delete old entries beyond 100 for this user
    DELETE FROM location_history
    WHERE id IN (
        SELECT id
        FROM location_history
        WHERE user_id = NEW.user_id
        ORDER BY created_at DESC
        OFFSET 100
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_limit_location_history ON location_history;
CREATE TRIGGER trigger_limit_location_history
AFTER INSERT ON location_history
FOR EACH ROW EXECUTE FUNCTION limit_location_history();

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON COLUMN users.location_latitude IS 'Latitude coordinate for user location (WGS84)';
COMMENT ON COLUMN users.location_longitude IS 'Longitude coordinate for user location (WGS84)';
COMMENT ON COLUMN users.location_sharing IS 'Privacy setting: exact (show precise location), city (show only city), off (hide location)';
COMMENT ON COLUMN users.show_distance_in_profile IS 'Whether to show distance to this user in search results';
COMMENT ON TABLE location_history IS 'Historical log of user location changes for privacy audit';
COMMENT ON TABLE nearby_search_cache IS 'Cache for nearby user searches to improve performance';

COMMENT ON FUNCTION calculate_distance_miles IS 'Calculate distance between two lat/lon points in miles using Haversine formula';
COMMENT ON FUNCTION find_nearby_users IS 'Find users within specified radius (miles) sorted by distance';
COMMENT ON FUNCTION update_user_location IS 'Update user location and add entry to history';
COMMENT ON FUNCTION get_user_location IS 'Get user''s current location with privacy settings';
COMMENT ON FUNCTION cleanup_nearby_search_cache IS 'Remove expired cache entries, returns count deleted';


-- ============================================================================
-- MIGRATION: 007_add_address_fields.sql
-- ============================================================================
-- Migration: 007 - Add Address Fields
-- Description: Add physical address and ZIP code fields to users table
-- Date: 2025-10-07
-- Note: These fields complement location coordinates for full address support

-- ============================================================================
-- ADD ADDRESS FIELDS TO USERS TABLE
-- ============================================================================

-- Add address and ZIP code columns
ALTER TABLE users ADD COLUMN IF NOT EXISTS address VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS location_zip VARCHAR(20);

-- Add comments for documentation
COMMENT ON COLUMN users.address IS 'Street address for exact location sharing (e.g., "123 Main St")';
COMMENT ON COLUMN users.location_zip IS 'ZIP/postal code for location';

-- ============================================================================
-- UPDATE LOCATION SHARING LOGIC
-- ============================================================================

-- When location_sharing is 'exact', users should see the full address including:
-- - address (street address)
-- - location_city
-- - location_state
-- - location_zip
-- - location_country
--
-- When location_sharing is 'city', users should only see:
-- - location_city
-- - location_state
-- - location_country
--
-- When location_sharing is 'off', no location information is visible

-- Update get_user_location function to include address fields
DROP FUNCTION IF EXISTS get_user_location(INTEGER);
CREATE FUNCTION get_user_location(p_user_id INTEGER)
RETURNS TABLE (
    latitude DECIMAL(10, 7),
    longitude DECIMAL(10, 7),
    address VARCHAR,
    city VARCHAR,
    state VARCHAR,
    zip VARCHAR,
    country VARCHAR,
    accuracy INTEGER,
    updated_at TIMESTAMP,
    sharing VARCHAR
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        u.location_latitude,
        u.location_longitude,
        u.address,
        u.location_city,
        u.location_state,
        u.location_zip,
        u.location_country,
        u.location_accuracy,
        u.location_updated_at,
        u.location_sharing
    FROM users u
    WHERE u.id = p_user_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_user_location IS 'Get user''s current location including address with privacy settings';


-- ============================================================================
-- MIGRATION: 008_update_location_function.sql
-- ============================================================================
-- Migration: 008 - Update Location Functions for Address Support
-- Description: Update update_user_location function to include address and zip
-- Date: 2025-10-07

-- Drop and recreate the function with new parameters
DROP FUNCTION IF EXISTS update_user_location(INTEGER, DECIMAL, DECIMAL, VARCHAR, VARCHAR, VARCHAR, INTEGER, INET, TEXT);

CREATE OR REPLACE FUNCTION update_user_location(
    p_user_id INTEGER,
    p_lat DECIMAL(10, 7),
    p_lon DECIMAL(10, 7),
    p_address VARCHAR DEFAULT NULL,
    p_city VARCHAR DEFAULT NULL,
    p_state VARCHAR DEFAULT NULL,
    p_zip VARCHAR DEFAULT NULL,
    p_country VARCHAR DEFAULT NULL,
    p_accuracy INTEGER DEFAULT NULL,
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
    -- Update users table with all location fields
    UPDATE users
    SET
        location_latitude = p_lat,
        location_longitude = p_lon,
        address = COALESCE(p_address, address),
        location_city = COALESCE(p_city, location_city),
        location_state = COALESCE(p_state, location_state),
        location_zip = COALESCE(p_zip, location_zip),
        location_country = COALESCE(p_country, location_country),
        location_accuracy = COALESCE(p_accuracy, location_accuracy),
        location_updated_at = CURRENT_TIMESTAMP
    WHERE id = p_user_id;

    -- Add to location history
    INSERT INTO location_history (
        user_id,
        location_latitude,
        location_longitude,
        location_city,
        location_state,
        location_country,
        accuracy,
        ip_address,
        user_agent
    ) VALUES (
        p_user_id,
        p_lat,
        p_lon,
        p_city,
        p_state,
        p_country,
        p_accuracy,
        p_ip_address,
        p_user_agent
    );

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION update_user_location IS 'Update user location with address, city, state, zip, country and add entry to history';


-- ============================================================================
-- MIGRATION: 009_group_system.sql
-- ============================================================================
-- Migration: 009 - Group System
-- Description: Reddit-style community groups with posts, comments, and moderation
-- Date: 2025-10-09
-- Requires: PostgreSQL ltree extension for nested comments

-- ============================================================================
-- EXTENSIONS
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS ltree;

-- ============================================================================
-- GROUPS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS groups (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    slug VARCHAR(100) NOT NULL UNIQUE,
    display_name VARCHAR(255) NOT NULL,
    description TEXT,
    avatar_url VARCHAR(500),
    banner_url VARCHAR(500),

    -- Privacy & Access
    visibility VARCHAR(20) DEFAULT 'public' CHECK (visibility IN ('public', 'private', 'invite_only')),
    require_approval BOOLEAN DEFAULT FALSE,
    allow_posts BOOLEAN DEFAULT TRUE,

    -- Moderation
    post_approval_required BOOLEAN DEFAULT FALSE,
    allow_multimedia BOOLEAN DEFAULT TRUE,
    allowed_media_types TEXT[] DEFAULT ARRAY['image', 'video', 'pdf', 'model', 'link'],
    max_file_size_mb INTEGER DEFAULT 50,

    -- Metadata
    creator_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    member_count INTEGER DEFAULT 0,
    post_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Settings (JSONB for flexible configuration)
    settings JSONB DEFAULT '{}',

    CONSTRAINT valid_name CHECK (name ~ '^[a-zA-Z0-9_-]{3,100}$'),
    CONSTRAINT valid_slug CHECK (slug ~ '^[a-z0-9-]{3,100}$')
);

-- Indexes for groups
CREATE INDEX IF NOT EXISTS idx_groups_slug ON groups(slug);
CREATE INDEX IF NOT EXISTS idx_groups_visibility ON groups(visibility);
CREATE INDEX IF NOT EXISTS idx_groups_creator ON groups(creator_id);
CREATE INDEX IF NOT EXISTS idx_groups_created ON groups(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_groups_name_search ON groups USING gin(to_tsvector('english', display_name || ' ' || COALESCE(description, '')));

-- ============================================================================
-- GROUP MEMBERSHIPS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS group_memberships (
    id SERIAL PRIMARY KEY,
    group_id INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Role & Status
    role VARCHAR(20) DEFAULT 'member' CHECK (role IN ('admin', 'moderator', 'member')),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'banned', 'pending', 'invited')),

    -- Timestamps
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    invited_by INTEGER REFERENCES users(id),
    banned_by INTEGER REFERENCES users(id),
    banned_reason TEXT,
    banned_at TIMESTAMP,

    UNIQUE(group_id, user_id)
);

-- Indexes for group memberships
CREATE INDEX IF NOT EXISTS idx_group_memberships_group ON group_memberships(group_id);
CREATE INDEX IF NOT EXISTS idx_group_memberships_user ON group_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_group_memberships_role ON group_memberships(group_id, role);
CREATE INDEX IF NOT EXISTS idx_group_memberships_status ON group_memberships(status);

-- ============================================================================
-- GROUP POSTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS group_posts (
    id SERIAL PRIMARY KEY,
    group_id INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Content
    title VARCHAR(300),
    content TEXT,
    post_type VARCHAR(20) DEFAULT 'text' CHECK (post_type IN ('text', 'link', 'media', 'poll')),

    -- Link posts
    link_url VARCHAR(1000),
    link_title VARCHAR(500),
    link_description TEXT,
    link_thumbnail VARCHAR(500),

    -- Status & Moderation
    status VARCHAR(20) DEFAULT 'published' CHECK (status IN ('draft', 'pending', 'published', 'removed', 'deleted')),
    approved_by INTEGER REFERENCES users(id),
    approved_at TIMESTAMP,
    removed_by INTEGER REFERENCES users(id),
    removed_at TIMESTAMP,
    removal_reason TEXT,

    -- Engagement
    upvotes INTEGER DEFAULT 0,
    downvotes INTEGER DEFAULT 0,
    score INTEGER DEFAULT 0, -- Calculated: upvotes - downvotes
    comment_count INTEGER DEFAULT 0,

    -- Flags
    is_pinned BOOLEAN DEFAULT FALSE,
    is_locked BOOLEAN DEFAULT FALSE,
    is_nsfw BOOLEAN DEFAULT FALSE,
    is_spoiler BOOLEAN DEFAULT FALSE,

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    edited_at TIMESTAMP,

    CONSTRAINT valid_content CHECK (
        (post_type = 'text' AND (title IS NOT NULL OR content IS NOT NULL)) OR
        (post_type = 'link' AND link_url IS NOT NULL) OR
        (post_type = 'media') OR
        (post_type = 'poll')
    )
);

-- Indexes for group posts
CREATE INDEX IF NOT EXISTS idx_group_posts_group ON group_posts(group_id);
CREATE INDEX IF NOT EXISTS idx_group_posts_user ON group_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_group_posts_status ON group_posts(status);
CREATE INDEX IF NOT EXISTS idx_group_posts_created ON group_posts(group_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_group_posts_score ON group_posts(group_id, score DESC);
CREATE INDEX IF NOT EXISTS idx_group_posts_pinned ON group_posts(group_id, is_pinned, created_at DESC);

-- ============================================================================
-- GROUP POST MEDIA TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS group_post_media (
    id SERIAL PRIMARY KEY,
    post_id INTEGER NOT NULL REFERENCES group_posts(id) ON DELETE CASCADE,

    -- File Info
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_url VARCHAR(500) NOT NULL,
    file_type VARCHAR(50) NOT NULL,
    file_size BIGINT NOT NULL,
    mime_type VARCHAR(100) NOT NULL,

    -- Media Type
    media_type VARCHAR(20) CHECK (media_type IN ('image', 'video', 'pdf', 'model', 'other')),

    -- Image/Video specific
    width INTEGER,
    height INTEGER,
    duration INTEGER, -- seconds for video
    thumbnail_url VARCHAR(500),

    -- Order for galleries
    display_order INTEGER DEFAULT 0,

    -- Metadata
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT valid_file_path CHECK (file_path ~ '^public/media/groups/.*')
);

-- Indexes for group post media
CREATE INDEX IF NOT EXISTS idx_group_post_media_post ON group_post_media(post_id);
CREATE INDEX IF NOT EXISTS idx_group_post_media_type ON group_post_media(media_type);

-- ============================================================================
-- GROUP COMMENTS TABLE (Nested/Threaded using ltree)
-- ============================================================================
CREATE TABLE IF NOT EXISTS group_comments (
    id SERIAL PRIMARY KEY,
    post_id INTEGER NOT NULL REFERENCES group_posts(id) ON DELETE CASCADE,
    parent_id INTEGER REFERENCES group_comments(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Content
    content TEXT NOT NULL,

    -- Status
    status VARCHAR(20) DEFAULT 'published' CHECK (status IN ('published', 'removed', 'deleted')),
    removed_by INTEGER REFERENCES users(id),
    removed_at TIMESTAMP,
    removal_reason TEXT,

    -- Engagement
    upvotes INTEGER DEFAULT 0,
    downvotes INTEGER DEFAULT 0,
    score INTEGER DEFAULT 0,

    -- Nesting
    depth INTEGER DEFAULT 0,
    path LTREE, -- PostgreSQL ltree for efficient nested queries

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    edited_at TIMESTAMP
);

-- Indexes for group comments
CREATE INDEX IF NOT EXISTS idx_group_comments_post ON group_comments(post_id);
CREATE INDEX IF NOT EXISTS idx_group_comments_parent ON group_comments(parent_id);
CREATE INDEX IF NOT EXISTS idx_group_comments_user ON group_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_group_comments_path ON group_comments USING GIST (path);
CREATE INDEX IF NOT EXISTS idx_group_comments_created ON group_comments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_group_comments_score ON group_comments(post_id, score DESC);

-- ============================================================================
-- GROUP COMMENT MEDIA TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS group_comment_media (
    id SERIAL PRIMARY KEY,
    comment_id INTEGER NOT NULL REFERENCES group_comments(id) ON DELETE CASCADE,

    -- File Info (same structure as post media)
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_url VARCHAR(500) NOT NULL,
    file_type VARCHAR(50) NOT NULL,
    file_size BIGINT NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    media_type VARCHAR(20) CHECK (media_type IN ('image', 'video', 'pdf', 'model', 'other')),

    width INTEGER,
    height INTEGER,
    duration INTEGER,
    thumbnail_url VARCHAR(500),
    display_order INTEGER DEFAULT 0,

    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT valid_comment_file_path CHECK (file_path ~ '^public/media/groups/.*')
);

-- Indexes for group comment media
CREATE INDEX IF NOT EXISTS idx_group_comment_media_comment ON group_comment_media(comment_id);

-- ============================================================================
-- GROUP INVITATIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS group_invitations (
    id SERIAL PRIMARY KEY,
    group_id INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    inviter_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    invitee_id INTEGER REFERENCES users(id), -- NULL for email invites
    invitee_email VARCHAR(255),

    -- Status
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),

    -- Token for email invites
    token VARCHAR(255) UNIQUE,
    expires_at TIMESTAMP,

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    responded_at TIMESTAMP,

    CONSTRAINT valid_invitee CHECK (invitee_id IS NOT NULL OR invitee_email IS NOT NULL)
);

-- Indexes for group invitations
CREATE INDEX IF NOT EXISTS idx_group_invitations_group ON group_invitations(group_id);
CREATE INDEX IF NOT EXISTS idx_group_invitations_invitee ON group_invitations(invitee_id);
CREATE INDEX IF NOT EXISTS idx_group_invitations_token ON group_invitations(token);
CREATE INDEX IF NOT EXISTS idx_group_invitations_status ON group_invitations(status);

-- ============================================================================
-- GROUP VOTES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS group_votes (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Votable entity (post or comment)
    post_id INTEGER REFERENCES group_posts(id) ON DELETE CASCADE,
    comment_id INTEGER REFERENCES group_comments(id) ON DELETE CASCADE,

    -- Vote value
    vote_type VARCHAR(10) CHECK (vote_type IN ('upvote', 'downvote')),

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT valid_vote_target CHECK (
        (post_id IS NOT NULL AND comment_id IS NULL) OR
        (post_id IS NULL AND comment_id IS NOT NULL)
    ),
    CONSTRAINT unique_post_vote UNIQUE (user_id, post_id),
    CONSTRAINT unique_comment_vote UNIQUE (user_id, comment_id)
);

-- Indexes for group votes
CREATE INDEX IF NOT EXISTS idx_group_votes_user ON group_votes(user_id);
CREATE INDEX IF NOT EXISTS idx_group_votes_post ON group_votes(post_id);
CREATE INDEX IF NOT EXISTS idx_group_votes_comment ON group_votes(comment_id);

-- ============================================================================
-- GROUP ACTIVITY LOG TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS group_activity_log (
    id SERIAL PRIMARY KEY,
    group_id INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id),

    -- Action
    action_type VARCHAR(50) NOT NULL, -- 'post_created', 'user_banned', 'post_removed', etc.
    target_type VARCHAR(50), -- 'post', 'comment', 'user', 'group'
    target_id INTEGER,

    -- Details
    details JSONB DEFAULT '{}',

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for group activity log
CREATE INDEX IF NOT EXISTS idx_group_activity_log_group ON group_activity_log(group_id);
CREATE INDEX IF NOT EXISTS idx_group_activity_log_created ON group_activity_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_group_activity_log_action ON group_activity_log(action_type);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Update updated_at timestamp trigger (reuse existing function)
DROP TRIGGER IF EXISTS update_groups_updated_at ON groups;
CREATE TRIGGER update_groups_updated_at BEFORE UPDATE ON groups
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_group_posts_updated_at ON group_posts;
CREATE TRIGGER update_group_posts_updated_at BEFORE UPDATE ON group_posts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_group_comments_updated_at ON group_comments;
CREATE TRIGGER update_group_comments_updated_at BEFORE UPDATE ON group_comments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_group_votes_updated_at ON group_votes;
CREATE TRIGGER update_group_votes_updated_at BEFORE UPDATE ON group_votes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- FUNCTIONS FOR GROUP MANAGEMENT
-- ============================================================================

-- Function to update group member count
CREATE OR REPLACE FUNCTION update_group_member_count()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT' AND NEW.status = 'active') THEN
        UPDATE groups
        SET member_count = member_count + 1,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = NEW.group_id;
    ELSIF (TG_OP = 'DELETE' AND OLD.status = 'active') THEN
        UPDATE groups
        SET member_count = GREATEST(0, member_count - 1),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = OLD.group_id;
    ELSIF (TG_OP = 'UPDATE') THEN
        -- Status changed from active to something else
        IF OLD.status = 'active' AND NEW.status != 'active' THEN
            UPDATE groups
            SET member_count = GREATEST(0, member_count - 1),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = NEW.group_id;
        -- Status changed to active from something else
        ELSIF OLD.status != 'active' AND NEW.status = 'active' THEN
            UPDATE groups
            SET member_count = member_count + 1,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = NEW.group_id;
        END IF;
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update member count
DROP TRIGGER IF EXISTS trigger_update_group_member_count ON group_memberships;
CREATE TRIGGER trigger_update_group_member_count
AFTER INSERT OR UPDATE OR DELETE ON group_memberships
FOR EACH ROW EXECUTE FUNCTION update_group_member_count();

-- Function to update group post count
CREATE OR REPLACE FUNCTION update_group_post_count()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT' AND NEW.status = 'published') THEN
        UPDATE groups
        SET post_count = post_count + 1,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = NEW.group_id;
    ELSIF (TG_OP = 'DELETE' AND OLD.status = 'published') THEN
        UPDATE groups
        SET post_count = GREATEST(0, post_count - 1),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = OLD.group_id;
    ELSIF (TG_OP = 'UPDATE') THEN
        IF OLD.status = 'published' AND NEW.status != 'published' THEN
            UPDATE groups
            SET post_count = GREATEST(0, post_count - 1),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = NEW.group_id;
        ELSIF OLD.status != 'published' AND NEW.status = 'published' THEN
            UPDATE groups
            SET post_count = post_count + 1,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = NEW.group_id;
        END IF;
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update post count
DROP TRIGGER IF EXISTS trigger_update_group_post_count ON group_posts;
CREATE TRIGGER trigger_update_group_post_count
AFTER INSERT OR UPDATE OR DELETE ON group_posts
FOR EACH ROW EXECUTE FUNCTION update_group_post_count();

-- Function to update post vote counts
CREATE OR REPLACE FUNCTION update_group_post_votes()
RETURNS TRIGGER AS $$
DECLARE
    upvote_count INTEGER;
    downvote_count INTEGER;
    new_score INTEGER;
    target_post_id INTEGER;
BEGIN
    -- Get post_id from NEW or OLD
    target_post_id := COALESCE(NEW.post_id, OLD.post_id);

    -- Skip if this is for a comment vote
    IF target_post_id IS NULL THEN
        RETURN NULL;
    END IF;

    -- Get current vote counts
    SELECT
        COUNT(*) FILTER (WHERE vote_type = 'upvote'),
        COUNT(*) FILTER (WHERE vote_type = 'downvote')
    INTO upvote_count, downvote_count
    FROM group_votes
    WHERE post_id = target_post_id;

    -- Calculate score
    new_score := upvote_count - downvote_count;

    -- Update post
    UPDATE group_posts
    SET
        upvotes = upvote_count,
        downvotes = downvote_count,
        score = new_score,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = target_post_id;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update post votes
DROP TRIGGER IF EXISTS trigger_update_group_post_votes ON group_votes;
CREATE TRIGGER trigger_update_group_post_votes
AFTER INSERT OR UPDATE OR DELETE ON group_votes
FOR EACH ROW
EXECUTE FUNCTION update_group_post_votes();

-- Function to update comment vote counts
CREATE OR REPLACE FUNCTION update_group_comment_votes()
RETURNS TRIGGER AS $$
DECLARE
    upvote_count INTEGER;
    downvote_count INTEGER;
    new_score INTEGER;
    target_comment_id INTEGER;
BEGIN
    -- Get comment_id from NEW or OLD
    target_comment_id := COALESCE(NEW.comment_id, OLD.comment_id);

    -- Skip if this is for a post vote
    IF target_comment_id IS NULL THEN
        RETURN NULL;
    END IF;

    -- Get current vote counts
    SELECT
        COUNT(*) FILTER (WHERE vote_type = 'upvote'),
        COUNT(*) FILTER (WHERE vote_type = 'downvote')
    INTO upvote_count, downvote_count
    FROM group_votes
    WHERE comment_id = target_comment_id;

    -- Calculate score
    new_score := upvote_count - downvote_count;

    -- Update comment
    UPDATE group_comments
    SET
        upvotes = upvote_count,
        downvotes = downvote_count,
        score = new_score,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = target_comment_id;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update comment votes
DROP TRIGGER IF EXISTS trigger_update_group_comment_votes ON group_votes;
CREATE TRIGGER trigger_update_group_comment_votes
AFTER INSERT OR UPDATE OR DELETE ON group_votes
FOR EACH ROW
EXECUTE FUNCTION update_group_comment_votes();

-- Function to update comment count on posts
CREATE OR REPLACE FUNCTION update_group_post_comment_count()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT' AND NEW.status = 'published') THEN
        UPDATE group_posts
        SET comment_count = comment_count + 1,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = NEW.post_id;
    ELSIF (TG_OP = 'DELETE' AND OLD.status = 'published') THEN
        UPDATE group_posts
        SET comment_count = GREATEST(0, comment_count - 1),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = OLD.post_id;
    ELSIF (TG_OP = 'UPDATE') THEN
        IF OLD.status = 'published' AND NEW.status != 'published' THEN
            UPDATE group_posts
            SET comment_count = GREATEST(0, comment_count - 1),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = NEW.post_id;
        ELSIF OLD.status != 'published' AND NEW.status = 'published' THEN
            UPDATE group_posts
            SET comment_count = comment_count + 1,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = NEW.post_id;
        END IF;
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update comment count
DROP TRIGGER IF EXISTS trigger_update_group_post_comment_count ON group_comments;
CREATE TRIGGER trigger_update_group_post_comment_count
AFTER INSERT OR UPDATE OR DELETE ON group_comments
FOR EACH ROW EXECUTE FUNCTION update_group_post_comment_count();

-- Function to set comment path for nested comments
CREATE OR REPLACE FUNCTION set_group_comment_path()
RETURNS TRIGGER AS $$
DECLARE
    parent_path LTREE;
BEGIN
    IF NEW.parent_id IS NULL THEN
        -- Top-level comment
        NEW.path := text2ltree(NEW.id::text);
        NEW.depth := 0;
    ELSE
        -- Nested comment
        SELECT path, depth INTO parent_path, NEW.depth
        FROM group_comments
        WHERE id = NEW.parent_id;

        IF parent_path IS NULL THEN
            RAISE EXCEPTION 'Parent comment not found';
        END IF;

        NEW.path := parent_path || text2ltree(NEW.id::text);
        NEW.depth := NEW.depth + 1;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to set comment path
DROP TRIGGER IF EXISTS trigger_set_group_comment_path ON group_comments;
CREATE TRIGGER trigger_set_group_comment_path
BEFORE INSERT ON group_comments
FOR EACH ROW EXECUTE FUNCTION set_group_comment_path();

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to check if user is group member
CREATE OR REPLACE FUNCTION is_group_member(p_user_id INTEGER, p_group_id INTEGER)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM group_memberships
        WHERE user_id = p_user_id
        AND group_id = p_group_id
        AND status = 'active'
    );
END;
$$ LANGUAGE plpgsql;

-- Function to check if user is group moderator or admin
CREATE OR REPLACE FUNCTION is_group_moderator(p_user_id INTEGER, p_group_id INTEGER)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM group_memberships
        WHERE user_id = p_user_id
        AND group_id = p_group_id
        AND status = 'active'
        AND role IN ('moderator', 'admin')
    );
END;
$$ LANGUAGE plpgsql;

-- Function to check if user is group admin
CREATE OR REPLACE FUNCTION is_group_admin(p_user_id INTEGER, p_group_id INTEGER)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM group_memberships
        WHERE user_id = p_user_id
        AND group_id = p_group_id
        AND status = 'active'
        AND role = 'admin'
    );
END;
$$ LANGUAGE plpgsql;

-- Function to get user role in group
CREATE OR REPLACE FUNCTION get_group_user_role(p_user_id INTEGER, p_group_id INTEGER)
RETURNS VARCHAR(20) AS $$
DECLARE
    user_role VARCHAR(20);
BEGIN
    SELECT role INTO user_role
    FROM group_memberships
    WHERE user_id = p_user_id
    AND group_id = p_group_id
    AND status = 'active';

    RETURN user_role;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE groups IS 'Reddit-style community groups';
COMMENT ON TABLE group_memberships IS 'User memberships in groups with roles (admin, moderator, member)';
COMMENT ON TABLE group_posts IS 'Posts within groups';
COMMENT ON TABLE group_post_media IS 'Media attachments for group posts';
COMMENT ON TABLE group_comments IS 'Nested comments on group posts using ltree';
COMMENT ON TABLE group_comment_media IS 'Media attachments for group comments';
COMMENT ON TABLE group_invitations IS 'Invitations to join groups';
COMMENT ON TABLE group_votes IS 'Upvote/downvote system for posts and comments';
COMMENT ON TABLE group_activity_log IS 'Audit log for moderation actions';

COMMENT ON COLUMN groups.visibility IS 'public: anyone can view, private: members only, invite_only: invite required';
COMMENT ON COLUMN groups.post_approval_required IS 'If true, posts require moderator approval before publishing';
COMMENT ON COLUMN group_memberships.role IS 'admin: full control, moderator: can moderate content, member: regular member';
COMMENT ON COLUMN group_posts.score IS 'Reddit-style score: upvotes - downvotes';
COMMENT ON COLUMN group_comments.path IS 'ltree path for efficient nested comment queries';
COMMENT ON COLUMN group_comments.depth IS 'Nesting depth (0 for top-level comments)';


-- ============================================================================
-- MIGRATION: 010_allow_public_posting.sql
-- ============================================================================
-- Migration: 010 - Allow Public Posting
-- Description: Add field to allow non-members to post in groups
-- Date: 2025-10-12

-- Add allow_public_posting field to groups table
ALTER TABLE groups
ADD COLUMN IF NOT EXISTS allow_public_posting BOOLEAN DEFAULT FALSE;

-- Create a comment explaining the field
COMMENT ON COLUMN groups.allow_public_posting IS 'If true, non-members can post, comment, and vote in this group without joining';

-- Update existing groups to be member-only by default
UPDATE groups SET allow_public_posting = FALSE WHERE allow_public_posting IS NULL;


-- ============================================================================
-- MIGRATION: 010_post_soft_delete.sql
-- ============================================================================
-- Migration: Add soft delete support to posts
-- This allows posts to be "deleted" while retaining the data for moderation purposes
-- A deleted post shows as "[This post has been removed by moderators]" in the UI

-- Add soft delete columns to posts table
ALTER TABLE posts
ADD COLUMN deleted_at TIMESTAMP,
ADD COLUMN deleted_by INTEGER REFERENCES users(id),
ADD COLUMN deletion_reason TEXT;

-- Add index for filtering deleted posts
CREATE INDEX idx_posts_deleted_at ON posts(deleted_at);

-- Add comment explaining the soft delete columns
COMMENT ON COLUMN posts.deleted_at IS 'Timestamp when the post was soft-deleted (NULL if not deleted)';
COMMENT ON COLUMN posts.deleted_by IS 'User ID of the admin/moderator who deleted the post';
COMMENT ON COLUMN posts.deletion_reason IS 'Reason provided for deleting the post';


-- ============================================================================
-- MIGRATION: 011_group_geolocation_restrictions.sql
-- ============================================================================
-- Migration: 011 - Group Geolocation Restrictions
-- Description: Add geolocation-based restrictions for groups
-- Date: 2025-10-12

-- Add geolocation restriction fields to groups table
ALTER TABLE groups
ADD COLUMN IF NOT EXISTS location_restricted BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS location_type VARCHAR(20) CHECK (location_type IN ('radius', 'country', 'state', 'city', 'polygon')),
ADD COLUMN IF NOT EXISTS location_latitude DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS location_longitude DECIMAL(11, 8),
ADD COLUMN IF NOT EXISTS location_radius_km DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS location_country VARCHAR(2),
ADD COLUMN IF NOT EXISTS location_state VARCHAR(100),
ADD COLUMN IF NOT EXISTS location_city VARCHAR(100),
ADD COLUMN IF NOT EXISTS location_polygon JSONB,
ADD COLUMN IF NOT EXISTS location_name VARCHAR(255);

-- Add comments explaining the fields
COMMENT ON COLUMN groups.location_restricted IS 'If true, users must be in the specified location to join/post';
COMMENT ON COLUMN groups.location_type IS 'Type of location restriction: radius (circle), country, state, city, or polygon (custom area)';
COMMENT ON COLUMN groups.location_latitude IS 'Center latitude for radius-based restrictions';
COMMENT ON COLUMN groups.location_longitude IS 'Center longitude for radius-based restrictions';
COMMENT ON COLUMN groups.location_radius_km IS 'Radius in kilometers for radius-based restrictions';
COMMENT ON COLUMN groups.location_country IS 'ISO 3166-1 alpha-2 country code (e.g., US, CA, GB)';
COMMENT ON COLUMN groups.location_state IS 'State/province/region name';
COMMENT ON COLUMN groups.location_city IS 'City name';
COMMENT ON COLUMN groups.location_polygon IS 'GeoJSON polygon for custom area restrictions';
COMMENT ON COLUMN groups.location_name IS 'Display name for the location (e.g., "San Francisco Bay Area")';

-- Create index for location-based queries
CREATE INDEX IF NOT EXISTS idx_groups_location_restricted ON groups(location_restricted) WHERE location_restricted = TRUE;
CREATE INDEX IF NOT EXISTS idx_groups_location_coords ON groups(location_latitude, location_longitude) WHERE location_restricted = TRUE;

-- Example usage:
-- Radius-based: Groups restricted to users within X km of a point
-- Country: Groups restricted to users in a specific country
-- State: Groups restricted to users in a specific state/province
-- City: Groups restricted to users in a specific city
-- Polygon: Groups restricted to users within a custom geographic boundary


-- ============================================================================
-- MIGRATION: 012_moderator_permissions.sql
-- ============================================================================
-- Migration: 012 - Moderator Permissions
-- Description: Add granular permission controls for what moderators can do
-- Date: 2025-10-19
-- Requires: 009_group_system.sql

-- Add moderator permission columns to groups table
ALTER TABLE groups ADD COLUMN IF NOT EXISTS moderator_can_remove_posts BOOLEAN DEFAULT TRUE;
ALTER TABLE groups ADD COLUMN IF NOT EXISTS moderator_can_remove_comments BOOLEAN DEFAULT TRUE;
ALTER TABLE groups ADD COLUMN IF NOT EXISTS moderator_can_ban_members BOOLEAN DEFAULT TRUE;
ALTER TABLE groups ADD COLUMN IF NOT EXISTS moderator_can_approve_posts BOOLEAN DEFAULT TRUE;
ALTER TABLE groups ADD COLUMN IF NOT EXISTS moderator_can_approve_members BOOLEAN DEFAULT TRUE;
ALTER TABLE groups ADD COLUMN IF NOT EXISTS moderator_can_pin_posts BOOLEAN DEFAULT TRUE;
ALTER TABLE groups ADD COLUMN IF NOT EXISTS moderator_can_lock_posts BOOLEAN DEFAULT TRUE;

-- Add comment for documentation
COMMENT ON COLUMN groups.moderator_can_remove_posts IS 'Allow moderators to remove posts (admins can always remove)';
COMMENT ON COLUMN groups.moderator_can_remove_comments IS 'Allow moderators to remove comments (admins can always remove)';
COMMENT ON COLUMN groups.moderator_can_ban_members IS 'Allow moderators to ban/unban members (admins can always ban)';
COMMENT ON COLUMN groups.moderator_can_approve_posts IS 'Allow moderators to approve pending posts (admins can always approve)';
COMMENT ON COLUMN groups.moderator_can_approve_members IS 'Allow moderators to approve membership requests (admins can always approve)';
COMMENT ON COLUMN groups.moderator_can_pin_posts IS 'Allow moderators to pin/unpin posts (admins can always pin)';
COMMENT ON COLUMN groups.moderator_can_lock_posts IS 'Allow moderators to lock/unlock posts (admins can always lock)';


-- ============================================================================
-- MIGRATION: 013_post_type_controls.sql
-- ============================================================================
-- Migration: 013 - Post Type Controls
-- Description: Add granular controls for different post types in groups
-- Date: 2025-10-20
-- Requires: 009_group_system.sql

-- Add post type control columns to groups table
ALTER TABLE groups ADD COLUMN IF NOT EXISTS allow_text_posts BOOLEAN DEFAULT TRUE;
ALTER TABLE groups ADD COLUMN IF NOT EXISTS allow_link_posts BOOLEAN DEFAULT TRUE;
ALTER TABLE groups ADD COLUMN IF NOT EXISTS allow_image_posts BOOLEAN DEFAULT TRUE;
ALTER TABLE groups ADD COLUMN IF NOT EXISTS allow_video_posts BOOLEAN DEFAULT TRUE;
ALTER TABLE groups ADD COLUMN IF NOT EXISTS allow_poll_posts BOOLEAN DEFAULT TRUE;

-- Add rules column for group rules/guidelines
ALTER TABLE groups ADD COLUMN IF NOT EXISTS rules TEXT;

-- Update existing groups to have all post types enabled by default
UPDATE groups SET
  allow_text_posts = TRUE,
  allow_link_posts = TRUE,
  allow_image_posts = TRUE,
  allow_video_posts = TRUE,
  allow_poll_posts = TRUE
WHERE allow_text_posts IS NULL OR allow_link_posts IS NULL OR allow_image_posts IS NULL OR allow_video_posts IS NULL OR allow_poll_posts IS NULL;


-- ============================================================================
-- MIGRATION: 014_profile_enhancements.sql
-- ============================================================================
-- Migration: 014 - Profile Enhancements
-- Description: Add profile customization fields (banner, website, social links, job info)
-- Date: 2025-10-20
-- Requires: existing users table

-- Add profile customization columns
ALTER TABLE users ADD COLUMN IF NOT EXISTS banner_url CHARACTER VARYING(500);
ALTER TABLE users ADD COLUMN IF NOT EXISTS website CHARACTER VARYING(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS twitter_handle CHARACTER VARYING(50);
ALTER TABLE users ADD COLUMN IF NOT EXISTS linkedin_url CHARACTER VARYING(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS github_username CHARACTER VARYING(50);
ALTER TABLE users ADD COLUMN IF NOT EXISTS job_title CHARACTER VARYING(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS company CHARACTER VARYING(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS tagline CHARACTER VARYING(200);

-- Add profile visibility settings
ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_visibility CHARACTER VARYING(20) DEFAULT 'public';

-- Add constraint for profile visibility
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'users_profile_visibility_check'
    ) THEN
        ALTER TABLE users ADD CONSTRAINT users_profile_visibility_check
        CHECK (profile_visibility IN ('public', 'followers', 'private'));
    END IF;
END$$;

-- Create index for profile visibility queries
CREATE INDEX IF NOT EXISTS idx_users_profile_visibility ON users(profile_visibility);


-- ============================================================================
-- MIGRATION: 015_interests_and_skills.sql
-- ============================================================================
-- Migration: 015 - Interests and Skills
-- Description: Add hobbies, skills, favorite pets, and expertise with enumerated types
-- Date: 2025-10-21
-- Requires: existing users table

-- =====================================================
-- CREATE ENUM TYPES
-- =====================================================

-- Hobbies enum type
DO $$ BEGIN
    CREATE TYPE hobby_type AS ENUM (
        -- Technology & Computing
        'computers',
        'computer_programming',
        'web_development',
        'game_development',
        'robotics',
        'electronics',
        '3d_printing',
        'drones',
        'virtual_reality',
        'cryptocurrency',

        -- Creative & Arts
        'painting',
        'drawing',
        'photography',
        'videography',
        'graphic_design',
        'writing',
        'poetry',
        'blogging',
        'music',
        'singing',
        'playing_instrument',
        'composing_music',
        'dancing',
        'acting',
        'theater',
        'sculpting',
        'pottery',
        'calligraphy',

        -- Crafts & DIY
        'woodworking',
        'metalworking',
        'jewelry_making',
        'knitting',
        'crocheting',
        'sewing',
        'quilting',
        'embroidery',
        'candle_making',
        'soap_making',
        'leatherworking',
        'origami',
        'model_building',

        -- Outdoor & Nature
        'hiking',
        'camping',
        'backpacking',
        'rock_climbing',
        'mountaineering',
        'fishing',
        'hunting',
        'bird_watching',
        'gardening',
        'landscaping',
        'foraging',
        'astronomy',
        'stargazing',

        -- Sports & Fitness
        'running',
        'cycling',
        'swimming',
        'yoga',
        'martial_arts',
        'boxing',
        'weightlifting',
        'crossfit',
        'soccer',
        'basketball',
        'tennis',
        'golf',
        'skiing',
        'snowboarding',
        'skateboarding',
        'surfing',
        'kayaking',
        'sailing',

        -- Animals & Pets
        'bird_breeding',
        'dog_training',
        'cat_care',
        'aquariums',
        'fish_keeping',
        'reptile_keeping',
        'horse_riding',
        'beekeeping',

        -- Collecting
        'coin_collecting',
        'stamp_collecting',
        'antiques',
        'vinyl_records',
        'comic_books',
        'action_figures',
        'trading_cards',

        -- Games & Entertainment
        'video_games',
        'board_games',
        'card_games',
        'chess',
        'puzzles',
        'escape_rooms',

        -- Food & Drink
        'cooking',
        'baking',
        'grilling',
        'wine_tasting',
        'beer_brewing',
        'coffee_roasting',
        'mixology',

        -- Learning & Education
        'reading',
        'languages',
        'history',
        'philosophy',
        'science',
        'mathematics',
        'podcasts',

        -- Travel & Culture
        'traveling',
        'road_trips',
        'cultural_exploration',
        'volunteering',

        -- Other
        'meditation',
        'magic_tricks',
        'genealogy',
        'auto_restoration',
        'home_improvement',
        'interior_design',
        'fashion',
        'cosplay'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Skills enum type
DO $$ BEGIN
    CREATE TYPE skill_type AS ENUM (
        -- Programming Languages
        'javascript',
        'typescript',
        'python',
        'java',
        'csharp',
        'cpp',
        'c',
        'ruby',
        'php',
        'swift',
        'kotlin',
        'go',
        'rust',
        'scala',
        'r',
        'matlab',
        'sql',
        'html_css',

        -- Web Development
        'react',
        'angular',
        'vue',
        'nodejs',
        'express',
        'django',
        'flask',
        'spring',
        'asp_net',
        'laravel',
        'wordpress',

        -- Mobile Development
        'ios_development',
        'android_development',
        'react_native',
        'flutter',

        -- Database
        'postgresql',
        'mysql',
        'mongodb',
        'redis',
        'oracle',
        'sql_server',

        -- Cloud & DevOps
        'aws',
        'azure',
        'google_cloud',
        'docker',
        'kubernetes',
        'jenkins',
        'git',
        'ci_cd',
        'terraform',

        -- Data Science & AI
        'machine_learning',
        'deep_learning',
        'data_analysis',
        'data_visualization',
        'nlp',
        'computer_vision',
        'tensorflow',
        'pytorch',

        -- Design
        'ui_ux_design',
        'graphic_design',
        'web_design',
        'photoshop',
        'illustrator',
        'figma',
        'sketch',
        '3d_modeling',
        'animation',
        'video_editing',

        -- Business & Management
        'project_management',
        'agile',
        'scrum',
        'product_management',
        'business_analysis',
        'marketing',
        'digital_marketing',
        'seo',
        'content_marketing',
        'sales',
        'customer_service',
        'leadership',
        'team_management',

        -- Communication
        'public_speaking',
        'technical_writing',
        'copywriting',
        'presentation',
        'negotiation',

        -- Creative
        'photography',
        'videography',
        'music_production',
        'sound_design',
        'writing',

        -- Engineering
        'mechanical_engineering',
        'electrical_engineering',
        'civil_engineering',
        'chemical_engineering',
        'cad',
        'autocad',

        -- Finance & Accounting
        'accounting',
        'bookkeeping',
        'financial_analysis',
        'excel',
        'quickbooks',

        -- Languages
        'spanish',
        'french',
        'german',
        'chinese',
        'japanese',
        'korean',
        'arabic',
        'russian',
        'portuguese',
        'italian',

        -- Other
        'teaching',
        'research',
        'troubleshooting',
        'problem_solving',
        'critical_thinking',
        'data_entry',
        'typing'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Favorite Pets enum type
DO $$ BEGIN
    CREATE TYPE pet_type AS ENUM (
        -- Dogs
        'dog',
        'labrador',
        'german_shepherd',
        'golden_retriever',
        'bulldog',
        'beagle',
        'poodle',
        'rottweiler',
        'dachshund',
        'husky',
        'chihuahua',
        'corgi',
        'border_collie',
        'great_dane',
        'doberman',

        -- Cats
        'cat',
        'persian_cat',
        'maine_coon',
        'siamese_cat',
        'ragdoll_cat',
        'bengal_cat',
        'british_shorthair',
        'sphynx_cat',

        -- Birds
        'parrot',
        'parakeet',
        'cockatiel',
        'canary',
        'finch',
        'lovebird',
        'macaw',
        'cockatoo',
        'budgie',
        'african_grey',

        -- Small Mammals
        'rabbit',
        'hamster',
        'guinea_pig',
        'ferret',
        'gerbil',
        'chinchilla',
        'hedgehog',
        'mouse',
        'rat',

        -- Reptiles
        'snake',
        'lizard',
        'gecko',
        'bearded_dragon',
        'iguana',
        'turtle',
        'tortoise',
        'chameleon',

        -- Aquatic
        'fish',
        'goldfish',
        'betta_fish',
        'tropical_fish',
        'koi',

        -- Amphibians
        'frog',
        'toad',
        'salamander',
        'axolotl',

        -- Farm Animals
        'horse',
        'pony',
        'goat',
        'sheep',
        'chicken',
        'duck',
        'pig',
        'cow',

        -- Other
        'tarantula',
        'hermit_crab',
        'sugar_glider',
        'pot_bellied_pig'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Expertise enum type
DO $$ BEGIN
    CREATE TYPE expertise_type AS ENUM (
        -- Technology
        'software_engineering',
        'full_stack_development',
        'frontend_development',
        'backend_development',
        'mobile_development',
        'game_development',
        'devops',
        'cloud_architecture',
        'cybersecurity',
        'network_security',
        'information_security',
        'penetration_testing',
        'blockchain',
        'cryptocurrency',

        -- Data & AI
        'data_science',
        'machine_learning',
        'artificial_intelligence',
        'data_engineering',
        'big_data',
        'business_intelligence',
        'data_analytics',
        'statistics',

        -- Design
        'user_experience',
        'user_interface',
        'product_design',
        'graphic_design',
        'motion_graphics',
        '3d_design',
        'industrial_design',
        'interior_design',
        'architecture',

        -- Business & Management
        'business_strategy',
        'project_management',
        'product_management',
        'operations_management',
        'supply_chain',
        'logistics',
        'entrepreneurship',
        'startup_advisory',
        'venture_capital',

        -- Marketing & Sales
        'digital_marketing',
        'content_strategy',
        'social_media_marketing',
        'brand_management',
        'growth_hacking',
        'seo_sem',
        'email_marketing',
        'sales_strategy',
        'business_development',

        -- Finance
        'financial_analysis',
        'investment_banking',
        'portfolio_management',
        'accounting',
        'tax_planning',
        'auditing',
        'corporate_finance',
        'trading',

        -- Healthcare
        'medicine',
        'nursing',
        'surgery',
        'pediatrics',
        'cardiology',
        'neurology',
        'psychiatry',
        'physical_therapy',
        'nutrition',
        'pharmacy',

        -- Science & Research
        'biology',
        'chemistry',
        'physics',
        'environmental_science',
        'neuroscience',
        'genetics',
        'biotechnology',
        'research_methodology',

        -- Engineering
        'mechanical_engineering',
        'electrical_engineering',
        'civil_engineering',
        'chemical_engineering',
        'aerospace_engineering',
        'biomedical_engineering',
        'robotics',
        'automation',

        -- Legal
        'law',
        'corporate_law',
        'intellectual_property',
        'contract_law',
        'tax_law',
        'criminal_law',
        'compliance',

        -- Education
        'teaching',
        'curriculum_development',
        'educational_technology',
        'training_development',
        'academic_research',

        -- Creative
        'writing',
        'journalism',
        'creative_writing',
        'copywriting',
        'photography',
        'videography',
        'film_production',
        'music_production',
        'sound_engineering',

        -- Consulting
        'management_consulting',
        'it_consulting',
        'hr_consulting',
        'strategy_consulting',

        -- Human Resources
        'talent_acquisition',
        'organizational_development',
        'compensation_benefits',
        'employee_relations',

        -- Real Estate
        'real_estate',
        'property_management',
        'real_estate_investing',

        -- Manufacturing
        'manufacturing',
        'quality_assurance',
        'lean_manufacturing',
        'six_sigma',

        -- Other
        'customer_success',
        'technical_support',
        'system_administration',
        'database_administration'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- =====================================================
-- ADD COLUMNS TO USERS TABLE
-- =====================================================

-- Add array columns for interests and skills
ALTER TABLE users ADD COLUMN IF NOT EXISTS hobbies hobby_type[];
ALTER TABLE users ADD COLUMN IF NOT EXISTS skills skill_type[];
ALTER TABLE users ADD COLUMN IF NOT EXISTS favorite_pets pet_type[];
ALTER TABLE users ADD COLUMN IF NOT EXISTS expertise expertise_type[];

-- Create indexes for array columns (using GIN for efficient array searches)
CREATE INDEX IF NOT EXISTS idx_users_hobbies ON users USING GIN (hobbies);
CREATE INDEX IF NOT EXISTS idx_users_skills ON users USING GIN (skills);
CREATE INDEX IF NOT EXISTS idx_users_favorite_pets ON users USING GIN (favorite_pets);
CREATE INDEX IF NOT EXISTS idx_users_expertise ON users USING GIN (expertise);

-- Add comments for documentation
COMMENT ON COLUMN users.hobbies IS 'Array of user hobbies and interests';
COMMENT ON COLUMN users.skills IS 'Array of user professional skills';
COMMENT ON COLUMN users.favorite_pets IS 'Array of user favorite pet types';
COMMENT ON COLUMN users.expertise IS 'Array of user areas of expertise';


-- ============================================================================
-- MIGRATION: 016_expand_interests_enums.sql
-- ============================================================================
-- Migration: 016 - Expand Interests and Skills Enums
-- Description: Massively expand hobbies, skills, pets (with individual breeds), and expertise
-- Date: 2025-10-21
-- Requires: migration 015

-- =====================================================
-- DROP AND RECREATE ENUM TYPES WITH EXPANDED OPTIONS
-- =====================================================

-- First, we need to drop the columns that use these types
ALTER TABLE users DROP COLUMN IF EXISTS hobbies CASCADE;
ALTER TABLE users DROP COLUMN IF EXISTS skills CASCADE;
ALTER TABLE users DROP COLUMN IF EXISTS favorite_pets CASCADE;
ALTER TABLE users DROP COLUMN IF EXISTS expertise CASCADE;

-- Drop the old enum types
DROP TYPE IF EXISTS hobby_type CASCADE;
DROP TYPE IF EXISTS skill_type CASCADE;
DROP TYPE IF EXISTS pet_type CASCADE;
DROP TYPE IF EXISTS expertise_type CASCADE;

-- =====================================================
-- HOBBIES (250+ options)
-- =====================================================
CREATE TYPE hobby_type AS ENUM (
    -- Technology & Computing
    'computers',
    'computer_programming',
    'web_development',
    'mobile_app_development',
    'game_development',
    'software_engineering',
    'robotics',
    'electronics',
    'arduino',
    'raspberry_pi',
    '3d_printing',
    'cnc_machining',
    'drones',
    'fpv_racing',
    'virtual_reality',
    'augmented_reality',
    'cryptocurrency',
    'blockchain',
    'ethical_hacking',
    'cybersecurity',
    'networking',
    'home_automation',
    'smart_home',
    'ham_radio',
    'amateur_radio',
    'retro_computing',
    'vintage_electronics',
    'circuit_design',
    'pcb_design',
    'soldering',

    -- Creative & Arts - Visual
    'painting',
    'oil_painting',
    'watercolor',
    'acrylic_painting',
    'drawing',
    'sketching',
    'charcoal_drawing',
    'pen_and_ink',
    'digital_art',
    'illustration',
    'animation',
    'cartoon_drawing',
    'manga',
    'anime_art',
    'comic_art',
    'graffiti',
    'street_art',
    'mural_painting',
    'photography',
    'landscape_photography',
    'portrait_photography',
    'wildlife_photography',
    'macro_photography',
    'astrophotography',
    'street_photography',
    'film_photography',
    'drone_photography',
    'videography',
    'filmmaking',
    'video_editing',
    'cinematography',
    'graphic_design',
    'logo_design',
    'typography',
    'sculpting',
    'clay_sculpting',
    'wood_carving',
    'stone_carving',
    'ice_sculpting',
    'pottery',
    'ceramics',
    'glassblowing',
    'stained_glass',

    -- Creative & Arts - Performing
    'music',
    'singing',
    'playing_piano',
    'playing_guitar',
    'playing_bass',
    'playing_drums',
    'playing_violin',
    'playing_cello',
    'playing_saxophone',
    'playing_trumpet',
    'playing_flute',
    'playing_ukulele',
    'playing_banjo',
    'dj_mixing',
    'music_production',
    'beat_making',
    'composing_music',
    'songwriting',
    'rapping',
    'beatboxing',
    'karaoke',
    'dancing',
    'ballet',
    'hip_hop_dance',
    'ballroom_dancing',
    'salsa',
    'tango',
    'breakdancing',
    'contemporary_dance',
    'tap_dancing',
    'swing_dancing',
    'acting',
    'theater',
    'improv',
    'stand_up_comedy',
    'magic_tricks',
    'juggling',
    'puppetry',
    'ventriloquism',

    -- Writing & Literature
    'writing',
    'creative_writing',
    'fiction_writing',
    'novel_writing',
    'short_stories',
    'poetry',
    'screenwriting',
    'playwriting',
    'blogging',
    'journalism',
    'copywriting',
    'technical_writing',
    'memoir_writing',
    'fan_fiction',
    'calligraphy',
    'hand_lettering',
    'bookbinding',

    -- Crafts & DIY
    'woodworking',
    'furniture_making',
    'wood_turning',
    'carpentry',
    'metalworking',
    'blacksmithing',
    'welding',
    'machining',
    'jewelry_making',
    'silversmithing',
    'goldsmithing',
    'beading',
    'wire_wrapping',
    'resin_art',
    'knitting',
    'crocheting',
    'sewing',
    'quilting',
    'embroidery',
    'cross_stitch',
    'needlepoint',
    'macrame',
    'weaving',
    'spinning_yarn',
    'felting',
    'tie_dye',
    'batik',
    'candle_making',
    'soap_making',
    'perfume_making',
    'cosmetics_making',
    'leatherworking',
    'leather_tooling',
    'origami',
    'paper_crafts',
    'scrapbooking',
    'card_making',
    'model_building',
    'scale_modeling',
    'miniatures',
    'diorama_building',
    'rc_cars',
    'rc_planes',
    'rc_boats',
    'lego_building',
    'upholstery',
    'furniture_restoration',
    'stenciling',

    -- Outdoor & Nature
    'hiking',
    'backpacking',
    'camping',
    'bushcraft',
    'survival_skills',
    'rock_climbing',
    'bouldering',
    'mountaineering',
    'ice_climbing',
    'caving',
    'spelunking',
    'fishing',
    'fly_fishing',
    'ice_fishing',
    'deep_sea_fishing',
    'hunting',
    'bow_hunting',
    'bird_watching',
    'wildlife_watching',
    'nature_photography',
    'gardening',
    'vegetable_gardening',
    'flower_gardening',
    'hydroponics',
    'aquaponics',
    'permaculture',
    'landscaping',
    'bonsai',
    'orchid_growing',
    'mushroom_foraging',
    'foraging',
    'herbalism',
    'astronomy',
    'stargazing',
    'telescope_making',
    'geocaching',
    'orienteering',
    'metal_detecting',
    'fossil_hunting',
    'rockhounding',
    'mineral_collecting',

    -- Sports & Fitness
    'running',
    'marathon_running',
    'trail_running',
    'ultra_running',
    'sprinting',
    'jogging',
    'cycling',
    'mountain_biking',
    'road_cycling',
    'bmx',
    'triathlon',
    'swimming',
    'diving',
    'scuba_diving',
    'freediving',
    'snorkeling',
    'yoga',
    'pilates',
    'tai_chi',
    'qigong',
    'martial_arts',
    'karate',
    'judo',
    'taekwondo',
    'brazilian_jiu_jitsu',
    'kickboxing',
    'muay_thai',
    'boxing',
    'mma',
    'wrestling',
    'fencing',
    'kendo',
    'archery',
    'weightlifting',
    'powerlifting',
    'bodybuilding',
    'crossfit',
    'calisthenics',
    'parkour',
    'soccer',
    'football',
    'basketball',
    'baseball',
    'softball',
    'volleyball',
    'tennis',
    'badminton',
    'table_tennis',
    'ping_pong',
    'squash',
    'racquetball',
    'golf',
    'disc_golf',
    'bowling',
    'cricket',
    'rugby',
    'hockey',
    'ice_hockey',
    'field_hockey',
    'lacrosse',
    'skiing',
    'downhill_skiing',
    'cross_country_skiing',
    'snowboarding',
    'snowshoeing',
    'ice_skating',
    'figure_skating',
    'skateboarding',
    'longboarding',
    'surfing',
    'windsurfing',
    'kitesurfing',
    'paddleboarding',
    'kayaking',
    'canoeing',
    'rowing',
    'sailing',
    'yachting',
    'wakeboarding',
    'water_skiing',
    'jet_skiing',
    'paragliding',
    'hang_gliding',
    'skydiving',
    'base_jumping',
    'bungee_jumping',
    'rock_crawling',
    'off_roading',
    'motocross',
    'go_karting',

    -- Animals & Pets
    'dog_training',
    'dog_showing',
    'dog_agility',
    'cat_care',
    'cat_showing',
    'bird_breeding',
    'falconry',
    'pigeon_racing',
    'chicken_keeping',
    'aquariums',
    'fish_keeping',
    'reef_keeping',
    'aquascaping',
    'koi_keeping',
    'reptile_keeping',
    'snake_keeping',
    'lizard_keeping',
    'turtle_keeping',
    'horse_riding',
    'dressage',
    'show_jumping',
    'barrel_racing',
    'horse_training',
    'polo',
    'beekeeping',
    'backyard_chickens',

    -- Collecting
    'coin_collecting',
    'stamp_collecting',
    'postcard_collecting',
    'antiques',
    'vintage_items',
    'art_collecting',
    'vinyl_records',
    'cd_collecting',
    'cassette_tapes',
    'comic_books',
    'action_figures',
    'toy_collecting',
    'diecast_cars',
    'trading_cards',
    'sports_cards',
    'pokemon_cards',
    'magic_cards',
    'book_collecting',
    'rare_books',
    'first_editions',
    'autograph_collecting',
    'memorabilia',
    'sneaker_collecting',
    'watch_collecting',
    'knife_collecting',
    'pen_collecting',
    'fountain_pens',
    'military_memorabilia',
    'rock_collecting',
    'shell_collecting',
    'insect_collecting',
    'butterfly_collecting',

    -- Games & Entertainment
    'video_games',
    'pc_gaming',
    'console_gaming',
    'retro_gaming',
    'speedrunning',
    'game_streaming',
    'esports',
    'board_games',
    'tabletop_gaming',
    'dungeons_and_dragons',
    'warhammer',
    'miniature_wargaming',
    'card_games',
    'magic_the_gathering',
    'poker',
    'bridge',
    'chess',
    'go',
    'checkers',
    'backgammon',
    'puzzles',
    'jigsaw_puzzles',
    'rubiks_cube',
    'speedcubing',
    'sudoku',
    'crossword_puzzles',
    'escape_rooms',
    'laser_tag',
    'paintball',
    'airsoft',
    'cosplay',
    'costume_making',
    'prop_making',

    -- Food & Drink
    'cooking',
    'gourmet_cooking',
    'baking',
    'bread_baking',
    'cake_decorating',
    'pastry_making',
    'chocolate_making',
    'candy_making',
    'grilling',
    'smoking_meat',
    'bbq',
    'pizza_making',
    'pasta_making',
    'sushi_making',
    'cheese_making',
    'fermentation',
    'pickling',
    'canning',
    'preserving',
    'wine_making',
    'wine_tasting',
    'sommelier',
    'beer_brewing',
    'homebrewing',
    'beer_tasting',
    'cider_making',
    'mead_making',
    'distilling',
    'coffee_roasting',
    'coffee_tasting',
    'latte_art',
    'tea_tasting',
    'tea_ceremony',
    'mixology',
    'cocktail_making',
    'molecular_gastronomy',
    'food_photography',

    -- Learning & Education
    'reading',
    'speed_reading',
    'book_clubs',
    'language_learning',
    'linguistics',
    'history',
    'genealogy',
    'family_history',
    'philosophy',
    'theology',
    'science',
    'physics',
    'chemistry',
    'biology',
    'mathematics',
    'psychology',
    'sociology',
    'anthropology',
    'archaeology',
    'paleontology',
    'podcasts',
    'podcast_production',
    'audiobooks',
    'online_courses',
    'moocs',
    'tutoring',
    'teaching',

    -- Travel & Culture
    'traveling',
    'road_trips',
    'vanlife',
    'rv_travel',
    'cruises',
    'cultural_exploration',
    'urban_exploration',
    'abandoned_places',
    'historical_sites',
    'museums',
    'volunteering',
    'humanitarian_work',
    'sustainable_living',
    'minimalism',
    'tiny_houses',

    -- Miscellaneous
    'meditation',
    'mindfulness',
    'breathwork',
    'spiritual_practices',
    'astrology',
    'tarot',
    'palm_reading',
    'numerology',
    'ancestry_research',
    'auto_restoration',
    'classic_cars',
    'car_detailing',
    'motorcycle_riding',
    'motorcycle_restoration',
    'home_improvement',
    'diy_projects',
    'interior_design',
    'home_decor',
    'feng_shui',
    'fashion',
    'fashion_design',
    'upcycling_clothes',
    'thrifting',
    'vintage_fashion',
    'makeup_artistry',
    'special_effects_makeup',
    'nail_art',
    'hair_styling',
    'barbering',
    'tattooing',
    'body_art',
    'piercing',
    'lockpicking',
    'locksmith',
    'knife_making',
    'bladesmithing',
    'gunsmithing',
    'reloading',
    'target_shooting',
    'competitive_shooting',
    'traphooting'
);

-- =====================================================
-- SKILLS (300+ options)
-- =====================================================
CREATE TYPE skill_type AS ENUM (
    -- Programming Languages
    'javascript',
    'typescript',
    'python',
    'java',
    'csharp',
    'cpp',
    'c',
    'ruby',
    'php',
    'swift',
    'objective_c',
    'kotlin',
    'go',
    'rust',
    'scala',
    'r',
    'matlab',
    'julia',
    'perl',
    'lua',
    'haskell',
    'elixir',
    'erlang',
    'clojure',
    'f_sharp',
    'dart',
    'sql',
    'plsql',
    'tsql',
    'nosql',
    'html',
    'css',
    'sass',
    'less',
    'html_css',
    'xml',
    'json',
    'yaml',
    'graphql',
    'assembly',
    'vb_net',
    'fortran',
    'cobol',
    'groovy',
    'powershell',
    'bash',
    'shell_scripting',

    -- Web Development - Frontend
    'react',
    'react_native',
    'vue',
    'vuejs',
    'angular',
    'angularjs',
    'svelte',
    'ember',
    'backbone',
    'jquery',
    'webpack',
    'vite',
    'parcel',
    'gulp',
    'grunt',
    'babel',
    'next_js',
    'nuxt',
    'gatsby',
    'redux',
    'mobx',
    'vuex',
    'pinia',
    'rxjs',
    'axios',
    'fetch_api',
    'websockets',
    'webrtc',
    'pwa',
    'service_workers',
    'web_components',
    'material_ui',
    'ant_design',
    'tailwind_css',
    'bootstrap',
    'foundation',
    'bulma',
    'chakra_ui',
    'semantic_ui',
    'responsive_design',
    'mobile_first_design',
    'accessibility',
    'wcag',
    'seo',
    'web_performance',
    'lighthouse',

    -- Web Development - Backend
    'nodejs',
    'express',
    'nestjs',
    'koa',
    'fastify',
    'django',
    'flask',
    'fastapi',
    'pyramid',
    'tornado',
    'spring',
    'spring_boot',
    'hibernate',
    'asp_net',
    'asp_net_core',
    'laravel',
    'symfony',
    'codeigniter',
    'rails',
    'ruby_on_rails',
    'sinatra',
    'phoenix',
    'gin',
    'echo',
    'fiber',
    'actix',
    'rocket',
    'wordpress',
    'drupal',
    'joomla',
    'shopify',
    'magento',
    'woocommerce',
    'strapi',
    'contentful',
    'sanity',
    'rest_api',
    'graphql_api',
    'grpc',
    'soap',
    'microservices',
    'serverless',
    'lambda',
    'api_gateway',

    -- Mobile Development
    'ios_development',
    'android_development',
    'flutter',
    'xamarin',
    'ionic',
    'cordova',
    'phonegap',
    'swiftui',
    'jetpack_compose',
    'nativescript',

    -- Database
    'postgresql',
    'mysql',
    'mariadb',
    'sqlite',
    'mongodb',
    'redis',
    'elasticsearch',
    'cassandra',
    'dynamodb',
    'couchdb',
    'neo4j',
    'graph_databases',
    'oracle',
    'sql_server',
    'db2',
    'firestore',
    'realm',
    'indexeddb',
    'database_design',
    'database_optimization',
    'query_optimization',
    'etl',
    'data_warehousing',
    'data_lakes',
    'snowflake',
    'bigquery',
    'redshift',

    -- Cloud & DevOps
    'aws',
    'ec2',
    's3',
    'aws_lambda',
    'cloudformation',
    'aws_cdk',
    'azure',
    'azure_devops',
    'google_cloud',
    'gcp',
    'digitalocean',
    'linode',
    'heroku',
    'netlify',
    'vercel',
    'cloudflare',
    'docker',
    'docker_compose',
    'kubernetes',
    'k8s',
    'helm',
    'openshift',
    'jenkins',
    'gitlab_ci',
    'github_actions',
    'circle_ci',
    'travis_ci',
    'bamboo',
    'teamcity',
    'git',
    'github',
    'gitlab',
    'bitbucket',
    'svn',
    'mercurial',
    'ci_cd',
    'terraform',
    'ansible',
    'puppet',
    'chef',
    'saltstack',
    'vagrant',
    'packer',
    'consul',
    'vault',
    'prometheus',
    'grafana',
    'elk_stack',
    'splunk',
    'datadog',
    'new_relic',
    'monitoring',
    'logging',
    'infrastructure_as_code',
    'gitops',
    'argocd',
    'flux',

    -- Data Science & AI
    'machine_learning',
    'deep_learning',
    'neural_networks',
    'cnn',
    'rnn',
    'lstm',
    'gru',
    'transformers',
    'bert',
    'gpt',
    'data_analysis',
    'data_visualization',
    'data_mining',
    'statistics',
    'probability',
    'linear_algebra',
    'calculus',
    'nlp',
    'natural_language_processing',
    'computer_vision',
    'image_recognition',
    'object_detection',
    'tensorflow',
    'pytorch',
    'keras',
    'scikit_learn',
    'pandas',
    'numpy',
    'matplotlib',
    'seaborn',
    'plotly',
    'tableau',
    'power_bi',
    'r_programming',
    'jupyter',
    'apache_spark',
    'hadoop',
    'hive',
    'pig',
    'reinforcement_learning',
    'supervised_learning',
    'unsupervised_learning',
    'semi_supervised_learning',
    'time_series_analysis',
    'forecasting',
    'anomaly_detection',
    'recommendation_systems',
    'ab_testing',
    'experiment_design',
    'causal_inference',

    -- Design
    'ui_design',
    'ux_design',
    'ui_ux_design',
    'user_research',
    'usability_testing',
    'wireframing',
    'prototyping',
    'user_personas',
    'user_journey_mapping',
    'information_architecture',
    'interaction_design',
    'motion_design',
    'graphic_design',
    'brand_design',
    'logo_design',
    'web_design',
    'mobile_design',
    'print_design',
    'packaging_design',
    'typography',
    'color_theory',
    'photoshop',
    'illustrator',
    'indesign',
    'after_effects',
    'premiere_pro',
    'figma',
    'sketch',
    'adobe_xd',
    'invision',
    'framer',
    '3d_modeling',
    'blender',
    'maya',
    '3ds_max',
    'cinema_4d',
    'zbrush',
    'substance_painter',
    'unity',
    'unreal_engine',
    'animation',
    'character_animation',
    'rigging',
    'video_editing',
    'sound_design',
    'audio_engineering',

    -- Business & Management
    'project_management',
    'program_management',
    'portfolio_management',
    'agile',
    'scrum',
    'kanban',
    'lean',
    'six_sigma',
    'prince2',
    'pmp',
    'waterfall',
    'product_management',
    'product_development',
    'roadmapping',
    'prioritization',
    'stakeholder_management',
    'business_analysis',
    'requirements_gathering',
    'process_improvement',
    'change_management',
    'risk_management',
    'budget_management',
    'resource_planning',
    'marketing',
    'digital_marketing',
    'content_marketing',
    'inbound_marketing',
    'outbound_marketing',
    'email_marketing',
    'marketing_automation',
    'sem',
    'ppc',
    'google_ads',
    'facebook_ads',
    'social_media_marketing',
    'influencer_marketing',
    'affiliate_marketing',
    'growth_marketing',
    'growth_hacking',
    'conversion_optimization',
    'analytics',
    'google_analytics',
    'tag_manager',
    'brand_management',
    'brand_strategy',
    'public_relations',
    'crisis_management',
    'sales',
    'b2b_sales',
    'b2c_sales',
    'enterprise_sales',
    'inside_sales',
    'outside_sales',
    'account_management',
    'customer_success',
    'customer_service',
    'customer_support',
    'technical_support',
    'help_desk',
    'crm',
    'salesforce',
    'hubspot',
    'zoho',
    'pipedrive',
    'leadership',
    'team_management',
    'people_management',
    'coaching',
    'mentoring',
    'conflict_resolution',
    'negotiation',
    'strategic_thinking',
    'strategic_planning',
    'business_development',
    'partnership_development',
    'fundraising',
    'investor_relations',
    'venture_capital',
    'entrepreneurship',

    -- Communication
    'public_speaking',
    'presentation_skills',
    'storytelling',
    'technical_writing',
    'documentation',
    'copywriting',
    'content_writing',
    'editing',
    'proofreading',
    'translation',
    'interpretation',
    'active_listening',
    'empathy',
    'emotional_intelligence',

    -- Creative
    'photography',
    'portrait_photography',
    'landscape_photography',
    'product_photography',
    'food_photography',
    'videography',
    'video_production',
    'music_production',
    'audio_production',
    'sound_engineering',
    'mixing',
    'mastering',
    'songwriting',
    'composition',
    'arranging',
    'conducting',
    'writing',
    'creative_writing',
    'journalism',
    'blogging',
    'podcasting',

    -- Engineering
    'mechanical_engineering',
    'electrical_engineering',
    'civil_engineering',
    'chemical_engineering',
    'aerospace_engineering',
    'biomedical_engineering',
    'industrial_engineering',
    'systems_engineering',
    'robotics',
    'automation',
    'plc_programming',
    'scada',
    'hmi',
    'cad',
    'autocad',
    'solidworks',
    'catia',
    'inventor',
    'fusion_360',
    'creo',
    'revit',
    'bim',
    'fem_analysis',
    'cfd',
    'matlab_simulink',
    'labview',

    -- Finance & Accounting
    'accounting',
    'bookkeeping',
    'financial_accounting',
    'management_accounting',
    'cost_accounting',
    'tax_accounting',
    'auditing',
    'internal_audit',
    'external_audit',
    'financial_analysis',
    'financial_modeling',
    'valuation',
    'investment_analysis',
    'risk_analysis',
    'financial_planning',
    'budgeting',
    'excel',
    'advanced_excel',
    'vba',
    'power_query',
    'power_pivot',
    'quickbooks',
    'xero',
    'sage',
    'sap',
    'oracle_financials',
    'netsuite',
    'bloomberg_terminal',
    'eikon',
    'trading',
    'forex',
    'stocks',
    'options',
    'futures',
    'derivatives',
    'crypto_trading',

    -- Languages
    'english',
    'spanish',
    'french',
    'german',
    'italian',
    'portuguese',
    'russian',
    'chinese',
    'mandarin',
    'cantonese',
    'japanese',
    'korean',
    'arabic',
    'hindi',
    'bengali',
    'urdu',
    'turkish',
    'dutch',
    'polish',
    'swedish',
    'norwegian',
    'danish',
    'finnish',
    'greek',
    'hebrew',
    'thai',
    'vietnamese',
    'indonesian',
    'malay',
    'tagalog',
    'swahili',

    -- Other
    'teaching',
    'curriculum_development',
    'instructional_design',
    'e_learning',
    'lms',
    'research',
    'academic_research',
    'market_research',
    'qualitative_research',
    'quantitative_research',
    'survey_design',
    'troubleshooting',
    'debugging',
    'problem_solving',
    'critical_thinking',
    'analytical_thinking',
    'attention_to_detail',
    'time_management',
    'organization',
    'multitasking',
    'adaptability',
    'flexibility',
    'creativity',
    'innovation',
    'collaboration',
    'teamwork',
    'cross_functional_collaboration',
    'remote_work',
    'data_entry',
    'typing',
    'transcription',
    'virtual_assistance',
    'administrative_support',
    'office_management',
    'event_planning',
    'event_coordination',
    'supply_chain_management',
    'logistics',
    'procurement',
    'inventory_management',
    'quality_assurance',
    'quality_control',
    'iso_standards',
    'lean_manufacturing',
    'continuous_improvement',
    'kaizen'
);

-- =====================================================
-- PET TYPES - EXPANDED WITH SPECIFIC BREEDS (400+ options)
-- =====================================================
CREATE TYPE pet_type AS ENUM (
    -- Dog Breeds (150+)
    'dog_mixed_breed',
    'labrador_retriever',
    'golden_retriever',
    'german_shepherd',
    'french_bulldog',
    'bulldog',
    'english_bulldog',
    'american_bulldog',
    'poodle',
    'toy_poodle',
    'miniature_poodle',
    'standard_poodle',
    'beagle',
    'rottweiler',
    'german_shorthaired_pointer',
    'yorkshire_terrier',
    'dachshund',
    'boxer',
    'siberian_husky',
    'alaskan_malamute',
    'great_dane',
    'doberman_pinscher',
    'australian_shepherd',
    'miniature_schnauzer',
    'pembroke_welsh_corgi',
    'cardigan_welsh_corgi',
    'cavalier_king_charles_spaniel',
    'shih_tzu',
    'boston_terrier',
    'pomeranian',
    'shetland_sheepdog',
    'brittany',
    'mastiff',
    'english_mastiff',
    'bull_mastiff',
    'cane_corso',
    'english_springer_spaniel',
    'cocker_spaniel',
    'border_collie',
    'chihuahua',
    'bernese_mountain_dog',
    'pug',
    'english_cocker_spaniel',
    'vizsla',
    'weimaraner',
    'basset_hound',
    'newfoundland',
    'rhodesian_ridgeback',
    'shiba_inu',
    'akita',
    'bloodhound',
    'dalmatian',
    'bullterrier',
    'staffordshire_bull_terrier',
    'american_staffordshire_terrier',
    'pitbull',
    'american_pit_bull_terrier',
    'bichon_frise',
    'maltese',
    'havanese',
    'papillon',
    'great_pyrenees',
    'saint_bernard',
    'samoyed',
    'chow_chow',
    'collie',
    'rough_collie',
    'smooth_collie',
    'old_english_sheepdog',
    'west_highland_white_terrier',
    'scottish_terrier',
    'cairn_terrier',
    'jack_russell_terrier',
    'rat_terrier',
    'fox_terrier',
    'airedale_terrier',
    'irish_setter',
    'gordon_setter',
    'english_setter',
    'pointer',
    'chesapeake_bay_retriever',
    'flat_coated_retriever',
    'curly_coated_retriever',
    'irish_wolfhound',
    'scottish_deerhound',
    'greyhound',
    'italian_greyhound',
    'whippet',
    'afghan_hound',
    'saluki',
    'borzoi',
    'basenji',
    'pharaoh_hound',
    'ibizan_hound',
    'american_eskimo_dog',
    'finnish_spitz',
    'keeshond',
    'norwegian_elkhound',
    'chinese_shar_pei',
    'lhasa_apso',
    'tibetan_terrier',
    'tibetan_mastiff',
    'leonberger',
    'kuvasz',
    'komondor',
    'bouvier_des_flandres',
    'belgian_malinois',
    'belgian_tervuren',
    'belgian_sheepdog',
    'anatolian_shepherd',
    'australian_cattle_dog',
    'border_terrier',
    'norwich_terrier',
    'norfolk_terrier',
    'bedlington_terrier',
    'manchester_terrier',
    'miniature_pinscher',
    'australian_terrier',
    'silky_terrier',
    'affenpinscher',
    'brussels_griffon',
    'schipperke',
    'pekingese',
    'japanese_chin',
    'toy_fox_terrier',
    'chinese_crested',
    'xoloitzcuintli',
    'peruvian_inca_orchid',
    'catahoula_leopard_dog',
    'plott_hound',
    'redbone_coonhound',
    'bluetick_coonhound',
    'black_and_tan_coonhound',
    'treeing_walker_coonhound',

    -- Cat Breeds (80+)
    'cat_mixed_breed',
    'domestic_shorthair',
    'domestic_longhair',
    'persian_cat',
    'maine_coon',
    'siamese_cat',
    'ragdoll_cat',
    'bengal_cat',
    'british_shorthair',
    'scottish_fold',
    'american_shorthair',
    'abyssinian_cat',
    'sphynx_cat',
    'russian_blue',
    'oriental_shorthair',
    'devon_rex',
    'cornish_rex',
    'birman',
    'burmese_cat',
    'norwegian_forest_cat',
    'siberian_cat',
    'himalayan_cat',
    'exotic_shorthair',
    'ragamuffin',
    'turkish_angora',
    'turkish_van',
    'manx',
    'japanese_bobtail',
    'american_bobtail',
    'american_curl',
    'egyptian_mau',
    'ocicat',
    'savannah_cat',
    'toyger',
    'munchkin_cat',
    'selkirk_rex',
    'laperm',
    'somali_cat',
    'singapura',
    'tonkinese',
    'snowshoe_cat',
    'balinese_cat',
    'javanese_cat',
    'korat',
    'chartreux',
    'nebelung',
    'bombay_cat',
    'havana_brown',
    'chausie',
    'pixie_bob',
    'kurilian_bobtail',
    'peterbald',
    'donskoy',
    'lykoi',
    'khao_manee',
    'raas_cat',
    'sokoke',
    'cyprus_cat',
    'aegean_cat',
    'german_rex',
    'ural_rex',

    -- Birds (50+)
    'parakeet',
    'budgie',
    'budgerigar',
    'cockatiel',
    'cockatoo',
    'umbrella_cockatoo',
    'moluccan_cockatoo',
    'goffins_cockatoo',
    'african_grey_parrot',
    'congo_african_grey',
    'timneh_african_grey',
    'macaw',
    'blue_and_gold_macaw',
    'scarlet_macaw',
    'green_winged_macaw',
    'hyacinth_macaw',
    'amazon_parrot',
    'blue_fronted_amazon',
    'yellow_naped_amazon',
    'double_yellow_headed_amazon',
    'conure',
    'sun_conure',
    'green_cheek_conure',
    'jenday_conure',
    'nanday_conure',
    'lovebird',
    'fischers_lovebird',
    'peach_faced_lovebird',
    'canary',
    'finch',
    'zebra_finch',
    'society_finch',
    'gouldian_finch',
    'java_sparrow',
    'dove',
    'diamond_dove',
    'ring_necked_dove',
    'pigeon',
    'racing_pigeon',
    'fancy_pigeon',
    'quaker_parrot',
    'monk_parakeet',
    'eclectus_parrot',
    'pionus_parrot',
    'caique',
    'lorikeet',
    'rosella',
    'bourkes_parakeet',
    'lineolated_parakeet',
    'parrotlet',
    'senegal_parrot',
    'meyers_parrot',

    -- Small Mammals (30+)
    'rabbit',
    'holland_lop',
    'netherland_dwarf',
    'mini_rex',
    'flemish_giant',
    'lionhead_rabbit',
    'angora_rabbit',
    'dutch_rabbit',
    'english_lop',
    'hamster',
    'syrian_hamster',
    'dwarf_hamster',
    'roborovski_hamster',
    'guinea_pig',
    'american_guinea_pig',
    'peruvian_guinea_pig',
    'abyssinian_guinea_pig',
    'ferret',
    'gerbil',
    'chinchilla',
    'hedgehog',
    'african_pygmy_hedgehog',
    'mouse',
    'fancy_mouse',
    'rat',
    'fancy_rat',
    'dumbo_rat',
    'sugar_glider',
    'degu',
    'prairie_dog',

    -- Reptiles (40+)
    'ball_python',
    'corn_snake',
    'king_snake',
    'california_kingsnake',
    'milk_snake',
    'boa_constrictor',
    'red_tail_boa',
    'rainbow_boa',
    'blood_python',
    'carpet_python',
    'green_tree_python',
    'burmese_python',
    'reticulated_python',
    'garter_snake',
    'hognose_snake',
    'bearded_dragon',
    'leopard_gecko',
    'crested_gecko',
    'gargoyle_gecko',
    'tokay_gecko',
    'african_fat_tailed_gecko',
    'blue_tongue_skink',
    'uromastyx',
    'monitor_lizard',
    'savannah_monitor',
    'tegu',
    'argentine_tegu',
    'iguana',
    'green_iguana',
    'chameleon',
    'veiled_chameleon',
    'panther_chameleon',
    'jacksons_chameleon',
    'anole',
    'green_anole',
    'turtle',
    'red_eared_slider',
    'painted_turtle',
    'map_turtle',
    'musk_turtle',
    'box_turtle',
    'tortoise',
    'russian_tortoise',
    'hermann_tortoise',
    'sulcata_tortoise',
    'leopard_tortoise',

    -- Aquatic Pets (30+)
    'goldfish',
    'betta_fish',
    'siamese_fighting_fish',
    'guppy',
    'molly',
    'platy',
    'swordtail',
    'tetra',
    'neon_tetra',
    'cardinal_tetra',
    'angelfish',
    'discus',
    'oscar',
    'cichlid',
    'african_cichlid',
    'apistogramma',
    'ram_cichlid',
    'barb',
    'tiger_barb',
    'cherry_barb',
    'danio',
    'zebra_danio',
    'corydoras',
    'pleco',
    'bristlenose_pleco',
    'clownfish',
    'tang',
    'damselfish',
    'goby',
    'axolotl',

    -- Amphibians
    'frog',
    'tree_frog',
    'red_eyed_tree_frog',
    'whites_tree_frog',
    'pacman_frog',
    'dart_frog',
    'poison_dart_frog',
    'fire_bellied_toad',
    'african_clawed_frog',
    'salamander',
    'fire_salamander',
    'newt',

    -- Farm Animals & Livestock
    'horse',
    'quarter_horse',
    'thoroughbred',
    'arabian_horse',
    'appaloosa',
    'paint_horse',
    'morgan_horse',
    'tennessee_walker',
    'standardbred',
    'miniature_horse',
    'pony',
    'shetland_pony',
    'welsh_pony',
    'donkey',
    'miniature_donkey',
    'mule',
    'goat',
    'nigerian_dwarf_goat',
    'pygmy_goat',
    'nubian_goat',
    'alpine_goat',
    'boer_goat',
    'sheep',
    'suffolk_sheep',
    'merino_sheep',
    'dorset_sheep',
    'chicken',
    'rhode_island_red',
    'plymouth_rock',
    'leghorn',
    'orpington',
    'wyandotte',
    'silkie',
    'bantam',
    'duck',
    'pekin_duck',
    'mallard',
    'muscovy_duck',
    'khaki_campbell',
    'rouen_duck',
    'pig',
    'pot_bellied_pig',
    'kunekune_pig',
    'cow',
    'jersey_cow',
    'holstein',
    'angus',
    'llama',
    'alpaca',

    -- Exotic & Other
    'tarantula',
    'rose_hair_tarantula',
    'mexican_redknee_tarantula',
    'chilean_rose_tarantula',
    'scorpion',
    'emperor_scorpion',
    'hermit_crab',
    'land_hermit_crab',
    'stick_insect',
    'praying_mantis',
    'hissing_cockroach',
    'millipede',
    'african_giant_millipede'
);

-- =====================================================
-- EXPERTISE (350+ options)
-- =====================================================
CREATE TYPE expertise_type AS ENUM (
    -- Technology & Software
    'software_engineering',
    'software_architecture',
    'software_development',
    'full_stack_development',
    'frontend_development',
    'backend_development',
    'mobile_development',
    'ios_development',
    'android_development',
    'web_development',
    'game_development',
    'embedded_systems',
    'firmware_development',
    'systems_programming',
    'application_development',
    'desktop_application_development',
    'distributed_systems',
    'microservices_architecture',
    'serverless_architecture',
    'cloud_native_development',
    'api_development',
    'devops',
    'site_reliability_engineering',
    'platform_engineering',
    'cloud_engineering',
    'cloud_architecture',
    'solutions_architecture',
    'enterprise_architecture',
    'technical_architecture',
    'cybersecurity',
    'information_security',
    'network_security',
    'application_security',
    'cloud_security',
    'security_architecture',
    'penetration_testing',
    'ethical_hacking',
    'vulnerability_assessment',
    'security_operations',
    'incident_response',
    'threat_intelligence',
    'malware_analysis',
    'reverse_engineering',
    'cryptography',
    'blockchain',
    'cryptocurrency',
    'smart_contracts',
    'defi',
    'nft',
    'web3',

    -- Data & AI
    'data_science',
    'data_engineering',
    'data_analytics',
    'data_architecture',
    'big_data',
    'data_warehousing',
    'business_intelligence',
    'data_visualization',
    'machine_learning',
    'deep_learning',
    'artificial_intelligence',
    'natural_language_processing',
    'computer_vision',
    'speech_recognition',
    'recommendation_systems',
    'predictive_analytics',
    'prescriptive_analytics',
    'statistical_analysis',
    'quantitative_analysis',
    'data_modeling',
    'etl_development',
    'mlops',
    'ai_ethics',

    -- Design & UX
    'user_experience',
    'user_interface',
    'ux_ui_design',
    'ux_research',
    'user_research',
    'usability_engineering',
    'interaction_design',
    'information_architecture',
    'service_design',
    'design_thinking',
    'product_design',
    'industrial_design',
    'graphic_design',
    'visual_design',
    'brand_design',
    'brand_identity',
    'motion_graphics',
    'animation',
    '3d_design',
    '3d_visualization',
    'game_design',
    'level_design',
    'ui_engineering',
    'design_systems',
    'accessibility_design',

    -- Business & Management
    'business_strategy',
    'corporate_strategy',
    'competitive_strategy',
    'strategic_planning',
    'business_transformation',
    'digital_transformation',
    'organizational_transformation',
    'change_leadership',
    'project_management',
    'program_management',
    'portfolio_management',
    'pmo_management',
    'agile_coaching',
    'scrum_mastering',
    'product_management',
    'product_strategy',
    'product_development',
    'product_marketing',
    'innovation_management',
    'r_and_d_management',
    'operations_management',
    'operations_strategy',
    'process_optimization',
    'process_reengineering',
    'lean_management',
    'six_sigma',
    'continuous_improvement',
    'supply_chain_management',
    'supply_chain_strategy',
    'logistics',
    'procurement',
    'vendor_management',
    'contract_management',
    'risk_management',
    'enterprise_risk_management',
    'compliance_management',
    'governance',
    'internal_controls',
    'quality_management',
    'quality_assurance',
    'performance_management',

    -- Marketing & Sales
    'marketing_strategy',
    'brand_strategy',
    'brand_management',
    'digital_marketing',
    'content_marketing',
    'content_strategy',
    'social_media_marketing',
    'social_media_strategy',
    'influencer_marketing',
    'email_marketing',
    'marketing_automation',
    'growth_marketing',
    'performance_marketing',
    'paid_advertising',
    'search_engine_marketing',
    'search_engine_optimization',
    'conversion_rate_optimization',
    'web_analytics',
    'marketing_analytics',
    'customer_analytics',
    'market_research',
    'consumer_insights',
    'competitive_intelligence',
    'go_to_market_strategy',
    'demand_generation',
    'lead_generation',
    'account_based_marketing',
    'public_relations',
    'corporate_communications',
    'crisis_communications',
    'media_relations',
    'investor_relations',
    'sales_strategy',
    'sales_operations',
    'sales_enablement',
    'enterprise_sales',
    'b2b_sales',
    'b2c_sales',
    'saas_sales',
    'channel_sales',
    'partner_management',
    'business_development',
    'strategic_partnerships',
    'customer_success',
    'customer_experience',
    'customer_service',
    'account_management',

    -- Finance & Accounting
    'corporate_finance',
    'financial_planning_and_analysis',
    'fpa',
    'financial_modeling',
    'valuation',
    'mergers_and_acquisitions',
    'm_and_a',
    'investment_banking',
    'equity_research',
    'private_equity',
    'venture_capital',
    'asset_management',
    'wealth_management',
    'financial_advisory',
    'treasury_management',
    'cash_management',
    'credit_analysis',
    'credit_risk',
    'market_risk',
    'operational_risk',
    'compliance',
    'regulatory_compliance',
    'internal_audit',
    'external_audit',
    'forensic_accounting',
    'tax_planning',
    'tax_strategy',
    'international_tax',
    'transfer_pricing',
    'accounting',
    'financial_accounting',
    'management_accounting',
    'cost_accounting',
    'controller',
    'cfo',
    'ifrs',
    'gaap',
    'financial_reporting',
    'sec_reporting',
    'sarbanes_oxley',
    'budgeting',
    'forecasting',
    'trading',
    'equity_trading',
    'fixed_income',
    'derivatives',
    'commodities',
    'forex',
    'quantitative_trading',
    'algorithmic_trading',
    'high_frequency_trading',

    -- Healthcare & Medical
    'medicine',
    'clinical_medicine',
    'emergency_medicine',
    'family_medicine',
    'internal_medicine',
    'pediatrics',
    'geriatrics',
    'obstetrics_gynecology',
    'psychiatry',
    'neurology',
    'cardiology',
    'oncology',
    'radiology',
    'pathology',
    'anesthesiology',
    'surgery',
    'general_surgery',
    'orthopedic_surgery',
    'neurosurgery',
    'cardiothoracic_surgery',
    'plastic_surgery',
    'dermatology',
    'ophthalmology',
    'otolaryngology',
    'urology',
    'nephrology',
    'gastroenterology',
    'endocrinology',
    'rheumatology',
    'hematology',
    'infectious_disease',
    'pulmonology',
    'nursing',
    'nurse_practitioner',
    'physician_assistant',
    'physical_therapy',
    'occupational_therapy',
    'speech_therapy',
    'pharmacy',
    'clinical_pharmacy',
    'pharmacology',
    'nutrition',
    'dietetics',
    'public_health',
    'epidemiology',
    'health_policy',
    'healthcare_administration',
    'hospital_administration',
    'medical_research',
    'clinical_research',
    'medical_writing',
    'medical_affairs',

    -- Science & Research
    'research',
    'scientific_research',
    'academic_research',
    'applied_research',
    'basic_research',
    'biology',
    'molecular_biology',
    'cell_biology',
    'microbiology',
    'immunology',
    'genetics',
    'genomics',
    'proteomics',
    'bioinformatics',
    'computational_biology',
    'biotechnology',
    'bioengineering',
    'biochemistry',
    'chemistry',
    'organic_chemistry',
    'inorganic_chemistry',
    'analytical_chemistry',
    'physical_chemistry',
    'polymer_chemistry',
    'materials_science',
    'nanotechnology',
    'physics',
    'theoretical_physics',
    'experimental_physics',
    'quantum_physics',
    'nuclear_physics',
    'particle_physics',
    'astrophysics',
    'cosmology',
    'astronomy',
    'earth_science',
    'geology',
    'geophysics',
    'meteorology',
    'climatology',
    'oceanography',
    'environmental_science',
    'ecology',
    'conservation_biology',
    'neuroscience',
    'cognitive_science',
    'psychology',
    'clinical_psychology',
    'developmental_psychology',
    'social_psychology',
    'organizational_psychology',
    'behavioral_science',

    -- Engineering
    'mechanical_engineering',
    'automotive_engineering',
    'aerospace_engineering',
    'marine_engineering',
    'hvac_engineering',
    'electrical_engineering',
    'power_systems',
    'power_electronics',
    'control_systems',
    'signal_processing',
    'telecommunications',
    'rf_engineering',
    'electronics_engineering',
    'vlsi_design',
    'analog_design',
    'digital_design',
    'civil_engineering',
    'structural_engineering',
    'geotechnical_engineering',
    'transportation_engineering',
    'water_resources_engineering',
    'environmental_engineering',
    'chemical_engineering',
    'process_engineering',
    'petroleum_engineering',
    'biomedical_engineering',
    'medical_device_development',
    'industrial_engineering',
    'manufacturing_engineering',
    'quality_engineering',
    'systems_engineering',
    'reliability_engineering',
    'safety_engineering',
    'robotics_engineering',
    'mechatronics',
    'automation_engineering',
    'materials_engineering',
    'metallurgical_engineering',
    'nuclear_engineering',
    'mining_engineering',

    -- Legal
    'law',
    'legal_practice',
    'litigation',
    'trial_law',
    'appellate_practice',
    'corporate_law',
    'mergers_and_acquisitions_law',
    'securities_law',
    'banking_law',
    'finance_law',
    'commercial_law',
    'contract_law',
    'intellectual_property',
    'patent_law',
    'trademark_law',
    'copyright_law',
    'trade_secrets',
    'technology_law',
    'software_licensing',
    'privacy_law',
    'data_protection',
    'gdpr',
    'employment_law',
    'labor_law',
    'immigration_law',
    'real_estate_law',
    'property_law',
    'tax_law',
    'estate_planning',
    'trusts_and_estates',
    'family_law',
    'criminal_law',
    'criminal_defense',
    'prosecution',
    'environmental_law',
    'energy_law',
    'healthcare_law',
    'medical_malpractice',
    'administrative_law',
    'regulatory_law',
    'antitrust',
    'competition_law',
    'international_law',
    'arbitration',
    'mediation',
    'alternative_dispute_resolution',

    -- Education & Academia
    'teaching',
    'higher_education',
    'k12_education',
    'early_childhood_education',
    'special_education',
    'adult_education',
    'vocational_training',
    'curriculum_development',
    'instructional_design',
    'educational_technology',
    'e_learning',
    'online_education',
    'education_administration',
    'academic_advising',
    'student_affairs',
    'education_policy',
    'education_research',

    -- Consulting
    'management_consulting',
    'strategy_consulting',
    'operations_consulting',
    'technology_consulting',
    'it_consulting',
    'digital_consulting',
    'transformation_consulting',
    'change_management_consulting',
    'hr_consulting',
    'organizational_development',
    'talent_management',
    'compensation_and_benefits',
    'executive_search',
    'recruitment',

    -- Real Estate & Construction
    'real_estate',
    'real_estate_development',
    'commercial_real_estate',
    'residential_real_estate',
    'property_management',
    'real_estate_investment',
    'construction_management',
    'project_management_construction',
    'general_contracting',
    'architecture',
    'landscape_architecture',
    'urban_planning',
    'city_planning',

    -- Media & Entertainment
    'journalism',
    'broadcast_journalism',
    'investigative_journalism',
    'photojournalism',
    'sports_journalism',
    'film_production',
    'television_production',
    'video_production',
    'cinematography',
    'directing',
    'screenwriting',
    'editing',
    'sound_design',
    'music_production',
    'audio_engineering',
    'broadcasting',
    'podcasting',

    -- Other Professional
    'entrepreneurship',
    'startup_founding',
    'small_business_management',
    'franchising',
    'non_profit_management',
    'social_entrepreneurship',
    'impact_investing',
    'sustainability',
    'esg',
    'corporate_social_responsibility',
    'community_development',
    'international_development',
    'humanitarian_work',
    'social_work',
    'counseling',
    'therapy',
    'life_coaching',
    'executive_coaching',
    'career_coaching',
    'agriculture',
    'agribusiness',
    'farming',
    'veterinary_medicine',
    'animal_science',
    'forestry',
    'wildlife_management',
    'hospitality_management',
    'hotel_management',
    'restaurant_management',
    'culinary_arts',
    'event_planning',
    'tourism',
    'travel_industry',
    'aviation',
    'pilot',
    'air_traffic_control',
    'maritime',
    'shipping',
    'logistics_management'
);

-- =====================================================
-- RECREATE COLUMNS WITH NEW ENUM TYPES
-- =====================================================

ALTER TABLE users ADD COLUMN hobbies hobby_type[];
ALTER TABLE users ADD COLUMN skills skill_type[];
ALTER TABLE users ADD COLUMN favorite_pets pet_type[];
ALTER TABLE users ADD COLUMN expertise expertise_type[];

-- Recreate indexes
CREATE INDEX IF NOT EXISTS idx_users_hobbies ON users USING GIN (hobbies);
CREATE INDEX IF NOT EXISTS idx_users_skills ON users USING GIN (skills);
CREATE INDEX IF NOT EXISTS idx_users_favorite_pets ON users USING GIN (favorite_pets);
CREATE INDEX IF NOT EXISTS idx_users_expertise ON users USING GIN (expertise);

-- Add comments
COMMENT ON COLUMN users.hobbies IS 'Array of user hobbies and interests (250+ options)';
COMMENT ON COLUMN users.skills IS 'Array of user professional skills (300+ options)';
COMMENT ON COLUMN users.favorite_pets IS 'Array of user favorite pet types and breeds (400+ options)';
COMMENT ON COLUMN users.expertise IS 'Array of user areas of expertise (350+ options)';


-- ============================================================================
-- MIGRATION: 017_add_polls.sql
-- ============================================================================
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


-- ============================================================================
-- MIGRATION: 018_messaging_system.sql
-- ============================================================================
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


-- ============================================================================
-- MIGRATION: 019_notifications_system.sql
-- ============================================================================
-- Migration 019: Notifications System
-- Creates tables for user notifications and preferences

-- ============================================================================
-- NOTIFICATIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL, -- 'follow', 'comment', 'reaction', 'mention', 'group_invite', etc.
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    actor_id INTEGER REFERENCES users(id) ON DELETE CASCADE, -- who triggered the notification
    entity_type VARCHAR(50), -- 'post', 'comment', 'group', 'message', etc.
    entity_id INTEGER, -- ID of the related entity
    action_url VARCHAR(500), -- where to navigate when clicked
    priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    read_at TIMESTAMP, -- NULL if unread
    clicked_at TIMESTAMP, -- NULL if not clicked
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP -- optional expiration for time-sensitive notifications
);

CREATE INDEX idx_notifications_user ON notifications(user_id, created_at DESC);
CREATE INDEX idx_notifications_unread ON notifications(user_id, read_at) WHERE read_at IS NULL;
CREATE INDEX idx_notifications_type ON notifications(type);
CREATE INDEX idx_notifications_actor ON notifications(actor_id);
CREATE INDEX idx_notifications_entity ON notifications(entity_type, entity_id);
CREATE INDEX idx_notifications_expires ON notifications(expires_at) WHERE expires_at IS NOT NULL;

-- ============================================================================
-- NOTIFICATION PREFERENCES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS notification_preferences (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    notification_type VARCHAR(50) NOT NULL,
    email_enabled BOOLEAN DEFAULT TRUE,
    push_enabled BOOLEAN DEFAULT TRUE,
    in_app_enabled BOOLEAN DEFAULT TRUE,
    frequency VARCHAR(20) DEFAULT 'instant' CHECK (frequency IN ('instant', 'digest_hourly', 'digest_daily', 'digest_weekly', 'never')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, notification_type)
);

CREATE INDEX idx_notification_preferences_user ON notification_preferences(user_id);

-- ============================================================================
-- NOTIFICATION BATCHES TABLE
-- ============================================================================
-- For grouping similar notifications (e.g., "5 people liked your post")

CREATE TABLE IF NOT EXISTS notification_batches (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL, -- e.g., 'multiple_reactions', 'multiple_comments'
    entity_type VARCHAR(50) NOT NULL,
    entity_id INTEGER NOT NULL,
    count INTEGER DEFAULT 1,
    last_actor_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    sample_actor_ids INTEGER[], -- array of recent actor IDs (limited to 3-5)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, type, entity_type, entity_id)
);

CREATE INDEX idx_notification_batches_user ON notification_batches(user_id);
CREATE INDEX idx_notification_batches_entity ON notification_batches(entity_type, entity_id);

-- ============================================================================
-- DEFAULT NOTIFICATION PREFERENCES
-- ============================================================================

-- Function to create default preferences for new users
CREATE OR REPLACE FUNCTION create_default_notification_preferences()
RETURNS TRIGGER AS $$
BEGIN
    -- Social notifications
    INSERT INTO notification_preferences (user_id, notification_type, email_enabled, push_enabled, in_app_enabled)
    VALUES
        (NEW.id, 'follow', TRUE, TRUE, TRUE),
        (NEW.id, 'reaction', TRUE, TRUE, TRUE),
        (NEW.id, 'comment', TRUE, TRUE, TRUE),
        (NEW.id, 'reply', TRUE, TRUE, TRUE),
        (NEW.id, 'mention', TRUE, TRUE, TRUE),
        (NEW.id, 'share', TRUE, TRUE, TRUE),
        -- Group notifications
        (NEW.id, 'group_invite', TRUE, TRUE, TRUE),
        (NEW.id, 'group_join_request', TRUE, TRUE, TRUE),
        (NEW.id, 'group_post', FALSE, FALSE, TRUE), -- disabled by default
        (NEW.id, 'group_role_change', TRUE, TRUE, TRUE),
        -- Messaging notifications
        (NEW.id, 'new_message', TRUE, TRUE, TRUE),
        (NEW.id, 'conversation_add', TRUE, TRUE, TRUE),
        -- System notifications
        (NEW.id, 'security_alert', TRUE, TRUE, TRUE),
        (NEW.id, 'system_announcement', FALSE, TRUE, TRUE)
    ON CONFLICT (user_id, notification_type) DO NOTHING;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_create_default_notification_preferences
    AFTER INSERT ON users
    FOR EACH ROW
    EXECUTE FUNCTION create_default_notification_preferences();

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to create a notification
CREATE OR REPLACE FUNCTION create_notification(
    p_user_id INTEGER,
    p_type VARCHAR,
    p_title VARCHAR,
    p_message TEXT,
    p_actor_id INTEGER DEFAULT NULL,
    p_entity_type VARCHAR DEFAULT NULL,
    p_entity_id INTEGER DEFAULT NULL,
    p_action_url VARCHAR DEFAULT NULL,
    p_priority VARCHAR DEFAULT 'normal'
)
RETURNS INTEGER AS $$
DECLARE
    notification_id INTEGER;
    pref_enabled BOOLEAN;
BEGIN
    -- Check if user has this notification type enabled
    SELECT in_app_enabled INTO pref_enabled
    FROM notification_preferences
    WHERE user_id = p_user_id AND notification_type = p_type;

    -- If preference not found or disabled, don't create notification
    IF pref_enabled IS FALSE THEN
        RETURN NULL;
    END IF;

    -- Don't notify users about their own actions
    IF p_actor_id = p_user_id THEN
        RETURN NULL;
    END IF;

    -- Create the notification
    INSERT INTO notifications (
        user_id, type, title, message, actor_id,
        entity_type, entity_id, action_url, priority
    )
    VALUES (
        p_user_id, p_type, p_title, p_message, p_actor_id,
        p_entity_type, p_entity_id, p_action_url, p_priority
    )
    RETURNING id INTO notification_id;

    RETURN notification_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get unread notification count
CREATE OR REPLACE FUNCTION get_unread_notification_count(p_user_id INTEGER)
RETURNS INTEGER AS $$
DECLARE
    unread_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO unread_count
    FROM notifications
    WHERE user_id = p_user_id
      AND read_at IS NULL
      AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP);

    RETURN COALESCE(unread_count, 0);
END;
$$ LANGUAGE plpgsql;

-- Function to mark notifications as read
CREATE OR REPLACE FUNCTION mark_notifications_read(
    p_user_id INTEGER,
    p_notification_ids INTEGER[] DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
    updated_count INTEGER;
BEGIN
    IF p_notification_ids IS NULL THEN
        -- Mark all unread notifications as read
        UPDATE notifications
        SET read_at = CURRENT_TIMESTAMP
        WHERE user_id = p_user_id
          AND read_at IS NULL;
    ELSE
        -- Mark specific notifications as read
        UPDATE notifications
        SET read_at = CURRENT_TIMESTAMP
        WHERE user_id = p_user_id
          AND id = ANY(p_notification_ids)
          AND read_at IS NULL;
    END IF;

    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RETURN updated_count;
END;
$$ LANGUAGE plpgsql;

-- Function to batch similar notifications
CREATE OR REPLACE FUNCTION batch_notification(
    p_user_id INTEGER,
    p_type VARCHAR,
    p_entity_type VARCHAR,
    p_entity_id INTEGER,
    p_actor_id INTEGER
)
RETURNS INTEGER AS $$
DECLARE
    batch_id INTEGER;
    current_count INTEGER;
    current_actors INTEGER[];
BEGIN
    -- Try to find existing batch
    SELECT id, count, sample_actor_ids INTO batch_id, current_count, current_actors
    FROM notification_batches
    WHERE user_id = p_user_id
      AND type = p_type
      AND entity_type = p_entity_type
      AND entity_id = p_entity_id;

    IF batch_id IS NOT NULL THEN
        -- Update existing batch
        UPDATE notification_batches
        SET count = count + 1,
            last_actor_id = p_actor_id,
            sample_actor_ids = array_append(
                CASE
                    WHEN array_length(sample_actor_ids, 1) >= 5
                    THEN sample_actor_ids[2:5]
                    ELSE sample_actor_ids
                END,
                p_actor_id
            ),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = batch_id;
    ELSE
        -- Create new batch
        INSERT INTO notification_batches (
            user_id, type, entity_type, entity_id,
            count, last_actor_id, sample_actor_ids
        )
        VALUES (
            p_user_id, p_type, p_entity_type, p_entity_id,
            1, p_actor_id, ARRAY[p_actor_id]
        )
        RETURNING id INTO batch_id;
    END IF;

    RETURN batch_id;
END;
$$ LANGUAGE plpgsql;

-- Function to clean up old notifications
CREATE OR REPLACE FUNCTION cleanup_old_notifications()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Delete read notifications older than 90 days
    DELETE FROM notifications
    WHERE read_at IS NOT NULL
      AND read_at < CURRENT_TIMESTAMP - INTERVAL '90 days';

    GET DIAGNOSTICS deleted_count = ROW_COUNT;

    -- Delete expired notifications
    DELETE FROM notifications
    WHERE expires_at IS NOT NULL
      AND expires_at < CURRENT_TIMESTAMP;

    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE notifications IS 'Stores all user notifications';
COMMENT ON TABLE notification_preferences IS 'User preferences for different notification types';
COMMENT ON TABLE notification_batches IS 'Batched/grouped notifications to reduce spam';

COMMENT ON COLUMN notifications.type IS 'Type of notification: follow, comment, reaction, mention, group_invite, new_message, etc.';
COMMENT ON COLUMN notifications.actor_id IS 'User who triggered the notification (e.g., who followed, commented, etc.)';
COMMENT ON COLUMN notifications.entity_type IS 'Type of entity: post, comment, group, message, etc.';
COMMENT ON COLUMN notifications.entity_id IS 'ID of the related entity';
COMMENT ON COLUMN notifications.action_url IS 'URL to navigate to when notification is clicked';
COMMENT ON COLUMN notifications.priority IS 'Priority level: low, normal, high, urgent';
COMMENT ON COLUMN notifications.expires_at IS 'Expiration time for time-sensitive notifications';

COMMENT ON COLUMN notification_preferences.frequency IS 'How often to send: instant, digest_hourly, digest_daily, digest_weekly, never';

COMMENT ON COLUMN notification_batches.sample_actor_ids IS 'Array of up to 5 recent actor IDs for preview';


-- ============================================================================
-- MIGRATION: 020_message_reactions.sql
-- ============================================================================
-- Migration 020: Message Reactions System
-- Add emoji reactions to messages

-- Create message_reactions table
CREATE TABLE IF NOT EXISTS message_reactions (
    id SERIAL PRIMARY KEY,
    message_id INTEGER NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    emoji VARCHAR(10) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(message_id, user_id, emoji)
);

-- Create indexes for performance
CREATE INDEX idx_message_reactions_message ON message_reactions(message_id);
CREATE INDEX idx_message_reactions_user ON message_reactions(user_id);
CREATE INDEX idx_message_reactions_emoji ON message_reactions(emoji);

-- Comment on table
COMMENT ON TABLE message_reactions IS 'Stores emoji reactions to messages';
COMMENT ON COLUMN message_reactions.emoji IS 'Unicode emoji character or sequence';


-- ============================================================================
-- MIGRATION: 020_group_chat_integration.sql
-- ============================================================================
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


-- ============================================================================
-- MIGRATION COMPLETED SUCCESSFULLY
-- ============================================================================

-- Analyze tables for query optimization
ANALYZE;

