-- Migration: 013 - Post Type Controls
-- Description: Add granular controls for different post types in groups
-- Date: 2025-10-20
-- Requires: 009_group_system.sql

-- Add post type control columns to groups table
ALTER TABLE groups ADD COLUMN IF NOT EXISTS allow_text_posts BOOLEAN DEFAULT TRUE;
ALTER TABLE groups ADD COLUMN IF NOT EXISTS allow_link_posts BOOLEAN DEFAULT TRUE;
ALTER TABLE groups ADD COLUMN IF NOT EXISTS allow_image_posts BOOLEAN DEFAULT TRUE;
ALTER TABLE groups ADD COLUMN IF NOT EXISTS allow_video_posts BOOLEAN DEFAULT TRUE;
ALTER TABLE groups ADD COLUMN IF NOT EXISTS allow_poll_posts BOOLEAN DEFAULT TRUE;

-- Add rules column for group rules/guidelines
ALTER TABLE groups ADD COLUMN IF NOT EXISTS rules TEXT;

-- Update existing groups to have all post types enabled by default
UPDATE groups SET
  allow_text_posts = TRUE,
  allow_link_posts = TRUE,
  allow_image_posts = TRUE,
  allow_video_posts = TRUE,
  allow_poll_posts = TRUE
WHERE allow_text_posts IS NULL OR allow_link_posts IS NULL OR allow_image_posts IS NULL OR allow_video_posts IS NULL OR allow_poll_posts IS NULL;
