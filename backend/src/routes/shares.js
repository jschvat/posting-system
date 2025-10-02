/**
 * Share Routes
 * API endpoints for post sharing functionality
 */

const express = require('express');
const router = express.Router();
const Share = require('../models/Share');
const Post = require('../models/Post');
const { authenticate, optionalAuthenticate } = require('../middleware/auth');

/**
 * @route   POST /api/shares/:postId
 * @desc    Share a post
 * @access  Private
 */
router.post('/:postId', authenticate, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const postId = parseInt(req.params.postId);
    const { share_type = 'repost', share_comment, visibility = 'public' } = req.body;

    // Validate post exists
    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Post not found',
          type: 'not_found'
        }
      });
    }

    // Check if already shared
    const existing = await Share.hasShared(userId, postId);
    if (existing) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'You have already shared this post',
          type: 'validation_error'
        }
      });
    }

    // Create share
    const share = await Share.create({
      user_id: userId,
      post_id: postId,
      share_type,
      share_comment,
      visibility
    });

    // Get share count
    const shareCount = await Share.getShareCount(postId);

    res.status(201).json({
      success: true,
      data: {
        share,
        share_count: shareCount
      },
      message: 'Post shared successfully'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   DELETE /api/shares/:postId
 * @desc    Unshare a post
 * @access  Private
 */
router.delete('/:postId', authenticate, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const postId = parseInt(req.params.postId);

    const success = await Share.deleteShare(userId, postId);

    if (!success) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Share not found',
          type: 'not_found'
        }
      });
    }

    // Get updated share count
    const shareCount = await Share.getShareCount(postId);

    res.json({
      success: true,
      data: {
        share_count: shareCount
      },
      message: 'Post unshared successfully'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/shares/user/:userId?
 * @desc    Get shares by a user (defaults to current user)
 * @access  Public
 */
router.get('/user/:userId?', optionalAuthenticate, async (req, res, next) => {
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

    const { page = 1, limit = 20, type } = req.query;
    const offset = (page - 1) * limit;

    const shares = await Share.getByUser(userId, {
      limit: parseInt(limit),
      offset,
      share_type: type
    });

    res.json({
      success: true,
      data: {
        shares,
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
 * @route   GET /api/shares/post/:postId
 * @desc    Get all shares of a specific post
 * @access  Public
 */
router.get('/post/:postId', async (req, res, next) => {
  try {
    const postId = parseInt(req.params.postId);
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const shares = await Share.getByPost(postId, {
      limit: parseInt(limit),
      offset
    });

    const totalCount = await Share.getShareCount(postId);

    res.json({
      success: true,
      data: {
        shares,
        pagination: {
          current_page: parseInt(page),
          limit: parseInt(limit),
          total_count: totalCount
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/shares/check/:postId
 * @desc    Check if current user has shared a post
 * @access  Private
 */
router.get('/check/:postId', authenticate, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const postId = parseInt(req.params.postId);

    const share = await Share.hasShared(userId, postId);

    res.json({
      success: true,
      data: {
        has_shared: !!share,
        share: share || null
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/shares/popular
 * @desc    Get most shared posts
 * @access  Public
 */
router.get('/popular', async (req, res, next) => {
  try {
    const { limit = 10, timeframe = '7 days' } = req.query;

    const popularShares = await Share.getPopularShares({
      limit: parseInt(limit),
      timeframe
    });

    res.json({
      success: true,
      data: {
        popular_shares: popularShares
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/shares/following
 * @desc    Get recent shares from users the current user follows
 * @access  Private
 */
router.get('/following', authenticate, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 20, since } = req.query;
    const offset = (page - 1) * limit;

    const shares = await Share.getFollowingShares(userId, {
      limit: parseInt(limit),
      offset,
      since: since ? new Date(since) : null
    });

    res.json({
      success: true,
      data: {
        shares,
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
 * @route   PATCH /api/shares/:postId/comment
 * @desc    Update share comment
 * @access  Private
 */
router.patch('/:postId/comment', authenticate, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const postId = parseInt(req.params.postId);
    const { comment } = req.body;

    if (typeof comment !== 'string') {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Comment must be a string',
          type: 'validation_error'
        }
      });
    }

    const updated = await Share.updateComment(userId, postId, comment);

    if (!updated) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Share not found',
          type: 'not_found'
        }
      });
    }

    res.json({
      success: true,
      data: {
        share: updated
      },
      message: 'Share comment updated successfully'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/shares/counts
 * @desc    Get share counts for multiple posts
 * @access  Public
 */
router.get('/counts', async (req, res, next) => {
  try {
    const { post_ids } = req.query;

    if (!post_ids) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'post_ids query parameter is required',
          type: 'validation_error'
        }
      });
    }

    // Parse comma-separated IDs
    const postIds = post_ids.split(',').map(id => parseInt(id)).filter(id => !isNaN(id));

    if (postIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Invalid post_ids format',
          type: 'validation_error'
        }
      });
    }

    const counts = await Share.getShareCounts(postIds);

    res.json({
      success: true,
      data: {
        counts
      }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
