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
