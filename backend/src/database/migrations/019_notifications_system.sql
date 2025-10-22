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
