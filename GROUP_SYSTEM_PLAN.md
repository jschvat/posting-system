# Group System Implementation Plan
## Reddit-Style Community Groups

**Version:** 1.0
**Last Updated:** 2025-10-08
**Status:** Planning Phase

---

## Table of Contents
1. [Overview](#overview)
2. [Database Schema](#database-schema)
3. [Backend API Endpoints](#backend-api-endpoints)
4. [File Upload & Media Handling](#file-upload--media-handling)
5. [Frontend Components](#frontend-components)
6. [Permissions & Authorization](#permissions--authorization)
7. [Implementation Phases](#implementation-phases)
8. [Testing Strategy](#testing-strategy)
9. [Security Considerations](#security-considerations)

---

## Overview

### Goals
- Create Reddit-style community groups (subreddit-like)
- Support multiple content types (text, images, videos, PDFs, 3D models, links)
- Implement threaded/nested comments with multimedia support
- Provide granular permission system (admin, moderator, member)
- Enable group privacy controls (public, private, invitation-only)
- Support post moderation (pre-approval, post-approval)

### Key Features
- **Group Management:** Create, update, delete groups
- **Membership:** Join, leave, invite, ban users
- **Content:** Multi-media posts with nested comments
- **Moderation:** Post approval, content editing/deletion, user bans
- **Privacy:** Public, private, invite-only groups
- **Media Storage:** Organized file structure in `public/media/groups/`

---

## Database Schema

### Integration with Existing System

**✅ This plan fully integrates with the existing database schema:**

#### Uses Existing `users` Table
All group functionality references the existing `users` table:
- **Group creators:** `groups.creator_id` → `users.id`
- **Group members:** `group_memberships.user_id` → `users.id`
- **Post authors:** `group_posts.user_id` → `users.id`
- **Comment authors:** `group_comments.user_id` → `users.id`
- **Moderators/Admins:** Stored as roles in `group_memberships`
- **Inviters/Invitees:** `group_invitations` → `users.id`
- **Voters:** `group_votes.user_id` → `users.id`

#### Existing User Data Utilized
- User profiles (username, avatar, bio) display in groups
- User authentication (existing JWT system) works for groups
- User location data can be displayed in group profiles
- User reputation/stats can extend to group activity

#### No Changes to Existing Tables
- ✅ `users` table: **No modifications needed**
- ✅ `posts` table: **Remains unchanged** (groups use separate `group_posts`)
- ✅ `comments` table: **Remains unchanged** (groups use separate `group_comments`)
- ✅ `media` table: **Remains unchanged** (groups use separate `group_post_media`)
- ✅ `reactions` table: **Can coexist** (groups use separate `group_votes`)
- ✅ `follows` table: **Compatible** (users can follow group members)

#### New Tables Added
9 new tables, all prefixed with `group_` for clarity:
1. `groups` - Group metadata and settings
2. `group_memberships` - User membership and roles
3. `group_posts` - Posts within groups
4. `group_post_media` - Media attachments for posts
5. `group_comments` - Nested comments on posts
6. `group_comment_media` - Media attachments for comments
7. `group_invitations` - Invitation system
8. `group_votes` - Upvote/downvote system
9. `group_activity_log` - Moderation audit trail

#### Architecture Benefits
- **Non-disruptive:** Existing features continue working unchanged
- **Parallel systems:** Groups and regular posts can coexist
- **Data integrity:** Foreign key constraints ensure consistency
- **Extensible:** Easy to add cross-posting between groups and main feed later

### 1. Groups Table
```sql
CREATE TABLE groups (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  slug VARCHAR(100) NOT NULL UNIQUE,
  display_name VARCHAR(255) NOT NULL,
  description TEXT,
  avatar_url VARCHAR(500),
  banner_url VARCHAR(500),

  -- Privacy & Access
  visibility VARCHAR(20) DEFAULT 'public' CHECK (visibility IN ('public', 'private', 'invite_only')),
  require_approval BOOLEAN DEFAULT false,
  allow_posts BOOLEAN DEFAULT true,

  -- Moderation
  post_approval_required BOOLEAN DEFAULT false,
  allow_multimedia BOOLEAN DEFAULT true,
  allowed_media_types TEXT[], -- ['image', 'video', 'pdf', 'model', 'link']
  max_file_size_mb INTEGER DEFAULT 50,

  -- Metadata
  creator_id INTEGER NOT NULL REFERENCES users(id),
  member_count INTEGER DEFAULT 0,
  post_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- Settings
  settings JSONB DEFAULT '{}', -- Flexible settings storage

  CONSTRAINT valid_name CHECK (name ~ '^[a-zA-Z0-9_-]{3,100}$')
);

CREATE INDEX idx_groups_slug ON groups(slug);
CREATE INDEX idx_groups_visibility ON groups(visibility);
CREATE INDEX idx_groups_creator ON groups(creator_id);
```

### 2. Group Memberships Table
```sql
CREATE TABLE group_memberships (
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

CREATE INDEX idx_group_memberships_group ON group_memberships(group_id);
CREATE INDEX idx_group_memberships_user ON group_memberships(user_id);
CREATE INDEX idx_group_memberships_role ON group_memberships(group_id, role);
```

### 3. Group Posts Table
```sql
CREATE TABLE group_posts (
  id SERIAL PRIMARY KEY,
  group_id INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id),

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
  is_pinned BOOLEAN DEFAULT false,
  is_locked BOOLEAN DEFAULT false,
  is_nsfw BOOLEAN DEFAULT false,
  is_spoiler BOOLEAN DEFAULT false,

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  edited_at TIMESTAMP,

  CONSTRAINT valid_content CHECK (
    (post_type = 'text' AND content IS NOT NULL) OR
    (post_type = 'link' AND link_url IS NOT NULL) OR
    (post_type = 'media') OR
    (post_type = 'poll')
  )
);

CREATE INDEX idx_group_posts_group ON group_posts(group_id);
CREATE INDEX idx_group_posts_user ON group_posts(user_id);
CREATE INDEX idx_group_posts_status ON group_posts(status);
CREATE INDEX idx_group_posts_created ON group_posts(created_at DESC);
CREATE INDEX idx_group_posts_score ON group_posts(score DESC);
```

### 4. Group Post Media Table
```sql
CREATE TABLE group_post_media (
  id SERIAL PRIMARY KEY,
  post_id INTEGER NOT NULL REFERENCES group_posts(id) ON DELETE CASCADE,

  -- File Info
  file_name VARCHAR(255) NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  file_url VARCHAR(500) NOT NULL,
  file_type VARCHAR(50) NOT NULL, -- 'image/jpeg', 'video/mp4', 'application/pdf', 'model/gltf', etc.
  file_size BIGINT NOT NULL, -- in bytes
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

CREATE INDEX idx_group_post_media_post ON group_post_media(post_id);
CREATE INDEX idx_group_post_media_type ON group_post_media(media_type);
```

### 5. Group Comments Table (Nested/Threaded)
```sql
CREATE TABLE group_comments (
  id SERIAL PRIMARY KEY,
  post_id INTEGER NOT NULL REFERENCES group_posts(id) ON DELETE CASCADE,
  parent_id INTEGER REFERENCES group_comments(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id),

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

CREATE INDEX idx_group_comments_post ON group_comments(post_id);
CREATE INDEX idx_group_comments_parent ON group_comments(parent_id);
CREATE INDEX idx_group_comments_user ON group_comments(user_id);
CREATE INDEX idx_group_comments_path ON group_comments USING GIST (path);
CREATE INDEX idx_group_comments_created ON group_comments(created_at DESC);
```

### 6. Group Comment Media Table
```sql
CREATE TABLE group_comment_media (
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

CREATE INDEX idx_group_comment_media_comment ON group_comment_media(comment_id);
```

### 7. Group Invitations Table
```sql
CREATE TABLE group_invitations (
  id SERIAL PRIMARY KEY,
  group_id INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  inviter_id INTEGER NOT NULL REFERENCES users(id),
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

CREATE INDEX idx_group_invitations_group ON group_invitations(group_id);
CREATE INDEX idx_group_invitations_invitee ON group_invitations(invitee_id);
CREATE INDEX idx_group_invitations_token ON group_invitations(token);
```

### 8. Group Votes Table
```sql
CREATE TABLE group_votes (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),

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

CREATE INDEX idx_group_votes_user ON group_votes(user_id);
CREATE INDEX idx_group_votes_post ON group_votes(post_id);
CREATE INDEX idx_group_votes_comment ON group_votes(comment_id);
```

### 9. Group Activity Log Table
```sql
CREATE TABLE group_activity_log (
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

CREATE INDEX idx_group_activity_log_group ON group_activity_log(group_id);
CREATE INDEX idx_group_activity_log_created ON group_activity_log(created_at DESC);
```

---

## Backend API Endpoints

### Group Management

#### `POST /api/groups`
Create a new group
- **Auth:** Required
- **Body:** `{ name, display_name, description, visibility, settings }`
- **Returns:** Created group object
- **Logic:**
  - Validate name uniqueness
  - Generate slug from name
  - Create group with creator as admin
  - Create initial membership record

#### `GET /api/groups`
List all groups (with filters)
- **Auth:** Optional
- **Query:** `?visibility=public&search=keyword&sort=members&page=1&limit=20`
- **Returns:** Paginated list of groups
- **Logic:**
  - Filter by visibility (public always visible, private/invite-only only if member)
  - Support search by name/description
  - Sort by: members, posts, created_at, name

#### `GET /api/groups/:groupId` or `GET /api/groups/slug/:slug`
Get group details
- **Auth:** Optional
- **Returns:** Group object with stats
- **Logic:**
  - Check visibility/membership
  - Include: member_count, post_count, current user's role

#### `PUT /api/groups/:groupId`
Update group settings
- **Auth:** Required (admin only)
- **Body:** `{ display_name, description, avatar_url, visibility, settings }`
- **Returns:** Updated group object

#### `DELETE /api/groups/:groupId`
Delete a group
- **Auth:** Required (admin only)
- **Returns:** Success message
- **Logic:**
  - Soft delete or hard delete based on settings
  - Cascade to posts, comments, memberships

### Group Membership

#### `POST /api/groups/:groupId/join`
Join a group
- **Auth:** Required
- **Returns:** Membership object
- **Logic:**
  - Public: instant join
  - Private: create pending membership
  - Invite-only: require invitation

#### `POST /api/groups/:groupId/leave`
Leave a group
- **Auth:** Required
- **Returns:** Success message

#### `GET /api/groups/:groupId/members`
List group members
- **Auth:** Required (members only)
- **Query:** `?role=admin&page=1&limit=50`
- **Returns:** Paginated member list

#### `PUT /api/groups/:groupId/members/:userId`
Update member role or status
- **Auth:** Required (admin/moderator)
- **Body:** `{ role: 'moderator', status: 'active' }`
- **Returns:** Updated membership

#### `POST /api/groups/:groupId/members/:userId/ban`
Ban a user from group
- **Auth:** Required (admin/moderator)
- **Body:** `{ reason: 'spam' }`
- **Returns:** Success message

#### `POST /api/groups/:groupId/invitations`
Invite user to group
- **Auth:** Required (admin/moderator for private groups)
- **Body:** `{ user_id: 123 }` or `{ email: 'user@example.com' }`
- **Returns:** Invitation object

### Group Posts

#### `POST /api/groups/:groupId/posts`
Create a post in group
- **Auth:** Required (member)
- **Body:** `{ title, content, post_type, link_url, media_files }`
- **Returns:** Post object
- **Logic:**
  - Check post permission
  - If approval required: status='pending'
  - Upload media files
  - Create post and media records

#### `GET /api/groups/:groupId/posts`
Get group posts (timeline/feed)
- **Auth:** Optional (public groups)
- **Query:** `?sort=hot&filter=pinned&page=1&limit=20`
- **Returns:** Paginated post list
- **Logic:**
  - Sort by: hot (score + recency), top (score), new (created_at)
  - Filter: pinned, nsfw, status
  - Include: media, author info, vote status

#### `GET /api/groups/:groupId/posts/:postId`
Get single post with comments
- **Auth:** Optional
- **Query:** `?sort=best&depth=3`
- **Returns:** Post with nested comments
- **Logic:**
  - Load post with media
  - Load comments with ltree for nesting
  - Include vote status

#### `PUT /api/groups/:groupId/posts/:postId`
Update a post
- **Auth:** Required (author or moderator)
- **Body:** `{ title, content, is_nsfw }`
- **Returns:** Updated post

#### `DELETE /api/groups/:groupId/posts/:postId`
Delete a post
- **Auth:** Required (author or moderator)
- **Returns:** Success message
- **Logic:**
  - Author: soft delete (status='deleted')
  - Moderator: can hard delete

#### `POST /api/groups/:groupId/posts/:postId/approve`
Approve pending post
- **Auth:** Required (moderator/admin)
- **Returns:** Updated post

#### `POST /api/groups/:groupId/posts/:postId/remove`
Remove post (moderator action)
- **Auth:** Required (moderator/admin)
- **Body:** `{ reason: 'violates rules' }`
- **Returns:** Updated post

### Post Comments

#### `POST /api/groups/:groupId/posts/:postId/comments`
Add comment to post
- **Auth:** Required (member)
- **Body:** `{ content, parent_id, media_files }`
- **Returns:** Comment object
- **Logic:**
  - Validate parent_id if replying
  - Calculate depth and path for nesting
  - Upload media if provided

#### `GET /api/groups/:groupId/posts/:postId/comments`
Get comments for post
- **Auth:** Optional
- **Query:** `?sort=best&parent_id=123`
- **Returns:** Nested comment tree
- **Logic:**
  - Use ltree for efficient nested query
  - Sort by: best (score + recency), top (score), new (created_at)

#### `PUT /api/groups/:groupId/comments/:commentId`
Update comment
- **Auth:** Required (author)
- **Body:** `{ content }`
- **Returns:** Updated comment

#### `DELETE /api/groups/:groupId/comments/:commentId`
Delete comment
- **Auth:** Required (author or moderator)
- **Returns:** Success message

### Voting

#### `POST /api/groups/:groupId/posts/:postId/vote`
Vote on post
- **Auth:** Required (member)
- **Body:** `{ vote_type: 'upvote' }` or `{ vote_type: 'downvote' }`
- **Returns:** Updated vote status
- **Logic:**
  - Upsert vote record
  - Update post score
  - If same vote: remove vote (toggle)

#### `POST /api/groups/:groupId/comments/:commentId/vote`
Vote on comment
- **Auth:** Required (member)
- **Body:** `{ vote_type: 'upvote' }`
- **Returns:** Updated vote status

### Media Upload

#### `POST /api/groups/:groupId/media/upload`
Upload media files
- **Auth:** Required (member)
- **Body:** FormData with files
- **Returns:** Array of media objects with URLs
- **Logic:**
  - Validate file types and sizes
  - Generate unique filenames
  - Save to `public/media/groups/{groupId}/{year}/{month}/`
  - Create thumbnails for images/videos
  - Return file URLs

---

## File Upload & Media Handling

### Directory Structure
```
public/
  media/
    groups/
      {group_id}/
        posts/
          {year}/
            {month}/
              images/
                {filename}.jpg
                {filename}_thumb.jpg
              videos/
                {filename}.mp4
                {filename}_thumb.jpg
              documents/
                {filename}.pdf
              models/
                {filename}.glb
        comments/
          {year}/
            {month}/
              {filename}.jpg
```

### File Upload Configuration (.env)
```bash
# Media Settings
MEDIA_BASE_PATH=public/media
GROUP_MEDIA_PATH=public/media/groups
MAX_FILE_SIZE_MB=50
MAX_FILES_PER_POST=10
MAX_FILES_PER_COMMENT=3

# Allowed MIME Types
ALLOWED_IMAGE_TYPES=image/jpeg,image/png,image/gif,image/webp
ALLOWED_VIDEO_TYPES=video/mp4,video/webm,video/quicktime
ALLOWED_DOCUMENT_TYPES=application/pdf
ALLOWED_MODEL_TYPES=model/gltf-binary,model/gltf+json,application/octet-stream

# Image Processing
IMAGE_MAX_WIDTH=2048
IMAGE_MAX_HEIGHT=2048
THUMBNAIL_WIDTH=300
THUMBNAIL_HEIGHT=300
VIDEO_THUMBNAIL_ENABLED=true

# Storage
STORAGE_TYPE=local # or 's3', 'cloudinary'
```

### Media Processing Utilities

#### `backend/src/utils/mediaUpload.js`
```javascript
const multer = require('multer');
const path = require('path');
const sharp = require('sharp'); // Image processing
const ffmpeg = require('fluent-ffmpeg'); // Video thumbnails

// Configure multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const groupId = req.params.groupId;
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');

    const mediaType = getMediaType(file.mimetype);
    const dir = path.join(
      process.env.GROUP_MEDIA_PATH,
      groupId.toString(),
      'posts',
      year.toString(),
      month,
      mediaType + 's'
    );

    // Create directory if not exists
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext)
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .substring(0, 50);
    cb(null, `${name}-${uniqueSuffix}${ext}`);
  }
});

// File filter
const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    ...process.env.ALLOWED_IMAGE_TYPES.split(','),
    ...process.env.ALLOWED_VIDEO_TYPES.split(','),
    ...process.env.ALLOWED_DOCUMENT_TYPES.split(','),
    ...process.env.ALLOWED_MODEL_TYPES.split(',')
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`File type ${file.mimetype} not allowed`));
  }
};

// Multer upload middleware
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE_MB) * 1024 * 1024
  }
});

// Generate thumbnail for image
async function generateImageThumbnail(filePath) {
  const thumbnailPath = filePath.replace(/(\.\w+)$/, '_thumb$1');
  await sharp(filePath)
    .resize(300, 300, { fit: 'inside' })
    .toFile(thumbnailPath);
  return thumbnailPath;
}

// Generate thumbnail for video
async function generateVideoThumbnail(filePath) {
  return new Promise((resolve, reject) => {
    const thumbnailPath = filePath.replace(/\.\w+$/, '_thumb.jpg');
    ffmpeg(filePath)
      .screenshots({
        timestamps: ['00:00:01'],
        filename: path.basename(thumbnailPath),
        folder: path.dirname(thumbnailPath),
        size: '300x300'
      })
      .on('end', () => resolve(thumbnailPath))
      .on('error', reject);
  });
}

module.exports = {
  upload,
  generateImageThumbnail,
  generateVideoThumbnail,
  getMediaType
};
```

### Supported Media Types

| Type | Extensions | MIME Types | Max Size | Thumbnail |
|------|-----------|------------|----------|-----------|
| Images | jpg, png, gif, webp | image/* | 10 MB | Yes |
| Videos | mp4, webm, mov | video/* | 100 MB | Yes |
| Documents | pdf | application/pdf | 25 MB | No |
| 3D Models | glb, gltf | model/* | 50 MB | No |
| Links | URL | N/A | N/A | Preview |

---

## Frontend Components

### Core Components

#### 1. `GroupCard.tsx`
Display group in list/grid view
- Group avatar, name, member count
- Join/Leave button
- Privacy badge (public/private/invite-only)

#### 2. `GroupHeader.tsx`
Group page header
- Banner image
- Avatar, name, description
- Member count, online count
- Join/Leave/Manage buttons
- Navigation tabs (Posts, About, Members, Settings)

#### 3. `GroupSidebar.tsx`
Group info sidebar
- Description
- Rules
- Moderators list
- Group stats
- Related groups

#### 4. `GroupPostCard.tsx`
Extended PostCard for group posts
- Reuse existing PostCard component
- Add group context (group name, icon)
- Pin indicator
- Post flair/tags
- Vote buttons (up/down)
- Media gallery
- Link preview
- Moderation actions (for mods)

#### 5. `GroupPostComposer.tsx`
Create/edit post interface
- Post type selector (text, link, media)
- Title input (required)
- Rich text editor for content
- Media uploader (drag & drop)
- Link URL input with preview
- NSFW toggle
- Spoiler toggle
- Submit/Save Draft buttons

#### 6. `GroupCommentThread.tsx`
Nested comment display
- Recursive comment rendering
- Indent for nesting levels
- Collapse/expand threads
- Vote buttons
- Reply button
- Media attachments
- Moderation actions

#### 7. `GroupCommentComposer.tsx`
Add/edit comment
- Rich text editor
- Media upload (optional)
- Reply indicator (if replying)
- Preview mode
- Submit button

#### 8. `GroupMediaUploader.tsx`
Multi-file upload component
- Drag & drop area
- File preview thumbnails
- Progress bars
- File type validation
- Remove uploaded files
- Gallery reordering

#### 9. `GroupMemberList.tsx`
Member management
- Search members
- Filter by role
- Member cards with role badges
- Admin actions (promote, ban)

#### 10. `GroupSettings.tsx`
Group configuration (admin only)
- General settings (name, description)
- Privacy settings
- Post approval settings
- Media settings
- Member permissions
- Moderator management

#### 11. `GroupInviteModal.tsx`
Invite members
- Search users
- Email invite input
- Bulk invite
- Invitation list

### Page Components

#### `GroupListPage.tsx`
Browse all groups
- Grid/list toggle
- Search and filters
- Category filter
- Sort options
- Pagination

#### `GroupPage.tsx`
Single group view
- Header
- Sidebar
- Post feed/timeline
- Tabs for different views

#### `GroupPostPage.tsx`
Single post view with comments
- Post content
- Media gallery
- Comment thread
- Related posts sidebar

#### `CreateGroupPage.tsx`
Create new group
- Form with validation
- Step-by-step wizard
- Avatar/banner upload
- Initial settings

#### `GroupSettingsPage.tsx`
Group admin panel
- Settings tabs
- Member management
- Post moderation queue
- Activity log
- Analytics

---

## Permissions & Authorization

### Role Hierarchy
1. **Group Creator/Admin**
   - Full control over group
   - Manage all settings
   - Promote/demote moderators
   - Ban/unban users
   - Delete any content
   - Delete group

2. **Moderator**
   - Approve/remove posts
   - Remove comments
   - Ban users (temporary)
   - Pin posts
   - Lock threads
   - Edit post flairs

3. **Member**
   - Create posts (if allowed)
   - Comment on posts
   - Vote on content
   - Report violations
   - Invite others (if allowed)

4. **Banned**
   - View only (if public)
   - Cannot post, comment, or vote

### Permission Checks

#### Middleware: `checkGroupPermission.js`
```javascript
async function checkGroupPermission(req, res, next) {
  const { groupId } = req.params;
  const userId = req.user.id;

  // Get group and membership
  const group = await Group.findById(groupId);
  const membership = await GroupMembership.findOne({
    where: { group_id: groupId, user_id: userId }
  });

  // Attach to request
  req.group = group;
  req.membership = membership;
  req.userRole = membership?.role || null;

  next();
}

async function requireGroupMember(req, res, next) {
  if (!req.membership || req.membership.status !== 'active') {
    return res.status(403).json({
      success: false,
      error: { message: 'Must be a group member', type: 'FORBIDDEN' }
    });
  }
  next();
}

async function requireGroupModerator(req, res, next) {
  if (!['admin', 'moderator'].includes(req.userRole)) {
    return res.status(403).json({
      success: false,
      error: { message: 'Moderator access required', type: 'FORBIDDEN' }
    });
  }
  next();
}

async function requireGroupAdmin(req, res, next) {
  if (req.userRole !== 'admin') {
    return res.status(403).json({
      success: false,
      error: { message: 'Admin access required', type: 'FORBIDDEN' }
    });
  }
  next();
}
```

### Visibility Rules

| Group Type | View Posts | Join | Post | Comment |
|------------|-----------|------|------|---------|
| Public | Anyone | Anyone | Members | Members |
| Private | Members | Request | Members | Members |
| Invite-Only | Members | Invite Only | Members | Members |

---

## Implementation Phases

### Phase 1: Core Infrastructure (Week 1-2)
**Goal:** Database schema and basic CRUD operations

**Tasks:**
1. ✅ Create database migration files
2. ✅ Create models (Group, GroupMembership, GroupPost)
3. ✅ Set up group routes structure
4. ✅ Implement basic group CRUD endpoints
5. ✅ Add permission middleware
6. ✅ Write unit tests for models
7. ✅ Write API endpoint tests

**Deliverables:**
- Database tables created
- Basic group API working
- Tests passing

### Phase 2: Group Management (Week 2-3)
**Goal:** Full group lifecycle management

**Tasks:**
1. ✅ Create group creation endpoint
2. ✅ Implement membership system (join/leave/ban)
3. ✅ Add invitation system
4. ✅ Create group settings endpoints
5. ✅ Build frontend GroupCard component
6. ✅ Build CreateGroupPage
7. ✅ Build GroupListPage
8. ✅ Test membership workflows

**Deliverables:**
- Users can create groups
- Users can join/leave groups
- Admin can manage members
- Frontend displays group list

### Phase 3: Posts & Content (Week 3-4)
**Goal:** Post creation and display

**Tasks:**
1. ✅ Implement post creation endpoint
2. ✅ Set up media upload system
3. ✅ Create post models and routes
4. ✅ Build GroupPostCard component
5. ✅ Build GroupPostComposer
6. ✅ Build GroupPage with feed
7. ✅ Implement post voting
8. ✅ Add post moderation (approve/remove)
9. ✅ Test post creation and display

**Deliverables:**
- Users can create text posts
- Users can upload media
- Posts display in group feed
- Voting works

### Phase 4: Comments & Threads (Week 4-5)
**Goal:** Nested comment system

**Tasks:**
1. ✅ Implement ltree for PostgreSQL
2. ✅ Create comment models and routes
3. ✅ Build nested comment endpoints
4. ✅ Create GroupCommentThread component
5. ✅ Create GroupCommentComposer
6. ✅ Implement comment voting
7. ✅ Add comment media uploads
8. ✅ Test nested comments

**Deliverables:**
- Comments work on posts
- Nested/threaded comments render
- Comment voting works
- Comments can include media

### Phase 5: Media & File Types (Week 5-6)
**Goal:** Support all media types

**Tasks:**
1. ✅ Add image upload and processing
2. ✅ Add video upload and thumbnails
3. ✅ Add PDF support
4. ✅ Add 3D model support (.glb, .gltf)
5. ✅ Add link preview generation
6. ✅ Build media gallery component
7. ✅ Build media viewer modal
8. ✅ Test all media types

**Deliverables:**
- All media types supported
- Thumbnails generated
- Gallery view works
- File size limits enforced

### Phase 6: Moderation & Admin Tools (Week 6-7)
**Goal:** Full moderation capabilities

**Tasks:**
1. ✅ Build moderation queue
2. ✅ Implement post approval workflow
3. ✅ Add ban/unban functionality
4. ✅ Create activity log
5. ✅ Build GroupSettings page
6. ✅ Add bulk actions
7. ✅ Build moderator dashboard
8. ✅ Test moderation workflows

**Deliverables:**
- Mods can approve posts
- Mods can ban users
- Activity log tracks actions
- Settings page fully functional

### Phase 7: Polish & Optimization (Week 7-8)
**Goal:** Performance and UX improvements

**Tasks:**
1. ✅ Optimize database queries
2. ✅ Add caching (Redis)
3. ✅ Implement infinite scroll
4. ✅ Add real-time updates (WebSocket)
5. ✅ Improve mobile responsiveness
6. ✅ Add loading states and skeletons
7. ✅ Implement error boundaries
8. ✅ Performance testing

**Deliverables:**
- Fast page loads
- Smooth scrolling
- Real-time updates
- Mobile-friendly

### Phase 8: Testing & Launch (Week 8)
**Goal:** Production-ready

**Tasks:**
1. ✅ Complete end-to-end tests
2. ✅ Security audit
3. ✅ Load testing
4. ✅ User acceptance testing
5. ✅ Documentation
6. ✅ Deployment preparation
7. ✅ Launch

**Deliverables:**
- All tests passing
- Security verified
- Documentation complete
- Ready for production

---

## Testing Strategy

### Unit Tests
- Model methods
- Utility functions
- Permission checks
- Media processing

### Integration Tests
- API endpoints
- Database operations
- File uploads
- Authentication flow

### End-to-End Tests
- User flows (create group → post → comment)
- Moderation workflows
- Membership management
- Media upload and display

### Test Data
```javascript
// Test fixtures
const testGroup = {
  name: 'test_group',
  display_name: 'Test Group',
  visibility: 'public'
};

const testPost = {
  title: 'Test Post',
  content: 'Test content',
  post_type: 'text'
};

const testComment = {
  content: 'Test comment',
  parent_id: null
};
```

---

## Security Considerations

### File Upload Security
1. **File Type Validation:**
   - Check MIME type
   - Validate file extension
   - Scan file headers (magic bytes)

2. **File Size Limits:**
   - Per-file limit
   - Per-upload limit
   - Group quota

3. **File Storage:**
   - Unique filenames (prevent overwrite)
   - Separate storage per group
   - No executable files
   - Virus scanning (optional)

4. **Access Control:**
   - Check group membership
   - Verify file ownership
   - Validate permissions

### Input Sanitization
- Sanitize group names and slugs
- Escape HTML in content
- Validate URLs
- Prevent XSS in comments

### Rate Limiting
- Post creation: 5 per minute
- Comment creation: 10 per minute
- File uploads: 10 per hour
- Group creation: 3 per day

### Content Moderation
- Report system for violations
- Automated spam detection
- NSFW content flagging
- Profanity filter (optional)

---

## Environment Configuration

### Required .env Additions
```bash
# Group System
GROUP_MEDIA_PATH=public/media/groups
MAX_FILE_SIZE_MB=50
MAX_FILES_PER_POST=10
MAX_FILES_PER_COMMENT=3

# Media Types
ALLOWED_IMAGE_TYPES=image/jpeg,image/png,image/gif,image/webp
ALLOWED_VIDEO_TYPES=video/mp4,video/webm,video/quicktime
ALLOWED_DOCUMENT_TYPES=application/pdf
ALLOWED_MODEL_TYPES=model/gltf-binary,model/gltf+json

# Image Processing
IMAGE_MAX_WIDTH=2048
IMAGE_MAX_HEIGHT=2048
THUMBNAIL_WIDTH=300
THUMBNAIL_HEIGHT=300

# Video Processing
VIDEO_THUMBNAIL_ENABLED=true
FFMPEG_PATH=/usr/bin/ffmpeg

# Rate Limiting
RATE_LIMIT_POST_CREATE=5
RATE_LIMIT_COMMENT_CREATE=10
RATE_LIMIT_FILE_UPLOAD=10
RATE_LIMIT_GROUP_CREATE=3

# Caching
REDIS_ENABLED=true
REDIS_HOST=localhost
REDIS_PORT=6379
CACHE_TTL_GROUPS=3600
CACHE_TTL_POSTS=1800

# Real-time
WEBSOCKET_ENABLED=true
WEBSOCKET_PORT=3002
```

---

## Dependencies

### Backend (Node.js)
```json
{
  "dependencies": {
    "multer": "^1.4.5-lts.1",
    "sharp": "^0.33.0",
    "fluent-ffmpeg": "^2.1.2",
    "ltree": "^1.0.0",
    "redis": "^4.6.0",
    "socket.io": "^4.6.0",
    "express-rate-limit": "^7.1.0",
    "helmet": "^7.1.0",
    "validator": "^13.11.0"
  }
}
```

### Frontend (React)
```json
{
  "dependencies": {
    "@tiptap/react": "^2.1.0",
    "@tiptap/starter-kit": "^2.1.0",
    "react-dropzone": "^14.2.3",
    "react-intersection-observer": "^9.5.3",
    "react-virtualized": "^9.22.5",
    "socket.io-client": "^4.6.0",
    "@react-three/fiber": "^8.15.0",
    "@react-three/drei": "^9.92.0",
    "react-pdf": "^7.6.0"
  }
}
```

---

## Migration Path

### Step 1: Preparation
- Back up production database
- Test migrations on staging
- Prepare rollback plan

### Step 2: Database Migration
- Run migration scripts in order
- Verify table creation
- Seed initial data (if needed)

### Step 3: Backend Deployment
- Deploy API endpoints
- Configure media storage
- Test file uploads

### Step 4: Frontend Deployment
- Deploy frontend components
- Update routes
- Test user flows

### Step 5: Verification
- Monitor error logs
- Check performance metrics
- Gather user feedback

---

## Success Metrics

### Usage Metrics
- Number of groups created
- Active groups (posts in last 7 days)
- Posts per group per day
- Comments per post
- User engagement rate

### Performance Metrics
- API response time < 200ms
- Page load time < 2s
- File upload success rate > 99%
- Zero data loss

### Quality Metrics
- Bug count < 5 per week
- User satisfaction > 4.5/5
- Mobile responsiveness score > 90
- Accessibility score > 90

---

## Future Enhancements

### Phase 9+ (Post-Launch)
1. **Advanced Moderation:**
   - AutoMod rules engine
   - Keyword filters
   - Spam detection ML
   - Report queue

2. **Enhanced Features:**
   - Polls in posts
   - Events/calendar
   - Wiki pages
   - Custom post flairs
   - User flairs

3. **Social Features:**
   - Cross-posting between groups
   - Group discovery algorithm
   - Trending posts
   - Best of week/month

4. **Integrations:**
   - Discord bot
   - RSS feeds
   - Email digests
   - Mobile push notifications

5. **Analytics:**
   - Group growth charts
   - Engagement heatmaps
   - Member demographics
   - Content insights

---

## Conclusion

This comprehensive plan provides a roadmap for implementing a Reddit-style group system with robust features, including:

✅ **Groups:** Public, private, invite-only communities
✅ **Posts:** Text, links, images, videos, PDFs, 3D models
✅ **Comments:** Nested/threaded with multimedia support
✅ **Moderation:** Admin/moderator roles with approval workflows
✅ **Media:** Organized storage in `public/media/groups/`
✅ **Permissions:** Granular role-based access control
✅ **Security:** File validation, rate limiting, sanitization

The 8-phase implementation plan spans approximately 8 weeks, with clear deliverables at each stage. The system is designed to be scalable, secure, and user-friendly, closely mimicking Reddit's successful community model while integrating seamlessly with the existing posting system.

---

**Next Steps:**
1. Review and approve this plan
2. Set up project timeline and milestones
3. Begin Phase 1: Core Infrastructure
4. Iterate based on feedback and testing

**Questions or modifications? Let's discuss before starting implementation!**
