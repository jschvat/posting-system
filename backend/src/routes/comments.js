/**
 * Comments routes for the social media platform API
 * Handles comments and nested replies on posts
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
 * GET /api/comments/post/:postId
 * Get all comments for a specific post in hierarchical structure
 */
router.get('/post/:postId',
  [
    param('postId').isInt({ min: 1 }).withMessage('Post ID must be a positive integer'),
    query('sort').optional().isIn(['newest', 'oldest']).withMessage('Sort must be newest or oldest'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100')
  ],
  handleValidationErrors,
  async (req, res, next) => {
    try {
      const { User, Post, Comment, Media, Reaction } = getModels();
      const postId = parseInt(req.params.postId);
      const sort = req.query.sort || 'oldest';
      const limit = parseInt(req.query.limit) || 50;

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

      // Get all comments for the post
      const orderClause = sort === 'newest'
        ? [['created_at', 'DESC']]
        : [['created_at', 'ASC']];

      const comments = await Comment.findAll({
        where: {
          post_id: postId,
          is_published: true
        },
        limit,
        order: orderClause,
        include: [
          {
            model: User,
            as: 'author',
            attributes: ['id', 'username', 'first_name', 'last_name', 'avatar_url']
          },
          {
            model: Media,
            as: 'media',
            required: false
          },
          {
            model: Reaction,
            as: 'reactions',
            required: false,
            attributes: ['emoji_name', 'emoji_unicode'],
            include: [{
              model: User,
              as: 'user',
              attributes: ['id', 'username']
            }]
          }
        ]
      });

      // Build hierarchical comment tree
      const commentMap = new Map();
      const rootComments = [];

      // Process comments to include reaction counts and prepare for tree building
      const processedComments = comments.map(comment => {
        const commentJson = comment.toJSON();

        // Group reactions by emoji and count them
        const reactionCounts = {};
        if (commentJson.reactions) {
          commentJson.reactions.forEach(reaction => {
            const key = reaction.emoji_name;
            if (!reactionCounts[key]) {
              reactionCounts[key] = {
                emoji_name: reaction.emoji_name,
                emoji_unicode: reaction.emoji_unicode,
                count: 0,
                users: []
              };
            }
            reactionCounts[key].count++;
            reactionCounts[key].users.push(reaction.user);
          });
        }

        commentJson.reaction_counts = Object.values(reactionCounts);
        commentJson.replies = [];
        delete commentJson.reactions;

        return commentJson;
      });

      // Create map of all comments
      processedComments.forEach(comment => {
        commentMap.set(comment.id, comment);
      });

      // Build parent-child relationships
      processedComments.forEach(comment => {
        if (comment.parent_id) {
          const parent = commentMap.get(comment.parent_id);
          if (parent) {
            parent.replies.push(comment);
          }
        } else {
          rootComments.push(comment);
        }
      });

      // Sort replies recursively if needed
      const sortReplies = (comments) => {
        comments.forEach(comment => {
          if (comment.replies.length > 0) {
            comment.replies.sort((a, b) => {
              const dateA = new Date(a.created_at);
              const dateB = new Date(b.created_at);
              return sort === 'newest' ? dateB - dateA : dateA - dateB;
            });
            sortReplies(comment.replies);
          }
        });
      };

      sortReplies(rootComments);

      res.json({
        success: true,
        data: {
          post_id: postId,
          comments: rootComments,
          total_count: comments.length,
          sort
        }
      });

    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/comments/:id
 * Get a single comment by ID with replies
 */
router.get('/:id',
  [
    param('id').isInt({ min: 1 }).withMessage('Comment ID must be a positive integer')
  ],
  handleValidationErrors,
  async (req, res, next) => {
    try {
      const { User, Comment, Media, Reaction } = getModels();
      const commentId = parseInt(req.params.id);

      // Find comment with all associations
      const comment = await Comment.findByPk(commentId, {
        include: [
          {
            model: User,
            as: 'author',
            attributes: ['id', 'username', 'first_name', 'last_name', 'avatar_url']
          },
          {
            model: Media,
            as: 'media',
            required: false
          },
          {
            model: Comment,
            as: 'replies',
            required: false,
            where: { is_published: true },
            include: [
              {
                model: User,
                as: 'author',
                attributes: ['id', 'username', 'first_name', 'last_name', 'avatar_url']
              },
              {
                model: Media,
                as: 'media',
                required: false
              }
            ]
          },
          {
            model: Reaction,
            as: 'reactions',
            required: false,
            include: [{
              model: User,
              as: 'user',
              attributes: ['id', 'username']
            }]
          }
        ]
      });

      if (!comment) {
        return res.status(404).json({
          success: false,
          error: {
            message: 'Comment not found',
            type: 'NOT_FOUND'
          }
        });
      }

      // Process comment data
      const commentJson = comment.toJSON();

      // Group reactions by emoji and count them
      const reactionCounts = {};
      if (commentJson.reactions) {
        commentJson.reactions.forEach(reaction => {
          const key = reaction.emoji_name;
          if (!reactionCounts[key]) {
            reactionCounts[key] = {
              emoji_name: reaction.emoji_name,
              emoji_unicode: reaction.emoji_unicode,
              count: 0,
              users: []
            };
          }
          reactionCounts[key].count++;
          reactionCounts[key].users.push(reaction.user);
        });
      }

      commentJson.reaction_counts = Object.values(reactionCounts);
      delete commentJson.reactions;

      res.json({
        success: true,
        data: commentJson
      });

    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/comments
 * Create a new comment or reply
 */
router.post('/',
  [
    body('post_id').isInt({ min: 1 }).withMessage('Post ID is required and must be a positive integer'),
    body('user_id').isInt({ min: 1 }).withMessage('User ID is required and must be a positive integer'),
    body('content').trim().isLength({ min: 1, max: 2000 }).withMessage('Content must be between 1 and 2000 characters'),
    body('parent_id').optional().isInt({ min: 1 }).withMessage('Parent ID must be a positive integer')
  ],
  handleValidationErrors,
  async (req, res, next) => {
    try {
      const { User, Post, Comment } = getModels();
      const { post_id, user_id, content, parent_id } = req.body;

      // Verify post exists
      const post = await Post.findByPk(post_id);
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

      // If parent_id is provided, verify parent comment exists and belongs to same post
      if (parent_id) {
        const parentComment = await Comment.findByPk(parent_id);
        if (!parentComment) {
          return res.status(404).json({
            success: false,
            error: {
              message: 'Parent comment not found',
              type: 'NOT_FOUND'
            }
          });
        }
        if (parentComment.post_id !== post_id) {
          return res.status(400).json({
            success: false,
            error: {
              message: 'Parent comment must belong to the same post',
              type: 'INVALID_PARENT'
            }
          });
        }

        // Check nesting depth
        const depth = await Comment.getCommentDepth(parent_id);
        if (depth >= 5) {
          return res.status(400).json({
            success: false,
            error: {
              message: 'Maximum comment nesting depth exceeded (5 levels)',
              type: 'MAX_DEPTH_EXCEEDED'
            }
          });
        }
      }

      // Create the comment
      const comment = await Comment.create({
        post_id,
        user_id,
        parent_id,
        content
      });

      // Fetch the comment with author info
      const newComment = await Comment.findByPk(comment.id, {
        include: [{
          model: User,
          as: 'author',
          attributes: ['id', 'username', 'first_name', 'last_name', 'avatar_url']
        }]
      });

      res.status(201).json({
        success: true,
        data: newComment,
        message: parent_id ? 'Reply created successfully' : 'Comment created successfully'
      });

    } catch (error) {
      next(error);
    }
  }
);

/**
 * PUT /api/comments/:id
 * Update a comment
 */
router.put('/:id',
  [
    param('id').isInt({ min: 1 }).withMessage('Comment ID must be a positive integer'),
    body('content').trim().isLength({ min: 1, max: 2000 }).withMessage('Content must be between 1 and 2000 characters')
  ],
  handleValidationErrors,
  async (req, res, next) => {
    try {
      const { User, Comment } = getModels();
      const commentId = parseInt(req.params.id);
      const { content } = req.body;

      // Find the comment
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

      // Check if user can edit this comment (TODO: Implement proper authentication)
      // For now, assume any user can edit any comment (will be fixed with authentication)

      // Update comment content
      await comment.update({ content });

      // Fetch updated comment with author info
      const updatedComment = await Comment.findByPk(commentId, {
        include: [{
          model: User,
          as: 'author',
          attributes: ['id', 'username', 'first_name', 'last_name', 'avatar_url']
        }]
      });

      res.json({
        success: true,
        data: updatedComment,
        message: 'Comment updated successfully'
      });

    } catch (error) {
      next(error);
    }
  }
);

/**
 * DELETE /api/comments/:id
 * Delete a comment and all its replies
 */
router.delete('/:id',
  [
    param('id').isInt({ min: 1 }).withMessage('Comment ID must be a positive integer')
  ],
  handleValidationErrors,
  async (req, res, next) => {
    try {
      const { Comment } = getModels();
      const commentId = parseInt(req.params.id);

      // Find the comment
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

      // Check if user can delete this comment (TODO: Implement proper authentication)
      // For now, assume any user can delete any comment (will be fixed with authentication)

      // Count replies that will be deleted
      const replyCount = await Comment.count({
        where: { parent_id: commentId }
      });

      // Delete the comment (cascading deletes will handle replies and reactions)
      await comment.destroy();

      res.json({
        success: true,
        message: `Comment deleted successfully${replyCount > 0 ? ` along with ${replyCount} replies` : ''}`
      });

    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/comments/:id/replies
 * Get all replies for a specific comment
 */
router.get('/:id/replies',
  [
    param('id').isInt({ min: 1 }).withMessage('Comment ID must be a positive integer'),
    query('sort').optional().isIn(['newest', 'oldest']).withMessage('Sort must be newest or oldest'),
    query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50')
  ],
  handleValidationErrors,
  async (req, res, next) => {
    try {
      const { User, Comment, Media, Reaction } = getModels();
      const commentId = parseInt(req.params.id);
      const sort = req.query.sort || 'oldest';
      const limit = parseInt(req.query.limit) || 20;

      // Verify parent comment exists
      const parentComment = await Comment.findByPk(commentId);
      if (!parentComment) {
        return res.status(404).json({
          success: false,
          error: {
            message: 'Comment not found',
            type: 'NOT_FOUND'
          }
        });
      }

      // Get replies
      const orderClause = sort === 'newest'
        ? [['created_at', 'DESC']]
        : [['created_at', 'ASC']];

      const replies = await Comment.findAll({
        where: {
          parent_id: commentId,
          is_published: true
        },
        limit,
        order: orderClause,
        include: [
          {
            model: User,
            as: 'author',
            attributes: ['id', 'username', 'first_name', 'last_name', 'avatar_url']
          },
          {
            model: Media,
            as: 'media',
            required: false
          },
          {
            model: Reaction,
            as: 'reactions',
            required: false,
            attributes: ['emoji_name', 'emoji_unicode']
          }
        ]
      });

      // Process replies to include reaction counts
      const processedReplies = replies.map(reply => {
        const replyJson = reply.toJSON();
        const reactionCounts = {};

        if (replyJson.reactions) {
          replyJson.reactions.forEach(reaction => {
            const key = reaction.emoji_name;
            if (!reactionCounts[key]) {
              reactionCounts[key] = {
                emoji_name: reaction.emoji_name,
                emoji_unicode: reaction.emoji_unicode,
                count: 0
              };
            }
            reactionCounts[key].count++;
          });
        }

        replyJson.reaction_counts = Object.values(reactionCounts);
        delete replyJson.reactions;
        return replyJson;
      });

      res.json({
        success: true,
        data: {
          parent_comment_id: commentId,
          replies: processedReplies,
          total_count: replies.length,
          sort
        }
      });

    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;