# Database Schema Design

## Overview
This document outlines the database schema for the social media posting platform. The schema supports posts, nested comments, media attachments, emoji reactions, and user management.

## Tables

### 1. Users Table
Stores user information and profile data.

```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    bio TEXT,
    avatar_url VARCHAR(500),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### 2. Posts Table
Stores main posts created by users.

```sql
CREATE TABLE posts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    privacy_level VARCHAR(20) DEFAULT 'public', -- 'public', 'friends', 'private'
    is_published BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### 3. Comments Table
Stores comments and replies with support for nested threading.

```sql
CREATE TABLE comments (
    id SERIAL PRIMARY KEY,
    post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    parent_id INTEGER REFERENCES comments(id) ON DELETE CASCADE, -- For nested replies
    content TEXT NOT NULL,
    is_published BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### 4. Media Table
Stores metadata for uploaded images and multimedia files.

```sql
CREATE TABLE media (
    id SERIAL PRIMARY KEY,
    post_id INTEGER REFERENCES posts(id) ON DELETE CASCADE,
    comment_id INTEGER REFERENCES comments(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    filename VARCHAR(255) NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size INTEGER NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    media_type VARCHAR(50) NOT NULL, -- 'image', 'video', 'audio', 'document'
    alt_text VARCHAR(500),
    width INTEGER, -- For images/videos
    height INTEGER, -- For images/videos
    duration INTEGER, -- For videos/audio in seconds
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- Ensure media belongs to either a post or comment, not both
    CONSTRAINT check_media_association CHECK (
        (post_id IS NOT NULL AND comment_id IS NULL) OR
        (post_id IS NULL AND comment_id IS NOT NULL)
    )
);
```

### 5. Reactions Table
Stores emoji reactions on posts and comments.

```sql
CREATE TABLE reactions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    post_id INTEGER REFERENCES posts(id) ON DELETE CASCADE,
    comment_id INTEGER REFERENCES comments(id) ON DELETE CASCADE,
    emoji_unicode VARCHAR(20) NOT NULL, -- Unicode representation of emoji
    emoji_name VARCHAR(50) NOT NULL, -- Human readable name like 'thumbs_up'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- Ensure reaction is on either a post or comment, not both
    CONSTRAINT check_reaction_association CHECK (
        (post_id IS NOT NULL AND comment_id IS NULL) OR
        (post_id IS NULL AND comment_id IS NOT NULL)
    ),

    -- Prevent duplicate reactions from same user on same content
    UNIQUE(user_id, post_id, emoji_unicode),
    UNIQUE(user_id, comment_id, emoji_unicode)
);
```

### 6. Friendships Table (Future Enhancement)
For managing friend relationships between users.

```sql
CREATE TABLE friendships (
    id SERIAL PRIMARY KEY,
    requester_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    addressee_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'accepted', 'blocked'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- Prevent self-friendship and duplicate requests
    CONSTRAINT check_no_self_friendship CHECK (requester_id != addressee_id),
    UNIQUE(requester_id, addressee_id)
);
```

## Indexes

### Performance Indexes
```sql
-- Posts indexes
CREATE INDEX idx_posts_user_id ON posts(user_id);
CREATE INDEX idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX idx_posts_user_created ON posts(user_id, created_at DESC);

-- Comments indexes
CREATE INDEX idx_comments_post_id ON comments(post_id);
CREATE INDEX idx_comments_user_id ON comments(user_id);
CREATE INDEX idx_comments_parent_id ON comments(parent_id);
CREATE INDEX idx_comments_post_created ON comments(post_id, created_at);

-- Media indexes
CREATE INDEX idx_media_post_id ON media(post_id);
CREATE INDEX idx_media_comment_id ON media(comment_id);
CREATE INDEX idx_media_user_id ON media(user_id);

-- Reactions indexes
CREATE INDEX idx_reactions_post_id ON reactions(post_id);
CREATE INDEX idx_reactions_comment_id ON reactions(comment_id);
CREATE INDEX idx_reactions_user_id ON reactions(user_id);

-- Users indexes
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);
```

## Relationships

1. **Users → Posts**: One-to-Many (one user can have many posts)
2. **Users → Comments**: One-to-Many (one user can have many comments)
3. **Posts → Comments**: One-to-Many (one post can have many comments)
4. **Comments → Comments**: One-to-Many (parent-child for nested replies)
5. **Posts → Media**: One-to-Many (one post can have multiple media files)
6. **Comments → Media**: One-to-Many (one comment can have multiple media files)
7. **Users → Reactions**: One-to-Many (one user can have many reactions)
8. **Posts → Reactions**: One-to-Many (one post can have many reactions)
9. **Comments → Reactions**: One-to-Many (one comment can have many reactions)

## Data Flow

1. **User creates a post**: Insert into `posts` table
2. **User uploads media with post**: Insert into `media` table with `post_id`
3. **User comments on post**: Insert into `comments` table with `post_id`
4. **User replies to comment**: Insert into `comments` table with `parent_id`
5. **User reacts with emoji**: Insert into `reactions` table
6. **Fetch post feed**: Join `posts`, `users`, `media`, and aggregate `reactions`
7. **Fetch comment tree**: Recursive query on `comments` with `parent_id`

## Sample Queries

### Get Post Feed with User Info and Media
```sql
SELECT
    p.id, p.content, p.created_at,
    u.username, u.first_name, u.last_name, u.avatar_url,
    array_agg(m.file_path) as media_files
FROM posts p
JOIN users u ON p.user_id = u.id
LEFT JOIN media m ON p.id = m.post_id
WHERE p.is_published = true
GROUP BY p.id, u.id
ORDER BY p.created_at DESC;
```

### Get Comment Tree for a Post
```sql
WITH RECURSIVE comment_tree AS (
    -- Base case: top-level comments
    SELECT id, post_id, user_id, parent_id, content, created_at, 0 as depth
    FROM comments
    WHERE post_id = ? AND parent_id IS NULL

    UNION ALL

    -- Recursive case: replies to comments
    SELECT c.id, c.post_id, c.user_id, c.parent_id, c.content, c.created_at, ct.depth + 1
    FROM comments c
    JOIN comment_tree ct ON c.parent_id = ct.id
)
SELECT ct.*, u.username, u.avatar_url
FROM comment_tree ct
JOIN users u ON ct.user_id = u.id
ORDER BY created_at;
```

### Get Reaction Counts for a Post
```sql
SELECT emoji_name, emoji_unicode, COUNT(*) as count
FROM reactions
WHERE post_id = ?
GROUP BY emoji_name, emoji_unicode
ORDER BY count DESC;
```