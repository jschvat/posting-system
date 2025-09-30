/**
 * Media model for the social media platform
 * Raw SQL implementation
 */

const BaseModel = require('./BaseModel');
const path = require('path');

class Media extends BaseModel {
  constructor() {
    super('media');
  }

  /**
   * Create a new media record
   * @param {Object} mediaData - Media data
   * @returns {Object} Created media
   */
  async create(mediaData) {
    // Determine media type from MIME type if not set
    if (!mediaData.media_type && mediaData.mime_type) {
      if (mediaData.mime_type.startsWith('image/')) {
        mediaData.media_type = 'image';
      } else if (mediaData.mime_type.startsWith('video/')) {
        mediaData.media_type = 'video';
      } else if (mediaData.mime_type.startsWith('audio/')) {
        mediaData.media_type = 'audio';
      } else {
        mediaData.media_type = 'document';
      }
    }

    // Trim text fields
    if (mediaData.filename) {
      mediaData.filename = mediaData.filename.trim();
    }
    if (mediaData.original_name) {
      mediaData.original_name = mediaData.original_name.trim();
    }
    if (mediaData.alt_text) {
      mediaData.alt_text = mediaData.alt_text.trim();
    }

    // Validate media association (must belong to either post or comment, not both)
    if (!mediaData.post_id && !mediaData.comment_id) {
      throw new Error('Media must belong to either a post or comment');
    }
    if (mediaData.post_id && mediaData.comment_id) {
      throw new Error('Media cannot belong to both a post and comment');
    }

    // Set default values
    mediaData.is_processed = mediaData.is_processed || false;

    const media = await super.create(mediaData);
    return this.getMediaData(media);
  }

  /**
   * Get media files by post ID
   * @param {number} postId - Post ID
   * @returns {Array} Array of media files
   */
  async getByPostId(postId) {
    const result = await this.raw(
      'SELECT * FROM media WHERE post_id = $1 ORDER BY created_at ASC',
      [postId]
    );

    return result.rows.map(media => this.getMediaData(media));
  }

  /**
   * Get media files by comment ID
   * @param {number} commentId - Comment ID
   * @returns {Array} Array of media files
   */
  async getByCommentId(commentId) {
    const result = await this.raw(
      'SELECT * FROM media WHERE comment_id = $1 ORDER BY created_at ASC',
      [commentId]
    );

    return result.rows.map(media => this.getMediaData(media));
  }

  /**
   * Get media files by user ID with pagination
   * @param {number} userId - User ID
   * @param {number} limit - Limit
   * @param {number} offset - Offset
   * @returns {Array} Array of media files
   */
  async getByUserId(userId, limit = 20, offset = 0) {
    const result = await this.raw(
      'SELECT * FROM media WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3',
      [userId, limit, offset]
    );

    return result.rows.map(media => this.getMediaData(media));
  }

  /**
   * Get media files by type
   * @param {string} mediaType - Media type (image, video, audio, document)
   * @param {number} limit - Limit
   * @param {number} offset - Offset
   * @returns {Array} Array of media files
   */
  async getByType(mediaType, limit = 20, offset = 0) {
    const result = await this.raw(
      'SELECT * FROM media WHERE media_type = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3',
      [mediaType, limit, offset]
    );

    return result.rows.map(media => this.getMediaData(media));
  }

  /**
   * Get file extension from filename
   * @param {string} filename - Filename
   * @returns {string} File extension (without dot)
   */
  getFileExtension(filename) {
    return path.extname(filename).slice(1).toLowerCase();
  }

  /**
   * Get human-readable file size
   * @param {number} bytes - File size in bytes
   * @returns {string} Formatted file size
   */
  getFormattedFileSize(bytes) {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';

    const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }

  /**
   * Get formatted duration (for video/audio)
   * @param {number} duration - Duration in seconds
   * @returns {string} Formatted duration (MM:SS or HH:MM:SS)
   */
  getFormattedDuration(duration) {
    if (!duration) return null;

    const hours = Math.floor(duration / 3600);
    const minutes = Math.floor((duration % 3600) / 60);
    const seconds = duration % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    } else {
      return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
  }

  /**
   * Check if media is an image
   * @param {string} mediaType - Media type
   * @returns {boolean} Whether the media is an image
   */
  isImage(mediaType) {
    return mediaType === 'image';
  }

  /**
   * Check if media is a video
   * @param {string} mediaType - Media type
   * @returns {boolean} Whether the media is a video
   */
  isVideo(mediaType) {
    return mediaType === 'video';
  }

  /**
   * Check if media is audio
   * @param {string} mediaType - Media type
   * @returns {boolean} Whether the media is audio
   */
  isAudio(mediaType) {
    return mediaType === 'audio';
  }

  /**
   * Check if media is a document
   * @param {string} mediaType - Media type
   * @returns {boolean} Whether the media is a document
   */
  isDocument(mediaType) {
    return mediaType === 'document';
  }

  /**
   * Get URL for accessing the media file
   * @param {string} filePath - File path
   * @param {string} baseUrl - Base URL of the server
   * @returns {string} Public URL to access the media
   */
  getUrl(filePath, baseUrl = '') {
    return `${baseUrl}/uploads/${filePath}`;
  }

  /**
   * Check if user can delete this media
   * @param {Object} media - Media object
   * @param {Object} user - User object to check permissions for
   * @returns {boolean} Whether user can delete the media
   */
  canUserDelete(media, user) {
    return user && user.id === media.user_id;
  }

  /**
   * Get media data with computed fields
   * @param {Object} media - Raw media data from database
   * @returns {Object} Media data with additional computed fields
   */
  getMediaData(media) {
    if (!media) return null;

    // Ensure boolean fields are properly typed
    const normalizedMedia = {
      ...media,
      is_processed: Boolean(media.is_processed)
    };

    return {
      id: normalizedMedia.id,
      post_id: normalizedMedia.post_id,
      comment_id: normalizedMedia.comment_id,
      user_id: normalizedMedia.user_id,
      filename: normalizedMedia.filename,
      original_name: normalizedMedia.original_name,
      file_path: normalizedMedia.file_path,
      file_url: normalizedMedia.file_url,
      file_size: normalizedMedia.file_size,
      formatted_file_size: this.getFormattedFileSize(normalizedMedia.file_size),
      mime_type: normalizedMedia.mime_type,
      media_type: normalizedMedia.media_type,
      alt_text: normalizedMedia.alt_text,
      width: normalizedMedia.width,
      height: normalizedMedia.height,
      duration: normalizedMedia.duration,
      formatted_duration: this.getFormattedDuration(normalizedMedia.duration),
      is_processed: normalizedMedia.is_processed,
      thumbnail_path: normalizedMedia.thumbnail_path,
      thumbnail_url: normalizedMedia.thumbnail_url,
      file_extension: this.getFileExtension(normalizedMedia.filename),
      created_at: normalizedMedia.created_at,
      updated_at: normalizedMedia.updated_at,

      // Helper flags
      is_image: this.isImage(normalizedMedia.media_type),
      is_video: this.isVideo(normalizedMedia.media_type),
      is_audio: this.isAudio(normalizedMedia.media_type),
      is_document: this.isDocument(normalizedMedia.media_type),

      // URL helpers
      url: this.getUrl(normalizedMedia.file_path),
      thumbnail: normalizedMedia.thumbnail_url || normalizedMedia.thumbnail_path
    };
  }
}

module.exports = new Media();