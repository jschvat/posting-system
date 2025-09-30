/**
 * Posts routes for the social media platform API
 * Handles CRUD operations for posts including creation, reading, updating, and deletion
 * Pure PostgreSQL implementation - NO SEQUELIZE
 */

const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const {
  authenticate,
  optionalAuthenticate,
  requireModifyPermission
} = require('../middleware/auth');

// Import PostgreSQL models
const Post = require('../models/Post');
const User = require('../models/User');
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
 * GET /api/posts
 * Get all posts with pagination, filtering, and sorting
 */
router.get('/',
  optionalAuthenticate, // Optional authentication to show appropriate content
  [
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    query('sort').optional().isIn(['newest', 'oldest']).withMessage('Sort must be newest or oldest'),
    query('privacy').optional().isIn(['public', 'friends', 'private']).withMessage('Invalid privacy level'),
    query('user_id').optional().isInt({ min: 1 }).withMessage('User ID must be a positive integer')
  ],
  handleValidationErrors,
  async (req, res, next) => {
    try {
      // Using PostgreSQL models directly

      // Parse query parameters with defaults
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const offset = (page - 1) * limit;
      const sort = req.query.sort || 'newest';
      const privacy = req.query.privacy;
      const userId = req.query.user_id;

      // Privacy and filtering logic will be handled in SQL query below

      // Build SQL query with proper WHERE clause
      let sql = `SELECT p.*,
                        u.username, u.first_name, u.last_name, u.avatar_url,
                        COUNT(*) OVER() as total_count,
                        COALESCE(reaction_counts.reactions, '[]'::json) as reactions,
                        (
                          SELECT COUNT(*)
                          FROM comments c
                          WHERE c.post_id = p.id AND c.is_published = true
                        ) as comment_count
                 FROM posts p
                 LEFT JOIN users u ON p.user_id = u.id
                 LEFT JOIN (
                   SELECT post_id,
                          json_agg(
                            json_build_object(
                              'emoji_name', emoji_name,
                              'emoji_unicode', emoji_unicode,
                              'count', count
                            )
                          ) as reactions
                   FROM (
                     SELECT post_id, emoji_name, emoji_unicode, COUNT(*) as count
                     FROM reactions
                     WHERE post_id IS NOT NULL
                     GROUP BY post_id, emoji_name, emoji_unicode
                   ) grouped_reactions
                   GROUP BY post_id
                 ) reaction_counts ON p.id = reaction_counts.post_id
                 WHERE p.is_published = true`;

      const params = [];
      let paramIndex = 1;

      // Add privacy filter
      if (!req.user) {
        sql += ` AND p.privacy_level = 'public'`;
      } else if (privacy) {
        sql += ` AND p.privacy_level = $${paramIndex}`;
        params.push(privacy);
        paramIndex++;
      } else {
        // For authenticated users, show public posts + their own private/friends posts
        sql += ` AND (p.privacy_level = 'public' OR p.user_id = $${paramIndex})`;
        params.push(req.user.id);
        paramIndex++;
      }

      // Add user filter
      if (userId) {
        sql += ` AND p.user_id = $${paramIndex}`;
        params.push(userId);
        paramIndex++;
      }

      // Add ordering
      const orderDirection = sort === 'newest' ? 'DESC' : 'ASC';
      sql += ` ORDER BY p.created_at ${orderDirection}`;

      // Add pagination
      sql += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      params.push(limit, offset);

      const postsResult = await Post.raw(sql, params);
      const posts = postsResult.rows;
      const count = posts.length > 0 ? parseInt(posts[0].total_count) : 0;

      // Process posts to standardize data format
      const processedPosts = posts.map(post => ({
        id: post.id,
        content: post.content,
        privacy_level: post.privacy_level,
        is_published: post.is_published,
        views_count: post.views_count || 0,
        created_at: post.created_at,
        updated_at: post.updated_at,
        user_id: post.user_id,
        author: {
          id: post.user_id,
          username: post.username,
          first_name: post.first_name,
          last_name: post.last_name,
          avatar_url: post.avatar_url
        },
        reaction_counts: post.reactions || [],
        comment_count: parseInt(post.comment_count) || 0
      }));

      // Calculate pagination info
      const totalPages = Math.ceil(count / limit);
      const hasNextPage = page < totalPages;
      const hasPrevPage = page > 1;

      res.json({
        success: true,
        data: {
          posts: processedPosts,
          pagination: {
            current_page: page,
            total_pages: totalPages,
            total_count: count,
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
 * GET /api/posts/:id
 * Get a single post by ID with all details
 */
router.get('/:id',
  optionalAuthenticate, // Optional authentication for privacy checks
  [
    param('id').isInt({ min: 1 }).withMessage('Post ID must be a positive integer')
  ],
  handleValidationErrors,
  async (req, res, next) => {
    try {
      // Using PostgreSQL models directly
      const postId = parseInt(req.params.id);

      // Find post with author information, comments, and media using raw SQL
      const postResult = await Post.raw(
        `SELECT p.*,
                u.username, u.first_name, u.last_name, u.avatar_url
         FROM posts p
         LEFT JOIN users u ON p.user_id = u.id
         WHERE p.id = $1`,
        [postId]
      );

      const post = postResult.rows[0] || null;

      if (!post) {
        return res.status(404).json({
          success: false,
          error: {
            message: 'Post not found',
            type: 'NOT_FOUND'
          }
        });
      }

      // Check if post is published
      if (!post.is_published && (!req.user || post.user_id !== req.user.id)) {
        return res.status(403).json({
          success: false,
          error: {
            message: 'Access denied',
            type: 'AUTHORIZATION_ERROR'
          }
        });
      }

      // Check if user can view this post
      if (post.privacy_level === 'private' && (!req.user || post.user_id !== req.user.id)) {
        return res.status(403).json({
          success: false,
          error: {
            message: 'Access denied',
            type: 'AUTHORIZATION_ERROR'
          }
        });
      }

      if (post.privacy_level === 'friends' && !req.user) {
        return res.status(403).json({
          success: false,
          error: {
            message: 'Access denied',
            type: 'AUTHORIZATION_ERROR'
          }
        });
      }

      // Get comments for this post with hierarchical structure
      const commentsResult = await Comment.raw(
        `WITH RECURSIVE comment_tree AS (
           -- Root comments (no parent)
           SELECT c.*, u.username, u.first_name, u.last_name, u.avatar_url, 0 as level
           FROM comments c
           LEFT JOIN users u ON c.user_id = u.id
           WHERE c.post_id = $1 AND c.parent_id IS NULL AND c.is_published = true

           UNION ALL

           -- Child comments (with parent)
           SELECT c.*, u.username, u.first_name, u.last_name, u.avatar_url, ct.level + 1
           FROM comments c
           LEFT JOIN users u ON c.user_id = u.id
           INNER JOIN comment_tree ct ON c.parent_id = ct.id
           WHERE c.is_published = true
         )
         SELECT * FROM comment_tree ORDER BY level, created_at ASC`,
        [postId]
      );

      // Get media for this post
      const mediaResult = await Media.raw(
        `SELECT m.*, u.username as uploader_username
         FROM media m
         LEFT JOIN users u ON m.user_id = u.id
         WHERE m.post_id = $1
         ORDER BY m.created_at ASC`,
        [postId]
      );

      // Build hierarchical comments structure
      const comments = [];
      const commentMap = {};

      commentsResult.rows.forEach(comment => {
        const commentData = {
          id: comment.id,
          content: comment.content,
          user_id: comment.user_id,
          post_id: comment.post_id,
          parent_id: comment.parent_id,
          depth: comment.depth || 0,
          is_published: comment.is_published,
          created_at: comment.created_at,
          updated_at: comment.updated_at,
          author: {
            id: comment.user_id,
            username: comment.username,
            first_name: comment.first_name,
            last_name: comment.last_name,
            avatar_url: comment.avatar_url
          },
          replies: []
        };

        commentMap[comment.id] = commentData;

        if (comment.parent_id === null) {
          comments.push(commentData);
        } else if (commentMap[comment.parent_id]) {
          commentMap[comment.parent_id].replies.push(commentData);
        }
      });

      // Process media data
      const media = mediaResult.rows.map(m => ({
        id: m.id,
        filename: m.filename,
        original_name: m.original_name,
        file_path: m.file_path,
        file_size: m.file_size,
        mime_type: m.mime_type,
        media_type: m.media_type,
        width: m.width,
        height: m.height,
        alt_text: m.alt_text,
        created_at: m.created_at,
        uploader: {
          username: m.uploader_username
        }
      }));

      const postData = {
        id: post.id,
        content: post.content,
        privacy_level: post.privacy_level,
        is_published: post.is_published,
        views_count: post.views_count || 0,
        created_at: post.created_at,
        updated_at: post.updated_at,
        user_id: post.user_id,
        author: {
          id: post.user_id,
          username: post.username,
          first_name: post.first_name,
          last_name: post.last_name,
          avatar_url: post.avatar_url
        },
        comments: comments,
        media: media
      };

      res.json({
        success: true,
        data: postData
      });

    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/posts
 * Create a new post
 */
router.post('/',
  authenticate, // Require authentication
  [
    body('content').trim().isLength({ min: 1, max: 10000 }).withMessage('Content must be between 1 and 10000 characters'),
    body('privacy_level').optional().isIn(['public', 'friends', 'private']).withMessage('Invalid privacy level')
  ],
  handleValidationErrors,
  async (req, res, next) => {
    try {
      // Using PostgreSQL models directly
      const { content, privacy_level = 'public' } = req.body;

      // Use authenticated user's ID
      const user_id = req.user.id;

      // Create the post
      const post = await Post.create({
        user_id,
        content,
        privacy_level
      });

      // Fetch the post with author info using raw SQL
      const postResult = await Post.raw(
        `SELECT p.*,
                u.username, u.first_name, u.last_name, u.avatar_url
         FROM posts p
         LEFT JOIN users u ON p.user_id = u.id
         WHERE p.id = $1`,
        [post.id]
      );

      const postData = postResult.rows[0];

      res.status(201).json({
        success: true,
        data: {
          id: postData.id,
          content: postData.content,
          privacy_level: postData.privacy_level,
          is_published: postData.is_published,
          views_count: postData.views_count || 0,
          created_at: postData.created_at,
          updated_at: postData.updated_at,
          user_id: postData.user_id,
          author: {
            id: postData.user_id,
            username: postData.username,
            first_name: postData.first_name,
            last_name: postData.last_name,
            avatar_url: postData.avatar_url
          }
        },
        message: 'Post created successfully'
      });

    } catch (error) {
      next(error);
    }
  }
);

/**
 * PUT /api/posts/:id
 * Update a post
 */
router.put('/:id',
  authenticate, // Require authentication
  [
    param('id').isInt({ min: 1 }).withMessage('Post ID must be a positive integer'),
    body('content').optional().trim().isLength({ min: 1, max: 10000 }).withMessage('Content must be between 1 and 10000 characters'),
    body('privacy_level').optional().isIn(['public', 'friends', 'private']).withMessage('Invalid privacy level')
  ],
  handleValidationErrors,
  async (req, res, next) => {
    try {
      // Using PostgreSQL models directly
      const postId = parseInt(req.params.id);
      const { content, privacy_level } = req.body;

      // Find the post
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

      // Check if user can edit this post
      if (post.user_id !== req.user.id && req.user.id !== 1) { // Allow admin (user ID 1) to edit any post
        return res.status(403).json({
          success: false,
          error: {
            message: 'Access denied. You can only edit your own posts.',
            type: 'AUTHORIZATION_ERROR'
          }
        });
      }

      // Update post fields
      const updateData = {};
      if (content !== undefined) updateData.content = content;
      if (privacy_level !== undefined) updateData.privacy_level = privacy_level;

      const updatedPost = await Post.update(postId, updateData);

      // Fetch updated post with author info using raw SQL
      const postResult = await Post.raw(
        `SELECT p.*,
                u.username, u.first_name, u.last_name, u.avatar_url
         FROM posts p
         LEFT JOIN users u ON p.user_id = u.id
         WHERE p.id = $1`,
        [postId]
      );

      const postData = postResult.rows[0];

      res.json({
        success: true,
        data: {
          id: postData.id,
          content: postData.content,
          privacy_level: postData.privacy_level,
          is_published: postData.is_published,
          created_at: postData.created_at,
          updated_at: postData.updated_at,
          user_id: postData.user_id,
          author: {
            id: postData.user_id,
            username: postData.username,
            first_name: postData.first_name,
            last_name: postData.last_name,
            avatar_url: postData.avatar_url
          }
        },
        message: 'Post updated successfully'
      });

    } catch (error) {
      next(error);
    }
  }
);

/**
 * DELETE /api/posts/:id
 * Delete a post
 */
router.delete('/:id',
  authenticate, // Require authentication
  [
    param('id').isInt({ min: 1 }).withMessage('Post ID must be a positive integer')
  ],
  handleValidationErrors,
  async (req, res, next) => {
    try {
      // Using PostgreSQL models directly
      const postId = parseInt(req.params.id);

      // Find the post
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

      // Check if user can delete this post
      if (post.user_id !== req.user.id && req.user.id !== 1) { // Allow admin (user ID 1) to delete any post
        return res.status(403).json({
          success: false,
          error: {
            message: 'Access denied. You can only delete your own posts.',
            type: 'AUTHORIZATION_ERROR'
          }
        });
      }

      // Delete the post (cascading deletes will handle comments, reactions, media)
      await Post.delete(postId);

      res.json({
        success: true,
        message: 'Post deleted successfully'
      });

    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;