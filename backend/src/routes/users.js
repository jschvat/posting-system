/**
 * Users routes for the social media platform API
 * Handles user-related operations including profiles, creation, and management
 * Pure PostgreSQL implementation - NO SEQUELIZE
 */

const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const { authenticate, requireModifyPermission } = require('../middleware/auth');

// Import PostgreSQL models
const User = require('../models/User');
const Post = require('../models/Post');
const Comment = require('../models/Comment');
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
 * GET /api/users
 * Get all users with pagination and search
 */
router.get('/',
  [
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50'),
    query('search').optional().isLength({ min: 2, max: 100 }).withMessage('Search term must be between 2 and 100 characters'),
    query('active').optional().isBoolean().withMessage('Active must be a boolean')
  ],
  handleValidationErrors,
  async (req, res, next) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const offset = (page - 1) * limit;
      const search = req.query.search;
      const active = req.query.active;

      // Build WHERE clause
      let whereClause = '1=1';
      const params = [];
      let paramIndex = 1;

      // Add active filter
      if (active !== undefined) {
        whereClause += ` AND u.is_active = $${paramIndex}`;
        params.push(active === 'true');
        paramIndex++;
      }

      // Add search filter
      if (search) {
        whereClause += ` AND (u.username ILIKE $${paramIndex} OR u.first_name ILIKE $${paramIndex} OR u.last_name ILIKE $${paramIndex})`;
        params.push(`%${search}%`);
        paramIndex++;
      }

      // Get total count
      const countResult = await User.raw(
        `SELECT COUNT(DISTINCT u.id) as count
         FROM users u
         WHERE ${whereClause}`,
        params
      );
      const totalCount = parseInt(countResult.rows[0].count);

      // Get users with post counts
      const usersResult = await User.raw(
        `SELECT u.*,
                COUNT(p.id) as post_count
         FROM users u
         LEFT JOIN posts p ON u.id = p.user_id AND p.is_published = true
         WHERE ${whereClause}
         GROUP BY u.id
         ORDER BY u.created_at DESC
         LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
        [...params, limit, offset]
      );

      const users = usersResult.rows.map(user => ({
        ...User.getUserData(user),
        post_count: parseInt(user.post_count)
      }));

      // Calculate pagination info
      const totalPages = Math.ceil(totalCount / limit);

      res.json({
        success: true,
        data: {
          users,
          pagination: {
            current_page: page,
            total_pages: totalPages,
            total_count: totalCount,
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
 * GET /api/users/:id
 * Get a single user by ID with their posts
 */
router.get('/:id',
  [
    param('id').isInt({ min: 1 }).withMessage('User ID must be a positive integer')
  ],
  handleValidationErrors,
  async (req, res, next) => {
    try {
      const userId = parseInt(req.params.id);

      // Get user
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

      // Get recent posts with reaction counts (fixed to match new schema)
      const postsResult = await Post.raw(
        `SELECT p.*,
                COALESCE(reaction_counts.reactions, '[]'::json) as reactions
         FROM posts p
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
         WHERE p.user_id = $1 AND p.is_published = true
         ORDER BY p.created_at DESC
         LIMIT 10`,
        [userId]
      );

      // Get user statistics
      const statsResult = await User.raw(
        `SELECT
           (SELECT COUNT(*) FROM posts WHERE user_id = $1 AND is_published = true) as total_posts,
           (SELECT COUNT(*) FROM comments WHERE user_id = $1 AND is_published = true) as total_comments`,
        [userId]
      );

      const userData = User.getUserData(user);
      userData.posts = postsResult.rows.map(post => ({
        id: post.id,
        content: post.content,
        privacy_level: post.privacy_level,
        is_published: post.is_published,
        views_count: post.views_count || 0,
        created_at: post.created_at,
        updated_at: post.updated_at,
        user_id: post.user_id,
        reaction_counts: post.reactions || []
      }));
      userData.stats = {
        total_posts: parseInt(statsResult.rows[0]?.total_posts || 0),
        total_comments: parseInt(statsResult.rows[0]?.total_comments || 0)
      };

      res.json({
        success: true,
        data: userData
      });

    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/users
 * Create a new user (removed - use auth/register instead)
 */
router.post('/',
  (req, res) => {
    res.status(410).json({
      success: false,
      error: {
        message: 'User registration has been moved to /api/auth/register',
        type: 'ENDPOINT_MOVED'
      }
    });
  }
);

/**
 * PUT /api/users/:id
 * Update a user profile
 */
router.put('/:id',
  authenticate, // Require authentication
  requireModifyPermission('id'), // Check ownership or admin
  [
    param('id').isInt({ min: 1 }).withMessage('User ID must be a positive integer'),
    body('username').optional().trim().isLength({ min: 3, max: 50 }).isAlphanumeric().withMessage('Username must be 3-50 alphanumeric characters'),
    body('email').optional().isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('first_name').optional().trim().isLength({ min: 1, max: 100 }).withMessage('First name must be 1-100 characters'),
    body('last_name').optional().trim().isLength({ min: 1, max: 100 }).withMessage('Last name must be 1-100 characters'),
    body('bio').optional().trim().isLength({ max: 500 }).withMessage('Bio cannot exceed 500 characters'),
    body('avatar_url').optional().isURL().withMessage('Avatar URL must be a valid URL'),
    body('is_active').optional().isBoolean().withMessage('Active status must be a boolean')
  ],
  handleValidationErrors,
  async (req, res, next) => {
    try {
      const userId = parseInt(req.params.id);
      const { username, email, first_name, last_name, bio, avatar_url, is_active } = req.body;

      // Find the user
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

      // Check for duplicate username/email if they're being updated
      if (username || email) {
        let duplicateCheckQuery = 'SELECT username, email FROM users WHERE id != $1 AND (';
        const checkParams = [userId];
        const conditions = [];
        let paramIndex = 2;

        if (username && username !== user.username) {
          conditions.push(`username = $${paramIndex}`);
          checkParams.push(username);
          paramIndex++;
        }
        if (email && email !== user.email) {
          conditions.push(`email = $${paramIndex}`);
          checkParams.push(email);
          paramIndex++;
        }

        if (conditions.length > 0) {
          duplicateCheckQuery += conditions.join(' OR ') + ')';

          const existingUser = await User.raw(duplicateCheckQuery, checkParams);
          if (existingUser.rows.length > 0) {
            const existing = existingUser.rows[0];
            const field = existing.username === username ? 'username' : 'email';
            return res.status(400).json({
              success: false,
              error: {
                message: `This ${field} is already taken`,
                type: 'DUPLICATE_ERROR',
                field
              }
            });
          }
        }
      }

      // Update user fields
      const updateData = {};
      if (username !== undefined) updateData.username = username;
      if (email !== undefined) updateData.email = email;
      if (first_name !== undefined) updateData.first_name = first_name;
      if (last_name !== undefined) updateData.last_name = last_name;
      if (bio !== undefined) updateData.bio = bio;
      if (avatar_url !== undefined) updateData.avatar_url = avatar_url;
      if (is_active !== undefined) updateData.is_active = is_active;

      const updatedUser = await User.update(userId, updateData);

      res.json({
        success: true,
        data: User.getUserData(updatedUser),
        message: 'User updated successfully'
      });

    } catch (error) {
      next(error);
    }
  }
);

/**
 * DELETE /api/users/:id
 * Delete a user (soft delete by setting is_active to false)
 */
router.delete('/:id',
  authenticate, // Require authentication
  requireModifyPermission('id'), // Check ownership or admin
  [
    param('id').isInt({ min: 1 }).withMessage('User ID must be a positive integer')
  ],
  handleValidationErrors,
  async (req, res, next) => {
    try {
      const userId = parseInt(req.params.id);

      // Find the user
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

      // Soft delete by setting is_active to false
      await User.update(userId, { is_active: false });

      res.json({
        success: true,
        message: 'User deactivated successfully'
      });

    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/users/:id/posts
 * Get all posts by a specific user
 */
router.get('/:id/posts',
  [
    param('id').isInt({ min: 1 }).withMessage('User ID must be a positive integer'),
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50')
  ],
  handleValidationErrors,
  async (req, res, next) => {
    try {
      const userId = parseInt(req.params.id);
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const offset = (page - 1) * limit;

      // Verify user exists
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

      // Get total count of user's posts
      const countResult = await Post.raw(
        'SELECT COUNT(*) as count FROM posts WHERE user_id = $1 AND is_published = true',
        [userId]
      );
      const totalCount = parseInt(countResult.rows[0].count);

      // Fetch user's posts with reaction counts (fixed to match new schema)
      const postsResult = await Post.raw(
        `SELECT p.*,
                u.username, u.first_name, u.last_name, u.avatar_url,
                COALESCE(reaction_counts.reactions, '[]'::json) as reactions
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
         WHERE p.user_id = $1 AND p.is_published = true
         ORDER BY p.created_at DESC
         LIMIT $2 OFFSET $3`,
        [userId, limit, offset]
      );

      const processedPosts = postsResult.rows.map(post => ({
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
        reaction_counts: post.reactions || []
      }));

      // Calculate pagination info
      const totalPages = Math.ceil(totalCount / limit);

      res.json({
        success: true,
        data: {
          user: User.getUserData(user),
          posts: processedPosts,
          pagination: {
            current_page: page,
            total_pages: totalPages,
            total_count: totalCount,
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

module.exports = router;