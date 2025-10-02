# Follow & Share System - Architecture Plan

## Overview
Implement a comprehensive follow/share system that will power a personalized timeline algorithm. This system will track user relationships, content sharing, and engagement metrics to create an intelligent feed.

## Database Schema Design

### 1. Follows Table
**Purpose:** Track user-to-user follow relationships

```sql
CREATE TABLE follows (
    id SERIAL PRIMARY KEY,
    follower_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    following_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'muted', 'blocked')),
    notifications_enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Constraints
    CONSTRAINT unique_follow UNIQUE (follower_id, following_id),
    CONSTRAINT no_self_follow CHECK (follower_id != following_id)
);
```

**Indexes:**
- `idx_follows_follower_id` - For getting who a user follows
- `idx_follows_following_id` - For getting user's followers
- `idx_follows_status` - For filtering by relationship status
- `idx_follows_created_at` - For chronological ordering

**Metrics:**
- `follower_count` - Cached count of followers
- `following_count` - Cached count of people user follows

### 2. Shares Table
**Purpose:** Track when users share posts

```sql
CREATE TABLE shares (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    share_type VARCHAR(20) DEFAULT 'repost' CHECK (share_type IN ('repost', 'quote', 'external')),
    share_comment TEXT,
    visibility VARCHAR(20) DEFAULT 'public' CHECK (visibility IN ('public', 'friends', 'private')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- One share per user per post
    CONSTRAINT unique_user_share UNIQUE (user_id, post_id)
);
```

**Indexes:**
- `idx_shares_user_id` - For user's shares
- `idx_shares_post_id` - For post share count
- `idx_shares_type` - For filtering by share type
- `idx_shares_created_at` - For chronological ordering

### 3. User Stats Table (Denormalized for Performance)
**Purpose:** Cache follower/following counts and engagement metrics

```sql
CREATE TABLE user_stats (
    user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    follower_count INTEGER DEFAULT 0,
    following_count INTEGER DEFAULT 0,
    post_count INTEGER DEFAULT 0,
    total_reactions_received INTEGER DEFAULT 0,
    total_shares_received INTEGER DEFAULT 0,
    total_comments_received INTEGER DEFAULT 0,
    engagement_score DECIMAL(10,2) DEFAULT 0,
    last_post_at TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 4. Timeline Cache Table
**Purpose:** Pre-computed timeline entries for fast feed loading

```sql
CREATE TABLE timeline_cache (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    score DECIMAL(10,2) NOT NULL,
    reason VARCHAR(50) NOT NULL, -- 'following', 'popular', 'shared', 'suggested'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT unique_user_post_timeline UNIQUE (user_id, post_id)
);
```

**Indexes:**
- `idx_timeline_user_score` - For fetching user's timeline sorted by score
- `idx_timeline_created_at` - For chronological fallback

## Timeline Algorithm Design

### Scoring Factors

1. **Relationship Strength (0-40 points)**
   - Direct follow: 40 points
   - Mutual follow: 35 points
   - Followed by friends: 20 points
   - Not following: 0 points

2. **Recency (0-25 points)**
   - < 1 hour: 25 points
   - < 6 hours: 20 points
   - < 24 hours: 15 points
   - < 3 days: 10 points
   - < 7 days: 5 points
   - Older: 0 points

3. **Engagement (0-20 points)**
   - Reactions: +2 per reaction (max 10)
   - Comments: +3 per comment (max 10)
   - Shares: +5 per share (max 10)
   - Total capped at 20

4. **Content Type (0-10 points)**
   - Has media: 10 points
   - Text only: 5 points

5. **User Activity (0-5 points)**
   - Based on user's posting frequency
   - Very active (>5/day): 2 points
   - Active (1-5/day): 5 points
   - Moderate (<1/day): 3 points

**Total Score: 0-100 points**

### Timeline Generation Strategy

1. **Real-time Updates:**
   - New posts from followed users → instant timeline cache entry
   - Engagement updates → recalculate score

2. **Batch Processing:**
   - Every hour: Update scores for recent posts
   - Every 6 hours: Discover trending posts
   - Daily: Cleanup old timeline cache entries

3. **Feed Types:**
   - **Following Feed:** Only posts from followed users (sorted by score)
   - **Discover Feed:** Mix of popular + suggested content
   - **Trending Feed:** High engagement posts from last 24 hours

## API Endpoints

### Follow System
```
POST   /api/follows/:userId          - Follow a user
DELETE /api/follows/:userId          - Unfollow a user
GET    /api/follows/followers        - Get user's followers
GET    /api/follows/following        - Get who user follows
GET    /api/follows/suggestions      - Get follow suggestions
PATCH  /api/follows/:userId/mute     - Mute a followed user
PATCH  /api/follows/:userId/unmute   - Unmute a followed user
```

### Share System
```
POST   /api/shares/:postId           - Share a post
DELETE /api/shares/:postId           - Unshare a post
GET    /api/shares/user/:userId      - Get user's shares
GET    /api/shares/post/:postId      - Get who shared a post
```

### Timeline
```
GET    /api/timeline                 - Get personalized timeline
GET    /api/timeline/following       - Following-only feed
GET    /api/timeline/discover        - Discover feed
GET    /api/timeline/trending        - Trending posts
```

### User Stats
```
GET    /api/users/:userId/stats      - Get user statistics
```

## Frontend Components

### 1. FollowButton
- Show follow/unfollow state
- Display follower count
- Handle mute/unmute

### 2. ShareButton
- Share with comment (quote)
- Simple repost
- Share count display

### 3. UserListModal
- Show followers/following
- Follow suggestions
- Quick follow actions

### 4. TimelineFeed
- Infinite scroll
- Score-based ordering
- Real-time updates
- Multiple feed types (tabs)

### 5. UserProfileStats
- Follower/following counts
- Engagement metrics
- Activity timeline

## Implementation Phases

### Phase 1: Core Follow System (Current Sprint)
- [x] Database schema for follows
- [ ] Follow/Unfollow API
- [ ] Backend models
- [ ] Basic follower/following lists
- [ ] Follow button component

### Phase 2: Share System
- [ ] Database schema for shares
- [ ] Share/Unshare API
- [ ] Share button component
- [ ] Share count display

### Phase 3: Timeline Algorithm
- [ ] Scoring algorithm implementation
- [ ] Timeline cache generation
- [ ] Timeline API endpoints
- [ ] Real-time score updates

### Phase 4: Advanced Features
- [ ] Follow suggestions algorithm
- [ ] Mute/unmute functionality
- [ ] Notification preferences
- [ ] Trending discovery
- [ ] User stats dashboard

## Performance Considerations

1. **Caching Strategy:**
   - Redis for real-time timeline cache
   - Database for persistent storage
   - Invalidation on new posts/follows

2. **Scaling:**
   - Denormalized user_stats table
   - Pre-computed timeline entries
   - Pagination for all lists

3. **Database Optimization:**
   - Proper indexing on all foreign keys
   - Composite indexes for timeline queries
   - Materialized views for stats

4. **Real-time Updates:**
   - WebSocket connections for live timeline updates
   - Event-driven score recalculation
   - Debounced engagement updates

## Migration Strategy

1. Add new tables with `IF NOT EXISTS`
2. Backfill user_stats for existing users
3. Generate initial timeline cache
4. Deploy API endpoints
5. Deploy frontend components
6. Monitor performance metrics

## Testing Strategy

1. **Unit Tests:**
   - Follow/unfollow logic
   - Score calculation
   - Timeline generation

2. **Integration Tests:**
   - API endpoints
   - Database constraints
   - Cache invalidation

3. **Load Tests:**
   - Timeline generation for 10k+ users
   - Concurrent follow operations
   - Real-time updates performance

## Success Metrics

1. **Engagement:**
   - Increase in time spent on feed
   - Higher interaction rate with posts
   - More follows per user

2. **Performance:**
   - Timeline load < 500ms
   - Follow action < 200ms
   - Real-time updates < 1s delay

3. **User Satisfaction:**
   - Relevant content in feed
   - Easy to discover new users
   - Intuitive follow/share UX
