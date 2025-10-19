/**
 * Reputation Routes
 * API endpoints for user reputation and helpful marks
 */

const express = require('express');
const router = express.Router();
const Reputation = require('../models/Reputation');
const { authenticate, optionalAuthenticate } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/adminCheck');

/**
 * @route   GET /api/reputation/:userId
 * @desc    Get reputation for a user
 * @access  Public
 */
router.get('/:userId', optionalAuthenticate, async (req, res, next) => {
  try {
    const userId = parseInt(req.params.userId);

    let reputation = await Reputation.getByUserId(userId);

    // If no reputation exists, create one
    if (!reputation) {
      reputation = await Reputation.getOrCreate(userId);
    }

    // Get user's rank
    const rank = await Reputation.getUserRank(userId);

    res.json({
      success: true,
      data: {
        reputation,
        rank
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/reputation/leaderboard
 * @desc    Get reputation leaderboard
 * @access  Public
 */
router.get('/leaderboard/top', optionalAuthenticate, async (req, res, next) => {
  try {
    const { limit = 50, offset = 0 } = req.query;

    const leaderboard = await Reputation.getLeaderboard({
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      success: true,
      data: {
        leaderboard,
        pagination: {
          limit: parseInt(limit),
          offset: parseInt(offset)
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/reputation/top-users
 * @desc    Get top users by reputation
 * @access  Public
 */
router.get('/top-users', optionalAuthenticate, async (req, res, next) => {
  try {
    const { limit = 10, level } = req.query;

    const topUsers = await Reputation.getTopUsers({
      limit: parseInt(limit),
      level
    });

    res.json({
      success: true,
      data: {
        users: topUsers
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/reputation/helpful/:type/:id
 * @desc    Mark content as helpful
 * @access  Private
 */
router.post('/helpful/:type/:id', authenticate, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const targetType = req.params.type; // 'post', 'comment', or 'user'
    const targetId = parseInt(req.params.id);

    // Validate target type
    if (!['post', 'comment', 'user'].includes(targetType)) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Invalid target type. Must be post, comment, or user',
          type: 'validation_error'
        }
      });
    }

    // Create helpful mark
    try {
      const helpfulMark = await Reputation.markHelpful(userId, targetType, targetId);

      // Get updated helpful count
      const helpfulCount = await Reputation.getHelpfulCount(targetType, targetId);

      res.status(201).json({
        success: true,
        data: {
          helpful_mark: helpfulMark,
          helpful_count: helpfulCount
        },
        message: 'Marked as helpful'
      });
    } catch (error) {
      if (error.message === 'Already marked as helpful') {
        return res.status(400).json({
          success: false,
          error: {
            message: 'You have already marked this as helpful',
            type: 'duplicate_error'
          }
        });
      }
      throw error;
    }
  } catch (error) {
    next(error);
  }
});

/**
 * @route   DELETE /api/reputation/helpful/:type/:id
 * @desc    Remove helpful mark
 * @access  Private
 */
router.delete('/helpful/:type/:id', authenticate, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const targetType = req.params.type;
    const targetId = parseInt(req.params.id);

    // Validate target type
    if (!['post', 'comment', 'user'].includes(targetType)) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Invalid target type. Must be post, comment, or user',
          type: 'validation_error'
        }
      });
    }

    // Remove helpful mark
    const removed = await Reputation.unmarkHelpful(userId, targetType, targetId);

    if (!removed) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Helpful mark not found',
          type: 'not_found'
        }
      });
    }

    // Get updated helpful count
    const helpfulCount = await Reputation.getHelpfulCount(targetType, targetId);

    res.json({
      success: true,
      data: {
        helpful_count: helpfulCount
      },
      message: 'Helpful mark removed'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/reputation/helpful/:type/:id/check
 * @desc    Check if current user marked content as helpful
 * @access  Private
 */
router.get('/helpful/:type/:id/check', authenticate, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const targetType = req.params.type;
    const targetId = parseInt(req.params.id);

    const hasMarked = await Reputation.hasMarkedHelpful(userId, targetType, targetId);
    const helpfulCount = await Reputation.getHelpfulCount(targetType, targetId);

    res.json({
      success: true,
      data: {
        has_marked: hasMarked,
        helpful_count: helpfulCount
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/reputation/helpful/:type/:id/count
 * @desc    Get helpful count for content
 * @access  Public
 */
router.get('/helpful/:type/:id/count', optionalAuthenticate, async (req, res, next) => {
  try {
    const targetType = req.params.type;
    const targetId = parseInt(req.params.id);

    const helpfulCount = await Reputation.getHelpfulCount(targetType, targetId);

    res.json({
      success: true,
      data: {
        helpful_count: helpfulCount
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/reputation/badges/:userId
 * @desc    Get badges for a user
 * @access  Public
 */
router.get('/badges/:userId', optionalAuthenticate, async (req, res, next) => {
  try {
    const userId = parseInt(req.params.userId);

    const badges = await Reputation.getBadges(userId);

    res.json({
      success: true,
      data: {
        badges
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/reputation/recalculate
 * @desc    Recalculate reputation score for current user
 * @access  Private
 */
router.post('/recalculate', authenticate, async (req, res, next) => {
  try {
    const userId = req.user.id;

    const score = await Reputation.recalculateScore(userId);

    res.json({
      success: true,
      data: {
        reputation_score: score
      },
      message: 'Reputation score recalculated'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/reputation/recalculate-all
 * @desc    Recalculate all reputation scores (admin only)
 * @access  Private (Admin)
 */
router.post('/recalculate-all', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const count = await Reputation.recalculateAll();

    res.json({
      success: true,
      data: {
        users_updated: count
      },
      message: `Recalculated reputation for ${count} users`
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
