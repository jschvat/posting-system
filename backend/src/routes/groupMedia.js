/**
 * Group Media routes
 * Handles file uploads for group posts and comments
 */

const express = require('express');
const multer = require('multer');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');
const { authenticate } = require('../middleware/auth');
const Group = require('../models/Group');
const GroupPost = require('../models/GroupPost');
const GroupComment = require('../models/GroupComment');
const GroupPostMedia = require('../models/GroupPostMedia');
const GroupCommentMedia = require('../models/GroupCommentMedia');
const GroupMembership = require('../models/GroupMembership');

const router = express.Router();

// Upload directory for group media
const UPLOAD_BASE = path.join(__dirname, '../../public/media/groups');

/**
 * Multer configuration for group media uploads
 */
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const { slug } = req.params;
    const uploadPath = path.join(UPLOAD_BASE, slug);

    try {
      await fs.mkdir(uploadPath, { recursive: true });
      cb(null, uploadPath);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

// File filter
const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'video/mp4', 'video/webm', 'video/quicktime',
    'application/pdf',
    'model/gltf-binary', 'model/gltf+json'
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
    fileSize: 100 * 1024 * 1024, // 100MB
    files: 10
  }
});

/**
 * @route   POST /api/groups/:slug/posts/:postId/media
 * @desc    Upload media for a group post
 * @access  Private (Members only)
 */
router.post('/:slug/posts/:postId/media',
  authenticate,
  upload.array('files', 10),
  async (req, res) => {
    try {
      const { slug, postId } = req.params;

      // Check group exists
      const group = await Group.findBySlug(slug);
      if (!group) {
        return res.status(404).json({
          success: false,
          error: 'Group not found'
        });
      }

      // Check user is member
      const isMember = await GroupMembership.isMember(group.id, req.user.id);
      if (!isMember) {
        return res.status(403).json({
          success: false,
          error: 'Only members can upload media'
        });
      }

      // Check post exists and belongs to this group
      const post = await GroupPost.findById(postId);
      if (!post || post.group_id !== group.id) {
        return res.status(404).json({
          success: false,
          error: 'Post not found'
        });
      }

      // Check user owns the post or is moderator
      const membership = await GroupMembership.getMembership(group.id, req.user.id);
      const canUpload = post.user_id === req.user.id ||
                       ['admin', 'moderator'].includes(membership.role);

      if (!canUpload) {
        return res.status(403).json({
          success: false,
          error: 'Only post author or moderators can upload media'
        });
      }

      if (!req.files || req.files.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'No files were uploaded'
        });
      }

      const uploadedMedia = [];

      for (let i = 0; i < req.files.length; i++) {
        const file = req.files[i];
        const relativePath = `public/media/groups/${slug}/${file.filename}`;
        const fileUrl = `/media/groups/${slug}/${file.filename}`;

        // Determine media type
        const mediaType = GroupPostMedia.getMediaTypeFromMime(file.mimetype);

        let width = null;
        let height = null;
        let thumbnailUrl = null;

        // Process images
        if (mediaType === 'image') {
          try {
            const metadata = await sharp(file.path).metadata();
            width = metadata.width;
            height = metadata.height;

            // Create thumbnail
            const thumbnailFilename = `thumb_${file.filename}`;
            const thumbnailPath = path.join(UPLOAD_BASE, slug, thumbnailFilename);

            await sharp(file.path)
              .resize(400, 400, { fit: 'inside', withoutEnlargement: true })
              .toFile(thumbnailPath);

            thumbnailUrl = `/media/groups/${slug}/${thumbnailFilename}`;
          } catch (error) {
            console.error('Error processing image:', error);
          }
        }

        // Create media record
        const media = await GroupPostMedia.create({
          post_id: parseInt(postId),
          file_name: file.originalname,
          file_path: relativePath,
          file_url: fileUrl,
          file_type: path.extname(file.originalname).slice(1),
          file_size: file.size,
          mime_type: file.mimetype,
          media_type: mediaType,
          width,
          height,
          duration: null,
          thumbnail_url: thumbnailUrl,
          display_order: i
        });

        uploadedMedia.push(media);
      }

      res.json({
        success: true,
        data: {
          media: uploadedMedia
        }
      });
    } catch (error) {
      console.error('Error uploading group post media:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to upload media'
      });
    }
  }
);

/**
 * @route   POST /api/groups/:slug/comments/:commentId/media
 * @desc    Upload media for a group comment
 * @access  Private (Members only)
 */
router.post('/:slug/comments/:commentId/media',
  authenticate,
  upload.array('files', 5),
  async (req, res) => {
    try {
      const { slug, commentId } = req.params;

      // Check group exists
      const group = await Group.findBySlug(slug);
      if (!group) {
        return res.status(404).json({
          success: false,
          error: 'Group not found'
        });
      }

      // Check user is member
      const isMember = await GroupMembership.isMember(group.id, req.user.id);
      if (!isMember) {
        return res.status(403).json({
          success: false,
          error: 'Only members can upload media'
        });
      }

      // Check comment exists
      const comment = await GroupComment.findById(commentId);
      if (!comment) {
        return res.status(404).json({
          success: false,
          error: 'Comment not found'
        });
      }

      // Check user owns the comment or is moderator
      const membership = await GroupMembership.getMembership(group.id, req.user.id);
      const canUpload = comment.user_id === req.user.id ||
                       ['admin', 'moderator'].includes(membership.role);

      if (!canUpload) {
        return res.status(403).json({
          success: false,
          error: 'Only comment author or moderators can upload media'
        });
      }

      if (!req.files || req.files.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'No files were uploaded'
        });
      }

      const uploadedMedia = [];

      for (let i = 0; i < req.files.length; i++) {
        const file = req.files[i];
        const relativePath = `public/media/groups/${slug}/${file.filename}`;
        const fileUrl = `/media/groups/${slug}/${file.filename}`;

        const mediaType = GroupCommentMedia.getMediaTypeFromMime(file.mimetype);

        let width = null;
        let height = null;
        let thumbnailUrl = null;

        // Process images
        if (mediaType === 'image') {
          try {
            const metadata = await sharp(file.path).metadata();
            width = metadata.width;
            height = metadata.height;

            // Create thumbnail
            const thumbnailFilename = `thumb_${file.filename}`;
            const thumbnailPath = path.join(UPLOAD_BASE, slug, thumbnailFilename);

            await sharp(file.path)
              .resize(400, 400, { fit: 'inside', withoutEnlargement: true })
              .toFile(thumbnailPath);

            thumbnailUrl = `/media/groups/${slug}/${thumbnailFilename}`;
          } catch (error) {
            console.error('Error processing image:', error);
          }
        }

        const media = await GroupCommentMedia.create({
          comment_id: parseInt(commentId),
          file_name: file.originalname,
          file_path: relativePath,
          file_url: fileUrl,
          file_type: path.extname(file.originalname).slice(1),
          file_size: file.size,
          mime_type: file.mimetype,
          media_type: mediaType,
          width,
          height,
          duration: null,
          thumbnail_url: thumbnailUrl,
          display_order: i
        });

        uploadedMedia.push(media);
      }

      res.json({
        success: true,
        data: {
          media: uploadedMedia
        }
      });
    } catch (error) {
      console.error('Error uploading group comment media:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to upload media'
      });
    }
  }
);

/**
 * @route   DELETE /api/groups/:slug/posts/:postId/media/:mediaId
 * @desc    Delete media from a group post
 * @access  Private (Author or moderator)
 */
router.delete('/:slug/posts/:postId/media/:mediaId',
  authenticate,
  async (req, res) => {
    try {
      const { slug, postId, mediaId } = req.params;

      const group = await Group.findBySlug(slug);
      if (!group) {
        return res.status(404).json({
          success: false,
          error: 'Group not found'
        });
      }

      const media = await GroupPostMedia.findById(mediaId);
      if (!media || media.post_id !== parseInt(postId)) {
        return res.status(404).json({
          success: false,
          error: 'Media not found'
        });
      }

      const post = await GroupPost.findById(postId);
      const membership = await GroupMembership.getMembership(group.id, req.user.id);
      const canDelete = post.user_id === req.user.id ||
                       ['admin', 'moderator'].includes(membership?.role);

      if (!canDelete) {
        return res.status(403).json({
          success: false,
          error: 'Only post author or moderators can delete media'
        });
      }

      // Delete files
      try {
        const fullPath = path.join(__dirname, '../../', media.file_path);
        await fs.unlink(fullPath);

        if (media.thumbnail_url) {
          const thumbPath = path.join(__dirname, '../../public', media.thumbnail_url);
          await fs.unlink(thumbPath).catch(() => {});
        }
      } catch (error) {
        console.error('Error deleting files:', error);
      }

      await GroupPostMedia.deleteById(mediaId);

      res.json({
        success: true,
        message: 'Media deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting media:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete media'
      });
    }
  }
);

/**
 * @route   DELETE /api/groups/:slug/comments/:commentId/media/:mediaId
 * @desc    Delete media from a group comment
 * @access  Private (Author or moderator)
 */
router.delete('/:slug/comments/:commentId/media/:mediaId',
  authenticate,
  async (req, res) => {
    try {
      const { slug, commentId, mediaId } = req.params;

      const group = await Group.findBySlug(slug);
      if (!group) {
        return res.status(404).json({
          success: false,
          error: 'Group not found'
        });
      }

      const media = await GroupCommentMedia.findById(mediaId);
      if (!media || media.comment_id !== parseInt(commentId)) {
        return res.status(404).json({
          success: false,
          error: 'Media not found'
        });
      }

      const comment = await GroupComment.findById(commentId);
      const membership = await GroupMembership.getMembership(group.id, req.user.id);
      const canDelete = comment.user_id === req.user.id ||
                       ['admin', 'moderator'].includes(membership?.role);

      if (!canDelete) {
        return res.status(403).json({
          success: false,
          error: 'Only comment author or moderators can delete media'
        });
      }

      // Delete files
      try {
        const fullPath = path.join(__dirname, '../../', media.file_path);
        await fs.unlink(fullPath);

        if (media.thumbnail_url) {
          const thumbPath = path.join(__dirname, '../../public', media.thumbnail_url);
          await fs.unlink(thumbPath).catch(() => {});
        }
      } catch (error) {
        console.error('Error deleting files:', error);
      }

      await GroupCommentMedia.deleteById(mediaId);

      res.json({
        success: true,
        message: 'Media deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting media:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete media'
      });
    }
  }
);

module.exports = router;
