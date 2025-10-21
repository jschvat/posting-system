-- Migration: 014 - Profile Enhancements
-- Description: Add profile customization fields (banner, website, social links, job info)
-- Date: 2025-10-20
-- Requires: existing users table

-- Add profile customization columns
ALTER TABLE users ADD COLUMN IF NOT EXISTS banner_url CHARACTER VARYING(500);
ALTER TABLE users ADD COLUMN IF NOT EXISTS website CHARACTER VARYING(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS twitter_handle CHARACTER VARYING(50);
ALTER TABLE users ADD COLUMN IF NOT EXISTS linkedin_url CHARACTER VARYING(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS github_username CHARACTER VARYING(50);
ALTER TABLE users ADD COLUMN IF NOT EXISTS job_title CHARACTER VARYING(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS company CHARACTER VARYING(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS tagline CHARACTER VARYING(200);

-- Add profile visibility settings
ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_visibility CHARACTER VARYING(20) DEFAULT 'public';

-- Add constraint for profile visibility
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'users_profile_visibility_check'
    ) THEN
        ALTER TABLE users ADD CONSTRAINT users_profile_visibility_check
        CHECK (profile_visibility IN ('public', 'followers', 'private'));
    END IF;
END$$;

-- Create index for profile visibility queries
CREATE INDEX IF NOT EXISTS idx_users_profile_visibility ON users(profile_visibility);
