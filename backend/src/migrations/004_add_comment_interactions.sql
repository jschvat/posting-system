-- Migration: Add comment interaction tracking tables
-- Purpose: Support for algorithm-based comment prioritization and performance tracking

-- Table for tracking individual comment interactions
CREATE TABLE comment_interactions (
  id SERIAL PRIMARY KEY,
  comment_id INTEGER NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
  interaction_type VARCHAR(50) NOT NULL CHECK (interaction_type IN ('view', 'reply', 'reaction', 'share', 'deep_read', 'quote')),
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  session_id VARCHAR(255), -- For anonymous tracking
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'
);

-- Table for aggregated comment metrics (performance optimization)
CREATE TABLE comment_metrics (
  comment_id INTEGER PRIMARY KEY REFERENCES comments(id) ON DELETE CASCADE,
  view_count INTEGER DEFAULT 0,
  unique_view_count INTEGER DEFAULT 0,
  reply_count INTEGER DEFAULT 0,
  reaction_count INTEGER DEFAULT 0,
  share_count INTEGER DEFAULT 0,
  deep_read_count INTEGER DEFAULT 0,
  total_interaction_count INTEGER DEFAULT 0,

  -- Algorithm scores for future prioritization
  recency_score FLOAT DEFAULT 0.0,
  interaction_rate FLOAT DEFAULT 0.0,
  engagement_score FLOAT DEFAULT 0.0,
  combined_algorithm_score FLOAT DEFAULT 0.0,

  -- Temporal data for algorithm calculations
  first_interaction_at TIMESTAMP,
  last_interaction_at TIMESTAMP,
  peak_interaction_period TIMESTAMP,

  created_at TIMESTAMP DEFAULT NOW(),
  last_updated TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_comment_interactions_comment_type ON comment_interactions(comment_id, interaction_type);
CREATE INDEX idx_comment_interactions_created_at ON comment_interactions(created_at);
CREATE INDEX idx_comment_interactions_user_id ON comment_interactions(user_id);
CREATE INDEX idx_comment_interactions_session_id ON comment_interactions(session_id);

CREATE INDEX idx_comment_metrics_algorithm_score ON comment_metrics(combined_algorithm_score DESC);
CREATE INDEX idx_comment_metrics_interaction_rate ON comment_metrics(interaction_rate DESC);
CREATE INDEX idx_comment_metrics_last_interaction ON comment_metrics(last_interaction_at DESC);

-- Functions for algorithm score calculations
CREATE OR REPLACE FUNCTION calculate_recency_score(comment_created_at TIMESTAMP)
RETURNS FLOAT AS $$
BEGIN
  -- Higher score for newer comments (max 100, decays over 30 days)
  RETURN GREATEST(0, 100 - EXTRACT(EPOCH FROM (NOW() - comment_created_at)) / 86400 / 30 * 100);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION calculate_interaction_rate(total_interactions INTEGER, created_at TIMESTAMP)
RETURNS FLOAT AS $$
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

CREATE OR REPLACE FUNCTION calculate_engagement_score(
  reply_count INTEGER,
  reaction_count INTEGER,
  deep_read_count INTEGER,
  view_count INTEGER
)
RETURNS FLOAT AS $$
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

-- Trigger function to update metrics when interactions are recorded
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

-- Create the trigger
CREATE TRIGGER comment_interaction_metrics_trigger
  AFTER INSERT ON comment_interactions
  FOR EACH ROW EXECUTE FUNCTION update_comment_metrics();

-- Initialize metrics for existing comments
INSERT INTO comment_metrics (comment_id, first_interaction_at)
SELECT id, created_at FROM comments
ON CONFLICT (comment_id) DO NOTHING;