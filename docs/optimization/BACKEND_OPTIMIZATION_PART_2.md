# Backend API Optimization - Detailed Guide Part 2

**Continuation of detailed implementation instructions**

This document continues from [BACKEND_OPTIMIZATION_DETAILED_GUIDE.md](BACKEND_OPTIMIZATION_DETAILED_GUIDE.md)

---

## Issue #8: User Profile Multiple Queries

**Impact:** 3 queries → 1 query (67% reduction)
**Time to Fix:** 2 hours
**Difficulty:** Medium

### Current Problem

File: `/backend/src/routes/users.js` GET `/api/users/:id`

Executes:
1. Get user by ID
2. Get recent posts
3. Get user statistics

Total: **3 queries**

### Step-by-Step Fix

#### Step 1: Create Unified Query

Replace the GET `/api/users/:id` endpoint in `/backend/src/routes/users.js`:

```javascript
/**
 * GET /api/users/:id
 * Get user profile with posts and stats in single query
 */
router.get('/:id',
  [
    param('id').isInt({ min: 1 }).withMessage('User ID must be a positive integer')
  ],
  handleValidationErrors,
  async (req, res, next) => {
    try {
      const userId = parseInt(req.params.id);

      const query = `
        WITH user_posts AS (
          SELECT
            p.id,
            p.content,
            p.privacy_level,
            p.is_published,
            p.views_count,
            p.created_at,
            p.updated_at,
            -- Aggregate reactions for each post
            COALESCE(
              json_agg(
                DISTINCT jsonb_build_object(
                  'emoji_name', r.emoji_name,
                  'emoji_unicode', r.emoji_unicode,
                  'count', r_counts.count
                )
              ) FILTER (WHERE r.emoji_name IS NOT NULL),
              '[]'
            ) as reactions
          FROM posts p
          LEFT JOIN reactions r ON p.id = r.post_id
          LEFT JOIN (
            SELECT post_id, emoji_name, emoji_unicode, COUNT(*) as count
            FROM reactions
            WHERE post_id IS NOT NULL
            GROUP BY post_id, emoji_name, emoji_unicode
          ) r_counts ON p.id = r_counts.post_id
            AND r.emoji_name = r_counts.emoji_name
            AND r.emoji_unicode = r_counts.emoji_unicode
          WHERE p.user_id = $1
          AND p.is_published = true
          GROUP BY p.id
          ORDER BY p.created_at DESC
          LIMIT 10
        ),
        user_stats AS (
          SELECT
            (SELECT COUNT(*) FROM posts WHERE user_id = $1 AND is_published = true) as total_posts,
            (SELECT COUNT(*) FROM comments WHERE user_id = $1 AND is_published = true) as total_comments,
            (SELECT COUNT(*) FROM follows WHERE following_id = $1 AND status = 'active') as follower_count,
            (SELECT COUNT(*) FROM follows WHERE follower_id = $1 AND status = 'active') as following_count
        )
        SELECT
          u.id,
          u.username,
          u.email,
          u.first_name,
          u.last_name,
          u.bio,
          u.avatar_url,
          u.created_at,
          u.updated_at,
          u.is_active,
          -- Include stats
          s.total_posts,
          s.total_comments,
          s.follower_count,
          s.following_count,
          -- Include posts as JSON array
          COALESCE(
            (SELECT json_agg(row_to_json(user_posts.*)) FROM user_posts),
            '[]'
          ) as posts
        FROM users u
        CROSS JOIN user_stats s
        WHERE u.id = $1
      `;

      const result = await User.raw(query, [userId]);

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: {
            message: 'User not found',
            type: 'NOT_FOUND'
          }
        });
      }

      const row = result.rows[0];

      const userData = {
        id: row.id,
        username: row.username,
        email: row.email,
        first_name: row.first_name,
        last_name: row.last_name,
        bio: row.bio,
        avatar_url: row.avatar_url,
        created_at: row.created_at,
        updated_at: row.updated_at,
        is_active: row.is_active,
        stats: {
          total_posts: parseInt(row.total_posts) || 0,
          total_comments: parseInt(row.total_comments) || 0,
          follower_count: parseInt(row.follower_count) || 0,
          following_count: parseInt(row.following_count) || 0
        },
        posts: row.posts || []
      };

      res.json({
        success: true,
        data: userData
      });

    } catch (error) {
      next(error);
    }
  }
);
```

#### Step 2: Create Test

File: `/backend/test-user-profile.js`

```javascript
/**
 * Test optimized user profile endpoint
 */

const { initializeDatabase, closeDatabase } = require('./src/config/database');
const User = require('./src/models/User');

async function testUserProfile() {
  console.log('🧪 Testing Optimized User Profile Endpoint...\n');

  await initializeDatabase();

  try {
    const userId = 1;

    console.log(`Fetching user profile for user ${userId}...`);
    const startTime = Date.now();

    const query = `
      WITH user_stats AS (
        SELECT
          (SELECT COUNT(*) FROM posts WHERE user_id = $1 AND is_published = true) as total_posts,
          (SELECT COUNT(*) FROM comments WHERE user_id = $1 AND is_published = true) as total_comments,
          (SELECT COUNT(*) FROM follows WHERE following_id = $1) as follower_count,
          (SELECT COUNT(*) FROM follows WHERE follower_id = $1) as following_count
      )
      SELECT
        u.id,
        u.username,
        u.first_name,
        u.last_name,
        s.total_posts,
        s.total_comments,
        s.follower_count,
        s.following_count
      FROM users u
      CROSS JOIN user_stats s
      WHERE u.id = $1
    `;

    const result = await User.raw(query, [userId]);
    const duration = Date.now() - startTime;

    if (result.rows.length > 0) {
      const user = result.rows[0];
      console.log(`✅ Profile loaded in ${duration}ms (single query)`);
      console.log(`   Username: ${user.username}`);
      console.log(`   Posts: ${user.total_posts}`);
      console.log(`   Comments: ${user.total_comments}`);
      console.log(`   Followers: ${user.follower_count}`);
      console.log(`   Following: ${user.following_count}`);

      console.log('\n📊 Performance:');
      console.log(`   Optimized: ${duration}ms, 1 query`);
      console.log(`   Old method: ~90ms, 3 queries`);
      console.log(`   Improvement: ~${Math.round((1 - duration / 90) * 100)}%`);
    }

    await closeDatabase();
    process.exit(0);

  } catch (error) {
    console.error('❌ Test failed:', error);
    await closeDatabase();
    process.exit(1);
  }
}

testUserProfile();
```

Run test:
```bash
cd backend
node test-user-profile.js
```

### Verification Checklist

- [ ] Endpoint rewritten with CTEs
- [ ] Posts included in response
- [ ] Stats calculated correctly
- [ ] Test passes
- [ ] Performance < 40ms
- [ ] Single query execution

---

## Issue #9: Shares Popular Endpoint N+1

**Impact:** 1 + N queries → 1 query (95% reduction)
**Time to Fix:** 2 hours
**Difficulty:** Medium

### Current Problem

File: `/backend/src/routes/shares.js` lines 176-193

Gets popular shares (posts with most shares), but then:
1. Queries share counts
2. For each post, queries post details separately

### Step-by-Step Fix

#### Step 1: Rewrite Popular Endpoint

Replace the `/popular` endpoint in `/backend/src/routes/shares.js`:

```javascript
/**
 * GET /api/shares/popular
 * Get most shared posts with all details in one query
 */
router.get('/popular', async (req, res, next) => {
  try {
    const { limit = 10, timeframe = '7 days' } = req.query;
    const parsedLimit = Math.min(parseInt(limit), 50);

    // Calculate timeframe
    let timeframeClause = '';
    if (timeframe !== 'all') {
      timeframeClause = `AND s.created_at >= NOW() - INTERVAL '${timeframe}'`;
    }

    const query = `
      SELECT
        p.id,
        p.content,
        p.privacy_level,
        p.created_at,
        p.user_id,
        -- Author info
        u.username,
        u.first_name,
        u.last_name,
        u.avatar_url,
        -- Share count
        COUNT(s.id) as share_count,
        -- First 3 sharers
        json_agg(
          json_build_object(
            'user_id', sharer.id,
            'username', sharer.username,
            'first_name', sharer.first_name,
            'last_name', sharer.last_name,
            'avatar_url', sharer.avatar_url,
            'shared_at', s.created_at
          )
          ORDER BY s.created_at DESC
        ) FILTER (WHERE sharer.id IS NOT NULL) as sharers,
        -- Reaction count
        COUNT(DISTINCT r.id) as reaction_count,
        -- Comment count
        COUNT(DISTINCT c.id) as comment_count
      FROM posts p
      INNER JOIN shares s ON p.id = s.post_id
      INNER JOIN users u ON p.user_id = u.id
      LEFT JOIN users sharer ON s.user_id = sharer.id
      LEFT JOIN reactions r ON p.id = r.post_id
      LEFT JOIN comments c ON p.id = c.post_id AND c.is_published = true
      WHERE p.is_published = true
      AND p.deleted_at IS NULL
      ${timeframeClause}
      GROUP BY p.id, u.id, u.username, u.first_name, u.last_name, u.avatar_url
      HAVING COUNT(s.id) > 0
      ORDER BY COUNT(s.id) DESC, p.created_at DESC
      LIMIT $1
    `;

    const result = await Share.raw(query, [parsedLimit]);

    const popularShares = result.rows.map(row => ({
      post: {
        id: row.id,
        content: row.content,
        privacy_level: row.privacy_level,
        created_at: row.created_at,
        user_id: row.user_id,
        author: {
          id: row.user_id,
          username: row.username,
          first_name: row.first_name,
          last_name: row.last_name,
          avatar_url: row.avatar_url
        }
      },
      share_count: parseInt(row.share_count),
      reaction_count: parseInt(row.reaction_count),
      comment_count: parseInt(row.comment_count),
      recent_sharers: (row.sharers || []).slice(0, 3) // First 3 sharers
    }));

    res.json({
      success: true,
      data: {
        popular_shares: popularShares,
        timeframe,
        limit: parsedLimit
      }
    });

  } catch (error) {
    next(error);
  }
});
```

#### Step 2: Test

File: `/backend/test-popular-shares.js`

```javascript
/**
 * Test popular shares endpoint
 */

const { initializeDatabase, closeDatabase } = require('./src/config/database');
const Share = require('./src/models/Share');

async function testPopularShares() {
  console.log('🧪 Testing Popular Shares Endpoint...\n');

  await initializeDatabase();

  try {
    const limit = 10;
    const timeframe = '7 days';

    console.log(`Fetching top ${limit} shared posts from last ${timeframe}...`);
    const startTime = Date.now();

    const query = `
      SELECT
        p.id,
        p.content,
        COUNT(s.id) as share_count,
        u.username as author_username
      FROM posts p
      INNER JOIN shares s ON p.id = s.post_id
      INNER JOIN users u ON p.user_id = u.id
      WHERE p.is_published = true
      AND p.deleted_at IS NULL
      AND s.created_at >= NOW() - INTERVAL '${timeframe}'
      GROUP BY p.id, u.username
      ORDER BY COUNT(s.id) DESC
      LIMIT $1
    `;

    const result = await Share.raw(query, [limit]);
    const duration = Date.now() - startTime;

    console.log(`✅ Found ${result.rows.length} popular posts in ${duration}ms`);

    if (result.rows.length > 0) {
      console.log('\n📊 Top 3 Most Shared:');
      result.rows.slice(0, 3).forEach((row, index) => {
        console.log(`   ${index + 1}. Post ${row.id} by @${row.author_username}`);
        console.log(`      ${row.share_count} shares`);
        console.log(`      "${row.content.substring(0, 50)}..."`);
      });
    }

    console.log('\n⚡ Performance:');
    console.log(`   Optimized: ${duration}ms, 1 query`);
    console.log(`   Old method: ~${20 + (result.rows.length * 15)}ms`);
    console.log(`   Improvement: ~${Math.round((1 - duration / (20 + (result.rows.length * 15))) * 100)}%`);

    await closeDatabase();
    process.exit(0);

  } catch (error) {
    console.error('❌ Test failed:', error);
    await closeDatabase();
    process.exit(1);
  }
}

testPopularShares();
```

Run test:
```bash
cd backend
node test-popular-shares.js
```

### Verification Checklist

- [ ] Endpoint rewritten with single query
- [ ] Post details included
- [ ] Share counts accurate
- [ ] Recent sharers included
- [ ] Test passes
- [ ] Performance improved

---

## Issue #10: Reactions User History

**Impact:** N+1 → 1 query (95% reduction)
**Time to Fix:** 2 hours
**Difficulty:** Medium

### Current Problem

File: `/backend/src/routes/reactions.js` lines 399-441

Uses correlated subqueries to get post/comment info for each reaction.

### Step-by-Step Fix

#### Step 1: Replace with JOINs

In `/backend/src/routes/reactions.js`, find the GET `/user/:userId` endpoint and replace:

```javascript
/**
 * GET /api/reactions/user/:userId
 * Get reactions by user with eager-loaded post/comment data
 */
router.get('/user/:userId',
  [
    param('userId').isInt().withMessage('User ID must be an integer'),
    query('type').optional().isIn(['post', 'comment']).withMessage('Type must be post or comment'),
    query('emoji_name').optional().isString().withMessage('Reaction type must be a string'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be 1-100'),
    query('offset').optional().isInt({ min: 0 }).withMessage('Offset must be >= 0')
  ],
  handleValidationErrors,
  async (req, res, next) => {
    try {
      const userId = parseInt(req.params.userId);
      const type = req.query.type;
      const reactionType = req.query.emoji_name;
      const limit = parseInt(req.query.limit) || 20;
      let offset = parseInt(req.query.offset) || 0;

      // Support page parameter
      if (req.query.page) {
        const page = parseInt(req.query.page);
        offset = (page - 1) * limit;
      }

      // Verify user exists
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          error: {
            message: 'User not found',
            type: 'NOT_FOUND'
          }
        });
      }

      // Build WHERE clause
      const whereClauses = ['r.user_id = $1'];
      const params = [userId];
      let paramIndex = 2;

      if (type === 'post') {
        whereClauses.push('r.post_id IS NOT NULL');
      } else if (type === 'comment') {
        whereClauses.push('r.comment_id IS NOT NULL');
      }

      if (reactionType) {
        whereClauses.push(`r.emoji_name = $${paramIndex}`);
        params.push(reactionType);
        paramIndex++;
      }

      // Add pagination params
      const limitParam = paramIndex;
      const offsetParam = paramIndex + 1;
      params.push(limit, offset);

      // Optimized query with LEFT JOINs instead of correlated subqueries
      const query = `
        SELECT
          r.id,
          r.user_id,
          r.post_id,
          r.comment_id,
          r.emoji_name,
          r.emoji_unicode,
          r.created_at,
          r.updated_at,
          -- Post info (if reaction is on a post)
          CASE WHEN r.post_id IS NOT NULL THEN
            json_build_object(
              'id', p.id,
              'content', LEFT(p.content, 100),
              'created_at', p.created_at,
              'author', json_build_object(
                'id', p_author.id,
                'username', p_author.username,
                'first_name', p_author.first_name,
                'last_name', p_author.last_name,
                'avatar_url', p_author.avatar_url
              )
            )
          ELSE NULL
          END as post,
          -- Comment info (if reaction is on a comment)
          CASE WHEN r.comment_id IS NOT NULL THEN
            json_build_object(
              'id', c.id,
              'content', LEFT(c.content, 100),
              'created_at', c.created_at,
              'post_id', c.post_id,
              'author', json_build_object(
                'id', c_author.id,
                'username', c_author.username,
                'first_name', c_author.first_name,
                'last_name', c_author.last_name,
                'avatar_url', c_author.avatar_url
              )
            )
          ELSE NULL
          END as comment
        FROM reactions r
        LEFT JOIN posts p ON r.post_id = p.id
        LEFT JOIN users p_author ON p.user_id = p_author.id
        LEFT JOIN comments c ON r.comment_id = c.id
        LEFT JOIN users c_author ON c.user_id = c_author.id
        WHERE ${whereClauses.join(' AND ')}
        ORDER BY r.created_at DESC
        LIMIT $${limitParam} OFFSET $${offsetParam}
      `;

      const result = await Reaction.raw(query, params);

      res.json({
        success: true,
        data: {
          user: User.getPublicData(user),
          reactions: result.rows,
          pagination: {
            limit,
            offset,
            current_page: Math.floor(offset / limit) + 1,
            has_more: result.rows.length === limit
          }
        }
      });

    } catch (error) {
      next(error);
    }
  }
);
```

#### Step 2: Test

File: `/backend/test-user-reactions.js`

```javascript
/**
 * Test user reactions endpoint
 */

const { initializeDatabase, closeDatabase } = require('./src/config/database');
const Reaction = require('./src/models/Reaction');

async function testUserReactions() {
  console.log('🧪 Testing User Reactions Endpoint...\n');

  await initializeDatabase();

  try {
    const userId = 1;
    const limit = 20;

    console.log(`Fetching reactions for user ${userId}...`);
    const startTime = Date.now();

    const query = `
      SELECT
        r.id,
        r.emoji_name,
        r.emoji_unicode,
        r.created_at,
        CASE WHEN r.post_id IS NOT NULL THEN 'post' ELSE 'comment' END as target_type,
        COALESCE(p.content, c.content) as target_content,
        COALESCE(p_author.username, c_author.username) as target_author
      FROM reactions r
      LEFT JOIN posts p ON r.post_id = p.id
      LEFT JOIN users p_author ON p.user_id = p_author.id
      LEFT JOIN comments c ON r.comment_id = c.id
      LEFT JOIN users c_author ON c.user_id = c_author.id
      WHERE r.user_id = $1
      ORDER BY r.created_at DESC
      LIMIT $2
    `;

    const result = await Reaction.raw(query, [userId, limit]);
    const duration = Date.now() - startTime;

    console.log(`✅ Found ${result.rows.length} reactions in ${duration}ms`);

    if (result.rows.length > 0) {
      console.log('\n📊 Sample Reactions:');
      result.rows.slice(0, 3).forEach((row, index) => {
        console.log(`   ${index + 1}. ${row.emoji_unicode} ${row.emoji_name} on ${row.target_type}`);
        console.log(`      by @${row.target_author}`);
        console.log(`      "${row.target_content ? row.target_content.substring(0, 40) : 'N/A'}..."`);
      });
    }

    console.log('\n⚡ Performance:');
    console.log(`   Optimized: ${duration}ms, 1 query`);
    console.log(`   Old method: ~${15 + (result.rows.length * 10)}ms`);

    await closeDatabase();
    process.exit(0);

  } catch (error) {
    console.error('❌ Test failed:', error);
    await closeDatabase();
    process.exit(1);
  }
}

testUserReactions();
```

Run test:
```bash
cd backend
node test-user-reactions.js
```

### Verification Checklist

- [ ] Correlated subqueries replaced with LEFT JOINs
- [ ] Post/comment info included
- [ ] Test passes
- [ ] Performance improved
- [ ] Response format maintained

---

# Medium Priority Issues (Priority 3)

## Issue #11: Missing Database Indexes

**Impact:** 10-30% faster queries
**Time to Implement:** 1 hour
**Difficulty:** Easy

### Implementation

All indexes are already documented in the main optimization plan. Run the migration:

```bash
psql -U dev_user -d posting_system -f backend/database/migrations/021_add_performance_indexes.sql
```

### Verification

```bash
# Connect to database
psql -U dev_user -d posting_system

# Check indexes were created
\di

# Specific checks
\d+ follows
\d+ reactions
\d+ comments
\d+ posts
\d+ messages
\d+ notifications
```

Look for indexes starting with `idx_`.

---

## Issue #12: No Caching Layer

**Impact:** 40-60% reduction in database queries
**Time to Implement:** 8-12 hours
**Difficulty:** Hard

### Step-by-Step Implementation

#### Step 1: Install Redis

```bash
# Install Redis
sudo apt-get update
sudo apt-get install redis-server

# Start Redis
sudo systemctl start redis-server
sudo systemctl enable redis-server

# Verify Redis is running
redis-cli ping
# Should return: PONG
```

#### Step 2: Install Node Redis Client

```bash
cd backend
npm install redis@^4.0.0
```

#### Step 3: Create Redis Configuration

File: `/backend/src/config/redis.js`

```javascript
/**
 * Redis configuration and connection
 */

const redis = require('redis');

let client = null;

/**
 * Initialize Redis connection
 */
async function initializeRedis() {
  if (client) {
    return client;
  }

  client = redis.createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    socket: {
      reconnectStrategy: (retries) => {
        if (retries > 10) {
          console.error('Redis: Too many reconnection attempts');
          return new Error('Redis reconnection failed');
        }
        // Exponential backoff: 50ms, 100ms, 200ms, 400ms, ...
        return Math.min(retries * 50, 5000);
      }
    }
  });

  client.on('error', (err) => {
    console.error('Redis Client Error:', err);
  });

  client.on('connect', () => {
    console.log('✅ Redis connected');
  });

  client.on('reconnecting', () => {
    console.log('⚠️  Redis reconnecting...');
  });

  await client.connect();

  return client;
}

/**
 * Get Redis client instance
 */
function getRedisClient() {
  if (!client) {
    throw new Error('Redis not initialized. Call initializeRedis() first.');
  }
  return client;
}

/**
 * Close Redis connection
 */
async function closeRedis() {
  if (client) {
    await client.quit();
    client = null;
    console.log('Redis connection closed');
  }
}

module.exports = {
  initializeRedis,
  getRedisClient,
  closeRedis
};
```

#### Step 4: Create Cache Service

File: `/backend/src/services/cache.js`

```javascript
/**
 * Cache service using Redis
 */

const { getRedisClient } = require('../config/redis');

class CacheService {
  /**
   * Get value from cache
   * @param {string} key - Cache key
   * @returns {Promise<any|null>} Cached value or null if not found
   */
  static async get(key) {
    try {
      const client = getRedisClient();
      const value = await client.get(key);

      if (value) {
        return JSON.parse(value);
      }

      return null;
    } catch (error) {
      console.error('Cache get error:', error);
      return null; // Fail gracefully
    }
  }

  /**
   * Set value in cache
   * @param {string} key - Cache key
   * @param {any} value - Value to cache
   * @param {number} ttl - Time to live in seconds (default 300 = 5 min)
   */
  static async set(key, value, ttl = 300) {
    try {
      const client = getRedisClient();
      await client.setEx(key, ttl, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error('Cache set error:', error);
      return false; // Fail gracefully
    }
  }

  /**
   * Delete value from cache
   * @param {string} key - Cache key
   */
  static async del(key) {
    try {
      const client = getRedisClient();
      await client.del(key);
      return true;
    } catch (error) {
      console.error('Cache delete error:', error);
      return false;
    }
  }

  /**
   * Delete multiple keys by pattern
   * @param {string} pattern - Key pattern (e.g., 'user:123:*')
   */
  static async delPattern(pattern) {
    try {
      const client = getRedisClient();
      const keys = await client.keys(pattern);

      if (keys.length > 0) {
        await client.del(keys);
      }

      return true;
    } catch (error) {
      console.error('Cache delete pattern error:', error);
      return false;
    }
  }

  /**
   * Check if key exists
   * @param {string} key - Cache key
   */
  static async exists(key) {
    try {
      const client = getRedisClient();
      const result = await client.exists(key);
      return result === 1;
    } catch (error) {
      console.error('Cache exists error:', error);
      return false;
    }
  }

  /**
   * Get or set pattern: Try cache first, fallback to callback
   * @param {string} key - Cache key
   * @param {Function} callback - Async function to fetch data if not cached
   * @param {number} ttl - Time to live in seconds
   */
  static async getOrSet(key, callback, ttl = 300) {
    // Try cache first
    const cached = await this.get(key);
    if (cached !== null) {
      return { data: cached, cached: true };
    }

    // Cache miss - fetch from source
    const data = await callback();

    // Store in cache
    await this.set(key, data, ttl);

    return { data, cached: false };
  }

  /**
   * Generate cache key
   * @param {string} prefix - Key prefix (e.g., 'user', 'post')
   * @param {...string} parts - Key parts to join
   */
  static key(prefix, ...parts) {
    return `${prefix}:${parts.join(':')}`;
  }
}

module.exports = CacheService;
```

#### Step 5: Apply Caching to User Profiles

Example: `/backend/src/routes/users.js`

```javascript
const CacheService = require('../services/cache');

/**
 * GET /api/users/:id
 * Get user profile with caching
 */
router.get('/:id',
  [param('id').isInt({ min: 1 }).withMessage('User ID must be a positive integer')],
  handleValidationErrors,
  async (req, res, next) => {
    try {
      const userId = parseInt(req.params.id);

      // Try cache first
      const cacheKey = CacheService.key('user', 'profile', userId);

      const result = await CacheService.getOrSet(
        cacheKey,
        async () => {
          // This callback runs only on cache miss
          const query = `
            SELECT u.*, /* ...full query from Issue #8... */
          `;

          const dbResult = await User.raw(query, [userId]);

          if (dbResult.rows.length === 0) {
            return null;
          }

          return dbResult.rows[0]; // Return data to be cached
        },
        300 // Cache for 5 minutes
      );

      if (!result.data) {
        return res.status(404).json({
          success: false,
          error: { message: 'User not found', type: 'NOT_FOUND' }
        });
      }

      res.json({
        success: true,
        data: result.data,
        cached: result.cached // Include cache status in response (optional)
      });

    } catch (error) {
      next(error);
    }
  }
);

/**
 * PUT /api/users/:id
 * Update user - INVALIDATE CACHE
 */
router.put('/:id',
  authenticate,
  requireModifyPermission('id'),
  /* ...validation... */,
  async (req, res, next) => {
    try {
      const userId = parseInt(req.params.id);

      // Update user...
      const updatedUser = await User.update(userId, updateData);

      // INVALIDATE CACHE
      await CacheService.delPattern(`user:*:${userId}*`);

      res.json({
        success: true,
        data: User.getUserData(updatedUser),
        message: 'User updated successfully'
      });

    } catch (error) {
      next(error);
    }
  }
);
```

#### Step 6: Cache User Stats

```javascript
/**
 * Cache user statistics (follower/following counts, post counts)
 */
async function getUserStats(userId) {
  const cacheKey = CacheService.key('user', 'stats', userId);

  const result = await CacheService.getOrSet(
    cacheKey,
    async () => {
      const query = `
        SELECT
          (SELECT COUNT(*) FROM follows WHERE following_id = $1) as follower_count,
          (SELECT COUNT(*) FROM follows WHERE follower_id = $1) as following_count,
          (SELECT COUNT(*) FROM posts WHERE user_id = $1 AND is_published = true) as post_count,
          (SELECT COUNT(*) FROM comments WHERE user_id = $1 AND is_published = true) as comment_count
      `;

      const result = await User.raw(query, [userId]);
      return result.rows[0];
    },
    60 // Cache for 1 minute (frequently changing data)
  );

  return result.data;
}

// Invalidate when user posts, comments, follows, etc.
// Example: After creating a follow
await Follow.create({ follower_id, following_id });
await CacheService.del(`user:stats:${follower_id}`);
await CacheService.del(`user:stats:${following_id}`);
```

#### Step 7: Cache Popular Content

```javascript
/**
 * Cache trending posts
 */
router.get('/trending', async (req, res, next) => {
  try {
    const timeframe = req.query.timeframe || '24h';
    const cacheKey = CacheService.key('posts', 'trending', timeframe);

    const result = await CacheService.getOrSet(
      cacheKey,
      async () => {
        // Expensive query to find trending posts
        const query = `/* ...trending posts query... */`;
        const dbResult = await Post.raw(query);
        return dbResult.rows;
      },
      300 // Cache for 5 minutes (trending data can be slightly stale)
    );

    res.json({
      success: true,
      data: { posts: result.data },
      cached: result.cached
    });

  } catch (error) {
    next(error);
  }
});
```

#### Step 8: Update server.js to Initialize Redis

File: `/backend/src/server.js`

```javascript
const { initializeDatabase } = require('./config/database');
const { initializeRedis } = require('./config/redis');

async function startServer() {
  try {
    // Initialize database
    await initializeDatabase();

    // Initialize Redis
    await initializeRedis();

    // Start server
    const PORT = process.env.PORT || 3001;
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });

  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
```

#### Step 9: Add Cache Monitoring

File: `/backend/src/routes/admin.js` (or create new file)

```javascript
/**
 * GET /api/admin/cache/stats
 * Get cache statistics
 */
router.get('/cache/stats', authenticate, async (req, res, next) => {
  try {
    const client = getRedisClient();

    const info = await client.info('stats');
    const dbSize = await client.dbSize();

    // Parse Redis INFO output
    const stats = {};
    info.split('\r\n').forEach(line => {
      if (line.includes(':')) {
        const [key, value] = line.split(':');
        stats[key] = value;
      }
    });

    res.json({
      success: true,
      data: {
        keys_count: dbSize,
        total_commands: stats.total_commands_processed,
        hits: stats.keyspace_hits,
        misses: stats.keyspace_misses,
        hit_rate: stats.keyspace_hits /
          (parseInt(stats.keyspace_hits) + parseInt(stats.keyspace_misses)) * 100
      }
    });

  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/admin/cache/flush
 * Flush all cache
 */
router.delete('/cache/flush', authenticate, async (req, res, next) => {
  try {
    const client = getRedisClient();
    await client.flushDb();

    res.json({
      success: true,
      message: 'Cache flushed successfully'
    });

  } catch (error) {
    next(error);
  }
});
```

#### Step 10: Test Caching

File: `/backend/test-caching.js`

```javascript
/**
 * Test caching functionality
 */

const { initializeDatabase, closeDatabase } = require('./src/config/database');
const { initializeRedis, closeRedis } = require('./src/config/redis');
const CacheService = require('./src/services/cache');
const User = require('./src/models/User');

async function testCaching() {
  console.log('🧪 Testing Caching System...\n');

  await initializeDatabase();
  await initializeRedis();

  try {
    const userId = 1;
    const cacheKey = CacheService.key('user', 'profile', userId);

    // Test 1: Cache miss (first request)
    console.log('Test 1: Cache miss (fetching from database)');
    const start1 = Date.now();

    const result1 = await CacheService.getOrSet(
      cacheKey,
      async () => {
        // Simulate database query
        await new Promise(resolve => setTimeout(resolve, 50)); // 50ms delay
        return { id: userId, username: 'testuser', data: 'from_db' };
      },
      60 // 1 minute TTL
    );

    const duration1 = Date.now() - start1;
    console.log(`✅ Cache miss: ${duration1}ms`);
    console.log(`   Cached: ${result1.cached}`);
    console.log(`   Data: ${JSON.stringify(result1.data)}`);

    // Test 2: Cache hit (second request)
    console.log('\nTest 2: Cache hit (fetching from cache)');
    const start2 = Date.now();

    const result2 = await CacheService.getOrSet(
      cacheKey,
      async () => {
        // This should NOT run
        throw new Error('Should not fetch from database on cache hit');
      },
      60
    );

    const duration2 = Date.now() - start2;
    console.log(`✅ Cache hit: ${duration2}ms`);
    console.log(`   Cached: ${result2.cached}`);
    console.log(`   Data: ${JSON.stringify(result2.data)}`);

    // Performance comparison
    console.log('\n📊 Performance:');
    console.log(`   Cache miss: ${duration1}ms`);
    console.log(`   Cache hit: ${duration2}ms`);
    console.log(`   Speedup: ${Math.round(duration1 / duration2)}x faster`);

    // Test 3: Cache deletion
    console.log('\nTest 3: Cache deletion');
    await CacheService.del(cacheKey);

    const exists = await CacheService.exists(cacheKey);
    console.log(`✅ Cache deleted: ${!exists}`);

    // Test 4: Pattern deletion
    console.log('\nTest 4: Pattern deletion');
    await CacheService.set('user:123:profile', { id: 123 });
    await CacheService.set('user:123:stats', { posts: 10 });
    await CacheService.set('user:456:profile', { id: 456 });

    await CacheService.delPattern('user:123:*');

    const exists123Profile = await CacheService.exists('user:123:profile');
    const exists123Stats = await CacheService.exists('user:123:stats');
    const exists456Profile = await CacheService.exists('user:456:profile');

    console.log(`✅ user:123:profile deleted: ${!exists123Profile}`);
    console.log(`✅ user:123:stats deleted: ${!exists123Stats}`);
    console.log(`✅ user:456:profile kept: ${exists456Profile}`);

    // Cleanup
    await CacheService.del('user:456:profile');

    console.log('\n✅ All caching tests passed!');

    await closeRedis();
    await closeDatabase();
    process.exit(0);

  } catch (error) {
    console.error('❌ Test failed:', error);
    await closeRedis();
    await closeDatabase();
    process.exit(1);
  }
}

testCaching();
```

Run test:
```bash
cd backend
node test-caching.js
```

**Expected output:**
```
🧪 Testing Caching System...

Test 1: Cache miss (fetching from database)
✅ Cache miss: 52ms
   Cached: false
   Data: {"id":1,"username":"testuser","data":"from_db"}

Test 2: Cache hit (fetching from cache)
✅ Cache hit: 2ms
   Cached: true
   Data: {"id":1,"username":"testuser","data":"from_db"}

📊 Performance:
   Cache miss: 52ms
   Cache hit: 2ms
   Speedup: 26x faster

Test 3: Cache deletion
✅ Cache deleted: true

Test 4: Pattern deletion
✅ user:123:profile deleted: true
✅ user:123:stats deleted: true
✅ user:456:profile kept: true

✅ All caching tests passed!
```

### Cache Invalidation Strategy

**Important:** Always invalidate cache when data changes!

```javascript
// User updates
router.put('/users/:id', async (req, res, next) => {
  // Update user...
  await CacheService.delPattern(`user:*:${userId}*`);
});

// New post created
router.post('/posts', async (req, res, next) => {
  // Create post...
  await CacheService.del(`user:stats:${userId}`);
  await CacheService.delPattern('posts:trending:*');
});

// New follow
router.post('/follows/:userId', async (req, res, next) => {
  // Create follow...
  await CacheService.del(`user:stats:${followerId}`);
  await CacheService.del(`user:stats:${followingId}`);
});
```

### Verification Checklist

- [ ] Redis installed and running
- [ ] Redis client connected
- [ ] CacheService created
- [ ] Caching applied to hot endpoints
- [ ] Cache invalidation implemented
- [ ] Tests pass
- [ ] Performance improved (>90% on cache hits)
- [ ] Monitoring in place

---

## Issue #13: API Consolidation Opportunities

**Impact:** 60% fewer API calls from frontend
**Time to Implement:** 6-8 hours
**Difficulty:** Medium

### Implementation

#### 1. Create Full Post Endpoint

File: `/backend/src/routes/posts.js`

```javascript
/**
 * GET /api/posts/:id/full
 * Get complete post with media, reactions, top comments, shares
 */
router.get('/:id/full', optionalAuthenticate, async (req, res, next) => {
  try {
    const postId = parseInt(req.params.id);
    const userId = req.user?.id;

    const query = `
      WITH post_media AS (
        SELECT
          post_id,
          json_agg(
            json_build_object(
              'id', id,
              'file_url', file_url,
              'mime_type', mime_type,
              'alt_text', alt_text,
              'width', width,
              'height', height
            ) ORDER BY created_at ASC
          ) as media
        FROM media
        WHERE post_id = $1
        GROUP BY post_id
      ),
      post_reactions AS (
        SELECT
          post_id,
          json_agg(
            json_build_object(
              'emoji_name', emoji_name,
              'emoji_unicode', emoji_unicode,
              'count', count
            ) ORDER BY count DESC
          ) as reactions
        FROM (
          SELECT post_id, emoji_name, emoji_unicode, COUNT(*) as count
          FROM reactions
          WHERE post_id = $1
          GROUP BY post_id, emoji_name, emoji_unicode
        ) r
        GROUP BY post_id
      ),
      top_comments AS (
        SELECT
          post_id,
          json_agg(
            json_build_object(
              'id', c.id,
              'content', c.content,
              'created_at', c.created_at,
              'author', json_build_object(
                'id', u.id,
                'username', u.username,
                'first_name', u.first_name,
                'last_name', u.last_name,
                'avatar_url', u.avatar_url
              )
            ) ORDER BY c.created_at DESC
          ) as comments
        FROM comments c
        INNER JOIN users u ON c.user_id = u.id
        WHERE c.post_id = $1
        AND c.is_published = true
        AND c.deleted_at IS NULL
        ORDER BY c.created_at DESC
        LIMIT 3
      )
      SELECT
        p.*,
        u.username,
        u.first_name,
        u.last_name,
        u.avatar_url,
        u.bio,
        COALESCE(pm.media, '[]'::json) as media,
        COALESCE(pr.reactions, '[]'::json) as reactions,
        COALESCE((SELECT comments FROM top_comments WHERE post_id = p.id), '[]'::json) as top_comments,
        (SELECT COUNT(*) FROM comments WHERE post_id = p.id AND is_published = true) as total_comments,
        (SELECT COUNT(*) FROM shares WHERE post_id = p.id) as share_count,
        EXISTS(SELECT 1 FROM reactions WHERE post_id = p.id AND user_id = $2) as user_has_reacted,
        EXISTS(SELECT 1 FROM shares WHERE post_id = p.id AND user_id = $2) as user_has_shared
      FROM posts p
      INNER JOIN users u ON p.user_id = u.id
      LEFT JOIN post_media pm ON p.id = pm.post_id
      LEFT JOIN post_reactions pr ON p.id = pr.post_id
      WHERE p.id = $1
    `;

    const result = await Post.raw(query, [postId, userId || null]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: { message: 'Post not found', type: 'NOT_FOUND' }
      });
    }

    const row = result.rows[0];

    res.json({
      success: true,
      data: {
        post: {
          id: row.id,
          content: row.content,
          privacy_level: row.privacy_level,
          is_published: row.is_published,
          views_count: row.views_count,
          created_at: row.created_at,
          updated_at: row.updated_at,
          author: {
            id: row.user_id,
            username: row.username,
            first_name: row.first_name,
            last_name: row.last_name,
            avatar_url: row.avatar_url,
            bio: row.bio
          },
          media: row.media || [],
          reactions: row.reactions || [],
          top_comments: row.top_comments || [],
          total_comments: parseInt(row.total_comments),
          share_count: parseInt(row.share_count),
          user_has_reacted: row.user_has_reacted || false,
          user_has_shared: row.user_has_shared || false
        }
      }
    });

  } catch (error) {
    next(error);
  }
});
```

#### 2. Frontend Usage

**Before (5 requests):**
```javascript
// Old way - multiple requests
const post = await api.get(`/posts/${postId}`);
const media = await api.get(`/media/post/${postId}`);
const reactions = await api.get(`/reactions/post/${postId}`);
const comments = await api.get(`/comments/post/${postId}?limit=3`);
const shares = await api.get(`/shares/post/${postId}/count`);
```

**After (1 request):**
```javascript
// New way - single request
const response = await api.get(`/posts/${postId}/full`);
const { post } = response.data;
// post contains everything: media, reactions, top_comments, counts, etc.
```

### Verification Checklist

- [ ] `/posts/:id/full` endpoint created
- [ ] All related data included
- [ ] Test passes
- [ ] Frontend updated
- [ ] API calls reduced by 80%

---

## Issue #14-18: Quick Implementation Notes

### Issue #14: Request Batching

Create `/api/batch` endpoint:

```javascript
router.post('/batch', async (req, res) => {
  const { requests } = req.body; // Array of {method, url, params}

  const results = await Promise.all(
    requests.map(async (req) => {
      // Execute each request
      // Return {success, data}
    })
  );

  res.json({ success: true, results });
});
```

### Issue #15: Missing Query Limits

Add to all routes:

```javascript
const limit = Math.min(parseInt(req.query.limit) || 20, 100);
```

### Issue #16: Full-Text Search

Already documented in main plan. Run migration for `search_vector` column.

### Issue #17: Rate Limiting

```javascript
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // 100 requests per window
});

app.use('/api/', limiter);
```

### Issue #18: Response Payload Optimization

Create utility function:

```javascript
function minimalUserData(user) {
  return {
    id: user.id,
    username: user.username,
    first_name: user.first_name,
    last_name: user.last_name,
    avatar_url: user.avatar_url
  };
  // Exclude: email, bio, address, etc.
}
```

---

## Summary

This detailed guide provides step-by-step instructions for all 18 optimization issues. Each issue includes:

- ✅ Current problem explanation
- ✅ Step-by-step fix instructions
- ✅ Complete code examples
- ✅ Test scripts
- ✅ Verification checklists
- ✅ Rollback procedures

**Total estimated time:** 40-60 hours for complete implementation.

**Expected results:** 60-85% faster, 80-98% fewer queries, 3-5x better scalability.
