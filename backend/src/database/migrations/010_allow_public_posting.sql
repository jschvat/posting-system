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
