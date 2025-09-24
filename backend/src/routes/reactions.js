/**
 * Reactions routes for the social media platform API
 * Handles emoji reactions on posts and comments
 */

const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const { Op } = require('sequelize');
const db = require('../config/database');

const router = express.Router();

// Import models (they will be available after database initialization)
const getModels = () => db.models;

/**
 * Validation middleware to check for validation errors
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: {
        message: 'Validation failed',
        type: 'VALIDATION_ERROR',
        details: errors.array()
      }
    });
  }
  next();
};

/**
 * Common emoji mappings for validation and normalization
 */
const COMMON_EMOJIS = {
  'like': '👍',
  'thumbs_up': '👍',
  'love': '❤️',
  'heart': '❤️',
  'laugh': '😂',
  'haha': '😂',
  'wow': '😮',
  'surprised': '😮',
  'sad': '😢',
  'cry': '😢',
  'angry': '😠',
  'mad': '😠',
  'care': '🤗',
  'hug': '🤗',
  'fire': '🔥',
  'clap': '👏',
  'party': '🎉',
  'celebrate': '🎉',
  'thinking': '🤔',
  'cool': '😎'
};

/**
 * Helper function to normalize emoji input
 */
const normalizeEmoji = (emojiName, emojiUnicode) => {
  // If no unicode provided, try to get it from common emojis
  if (!emojiUnicode && COMMON_EMOJIS[emojiName.toLowerCase()]) {
    return {
      name: emojiName.toLowerCase(),
      unicode: COMMON_EMOJIS[emojiName.toLowerCase()]
    };
  }

  return {
    name: emojiName.toLowerCase().replace(/[^a-z0-9_]/g, ''),
    unicode: emojiUnicode
  };
};

/**
 * POST /api/reactions/post/:postId
 * Add or toggle reaction on a post
 */
router.post('/post/:postId',
  [
    param('postId').isInt({ min: 1 }).withMessage('Post ID must be a positive integer'),
    body('user_id').isInt({ min: 1 }).withMessage('User ID is required and must be a positive integer'),
    body('emoji_name').trim().isLength({ min: 1, max: 50 }).withMessage('Emoji name must be between 1 and 50 characters'),
    body('emoji_unicode').optional().trim().isLength({ min: 1, max: 20 }).withMessage('Emoji unicode must be between 1 and 20 characters')
  ],
  handleValidationErrors,
  async (req, res, next) => {
    try {
      const { User, Post, Reaction } = getModels();
      const postId = parseInt(req.params.postId);
      const { user_id, emoji_name, emoji_unicode } = req.body;

      // Verify post exists
      const post = await Post.findByPk(postId);
      if (!post) {
        return res.status(404).json({
          success: false,
          error: {
            message: 'Post not found',
            type: 'NOT_FOUND'
          }
        });
      }

      // Verify user exists
      const user = await User.findByPk(user_id);
      if (!user) {
        return res.status(404).json({
          success: false,
          error: {
            message: 'User not found',
            type: 'NOT_FOUND'
          }
        });
      }

      // Normalize emoji input
      const normalizedEmoji = normalizeEmoji(emoji_name, emoji_unicode);

      // Toggle reaction
      const result = await Reaction.togglePostReaction(
        user_id,
        postId,
        normalizedEmoji.unicode,
        normalizedEmoji.name
      );

      // Get updated reaction counts
      const reactionCounts = await Reaction.getPostReactionCounts(postId);

      res.json({
        success: true,
        data: {
          action: result.action,
          reaction: result.reaction,
          reaction_counts: reactionCounts
        },
        message: `Reaction ${result.action} successfully`
      });

    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/reactions/comment/:commentId
 * Add or toggle reaction on a comment
 */
router.post('/comment/:commentId',
  [
    param('commentId').isInt({ min: 1 }).withMessage('Comment ID must be a positive integer'),
    body('user_id').isInt({ min: 1 }).withMessage('User ID is required and must be a positive integer'),
    body('emoji_name').trim().isLength({ min: 1, max: 50 }).withMessage('Emoji name must be between 1 and 50 characters'),
    body('emoji_unicode').optional().trim().isLength({ min: 1, max: 20 }).withMessage('Emoji unicode must be between 1 and 20 characters')
  ],
  handleValidationErrors,
  async (req, res, next) => {
    try {
      const { User, Comment, Reaction } = getModels();
      const commentId = parseInt(req.params.commentId);
      const { user_id, emoji_name, emoji_unicode } = req.body;

      // Verify comment exists
      const comment = await Comment.findByPk(commentId);
      if (!comment) {
        return res.status(404).json({
          success: false,
          error: {
            message: 'Comment not found',
            type: 'NOT_FOUND'
          }
        });
      }

      // Verify user exists
      const user = await User.findByPk(user_id);
      if (!user) {
        return res.status(404).json({
          success: false,
          error: {
            message: 'User not found',
            type: 'NOT_FOUND'
          }
        });
      }

      // Normalize emoji input
      const normalizedEmoji = normalizeEmoji(emoji_name, emoji_unicode);

      // Toggle reaction
      const result = await Reaction.toggleCommentReaction(
        user_id,
        commentId,
        normalizedEmoji.unicode,
        normalizedEmoji.name
      );

      // Get updated reaction counts
      const reactionCounts = await Reaction.getCommentReactionCounts(commentId);

      res.json({
        success: true,
        data: {
          action: result.action,
          reaction: result.reaction,
          reaction_counts: reactionCounts
        },
        message: `Reaction ${result.action} successfully`
      });

    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/reactions/post/:postId
 * Get all reactions for a specific post
 */
router.get('/post/:postId',
  [
    param('postId').isInt({ min: 1 }).withMessage('Post ID must be a positive integer'),
    query('include_users').optional().isBoolean().withMessage('Include users must be a boolean')
  ],
  handleValidationErrors,
  async (req, res, next) => {
    try {
      const { Post, Reaction, User } = getModels();
      const postId = parseInt(req.params.postId);
      const includeUsers = req.query.include_users === 'true';

      // Verify post exists
      const post = await Post.findByPk(postId);
      if (!post) {
        return res.status(404).json({
          success: false,
          error: {
            message: 'Post not found',
            type: 'NOT_FOUND'
          }
        });
      }

      // Get reaction counts
      const reactionCounts = await Reaction.getPostReactionCounts(postId);

      let detailedReactions = null;
      if (includeUsers) {
        // Get detailed reactions with user information
        detailedReactions = await Reaction.findAll({
          where: { post_id: postId },
          include: [{
            model: User,
            as: 'user',
            attributes: ['id', 'username', 'first_name', 'last_name', 'avatar_url']
          }],
          order: [['created_at', 'DESC']]
        });
      }

      res.json({
        success: true,
        data: {
          post_id: postId,
          reaction_counts: reactionCounts,
          total_reactions: reactionCounts.reduce((sum, r) => sum + parseInt(r.dataValues?.count || r.count || 0), 0),
          ...(includeUsers && { detailed_reactions: detailedReactions })
        }
      });

    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/reactions/comment/:commentId
 * Get all reactions for a specific comment
 */
router.get('/comment/:commentId',
  [
    param('commentId').isInt({ min: 1 }).withMessage('Comment ID must be a positive integer'),
    query('include_users').optional().isBoolean().withMessage('Include users must be a boolean')
  ],
  handleValidationErrors,
  async (req, res, next) => {
    try {
      const { Comment, Reaction, User } = getModels();
      const commentId = parseInt(req.params.commentId);
      const includeUsers = req.query.include_users === 'true';

      // Verify comment exists
      const comment = await Comment.findByPk(commentId);
      if (!comment) {
        return res.status(404).json({
          success: false,
          error: {
            message: 'Comment not found',
            type: 'NOT_FOUND'
          }
        });
      }

      // Get reaction counts
      const reactionCounts = await Reaction.getCommentReactionCounts(commentId);

      let detailedReactions = null;
      if (includeUsers) {
        // Get detailed reactions with user information
        detailedReactions = await Reaction.findAll({
          where: { comment_id: commentId },
          include: [{
            model: User,
            as: 'user',
            attributes: ['id', 'username', 'first_name', 'last_name', 'avatar_url']
          }],
          order: [['created_at', 'DESC']]
        });
      }

      res.json({
        success: true,
        data: {
          comment_id: commentId,
          reaction_counts: reactionCounts,
          total_reactions: reactionCounts.reduce((sum, r) => sum + parseInt(r.dataValues?.count || r.count || 0), 0),
          ...(includeUsers && { detailed_reactions: detailedReactions })
        }
      });

    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/reactions/user/:userId
 * Get all reactions by a specific user
 */
router.get('/user/:userId',
  [
    param('userId').isInt({ min: 1 }).withMessage('User ID must be a positive integer'),
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50'),
    query('type').optional().isIn(['post', 'comment']).withMessage('Type must be post or comment')
  ],
  handleValidationErrors,
  async (req, res, next) => {
    try {
      const { User, Reaction, Post, Comment } = getModels();
      const userId = parseInt(req.params.userId);
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const offset = (page - 1) * limit;
      const type = req.query.type;

      // Verify user exists
      const user = await User.findByPk(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          error: {
            message: 'User not found',
            type: 'NOT_FOUND'
          }
        });
      }

      // Build where clause
      const whereClause = { user_id: userId };
      if (type === 'post') {
        whereClause.post_id = { [Op.not]: null };
      } else if (type === 'comment') {
        whereClause.comment_id = { [Op.not]: null };
      }

      // Get reactions with associated posts/comments
      const { count, rows: reactions } = await Reaction.findAndCountAll({
        where: whereClause,
        limit,
        offset,
        order: [['created_at', 'DESC']],
        include: [
          {
            model: Post,
            as: 'post',
            required: false,
            include: [{
              model: User,
              as: 'author',
              attributes: ['id', 'username', 'first_name', 'last_name', 'avatar_url']
            }]
          },
          {
            model: Comment,
            as: 'comment',
            required: false,
            include: [{
              model: User,
              as: 'author',
              attributes: ['id', 'username', 'first_name', 'last_name', 'avatar_url']
            }]
          }
        ]
      });

      // Calculate pagination info
      const totalPages = Math.ceil(count / limit);

      res.json({
        success: true,
        data: {
          user: user.getPublicData(),
          reactions,
          pagination: {
            current_page: page,
            total_pages: totalPages,
            total_count: count,
            limit,
            has_next_page: page < totalPages,
            has_prev_page: page > 1
          }
        }
      });

    } catch (error) {
      next(error);
    }
  }
);

/**
 * DELETE /api/reactions/:id
 * Delete a specific reaction
 */
router.delete('/:id',
  [
    param('id').isInt({ min: 1 }).withMessage('Reaction ID must be a positive integer')
  ],
  handleValidationErrors,
  async (req, res, next) => {
    try {
      const { Reaction } = getModels();
      const reactionId = parseInt(req.params.id);

      // Find the reaction
      const reaction = await Reaction.findByPk(reactionId);
      if (!reaction) {
        return res.status(404).json({
          success: false,
          error: {
            message: 'Reaction not found',
            type: 'NOT_FOUND'
          }
        });
      }

      // Check if user can delete this reaction (TODO: Implement proper authentication)
      // For now, assume any user can delete any reaction (will be fixed with authentication)

      // Store reference for response
      const postId = reaction.post_id;
      const commentId = reaction.comment_id;

      // Delete the reaction
      await reaction.destroy();

      // Get updated reaction counts
      let reactionCounts;
      if (postId) {
        reactionCounts = await Reaction.getPostReactionCounts(postId);
      } else if (commentId) {
        reactionCounts = await Reaction.getCommentReactionCounts(commentId);
      }

      res.json({
        success: true,
        data: {
          reaction_counts: reactionCounts
        },
        message: 'Reaction deleted successfully'
      });

    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/reactions/emoji-list
 * Get list of available emojis with their unicode values
 */
router.get('/emoji-list', (req, res) => {
  const emojiList = Object.entries(COMMON_EMOJIS).map(([name, unicode]) => ({
    name,
    unicode,
    display_name: name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
  }));

  res.json({
    success: true,
    data: {
      emojis: emojiList,
      total_count: emojiList.length
    }
  });
});

/**
 * GET /api/reactions/stats/popular
 * Get most popular emoji reactions across the platform
 */
router.get('/stats/popular',
  [
    query('days').optional().isInt({ min: 1, max: 365 }).withMessage('Days must be between 1 and 365'),
    query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50')
  ],
  handleValidationErrors,
  async (req, res, next) => {
    try {
      const { Reaction } = getModels();
      const days = parseInt(req.query.days) || 30;
      const limit = parseInt(req.query.limit) || 10;

      // Calculate date range
      const dateFrom = new Date();
      dateFrom.setDate(dateFrom.getDate() - days);

      // Get popular emojis
      const popularEmojis = await Reaction.findAll({
        attributes: [
          'emoji_name',
          'emoji_unicode',
          [db.fn('COUNT', db.col('id')), 'usage_count']
        ],
        where: {
          created_at: {
            [Op.gte]: dateFrom
          }
        },
        group: ['emoji_name', 'emoji_unicode'],
        order: [[db.col('usage_count'), 'DESC']],
        limit
      });

      res.json({
        success: true,
        data: {
          popular_emojis: popularEmojis,
          period: `Last ${days} days`,
          total_count: popularEmojis.length
        }
      });

    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;