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
