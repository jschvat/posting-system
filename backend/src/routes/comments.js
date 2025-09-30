/**
 * Comments routes for the social media platform API
 * Handles comments and nested replies on posts
 * Pure PostgreSQL implementation - NO SEQUELIZE
 */

const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const { authenticate } = require('../middleware/auth');

// Import PostgreSQL models
const User = require('../models/User');
const Post = require('../models/Post');
const Comment = require('../models/Comment');
const Media = require('../models/Media');
const Reaction = require('../models/Reaction');

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
 * GET /api/comments/post/:postId
 * Get all comments for a specific post in hierarchical structure
 */
router.get('/post/:postId',
  [
    param('postId').isInt({ min: 1 }).withMessage('Post ID must be a positive integer'),
    query('sort').optional().isIn(['newest', 'oldest']).withMessage('Sort must be newest or oldest'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer')
  ],
  handleValidationErrors,
  async (req, res, next) => {
    try {
      const postId = parseInt(req.params.postId);
      const sort = req.query.sort || 'oldest';
      const limit = parseInt(req.query.limit) || 10;
      const page = parseInt(req.query.page) || 1;
      const offset = (page - 1) * limit;

      // Verify post exists
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

      // Get total count of top-level comments for this post
      const totalCountResult = await Comment.raw(
        `SELECT COUNT(*) as total_count
         FROM comments c
         WHERE c.post_id = $1 AND c.is_published = true AND c.parent_id IS NULL`,
        [postId]
      );
      const totalCount = parseInt(totalCountResult.rows[0].total_count);

      // Get all comments for the post with author and reaction data
      const orderDirection = sort === 'newest' ? 'DESC' : 'ASC';

      // Get paginated comments for the post with media info (only top-level comments)
      const commentsResult = await Comment.raw(
        `SELECT c.*,
                u.username, u.first_name, u.last_name, u.avatar_url,
                m.id as media_id, m.filename, m.mime_type, m.file_size
         FROM comments c
         LEFT JOIN users u ON c.user_id = u.id
         LEFT JOIN media m ON c.id = m.comment_id
         WHERE c.post_id = $1 AND c.is_published = true AND c.parent_id IS NULL
         ORDER BY c.created_at ${orderDirection}
         LIMIT $2 OFFSET $3`,
        [postId, limit, offset]
      );

      // Get all replies for the returned top-level comments
      const commentIds = commentsResult.rows.map(c => c.id);
      let repliesResult = { rows: [] };
      if (commentIds.length > 0) {
        repliesResult = await Comment.raw(
          `SELECT c.*,
                  u.username, u.first_name, u.last_name, u.avatar_url,
                  m.id as media_id, m.filename, m.mime_type, m.file_size
           FROM comments c
           LEFT JOIN users u ON c.user_id = u.id
           LEFT JOIN media m ON c.id = m.comment_id
           WHERE c.parent_id = ANY($1) AND c.is_published = true
           ORDER BY c.created_at ${orderDirection}`,
          [commentIds]
        );
      }

      // Combine comments and replies
      const allComments = [...commentsResult.rows, ...repliesResult.rows];

      // Get all comment IDs (including replies) for bulk reaction query
      const allCommentIds = allComments.map(comment => comment.id);

      // Get all reaction counts in a single optimized query
      let reactionCountsMap = new Map();
      if (allCommentIds.length > 0) {
        const reactionsResult = await Comment.raw(
          `SELECT comment_id, emoji_name, COUNT(*) as count
           FROM reactions
           WHERE comment_id = ANY($1)
           GROUP BY comment_id, emoji_name
           ORDER BY comment_id, count DESC`,
          [allCommentIds]
        );

        // Build reaction counts map
        reactionsResult.rows.forEach(row => {
          const commentId = row.comment_id;
          if (!reactionCountsMap.has(commentId)) {
            reactionCountsMap.set(commentId, []);
          }
          reactionCountsMap.get(commentId).push({
            emoji_name: row.emoji_name,
            count: parseInt(row.count)
          });
        });
      }

      // Build hierarchical comment tree
      const commentMap = new Map();
      const rootComments = [];

      // Process comments and add reaction data
      const processedComments = allComments.map(comment => {
        const commentData = Comment.getCommentData(comment);

        // Add reaction counts from our bulk query
        commentData.reaction_counts = reactionCountsMap.get(comment.id) || [];
        commentData.replies = [];
        return commentData;
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

      // Calculate pagination info
      const totalPages = Math.ceil(totalCount / limit);
      const hasNextPage = page < totalPages;
      const hasPrevPage = page > 1;

      res.json({
        success: true,
        data: {
          post_id: postId,
          comments: rootComments,
          total_count: totalCount,
          sort,
          pagination: {
            current_page: page,
            total_pages: totalPages,
            total_count: totalCount,
            limit,
            has_next_page: hasNextPage,
            has_prev_page: hasPrevPage
          }
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
      const commentId = parseInt(req.params.id);

      // Find comment with media and user associations
      const commentResult = await Comment.raw(
        `SELECT c.*,
                u.username, u.first_name, u.last_name, u.avatar_url,
                m.id as media_id, m.filename, m.mime_type, m.file_size
         FROM comments c
         LEFT JOIN users u ON c.user_id = u.id
         LEFT JOIN media m ON c.id = m.comment_id
         WHERE c.id = $1`,
        [commentId]
      );

      if (commentResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: {
            message: 'Comment not found',
            type: 'NOT_FOUND'
          }
        });
      }

      const comment = commentResult.rows[0];
      const commentData = Comment.getCommentData(comment);

      // Get reaction counts separately
      try {
        const reactionCounts = await Reaction.getCommentReactionCounts(comment.id);
        commentData.reaction_counts = reactionCounts;
      } catch (error) {
        commentData.reaction_counts = [];
      }

      // Get replies separately
      try {
        const replies = await Comment.getReplies(comment.id);
        commentData.replies = replies;
      } catch (error) {
        commentData.replies = [];
      }

      res.json({
        success: true,
        data: commentData
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
  authenticate,
  [
    body('post_id').isInt({ min: 1 }).withMessage('Post ID is required and must be a positive integer'),
    body('content').trim().isLength({ min: 1, max: 2000 }).withMessage('Content must be between 1 and 2000 characters'),
    body('parent_id').optional().isInt({ min: 1 }).withMessage('Parent ID must be a positive integer')
  ],
  handleValidationErrors,
  async (req, res, next) => {
    try {
      const { post_id, content, parent_id } = req.body;
      const user_id = req.user.id; // Get user from authentication

      // Verify post exists
      const post = await Post.findById(post_id);
      if (!post) {
        return res.status(404).json({
          success: false,
          error: {
            message: 'Post not found',
            type: 'NOT_FOUND'
          }
        });
      }

      // If parent_id is provided, verify parent comment exists and belongs to same post
      if (parent_id) {
        const parentComment = await Comment.findById(parent_id);
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
      const commentResult = await Comment.raw(
        `SELECT c.*, u.username, u.first_name, u.last_name, u.avatar_url
         FROM comments c
         LEFT JOIN users u ON c.user_id = u.id
         WHERE c.id = $1`,
        [comment.id]
      );

      const newComment = Comment.getCommentData(commentResult.rows[0]);

      res.status(201).json({
        success: true,
        data: newComment,
        message: parent_id ? 'Reply created successfully' : 'Comment created successfully'
      });

    } catch (error) {
      console.error('Comment creation error:', error);

      // Handle specific validation errors
      if (error.message.includes('Maximum comment nesting depth exceeded')) {
        return res.status(400).json({
          success: false,
          error: {
            message: error.message,
            type: 'MAX_DEPTH_EXCEEDED'
          }
        });
      }

      if (error.message.includes('Parent comment must belong to the same post')) {
        return res.status(400).json({
          success: false,
          error: {
            message: error.message,
            type: 'INVALID_PARENT'
          }
        });
      }

      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to create comment',
          type: 'INTERNAL_ERROR',
          details: error.message
        }
      });
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
      const commentId = parseInt(req.params.id);
      const { content } = req.body;

      // Find the comment
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

      // Update comment content
      const updatedComment = await Comment.update(commentId, { content });

      // Fetch updated comment with author info
      const commentResult = await Comment.raw(
        `SELECT c.*, u.username, u.first_name, u.last_name, u.avatar_url
         FROM comments c
         LEFT JOIN users u ON c.user_id = u.id
         WHERE c.id = $1`,
        [commentId]
      );

      res.json({
        success: true,
        data: Comment.getCommentData(commentResult.rows[0]),
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
      const commentId = parseInt(req.params.id);

      // Find the comment
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

      // Count replies that will be deleted
      const replyCountResult = await Comment.raw(
        'SELECT COUNT(*) as count FROM comments WHERE parent_id = $1',
        [commentId]
      );
      const replyCount = parseInt(replyCountResult.rows[0].count);

      // Delete the comment (cascading deletes will handle replies and reactions)
      await Comment.delete(commentId);

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
      const commentId = parseInt(req.params.id);
      const sort = req.query.sort || 'oldest';
      const limit = parseInt(req.query.limit) || 20;

      // Verify parent comment exists
      const parentComment = await Comment.findById(commentId);
      if (!parentComment) {
        return res.status(404).json({
          success: false,
          error: {
            message: 'Comment not found',
            type: 'NOT_FOUND'
          }
        });
      }

      // Get replies with proper sorting and media
      const orderDirection = sort === 'newest' ? 'DESC' : 'ASC';
      const repliesResult = await Comment.raw(
        `SELECT c.*,
                u.username, u.first_name, u.last_name, u.avatar_url,
                m.id as media_id, m.filename, m.mime_type, m.file_size
         FROM comments c
         LEFT JOIN users u ON c.user_id = u.id
         LEFT JOIN media m ON c.id = m.comment_id
         WHERE c.parent_id = $1 AND c.is_published = true
         ORDER BY c.created_at ${orderDirection}
         LIMIT $2`,
        [commentId, limit]
      );

      // Get all reply IDs for bulk reaction query
      const replyIds = repliesResult.rows.map(comment => comment.id);

      // Get all reaction counts in a single optimized query
      let reactionCountsMap = new Map();
      if (replyIds.length > 0) {
        const reactionsResult = await Comment.raw(
          `SELECT comment_id, emoji_name, COUNT(*) as count
           FROM reactions
           WHERE comment_id = ANY($1)
           GROUP BY comment_id, emoji_name
           ORDER BY comment_id, count DESC`,
          [replyIds]
        );

        // Build reaction counts map
        reactionsResult.rows.forEach(row => {
          const commentId = row.comment_id;
          if (!reactionCountsMap.has(commentId)) {
            reactionCountsMap.set(commentId, []);
          }
          reactionCountsMap.get(commentId).push({
            emoji_name: row.emoji_name,
            count: parseInt(row.count)
          });
        });
      }

      // Process replies to include reaction counts
      const processedReplies = repliesResult.rows.map(comment => {
        const reply = Comment.getCommentData(comment);
        // Add reaction counts from our bulk query
        reply.reaction_counts = reactionCountsMap.get(comment.id) || [];
        return reply;
      });

      res.json({
        success: true,
        data: {
          parent_comment_id: commentId,
          replies: processedReplies,
          total_count: processedReplies.length,
          sort
        }
      });

    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;