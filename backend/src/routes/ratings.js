/**
 * Rating Routes
 * API endpoints for user rating functionality
 */

const express = require('express');
const router = express.Router();
const Rating = require('../models/Rating');
const { authenticate, optionalAuthenticate } = require('../middleware/auth');

/**
 * @route   POST /api/ratings/:userId
 * @desc    Rate a user
 * @access  Private
 */
router.post('/:userId', authenticate, async (req, res, next) => {
  try {
    const raterId = req.user.id;
    const ratedUserId = parseInt(req.params.userId);
    const {
      rating_type,
      rating_value,
      context_type,
      context_id,
      review_text,
      is_anonymous = false
    } = req.body;

    // Validation
    if (raterId === ratedUserId) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'You cannot rate yourself',
          type: 'validation_error'
        }
      });
    }

    if (!rating_type || !rating_value) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'rating_type and rating_value are required',
          type: 'validation_error'
        }
      });
    }

    if (rating_value < 1 || rating_value > 5) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'rating_value must be between 1 and 5',
          type: 'validation_error'
        }
      });
    }

    // Check if user can rate
    const canRate = await Rating.canRate(raterId, ratedUserId);
    if (!canRate) {
      return res.status(403).json({
        success: false,
        error: {
          message: 'You must have interactions with this user to rate them',
          type: 'permission_error'
        }
      });
    }

    // Check for existing rating with same context
    if (context_type && context_id) {
      const existing = await Rating.getByRaterAndContext(
        raterId,
        ratedUserId,
        context_type,
        context_id
      );

      if (existing) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'You have already rated this user in this context',
            type: 'duplicate_rating',
            existing_rating_id: existing.id
          }
        });
      }
    }

    // Create rating
    const rating = await Rating.create({
      rater_id: raterId,
      rated_user_id: ratedUserId,
      rating_type,
      rating_value,
      context_type,
      context_id,
      review_text,
      is_anonymous,
      is_verified: false
    });

    res.status(201).json({
      success: true,
      data: { rating },
      message: 'Rating created successfully'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   PUT /api/ratings/:ratingId
 * @desc    Update a rating
 * @access  Private
 */
router.put('/:ratingId', authenticate, async (req, res, next) => {
  try {
    const ratingId = parseInt(req.params.ratingId);
    const userId = req.user.id;
    const { rating_value, review_text } = req.body;

    // Get existing rating
    const existing = await Rating.findById(ratingId);
    if (!existing) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Rating not found',
          type: 'not_found'
        }
      });
    }

    // Check ownership
    if (existing.rater_id !== userId) {
      return res.status(403).json({
        success: false,
        error: {
          message: 'You can only update your own ratings',
          type: 'permission_error'
        }
      });
    }

    // Validate rating_value
    if (rating_value && (rating_value < 1 || rating_value > 5)) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'rating_value must be between 1 and 5',
          type: 'validation_error'
        }
      });
    }

    // Update rating
    const updated = await Rating.update(ratingId, {
      rating_value,
      review_text
    });

    res.json({
      success: true,
      data: { rating: updated },
      message: 'Rating updated successfully'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   DELETE /api/ratings/:ratingId
 * @desc    Delete a rating
 * @access  Private
 */
router.delete('/:ratingId', authenticate, async (req, res, next) => {
  try {
    const ratingId = parseInt(req.params.ratingId);
    const userId = req.user.id;

    // Get existing rating
    const existing = await Rating.findById(ratingId);
    if (!existing) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Rating not found',
          type: 'not_found'
        }
      });
    }

    // Check ownership
    if (existing.rater_id !== userId) {
      return res.status(403).json({
        success: false,
        error: {
          message: 'You can only delete your own ratings',
          type: 'permission_error'
        }
      });
    }

    // Delete rating
    await Rating.delete(ratingId);

    res.json({
      success: true,
      message: 'Rating deleted successfully'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/ratings/user/:userId
 * @desc    Get ratings for a user
 * @access  Public
 */
router.get('/user/:userId', optionalAuthenticate, async (req, res, next) => {
  try {
    const userId = parseInt(req.params.userId);
    const { page = 1, limit = 20, rating_type } = req.query;
    const offset = (page - 1) * limit;

    const ratings = await Rating.getRatingsForUser(userId, {
      limit: parseInt(limit),
      offset,
      rating_type
    });

    // Get stats
    const stats = await Rating.getStats(userId);

    res.json({
      success: true,
      data: {
        ratings,
        stats,
        pagination: {
          current_page: parseInt(page),
          limit: parseInt(limit),
          total_count: parseInt(stats.total_ratings)
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/ratings/given
 * @desc    Get ratings given by current user
 * @access  Private
 */
router.get('/given', authenticate, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const ratings = await Rating.getRatingsGivenByUser(userId, {
      limit: parseInt(limit),
      offset
    });

    res.json({
      success: true,
      data: {
        ratings,
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
 * @route   GET /api/ratings/received
 * @desc    Get ratings received by current user
 * @access  Private
 */
router.get('/received', authenticate, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 20, rating_type } = req.query;
    const offset = (page - 1) * limit;

    const ratings = await Rating.getRatingsForUser(userId, {
      limit: parseInt(limit),
      offset,
      rating_type
    });

    const stats = await Rating.getStats(userId);

    res.json({
      success: true,
      data: {
        ratings,
        stats,
        pagination: {
          current_page: parseInt(page),
          limit: parseInt(limit),
          total_count: parseInt(stats.total_ratings)
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/ratings/check/:userId
 * @desc    Check if current user can rate a user
 * @access  Private
 */
router.get('/check/:userId', authenticate, async (req, res, next) => {
  try {
    const raterId = req.user.id;
    const ratedUserId = parseInt(req.params.userId);

    const canRate = await Rating.canRate(raterId, ratedUserId);

    res.json({
      success: true,
      data: {
        can_rate: canRate
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/ratings/:ratingId/report
 * @desc    Report a rating
 * @access  Private
 */
router.post('/:ratingId/report', authenticate, async (req, res, next) => {
  try {
    const ratingId = parseInt(req.params.ratingId);
    const reporterId = req.user.id;
    const { report_reason, report_details } = req.body;

    if (!report_reason) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'report_reason is required',
          type: 'validation_error'
        }
      });
    }

    // Check if rating exists
    const rating = await Rating.findById(ratingId);
    if (!rating) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Rating not found',
          type: 'not_found'
        }
      });
    }

    // Create report
    const report = await Rating.report(
      ratingId,
      reporterId,
      report_reason,
      report_details
    );

    res.status(201).json({
      success: true,
      data: { report },
      message: 'Rating reported successfully'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/ratings/:ratingId/reports
 * @desc    Get reports for a rating (admin only for now)
 * @access  Private
 */
router.get('/:ratingId/reports', authenticate, async (req, res, next) => {
  try {
    const ratingId = parseInt(req.params.ratingId);

    const reports = await Rating.getReports(ratingId);

    res.json({
      success: true,
      data: {
        reports
      }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
