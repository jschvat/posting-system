/**
 * Follow Routes
 * API endpoints for follow/unfollow functionality
 */

const express = require('express');
const router = express.Router();
const Follow = require('../models/Follow');
const UserStats = require('../models/UserStats');
const { authenticate, optionalAuthenticate } = require('../middleware/auth');

/**
 * @route   POST /api/follows/:userId
 * @desc    Follow a user
 * @access  Private
 */
router.post('/:userId', authenticate, async (req, res, next) => {
  try {
    const followerId = req.user.id;
    const followingId = parseInt(req.params.userId);

    // Validate
    if (followerId === followingId) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'You cannot follow yourself',
          type: 'validation_error'
        }
      });
    }

    // Check if already following
    const existing = await Follow.isFollowing(followerId, followingId);
    if (existing) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'You are already following this user',
          type: 'validation_error'
        }
      });
    }

    // Create follow relationship
    const follow = await Follow.create({
      follower_id: followerId,
      following_id: followingId,
      status: 'active',
      notifications_enabled: true
    });

    // Get updated counts
    const counts = await Follow.getCounts(followingId);

    res.status(201).json({
      success: true,
      data: {
        follow,
        counts
      },
      message: 'Successfully followed user'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   DELETE /api/follows/:userId
 * @desc    Unfollow a user
 * @access  Private
 */
router.delete('/:userId', authenticate, async (req, res, next) => {
  try {
    const followerId = req.user.id;
    const followingId = parseInt(req.params.userId);

    // Unfollow
    const success = await Follow.unfollow(followerId, followingId);

    if (!success) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Follow relationship not found',
          type: 'not_found'
        }
      });
    }

    // Get updated counts
    const counts = await Follow.getCounts(followingId);

    res.json({
      success: true,
      data: { counts },
      message: 'Unfollowed successfully'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/follows/followers/:userId?
 * @desc    Get user's followers (defaults to current user if no userId)
 * @access  Public
 */
router.get('/followers/:userId?', optionalAuthenticate, async (req, res, next) => {
  try {
    const userId = req.params.userId ? parseInt(req.params.userId) : req.user?.id;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'User ID is required',
          type: 'validation_error'
        }
      });
    }

    const { page = 1, limit = 20, status = 'active' } = req.query;
    const offset = (page - 1) * limit;

    const followers = await Follow.getFollowers(userId, {
      limit: parseInt(limit),
      offset,
      status
    });

    // Get total count
    const counts = await Follow.getCounts(userId);
    const totalCount = counts.follower_count || 0;
    const totalPages = Math.ceil(totalCount / parseInt(limit));

    res.json({
      success: true,
      data: {
        followers,
        pagination: {
          current_page: parseInt(page),
          limit: parseInt(limit),
          total_count: totalCount,
          total_pages: totalPages,
          has_next_page: parseInt(page) < totalPages,
          has_prev_page: parseInt(page) > 1
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/follows/following/:userId?
 * @desc    Get users that a user follows (defaults to current user if no userId)
 * @access  Public
 */
router.get('/following/:userId?', optionalAuthenticate, async (req, res, next) => {
  try {
    const userId = req.params.userId ? parseInt(req.params.userId) : req.user?.id;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'User ID is required',
          type: 'validation_error'
        }
      });
    }

    const { page = 1, limit = 20, status = 'active' } = req.query;
    const offset = (page - 1) * limit;

    const following = await Follow.getFollowing(userId, {
      limit: parseInt(limit),
      offset,
      status
    });

    // Get total count
    const counts = await Follow.getCounts(userId);
    const totalCount = counts.following_count || 0;
    const totalPages = Math.ceil(totalCount / parseInt(limit));

    res.json({
      success: true,
      data: {
        following,
        pagination: {
          current_page: parseInt(page),
          limit: parseInt(limit),
          total_count: totalCount,
          total_pages: totalPages,
          has_next_page: parseInt(page) < totalPages,
          has_prev_page: parseInt(page) > 1
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/follows/mutual
 * @desc    Get mutual follows for current user
 * @access  Private
 */
router.get('/mutual', authenticate, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const mutualFollows = await Follow.getMutualFollows(userId, {
      limit: parseInt(limit),
      offset
    });

    res.json({
      success: true,
      data: {
        mutual_follows: mutualFollows,
        pagination: {
          current_page: parseInt(page),
          limit: parseInt(limit)
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/follows/suggestions
 * @desc    Get follow suggestions for current user
 * @access  Public (optional auth)
 */
router.get('/suggestions', optionalAuthenticate, async (req, res, next) => {
  try {
    const userId = req.user?.id;
    const { limit = 10 } = req.query;

    if (!userId) {
      // If no user, return popular users instead
      const result = await Follow.raw(
        `SELECT
          u.id,
          u.username,
          u.first_name,
          u.last_name,
          u.avatar_url,
          u.bio,
          us.follower_count,
          us.following_count,
          us.post_count
         FROM users u
         LEFT JOIN user_stats us ON u.id = us.user_id
         ORDER BY us.follower_count DESC NULLS LAST
         LIMIT $1`,
        [parseInt(limit)]
      );

      return res.json({
        success: true,
        data: {
          suggestions: result.rows
        }
      });
    }

    const suggestions = await Follow.getSuggestions(userId, {
      limit: parseInt(limit)
    });

    res.json({
      success: true,
      data: {
        suggestions
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/follows/check/:userId
 * @desc    Check if current user follows a specific user
 * @access  Private
 */
router.get('/check/:userId', authenticate, async (req, res, next) => {
  try {
    const followerId = req.user.id;
    const followingId = parseInt(req.params.userId);

    const isFollowing = await Follow.isFollowing(followerId, followingId);
    const isMutual = await Follow.isMutualFollow(followerId, followingId);

    res.json({
      success: true,
      data: {
        is_following: !!isFollowing,
        is_mutual: isMutual,
        follow: isFollowing
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   PATCH /api/follows/:userId/mute
 * @desc    Mute a followed user
 * @access  Private
 */
router.patch('/:userId/mute', authenticate, async (req, res, next) => {
  try {
    const followerId = req.user.id;
    const followingId = parseInt(req.params.userId);

    const updated = await Follow.updateStatus(followerId, followingId, 'muted');

    if (!updated) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Follow relationship not found',
          type: 'not_found'
        }
      });
    }

    res.json({
      success: true,
      data: { follow: updated },
      message: 'User muted successfully'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   PATCH /api/follows/:userId/unmute
 * @desc    Unmute a followed user
 * @access  Private
 */
router.patch('/:userId/unmute', authenticate, async (req, res, next) => {
  try {
    const followerId = req.user.id;
    const followingId = parseInt(req.params.userId);

    const updated = await Follow.updateStatus(followerId, followingId, 'active');

    if (!updated) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Follow relationship not found',
          type: 'not_found'
        }
      });
    }

    res.json({
      success: true,
      data: { follow: updated },
      message: 'User unmuted successfully'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   PATCH /api/follows/:userId/notifications
 * @desc    Toggle notifications for a followed user
 * @access  Private
 */
router.patch('/:userId/notifications', authenticate, async (req, res, next) => {
  try {
    const followerId = req.user.id;
    const followingId = parseInt(req.params.userId);
    const { enabled } = req.body;

    if (typeof enabled !== 'boolean') {
      return res.status(400).json({
        success: false,
        error: {
          message: 'enabled must be a boolean',
          type: 'validation_error'
        }
      });
    }

    const updated = await Follow.toggleNotifications(followerId, followingId, enabled);

    if (!updated) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Follow relationship not found',
          type: 'not_found'
        }
      });
    }

    res.json({
      success: true,
      data: { follow: updated },
      message: `Notifications ${enabled ? 'enabled' : 'disabled'} successfully`
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/follows/stats/:userId?
 * @desc    Get follow statistics for a user
 * @access  Public
 */
router.get('/stats/:userId?', optionalAuthenticate, async (req, res, next) => {
  try {
    const userId = req.params.userId ? parseInt(req.params.userId) : req.user?.id;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'User ID is required',
          type: 'validation_error'
        }
      });
    }

    const counts = await Follow.getCounts(userId);
    const stats = await UserStats.getByUserId(userId);

    res.json({
      success: true,
      data: {
        counts,
        stats: stats || {
          follower_count: counts.follower_count,
          following_count: counts.following_count,
          post_count: 0,
          engagement_score: 0
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
