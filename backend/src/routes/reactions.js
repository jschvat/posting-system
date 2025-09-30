/**
 * Reactions routes for the social media platform API
 * Handles emoji reactions on posts and comments
 * Pure PostgreSQL implementation - NO SEQUELIZE
 */

const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const { authenticate } = require('../middleware/auth');

// Import PostgreSQL models
const Reaction = require('../models/Reaction');
const User = require('../models/User');
const Post = require('../models/Post');
const Comment = require('../models/Comment');

const router = express.Router();

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
  'like': 'like',
  'thumbs_up': 'like',
  'love': 'love',
  'heart': 'love',
  'laugh': 'laugh',
  'haha': 'laugh',
  'wow': 'wow',
  'surprised': 'wow',
  'sad': 'sad',
  'cry': 'sad',
  'angry': 'angry',
  'mad': 'angry'
};

/**
 * Get default emoji unicode for a given emoji name
 */
function getDefaultEmojiUnicode(emojiName) {
  const defaults = {
    'like': '👍',
    'love': '❤️',
    'laugh': '😂',
    'wow': '😮',
    'sad': '😢',
    'angry': '😠'
  };
  return defaults[emojiName] || '👍'; // Default to thumbs up
}

/**
 * POST /api/reactions/post/:postId
 * Add or toggle reaction on a post
 */
router.post('/post/:postId',
  authenticate,
  [
    param('postId').isInt().withMessage('Post ID must be an integer'),
    body('emoji_name').trim().isLength({ min: 1, max: 50 }).withMessage('Reaction type is required (1-50 characters)'),
    body('emoji_unicode').optional().isString().withMessage('Emoji unicode must be a string')
  ],
  handleValidationErrors,
  async (req, res, next) => {
    try {
      const postId = parseInt(req.params.postId);
      const { emoji_name, emoji_unicode } = req.body;

      // Normalize reaction type - remove spaces, special chars (but keep underscores), convert to lowercase
      const cleanedName = emoji_name.toLowerCase().replace(/[^a-z0-9_]/g, '');
      const normalizedType = COMMON_EMOJIS[cleanedName] || cleanedName;

      // Get default emoji unicode if not provided
      const emojiUnicode = emoji_unicode || getDefaultEmojiUnicode(normalizedType);

      // Check if post exists
      const post = await Post.findById(postId);
      if (!post) {
        return res.status(404).json({
          success: false,
          error: {
            message: 'Post not found',
            type: 'NOT_FOUND'
          }
        });
      }

      // Toggle reaction
      const result = await Reaction.togglePostReaction(req.user.id, postId, normalizedType, emojiUnicode);

      // Get updated reaction counts
      const counts = await Reaction.getPostReactionCounts(postId);

      res.json({
        success: true,
        data: {
          action: result.action,
          reaction: result.reaction,
          reaction_counts: counts
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
  authenticate,
  [
    param('commentId').isInt().withMessage('Comment ID must be an integer'),
    body('emoji_name').trim().isLength({ min: 1, max: 50 }).withMessage('Reaction type is required (1-50 characters)'),
    body('emoji_unicode').optional().isString().withMessage('Emoji unicode must be a string')
  ],
  handleValidationErrors,
  async (req, res, next) => {
    try {
      const commentId = parseInt(req.params.commentId);
      const { emoji_name, emoji_unicode } = req.body;

      // Normalize reaction type - remove spaces, special chars (but keep underscores), convert to lowercase
      const cleanedName = emoji_name.toLowerCase().replace(/[^a-z0-9_]/g, '');
      const normalizedType = COMMON_EMOJIS[cleanedName] || cleanedName;

      // Get default emoji unicode if not provided
      const emojiUnicode = emoji_unicode || getDefaultEmojiUnicode(normalizedType);

      // Check if comment exists
      const comment = await Comment.findById(commentId);
      if (!comment) {
        return res.status(404).json({
          success: false,
          error: {
            message: 'Comment not found',
            type: 'NOT_FOUND'
          }
        });
      }

      // Toggle reaction
      const result = await Reaction.toggleCommentReaction(req.user.id, commentId, normalizedType, emojiUnicode);

      // Get updated reaction counts
      const counts = await Reaction.getCommentReactionCounts(commentId);

      res.json({
        success: true,
        data: {
          action: result.action,
          reaction: result.reaction,
          reaction_counts: counts
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
 * Get reaction counts and details for a post
 */
router.get('/post/:postId',
  [
    param('postId').isInt().withMessage('Post ID must be an integer'),
    query('include_users').optional().isBoolean().withMessage('Include users must be boolean'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be 1-100'),
    query('offset').optional().isInt({ min: 0 }).withMessage('Offset must be >= 0')
  ],
  handleValidationErrors,
  async (req, res, next) => {
    try {
      const postId = parseInt(req.params.postId);
      const includeUsers = req.query.include_users === 'true';
      const limit = parseInt(req.query.limit) || 50;
      const offset = parseInt(req.query.offset) || 0;

      // Check if post exists
      const post = await Post.findById(postId);
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
      const counts = await Reaction.getPostReactionCounts(postId);

      let reactions = null;
      if (includeUsers) {
        reactions = await Reaction.getPostReactions(postId, limit, offset);
      }

      res.json({
        success: true,
        data: {
          post_id: postId,
          total_reactions: counts.reduce((sum, count) => sum + parseInt(count.count), 0),
          reaction_counts: counts,
          reactions: reactions,
          detailed_reactions: reactions
        }
      });

    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/reactions/comment/:commentId
 * Get reaction counts and details for a comment
 */
router.get('/comment/:commentId',
  [
    param('commentId').isInt().withMessage('Comment ID must be an integer'),
    query('include_users').optional().isBoolean().withMessage('Include users must be boolean'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be 1-100'),
    query('offset').optional().isInt({ min: 0 }).withMessage('Offset must be >= 0')
  ],
  handleValidationErrors,
  async (req, res, next) => {
    try {
      const commentId = parseInt(req.params.commentId);
      const includeUsers = req.query.include_users === 'true';
      const limit = parseInt(req.query.limit) || 50;
      const offset = parseInt(req.query.offset) || 0;

      // Check if comment exists
      const comment = await Comment.findById(commentId);
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
      const counts = await Reaction.getCommentReactionCounts(commentId);

      let reactions = null;
      if (includeUsers) {
        reactions = await Reaction.getCommentReactions(commentId, limit, offset);
      }

      res.json({
        success: true,
        data: {
          comment_id: commentId,
          total_reactions: counts.reduce((sum, count) => sum + parseInt(count.count), 0),
          reaction_counts: counts,
          reactions: reactions,
          detailed_reactions: reactions
        }
      });

    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/reactions/user/:userId
 * Get paginated reactions by a user
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

      // Support page parameter as well
      if (req.query.page) {
        const page = parseInt(req.query.page);
        offset = (page - 1) * limit;
      }

      // Check if user exists
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

      // Build query conditions
      let whereClause = 'r.user_id = $1';
      const params = [userId];
      let paramIndex = 2;

      if (type === 'post') {
        whereClause += ` AND r.post_id IS NOT NULL`;
      } else if (type === 'comment') {
        whereClause += ` AND r.comment_id IS NOT NULL`;
      }

      if (reactionType) {
        whereClause += ` AND r.emoji_name = $${paramIndex}`;
        params.push(reactionType);
        paramIndex++;
      }

      // Add limit and offset
      const limitClause = `LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      params.push(limit, offset);

      const query = `
        SELECT r.*,
               CASE
                 WHEN r.post_id IS NOT NULL THEN (
                   SELECT json_build_object(
                     'id', p.id,
                     'content', LEFT(p.content, 100),
                     'author', json_build_object(
                       'id', u.id,
                       'username', u.username,
                       'first_name', u.first_name,
                       'last_name', u.last_name
                     )
                   )
                   FROM posts p
                   JOIN users u ON p.user_id = u.id
                   WHERE p.id = r.post_id
                 )
                 ELSE NULL
               END as post_info,
               CASE
                 WHEN r.comment_id IS NOT NULL THEN (
                   SELECT json_build_object(
                     'id', c.id,
                     'content', LEFT(c.content, 100),
                     'author', json_build_object(
                       'id', u.id,
                       'username', u.username,
                       'first_name', u.first_name,
                       'last_name', u.last_name
                     )
                   )
                   FROM comments c
                   JOIN users u ON c.user_id = u.id
                   WHERE c.id = r.comment_id
                 )
                 ELSE NULL
               END as comment_info
        FROM reactions r
        WHERE ${whereClause}
        ORDER BY r.created_at DESC
        ${limitClause}
      `;

      const result = await Reaction.raw(query, params);

      // Process reactions to match expected format
      const processedReactions = result.rows.map(row => ({
        id: row.id,
        user_id: row.user_id,
        post_id: row.post_id,
        comment_id: row.comment_id,
        emoji_name: row.emoji_name,
        emoji_unicode: row.emoji_unicode,
        created_at: row.created_at,
        updated_at: row.updated_at,
        post: row.post_info,
        comment: row.comment_info
      }));

      res.json({
        success: true,
        data: {
          user: User.getPublicData(user),
          reactions: processedReactions,
          pagination: {
            limit,
            offset,
            current_page: Math.floor(offset / limit) + 1,
            has_more: processedReactions.length === limit
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
  authenticate,
  [
    param('id').isInt().withMessage('Reaction ID must be an integer')
  ],
  handleValidationErrors,
  async (req, res, next) => {
    try {
      const reactionId = parseInt(req.params.id);

      // Get reaction to check ownership
      const reaction = await Reaction.findById(reactionId);
      if (!reaction) {
        return res.status(404).json({
          success: false,
          error: {
            message: 'Reaction not found',
            type: 'NOT_FOUND'
          }
        });
      }

      // Check ownership (only reaction owner can delete)
      if (reaction.user_id !== req.user.id) {
        return res.status(403).json({
          success: false,
          error: {
            message: 'You can only delete your own reactions',
            type: 'AUTHORIZATION_ERROR'
          }
        });
      }

      // Delete the reaction
      await Reaction.delete(reactionId);

      // Get updated counts
      let counts = [];
      if (reaction.post_id) {
        counts = await Reaction.getPostReactionCounts(reaction.post_id);
      } else if (reaction.comment_id) {
        counts = await Reaction.getCommentReactionCounts(reaction.comment_id);
      }

      res.json({
        success: true,
        data: {
          reaction_counts: counts
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
 * Get list of available emojis
 */
router.get('/emoji-list', (req, res) => {
  const emojiList = [
    { name: 'like', unicode: '👍', display_name: 'Like' },
    { name: 'love', unicode: '❤️', display_name: 'Love' },
    { name: 'laugh', unicode: '😂', display_name: 'Laugh' },
    { name: 'wow', unicode: '😮', display_name: 'Wow' },
    { name: 'sad', unicode: '😢', display_name: 'Sad' },
    { name: 'angry', unicode: '😠', display_name: 'Angry' }
  ];

  res.json({
    success: true,
    data: {
      emojis: emojiList,
      total_count: emojiList.length,
      common_mappings: COMMON_EMOJIS
    }
  });
});

/**
 * GET /api/reactions/stats/popular
 * Get popular emoji statistics
 */
router.get('/stats/popular',
  [
    query('period').optional().isIn(['day', 'week', 'month', 'year']).withMessage('Period must be day, week, month, or year'),
    query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be 1-50')
  ],
  handleValidationErrors,
  async (req, res, next) => {
    try {
      const period = req.query.period || 'week';
      const limit = parseInt(req.query.limit) || 10;

      // Calculate date range
      let dateFrom;
      const now = new Date();
      switch (period) {
        case 'day':
          dateFrom = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          break;
        case 'week':
          dateFrom = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          dateFrom = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case 'year':
          dateFrom = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
          break;
      }

      const query = `
        SELECT emoji_name,
               COUNT(*) as usage_count,
               COUNT(DISTINCT user_id) as unique_users
        FROM reactions
        WHERE created_at >= $1
        GROUP BY emoji_name
        ORDER BY usage_count DESC
        LIMIT $2
      `;

      const result = await Reaction.raw(query, [dateFrom, limit]);

      // Calculate total count
      const totalCount = result.rows.reduce((sum, row) => sum + parseInt(row.usage_count), 0);

      // Format period display name
      const periodDisplay = {
        'day': 'Last 24 hours',
        'week': 'Last 7 days',
        'month': 'Last 30 days',
        'year': 'Last 365 days'
      }[period];

      res.json({
        success: true,
        data: {
          period: periodDisplay,
          popular_emojis: result.rows.map(row => ({
            emoji_name: row.emoji_name,
            usage_count: parseInt(row.usage_count),
            unique_users: parseInt(row.unique_users)
          })),
          total_count: totalCount
        }
      });

    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;