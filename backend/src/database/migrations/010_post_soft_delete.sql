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
