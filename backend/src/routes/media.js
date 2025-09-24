/**
 * Media routes for the social media platform API
 * Handles file uploads and media management for posts and comments
 */

const express = require('express');
const multer = require('multer');
const sharp = require('sharp');
const { body, param, query, validationResult } = require('express-validator');
const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');
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
 * Multer configuration for file uploads
 */
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../../uploads');
    const subDir = file.mimetype.startsWith('image/') ? 'images' : 'media';
    const fullPath = path.join(uploadDir, subDir);

    try {
      await fs.mkdir(fullPath, { recursive: true });
      cb(null, fullPath);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    // Generate unique filename with original extension
    const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

// File filter to allow only specific file types
const fileFilter = (req, file, cb) => {
  const allowedImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  const allowedVideoTypes = ['video/mp4', 'video/webm', 'video/ogg'];
  const allowedAudioTypes = ['audio/mp3', 'audio/wav', 'audio/ogg'];
  const allowedDocTypes = ['application/pdf', 'text/plain'];

  const allowedTypes = [
    ...allowedImageTypes,
    ...allowedVideoTypes,
    ...allowedAudioTypes,
    ...allowedDocTypes
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`File type ${file.mimetype} is not allowed`), false);
  }
};

// Configure multer
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 5 // Maximum 5 files per upload
  }
});

/**
 * POST /api/media/upload
 * Upload media files (images, videos, audio, documents)
 */
router.post('/upload',
  upload.array('files', 5), // Allow up to 5 files
  [
    body('user_id').isInt({ min: 1 }).withMessage('User ID is required and must be a positive integer'),
    body('post_id').optional().isInt({ min: 1 }).withMessage('Post ID must be a positive integer'),
    body('comment_id').optional().isInt({ min: 1 }).withMessage('Comment ID must be a positive integer'),
    body('alt_text').optional().trim().isLength({ max: 500 }).withMessage('Alt text cannot exceed 500 characters')
  ],
  handleValidationErrors,
  async (req, res, next) => {
    try {
      const { User, Post, Comment, Media } = getModels();
      const { user_id, post_id, comment_id, alt_text } = req.body;

      // Validate that files were uploaded
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'No files were uploaded',
            type: 'NO_FILES'
          }
        });
      }

      // Validate association (must belong to either post or comment, not both)
      if (!post_id && !comment_id) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Media must belong to either a post or comment',
            type: 'INVALID_ASSOCIATION'
          }
        });
      }

      if (post_id && comment_id) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Media cannot belong to both a post and comment',
            type: 'INVALID_ASSOCIATION'
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

      // Verify post or comment exists
      if (post_id) {
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
      }

      if (comment_id) {
        const comment = await Comment.findByPk(comment_id);
        if (!comment) {
          return res.status(404).json({
            success: false,
            error: {
              message: 'Comment not found',
              type: 'NOT_FOUND'
            }
          });
        }
      }

      // Process uploaded files
      const uploadedMedia = [];

      for (const file of req.files) {
        try {
          let width = null;
          let height = null;
          let processedPath = file.path;

          // Process images for optimization and metadata
          if (file.mimetype.startsWith('image/')) {
            const metadata = await sharp(file.path).metadata();
            width = metadata.width;
            height = metadata.height;

            // Optimize image (reduce quality for large images)
            if (file.size > 1024 * 1024) { // If larger than 1MB
              const optimizedPath = file.path.replace(path.extname(file.path), '_optimized' + path.extname(file.path));
              await sharp(file.path)
                .jpeg({ quality: 80 })
                .png({ quality: 80 })
                .webp({ quality: 80 })
                .toFile(optimizedPath);

              // Replace original with optimized version
              await fs.unlink(file.path);
              await fs.rename(optimizedPath, file.path);
              processedPath = file.path;
            }

            // Generate thumbnail for images
            const thumbnailPath = file.path.replace(path.extname(file.path), '_thumb' + path.extname(file.path));
            await sharp(file.path)
              .resize(300, 300, { fit: 'inside', withoutEnlargement: true })
              .toFile(thumbnailPath);
          }

          // Get relative path for database storage
          const relativePath = path.relative(path.join(__dirname, '../../../uploads'), processedPath);

          // Create media record in database
          const media = await Media.create({
            post_id: post_id || null,
            comment_id: comment_id || null,
            user_id: parseInt(user_id),
            filename: path.basename(processedPath),
            original_filename: file.originalname,
            file_path: relativePath,
            file_size: file.size,
            mime_type: file.mimetype,
            alt_text: alt_text || null,
            width,
            height
          });

          uploadedMedia.push(media);

        } catch (error) {
          // Clean up file if database insert fails
          try {
            await fs.unlink(file.path);
          } catch (unlinkError) {
            console.error('Failed to clean up file:', file.path, unlinkError);
          }
          throw error;
        }
      }

      res.status(201).json({
        success: true,
        data: uploadedMedia,
        message: `${uploadedMedia.length} file(s) uploaded successfully`
      });

    } catch (error) {
      // Clean up any uploaded files on error
      if (req.files) {
        for (const file of req.files) {
          try {
            await fs.unlink(file.path);
          } catch (unlinkError) {
            console.error('Failed to clean up file:', file.path, unlinkError);
          }
        }
      }
      next(error);
    }
  }
);

/**
 * GET /api/media/:id
 * Get media file metadata by ID
 */
router.get('/:id',
  [
    param('id').isInt({ min: 1 }).withMessage('Media ID must be a positive integer')
  ],
  handleValidationErrors,
  async (req, res, next) => {
    try {
      const { User, Media } = getModels();
      const mediaId = parseInt(req.params.id);

      // Find media with uploader info
      const media = await Media.findByPk(mediaId, {
        include: [{
          model: User,
          as: 'uploader',
          attributes: ['id', 'username', 'first_name', 'last_name', 'avatar_url']
        }]
      });

      if (!media) {
        return res.status(404).json({
          success: false,
          error: {
            message: 'Media not found',
            type: 'NOT_FOUND'
          }
        });
      }

      res.json({
        success: true,
        data: media
      });

    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/media/post/:postId
 * Get all media files for a specific post
 */
router.get('/post/:postId',
  [
    param('postId').isInt({ min: 1 }).withMessage('Post ID must be a positive integer'),
    query('type').optional().isIn(['image', 'video', 'audio', 'document']).withMessage('Invalid media type')
  ],
  handleValidationErrors,
  async (req, res, next) => {
    try {
      const { Post, Media, User } = getModels();
      const postId = parseInt(req.params.postId);
      const mediaType = req.query.type;

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

      // Build where clause
      const whereClause = { post_id: postId };
      if (mediaType) {
        whereClause.media_type = mediaType;
      }

      // Get media files
      const media = await Media.findAll({
        where: whereClause,
        order: [['created_at', 'ASC']],
        include: [{
          model: User,
          as: 'uploader',
          attributes: ['id', 'username', 'first_name', 'last_name', 'avatar_url']
        }]
      });

      res.json({
        success: true,
        data: {
          post_id: postId,
          media,
          count: media.length
        }
      });

    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/media/comment/:commentId
 * Get all media files for a specific comment
 */
router.get('/comment/:commentId',
  [
    param('commentId').isInt({ min: 1 }).withMessage('Comment ID must be a positive integer'),
    query('type').optional().isIn(['image', 'video', 'audio', 'document']).withMessage('Invalid media type')
  ],
  handleValidationErrors,
  async (req, res, next) => {
    try {
      const { Comment, Media, User } = getModels();
      const commentId = parseInt(req.params.commentId);
      const mediaType = req.query.type;

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

      // Build where clause
      const whereClause = { comment_id: commentId };
      if (mediaType) {
        whereClause.media_type = mediaType;
      }

      // Get media files
      const media = await Media.findAll({
        where: whereClause,
        order: [['created_at', 'ASC']],
        include: [{
          model: User,
          as: 'uploader',
          attributes: ['id', 'username', 'first_name', 'last_name', 'avatar_url']
        }]
      });

      res.json({
        success: true,
        data: {
          comment_id: commentId,
          media,
          count: media.length
        }
      });

    } catch (error) {
      next(error);
    }
  }
);

/**
 * PUT /api/media/:id
 * Update media metadata (alt text, etc.)
 */
router.put('/:id',
  [
    param('id').isInt({ min: 1 }).withMessage('Media ID must be a positive integer'),
    body('alt_text').optional().trim().isLength({ max: 500 }).withMessage('Alt text cannot exceed 500 characters')
  ],
  handleValidationErrors,
  async (req, res, next) => {
    try {
      const { Media } = getModels();
      const mediaId = parseInt(req.params.id);
      const { alt_text } = req.body;

      // Find the media
      const media = await Media.findByPk(mediaId);
      if (!media) {
        return res.status(404).json({
          success: false,
          error: {
            message: 'Media not found',
            type: 'NOT_FOUND'
          }
        });
      }

      // Check if user can edit this media (TODO: Implement proper authentication)
      // For now, assume any user can edit any media (will be fixed with authentication)

      // Update media
      const updateData = {};
      if (alt_text !== undefined) updateData.alt_text = alt_text;

      await media.update(updateData);

      res.json({
        success: true,
        data: media,
        message: 'Media updated successfully'
      });

    } catch (error) {
      next(error);
    }
  }
);

/**
 * DELETE /api/media/:id
 * Delete a media file
 */
router.delete('/:id',
  [
    param('id').isInt({ min: 1 }).withMessage('Media ID must be a positive integer')
  ],
  handleValidationErrors,
  async (req, res, next) => {
    try {
      const { Media } = getModels();
      const mediaId = parseInt(req.params.id);

      // Find the media
      const media = await Media.findByPk(mediaId);
      if (!media) {
        return res.status(404).json({
          success: false,
          error: {
            message: 'Media not found',
            type: 'NOT_FOUND'
          }
        });
      }

      // Check if user can delete this media (TODO: Implement proper authentication)
      // For now, assume any user can delete any media (will be fixed with authentication)

      // Delete the physical file
      const filePath = path.join(__dirname, '../../../uploads', media.file_path);
      try {
        await fs.unlink(filePath);

        // Also delete thumbnail if it's an image
        if (media.media_type === 'image') {
          const thumbnailPath = filePath.replace(path.extname(filePath), '_thumb' + path.extname(filePath));
          try {
            await fs.unlink(thumbnailPath);
          } catch (thumbError) {
            console.error('Failed to delete thumbnail:', thumbnailPath, thumbError);
          }
        }
      } catch (fileError) {
        console.error('Failed to delete file:', filePath, fileError);
        // Continue with database deletion even if file deletion fails
      }

      // Delete the media record
      await media.destroy();

      res.json({
        success: true,
        message: 'Media deleted successfully'
      });

    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/media/user/:userId
 * Get all media files uploaded by a specific user
 */
router.get('/user/:userId',
  [
    param('userId').isInt({ min: 1 }).withMessage('User ID must be a positive integer'),
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50'),
    query('type').optional().isIn(['image', 'video', 'audio', 'document']).withMessage('Invalid media type')
  ],
  handleValidationErrors,
  async (req, res, next) => {
    try {
      const { User, Media } = getModels();
      const userId = parseInt(req.params.userId);
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const offset = (page - 1) * limit;
      const mediaType = req.query.type;

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
      if (mediaType) {
        whereClause.media_type = mediaType;
      }

      // Get media files with pagination
      const { count, rows: media } = await Media.findAndCountAll({
        where: whereClause,
        limit,
        offset,
        order: [['created_at', 'DESC']],
        include: [{
          model: User,
          as: 'uploader',
          attributes: ['id', 'username', 'first_name', 'last_name', 'avatar_url']
        }]
      });

      // Calculate pagination info
      const totalPages = Math.ceil(count / limit);

      res.json({
        success: true,
        data: {
          user: user.getPublicData(),
          media,
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