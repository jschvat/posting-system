/**
 * Users routes for the social media platform API
 * Handles user-related operations including profiles, creation, and management
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
      const { User, Post } = getModels();

      // Parse query parameters with defaults
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const offset = (page - 1) * limit;
      const search = req.query.search;
      const active = req.query.active;

      // Build where clause for filtering
      const whereClause = {};

      // Add active filter
      if (active !== undefined) {
        whereClause.is_active = active === 'true';
      }

      // Add search filter
      if (search) {
        whereClause[Op.or] = [
          { username: { [Op.iLike]: `%${search}%` } },
          { first_name: { [Op.iLike]: `%${search}%` } },
          { last_name: { [Op.iLike]: `%${search}%` } }
        ];
      }

      // Fetch users with post counts
      const { count, rows: users } = await User.findAndCountAll({
        where: whereClause,
        limit,
        offset,
        order: [['created_at', 'DESC']],
        attributes: {
          include: [
            [
              db.fn('COUNT', db.col('posts.id')),
              'post_count'
            ]
          ]
        },
        include: [{
          model: Post,
          as: 'posts',
          attributes: [],
          required: false,
          where: { is_published: true }
        }],
        group: ['User.id'],
        distinct: true
      });

      // Calculate pagination info
      const totalPages = Math.ceil(count / limit);
      const hasNextPage = page < totalPages;
      const hasPrevPage = page > 1;

      res.json({
        success: true,
        data: {
          users,
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
      const { User, Post, Media, Reaction } = getModels();
      const userId = parseInt(req.params.id);

      // Find user with their recent posts
      const user = await User.findByPk(userId, {
        include: [{
          model: Post,
          as: 'posts',
          where: { is_published: true },
          required: false,
          limit: 10,
          order: [['created_at', 'DESC']],
          include: [
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
        }]
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          error: {
            message: 'User not found',
            type: 'NOT_FOUND'
          }
        });
      }

      // Process user data
      const userData = user.toJSON();

      // Process posts to include reaction counts
      if (userData.posts) {
        userData.posts = userData.posts.map(post => {
          const reactionCounts = {};
          if (post.reactions) {
            post.reactions.forEach(reaction => {
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
          post.reaction_counts = Object.values(reactionCounts);
          delete post.reactions;
          return post;
        });
      }

      // Add user statistics
      const stats = await User.findByPk(userId, {
        attributes: [
          [db.fn('COUNT', db.col('posts.id')), 'total_posts'],
          [db.fn('COUNT', db.col('comments.id')), 'total_comments']
        ],
        include: [
          {
            model: Post,
            as: 'posts',
            attributes: [],
            required: false,
            where: { is_published: true }
          },
          {
            model: db.models.Comment,
            as: 'comments',
            attributes: [],
            required: false,
            where: { is_published: true }
          }
        ],
        group: ['User.id']
      });

      userData.stats = {
        total_posts: parseInt(stats?.dataValues?.total_posts || 0),
        total_comments: parseInt(stats?.dataValues?.total_comments || 0)
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
 * Create a new user
 */
router.post('/',
  [
    body('username').trim().isLength({ min: 3, max: 50 }).isAlphanumeric().withMessage('Username must be 3-50 alphanumeric characters'),
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('first_name').trim().isLength({ min: 1, max: 100 }).withMessage('First name is required (1-100 characters)'),
    body('last_name').trim().isLength({ min: 1, max: 100 }).withMessage('Last name is required (1-100 characters)'),
    body('bio').optional().trim().isLength({ max: 500 }).withMessage('Bio cannot exceed 500 characters'),
    body('avatar_url').optional().isURL().withMessage('Avatar URL must be a valid URL')
  ],
  handleValidationErrors,
  async (req, res, next) => {
    try {
      const { User } = getModels();
      const { username, email, first_name, last_name, bio, avatar_url } = req.body;

      // Check if username or email already exists
      const existingUser = await User.findOne({
        where: {
          [Op.or]: [
            { username: username },
            { email: email }
          ]
        }
      });

      if (existingUser) {
        const field = existingUser.username === username ? 'username' : 'email';
        return res.status(400).json({
          success: false,
          error: {
            message: `This ${field} is already taken`,
            type: 'DUPLICATE_ERROR',
            field
          }
        });
      }

      // Create the user
      const user = await User.create({
        username,
        email,
        first_name,
        last_name,
        bio,
        avatar_url
      });

      res.status(201).json({
        success: true,
        data: user,
        message: 'User created successfully'
      });

    } catch (error) {
      next(error);
    }
  }
);

/**
 * PUT /api/users/:id
 * Update a user profile
 */
router.put('/:id',
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
      const { User } = getModels();
      const userId = parseInt(req.params.id);
      const { username, email, first_name, last_name, bio, avatar_url, is_active } = req.body;

      // Find the user
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

      // Check for duplicate username/email if they're being updated
      if (username || email) {
        const whereClause = {
          id: { [Op.not]: userId }
        };
        const orConditions = [];

        if (username && username !== user.username) {
          orConditions.push({ username: username });
        }
        if (email && email !== user.email) {
          orConditions.push({ email: email });
        }

        if (orConditions.length > 0) {
          whereClause[Op.or] = orConditions;

          const existingUser = await User.findOne({ where: whereClause });
          if (existingUser) {
            const field = existingUser.username === username ? 'username' : 'email';
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

      await user.update(updateData);

      res.json({
        success: true,
        data: user,
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
  [
    param('id').isInt({ min: 1 }).withMessage('User ID must be a positive integer')
  ],
  handleValidationErrors,
  async (req, res, next) => {
    try {
      const { User } = getModels();
      const userId = parseInt(req.params.id);

      // Find the user
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

      // Soft delete by setting is_active to false
      await user.update({ is_active: false });

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
      const { User, Post, Media, Reaction } = getModels();
      const userId = parseInt(req.params.id);
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const offset = (page - 1) * limit;

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

      // Fetch user's posts
      const { count, rows: posts } = await Post.findAndCountAll({
        where: {
          user_id: userId,
          is_published: true
        },
        limit,
        offset,
        order: [['created_at', 'DESC']],
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

      // Process posts to include reaction counts
      const processedPosts = posts.map(post => {
        const postJson = post.toJSON();
        const reactionCounts = {};

        if (postJson.reactions) {
          postJson.reactions.forEach(reaction => {
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

        postJson.reaction_counts = Object.values(reactionCounts);
        delete postJson.reactions;
        return postJson;
      });

      // Calculate pagination info
      const totalPages = Math.ceil(count / limit);

      res.json({
        success: true,
        data: {
          user: user.getPublicData(),
          posts: processedPosts,
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

module.exports = router;