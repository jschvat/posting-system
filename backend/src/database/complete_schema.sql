-- ============================================================================
-- COMPLETE DATABASE SCHEMA - Consolidated from all migrations
-- ============================================================================
-- Description: Complete schema for social media platform with geolocation,
--              groups, ratings, and comment tracking systems
-- Created: 2025-10-12
-- Note: This script consolidates migrations 001-011 and add_file_url_to_media
--       in proper dependency order for a clean database rebuild
-- ============================================================================

-- ============================================================================
-- SECTION 1: EXTENSIONS
-- ============================================================================
-- Enable required PostgreSQL extensions

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS ltree;

-- ============================================================================
-- SECTION 2: FUNCTIONS AND STORED PROCEDURES
-- ============================================================================
-- Create all functions before tables so they can be referenced by triggers

-- Function: Update updated_at timestamp
-- Used by multiple tables to automatically update the updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function: Calculate distance between two points in miles (Haversine formula)
-- Used for geolocation features to find nearby users
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

-- Function: Calculate recency score for comments (0-100, decays over 30 days)
CREATE OR REPLACE FUNCTION calculate_recency_score(comment_created_at TIMESTAMP)
RETURNS DOUBLE PRECISION AS $$
BEGIN
  RETURN GREATEST(0, 100 - EXTRACT(EPOCH FROM (NOW() - comment_created_at)) / 86400 / 30 * 100);
END;
$$ LANGUAGE plpgsql;

-- Function: Calculate interaction rate (interactions per hour)
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

-- Function: Calculate engagement score based on interaction quality
CREATE OR REPLACE FUNCTION calculate_engagement_score(
    reply_count INTEGER,
    reaction_count INTEGER,
    deep_read_count INTEGER,
    view_count INTEGER
)
RETURNS DOUBLE PRECISION AS $$
BEGIN
  IF view_count = 0 THEN
    RETURN 0;
  END IF;

  RETURN (
    (reply_count * 10.0) +
    (reaction_count * 5.0) +
    (deep_read_count * 2.0)
  ) / view_count::FLOAT * 100;
END;
$$ LANGUAGE plpgsql;

-- Function: Calculate reputation score (0-1000)
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

-- Function: Find users within specified radius
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
        u.id != p_user_id
        AND u.location_latitude IS NOT NULL
        AND u.location_longitude IS NOT NULL
        AND u.location_sharing != 'off'
        AND u.is_active = TRUE
        AND u.location_latitude BETWEEN p_lat - (p_radius_miles / 69.0) AND p_lat + (p_radius_miles / 69.0)
        AND u.location_longitude BETWEEN p_lon - (p_radius_miles / 69.0) AND p_lon + (p_radius_miles / 69.0)
        AND calculate_distance_miles(p_lat, p_lon, u.location_latitude, u.location_longitude) <= p_radius_miles
    ORDER BY distance_miles
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;

-- Function: Update user location and add to history
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

-- Function: Get user's current location
CREATE OR REPLACE FUNCTION get_user_location(p_user_id INTEGER)
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

-- Function: Cleanup expired nearby search cache
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

-- Function: Initialize user stats for existing users
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

-- Function: Check if user is group member
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

-- Function: Check if user is group moderator or admin
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

-- Function: Check if user is group admin
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

-- Function: Get user role in group
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
-- SECTION 3: CORE TABLES (Users first, then dependent tables)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Users Table - Core user accounts
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    bio TEXT,
    avatar_url VARCHAR(500),

    -- Account status
    is_active BOOLEAN DEFAULT TRUE,
    email_verified BOOLEAN DEFAULT FALSE,
    email_verification_token VARCHAR(255),
    password_reset_token VARCHAR(255),
    password_reset_expires TIMESTAMP,
    last_login TIMESTAMP,

    -- Geolocation fields (from migration 006, 007)
    location_latitude DECIMAL(10, 7),
    location_longitude DECIMAL(10, 7),
    address VARCHAR(255),
    location_city VARCHAR(100),
    location_state VARCHAR(100),
    location_zip VARCHAR(20),
    location_country VARCHAR(100),
    location_updated_at TIMESTAMP,
    location_accuracy INTEGER,
    location_sharing VARCHAR(20) DEFAULT 'off' CHECK (location_sharing IN ('exact', 'city', 'off')),
    show_distance_in_profile BOOLEAN DEFAULT FALSE,

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE users IS 'Core user accounts with authentication and profile information';
COMMENT ON COLUMN users.location_latitude IS 'Latitude coordinate for user location (WGS84)';
COMMENT ON COLUMN users.location_longitude IS 'Longitude coordinate for user location (WGS84)';
COMMENT ON COLUMN users.address IS 'Street address for exact location sharing (e.g., "123 Main St")';
COMMENT ON COLUMN users.location_zip IS 'ZIP/postal code for location';
COMMENT ON COLUMN users.location_sharing IS 'Privacy setting: exact (show precise location), city (show only city), off (hide location)';
COMMENT ON COLUMN users.show_distance_in_profile IS 'Whether to show distance to this user in search results';

-- ----------------------------------------------------------------------------
-- Posts Table - User posts
-- ----------------------------------------------------------------------------
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

COMMENT ON TABLE posts IS 'User posts with privacy controls';

-- ----------------------------------------------------------------------------
-- Comments Table - Comments on posts
-- ----------------------------------------------------------------------------
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

COMMENT ON TABLE comments IS 'Comments on posts with nested reply support';

-- ----------------------------------------------------------------------------
-- Media Table - Media attachments for posts and comments
-- ----------------------------------------------------------------------------
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

COMMENT ON TABLE media IS 'Media attachments (images, videos, etc) for posts and comments';

-- ----------------------------------------------------------------------------
-- Reactions Table - Emoji reactions on posts and comments
-- ----------------------------------------------------------------------------
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

COMMENT ON TABLE reactions IS 'Emoji reactions on posts and comments';

-- ============================================================================
-- SECTION 4: SOCIAL FEATURES TABLES
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Follows Table - User follow relationships
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS follows (
    id SERIAL PRIMARY KEY,
    follower_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    following_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'muted', 'blocked')),
    notifications_enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_follow UNIQUE (follower_id, following_id),
    CONSTRAINT no_self_follow CHECK (follower_id != following_id)
);

COMMENT ON TABLE follows IS 'User follow relationships with status tracking';
COMMENT ON COLUMN follows.status IS 'active: normal follow, muted: following but notifications off, blocked: no longer following';

-- ----------------------------------------------------------------------------
-- Shares Table - Post shares and reposts
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS shares (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    share_type VARCHAR(20) DEFAULT 'repost' CHECK (share_type IN ('repost', 'quote', 'external')),
    share_comment TEXT,
    visibility VARCHAR(20) DEFAULT 'public' CHECK (visibility IN ('public', 'friends', 'private')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_user_share UNIQUE (user_id, post_id)
);

COMMENT ON TABLE shares IS 'Post shares and reposts by users';

-- ----------------------------------------------------------------------------
-- User Stats Table - Denormalized statistics for performance
-- ----------------------------------------------------------------------------
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

COMMENT ON TABLE user_stats IS 'Denormalized user statistics for performance';

-- ----------------------------------------------------------------------------
-- Timeline Cache Table - Pre-computed timeline entries
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS timeline_cache (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    score DECIMAL(10,2) NOT NULL DEFAULT 0,
    reason VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP DEFAULT (CURRENT_TIMESTAMP + INTERVAL '7 days'),
    CONSTRAINT unique_user_post_timeline UNIQUE (user_id, post_id)
);

COMMENT ON TABLE timeline_cache IS 'Pre-computed timeline entries with scoring';
COMMENT ON COLUMN timeline_cache.score IS 'Calculated score (0-100) based on relevance algorithm';
COMMENT ON COLUMN timeline_cache.reason IS 'Why this post is in timeline: following, popular, shared, suggested';
COMMENT ON COLUMN timeline_cache.expires_at IS 'When this timeline entry should be removed';

-- ============================================================================
-- SECTION 5: COMMENT TRACKING SYSTEM
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Comment Interactions Table - Track all comment interactions
-- ----------------------------------------------------------------------------
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

COMMENT ON TABLE comment_interactions IS 'Tracks all interactions with comments (views, replies, reactions, etc)';
COMMENT ON COLUMN comment_interactions.interaction_type IS 'Type of interaction: view, reply, reaction, share, deep_read, quote';

-- ----------------------------------------------------------------------------
-- Comment Metrics Table - Aggregated comment metrics
-- ----------------------------------------------------------------------------
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

COMMENT ON TABLE comment_metrics IS 'Aggregated metrics and scores for comment engagement';
COMMENT ON COLUMN comment_metrics.combined_algorithm_score IS 'Combined score for ranking comments by engagement and relevance';

-- ============================================================================
-- SECTION 6: RATING AND REPUTATION SYSTEM
-- ============================================================================

-- ----------------------------------------------------------------------------
-- User Ratings Table - Ratings between users
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_ratings (
    id SERIAL PRIMARY KEY,
    rater_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    rated_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    rating_type VARCHAR(50) NOT NULL CHECK (rating_type IN ('profile', 'post', 'comment', 'interaction')),
    rating_value INTEGER NOT NULL CHECK (rating_value >= 1 AND rating_value <= 5),
    context_type VARCHAR(50),
    context_id INTEGER,
    review_text TEXT,
    is_anonymous BOOLEAN DEFAULT FALSE,
    is_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_rating UNIQUE (rater_id, rated_user_id, context_type, context_id),
    CONSTRAINT no_self_rating CHECK (rater_id != rated_user_id)
);

COMMENT ON TABLE user_ratings IS 'User ratings with context and reviews';
COMMENT ON COLUMN user_ratings.rating_type IS 'Category: profile, post, comment, interaction';
COMMENT ON COLUMN user_ratings.context_type IS 'What was rated: post, comment, message, general';
COMMENT ON COLUMN user_ratings.is_verified IS 'Rating from verified interaction';

-- ----------------------------------------------------------------------------
-- User Reputation Table - Aggregated reputation metrics
-- ----------------------------------------------------------------------------
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

COMMENT ON TABLE user_reputation IS 'Aggregated user reputation scores and metrics';
COMMENT ON COLUMN user_reputation.reputation_score IS 'Calculated score 0-1000';
COMMENT ON COLUMN user_reputation.reputation_level IS 'Level: newcomer, member, contributor, veteran, expert, legend';

-- ----------------------------------------------------------------------------
-- Rating Reports Table - Reports for disputed ratings
-- ----------------------------------------------------------------------------
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

COMMENT ON TABLE rating_reports IS 'Reports for disputed or inappropriate ratings';

-- ----------------------------------------------------------------------------
-- Helpful Marks Table - Track helpful content
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS helpful_marks (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    target_type VARCHAR(20) NOT NULL CHECK (target_type IN ('post', 'comment', 'user')),
    target_id INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_helpful_mark UNIQUE (user_id, target_type, target_id)
);

COMMENT ON TABLE helpful_marks IS 'Track when users mark content as helpful';

-- ============================================================================
-- SECTION 7: GEOLOCATION SYSTEM
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Location History Table - Track location changes
-- ----------------------------------------------------------------------------
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

COMMENT ON TABLE location_history IS 'Historical log of user location changes for privacy audit';

-- ----------------------------------------------------------------------------
-- Nearby Search Cache Table - Cache nearby user searches
-- ----------------------------------------------------------------------------
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

COMMENT ON TABLE nearby_search_cache IS 'Cache for nearby user searches to improve performance';

-- ============================================================================
-- SECTION 8: GROUP SYSTEM (Reddit-style communities)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Groups Table - Community groups
-- ----------------------------------------------------------------------------
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
    allow_public_posting BOOLEAN DEFAULT FALSE,

    -- Moderation
    post_approval_required BOOLEAN DEFAULT FALSE,
    allow_multimedia BOOLEAN DEFAULT TRUE,
    allowed_media_types TEXT[] DEFAULT ARRAY['image', 'video', 'pdf', 'model', 'link'],
    max_file_size_mb INTEGER DEFAULT 50,

    -- Geolocation restrictions (from migration 011)
    location_restricted BOOLEAN DEFAULT FALSE,
    location_type VARCHAR(20) CHECK (location_type IN ('radius', 'country', 'state', 'city', 'polygon')),
    location_latitude DECIMAL(10, 8),
    location_longitude DECIMAL(11, 8),
    location_radius_km DECIMAL(10, 2),
    location_country VARCHAR(2),
    location_state VARCHAR(100),
    location_city VARCHAR(100),
    location_polygon JSONB,
    location_name VARCHAR(255),

    -- Metadata
    creator_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    member_count INTEGER DEFAULT 0,
    post_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Settings
    settings JSONB DEFAULT '{}',

    CONSTRAINT valid_name CHECK (name ~ '^[a-zA-Z0-9_-]{3,100}$'),
    CONSTRAINT valid_slug CHECK (slug ~ '^[a-z0-9-]{3,100}$')
);

COMMENT ON TABLE groups IS 'Reddit-style community groups';
COMMENT ON COLUMN groups.visibility IS 'public: anyone can view, private: members only, invite_only: invite required';
COMMENT ON COLUMN groups.post_approval_required IS 'If true, posts require moderator approval before publishing';
COMMENT ON COLUMN groups.allow_public_posting IS 'If true, non-members can post, comment, and vote in this group without joining';
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

-- ----------------------------------------------------------------------------
-- Group Memberships Table - User memberships in groups
-- ----------------------------------------------------------------------------
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

COMMENT ON TABLE group_memberships IS 'User memberships in groups with roles (admin, moderator, member)';
COMMENT ON COLUMN group_memberships.role IS 'admin: full control, moderator: can moderate content, member: regular member';

-- ----------------------------------------------------------------------------
-- Group Posts Table - Posts within groups
-- ----------------------------------------------------------------------------
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
    score INTEGER DEFAULT 0,
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

COMMENT ON TABLE group_posts IS 'Posts within groups';
COMMENT ON COLUMN group_posts.score IS 'Reddit-style score: upvotes - downvotes';

-- ----------------------------------------------------------------------------
-- Group Post Media Table - Media attachments for group posts
-- ----------------------------------------------------------------------------
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
    duration INTEGER,
    thumbnail_url VARCHAR(500),

    -- Order for galleries
    display_order INTEGER DEFAULT 0,

    -- Metadata
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT valid_file_path CHECK (file_path ~ '^public/media/groups/.*')
);

COMMENT ON TABLE group_post_media IS 'Media attachments for group posts';

-- ----------------------------------------------------------------------------
-- Group Comments Table - Nested comments on group posts
-- ----------------------------------------------------------------------------
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
    path LTREE,

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    edited_at TIMESTAMP
);

COMMENT ON TABLE group_comments IS 'Nested comments on group posts using ltree';
COMMENT ON COLUMN group_comments.path IS 'ltree path for efficient nested comment queries';
COMMENT ON COLUMN group_comments.depth IS 'Nesting depth (0 for top-level comments)';

-- ----------------------------------------------------------------------------
-- Group Comment Media Table - Media attachments for group comments
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS group_comment_media (
    id SERIAL PRIMARY KEY,
    comment_id INTEGER NOT NULL REFERENCES group_comments(id) ON DELETE CASCADE,

    -- File Info
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

COMMENT ON TABLE group_comment_media IS 'Media attachments for group comments';

-- ----------------------------------------------------------------------------
-- Group Invitations Table - Invitations to join groups
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS group_invitations (
    id SERIAL PRIMARY KEY,
    group_id INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    inviter_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    invitee_id INTEGER REFERENCES users(id),
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

COMMENT ON TABLE group_invitations IS 'Invitations to join groups';

-- ----------------------------------------------------------------------------
-- Group Votes Table - Upvotes/downvotes for posts and comments
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS group_votes (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Votable entity
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

COMMENT ON TABLE group_votes IS 'Upvote/downvote system for posts and comments';

-- ----------------------------------------------------------------------------
-- Group Activity Log Table - Audit log for moderation
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS group_activity_log (
    id SERIAL PRIMARY KEY,
    group_id INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id),

    -- Action
    action_type VARCHAR(50) NOT NULL,
    target_type VARCHAR(50),
    target_id INTEGER,

    -- Details
    details JSONB DEFAULT '{}',

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE group_activity_log IS 'Audit log for moderation actions';

-- ============================================================================
-- SECTION 9: INDEXES FOR PERFORMANCE
-- ============================================================================

-- Users indexes
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);
CREATE INDEX IF NOT EXISTS idx_users_location_coords ON users(location_latitude, location_longitude);
CREATE INDEX IF NOT EXISTS idx_users_location_sharing ON users(location_sharing);
CREATE INDEX IF NOT EXISTS idx_users_location_updated ON users(location_updated_at);

-- Posts indexes
CREATE INDEX IF NOT EXISTS idx_posts_user_id ON posts(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_privacy_level ON posts(privacy_level);
CREATE INDEX IF NOT EXISTS idx_posts_published ON posts(is_published);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at);

-- Comments indexes
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON comments(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_post_id ON comments(post_id);
CREATE INDEX IF NOT EXISTS idx_comments_parent_id ON comments(parent_id);
CREATE INDEX IF NOT EXISTS idx_comments_created_at ON comments(created_at);

-- Media indexes
CREATE INDEX IF NOT EXISTS idx_media_user_id ON media(user_id);
CREATE INDEX IF NOT EXISTS idx_media_post_id ON media(post_id);
CREATE INDEX IF NOT EXISTS idx_media_comment_id ON media(comment_id);
CREATE INDEX IF NOT EXISTS idx_media_type ON media(media_type);

-- Reactions indexes
CREATE INDEX IF NOT EXISTS idx_reactions_user_id ON reactions(user_id);
CREATE INDEX IF NOT EXISTS idx_reactions_post_id ON reactions(post_id);
CREATE INDEX IF NOT EXISTS idx_reactions_comment_id ON reactions(comment_id);
CREATE INDEX IF NOT EXISTS idx_reactions_emoji_name ON reactions(emoji_name);

-- Follows indexes
CREATE INDEX IF NOT EXISTS idx_follows_follower_id ON follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_following_id ON follows(following_id);
CREATE INDEX IF NOT EXISTS idx_follows_status ON follows(status);
CREATE INDEX IF NOT EXISTS idx_follows_created_at ON follows(created_at);
CREATE INDEX IF NOT EXISTS idx_follows_composite ON follows(follower_id, following_id, status);

-- Shares indexes
CREATE INDEX IF NOT EXISTS idx_shares_user_id ON shares(user_id);
CREATE INDEX IF NOT EXISTS idx_shares_post_id ON shares(post_id);
CREATE INDEX IF NOT EXISTS idx_shares_type ON shares(share_type);
CREATE INDEX IF NOT EXISTS idx_shares_created_at ON shares(created_at);
CREATE INDEX IF NOT EXISTS idx_shares_composite ON shares(post_id, created_at DESC);

-- User stats indexes
CREATE INDEX IF NOT EXISTS idx_user_stats_follower_count ON user_stats(follower_count DESC);
CREATE INDEX IF NOT EXISTS idx_user_stats_engagement_score ON user_stats(engagement_score DESC);
CREATE INDEX IF NOT EXISTS idx_user_stats_last_post_at ON user_stats(last_post_at DESC);

-- Timeline cache indexes
CREATE INDEX IF NOT EXISTS idx_timeline_user_score ON timeline_cache(user_id, score DESC);
CREATE INDEX IF NOT EXISTS idx_timeline_user_created ON timeline_cache(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_timeline_post_id ON timeline_cache(post_id);
CREATE INDEX IF NOT EXISTS idx_timeline_expires_at ON timeline_cache(expires_at);
CREATE INDEX IF NOT EXISTS idx_timeline_reason ON timeline_cache(reason);

-- Comment interactions indexes
CREATE INDEX IF NOT EXISTS idx_comment_interactions_comment_type ON comment_interactions(comment_id, interaction_type);
CREATE INDEX IF NOT EXISTS idx_comment_interactions_user_id ON comment_interactions(user_id);
CREATE INDEX IF NOT EXISTS idx_comment_interactions_session_id ON comment_interactions(session_id);
CREATE INDEX IF NOT EXISTS idx_comment_interactions_created_at ON comment_interactions(created_at);

-- Comment metrics indexes
CREATE INDEX IF NOT EXISTS idx_comment_metrics_algorithm_score ON comment_metrics(combined_algorithm_score DESC);
CREATE INDEX IF NOT EXISTS idx_comment_metrics_interaction_rate ON comment_metrics(interaction_rate DESC);
CREATE INDEX IF NOT EXISTS idx_comment_metrics_last_interaction ON comment_metrics(last_interaction_at DESC);

-- User ratings indexes
CREATE INDEX IF NOT EXISTS idx_user_ratings_rater ON user_ratings(rater_id);
CREATE INDEX IF NOT EXISTS idx_user_ratings_rated_user ON user_ratings(rated_user_id);
CREATE INDEX IF NOT EXISTS idx_user_ratings_type ON user_ratings(rating_type);
CREATE INDEX IF NOT EXISTS idx_user_ratings_created ON user_ratings(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_ratings_context ON user_ratings(context_type, context_id);

-- User reputation indexes
CREATE INDEX IF NOT EXISTS idx_user_reputation_score ON user_reputation(reputation_score DESC);
CREATE INDEX IF NOT EXISTS idx_user_reputation_level ON user_reputation(reputation_level);
CREATE INDEX IF NOT EXISTS idx_user_reputation_avg_rating ON user_reputation(average_rating DESC);

-- Rating reports indexes
CREATE INDEX IF NOT EXISTS idx_rating_reports_rating ON rating_reports(rating_id);
CREATE INDEX IF NOT EXISTS idx_rating_reports_reporter ON rating_reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_rating_reports_status ON rating_reports(status);

-- Helpful marks indexes
CREATE INDEX IF NOT EXISTS idx_helpful_marks_target ON helpful_marks(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_helpful_marks_user ON helpful_marks(user_id);

-- Location history indexes
CREATE INDEX IF NOT EXISTS idx_location_history_user_id ON location_history(user_id);
CREATE INDEX IF NOT EXISTS idx_location_history_created_at ON location_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_location_history_coords ON location_history(location_latitude, location_longitude);

-- Nearby search cache indexes
CREATE INDEX IF NOT EXISTS idx_nearby_cache_user_id ON nearby_search_cache(user_id);
CREATE INDEX IF NOT EXISTS idx_nearby_cache_expires_at ON nearby_search_cache(expires_at);
CREATE INDEX IF NOT EXISTS idx_nearby_cache_coords ON nearby_search_cache(search_lat, search_lon);

-- Groups indexes
CREATE INDEX IF NOT EXISTS idx_groups_slug ON groups(slug);
CREATE INDEX IF NOT EXISTS idx_groups_visibility ON groups(visibility);
CREATE INDEX IF NOT EXISTS idx_groups_creator ON groups(creator_id);
CREATE INDEX IF NOT EXISTS idx_groups_created ON groups(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_groups_name_search ON groups USING gin(to_tsvector('english', display_name || ' ' || COALESCE(description, '')));
CREATE INDEX IF NOT EXISTS idx_groups_location_restricted ON groups(location_restricted) WHERE location_restricted = TRUE;
CREATE INDEX IF NOT EXISTS idx_groups_location_coords ON groups(location_latitude, location_longitude) WHERE location_restricted = TRUE;

-- Group memberships indexes
CREATE INDEX IF NOT EXISTS idx_group_memberships_group ON group_memberships(group_id);
CREATE INDEX IF NOT EXISTS idx_group_memberships_user ON group_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_group_memberships_role ON group_memberships(group_id, role);
CREATE INDEX IF NOT EXISTS idx_group_memberships_status ON group_memberships(status);

-- Group posts indexes
CREATE INDEX IF NOT EXISTS idx_group_posts_group ON group_posts(group_id);
CREATE INDEX IF NOT EXISTS idx_group_posts_user ON group_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_group_posts_status ON group_posts(status);
CREATE INDEX IF NOT EXISTS idx_group_posts_created ON group_posts(group_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_group_posts_score ON group_posts(group_id, score DESC);
CREATE INDEX IF NOT EXISTS idx_group_posts_pinned ON group_posts(group_id, is_pinned, created_at DESC);

-- Group post media indexes
CREATE INDEX IF NOT EXISTS idx_group_post_media_post ON group_post_media(post_id);
CREATE INDEX IF NOT EXISTS idx_group_post_media_type ON group_post_media(media_type);

-- Group comments indexes
CREATE INDEX IF NOT EXISTS idx_group_comments_post ON group_comments(post_id);
CREATE INDEX IF NOT EXISTS idx_group_comments_parent ON group_comments(parent_id);
CREATE INDEX IF NOT EXISTS idx_group_comments_user ON group_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_group_comments_path ON group_comments USING GIST (path);
CREATE INDEX IF NOT EXISTS idx_group_comments_created ON group_comments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_group_comments_score ON group_comments(post_id, score DESC);

-- Group comment media indexes
CREATE INDEX IF NOT EXISTS idx_group_comment_media_comment ON group_comment_media(comment_id);

-- Group invitations indexes
CREATE INDEX IF NOT EXISTS idx_group_invitations_group ON group_invitations(group_id);
CREATE INDEX IF NOT EXISTS idx_group_invitations_invitee ON group_invitations(invitee_id);
CREATE INDEX IF NOT EXISTS idx_group_invitations_token ON group_invitations(token);
CREATE INDEX IF NOT EXISTS idx_group_invitations_status ON group_invitations(status);

-- Group votes indexes
CREATE INDEX IF NOT EXISTS idx_group_votes_user ON group_votes(user_id);
CREATE INDEX IF NOT EXISTS idx_group_votes_post ON group_votes(post_id);
CREATE INDEX IF NOT EXISTS idx_group_votes_comment ON group_votes(comment_id);

-- Group activity log indexes
CREATE INDEX IF NOT EXISTS idx_group_activity_log_group ON group_activity_log(group_id);
CREATE INDEX IF NOT EXISTS idx_group_activity_log_created ON group_activity_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_group_activity_log_action ON group_activity_log(action_type);

-- ============================================================================
-- SECTION 10: TRIGGER FUNCTIONS FOR AUTOMATIC UPDATES
-- ============================================================================

-- Update comment metrics based on interactions
CREATE OR REPLACE FUNCTION update_comment_metrics()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO comment_metrics (comment_id, first_interaction_at)
  VALUES (NEW.comment_id, NEW.created_at)
  ON CONFLICT (comment_id) DO NOTHING;

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

-- Update follower/following counts
CREATE OR REPLACE FUNCTION update_follow_counts()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        INSERT INTO user_stats (user_id, following_count)
        VALUES (NEW.follower_id, 1)
        ON CONFLICT (user_id) DO UPDATE
        SET following_count = user_stats.following_count + 1,
            updated_at = CURRENT_TIMESTAMP;

        INSERT INTO user_stats (user_id, follower_count)
        VALUES (NEW.following_id, 1)
        ON CONFLICT (user_id) DO UPDATE
        SET follower_count = user_stats.follower_count + 1,
            updated_at = CURRENT_TIMESTAMP;

    ELSIF (TG_OP = 'DELETE') THEN
        UPDATE user_stats
        SET following_count = GREATEST(0, following_count - 1),
            updated_at = CURRENT_TIMESTAMP
        WHERE user_id = OLD.follower_id;

        UPDATE user_stats
        SET follower_count = GREATEST(0, follower_count - 1),
            updated_at = CURRENT_TIMESTAMP
        WHERE user_id = OLD.following_id;
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Update share counts
CREATE OR REPLACE FUNCTION update_share_counts()
RETURNS TRIGGER AS $$
DECLARE
    post_owner_id INTEGER;
BEGIN
    SELECT user_id INTO post_owner_id FROM posts WHERE id = NEW.post_id;

    IF (TG_OP = 'INSERT') THEN
        UPDATE user_stats
        SET total_shares_received = total_shares_received + 1,
            updated_at = CURRENT_TIMESTAMP
        WHERE user_id = post_owner_id;

    ELSIF (TG_OP = 'DELETE') THEN
        UPDATE user_stats
        SET total_shares_received = GREATEST(0, total_shares_received - 1),
            updated_at = CURRENT_TIMESTAMP
        WHERE user_id = post_owner_id;
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Update user reputation when ratings change
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
    IF (TG_OP = 'DELETE') THEN
        target_user_id := OLD.rated_user_id;
    ELSE
        target_user_id := NEW.rated_user_id;
    END IF;

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

    SELECT COALESCE(AVG(rating_value), 0) INTO post_avg
    FROM user_ratings WHERE rated_user_id = target_user_id AND rating_type = 'post';

    SELECT COALESCE(AVG(rating_value), 0) INTO comment_avg
    FROM user_ratings WHERE rated_user_id = target_user_id AND rating_type = 'comment';

    SELECT COALESCE(AVG(rating_value), 0) INTO interaction_avg
    FROM user_ratings WHERE rated_user_id = target_user_id AND rating_type = 'interaction';

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

-- Update helpful count
CREATE OR REPLACE FUNCTION update_helpful_count()
RETURNS TRIGGER AS $$
DECLARE
    target_user_id INTEGER;
BEGIN
    IF NEW.target_type = 'post' THEN
        SELECT user_id INTO target_user_id FROM posts WHERE id = NEW.target_id;
    ELSIF NEW.target_type = 'comment' THEN
        SELECT user_id INTO target_user_id FROM comments WHERE id = NEW.target_id;
    ELSIF NEW.target_type = 'user' THEN
        target_user_id := NEW.target_id;
    END IF;

    IF target_user_id IS NOT NULL THEN
        INSERT INTO user_reputation (user_id, helpful_count)
        VALUES (target_user_id, 1)
        ON CONFLICT (user_id) DO UPDATE
        SET helpful_count = user_reputation.helpful_count + 1,
            updated_at = CURRENT_TIMESTAMP;

        PERFORM calculate_reputation_score(target_user_id);
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Limit location history to last 100 entries per user
CREATE OR REPLACE FUNCTION limit_location_history()
RETURNS TRIGGER AS $$
BEGIN
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

-- Update group member count
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
        IF OLD.status = 'active' AND NEW.status != 'active' THEN
            UPDATE groups
            SET member_count = GREATEST(0, member_count - 1),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = NEW.group_id;
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

-- Update group post count
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

-- Update post vote counts
CREATE OR REPLACE FUNCTION update_group_post_votes()
RETURNS TRIGGER AS $$
DECLARE
    upvote_count INTEGER;
    downvote_count INTEGER;
    new_score INTEGER;
    target_post_id INTEGER;
BEGIN
    target_post_id := COALESCE(NEW.post_id, OLD.post_id);

    IF target_post_id IS NULL THEN
        RETURN NULL;
    END IF;

    SELECT
        COUNT(*) FILTER (WHERE vote_type = 'upvote'),
        COUNT(*) FILTER (WHERE vote_type = 'downvote')
    INTO upvote_count, downvote_count
    FROM group_votes
    WHERE post_id = target_post_id;

    new_score := upvote_count - downvote_count;

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

-- Update comment vote counts
CREATE OR REPLACE FUNCTION update_group_comment_votes()
RETURNS TRIGGER AS $$
DECLARE
    upvote_count INTEGER;
    downvote_count INTEGER;
    new_score INTEGER;
    target_comment_id INTEGER;
BEGIN
    target_comment_id := COALESCE(NEW.comment_id, OLD.comment_id);

    IF target_comment_id IS NULL THEN
        RETURN NULL;
    END IF;

    SELECT
        COUNT(*) FILTER (WHERE vote_type = 'upvote'),
        COUNT(*) FILTER (WHERE vote_type = 'downvote')
    INTO upvote_count, downvote_count
    FROM group_votes
    WHERE comment_id = target_comment_id;

    new_score := upvote_count - downvote_count;

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

-- Update comment count on posts
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

-- Set comment path for nested comments (ltree)
CREATE OR REPLACE FUNCTION set_group_comment_path()
RETURNS TRIGGER AS $$
DECLARE
    parent_path LTREE;
BEGIN
    IF NEW.parent_id IS NULL THEN
        NEW.path := text2ltree(NEW.id::text);
        NEW.depth := 0;
    ELSE
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

-- ============================================================================
-- SECTION 11: TRIGGERS
-- ============================================================================

-- Updated_at triggers for core tables
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

-- Social features triggers
CREATE TRIGGER update_follows_updated_at BEFORE UPDATE ON follows
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_update_follow_counts
AFTER INSERT OR DELETE ON follows
FOR EACH ROW EXECUTE FUNCTION update_follow_counts();

CREATE TRIGGER trigger_update_share_counts
AFTER INSERT OR DELETE ON shares
FOR EACH ROW EXECUTE FUNCTION update_share_counts();

-- Comment tracking triggers
CREATE TRIGGER comment_interaction_metrics_trigger
AFTER INSERT ON comment_interactions
FOR EACH ROW EXECUTE FUNCTION update_comment_metrics();

-- Rating and reputation triggers
CREATE TRIGGER update_user_ratings_updated_at BEFORE UPDATE ON user_ratings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_reputation_updated_at BEFORE UPDATE ON user_reputation
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_update_user_reputation
AFTER INSERT OR UPDATE OR DELETE ON user_ratings
FOR EACH ROW EXECUTE FUNCTION update_user_reputation();

CREATE TRIGGER trigger_update_helpful_count
AFTER INSERT ON helpful_marks
FOR EACH ROW EXECUTE FUNCTION update_helpful_count();

-- Geolocation triggers
CREATE TRIGGER trigger_limit_location_history
AFTER INSERT ON location_history
FOR EACH ROW EXECUTE FUNCTION limit_location_history();

-- Group system triggers
CREATE TRIGGER update_groups_updated_at BEFORE UPDATE ON groups
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_group_posts_updated_at BEFORE UPDATE ON group_posts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_group_comments_updated_at BEFORE UPDATE ON group_comments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_group_votes_updated_at BEFORE UPDATE ON group_votes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_update_group_member_count
AFTER INSERT OR UPDATE OR DELETE ON group_memberships
FOR EACH ROW EXECUTE FUNCTION update_group_member_count();

CREATE TRIGGER trigger_update_group_post_count
AFTER INSERT OR UPDATE OR DELETE ON group_posts
FOR EACH ROW EXECUTE FUNCTION update_group_post_count();

CREATE TRIGGER trigger_update_group_post_votes
AFTER INSERT OR UPDATE OR DELETE ON group_votes
FOR EACH ROW
EXECUTE FUNCTION update_group_post_votes();

CREATE TRIGGER trigger_update_group_comment_votes
AFTER INSERT OR UPDATE OR DELETE ON group_votes
FOR EACH ROW
EXECUTE FUNCTION update_group_comment_votes();

CREATE TRIGGER trigger_update_group_post_comment_count
AFTER INSERT OR UPDATE OR DELETE ON group_comments
FOR EACH ROW EXECUTE FUNCTION update_group_post_comment_count();

CREATE TRIGGER trigger_set_group_comment_path
BEFORE INSERT ON group_comments
FOR EACH ROW EXECUTE FUNCTION set_group_comment_path();

-- ============================================================================
-- SECTION 12: INITIALIZATION
-- ============================================================================

-- Initialize user stats for any existing users
SELECT initialize_user_stats();

-- ============================================================================
-- END OF SCHEMA
-- ============================================================================
