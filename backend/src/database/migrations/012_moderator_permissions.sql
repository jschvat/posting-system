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
