# Social Media Platform - Complete Technical Documentation

## Table of Contents

1. [Database Schema](#1-database-schema)
2. [Database Functions and Stored Procedures](#2-database-functions-and-stored-procedures)
3. [SQL Queries by Feature](#3-sql-queries-by-feature)
4. [Backend API Documentation](#4-backend-api-documentation)
5. [Data Models and Relationships](#5-data-models-and-relationships)
6. [Indexes and Performance](#6-indexes-and-performance)
7. [Security Considerations](#7-security-considerations)

---

## 1. Database Schema

### 1.1 Users Table

**Purpose**: Stores user account information, authentication credentials, profile data, and geolocation information.

**Columns**:
- `id` (SERIAL PRIMARY KEY) - Unique user identifier
- `username` (VARCHAR(50) UNIQUE NOT NULL) - Unique username for login
- `email` (VARCHAR(255) UNIQUE NOT NULL) - Email address
- `password_hash` (VARCHAR(255) NOT NULL) - Bcrypt hashed password
- `first_name` (VARCHAR(100) NOT NULL) - User's first name
- `last_name` (VARCHAR(100) NOT NULL) - User's last name
- `bio` (TEXT) - User biography/description
- `avatar_url` (VARCHAR(500)) - Profile picture URL
- `is_active` (BOOLEAN DEFAULT TRUE) - Account active status
- `email_verified` (BOOLEAN DEFAULT FALSE) - Email verification status
- `email_verification_token` (VARCHAR(255)) - Token for email verification
- `password_reset_token` (VARCHAR(255)) - Token for password reset
- `password_reset_expires` (TIMESTAMP) - Expiration time for reset token
- `location_latitude` (DECIMAL(10,7)) - GPS latitude coordinate
- `location_longitude` (DECIMAL(10,7)) - GPS longitude coordinate
- `location_city` (VARCHAR(100)) - City name
- `location_state` (VARCHAR(100)) - State/province
- `location_country` (VARCHAR(100)) - Country
- `location_zip` (VARCHAR(20)) - ZIP/postal code
- `address` (VARCHAR(255)) - Street address
- `location_updated_at` (TIMESTAMP) - Last location update time
- `location_accuracy` (INTEGER) - Location accuracy in meters
- `location_sharing` (VARCHAR(20) DEFAULT 'off') - Privacy level: 'exact', 'city', 'off'
- `show_distance_in_profile` (BOOLEAN DEFAULT FALSE) - Show distance in search results
- `last_login` (TIMESTAMP) - Last login timestamp
- `created_at` (TIMESTAMP DEFAULT CURRENT_TIMESTAMP)
- `updated_at` (TIMESTAMP DEFAULT CURRENT_TIMESTAMP)

**Indexes**:
- `idx_users_username` ON username
- `idx_users_email` ON email
- `idx_users_active` ON is_active
- `idx_users_created_at` ON created_at
- `idx_users_location_coords` ON (location_latitude, location_longitude)
- `idx_users_location_sharing` ON location_sharing
- `idx_users_location_updated` ON location_updated_at

**Triggers**:
- `update_users_updated_at` - Automatically updates updated_at on row modification

---

### 1.2 Posts Table

**Purpose**: Stores user-generated posts with privacy controls.

**Columns**:
- `id` (SERIAL PRIMARY KEY) - Unique post identifier
- `user_id` (INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE) - Post author
- `content` (TEXT NOT NULL) - Post content/body
- `privacy_level` (VARCHAR(20) DEFAULT 'public') - 'public', 'friends', 'private'
- `is_published` (BOOLEAN DEFAULT TRUE) - Publication status
- `is_archived` (BOOLEAN DEFAULT FALSE) - Archive status
- `views_count` (INTEGER DEFAULT 0) - View counter
- `scheduled_for` (TIMESTAMP) - Scheduled publication time
- `created_at` (TIMESTAMP DEFAULT CURRENT_TIMESTAMP)
- `updated_at` (TIMESTAMP DEFAULT CURRENT_TIMESTAMP)

**Constraints**:
- `CHECK (privacy_level IN ('public', 'friends', 'private'))`

**Indexes**:
- `idx_posts_user_id` ON user_id
- `idx_posts_privacy_level` ON privacy_level
- `idx_posts_published` ON is_published
- `idx_posts_created_at` ON created_at

**Triggers**:
- `update_posts_updated_at` - Automatically updates updated_at on row modification

---

### 1.3 Comments Table

**Purpose**: Stores comments and nested replies on posts with hierarchical structure.

**Columns**:
- `id` (SERIAL PRIMARY KEY) - Unique comment identifier
- `user_id` (INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE) - Comment author
- `post_id` (INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE) - Parent post
- `parent_id` (INTEGER REFERENCES comments(id) ON DELETE CASCADE) - Parent comment for replies
- `content` (TEXT NOT NULL) - Comment content
- `is_published` (BOOLEAN DEFAULT TRUE) - Publication status
- `depth` (INTEGER DEFAULT 0) - Nesting level (max 5)
- `created_at` (TIMESTAMP DEFAULT CURRENT_TIMESTAMP)
- `updated_at` (TIMESTAMP DEFAULT CURRENT_TIMESTAMP)

**Indexes**:
- `idx_comments_user_id` ON user_id
- `idx_comments_post_id` ON post_id
- `idx_comments_parent_id` ON parent_id
- `idx_comments_created_at` ON created_at

**Triggers**:
- `update_comments_updated_at` - Automatically updates updated_at on row modification

---

### 1.4 Media Table

**Purpose**: Stores file attachments for posts and comments.

**Columns**:
- `id` (SERIAL PRIMARY KEY) - Unique media identifier
- `user_id` (INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE) - Uploader
- `post_id` (INTEGER REFERENCES posts(id) ON DELETE CASCADE) - Attached to post
- `comment_id` (INTEGER REFERENCES comments(id) ON DELETE CASCADE) - Attached to comment
- `filename` (VARCHAR(255) NOT NULL) - Generated filename
- `original_name` (VARCHAR(255) NOT NULL) - Original upload filename
- `file_path` (VARCHAR(500) NOT NULL) - Server file path
- `file_url` (VARCHAR(500) NOT NULL) - Public access URL
- `mime_type` (VARCHAR(100) NOT NULL) - MIME type
- `file_size` (INTEGER NOT NULL) - File size in bytes
- `media_type` (VARCHAR(20) NOT NULL) - 'image', 'video', 'audio', 'document'
- `width` (INTEGER) - Image/video width in pixels
- `height` (INTEGER) - Image/video height in pixels
- `duration` (INTEGER) - Audio/video duration in seconds
- `alt_text` (VARCHAR(500)) - Accessibility text
- `is_processed` (BOOLEAN DEFAULT FALSE) - Processing status
- `thumbnail_path` (VARCHAR(500)) - Thumbnail file path
- `thumbnail_url` (VARCHAR(500)) - Thumbnail URL
- `created_at` (TIMESTAMP DEFAULT CURRENT_TIMESTAMP)
- `updated_at` (TIMESTAMP DEFAULT CURRENT_TIMESTAMP)

**Constraints**:
- `CHECK (media_type IN ('image', 'video', 'audio', 'document'))`
- `CHECK ((post_id IS NOT NULL AND comment_id IS NULL) OR (post_id IS NULL AND comment_id IS NOT NULL))` - Media must belong to either post OR comment

**Indexes**:
- `idx_media_user_id` ON user_id
- `idx_media_post_id` ON post_id
- `idx_media_comment_id` ON comment_id
- `idx_media_type` ON media_type

**Triggers**:
- `update_media_updated_at` - Automatically updates updated_at on row modification

---

### 1.5 Reactions Table

**Purpose**: Stores emoji reactions on posts and comments.

**Columns**:
- `id` (SERIAL PRIMARY KEY) - Unique reaction identifier
- `user_id` (INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE) - User who reacted
- `post_id` (INTEGER REFERENCES posts(id) ON DELETE CASCADE) - Reacted post
- `comment_id` (INTEGER REFERENCES comments(id) ON DELETE CASCADE) - Reacted comment
- `emoji_name` (VARCHAR(50) NOT NULL) - Emoji name (like, love, laugh, etc.)
- `emoji_unicode` (VARCHAR(20) NOT NULL) - Unicode representation
- `created_at` (TIMESTAMP DEFAULT CURRENT_TIMESTAMP)
- `updated_at` (TIMESTAMP DEFAULT CURRENT_TIMESTAMP)

**Constraints**:
- `CHECK ((post_id IS NOT NULL AND comment_id IS NULL) OR (post_id IS NULL AND comment_id IS NOT NULL))` - Reaction must be on post OR comment
- `UNIQUE (user_id, post_id, emoji_name)` - One reaction per user per post per emoji
- `UNIQUE (user_id, comment_id, emoji_name)` - One reaction per user per comment per emoji

**Indexes**:
- `idx_reactions_user_id` ON user_id
- `idx_reactions_post_id` ON post_id
- `idx_reactions_comment_id` ON comment_id
- `idx_reactions_emoji_name` ON emoji_name

**Triggers**:
- `update_reactions_updated_at` - Automatically updates updated_at on row modification

---

### 1.6 Follows Table

**Purpose**: Manages user follow relationships and status.

**Columns**:
- `id` (SERIAL PRIMARY KEY) - Unique follow relationship identifier
- `follower_id` (INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE) - User who follows
- `following_id` (INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE) - User being followed
- `status` (VARCHAR(20) DEFAULT 'active') - 'active', 'muted', 'blocked'
- `notifications_enabled` (BOOLEAN DEFAULT TRUE) - Notification preference
- `created_at` (TIMESTAMP DEFAULT CURRENT_TIMESTAMP)
- `updated_at` (TIMESTAMP DEFAULT CURRENT_TIMESTAMP)

**Constraints**:
- `UNIQUE (follower_id, following_id)` - Unique follow relationship
- `CHECK (follower_id != following_id)` - Cannot follow self
- `CHECK (status IN ('active', 'muted', 'blocked'))`

**Indexes**:
- `idx_follows_follower_id` ON follower_id
- `idx_follows_following_id` ON following_id
- `idx_follows_status` ON status
- `idx_follows_created_at` ON created_at
- `idx_follows_composite` ON (follower_id, following_id, status)

**Triggers**:
- `update_follows_updated_at` - Updates updated_at timestamp
- `trigger_update_follow_counts` - Updates user_stats follower/following counts

---

### 1.7 Shares Table

**Purpose**: Tracks post shares and reposts.

**Columns**:
- `id` (SERIAL PRIMARY KEY) - Unique share identifier
- `user_id` (INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE) - User who shared
- `post_id` (INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE) - Shared post
- `share_type` (VARCHAR(20) DEFAULT 'repost') - 'repost', 'quote', 'external'
- `share_comment` (TEXT) - Optional comment on share
- `visibility` (VARCHAR(20) DEFAULT 'public') - 'public', 'friends', 'private'
- `created_at` (TIMESTAMP DEFAULT CURRENT_TIMESTAMP)

**Constraints**:
- `UNIQUE (user_id, post_id)` - One share per user per post
- `CHECK (share_type IN ('repost', 'quote', 'external'))`
- `CHECK (visibility IN ('public', 'friends', 'private'))`

**Indexes**:
- `idx_shares_user_id` ON user_id
- `idx_shares_post_id` ON post_id
- `idx_shares_type` ON share_type
- `idx_shares_created_at` ON created_at
- `idx_shares_composite` ON (post_id, created_at DESC)

**Triggers**:
- `trigger_update_share_counts` - Updates user_stats share counts

---

### 1.8 User Stats Table

**Purpose**: Denormalized statistics for performance (updated via triggers).

**Columns**:
- `user_id` (INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE)
- `follower_count` (INTEGER DEFAULT 0) - Number of followers
- `following_count` (INTEGER DEFAULT 0) - Number of users followed
- `post_count` (INTEGER DEFAULT 0) - Number of published posts
- `total_reactions_received` (INTEGER DEFAULT 0) - Total reactions on user's content
- `total_shares_received` (INTEGER DEFAULT 0) - Total shares of user's posts
- `total_comments_received` (INTEGER DEFAULT 0) - Total comments on user's posts
- `engagement_score` (DECIMAL(10,2) DEFAULT 0) - Calculated engagement metric
- `last_post_at` (TIMESTAMP) - Most recent post timestamp
- `updated_at` (TIMESTAMP DEFAULT CURRENT_TIMESTAMP)

**Indexes**:
- `idx_user_stats_follower_count` ON follower_count DESC
- `idx_user_stats_engagement_score` ON engagement_score DESC
- `idx_user_stats_last_post_at` ON last_post_at DESC

---

### 1.9 Timeline Cache Table

**Purpose**: Pre-computed timeline entries with relevance scoring.

**Columns**:
- `id` (SERIAL PRIMARY KEY)
- `user_id` (INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE) - Timeline owner
- `post_id` (INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE) - Cached post
- `score` (DECIMAL(10,2) NOT NULL DEFAULT 0) - Relevance score (0-100)
- `reason` (VARCHAR(50) NOT NULL) - 'following', 'popular', 'shared', 'suggested'
- `created_at` (TIMESTAMP DEFAULT CURRENT_TIMESTAMP)
- `expires_at` (TIMESTAMP DEFAULT CURRENT_TIMESTAMP + INTERVAL '7 days')

**Constraints**:
- `UNIQUE (user_id, post_id)` - One entry per user per post

**Indexes**:
- `idx_timeline_user_score` ON (user_id, score DESC)
- `idx_timeline_user_created` ON (user_id, created_at DESC)
- `idx_timeline_post_id` ON post_id
- `idx_timeline_expires_at` ON expires_at
- `idx_timeline_reason` ON reason

---

### 1.10 Comment Interactions Table

**Purpose**: Tracks user interactions with comments for algorithmic ranking.

**Columns**:
- `id` (SERIAL PRIMARY KEY)
- `comment_id` (INTEGER NOT NULL REFERENCES comments(id) ON DELETE CASCADE)
- `interaction_type` (VARCHAR(50) NOT NULL) - 'view', 'reply', 'reaction', 'share', 'deep_read', 'quote'
- `user_id` (INTEGER REFERENCES users(id) ON DELETE SET NULL) - Authenticated user
- `session_id` (VARCHAR(255)) - Session identifier for anonymous users
- `ip_address` (INET) - IP address
- `user_agent` (TEXT) - Browser user agent
- `created_at` (TIMESTAMP DEFAULT NOW())
- `metadata` (JSONB DEFAULT '{}') - Additional interaction data

**Constraints**:
- `CHECK (interaction_type IN ('view', 'reply', 'reaction', 'share', 'deep_read', 'quote'))`

**Indexes**:
- `idx_comment_interactions_comment_type` ON (comment_id, interaction_type)
- `idx_comment_interactions_user_id` ON user_id
- `idx_comment_interactions_session_id` ON session_id
- `idx_comment_interactions_created_at` ON created_at

**Triggers**:
- `comment_interaction_metrics_trigger` - Updates comment_metrics on insert

---

### 1.11 Comment Metrics Table

**Purpose**: Aggregated metrics and algorithm scores for comments.

**Columns**:
- `comment_id` (INTEGER PRIMARY KEY REFERENCES comments(id) ON DELETE CASCADE)
- `view_count` (INTEGER DEFAULT 0) - Total views
- `unique_view_count` (INTEGER DEFAULT 0) - Unique viewers
- `reply_count` (INTEGER DEFAULT 0) - Number of replies
- `reaction_count` (INTEGER DEFAULT 0) - Number of reactions
- `share_count` (INTEGER DEFAULT 0) - Number of shares
- `deep_read_count` (INTEGER DEFAULT 0) - Extended views
- `total_interaction_count` (INTEGER DEFAULT 0) - All interactions
- `recency_score` (DOUBLE PRECISION DEFAULT 0.0) - Recency algorithm score
- `interaction_rate` (DOUBLE PRECISION DEFAULT 0.0) - Interactions per hour
- `engagement_score` (DOUBLE PRECISION DEFAULT 0.0) - Engagement quality score
- `combined_algorithm_score` (DOUBLE PRECISION DEFAULT 0.0) - Combined ranking score
- `first_interaction_at` (TIMESTAMP)
- `last_interaction_at` (TIMESTAMP)
- `peak_interaction_period` (TIMESTAMP)
- `created_at` (TIMESTAMP DEFAULT NOW())
- `last_updated` (TIMESTAMP DEFAULT NOW())

**Indexes**:
- `idx_comment_metrics_algorithm_score` ON combined_algorithm_score DESC
- `idx_comment_metrics_interaction_rate` ON interaction_rate DESC
- `idx_comment_metrics_last_interaction` ON last_interaction_at DESC

---

### 1.12 User Ratings Table

**Purpose**: User-to-user rating system with context.

**Columns**:
- `id` (SERIAL PRIMARY KEY)
- `rater_id` (INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE) - User giving rating
- `rated_user_id` (INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE) - User being rated
- `rating_type` (VARCHAR(50) NOT NULL) - 'profile', 'post', 'comment', 'interaction'
- `rating_value` (INTEGER NOT NULL) - 1-5 stars
- `context_type` (VARCHAR(50)) - 'post', 'comment', 'message', 'general'
- `context_id` (INTEGER) - ID of related content
- `review_text` (TEXT) - Optional review
- `is_anonymous` (BOOLEAN DEFAULT FALSE) - Anonymous rating
- `is_verified` (BOOLEAN DEFAULT FALSE) - Verified interaction rating
- `created_at` (TIMESTAMP DEFAULT CURRENT_TIMESTAMP)
- `updated_at` (TIMESTAMP DEFAULT CURRENT_TIMESTAMP)

**Constraints**:
- `UNIQUE (rater_id, rated_user_id, context_type, context_id)` - One rating per context
- `CHECK (rater_id != rated_user_id)` - Cannot rate self
- `CHECK (rating_value >= 1 AND rating_value <= 5)` - Valid rating range
- `CHECK (rating_type IN ('profile', 'post', 'comment', 'interaction'))`

**Indexes**:
- `idx_user_ratings_rater` ON rater_id
- `idx_user_ratings_rated_user` ON rated_user_id
- `idx_user_ratings_type` ON rating_type
- `idx_user_ratings_created` ON created_at DESC
- `idx_user_ratings_context` ON (context_type, context_id)

**Triggers**:
- `update_user_ratings_updated_at` - Updates timestamp
- `trigger_update_user_reputation` - Updates user_reputation table

---

### 1.13 User Reputation Table

**Purpose**: Aggregated reputation scores and badges.

**Columns**:
- `user_id` (INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE)
- `total_ratings_received` (INTEGER DEFAULT 0)
- `average_rating` (DECIMAL(3,2) DEFAULT 0.00)
- `rating_distribution` (JSONB DEFAULT '{"1":0,"2":0,"3":0,"4":0,"5":0}')
- `reputation_score` (INTEGER DEFAULT 0) - 0-1000 scale
- `reputation_level` (VARCHAR(20) DEFAULT 'newcomer') - Level badge
- `post_rating_avg` (DECIMAL(3,2) DEFAULT 0.00)
- `comment_rating_avg` (DECIMAL(3,2) DEFAULT 0.00)
- `interaction_rating_avg` (DECIMAL(3,2) DEFAULT 0.00)
- `verified_ratings_count` (INTEGER DEFAULT 0)
- `positive_ratings_count` (INTEGER DEFAULT 0) - 4-5 stars
- `neutral_ratings_count` (INTEGER DEFAULT 0) - 3 stars
- `negative_ratings_count` (INTEGER DEFAULT 0) - 1-2 stars
- `helpful_count` (INTEGER DEFAULT 0) - Content marked helpful
- `reported_count` (INTEGER DEFAULT 0) - Times reported
- `quality_posts_count` (INTEGER DEFAULT 0)
- `quality_comments_count` (INTEGER DEFAULT 0)
- `badges` (JSONB DEFAULT '[]') - Achievement badges
- `achievements` (JSONB DEFAULT '[]')
- `first_rating_at` (TIMESTAMP)
- `last_rating_at` (TIMESTAMP)
- `reputation_peak` (INTEGER DEFAULT 0) - Highest score achieved
- `reputation_peak_at` (TIMESTAMP)
- `created_at` (TIMESTAMP DEFAULT CURRENT_TIMESTAMP)
- `updated_at` (TIMESTAMP DEFAULT CURRENT_TIMESTAMP)

**Constraints**:
- `CHECK (reputation_level IN ('newcomer', 'member', 'contributor', 'veteran', 'expert', 'legend'))`

**Indexes**:
- `idx_user_reputation_score` ON reputation_score DESC
- `idx_user_reputation_level` ON reputation_level
- `idx_user_reputation_avg_rating` ON average_rating DESC

**Triggers**:
- `update_user_reputation_updated_at` - Updates timestamp

---

### 1.14 Location History Table

**Purpose**: Audit trail of location changes for privacy and debugging.

**Columns**:
- `id` (SERIAL PRIMARY KEY)
- `user_id` (INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE)
- `location_latitude` (DECIMAL(10,7) NOT NULL)
- `location_longitude` (DECIMAL(10,7) NOT NULL)
- `location_city` (VARCHAR(100))
- `location_state` (VARCHAR(100))
- `location_country` (VARCHAR(100))
- `accuracy` (INTEGER) - Accuracy in meters
- `ip_address` (INET) - Request IP
- `user_agent` (TEXT) - Request user agent
- `created_at` (TIMESTAMP DEFAULT CURRENT_TIMESTAMP)

**Indexes**:
- `idx_location_history_user_id` ON user_id
- `idx_location_history_created_at` ON created_at DESC
- `idx_location_history_coords` ON (location_latitude, location_longitude)

**Triggers**:
- `trigger_limit_location_history` - Keeps only last 100 entries per user

---

### 1.15 Nearby Search Cache Table

**Purpose**: Caches nearby user searches for performance.

**Columns**:
- `id` (SERIAL PRIMARY KEY)
- `user_id` (INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE)
- `search_lat` (DECIMAL(10,7) NOT NULL) - Search center latitude
- `search_lon` (DECIMAL(10,7) NOT NULL) - Search center longitude
- `radius_miles` (INTEGER NOT NULL) - Search radius
- `nearby_user_ids` (INTEGER[] NOT NULL) - Array of found user IDs
- `result_count` (INTEGER NOT NULL)
- `created_at` (TIMESTAMP DEFAULT CURRENT_TIMESTAMP)
- `expires_at` (TIMESTAMP DEFAULT CURRENT_TIMESTAMP + INTERVAL '15 minutes')

**Indexes**:
- `idx_nearby_cache_user_id` ON user_id
- `idx_nearby_cache_expires_at` ON expires_at
- `idx_nearby_cache_coords` ON (search_lat, search_lon)

---

### 1.16 Rating Reports Table

**Purpose**: Reports for disputed or inappropriate ratings.

**Columns**:
- `id` (SERIAL PRIMARY KEY)
- `rating_id` (INTEGER NOT NULL REFERENCES user_ratings(id) ON DELETE CASCADE)
- `reporter_id` (INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE)
- `report_reason` (VARCHAR(50) NOT NULL) - 'spam', 'inappropriate', 'fake', 'harassment', 'other'
- `report_details` (TEXT)
- `status` (VARCHAR(20) DEFAULT 'pending') - 'pending', 'reviewed', 'resolved', 'dismissed'
- `reviewed_by` (INTEGER REFERENCES users(id) ON DELETE SET NULL)
- `reviewed_at` (TIMESTAMP)
- `resolution_notes` (TEXT)
- `created_at` (TIMESTAMP DEFAULT CURRENT_TIMESTAMP)

**Constraints**:
- `CHECK (report_reason IN ('spam', 'inappropriate', 'fake', 'harassment', 'other'))`
- `CHECK (status IN ('pending', 'reviewed', 'resolved', 'dismissed'))`

**Indexes**:
- `idx_rating_reports_rating` ON rating_id
- `idx_rating_reports_reporter` ON reporter_id
- `idx_rating_reports_status` ON status

---

### 1.17 Helpful Marks Table

**Purpose**: Tracks when users mark content as helpful.

**Columns**:
- `id` (SERIAL PRIMARY KEY)
- `user_id` (INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE)
- `target_type` (VARCHAR(20) NOT NULL) - 'post', 'comment', 'user'
- `target_id` (INTEGER NOT NULL)
- `created_at` (TIMESTAMP DEFAULT CURRENT_TIMESTAMP)

**Constraints**:
- `UNIQUE (user_id, target_type, target_id)` - One helpful mark per user per target
- `CHECK (target_type IN ('post', 'comment', 'user'))`

**Indexes**:
- `idx_helpful_marks_target` ON (target_type, target_id)
- `idx_helpful_marks_user` ON user_id

**Triggers**:
- `trigger_update_helpful_count` - Updates user_reputation helpful count

---

## 2. Database Functions and Stored Procedures

### 2.1 Timestamp Management

#### update_updated_at_column()
**Purpose**: Generic trigger function to update updated_at timestamp
**Returns**: TRIGGER
**Behavior**: Sets NEW.updated_at = CURRENT_TIMESTAMP on UPDATE operations

---

### 2.2 Follow System Functions

#### update_follow_counts()
**Purpose**: Maintains denormalized follower/following counts in user_stats
**Returns**: TRIGGER
**Behavior**:
- On INSERT: Increments following_count for follower, follower_count for following
- On DELETE: Decrements counts (with GREATEST(0, ...) to prevent negatives)
- Updates user_stats.updated_at

#### initialize_user_stats()
**Purpose**: Initializes user_stats for existing users without stats
**Returns**: void
**Behavior**: Inserts records into user_stats with calculated post_count and last_post_at

---

### 2.3 Share System Functions

#### update_share_counts()
**Purpose**: Maintains share counts in user_stats
**Returns**: TRIGGER
**Behavior**:
- On INSERT: Increments total_shares_received for post owner
- On DELETE: Decrements count (with GREATEST to prevent negatives)

---

### 2.4 Comment Metrics Functions

#### update_comment_metrics()
**Purpose**: Updates aggregated comment metrics and algorithm scores
**Returns**: TRIGGER
**Behavior**:
- Inserts/updates comment_metrics record
- Increments interaction type counters
- Recalculates algorithm scores:
  - recency_score (30% weight)
  - interaction_rate (40% weight)
  - engagement_score (30% weight)
  - combined_algorithm_score

#### calculate_recency_score(comment_created_at TIMESTAMP)
**Purpose**: Calculates time-decay score for comment relevance
**Returns**: DOUBLE PRECISION (0-100)
**Formula**: `GREATEST(0, 100 - EXTRACT(EPOCH FROM (NOW() - comment_created_at)) / 86400 / 30 * 100)`
- Max 100 points for brand new comments
- Decays linearly over 30 days

#### calculate_interaction_rate(total_interactions INTEGER, created_at TIMESTAMP)
**Purpose**: Calculates interactions per hour rate
**Returns**: DOUBLE PRECISION
**Formula**: `total_interactions / hours_since_creation`
- Returns 0 if hours_since_creation <= 0

#### calculate_engagement_score(reply_count INTEGER, reaction_count INTEGER, deep_read_count INTEGER, view_count INTEGER)
**Purpose**: Calculates quality of engagement vs views
**Returns**: DOUBLE PRECISION (0-100+)
**Formula**: `((reply_count * 10) + (reaction_count * 5) + (deep_read_count * 2)) / view_count * 100`
- Returns 0 if view_count = 0
- Weighted: replies (10x) > reactions (5x) > deep reads (2x)

---

### 2.5 Rating and Reputation Functions

#### update_user_reputation()
**Purpose**: Updates user_reputation when ratings change
**Returns**: TRIGGER
**Behavior**:
- Calculates aggregate metrics (avg rating, counts by value, distribution)
- Calculates category averages (post, comment, interaction)
- Upserts user_reputation record
- Triggered on INSERT, UPDATE, DELETE of user_ratings

#### calculate_reputation_score(p_user_id INTEGER)
**Purpose**: Calculates comprehensive reputation score (0-1000)
**Returns**: INTEGER
**Algorithm**:
- Base score from average rating (max 500 points)
- Volume bonus (max 100 points)
- Quality content bonus (max 250 points):
  - Quality posts: 5 points each (max 150)
  - Quality comments: 3 points each (max 100)
- Helpful bonus (max 100 points): 2 points per helpful mark
- Verified bonus (max 50 points): 3 points per verified rating
- Penalties: -10 points per report
- Determines reputation level:
  - legend: 850+
  - expert: 700-849
  - veteran: 500-699
  - contributor: 300-499
  - member: 100-299
  - newcomer: 0-99

#### update_helpful_count()
**Purpose**: Increments helpful_count when content marked helpful
**Returns**: TRIGGER
**Behavior**:
- Determines content owner based on target_type
- Increments user_reputation.helpful_count
- Calls calculate_reputation_score() to recalculate

---

### 2.6 Geolocation Functions

#### calculate_distance_miles(lat1 DECIMAL, lon1 DECIMAL, lat2 DECIMAL, lon2 DECIMAL)
**Purpose**: Calculates distance between two GPS coordinates
**Returns**: DECIMAL(10,2) - Distance in miles
**Algorithm**: Haversine formula
```sql
R = 3959 (Earth's radius in miles)
dLat = RADIANS(lat2 - lat1)
dLon = RADIANS(lon2 - lon1)
a = SIN(dLat/2)^2 + COS(RADIANS(lat1)) * COS(RADIANS(lat2)) * SIN(dLon/2)^2
c = 2 * ATAN2(SQRT(a), SQRT(1-a))
distance = R * c
```
- Returns NULL if any coordinate is NULL
- Accurate for distances up to several hundred miles

#### find_nearby_users(p_user_id INTEGER, p_lat DECIMAL, p_lon DECIMAL, p_radius_miles INTEGER, p_limit INTEGER, p_offset INTEGER)
**Purpose**: Finds users within specified radius
**Returns**: TABLE with user info and distance
**Algorithm**:
- Excludes searching user
- Filters by location_sharing != 'off'
- Uses bounding box pre-filter for performance (±radius/69 degrees)
- Calculates exact distance using Haversine
- Filters by exact distance <= radius
- Orders by distance ASC
- Returns: user_id, username, first_name, last_name, avatar_url, distance_miles, location_city, location_state, location_sharing

#### update_user_location(p_user_id INTEGER, p_lat DECIMAL, p_lon DECIMAL, p_address VARCHAR, p_city VARCHAR, p_state VARCHAR, p_zip VARCHAR, p_country VARCHAR, p_accuracy INTEGER, p_ip_address INET, p_user_agent TEXT)
**Purpose**: Updates user location with audit trail
**Returns**: BOOLEAN
**Behavior**:
- Updates users table location fields
- Inserts record into location_history
- Uses COALESCE to preserve existing values if parameters are NULL

#### get_user_location(p_user_id INTEGER)
**Purpose**: Retrieves user's current location with privacy settings
**Returns**: TABLE (latitude, longitude, address, city, state, zip, country, accuracy, updated_at, sharing)
**Behavior**: Returns all location fields from users table

#### cleanup_nearby_search_cache()
**Purpose**: Removes expired cache entries
**Returns**: INTEGER (count deleted)
**Behavior**: Deletes records where expires_at < CURRENT_TIMESTAMP

#### limit_location_history()
**Purpose**: Keeps only last 100 location entries per user
**Returns**: TRIGGER
**Behavior**: Deletes oldest entries beyond 100 for each user

---

## 3. SQL Queries by Feature

### 3.1 User Queries

#### Find User by Identifier (Username or Email)
```sql
SELECT * FROM users WHERE username = $1 OR email = $2
```

#### Find User by Email
```sql
SELECT * FROM users WHERE email = $1
```

#### Find User by Username
```sql
SELECT * FROM users WHERE username = $1
```

#### Check Username Exists
```sql
SELECT COUNT(*) FROM users WHERE username = $1 [AND id != $2]
```

#### Check Email Exists
```sql
SELECT COUNT(*) FROM users WHERE email = $1 [AND id != $2]
```

#### Get User Profile with Stats
```sql
SELECT * FROM users WHERE id = $1
SELECT COUNT(*) as post_count FROM posts WHERE user_id = $1 AND is_published = true
```

#### Reset Password with Token
```sql
SELECT * FROM users
WHERE password_reset_token = $1 AND password_reset_expires > $2
```

---

### 3.2 Post Queries

#### Get Posts by User ID
```sql
SELECT p.*, u.username, u.first_name, u.last_name, u.avatar_url,
       COUNT(r.id) as reaction_count, COUNT(c.id) as comment_count
FROM posts p
JOIN users u ON p.user_id = u.id
LEFT JOIN reactions r ON p.id = r.post_id
LEFT JOIN comments c ON p.id = c.post_id
WHERE p.user_id = $1 AND p.is_published = true
GROUP BY p.id, u.id
ORDER BY p.created_at DESC
LIMIT $2 OFFSET $3
```

#### Get Public Posts Feed
```sql
SELECT p.*, u.username, u.first_name, u.last_name, u.avatar_url,
       COUNT(r.id) as reaction_count, COUNT(c.id) as comment_count
FROM posts p
JOIN users u ON p.user_id = u.id
LEFT JOIN reactions r ON p.id = r.post_id
LEFT JOIN comments c ON p.id = c.post_id
WHERE p.privacy_level = 'public' AND p.is_published = true AND p.is_archived = false
GROUP BY p.id, u.id
ORDER BY p.created_at DESC
LIMIT $1 OFFSET $2
```

#### Get Post with Author and Counts
```sql
SELECT p.*, u.username, u.first_name, u.last_name, u.avatar_url,
       COUNT(r.id) as reaction_count, COUNT(c.id) as comment_count
FROM posts p
JOIN users u ON p.user_id = u.id
LEFT JOIN reactions r ON p.id = r.post_id
LEFT JOIN comments c ON p.id = c.post_id
WHERE p.id = $1
GROUP BY p.id, u.id
```

---

### 3.3 Comment Queries

#### Get Comments for Post (Hierarchical)
```sql
WITH RECURSIVE comment_tree AS (
  -- Root comments
  SELECT c.*, u.username, u.first_name, u.last_name, u.avatar_url, 0 as level
  FROM comments c
  LEFT JOIN users u ON c.user_id = u.id
  WHERE c.post_id = $1 AND c.parent_id IS NULL AND c.is_published = true

  UNION ALL

  -- Child comments
  SELECT c.*, u.username, u.first_name, u.last_name, u.avatar_url, ct.level + 1
  FROM comments c
  LEFT JOIN users u ON c.user_id = u.id
  INNER JOIN comment_tree ct ON c.parent_id = ct.id
  WHERE c.is_published = true
)
SELECT * FROM comment_tree ORDER BY level, created_at ASC
```

#### Get Comment Tree for Post
```sql
SELECT c.*, u.username, u.first_name, u.last_name, u.avatar_url,
       COUNT(r.id) as reaction_count
FROM comments c
JOIN users u ON c.user_id = u.id
LEFT JOIN reactions r ON c.id = r.comment_id
WHERE c.post_id = $1 AND c.is_published = true
GROUP BY c.id, u.id
ORDER BY c.created_at ASC
```

#### Get Replies for Comment
```sql
SELECT c.*, u.username, u.first_name, u.last_name, u.avatar_url,
       COUNT(r.id) as reaction_count
FROM comments c
JOIN users u ON c.user_id = u.id
LEFT JOIN reactions r ON c.id = r.comment_id
WHERE c.parent_id = $1 AND c.is_published = true
GROUP BY c.id, u.id
ORDER BY c.created_at ASC
LIMIT $2 OFFSET $3
```

#### Get Top Comments by Algorithm Score
```sql
SELECT c.id, c.content, c.created_at, u.username as author,
       cm.combined_algorithm_score as algorithm_score,
       cm.view_count, cm.reply_count, cm.reaction_count, cm.total_interaction_count
FROM comments c
JOIN comment_metrics cm ON c.id = cm.comment_id
JOIN users u ON c.user_id = u.id
WHERE c.post_id = $1 AND c.is_published = true AND cm.total_interaction_count >= $2
ORDER BY cm.combined_algorithm_score DESC
LIMIT $3
```

---

### 3.4 Reaction Queries

#### Get Reaction Counts for Post
```sql
SELECT emoji_name, COUNT(*) as count
FROM reactions
WHERE post_id = $1
GROUP BY emoji_name
ORDER BY count DESC
```

#### Get Reaction Counts for Comment
```sql
SELECT emoji_name, COUNT(*) as count
FROM reactions
WHERE comment_id = $1
GROUP BY emoji_name
ORDER BY count DESC
```

#### Get User's Reaction on Post
```sql
SELECT * FROM reactions WHERE user_id = $1 AND post_id = $2
```

#### Get User's Reaction on Comment
```sql
SELECT * FROM reactions WHERE user_id = $1 AND comment_id = $2
```

#### Get Post Reactions with User Info
```sql
SELECT r.*, u.username, u.first_name, u.last_name, u.avatar_url
FROM reactions r
JOIN users u ON r.user_id = u.id
WHERE r.post_id = $1
ORDER BY r.created_at DESC
LIMIT $2 OFFSET $3
```

---

### 3.5 Follow Queries

#### Check if User Follows Another
```sql
SELECT * FROM follows
WHERE follower_id = $1 AND following_id = $2 AND status = 'active'
```

#### Get Following List
```sql
SELECT f.*, u.id as user_id, u.username, u.first_name, u.last_name, u.avatar_url, u.bio,
       us.follower_count, us.following_count, us.post_count
FROM follows f
JOIN users u ON f.following_id = u.id
LEFT JOIN user_stats us ON u.id = us.user_id
WHERE f.follower_id = $1 AND f.status = $2
ORDER BY f.created_at DESC
LIMIT $3 OFFSET $4
```

#### Get Followers List
```sql
SELECT f.*, u.id as user_id, u.username, u.first_name, u.last_name, u.avatar_url, u.bio,
       us.follower_count, us.following_count, us.post_count
FROM follows f
JOIN users u ON f.follower_id = u.id
LEFT JOIN user_stats us ON u.id = us.user_id
WHERE f.following_id = $1 AND f.status = $2
ORDER BY f.created_at DESC
LIMIT $3 OFFSET $4
```

#### Get Mutual Follows
```sql
SELECT u.id, u.username, u.first_name, u.last_name, u.avatar_url, u.bio,
       us.follower_count, us.following_count, us.post_count
FROM follows f1
JOIN follows f2 ON f1.following_id = f2.follower_id AND f1.follower_id = f2.following_id
JOIN users u ON f1.following_id = u.id
LEFT JOIN user_stats us ON u.id = us.user_id
WHERE f1.follower_id = $1 AND f1.status = 'active' AND f2.status = 'active'
ORDER BY f1.created_at DESC
LIMIT $2 OFFSET $3
```

#### Get Follow Suggestions
```sql
SELECT DISTINCT u.id, u.username, u.first_name, u.last_name, u.avatar_url, u.bio,
       us.follower_count, us.following_count, us.post_count,
       COUNT(*) OVER (PARTITION BY u.id) as mutual_count
FROM follows f1
JOIN follows f2 ON f1.following_id = f2.follower_id
JOIN users u ON f2.following_id = u.id
LEFT JOIN user_stats us ON u.id = us.user_id
WHERE f1.follower_id = $1 AND f2.following_id != $1
  AND f1.status = 'active' AND f2.status = 'active'
  AND NOT EXISTS (
    SELECT 1 FROM follows f3
    WHERE f3.follower_id = $1 AND f3.following_id = u.id
  )
ORDER BY us.follower_count DESC, mutual_count DESC
LIMIT $2
```

---

### 3.6 Share Queries

#### Get Shares by User
```sql
SELECT s.*, p.id as post_id, p.content as post_content, p.created_at as post_created_at,
       p.user_id as post_author_id, u.username as post_author_username,
       u.first_name as post_author_first_name, u.last_name as post_author_last_name,
       u.avatar_url as post_author_avatar,
       (SELECT COUNT(*) FROM reactions WHERE post_id = p.id) as reaction_count,
       (SELECT COUNT(*) FROM comments WHERE post_id = p.id AND is_published = true) as comment_count,
       (SELECT COUNT(*) FROM shares WHERE post_id = p.id) as share_count
FROM shares s
JOIN posts p ON s.post_id = p.id
JOIN users u ON p.user_id = u.id
WHERE s.user_id = $1
ORDER BY s.created_at DESC
LIMIT $2 OFFSET $3
```

#### Get Shares for Post
```sql
SELECT s.*, u.id as user_id, u.username, u.first_name, u.last_name, u.avatar_url,
       us.follower_count
FROM shares s
JOIN users u ON s.user_id = u.id
LEFT JOIN user_stats us ON u.id = us.user_id
WHERE s.post_id = $1
ORDER BY s.created_at DESC
LIMIT $2 OFFSET $3
```

#### Get Popular Shares
```sql
SELECT p.id as post_id, p.content as post_content,
       p.user_id as post_author_id, u.username as post_author_username,
       u.first_name as post_author_first_name, u.last_name as post_author_last_name,
       u.avatar_url as post_author_avatar,
       COUNT(s.id) as share_count
FROM shares s
JOIN posts p ON s.post_id = p.id
JOIN users u ON p.user_id = u.id
WHERE s.created_at > NOW() - INTERVAL '7 days' AND p.is_published = true
GROUP BY p.id, p.content, p.user_id, u.username, u.first_name, u.last_name, u.avatar_url
HAVING COUNT(s.id) > 0
ORDER BY share_count DESC, p.created_at DESC
LIMIT $1
```

---

### 3.7 Rating and Reputation Queries

#### Get Ratings for User
```sql
SELECT ur.*, u.username as rater_username, u.first_name as rater_first_name,
       u.last_name as rater_last_name, u.avatar_url as rater_avatar
FROM user_ratings ur
JOIN users u ON ur.rater_id = u.id
WHERE ur.rated_user_id = $1 AND (ur.is_anonymous = false OR ur.is_anonymous IS NULL)
ORDER BY ur.created_at DESC
LIMIT $2 OFFSET $3
```

#### Can User Rate Another User
```sql
SELECT EXISTS(
  SELECT 1 FROM follows WHERE follower_id = $1 AND following_id = $2
  UNION
  SELECT 1 FROM comments c JOIN posts p ON c.post_id = p.id
  WHERE c.user_id = $1 AND p.user_id = $2
  UNION
  SELECT 1 FROM comments c JOIN posts p ON c.post_id = p.id
  WHERE c.user_id = $2 AND p.user_id = $1
  UNION
  SELECT 1 FROM follows f1 JOIN follows f2
  ON f1.follower_id = f2.following_id AND f1.following_id = f2.follower_id
  WHERE f1.follower_id = $1 AND f1.following_id = $2
) as can_rate
```

#### Get User Reputation
```sql
SELECT * FROM user_reputation WHERE user_id = $1
```

#### Get Top Users by Reputation
```sql
SELECT ur.*, u.username, u.first_name, u.last_name, u.avatar_url, u.bio
FROM user_reputation ur
JOIN users u ON ur.user_id = u.id
[WHERE ur.reputation_level = $1]
ORDER BY ur.reputation_score DESC
LIMIT $2
```

---

### 3.8 Location Queries

#### Find Nearby Users
```sql
SELECT u.id, u.username, u.first_name, u.last_name, u.avatar_url,
       calculate_distance_miles($2, $3, u.location_latitude, u.location_longitude) as distance_miles,
       u.location_city, u.location_state, u.location_sharing
FROM users u
WHERE u.id != $1 AND u.location_latitude IS NOT NULL AND u.location_longitude IS NOT NULL
  AND u.location_sharing != 'off' AND u.is_active = TRUE
  AND u.location_latitude BETWEEN $2 - ($4 / 69.0) AND $2 + ($4 / 69.0)
  AND u.location_longitude BETWEEN $3 - ($4 / 69.0) AND $3 + ($4 / 69.0)
  AND calculate_distance_miles($2, $3, u.location_latitude, u.location_longitude) <= $4
ORDER BY distance_miles
LIMIT $5 OFFSET $6
```

#### Get Location Statistics
```sql
SELECT COUNT(*) FILTER (WHERE location_latitude IS NOT NULL) as users_with_location,
       COUNT(*) FILTER (WHERE location_sharing = 'exact') as sharing_exact,
       COUNT(*) FILTER (WHERE location_sharing = 'city') as sharing_city,
       COUNT(*) FILTER (WHERE location_sharing = 'off') as sharing_off,
       COUNT(DISTINCT location_city) as unique_cities,
       COUNT(DISTINCT location_state) as unique_states,
       COUNT(DISTINCT location_country) as unique_countries
FROM users WHERE is_active = TRUE
```

---

## 4. Backend API Documentation

### 4.1 Authentication API (/api/auth)

#### POST /api/auth/register
**Description**: Register a new user account
**Authentication**: None required
**Rate Limit**: Yes (configured in app.config)

**Request Body**:
```json
{
  "username": "string (3-50 alphanumeric chars, required)",
  "email": "string (valid email, required)",
  "password": "string (8-128 chars, required, must contain lowercase, uppercase, and number)",
  "first_name": "string (1-100 chars, required)",
  "last_name": "string (1-100 chars, required)",
  "bio": "string (optional, max length configurable)",
  "avatar_url": "string (optional, valid URL)",
  "location": {
    "latitude": "number (optional, -90 to 90)",
    "longitude": "number (optional, -180 to 180)",
    "city": "string (optional, max 100 chars)",
    "state": "string (optional, max 100 chars)",
    "country": "string (optional, max 100 chars)",
    "accuracy": "integer (optional, positive)"
  },
  "location_sharing": "string (optional, 'exact'|'city'|'off')"
}
```

**Success Response (201)**:
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "username": "john_doe",
      "email": "john@example.com",
      "first_name": "John",
      "last_name": "Doe",
      "full_name": "John Doe",
      "display_name": "John Doe",
      "bio": null,
      "avatar_url": null,
      "is_active": true,
      "email_verified": false,
      "created_at": "2025-10-08T12:00:00.000Z",
      "updated_at": "2025-10-08T12:00:00.000Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "verification_token": "abc123..." // Only if email verification enabled
  },
  "message": "User registered successfully"
}
```

**Error Responses**:
- `400 Validation Error`: Invalid input data
- `400 Duplicate Error`: Username or email already exists

---

#### POST /api/auth/login
**Description**: Login with username/email and password
**Authentication**: None required
**Rate Limit**: Yes

**Request Body**:
```json
{
  "identifier": "string (username or email, required)",
  "password": "string (required)",
  "remember_me": "boolean (optional, default false)"
}
```

**Success Response (200)**:
```json
{
  "success": true,
  "data": {
    "user": { /* user object */ },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expires_in": "1d" // or "30d" if remember_me = true
  },
  "message": "Login successful"
}
```

**Error Responses**:
- `401 Authentication Error`: Invalid credentials or account deactivated

---

#### POST /api/auth/logout
**Description**: Logout current user
**Authentication**: Required
**Request Body**: None

**Success Response (200)**:
```json
{
  "success": true,
  "message": "Logout successful"
}
```

---

#### GET /api/auth/me
**Description**: Get current authenticated user profile
**Authentication**: Required
**Request Parameters**: None

**Success Response (200)**:
```json
{
  "success": true,
  "data": { /* user object */ }
}
```

---

#### POST /api/auth/refresh
**Description**: Refresh JWT token
**Authentication**: Required
**Request Body**: None

**Success Response (200)**:
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": { /* user object */ }
  },
  "message": "Token refreshed successfully"
}
```

---

#### POST /api/auth/forgot-password
**Description**: Request password reset
**Authentication**: None required
**Rate Limit**: Yes

**Request Body**:
```json
{
  "email": "string (valid email, required)"
}
```

**Success Response (200)**:
```json
{
  "success": true,
  "message": "If the email exists in our system, you will receive a password reset link",
  "reset_token": "abc123..." // Only in development/test mode
}
```

---

#### POST /api/auth/reset-password
**Description**: Reset password with token
**Authentication**: None required
**Rate Limit**: Yes

**Request Body**:
```json
{
  "token": "string (required)",
  "password": "string (8-128 chars, required, must contain lowercase, uppercase, and number)"
}
```

**Success Response (200)**:
```json
{
  "success": true,
  "message": "Password reset successfully"
}
```

**Error Responses**:
- `400 Validation Error`: Invalid or expired reset token

---

#### POST /api/auth/verify-email
**Description**: Verify email address with token
**Authentication**: None required

**Request Body**:
```json
{
  "token": "string (required)"
}
```

**Success Response (200)**:
```json
{
  "success": true,
  "message": "Email verified successfully"
}
```

**Error Responses**:
- `400 Validation Error`: Invalid verification token

---

#### POST /api/auth/change-password
**Description**: Change password for authenticated user
**Authentication**: Required

**Request Body**:
```json
{
  "current_password": "string (required)",
  "new_password": "string (8-128 chars, required, must contain lowercase, uppercase, and number)"
}
```

**Success Response (200)**:
```json
{
  "success": true,
  "message": "Password changed successfully"
}
```

**Error Responses**:
- `400 Authentication Error`: Current password is incorrect

---

### 4.2 Users API (/api/users)

#### GET /api/users
**Description**: Get all users with pagination and search
**Authentication**: Optional
**Query Parameters**:
- `page` (integer, optional, min 1, default 1)
- `limit` (integer, optional, 1-50, default 20)
- `search` (string, optional, 2-100 chars)
- `active` (boolean, optional)

**Success Response (200)**:
```json
{
  "success": true,
  "data": {
    "users": [
      {
        "id": 1,
        "username": "john_doe",
        "email": "john@example.com",
        "first_name": "John",
        "last_name": "Doe",
        "post_count": 42,
        /* other user fields */
      }
    ],
    "pagination": {
      "current_page": 1,
      "total_pages": 5,
      "total_count": 100,
      "limit": 20,
      "has_next_page": true,
      "has_prev_page": false
    }
  }
}
```

---

#### GET /api/users/:id
**Description**: Get a single user by ID with their posts
**Authentication**: Optional
**Path Parameters**:
- `id` (integer, required, min 1)

**Success Response (200)**:
```json
{
  "success": true,
  "data": {
    "id": 1,
    "username": "john_doe",
    "email": "john@example.com",
    "first_name": "John",
    "last_name": "Doe",
    "posts": [
      /* array of post objects */
    ],
    "stats": {
      "total_posts": 42,
      "total_comments": 156
    }
    /* other user fields */
  }
}
```

**Error Responses**:
- `404 Not Found`: User not found

---

#### PUT /api/users/:id
**Description**: Update a user profile
**Authentication**: Required (must be user or admin)
**Path Parameters**:
- `id` (integer, required, min 1)

**Request Body**:
```json
{
  "username": "string (optional, 3-50 alphanumeric)",
  "email": "string (optional, valid email)",
  "first_name": "string (optional, 1-100 chars)",
  "last_name": "string (optional, 1-100 chars)",
  "bio": "string (optional, max 500 chars)",
  "avatar_url": "string (optional, valid URL or path)",
  "address": "string (optional, max 255 chars)",
  "location_city": "string (optional, max 100 chars)",
  "location_state": "string (optional, max 100 chars)",
  "location_zip": "string (optional, max 20 chars)",
  "location_country": "string (optional, max 100 chars)",
  "is_active": "boolean (optional)"
}
```

**Success Response (200)**:
```json
{
  "success": true,
  "data": { /* updated user object */ },
  "message": "User updated successfully"
}
```

**Error Responses**:
- `404 Not Found`: User not found
- `400 Duplicate Error`: Username or email already taken
- `403 Authorization Error`: Not authorized to edit this user

---

#### DELETE /api/users/:id
**Description**: Delete a user (soft delete by setting is_active to false)
**Authentication**: Required (must be user or admin)
**Path Parameters**:
- `id` (integer, required, min 1)

**Success Response (200)**:
```json
{
  "success": true,
  "message": "User deactivated successfully"
}
```

**Error Responses**:
- `404 Not Found`: User not found
- `403 Authorization Error`: Not authorized to delete this user

---

#### GET /api/users/:id/posts
**Description**: Get all posts by a specific user
**Authentication**: Optional
**Path Parameters**:
- `id` (integer, required, min 1)
**Query Parameters**:
- `page` (integer, optional, min 1, default 1)
- `limit` (integer, optional, 1-50, default 20)

**Success Response (200)**:
```json
{
  "success": true,
  "data": {
    "user": { /* user object */ },
    "posts": [
      {
        "id": 1,
        "content": "Post content...",
        "author": { /* author info */ },
        "reaction_counts": [ /* reactions */ ],
        /* other post fields */
      }
    ],
    "pagination": {
      "current_page": 1,
      "total_pages": 3,
      "total_count": 42,
      "limit": 20,
      "has_next_page": true,
      "has_prev_page": false
    }
  }
}
```

---

### 4.3 Posts API (/api/posts)

#### GET /api/posts
**Description**: Get all posts with pagination, filtering, and sorting
**Authentication**: Optional (affects privacy filtering)
**Query Parameters**:
- `page` (integer, optional, min 1, default 1)
- `limit` (integer, optional, 1-100, default 20)
- `sort` (string, optional, 'newest'|'oldest', default 'newest')
- `privacy` (string, optional, 'public'|'friends'|'private')
- `user_id` (integer, optional, min 1)

**Success Response (200)**:
```json
{
  "success": true,
  "data": {
    "posts": [
      {
        "id": 1,
        "content": "Post content...",
        "privacy_level": "public",
        "author": {
          "id": 1,
          "username": "john_doe",
          "first_name": "John",
          "last_name": "Doe",
          "avatar_url": null
        },
        "reaction_counts": [
          { "emoji_name": "like", "emoji_unicode": "👍", "count": 5 }
        ],
        "comment_count": 3,
        "media": [ /* media attachments */ ],
        "created_at": "2025-10-08T12:00:00.000Z"
      }
    ],
    "pagination": {
      "current_page": 1,
      "total_pages": 10,
      "total_count": 200,
      "limit": 20,
      "has_next_page": true,
      "has_prev_page": false
    }
  }
}
```

---

#### GET /api/posts/:id
**Description**: Get a single post by ID with all details
**Authentication**: Optional (affects privacy checks)
**Path Parameters**:
- `id` (integer, required, min 1)

**Success Response (200)**:
```json
{
  "success": true,
  "data": {
    "id": 1,
    "content": "Post content...",
    "privacy_level": "public",
    "author": { /* author object */ },
    "comments": [ /* hierarchical comment tree */ ],
    "media": [ /* media attachments */ ],
    /* other post fields */
  }
}
```

**Error Responses**:
- `404 Not Found`: Post not found
- `403 Authorization Error`: Access denied (private post)

---

#### POST /api/posts
**Description**: Create a new post
**Authentication**: Required

**Request Body**:
```json
{
  "content": "string (required, 1-10000 chars)",
  "privacy_level": "string (optional, 'public'|'friends'|'private', default 'public')"
}
```

**Success Response (201)**:
```json
{
  "success": true,
  "data": {
    "id": 1,
    "content": "Post content...",
    "privacy_level": "public",
    "author": { /* author object */ },
    /* other post fields */
  },
  "message": "Post created successfully"
}
```

---

#### PUT /api/posts/:id
**Description**: Update a post
**Authentication**: Required (must be post owner)
**Path Parameters**:
- `id` (integer, required, min 1)

**Request Body**:
```json
{
  "content": "string (optional, 1-10000 chars)",
  "privacy_level": "string (optional, 'public'|'friends'|'private')"
}
```

**Success Response (200)**:
```json
{
  "success": true,
  "data": { /* updated post object */ },
  "message": "Post updated successfully"
}
```

**Error Responses**:
- `404 Not Found`: Post not found
- `403 Authorization Error`: Not authorized to edit this post

---

#### DELETE /api/posts/:id
**Description**: Delete a post
**Authentication**: Required (must be post owner)
**Path Parameters**:
- `id` (integer, required, min 1)

**Success Response (200)**:
```json
{
  "success": true,
  "message": "Post deleted successfully"
}
```

**Error Responses**:
- `404 Not Found`: Post not found
- `403 Authorization Error`: Not authorized to delete this post

---

### 4.4 Comments API (/api/comments)

#### GET /api/comments/post/:postId
**Description**: Get all comments for a specific post in hierarchical structure
**Authentication**: Optional
**Path Parameters**:
- `postId` (integer, required, min 1)
**Query Parameters**:
- `sort` (string, optional, 'newest'|'oldest', default 'oldest')
- `limit` (integer, optional, 1-100, default 10)
- `page` (integer, optional, min 1, default 1)

**Success Response (200)**:
```json
{
  "success": true,
  "data": {
    "post_id": 1,
    "comments": [
      {
        "id": 1,
        "content": "Comment text...",
        "author": { /* author object */ },
        "reaction_counts": [ /* reactions */ ],
        "replies": [
          /* nested replies with same structure */
        ],
        "created_at": "2025-10-08T12:00:00.000Z"
      }
    ],
    "total_count": 25,
    "sort": "oldest",
    "pagination": {
      "current_page": 1,
      "total_pages": 3,
      "total_count": 25,
      "limit": 10,
      "has_next_page": true,
      "has_prev_page": false
    }
  }
}
```

---

#### GET /api/comments/post/:postId/hierarchical
**Description**: Enhanced hierarchical comment loading with algorithm support
**Authentication**: Optional
**Path Parameters**:
- `postId` (integer, required, min 1)
**Query Parameters**:
- `sort` (string, optional, 'newest'|'oldest'|'hot'|'trending'|'best', default 'oldest')
- `limit` (integer, optional, 1-50, default 10)
- `page` (integer, optional, min 1, default 1)
- `max_depth` (integer, optional, 1-10, default 5)
- `load_all_replies` (boolean, optional)

**Success Response (200)**:
```json
{
  "success": true,
  "data": {
    "post_id": 1,
    "comments": [ /* hierarchical comment tree with metrics */ ],
    "total_count": 25,
    "sort": "hot",
    "algorithm_metadata": {
      "sort_method": "hot",
      "max_depth": 5,
      "load_all_replies": false,
      "interaction_tracking": true
    },
    "pagination": { /* pagination info */ }
  }
}
```

---

#### POST /api/comments/track-interaction
**Description**: Track user interactions with comments for algorithm support
**Authentication**: Optional

**Request Body**:
```json
{
  "comment_id": "integer (required, min 1)",
  "interaction_type": "string (required, 'view'|'reply'|'reaction'|'share'|'deep_read'|'quote')",
  "metadata": "object (optional)"
}
```

**Success Response (200)**:
```json
{
  "success": true,
  "data": {
    "interaction_id": 123,
    "message": "Interaction tracked successfully"
  }
}
```

---

#### POST /api/comments
**Description**: Create a new comment or reply
**Authentication**: Required

**Request Body**:
```json
{
  "post_id": "integer (required, min 1)",
  "content": "string (required, 1-2000 chars)",
  "parent_id": "integer (optional, min 1)"
}
```

**Success Response (201)**:
```json
{
  "success": true,
  "data": { /* comment object */ },
  "message": "Comment created successfully" // or "Reply created successfully"
}
```

**Error Responses**:
- `404 Not Found`: Post or parent comment not found
- `400 Validation Error`: Maximum nesting depth exceeded (5 levels)
- `400 Invalid Parent`: Parent comment must belong to the same post

---

#### PUT /api/comments/:id
**Description**: Update a comment
**Authentication**: Required (must be comment owner)
**Path Parameters**:
- `id` (integer, required, min 1)

**Request Body**:
```json
{
  "content": "string (required, 1-2000 chars)"
}
```

**Success Response (200)**:
```json
{
  "success": true,
  "data": { /* updated comment object */ },
  "message": "Comment updated successfully"
}
```

---

#### DELETE /api/comments/:id
**Description**: Delete a comment and all its replies
**Authentication**: Required (must be comment owner)
**Path Parameters**:
- `id` (integer, required, min 1)

**Success Response (200)**:
```json
{
  "success": true,
  "message": "Comment deleted successfully along with 3 replies"
}
```

---

### 4.5 Reactions API (/api/reactions)

#### POST /api/reactions/post/:postId
**Description**: Add or toggle reaction on a post
**Authentication**: Required
**Path Parameters**:
- `postId` (integer, required)

**Request Body**:
```json
{
  "emoji_name": "string (required, 1-50 chars, e.g., 'like', 'love', 'laugh')",
  "emoji_unicode": "string (optional, e.g., '👍')"
}
```

**Success Response (200)**:
```json
{
  "success": true,
  "data": {
    "action": "added", // or "removed" or "updated"
    "reaction": { /* reaction object */ },
    "reaction_counts": [
      { "emoji_name": "like", "count": 5 },
      { "emoji_name": "love", "count": 2 }
    ]
  },
  "message": "Reaction added successfully"
}
```

---

#### POST /api/reactions/comment/:commentId
**Description**: Add or toggle reaction on a comment
**Authentication**: Required
**Path Parameters**:
- `commentId` (integer, required)

**Request Body**: Same as POST /api/reactions/post/:postId

**Success Response (200)**: Same as POST /api/reactions/post/:postId

---

#### GET /api/reactions/post/:postId
**Description**: Get reaction counts and details for a post
**Authentication**: Optional
**Path Parameters**:
- `postId` (integer, required)
**Query Parameters**:
- `include_users` (boolean, optional)
- `limit` (integer, optional, 1-100, default 50)
- `offset` (integer, optional, min 0, default 0)

**Success Response (200)**:
```json
{
  "success": true,
  "data": {
    "post_id": 1,
    "total_reactions": 7,
    "reaction_counts": [
      { "emoji_name": "like", "count": 5 },
      { "emoji_name": "love", "count": 2 }
    ],
    "reactions": [ /* detailed reactions with user info if include_users=true */ ]
  }
}
```

---

#### GET /api/reactions/emoji-list
**Description**: Get list of available emojis
**Authentication**: None required

**Success Response (200)**:
```json
{
  "success": true,
  "data": {
    "emojis": [
      { "name": "like", "unicode": "👍", "display_name": "Like" },
      { "name": "love", "unicode": "❤️", "display_name": "Love" },
      { "name": "laugh", "unicode": "😂", "display_name": "Laugh" },
      { "name": "wow", "unicode": "😮", "display_name": "Wow" },
      { "name": "sad", "unicode": "😢", "display_name": "Sad" },
      { "name": "angry", "unicode": "😠", "display_name": "Angry" }
    ],
    "total_count": 6,
    "common_mappings": { /* emoji name normalization map */ }
  }
}
```

---

### 4.6 Follows API (/api/follows)

#### POST /api/follows/:userId
**Description**: Follow a user
**Authentication**: Required
**Path Parameters**:
- `userId` (integer, required)

**Success Response (201)**:
```json
{
  "success": true,
  "data": {
    "follow": { /* follow relationship object */ },
    "counts": {
      "follower_count": 42,
      "following_count": 35
    }
  },
  "message": "Successfully followed user"
}
```

**Error Responses**:
- `400 Validation Error`: Cannot follow yourself or already following

---

#### DELETE /api/follows/:userId
**Description**: Unfollow a user
**Authentication**: Required
**Path Parameters**:
- `userId` (integer, required)

**Success Response (200)**:
```json
{
  "success": true,
  "data": {
    "counts": {
      "follower_count": 41,
      "following_count": 34
    }
  },
  "message": "Unfollowed successfully"
}
```

---

#### GET /api/follows/followers/:userId?
**Description**: Get user's followers (defaults to current user if no userId)
**Authentication**: Optional
**Path Parameters**:
- `userId` (integer, optional)
**Query Parameters**:
- `page` (integer, optional, default 1)
- `limit` (integer, optional, default 20)
- `status` (string, optional, default 'active')

**Success Response (200)**:
```json
{
  "success": true,
  "data": {
    "followers": [
      {
        "user_id": 2,
        "username": "jane_doe",
        "first_name": "Jane",
        "last_name": "Doe",
        "avatar_url": null,
        "follower_count": 50,
        "following_count": 40,
        "post_count": 25
      }
    ],
    "pagination": { /* pagination info */ }
  }
}
```

---

#### GET /api/follows/following/:userId?
**Description**: Get users that a user follows (defaults to current user if no userId)
**Authentication**: Optional
**Path Parameters and Query Parameters**: Same as GET /api/follows/followers/:userId?

**Success Response (200)**: Similar structure to followers endpoint

---

#### GET /api/follows/mutual
**Description**: Get mutual follows for current user
**Authentication**: Required
**Query Parameters**:
- `page` (integer, optional, default 1)
- `limit` (integer, optional, default 20)

**Success Response (200)**:
```json
{
  "success": true,
  "data": {
    "mutual_follows": [ /* array of users */ ],
    "pagination": { /* pagination info */ }
  }
}
```

---

#### GET /api/follows/suggestions
**Description**: Get follow suggestions for current user
**Authentication**: Optional
**Query Parameters**:
- `limit` (integer, optional, default 10)

**Success Response (200)**:
```json
{
  "success": true,
  "data": {
    "suggestions": [ /* array of suggested users */ ]
  }
}
```

---

#### PATCH /api/follows/:userId/mute
**Description**: Mute a followed user
**Authentication**: Required
**Path Parameters**:
- `userId` (integer, required)

**Success Response (200)**:
```json
{
  "success": true,
  "data": {
    "follow": { /* updated follow relationship */ }
  },
  "message": "User muted successfully"
}
```

---

### 4.7 Location API (/api/location)

#### POST /api/location/update
**Description**: Update user's location
**Authentication**: Required

**Request Body**:
```json
{
  "latitude": "number (required, -90 to 90)",
  "longitude": "number (required, -180 to 180)",
  "address": "string (optional)",
  "city": "string (optional)",
  "state": "string (optional)",
  "zip": "string (optional)",
  "country": "string (optional)",
  "accuracy": "integer (optional)"
}
```

**Success Response (200)**:
```json
{
  "success": true,
  "message": "Location updated successfully"
}
```

---

#### POST /api/location/nearby
**Description**: Find nearby users
**Authentication**: Required

**Request Body**:
```json
{
  "latitude": "number (required, -90 to 90)",
  "longitude": "number (required, -180 to 180)",
  "radiusMiles": "integer (optional, 1-500, default 25)",
  "limit": "integer (optional, default 50)",
  "offset": "integer (optional, default 0)"
}
```

**Success Response (200)**:
```json
{
  "success": true,
  "users": [
    {
      "user_id": 2,
      "username": "jane_doe",
      "first_name": "Jane",
      "last_name": "Doe",
      "distance_miles": 5.23,
      "location_city": "San Francisco",
      "location_state": "CA",
      "location_sharing": "city"
    }
  ],
  "count": 1,
  "cached": false
}
```

---

#### PUT /api/location/preferences
**Description**: Update location sharing preferences
**Authentication**: Required

**Request Body**:
```json
{
  "sharing": "string (optional, 'exact'|'city'|'off')",
  "showDistance": "boolean (optional)"
}
```

**Success Response (200)**:
```json
{
  "success": true,
  "preferences": {
    "id": 1,
    "location_sharing": "city",
    "show_distance_in_profile": false
  }
}
```

---

## 5. Data Models and Relationships

### Entity Relationship Diagram (Textual Description)

```
USERS (1) ----< (M) POSTS
  |                  |
  |                  +----< (M) COMMENTS
  |                  |         |
  |                  |         +----< (M) COMMENTS (self-referential, parent_id)
  |                  |         |
  |                  |         +----< (M) MEDIA
  |                  |
  |                  +----< (M) MEDIA
  |                  |
  |                  +----< (M) REACTIONS
  |
  +----< (M) COMMENTS
  |         |
  |         +----< (M) REACTIONS
  |
  +----< (M) REACTIONS
  |
  +----< (M) FOLLOWS (follower_id)
  |
  +----< (M) FOLLOWS (following_id)
  |
  +----< (M) SHARES
  |
  +---1-< (1) USER_STATS
  |
  +---1-< (1) USER_REPUTATION
  |
  +----< (M) USER_RATINGS (rater_id)
  |
  +----< (M) USER_RATINGS (rated_user_id)
  |
  +----< (M) LOCATION_HISTORY
  |
  +----< (M) NEARBY_SEARCH_CACHE
  |
  +----< (M) TIMELINE_CACHE

POSTS (1) ----< (M) TIMELINE_CACHE
      |
      +----< (M) SHARES

COMMENTS (1) ----< (M) COMMENT_INTERACTIONS
         |
         +---1-< (1) COMMENT_METRICS

USER_RATINGS (1) ----< (M) RATING_REPORTS

HELPFUL_MARKS references: USERS, and various content types (posts, comments, users)
```

### Key Relationships

1. **Users → Posts** (One-to-Many)
   - A user can create multiple posts
   - Each post belongs to one user
   - CASCADE DELETE: Deleting user deletes all their posts

2. **Posts → Comments** (One-to-Many)
   - A post can have multiple comments
   - Each comment belongs to one post
   - CASCADE DELETE: Deleting post deletes all comments

3. **Comments → Comments** (Self-referential, One-to-Many)
   - Comments can have nested replies (parent_id)
   - Maximum nesting depth: 5 levels
   - CASCADE DELETE: Deleting parent comment deletes all child comments

4. **Users/Posts/Comments → Media** (One-to-Many)
   - Media can be attached to users (avatar), posts, or comments
   - Each media belongs to either a post OR a comment (not both)
   - CASCADE DELETE: Deleting parent entity deletes associated media

5. **Users/Posts/Comments → Reactions** (Many-to-Many through Reactions)
   - Users can react to posts or comments with multiple emoji types
   - Each reaction belongs to either a post OR a comment (not both)
   - UNIQUE constraint: One reaction per user per emoji per post/comment
   - CASCADE DELETE: Deleting user/post/comment deletes reactions

6. **Users → Follows** (Many-to-Many self-referential)
   - Users can follow other users
   - follower_id: user doing the following
   - following_id: user being followed
   - UNIQUE constraint: One follow relationship per pair
   - CHECK constraint: Cannot follow self
   - Triggers maintain user_stats counts

7. **Users/Posts → Shares** (Many-to-Many through Shares)
   - Users can share posts
   - UNIQUE constraint: One share per user per post
   - Triggers maintain user_stats share counts

8. **Users → User Stats** (One-to-One)
   - Denormalized statistics for performance
   - Automatically maintained via triggers

9. **Comments → Comment Interactions** (One-to-Many)
   - Tracks various interaction types for algorithmic ranking
   - Triggers update comment_metrics

10. **Comments → Comment Metrics** (One-to-One)
    - Aggregated metrics and algorithm scores
    - Automatically calculated via triggers

11. **Users → User Ratings** (Many-to-Many self-referential)
    - Users can rate other users
    - CHECK constraint: Cannot rate self
    - UNIQUE constraint per context
    - Triggers maintain user_reputation

12. **Users → Location History** (One-to-Many)
    - Audit trail of location changes
    - Trigger limits to last 100 entries per user

---

## 6. Indexes and Performance

### 6.1 Primary Key Indexes
All tables have primary key indexes on `id` (or `user_id` for single-row tables).

### 6.2 Foreign Key Indexes
All foreign key columns are indexed:
- user_id columns across all tables
- post_id, comment_id, parent_id references
- follower_id, following_id in follows table

### 6.3 Search and Filter Indexes

**Users Table**:
- `idx_users_username` - Login lookups
- `idx_users_email` - Login and uniqueness checks
- `idx_users_active` - Filter active users
- `idx_users_created_at` - Chronological sorting
- `idx_users_location_coords` - Geospatial queries

**Posts Table**:
- `idx_posts_user_id` - User's posts
- `idx_posts_privacy_level` - Privacy filtering
- `idx_posts_published` - Published posts filter
- `idx_posts_created_at` - Chronological sorting

**Comments Table**:
- `idx_comments_post_id` - Comments by post
- `idx_comments_parent_id` - Nested replies
- `idx_comments_created_at` - Chronological sorting

**Reactions Table**:
- `idx_reactions_post_id` - Reactions by post
- `idx_reactions_comment_id` - Reactions by comment
- `idx_reactions_emoji_name` - Group by emoji type

**Follows Table**:
- `idx_follows_composite` ON (follower_id, following_id, status) - Relationship lookups
- `idx_follows_status` - Filter by status
- `idx_follows_created_at` - Chronological sorting

**Timeline Cache**:
- `idx_timeline_user_score` ON (user_id, score DESC) - Ranked timeline
- `idx_timeline_expires_at` - Cleanup queries

**Comment Metrics**:
- `idx_comment_metrics_algorithm_score` - Algorithm-based sorting
- `idx_comment_metrics_interaction_rate` - Trending comments

**User Reputation**:
- `idx_user_reputation_score` - Leaderboards
- `idx_user_reputation_level` - Filter by level

### 6.4 Performance Optimizations

1. **Denormalization**:
   - user_stats table maintains counts to avoid expensive COUNT queries
   - comment_metrics caches algorithm scores
   - timeline_cache pre-computes feed entries

2. **Composite Indexes**:
   - Multi-column indexes on frequently queried combinations
   - Covering indexes reduce table lookups

3. **Partial Indexes**:
   - Could be added for common filters (e.g., is_published = true)

4. **Caching**:
   - nearby_search_cache reduces geospatial query load
   - timeline_cache reduces feed generation overhead

5. **Query Optimization**:
   - Use of CTEs for hierarchical queries
   - Bounding box pre-filter for geospatial queries
   - Bulk operations for reaction counts

---

## 7. Security Considerations

### 7.1 Authentication

**JWT-based Authentication**:
- Tokens generated on login/registration
- Stored in HTTP-only cookies for XSS protection
- Configurable expiration (default: 1 day, remember-me: 30 days)
- Token refresh endpoint available
- Middleware validates token on protected routes

**Password Security**:
- Passwords hashed with bcrypt
- Configurable rounds (default: 12)
- Password reset with time-limited tokens (1 hour expiration)
- Password complexity requirements enforced:
  - Minimum 8 characters
  - Must contain lowercase, uppercase, and digit

**Email Verification**:
- Optional email verification system
- Cryptographically random tokens
- Tokens stored in database, nullified after verification

### 7.2 Authorization

**Permission Checks**:
- `authenticate` middleware: Requires valid JWT
- `optionalAuthenticate` middleware: Parses JWT if present
- `requireModifyPermission` middleware: Checks resource ownership
- User can only modify their own resources (posts, comments, profile)
- Privacy levels enforced on content access

**Resource Ownership**:
- Users can only edit/delete their own posts and comments
- Users can only modify their own profile
- Admin users (ID 1) have elevated permissions

### 7.3 Rate Limiting

**Authentication Endpoints**:
- Rate limiting applied to prevent brute force attacks
- Configurable limits per time window
- Disabled in test environment

**Other Endpoints**:
- Can be configured per route as needed
- Not currently implemented on read-only endpoints

### 7.4 Input Validation

**express-validator**:
- All API endpoints validate input
- Type checking (string, integer, boolean, email)
- Length constraints
- Format validation (email, URL, coordinates)
- Custom validators for specific business logic

**SQL Injection Prevention**:
- Parameterized queries throughout
- No string concatenation for SQL
- PostgreSQL driver handles escaping

### 7.5 Data Privacy

**Location Privacy**:
- Three-tier location sharing: 'exact', 'city', 'off'
- Location history limited to 100 entries per user
- IP addresses logged for audit trail
- Users control what location data is shared

**Privacy Levels**:
- Posts support: 'public', 'friends', 'private'
- Enforcement at query level
- Friend relationships can be implemented for 'friends' privacy

**Sensitive Data**:
- Password hashes never exposed in API responses
- Reset/verification tokens only returned in dev/test mode
- User data filtered through getPublicData() method

### 7.6 CORS and Headers

**CORS Configuration**:
- Configured in app.config.js
- Credentials allowed for cookie-based auth
- Origin restrictions enforced

**Security Headers**:
- HTTP-only cookies prevent XSS attacks
- Secure flag in production
- SameSite attribute for CSRF protection

### 7.7 Error Handling

**Generic Error Messages**:
- Authentication errors don't reveal if username/email exists
- Consistent error format prevents information leakage

**Logging**:
- Errors logged server-side
- Sensitive data not logged
- User actions audited (location changes)

### 7.8 Database Security

**Constraints**:
- Foreign keys enforce referential integrity
- CHECK constraints validate data
- UNIQUE constraints prevent duplicates
- NOT NULL on critical fields

**Triggers**:
- Automatic timestamp management
- Denormalized data kept in sync
- Data limits enforced (location history)

**Permissions**:
- Application uses dedicated database user
- Principle of least privilege
- Sensitive operations use stored procedures

### 7.9 TODO: Security Enhancements

1. **Implement friend relationships** for 'friends' privacy level
2. **Add CSRF tokens** for state-changing operations
3. **Implement 2FA** for sensitive accounts
4. **Add API rate limiting** for all endpoints
5. **Implement content moderation** system
6. **Add IP-based blocking** for reported users
7. **Implement audit logging** for all data changes
8. **Add input sanitization** for rich text content
9. **Implement file upload security** (virus scanning, type validation)
10. **Add database encryption** for sensitive fields

---

## Appendix: Configuration

### Database Configuration
- PostgreSQL 12+
- Connection pooling enabled
- Migrations tracked in version control
- Extensions: uuid-ossp

### Application Configuration
File: `/config/app.config.js`

Key settings:
- JWT secret and expiration
- Bcrypt rounds
- Rate limiting windows
- Feature flags (email verification, etc.)
- CORS origins
- Session settings

---

**Document Version**: 1.0
**Last Updated**: 2025-10-08
**Database Version**: Migration 008
**API Version**: 1.0
