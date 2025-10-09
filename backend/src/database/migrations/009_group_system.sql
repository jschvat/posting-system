-- Migration: 009 - Group System
-- Description: Reddit-style community groups with posts, comments, and moderation
-- Date: 2025-10-09
-- Requires: PostgreSQL ltree extension for nested comments

-- ============================================================================
-- EXTENSIONS
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS ltree;

-- ============================================================================
-- GROUPS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS groups (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    slug VARCHAR(100) NOT NULL UNIQUE,
    display_name VARCHAR(255) NOT NULL,
    description TEXT,
    avatar_url VARCHAR(500),
    banner_url VARCHAR(500),

    -- Privacy & Access
    visibility VARCHAR(20) DEFAULT 'public' CHECK (visibility IN ('public', 'private', 'invite_only')),
    require_approval BOOLEAN DEFAULT FALSE,
    allow_posts BOOLEAN DEFAULT TRUE,

    -- Moderation
    post_approval_required BOOLEAN DEFAULT FALSE,
    allow_multimedia BOOLEAN DEFAULT TRUE,
    allowed_media_types TEXT[] DEFAULT ARRAY['image', 'video', 'pdf', 'model', 'link'],
    max_file_size_mb INTEGER DEFAULT 50,

    -- Metadata
    creator_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    member_count INTEGER DEFAULT 0,
    post_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Settings (JSONB for flexible configuration)
    settings JSONB DEFAULT '{}',

    CONSTRAINT valid_name CHECK (name ~ '^[a-zA-Z0-9_-]{3,100}$'),
    CONSTRAINT valid_slug CHECK (slug ~ '^[a-z0-9-]{3,100}$')
);

-- Indexes for groups
CREATE INDEX IF NOT EXISTS idx_groups_slug ON groups(slug);
CREATE INDEX IF NOT EXISTS idx_groups_visibility ON groups(visibility);
CREATE INDEX IF NOT EXISTS idx_groups_creator ON groups(creator_id);
CREATE INDEX IF NOT EXISTS idx_groups_created ON groups(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_groups_name_search ON groups USING gin(to_tsvector('english', display_name || ' ' || COALESCE(description, '')));

-- ============================================================================
-- GROUP MEMBERSHIPS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS group_memberships (
    id SERIAL PRIMARY KEY,
    group_id INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Role & Status
    role VARCHAR(20) DEFAULT 'member' CHECK (role IN ('admin', 'moderator', 'member')),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'banned', 'pending', 'invited')),

    -- Timestamps
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    invited_by INTEGER REFERENCES users(id),
    banned_by INTEGER REFERENCES users(id),
    banned_reason TEXT,
    banned_at TIMESTAMP,

    UNIQUE(group_id, user_id)
);

-- Indexes for group memberships
CREATE INDEX IF NOT EXISTS idx_group_memberships_group ON group_memberships(group_id);
CREATE INDEX IF NOT EXISTS idx_group_memberships_user ON group_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_group_memberships_role ON group_memberships(group_id, role);
CREATE INDEX IF NOT EXISTS idx_group_memberships_status ON group_memberships(status);

-- ============================================================================
-- GROUP POSTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS group_posts (
    id SERIAL PRIMARY KEY,
    group_id INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Content
    title VARCHAR(300),
    content TEXT,
    post_type VARCHAR(20) DEFAULT 'text' CHECK (post_type IN ('text', 'link', 'media', 'poll')),

    -- Link posts
    link_url VARCHAR(1000),
    link_title VARCHAR(500),
    link_description TEXT,
    link_thumbnail VARCHAR(500),

    -- Status & Moderation
    status VARCHAR(20) DEFAULT 'published' CHECK (status IN ('draft', 'pending', 'published', 'removed', 'deleted')),
    approved_by INTEGER REFERENCES users(id),
    approved_at TIMESTAMP,
    removed_by INTEGER REFERENCES users(id),
    removed_at TIMESTAMP,
    removal_reason TEXT,

    -- Engagement
    upvotes INTEGER DEFAULT 0,
    downvotes INTEGER DEFAULT 0,
    score INTEGER DEFAULT 0, -- Calculated: upvotes - downvotes
    comment_count INTEGER DEFAULT 0,

    -- Flags
    is_pinned BOOLEAN DEFAULT FALSE,
    is_locked BOOLEAN DEFAULT FALSE,
    is_nsfw BOOLEAN DEFAULT FALSE,
    is_spoiler BOOLEAN DEFAULT FALSE,

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    edited_at TIMESTAMP,

    CONSTRAINT valid_content CHECK (
        (post_type = 'text' AND (title IS NOT NULL OR content IS NOT NULL)) OR
        (post_type = 'link' AND link_url IS NOT NULL) OR
        (post_type = 'media') OR
        (post_type = 'poll')
    )
);

-- Indexes for group posts
CREATE INDEX IF NOT EXISTS idx_group_posts_group ON group_posts(group_id);
CREATE INDEX IF NOT EXISTS idx_group_posts_user ON group_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_group_posts_status ON group_posts(status);
CREATE INDEX IF NOT EXISTS idx_group_posts_created ON group_posts(group_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_group_posts_score ON group_posts(group_id, score DESC);
CREATE INDEX IF NOT EXISTS idx_group_posts_pinned ON group_posts(group_id, is_pinned, created_at DESC);

-- ============================================================================
-- GROUP POST MEDIA TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS group_post_media (
    id SERIAL PRIMARY KEY,
    post_id INTEGER NOT NULL REFERENCES group_posts(id) ON DELETE CASCADE,

    -- File Info
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_url VARCHAR(500) NOT NULL,
    file_type VARCHAR(50) NOT NULL,
    file_size BIGINT NOT NULL,
    mime_type VARCHAR(100) NOT NULL,

    -- Media Type
    media_type VARCHAR(20) CHECK (media_type IN ('image', 'video', 'pdf', 'model', 'other')),

    -- Image/Video specific
    width INTEGER,
    height INTEGER,
    duration INTEGER, -- seconds for video
    thumbnail_url VARCHAR(500),

    -- Order for galleries
    display_order INTEGER DEFAULT 0,

    -- Metadata
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT valid_file_path CHECK (file_path ~ '^public/media/groups/.*')
);

-- Indexes for group post media
CREATE INDEX IF NOT EXISTS idx_group_post_media_post ON group_post_media(post_id);
CREATE INDEX IF NOT EXISTS idx_group_post_media_type ON group_post_media(media_type);

-- ============================================================================
-- GROUP COMMENTS TABLE (Nested/Threaded using ltree)
-- ============================================================================
CREATE TABLE IF NOT EXISTS group_comments (
    id SERIAL PRIMARY KEY,
    post_id INTEGER NOT NULL REFERENCES group_posts(id) ON DELETE CASCADE,
    parent_id INTEGER REFERENCES group_comments(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Content
    content TEXT NOT NULL,

    -- Status
    status VARCHAR(20) DEFAULT 'published' CHECK (status IN ('published', 'removed', 'deleted')),
    removed_by INTEGER REFERENCES users(id),
    removed_at TIMESTAMP,
    removal_reason TEXT,

    -- Engagement
    upvotes INTEGER DEFAULT 0,
    downvotes INTEGER DEFAULT 0,
    score INTEGER DEFAULT 0,

    -- Nesting
    depth INTEGER DEFAULT 0,
    path LTREE, -- PostgreSQL ltree for efficient nested queries

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    edited_at TIMESTAMP
);

-- Indexes for group comments
CREATE INDEX IF NOT EXISTS idx_group_comments_post ON group_comments(post_id);
CREATE INDEX IF NOT EXISTS idx_group_comments_parent ON group_comments(parent_id);
CREATE INDEX IF NOT EXISTS idx_group_comments_user ON group_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_group_comments_path ON group_comments USING GIST (path);
CREATE INDEX IF NOT EXISTS idx_group_comments_created ON group_comments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_group_comments_score ON group_comments(post_id, score DESC);

-- ============================================================================
-- GROUP COMMENT MEDIA TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS group_comment_media (
    id SERIAL PRIMARY KEY,
    comment_id INTEGER NOT NULL REFERENCES group_comments(id) ON DELETE CASCADE,

    -- File Info (same structure as post media)
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_url VARCHAR(500) NOT NULL,
    file_type VARCHAR(50) NOT NULL,
    file_size BIGINT NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    media_type VARCHAR(20) CHECK (media_type IN ('image', 'video', 'pdf', 'model', 'other')),

    width INTEGER,
    height INTEGER,
    duration INTEGER,
    thumbnail_url VARCHAR(500),
    display_order INTEGER DEFAULT 0,

    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT valid_comment_file_path CHECK (file_path ~ '^public/media/groups/.*')
);

-- Indexes for group comment media
CREATE INDEX IF NOT EXISTS idx_group_comment_media_comment ON group_comment_media(comment_id);

-- ============================================================================
-- GROUP INVITATIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS group_invitations (
    id SERIAL PRIMARY KEY,
    group_id INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    inviter_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    invitee_id INTEGER REFERENCES users(id), -- NULL for email invites
    invitee_email VARCHAR(255),

    -- Status
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),

    -- Token for email invites
    token VARCHAR(255) UNIQUE,
    expires_at TIMESTAMP,

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    responded_at TIMESTAMP,

    CONSTRAINT valid_invitee CHECK (invitee_id IS NOT NULL OR invitee_email IS NOT NULL)
);

-- Indexes for group invitations
CREATE INDEX IF NOT EXISTS idx_group_invitations_group ON group_invitations(group_id);
CREATE INDEX IF NOT EXISTS idx_group_invitations_invitee ON group_invitations(invitee_id);
CREATE INDEX IF NOT EXISTS idx_group_invitations_token ON group_invitations(token);
CREATE INDEX IF NOT EXISTS idx_group_invitations_status ON group_invitations(status);

-- ============================================================================
-- GROUP VOTES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS group_votes (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Votable entity (post or comment)
    post_id INTEGER REFERENCES group_posts(id) ON DELETE CASCADE,
    comment_id INTEGER REFERENCES group_comments(id) ON DELETE CASCADE,

    -- Vote value
    vote_type VARCHAR(10) CHECK (vote_type IN ('upvote', 'downvote')),

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT valid_vote_target CHECK (
        (post_id IS NOT NULL AND comment_id IS NULL) OR
        (post_id IS NULL AND comment_id IS NOT NULL)
    ),
    CONSTRAINT unique_post_vote UNIQUE (user_id, post_id),
    CONSTRAINT unique_comment_vote UNIQUE (user_id, comment_id)
);

-- Indexes for group votes
CREATE INDEX IF NOT EXISTS idx_group_votes_user ON group_votes(user_id);
CREATE INDEX IF NOT EXISTS idx_group_votes_post ON group_votes(post_id);
CREATE INDEX IF NOT EXISTS idx_group_votes_comment ON group_votes(comment_id);

-- ============================================================================
-- GROUP ACTIVITY LOG TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS group_activity_log (
    id SERIAL PRIMARY KEY,
    group_id INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id),

    -- Action
    action_type VARCHAR(50) NOT NULL, -- 'post_created', 'user_banned', 'post_removed', etc.
    target_type VARCHAR(50), -- 'post', 'comment', 'user', 'group'
    target_id INTEGER,

    -- Details
    details JSONB DEFAULT '{}',

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for group activity log
CREATE INDEX IF NOT EXISTS idx_group_activity_log_group ON group_activity_log(group_id);
CREATE INDEX IF NOT EXISTS idx_group_activity_log_created ON group_activity_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_group_activity_log_action ON group_activity_log(action_type);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Update updated_at timestamp trigger (reuse existing function)
DROP TRIGGER IF EXISTS update_groups_updated_at ON groups;
CREATE TRIGGER update_groups_updated_at BEFORE UPDATE ON groups
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_group_posts_updated_at ON group_posts;
CREATE TRIGGER update_group_posts_updated_at BEFORE UPDATE ON group_posts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_group_comments_updated_at ON group_comments;
CREATE TRIGGER update_group_comments_updated_at BEFORE UPDATE ON group_comments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_group_votes_updated_at ON group_votes;
CREATE TRIGGER update_group_votes_updated_at BEFORE UPDATE ON group_votes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- FUNCTIONS FOR GROUP MANAGEMENT
-- ============================================================================

-- Function to update group member count
CREATE OR REPLACE FUNCTION update_group_member_count()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT' AND NEW.status = 'active') THEN
        UPDATE groups
        SET member_count = member_count + 1,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = NEW.group_id;
    ELSIF (TG_OP = 'DELETE' AND OLD.status = 'active') THEN
        UPDATE groups
        SET member_count = GREATEST(0, member_count - 1),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = OLD.group_id;
    ELSIF (TG_OP = 'UPDATE') THEN
        -- Status changed from active to something else
        IF OLD.status = 'active' AND NEW.status != 'active' THEN
            UPDATE groups
            SET member_count = GREATEST(0, member_count - 1),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = NEW.group_id;
        -- Status changed to active from something else
        ELSIF OLD.status != 'active' AND NEW.status = 'active' THEN
            UPDATE groups
            SET member_count = member_count + 1,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = NEW.group_id;
        END IF;
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update member count
DROP TRIGGER IF EXISTS trigger_update_group_member_count ON group_memberships;
CREATE TRIGGER trigger_update_group_member_count
AFTER INSERT OR UPDATE OR DELETE ON group_memberships
FOR EACH ROW EXECUTE FUNCTION update_group_member_count();

-- Function to update group post count
CREATE OR REPLACE FUNCTION update_group_post_count()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT' AND NEW.status = 'published') THEN
        UPDATE groups
        SET post_count = post_count + 1,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = NEW.group_id;
    ELSIF (TG_OP = 'DELETE' AND OLD.status = 'published') THEN
        UPDATE groups
        SET post_count = GREATEST(0, post_count - 1),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = OLD.group_id;
    ELSIF (TG_OP = 'UPDATE') THEN
        IF OLD.status = 'published' AND NEW.status != 'published' THEN
            UPDATE groups
            SET post_count = GREATEST(0, post_count - 1),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = NEW.group_id;
        ELSIF OLD.status != 'published' AND NEW.status = 'published' THEN
            UPDATE groups
            SET post_count = post_count + 1,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = NEW.group_id;
        END IF;
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update post count
DROP TRIGGER IF EXISTS trigger_update_group_post_count ON group_posts;
CREATE TRIGGER trigger_update_group_post_count
AFTER INSERT OR UPDATE OR DELETE ON group_posts
FOR EACH ROW EXECUTE FUNCTION update_group_post_count();

-- Function to update post vote counts
CREATE OR REPLACE FUNCTION update_group_post_votes()
RETURNS TRIGGER AS $$
DECLARE
    upvote_count INTEGER;
    downvote_count INTEGER;
    new_score INTEGER;
    target_post_id INTEGER;
BEGIN
    -- Get post_id from NEW or OLD
    target_post_id := COALESCE(NEW.post_id, OLD.post_id);

    -- Skip if this is for a comment vote
    IF target_post_id IS NULL THEN
        RETURN NULL;
    END IF;

    -- Get current vote counts
    SELECT
        COUNT(*) FILTER (WHERE vote_type = 'upvote'),
        COUNT(*) FILTER (WHERE vote_type = 'downvote')
    INTO upvote_count, downvote_count
    FROM group_votes
    WHERE post_id = target_post_id;

    -- Calculate score
    new_score := upvote_count - downvote_count;

    -- Update post
    UPDATE group_posts
    SET
        upvotes = upvote_count,
        downvotes = downvote_count,
        score = new_score,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = target_post_id;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update post votes
DROP TRIGGER IF EXISTS trigger_update_group_post_votes ON group_votes;
CREATE TRIGGER trigger_update_group_post_votes
AFTER INSERT OR UPDATE OR DELETE ON group_votes
FOR EACH ROW
EXECUTE FUNCTION update_group_post_votes();

-- Function to update comment vote counts
CREATE OR REPLACE FUNCTION update_group_comment_votes()
RETURNS TRIGGER AS $$
DECLARE
    upvote_count INTEGER;
    downvote_count INTEGER;
    new_score INTEGER;
    target_comment_id INTEGER;
BEGIN
    -- Get comment_id from NEW or OLD
    target_comment_id := COALESCE(NEW.comment_id, OLD.comment_id);

    -- Skip if this is for a post vote
    IF target_comment_id IS NULL THEN
        RETURN NULL;
    END IF;

    -- Get current vote counts
    SELECT
        COUNT(*) FILTER (WHERE vote_type = 'upvote'),
        COUNT(*) FILTER (WHERE vote_type = 'downvote')
    INTO upvote_count, downvote_count
    FROM group_votes
    WHERE comment_id = target_comment_id;

    -- Calculate score
    new_score := upvote_count - downvote_count;

    -- Update comment
    UPDATE group_comments
    SET
        upvotes = upvote_count,
        downvotes = downvote_count,
        score = new_score,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = target_comment_id;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update comment votes
DROP TRIGGER IF EXISTS trigger_update_group_comment_votes ON group_votes;
CREATE TRIGGER trigger_update_group_comment_votes
AFTER INSERT OR UPDATE OR DELETE ON group_votes
FOR EACH ROW
EXECUTE FUNCTION update_group_comment_votes();

-- Function to update comment count on posts
CREATE OR REPLACE FUNCTION update_group_post_comment_count()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT' AND NEW.status = 'published') THEN
        UPDATE group_posts
        SET comment_count = comment_count + 1,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = NEW.post_id;
    ELSIF (TG_OP = 'DELETE' AND OLD.status = 'published') THEN
        UPDATE group_posts
        SET comment_count = GREATEST(0, comment_count - 1),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = OLD.post_id;
    ELSIF (TG_OP = 'UPDATE') THEN
        IF OLD.status = 'published' AND NEW.status != 'published' THEN
            UPDATE group_posts
            SET comment_count = GREATEST(0, comment_count - 1),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = NEW.post_id;
        ELSIF OLD.status != 'published' AND NEW.status = 'published' THEN
            UPDATE group_posts
            SET comment_count = comment_count + 1,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = NEW.post_id;
        END IF;
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update comment count
DROP TRIGGER IF EXISTS trigger_update_group_post_comment_count ON group_comments;
CREATE TRIGGER trigger_update_group_post_comment_count
AFTER INSERT OR UPDATE OR DELETE ON group_comments
FOR EACH ROW EXECUTE FUNCTION update_group_post_comment_count();

-- Function to set comment path for nested comments
CREATE OR REPLACE FUNCTION set_group_comment_path()
RETURNS TRIGGER AS $$
DECLARE
    parent_path LTREE;
BEGIN
    IF NEW.parent_id IS NULL THEN
        -- Top-level comment
        NEW.path := text2ltree(NEW.id::text);
        NEW.depth := 0;
    ELSE
        -- Nested comment
        SELECT path, depth INTO parent_path, NEW.depth
        FROM group_comments
        WHERE id = NEW.parent_id;

        IF parent_path IS NULL THEN
            RAISE EXCEPTION 'Parent comment not found';
        END IF;

        NEW.path := parent_path || text2ltree(NEW.id::text);
        NEW.depth := NEW.depth + 1;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to set comment path
DROP TRIGGER IF EXISTS trigger_set_group_comment_path ON group_comments;
CREATE TRIGGER trigger_set_group_comment_path
BEFORE INSERT ON group_comments
FOR EACH ROW EXECUTE FUNCTION set_group_comment_path();

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to check if user is group member
CREATE OR REPLACE FUNCTION is_group_member(p_user_id INTEGER, p_group_id INTEGER)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM group_memberships
        WHERE user_id = p_user_id
        AND group_id = p_group_id
        AND status = 'active'
    );
END;
$$ LANGUAGE plpgsql;

-- Function to check if user is group moderator or admin
CREATE OR REPLACE FUNCTION is_group_moderator(p_user_id INTEGER, p_group_id INTEGER)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM group_memberships
        WHERE user_id = p_user_id
        AND group_id = p_group_id
        AND status = 'active'
        AND role IN ('moderator', 'admin')
    );
END;
$$ LANGUAGE plpgsql;

-- Function to check if user is group admin
CREATE OR REPLACE FUNCTION is_group_admin(p_user_id INTEGER, p_group_id INTEGER)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM group_memberships
        WHERE user_id = p_user_id
        AND group_id = p_group_id
        AND status = 'active'
        AND role = 'admin'
    );
END;
$$ LANGUAGE plpgsql;

-- Function to get user role in group
CREATE OR REPLACE FUNCTION get_group_user_role(p_user_id INTEGER, p_group_id INTEGER)
RETURNS VARCHAR(20) AS $$
DECLARE
    user_role VARCHAR(20);
BEGIN
    SELECT role INTO user_role
    FROM group_memberships
    WHERE user_id = p_user_id
    AND group_id = p_group_id
    AND status = 'active';

    RETURN user_role;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE groups IS 'Reddit-style community groups';
COMMENT ON TABLE group_memberships IS 'User memberships in groups with roles (admin, moderator, member)';
COMMENT ON TABLE group_posts IS 'Posts within groups';
COMMENT ON TABLE group_post_media IS 'Media attachments for group posts';
COMMENT ON TABLE group_comments IS 'Nested comments on group posts using ltree';
COMMENT ON TABLE group_comment_media IS 'Media attachments for group comments';
COMMENT ON TABLE group_invitations IS 'Invitations to join groups';
COMMENT ON TABLE group_votes IS 'Upvote/downvote system for posts and comments';
COMMENT ON TABLE group_activity_log IS 'Audit log for moderation actions';

COMMENT ON COLUMN groups.visibility IS 'public: anyone can view, private: members only, invite_only: invite required';
COMMENT ON COLUMN groups.post_approval_required IS 'If true, posts require moderator approval before publishing';
COMMENT ON COLUMN group_memberships.role IS 'admin: full control, moderator: can moderate content, member: regular member';
COMMENT ON COLUMN group_posts.score IS 'Reddit-style score: upvotes - downvotes';
COMMENT ON COLUMN group_comments.path IS 'ltree path for efficient nested comment queries';
COMMENT ON COLUMN group_comments.depth IS 'Nesting depth (0 for top-level comments)';
