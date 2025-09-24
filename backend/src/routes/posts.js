/**
 * Posts routes for the social media platform API
 * Handles CRUD operations for posts including creation, reading, updating, and deletion
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
 * GET /api/posts
 * Get all posts with pagination, filtering, and sorting
 */
router.get('/',
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
      const { User, Post, Media, Reaction } = getModels();

      // Parse query parameters with defaults
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const offset = (page - 1) * limit;
      const sort = req.query.sort || 'newest';
      const privacy = req.query.privacy;
      const userId = req.query.user_id;

      // Build where clause for filtering
      const whereClause = {
        is_published: true
      };

      // Add privacy filter
      if (privacy) {
        whereClause.privacy_level = privacy;
      } else {
        // Default to public posts only (unless user is authenticated)
        whereClause.privacy_level = 'public';
      }

      // Add user filter
      if (userId) {
        whereClause.user_id = userId;
      }

      // Build order clause
      const orderClause = sort === 'newest'
        ? [['created_at', 'DESC']]
        : [['created_at', 'ASC']];

      // Fetch posts with associations
      const { count, rows: posts } = await Post.findAndCountAll({
        where: whereClause,
        limit,
        offset,
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
        ],
        distinct: true
      });

      // Process posts to include reaction counts
      const processedPosts = posts.map(post => {
        const postJson = post.toJSON();

        // Group reactions by emoji and count them
        const reactionCounts = {};
        if (postJson.reactions) {
          postJson.reactions.forEach(reaction => {
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

        postJson.reaction_counts = Object.values(reactionCounts);
        delete postJson.reactions; // Remove raw reactions to keep response clean

        return postJson;
      });

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
  [
    param('id').isInt({ min: 1 }).withMessage('Post ID must be a positive integer')
  ],
  handleValidationErrors,
  async (req, res, next) => {
    try {
      const { User, Post, Comment, Media, Reaction } = getModels();
      const postId = parseInt(req.params.id);

      // Find post with all associations
      const post = await Post.findByPk(postId, {
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
            as: 'comments',
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

      if (!post) {
        return res.status(404).json({
          success: false,
          error: {
            message: 'Post not found',
            type: 'NOT_FOUND'
          }
        });
      }

      // Check if user can view this post
      if (!post.canUserView(req.user)) {
        return res.status(403).json({
          success: false,
          error: {
            message: 'Access denied',
            type: 'ACCESS_DENIED'
          }
        });
      }

      // Process post data
      const postJson = post.toJSON();

      // Build comment tree for nested comments
      if (postJson.comments && postJson.comments.length > 0) {
        const commentMap = new Map();
        const rootComments = [];

        // Create map of all comments
        postJson.comments.forEach(comment => {
          comment.replies = [];
          commentMap.set(comment.id, comment);
        });

        // Build parent-child relationships
        postJson.comments.forEach(comment => {
          if (comment.parent_id) {
            const parent = commentMap.get(comment.parent_id);
            if (parent) {
              parent.replies.push(comment);
            }
          } else {
            rootComments.push(comment);
          }
        });

        postJson.comments = rootComments;
      }

      // Group reactions by emoji and count them
      const reactionCounts = {};
      if (postJson.reactions) {
        postJson.reactions.forEach(reaction => {
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

      postJson.reaction_counts = Object.values(reactionCounts);
      delete postJson.reactions; // Remove raw reactions

      res.json({
        success: true,
        data: postJson
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
  [
    body('user_id').isInt({ min: 1 }).withMessage('User ID is required and must be a positive integer'),
    body('content').trim().isLength({ min: 1, max: 10000 }).withMessage('Content must be between 1 and 10000 characters'),
    body('privacy_level').optional().isIn(['public', 'friends', 'private']).withMessage('Invalid privacy level')
  ],
  handleValidationErrors,
  async (req, res, next) => {
    try {
      const { User, Post } = getModels();
      const { user_id, content, privacy_level = 'public' } = req.body;

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

      // Create the post
      const post = await Post.create({
        user_id,
        content,
        privacy_level
      });

      // Fetch the post with author info
      const newPost = await Post.findByPk(post.id, {
        include: [{
          model: User,
          as: 'author',
          attributes: ['id', 'username', 'first_name', 'last_name', 'avatar_url']
        }]
      });

      res.status(201).json({
        success: true,
        data: newPost,
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
  [
    param('id').isInt({ min: 1 }).withMessage('Post ID must be a positive integer'),
    body('content').optional().trim().isLength({ min: 1, max: 10000 }).withMessage('Content must be between 1 and 10000 characters'),
    body('privacy_level').optional().isIn(['public', 'friends', 'private']).withMessage('Invalid privacy level')
  ],
  handleValidationErrors,
  async (req, res, next) => {
    try {
      const { User, Post } = getModels();
      const postId = parseInt(req.params.id);
      const { content, privacy_level } = req.body;

      // Find the post
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

      // Check if user can edit this post (TODO: Implement proper authentication)
      // For now, assume any user can edit any post (will be fixed with authentication)

      // Update post fields
      const updateData = {};
      if (content !== undefined) updateData.content = content;
      if (privacy_level !== undefined) updateData.privacy_level = privacy_level;

      await post.update(updateData);

      // Fetch updated post with author info
      const updatedPost = await Post.findByPk(postId, {
        include: [{
          model: User,
          as: 'author',
          attributes: ['id', 'username', 'first_name', 'last_name', 'avatar_url']
        }]
      });

      res.json({
        success: true,
        data: updatedPost,
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
  [
    param('id').isInt({ min: 1 }).withMessage('Post ID must be a positive integer')
  ],
  handleValidationErrors,
  async (req, res, next) => {
    try {
      const { Post } = getModels();
      const postId = parseInt(req.params.id);

      // Find the post
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

      // Check if user can delete this post (TODO: Implement proper authentication)
      // For now, assume any user can delete any post (will be fixed with authentication)

      // Delete the post (cascading deletes will handle comments, reactions, media)
      await post.destroy();

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