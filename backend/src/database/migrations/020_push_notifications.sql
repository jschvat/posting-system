-- Migration 020: Push Notifications System
-- Adds device token management and push notification tracking

-- Device tokens table (stores FCM tokens for user devices)
CREATE TABLE IF NOT EXISTS device_tokens (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  platform VARCHAR(20) NOT NULL CHECK (platform IN ('ios', 'android', 'web')),
  device_name VARCHAR(255), -- e.g., "iPhone 14 Pro", "Pixel 7"
  device_id VARCHAR(255), -- unique device identifier
  app_version VARCHAR(50), -- e.g., "1.2.3"
  is_active BOOLEAN DEFAULT true,
  last_used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- Ensure one token per device
  UNIQUE(user_id, device_id)
);

-- Indexes for device_tokens
CREATE INDEX IF NOT EXISTS idx_device_tokens_user_id ON device_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_device_tokens_active ON device_tokens(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_device_tokens_token ON device_tokens(token);

-- Push notification delivery tracking
CREATE TABLE IF NOT EXISTS push_notification_logs (
  id SERIAL PRIMARY KEY,
  notification_id INTEGER REFERENCES notifications(id) ON DELETE CASCADE,
  device_token_id INTEGER REFERENCES device_tokens(id) ON DELETE SET NULL,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  fcm_message_id VARCHAR(255), -- FCM response message ID
  status VARCHAR(50) NOT NULL DEFAULT 'pending', -- 'pending', 'sent', 'delivered', 'failed', 'clicked'
  error_message TEXT, -- Error details if failed
  sent_at TIMESTAMP,
  delivered_at TIMESTAMP,
  clicked_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for push_notification_logs
CREATE INDEX IF NOT EXISTS idx_push_logs_notification ON push_notification_logs(notification_id);
CREATE INDEX IF NOT EXISTS idx_push_logs_user ON push_notification_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_push_logs_status ON push_notification_logs(status);
CREATE INDEX IF NOT EXISTS idx_push_logs_created ON push_notification_logs(created_at);

-- Failed token tracking (for cleanup)
CREATE TABLE IF NOT EXISTS failed_tokens (
  id SERIAL PRIMARY KEY,
  device_token_id INTEGER REFERENCES device_tokens(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  error_code VARCHAR(50), -- 'NotRegistered', 'InvalidRegistration', etc.
  error_message TEXT,
  failed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for failed_tokens
CREATE INDEX IF NOT EXISTS idx_failed_tokens_created ON failed_tokens(failed_at);

-- Add push_enabled to notification_preferences if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'notification_preferences'
    AND column_name = 'push_enabled'
  ) THEN
    ALTER TABLE notification_preferences
    ADD COLUMN push_enabled BOOLEAN DEFAULT true;
  END IF;
END $$;

-- Trigger to update updated_at on device_tokens
CREATE OR REPLACE FUNCTION update_device_token_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS device_tokens_update_timestamp ON device_tokens;
CREATE TRIGGER device_tokens_update_timestamp
  BEFORE UPDATE ON device_tokens
  FOR EACH ROW
  EXECUTE FUNCTION update_device_token_timestamp();

-- Comments
COMMENT ON TABLE device_tokens IS 'Stores FCM device tokens for push notifications';
COMMENT ON TABLE push_notification_logs IS 'Tracks push notification delivery status';
COMMENT ON TABLE failed_tokens IS 'Tracks failed tokens for cleanup and debugging';
