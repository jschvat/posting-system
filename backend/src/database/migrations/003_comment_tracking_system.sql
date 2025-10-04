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
