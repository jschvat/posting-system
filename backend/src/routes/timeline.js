/**
 * Timeline Routes
 * API endpoints for personalized timeline/feed
 */

const express = require('express');
const router = express.Router();
const TimelineCache = require('../models/TimelineCache');
const Follow = require('../models/Follow');
const UserStats = require('../models/UserStats');
const { authenticate } = require('../middleware/auth');

/**
 * @route   GET /api/timeline
 * @desc    Get personalized timeline for current user
 * @access  Private
 */
router.get('/', authenticate, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 20, min_score = 0 } = req.query;
    const offset = (page - 1) * limit;

    // Get timeline from cache
    const timeline = await TimelineCache.getTimeline(userId, {
      limit: parseInt(limit),
      offset,
      minScore: parseInt(min_score)
    });

    // If cache is empty or stale, generate new timeline
    if (timeline.length === 0 && page === 1) {
      await TimelineCache.generateForUser(userId, { limit: 100 });

      // Fetch again after generation
      const newTimeline = await TimelineCache.getTimeline(userId, {
        limit: parseInt(limit),
        offset,
        minScore: parseInt(min_score)
      });

      return res.json({
        success: true,
        data: {
          posts: newTimeline,
          pagination: {
            current_page: parseInt(page),
            limit: parseInt(limit),
            has_next_page: newTimeline.length === parseInt(limit)
          }
        }
      });
    }

    res.json({
      success: true,
      data: {
        posts: timeline,
        pagination: {
          current_page: parseInt(page),
          limit: parseInt(limit),
          has_next_page: timeline.length === parseInt(limit)
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/timeline/following
 * @desc    Get posts only from followed users (chronological)
 * @access  Private
 */
router.get('/following', authenticate, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    // Get list of followed user IDs
    const followingIds = await Follow.getFollowingIds(userId);

    if (followingIds.length === 0) {
      return res.json({
        success: true,
        data: {
          posts: [],
          pagination: {
            current_page: parseInt(page),
            limit: parseInt(limit),
            total_count: 0,
            has_next_page: false
          }
        }
      });
    }

    // Get posts from followed users
    const Post = require('../models/Post');
    const posts = await Post.raw(
      `SELECT
        p.*,
        u.username,
        u.first_name,
        u.last_name,
        u.avatar_url,
        (SELECT COUNT(*) FROM reactions WHERE post_id = p.id) as reaction_count,
        (SELECT COUNT(*) FROM comments WHERE post_id = p.id AND is_published = true) as comment_count,
        (SELECT COUNT(*) FROM shares WHERE post_id = p.id) as share_count,
        COALESCE(
          (SELECT json_agg(json_build_object(
            'id', m.id,
            'filename', m.filename,
            'file_url', m.file_url,
            'media_type', m.media_type
          )) FROM media m WHERE m.post_id = p.id),
          '[]'::json
        ) as media,
        COUNT(*) OVER() as total_count
       FROM posts p
       JOIN users u ON p.user_id = u.id
       WHERE p.user_id = ANY($1)
         AND p.is_published = true
       ORDER BY p.created_at DESC
       LIMIT $2 OFFSET $3`,
      [followingIds, limit, offset]
    );

    const totalCount = posts.rows.length > 0 ? parseInt(posts.rows[0].total_count) : 0;

    res.json({
      success: true,
      data: {
        posts: posts.rows,
        pagination: {
          current_page: parseInt(page),
          limit: parseInt(limit),
          total_count: totalCount,
          has_next_page: offset + posts.rows.length < totalCount
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/timeline/discover
 * @desc    Get discover feed (popular + suggested content)
 * @access  Private
 */
router.get('/discover', authenticate, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { limit = 20 } = req.query;

    // Get popular posts that user hasn't seen
    const popularPosts = await TimelineCache.getPopularPosts(userId, {
      limit: parseInt(limit),
      timeframe: '24 hours'
    });

    res.json({
      success: true,
      data: {
        posts: popularPosts
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/timeline/trending
 * @desc    Get trending posts (high engagement in last 24 hours)
 * @access  Public
 */
router.get('/trending', async (req, res, next) => {
  try {
    const { limit = 10, timeframe = '24 hours' } = req.query;

    const Share = require('../models/Share');
    const trendingPosts = await Share.getPopularShares({
      limit: parseInt(limit),
      timeframe
    });

    res.json({
      success: true,
      data: {
        posts: trendingPosts
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/timeline/refresh
 * @desc    Regenerate timeline cache for current user
 * @access  Private
 */
router.post('/refresh', authenticate, async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Generate new timeline
    const entriesCreated = await TimelineCache.generateForUser(userId, {
      limit: 100
    });

    res.json({
      success: true,
      data: {
        entries_created: entriesCreated
      },
      message: 'Timeline refreshed successfully'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/timeline/stats
 * @desc    Get timeline cache statistics
 * @access  Private (Admin only in production)
 */
router.get('/stats', authenticate, async (req, res, next) => {
  try {
    const stats = await TimelineCache.getStats();

    res.json({
      success: true,
      data: {
        stats
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   DELETE /api/timeline/cleanup
 * @desc    Clean up expired timeline entries
 * @access  Private (Admin only in production)
 */
router.delete('/cleanup', authenticate, async (req, res, next) => {
  try {
    const deletedCount = await TimelineCache.cleanup();

    res.json({
      success: true,
      data: {
        deleted_count: deletedCount
      },
      message: `Cleaned up ${deletedCount} expired entries`
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
