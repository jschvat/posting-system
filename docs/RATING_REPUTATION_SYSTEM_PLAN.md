# Rating & Reputation System - Implementation Plan

## Overview
A comprehensive user rating and reputation system that allows users to rate each other based on interactions, with a reputation score that reflects trustworthiness, quality contributions, and community standing.

## Database Schema Design

### 1. User Ratings Table
Stores individual ratings between users with context about what was rated.

```sql
CREATE TABLE user_ratings (
    id SERIAL PRIMARY KEY,
    rater_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    rated_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    rating_type VARCHAR(50) NOT NULL, -- 'profile', 'post', 'comment', 'interaction'
    rating_value INTEGER NOT NULL CHECK (rating_value >= 1 AND rating_value <= 5),
    context_type VARCHAR(50), -- 'post', 'comment', 'message', 'general'
    context_id INTEGER, -- ID of post/comment if applicable
    review_text TEXT,
    is_anonymous BOOLEAN DEFAULT FALSE,
    is_verified BOOLEAN DEFAULT FALSE, -- Verified interaction (e.g., completed transaction)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Constraints
    CONSTRAINT unique_rating UNIQUE (rater_id, rated_user_id, context_type, context_id),
    CONSTRAINT no_self_rating CHECK (rater_id != rated_user_id)
);

-- Indexes
CREATE INDEX idx_user_ratings_rater ON user_ratings(rater_id);
CREATE INDEX idx_user_ratings_rated_user ON user_ratings(rated_user_id);
CREATE INDEX idx_user_ratings_type ON user_ratings(rating_type);
CREATE INDEX idx_user_ratings_created ON user_ratings(created_at DESC);
CREATE INDEX idx_user_ratings_context ON user_ratings(context_type, context_id);
```

**Fields Explanation:**
- `rater_id`: User giving the rating
- `rated_user_id`: User receiving the rating
- `rating_type`: Category of rating (profile, post, comment, interaction)
- `rating_value`: 1-5 star rating
- `context_type`: What was being rated (post, comment, message, general)
- `context_id`: Reference to the specific item rated
- `review_text`: Optional written review/feedback
- `is_anonymous`: Whether rating is shown publicly or anonymously
- `is_verified`: Whether the rating is from a verified interaction

### 2. User Reputation Table
Aggregated reputation metrics for each user.

```sql
CREATE TABLE user_reputation (
    user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,

    -- Rating metrics
    total_ratings_received INTEGER DEFAULT 0,
    average_rating DECIMAL(3,2) DEFAULT 0.00, -- Average 1-5 rating
    rating_distribution JSONB DEFAULT '{"1":0,"2":0,"3":0,"4":0,"5":0}'::jsonb,

    -- Reputation score (0-1000)
    reputation_score INTEGER DEFAULT 0,
    reputation_level VARCHAR(20) DEFAULT 'newcomer', -- newcomer, member, contributor, veteran, expert, legend

    -- Breakdown by category
    post_rating_avg DECIMAL(3,2) DEFAULT 0.00,
    comment_rating_avg DECIMAL(3,2) DEFAULT 0.00,
    interaction_rating_avg DECIMAL(3,2) DEFAULT 0.00,

    -- Trust metrics
    verified_ratings_count INTEGER DEFAULT 0,
    positive_ratings_count INTEGER DEFAULT 0, -- 4-5 stars
    neutral_ratings_count INTEGER DEFAULT 0, -- 3 stars
    negative_ratings_count INTEGER DEFAULT 0, -- 1-2 stars

    -- Activity metrics (for reputation calculation)
    helpful_count INTEGER DEFAULT 0, -- Times marked as helpful
    reported_count INTEGER DEFAULT 0, -- Times reported
    quality_posts_count INTEGER DEFAULT 0, -- Highly rated posts
    quality_comments_count INTEGER DEFAULT 0, -- Highly rated comments

    -- Badges and achievements
    badges JSONB DEFAULT '[]'::jsonb,
    achievements JSONB DEFAULT '[]'::jsonb,

    -- Timeline
    first_rating_at TIMESTAMP,
    last_rating_at TIMESTAMP,
    reputation_peak INTEGER DEFAULT 0,
    reputation_peak_at TIMESTAMP,

    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_user_reputation_score ON user_reputation(reputation_score DESC);
CREATE INDEX idx_user_reputation_level ON user_reputation(reputation_level);
CREATE INDEX idx_user_reputation_avg_rating ON user_reputation(average_rating DESC);
```

**Reputation Score Calculation (0-1000):**
- Base: Average rating × 100 (max 500 points)
- Volume bonus: MIN(total_ratings × 2, 100 points)
- Quality posts: quality_posts_count × 5 (max 150 points)
- Quality comments: quality_comments_count × 3 (max 100 points)
- Helpful bonus: helpful_count × 2 (max 100 points)
- Verified bonus: verified_ratings_count × 3 (max 50 points)
- Penalties: reported_count × -10

**Reputation Levels:**
- Newcomer: 0-99
- Member: 100-299
- Contributor: 300-499
- Veteran: 500-699
- Expert: 700-849
- Legend: 850-1000

### 3. Rating Reports Table
For handling disputes and inappropriate ratings.

```sql
CREATE TABLE rating_reports (
    id SERIAL PRIMARY KEY,
    rating_id INTEGER NOT NULL REFERENCES user_ratings(id) ON DELETE CASCADE,
    reporter_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    report_reason VARCHAR(50) NOT NULL, -- 'spam', 'inappropriate', 'fake', 'harassment'
    report_details TEXT,
    status VARCHAR(20) DEFAULT 'pending', -- pending, reviewed, resolved, dismissed
    reviewed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMP,
    resolution_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_rating_reports_rating ON rating_reports(rating_id);
CREATE INDEX idx_rating_reports_reporter ON rating_reports(reporter_id);
CREATE INDEX idx_rating_reports_status ON rating_reports(status);
```

### 4. Helpful Marks Table
Track when users mark content as helpful.

```sql
CREATE TABLE helpful_marks (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    target_type VARCHAR(20) NOT NULL, -- 'post', 'comment', 'user'
    target_id INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT unique_helpful_mark UNIQUE (user_id, target_type, target_id)
);

CREATE INDEX idx_helpful_marks_target ON helpful_marks(target_type, target_id);
CREATE INDEX idx_helpful_marks_user ON helpful_marks(user_id);
```

## Triggers and Functions

### 1. Auto-update Reputation on Rating Changes

```sql
CREATE OR REPLACE FUNCTION update_user_reputation()
RETURNS TRIGGER AS $$
DECLARE
    target_user_id INTEGER;
    avg_rating DECIMAL(3,2);
    total_count INTEGER;
    pos_count INTEGER;
    neu_count INTEGER;
    neg_count INTEGER;
    verified_count INTEGER;
    dist JSONB;
BEGIN
    -- Determine which user's reputation to update
    IF (TG_OP = 'DELETE') THEN
        target_user_id := OLD.rated_user_id;
    ELSE
        target_user_id := NEW.rated_user_id;
    END IF;

    -- Calculate aggregated metrics
    SELECT
        COALESCE(AVG(rating_value), 0),
        COUNT(*),
        COUNT(*) FILTER (WHERE rating_value >= 4),
        COUNT(*) FILTER (WHERE rating_value = 3),
        COUNT(*) FILTER (WHERE rating_value <= 2),
        COUNT(*) FILTER (WHERE is_verified = true),
        jsonb_build_object(
            '1', COUNT(*) FILTER (WHERE rating_value = 1),
            '2', COUNT(*) FILTER (WHERE rating_value = 2),
            '3', COUNT(*) FILTER (WHERE rating_value = 3),
            '4', COUNT(*) FILTER (WHERE rating_value = 4),
            '5', COUNT(*) FILTER (WHERE rating_value = 5)
        )
    INTO avg_rating, total_count, pos_count, neu_count, neg_count, verified_count, dist
    FROM user_ratings
    WHERE rated_user_id = target_user_id;

    -- Calculate category averages
    DECLARE
        post_avg DECIMAL(3,2);
        comment_avg DECIMAL(3,2);
        interaction_avg DECIMAL(3,2);
    BEGIN
        SELECT COALESCE(AVG(rating_value), 0) INTO post_avg
        FROM user_ratings WHERE rated_user_id = target_user_id AND rating_type = 'post';

        SELECT COALESCE(AVG(rating_value), 0) INTO comment_avg
        FROM user_ratings WHERE rated_user_id = target_user_id AND rating_type = 'comment';

        SELECT COALESCE(AVG(rating_value), 0) INTO interaction_avg
        FROM user_ratings WHERE rated_user_id = target_user_id AND rating_type = 'interaction';

        -- Upsert reputation record
        INSERT INTO user_reputation (
            user_id,
            total_ratings_received,
            average_rating,
            rating_distribution,
            positive_ratings_count,
            neutral_ratings_count,
            negative_ratings_count,
            verified_ratings_count,
            post_rating_avg,
            comment_rating_avg,
            interaction_rating_avg,
            last_rating_at
        ) VALUES (
            target_user_id,
            total_count,
            avg_rating,
            dist,
            pos_count,
            neu_count,
            neg_count,
            verified_count,
            post_avg,
            comment_avg,
            interaction_avg,
            CURRENT_TIMESTAMP
        )
        ON CONFLICT (user_id) DO UPDATE SET
            total_ratings_received = total_count,
            average_rating = avg_rating,
            rating_distribution = dist,
            positive_ratings_count = pos_count,
            neutral_ratings_count = neu_count,
            negative_ratings_count = neg_count,
            verified_ratings_count = verified_count,
            post_rating_avg = post_avg,
            comment_rating_avg = comment_avg,
            interaction_rating_avg = interaction_avg,
            last_rating_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP;
    END;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_user_reputation ON user_ratings;
CREATE TRIGGER trigger_update_user_reputation
AFTER INSERT OR UPDATE OR DELETE ON user_ratings
FOR EACH ROW EXECUTE FUNCTION update_user_reputation();
```

### 2. Calculate Reputation Score

```sql
CREATE OR REPLACE FUNCTION calculate_reputation_score(p_user_id INTEGER)
RETURNS INTEGER AS $$
DECLARE
    v_score INTEGER := 0;
    v_avg_rating DECIMAL(3,2);
    v_total_ratings INTEGER;
    v_quality_posts INTEGER;
    v_quality_comments INTEGER;
    v_helpful INTEGER;
    v_verified INTEGER;
    v_reported INTEGER;
    v_level VARCHAR(20);
BEGIN
    -- Get reputation data
    SELECT
        average_rating,
        total_ratings_received,
        verified_ratings_count,
        helpful_count,
        reported_count,
        quality_posts_count,
        quality_comments_count
    INTO
        v_avg_rating,
        v_total_ratings,
        v_verified,
        v_helpful,
        v_reported,
        v_quality_posts,
        v_quality_comments
    FROM user_reputation
    WHERE user_id = p_user_id;

    -- Base score from average rating (max 500)
    v_score := v_score + (v_avg_rating * 100)::INTEGER;

    -- Volume bonus (max 100)
    v_score := v_score + LEAST(v_total_ratings * 2, 100);

    -- Quality content bonus (max 250)
    v_score := v_score + LEAST(v_quality_posts * 5, 150);
    v_score := v_score + LEAST(v_quality_comments * 3, 100);

    -- Helpful bonus (max 100)
    v_score := v_score + LEAST(v_helpful * 2, 100);

    -- Verified bonus (max 50)
    v_score := v_score + LEAST(v_verified * 3, 50);

    -- Penalties
    v_score := v_score - (v_reported * 10);

    -- Clamp to 0-1000
    v_score := GREATEST(0, LEAST(1000, v_score));

    -- Determine level
    IF v_score >= 850 THEN v_level := 'legend';
    ELSIF v_score >= 700 THEN v_level := 'expert';
    ELSIF v_score >= 500 THEN v_level := 'veteran';
    ELSIF v_score >= 300 THEN v_level := 'contributor';
    ELSIF v_score >= 100 THEN v_level := 'member';
    ELSE v_level := 'newcomer';
    END IF;

    -- Update reputation
    UPDATE user_reputation
    SET
        reputation_score = v_score,
        reputation_level = v_level,
        reputation_peak = GREATEST(reputation_peak, v_score),
        reputation_peak_at = CASE
            WHEN v_score > reputation_peak THEN CURRENT_TIMESTAMP
            ELSE reputation_peak_at
        END,
        updated_at = CURRENT_TIMESTAMP
    WHERE user_id = p_user_id;

    RETURN v_score;
END;
$$ LANGUAGE plpgsql;
```

### 3. Update Helpful Count

```sql
CREATE OR REPLACE FUNCTION update_helpful_count()
RETURNS TRIGGER AS $$
DECLARE
    target_user_id INTEGER;
BEGIN
    -- Get the user who created the content
    IF NEW.target_type = 'post' THEN
        SELECT user_id INTO target_user_id FROM posts WHERE id = NEW.target_id;
    ELSIF NEW.target_type = 'comment' THEN
        SELECT user_id INTO target_user_id FROM comments WHERE id = NEW.target_id;
    ELSIF NEW.target_type = 'user' THEN
        target_user_id := NEW.target_id;
    END IF;

    -- Increment helpful count
    INSERT INTO user_reputation (user_id, helpful_count)
    VALUES (target_user_id, 1)
    ON CONFLICT (user_id) DO UPDATE
    SET helpful_count = user_reputation.helpful_count + 1,
        updated_at = CURRENT_TIMESTAMP;

    -- Recalculate reputation score
    PERFORM calculate_reputation_score(target_user_id);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_helpful_count ON helpful_marks;
CREATE TRIGGER trigger_update_helpful_count
AFTER INSERT ON helpful_marks
FOR EACH ROW EXECUTE FUNCTION update_helpful_count();
```

## Backend Models

### Rating Model (backend/src/models/Rating.js)

```javascript
const { pool } = require('../database/db');

class Rating {
  // Create a new rating
  static async create({ rater_id, rated_user_id, rating_type, rating_value, context_type, context_id, review_text, is_anonymous = false, is_verified = false }) {
    const result = await pool.query(
      `INSERT INTO user_ratings
       (rater_id, rated_user_id, rating_type, rating_value, context_type, context_id, review_text, is_anonymous, is_verified)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [rater_id, rated_user_id, rating_type, rating_value, context_type, context_id, review_text, is_anonymous, is_verified]
    );
    return result.rows[0];
  }

  // Update rating
  static async update(id, { rating_value, review_text }) {
    const result = await pool.query(
      `UPDATE user_ratings
       SET rating_value = COALESCE($2, rating_value),
           review_text = COALESCE($3, review_text),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [id, rating_value, review_text]
    );
    return result.rows[0];
  }

  // Delete rating
  static async delete(id) {
    const result = await pool.query('DELETE FROM user_ratings WHERE id = $1 RETURNING *', [id]);
    return result.rows[0];
  }

  // Get ratings for a user
  static async getRatingsForUser(userId, { limit = 20, offset = 0, rating_type } = {}) {
    let query = `
      SELECT ur.*, u.username as rater_username, u.avatar_url as rater_avatar
      FROM user_ratings ur
      JOIN users u ON ur.rater_id = u.id
      WHERE ur.rated_user_id = $1
    `;
    const params = [userId];

    if (rating_type) {
      query += ` AND ur.rating_type = $${params.length + 1}`;
      params.push(rating_type);
    }

    query += ` ORDER BY ur.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);
    return result.rows;
  }

  // Get rating by rater and context
  static async getByRaterAndContext(rater_id, rated_user_id, context_type, context_id) {
    const result = await pool.query(
      'SELECT * FROM user_ratings WHERE rater_id = $1 AND rated_user_id = $2 AND context_type = $3 AND context_id = $4',
      [rater_id, rated_user_id, context_type, context_id]
    );
    return result.rows[0];
  }

  // Check if user can rate (has interaction)
  static async canRate(rater_id, rated_user_id) {
    // Check if users have interacted (follow, comment, etc)
    const result = await pool.query(
      `SELECT EXISTS(
        SELECT 1 FROM follows WHERE follower_id = $1 AND following_id = $2
        UNION
        SELECT 1 FROM comments c JOIN posts p ON c.post_id = p.id WHERE c.user_id = $1 AND p.user_id = $2
        UNION
        SELECT 1 FROM comments c JOIN posts p ON c.post_id = p.id WHERE c.user_id = $2 AND p.user_id = $1
      ) as can_rate`,
      [rater_id, rated_user_id]
    );
    return result.rows[0].can_rate;
  }
}

module.exports = Rating;
```

### Reputation Model (backend/src/models/Reputation.js)

```javascript
const { pool } = require('../database/db');

class Reputation {
  // Get reputation for user
  static async getByUserId(userId) {
    const result = await pool.query('SELECT * FROM user_reputation WHERE user_id = $1', [userId]);
    return result.rows[0];
  }

  // Get or create reputation record
  static async getOrCreate(userId) {
    let reputation = await this.getByUserId(userId);
    if (!reputation) {
      const result = await pool.query(
        'INSERT INTO user_reputation (user_id) VALUES ($1) RETURNING *',
        [userId]
      );
      reputation = result.rows[0];
    }
    return reputation;
  }

  // Recalculate reputation score
  static async recalculateScore(userId) {
    const result = await pool.query('SELECT calculate_reputation_score($1) as score', [userId]);
    return result.rows[0].score;
  }

  // Get top users by reputation
  static async getTopUsers({ limit = 10, level } = {}) {
    let query = 'SELECT ur.*, u.username, u.avatar_url FROM user_reputation ur JOIN users u ON ur.user_id = u.id';
    const params = [];

    if (level) {
      query += ' WHERE ur.reputation_level = $1';
      params.push(level);
    }

    query += ` ORDER BY ur.reputation_score DESC LIMIT $${params.length + 1}`;
    params.push(limit);

    const result = await pool.query(query, params);
    return result.rows;
  }

  // Update quality content counts
  static async updateQualityContent(userId, type, increment = true) {
    const column = type === 'post' ? 'quality_posts_count' : 'quality_comments_count';
    const result = await pool.query(
      `INSERT INTO user_reputation (user_id, ${column})
       VALUES ($1, 1)
       ON CONFLICT (user_id) DO UPDATE
       SET ${column} = user_reputation.${column} + $2,
           updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [userId, increment ? 1 : -1]
    );
    await this.recalculateScore(userId);
    return result.rows[0];
  }

  // Mark as helpful
  static async markHelpful(userId, targetType, targetId) {
    try {
      const result = await pool.query(
        'INSERT INTO helpful_marks (user_id, target_type, target_id) VALUES ($1, $2, $3) RETURNING *',
        [userId, targetType, targetId]
      );
      return result.rows[0];
    } catch (error) {
      if (error.code === '23505') { // Unique violation
        throw new Error('Already marked as helpful');
      }
      throw error;
    }
  }

  // Remove helpful mark
  static async unmarkHelpful(userId, targetType, targetId) {
    const result = await pool.query(
      'DELETE FROM helpful_marks WHERE user_id = $1 AND target_type = $2 AND target_id = $3 RETURNING *',
      [userId, targetType, targetId]
    );

    if (result.rows[0]) {
      // Get target user and decrement helpful count
      let targetUserId;
      if (targetType === 'post') {
        const post = await pool.query('SELECT user_id FROM posts WHERE id = $1', [targetId]);
        targetUserId = post.rows[0]?.user_id;
      } else if (targetType === 'comment') {
        const comment = await pool.query('SELECT user_id FROM comments WHERE id = $1', [targetId]);
        targetUserId = comment.rows[0]?.user_id;
      } else {
        targetUserId = targetId;
      }

      if (targetUserId) {
        await pool.query(
          'UPDATE user_reputation SET helpful_count = GREATEST(0, helpful_count - 1), updated_at = CURRENT_TIMESTAMP WHERE user_id = $1',
          [targetUserId]
        );
        await this.recalculateScore(targetUserId);
      }
    }

    return result.rows[0];
  }
}

module.exports = Reputation;
```

## API Endpoints

### Rating Routes (backend/src/routes/ratings.js)

```javascript
POST   /api/ratings/:userId              - Rate a user
PUT    /api/ratings/:ratingId            - Update a rating
DELETE /api/ratings/:ratingId            - Delete a rating
GET    /api/ratings/user/:userId         - Get ratings for a user
GET    /api/ratings/given                - Get ratings given by current user
GET    /api/ratings/received             - Get ratings received by current user
GET    /api/ratings/check/:userId        - Check if current user can rate this user
POST   /api/ratings/:ratingId/report     - Report a rating
```

### Reputation Routes (backend/src/routes/reputation.js)

```javascript
GET    /api/reputation/:userId           - Get reputation for a user
GET    /api/reputation/leaderboard       - Get top users by reputation
POST   /api/reputation/helpful/:type/:id - Mark content as helpful
DELETE /api/reputation/helpful/:type/:id - Unmark content as helpful
GET    /api/reputation/badges/:userId    - Get user badges
POST   /api/reputation/recalculate       - Admin: Recalculate all scores
```

## Frontend Components

### Components to Create:

1. **RatingButton.tsx** - Button to rate a user (shows on profile, posts, comments)
2. **RatingModal.tsx** - Modal for submitting/editing a rating
3. **RatingDisplay.tsx** - Show average rating with stars
4. **RatingsList.tsx** - List of ratings with pagination
5. **ReputationBadge.tsx** - Display user's reputation level badge
6. **ReputationScore.tsx** - Visual reputation score display (progress bar)
7. **HelpfulButton.tsx** - Mark content as helpful
8. **LeaderboardPage.tsx** - Page showing top-rated users

## Testing Plan

### Backend API Tests:

1. **Rating Creation**
   - Create rating with valid data
   - Prevent self-rating
   - Prevent duplicate ratings (same context)
   - Verify trigger updates reputation

2. **Rating Updates**
   - Update rating value
   - Update review text
   - Verify ownership before update

3. **Reputation Calculation**
   - Test score calculation formula
   - Test level assignments
   - Test helpful mark impact
   - Test quality content bonus

4. **Permissions**
   - Only allow ratings from users with interactions
   - Verify authentication required
   - Test report system

### Frontend Tests:

1. Rating modal displays correctly
2. Star selection works
3. Review text validation
4. Reputation badge shows correct level
5. Leaderboard loads and displays

## Implementation Sequence

1. ✅ Create migration file (004_rating_reputation_system.sql)
2. Run migration on database
3. Create Rating model
4. Create Reputation model
5. Create rating routes with authentication
6. Create reputation routes
7. Test all endpoints with unit tests
8. Create frontend API service functions
9. Create React components
10. Integrate into existing pages (Profile, PostCard)
11. Test full flow end-to-end
12. Add admin dashboard for managing reports

## Migration File Name

`backend/src/database/migrations/004_rating_reputation_system.sql`
