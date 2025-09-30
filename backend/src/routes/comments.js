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
const CommentInteraction = require('../models/CommentInteraction');
const CommentMetrics = require('../models/CommentMetrics');

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

      // Get ALL nested replies for the returned top-level comments using recursive CTE
      const commentIds = commentsResult.rows.map(c => c.id);
      let repliesResult = { rows: [] };
      if (commentIds.length > 0) {
        repliesResult = await Comment.raw(
          `WITH RECURSIVE comment_replies AS (
            -- Base case: direct replies to top-level comments
            SELECT c.*,
                   u.username, u.first_name, u.last_name, u.avatar_url,
                   m.id as media_id, m.filename, m.mime_type, m.file_size,
                   1 as depth_level
            FROM comments c
            LEFT JOIN users u ON c.user_id = u.id
            LEFT JOIN media m ON c.id = m.comment_id
            WHERE c.parent_id = ANY($1) AND c.is_published = true

            UNION ALL

            -- Recursive case: replies to replies
            SELECT c.*,
                   u.username, u.first_name, u.last_name, u.avatar_url,
                   m.id as media_id, m.filename, m.mime_type, m.file_size,
                   cr.depth_level + 1
            FROM comments c
            JOIN comment_replies cr ON c.parent_id = cr.id
            LEFT JOIN users u ON c.user_id = u.id
            LEFT JOIN media m ON c.id = m.comment_id
            WHERE c.is_published = true AND cr.depth_level < 10
          )
          SELECT * FROM comment_replies ORDER BY created_at ${orderDirection}`,
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
 * GET /api/comments/post/:postId/hierarchical
 * Enhanced hierarchical comment loading with algorithm support
 * Loads complete comment trees with all nested replies per batch
 */
router.get('/post/:postId/hierarchical',
  [
    param('postId').isInt({ min: 1 }).withMessage('Post ID must be a positive integer'),
    query('sort').optional().isIn(['newest', 'oldest', 'hot', 'trending', 'best']).withMessage('Sort must be newest, oldest, hot, trending, or best'),
    query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50'),
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('max_depth').optional().isInt({ min: 1, max: 10 }).withMessage('Max depth must be between 1 and 10'),
    query('load_all_replies').optional().isBoolean().withMessage('Load all replies must be true or false')
  ],
  handleValidationErrors,
  async (req, res, next) => {
    try {
      const postId = parseInt(req.params.postId);
      const sort = req.query.sort || 'oldest';
      const limit = parseInt(req.query.limit) || 10;
      const page = parseInt(req.query.page) || 1;
      const maxDepth = parseInt(req.query.max_depth) || 5;
      const loadAllReplies = req.query.load_all_replies === 'true';
      const offset = (page - 1) * limit;

      // Track this as a view interaction for the post
      const userAgent = req.get('User-Agent');
      const ipAddress = req.ip;
      const sessionId = req.sessionID || `anon_${Date.now()}_${Math.random()}`;

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

      // Get total count of top-level comments
      const totalCountResult = await Comment.raw(
        `SELECT COUNT(*) as total_count
         FROM comments c
         WHERE c.post_id = $1 AND c.is_published = true AND c.parent_id IS NULL`,
        [postId]
      );
      const totalCount = parseInt(totalCountResult.rows[0].total_count);

      // Algorithm-based sorting - always include metrics join
      let orderClause = 'ORDER BY c.created_at ASC';

      switch (sort) {
        case 'newest':
          orderClause = 'ORDER BY c.created_at DESC';
          break;
        case 'oldest':
          orderClause = 'ORDER BY c.created_at ASC';
          break;
        case 'hot':
        case 'trending':
        case 'best':
          const scoreColumn = sort === 'hot' || sort === 'trending' ? 'combined_algorithm_score' :
                              sort === 'best' ? 'engagement_score' : 'combined_algorithm_score';
          orderClause = `ORDER BY cm.${scoreColumn} DESC NULLS LAST, c.created_at DESC`;
          break;
      }

      // Simplified two-step approach for reliability
      // Step 1: Get paginated top-level comments with metrics
      const topLevelQuery = `
        SELECT
          c.*,
          u.username, u.first_name, u.last_name, u.avatar_url,
          m.id as media_id, m.filename, m.mime_type, m.file_size,
          COALESCE(cm.view_count, 0) as view_count,
          COALESCE(cm.reply_count, 0) as metric_reply_count,
          COALESCE(cm.reaction_count, 0) as metric_reaction_count,
          COALESCE(cm.combined_algorithm_score, 0) as algorithm_score
        FROM comments c
        LEFT JOIN users u ON c.user_id = u.id
        LEFT JOIN media m ON c.id = m.comment_id
        LEFT JOIN comment_metrics cm ON c.id = cm.comment_id
        WHERE c.post_id = $1 AND c.is_published = true AND c.parent_id IS NULL
        ${orderClause}
        LIMIT $2 OFFSET $3`;

      const commentsResult = await Comment.raw(topLevelQuery, [
        postId,
        limit,
        offset
      ]);

      // Step 2: Get all replies for the returned top-level comments
      const topLevelCommentIds = commentsResult.rows.map(c => c.id);
      let repliesResult = { rows: [] };

      if (topLevelCommentIds.length > 0 && (loadAllReplies || maxDepth > 1)) {
        const repliesQuery = `
          WITH RECURSIVE comment_replies AS (
            -- Base case: direct replies
            SELECT
              c.*,
              u.username, u.first_name, u.last_name, u.avatar_url,
              m.id as media_id, m.filename, m.mime_type, m.file_size,
              COALESCE(cm.view_count, 0) as view_count,
              COALESCE(cm.reply_count, 0) as metric_reply_count,
              COALESCE(cm.reaction_count, 0) as metric_reaction_count,
              COALESCE(cm.combined_algorithm_score, 0) as algorithm_score,
              1 as depth
            FROM comments c
            LEFT JOIN users u ON c.user_id = u.id
            LEFT JOIN media m ON c.id = m.comment_id
            LEFT JOIN comment_metrics cm ON c.id = cm.comment_id
            WHERE c.parent_id = ANY($1) AND c.is_published = true

            UNION ALL

            -- Recursive case: nested replies
            SELECT
              c.*,
              u.username, u.first_name, u.last_name, u.avatar_url,
              m.id as media_id, m.filename, m.mime_type, m.file_size,
              COALESCE(cm.view_count, 0) as view_count,
              COALESCE(cm.reply_count, 0) as metric_reply_count,
              COALESCE(cm.reaction_count, 0) as metric_reaction_count,
              COALESCE(cm.combined_algorithm_score, 0) as algorithm_score,
              cr.depth + 1
            FROM comments c
            JOIN comment_replies cr ON c.parent_id = cr.id
            LEFT JOIN users u ON c.user_id = u.id
            LEFT JOIN media m ON c.id = m.comment_id
            LEFT JOIN comment_metrics cm ON c.id = cm.comment_id
            WHERE c.is_published = true
            AND (cr.depth < $2 OR $3 = true)
          )
          SELECT * FROM comment_replies ORDER BY created_at ASC
        `;

        repliesResult = await Comment.raw(repliesQuery, [
          topLevelCommentIds,
          maxDepth - 1,
          loadAllReplies
        ]);
      }

      // Combine comments and replies
      const allComments = [...commentsResult.rows, ...repliesResult.rows];

      // Get all comment IDs for bulk reaction query
      const allCommentIds = allComments.map(comment => comment.id);

      // Get reaction counts in bulk
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

      // Build hierarchical structure from flat recursive result
      const commentMap = new Map();
      const rootComments = [];

      // Process all comments and add enhanced data
      const processedComments = allComments.map(comment => {
        const commentData = Comment.getCommentData(comment);

        // Add enhanced metrics
        commentData.metrics = {
          view_count: comment.view_count || 0,
          reply_count: comment.metric_reply_count || 0,
          reaction_count: comment.metric_reaction_count || 0,
          algorithm_score: parseFloat(comment.algorithm_score) || 0
        };

        commentData.reaction_counts = reactionCountsMap.get(comment.id) || [];
        commentData.replies = [];
        commentData.depth = comment.depth || 0;

        return commentData;
      });

      // Build the tree structure
      processedComments.forEach(comment => {
        commentMap.set(comment.id, comment);
      });

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

      // Track views for all loaded comments (async, non-blocking)
      setImmediate(async () => {
        try {
          for (const commentId of allCommentIds) {
            await CommentInteraction.trackView(commentId, {
              user_id: req.user?.id || null,
              session_id: sessionId,
              ip_address: ipAddress,
              user_agent: userAgent
            });
          }
        } catch (error) {
          console.error('Error tracking comment views:', error);
        }
      });

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
          algorithm_metadata: {
            sort_method: sort,
            max_depth: maxDepth,
            load_all_replies: loadAllReplies,
            interaction_tracking: true
          },
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
      console.error('Hierarchical comment loading error:', error);
      next(error);
    }
  }
);

/**
 * POST /api/comments/track-interaction
 * Track user interactions with comments for algorithm support
 */
router.post('/track-interaction',
  [
    body('comment_id').isInt({ min: 1 }).withMessage('Comment ID is required and must be a positive integer'),
    body('interaction_type').isIn(['view', 'reply', 'reaction', 'share', 'deep_read', 'quote'])
      .withMessage('Invalid interaction type'),
    body('metadata').optional().isObject().withMessage('Metadata must be an object')
  ],
  handleValidationErrors,
  async (req, res, next) => {
    try {
      const { comment_id, interaction_type, metadata = {} } = req.body;
      const userAgent = req.get('User-Agent');
      const ipAddress = req.ip;
      const sessionId = req.sessionID || `anon_${Date.now()}_${Math.random()}`;

      // Verify comment exists
      const comment = await Comment.findById(comment_id);
      if (!comment) {
        return res.status(404).json({
          success: false,
          error: {
            message: 'Comment not found',
            type: 'NOT_FOUND'
          }
        });
      }

      // Track the interaction
      const interaction = await CommentInteraction.create({
        comment_id,
        interaction_type,
        user_id: req.user?.id || null,
        session_id: sessionId,
        ip_address: ipAddress,
        user_agent: userAgent,
        metadata
      });

      res.json({
        success: true,
        data: {
          interaction_id: interaction.id,
          message: 'Interaction tracked successfully'
        }
      });

    } catch (error) {
      console.error('Interaction tracking error:', error);
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