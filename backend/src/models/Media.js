/**
 * Media model for the social media platform
 * Handles uploaded files (images, videos, audio) attached to posts and comments
 */

const { DataTypes, Model } = require('sequelize');
const path = require('path');

class Media extends Model {
  /**
   * Initialize the Media model with sequelize instance
   * @param {Sequelize} sequelize - Sequelize instance
   */
  static initModel(sequelize) {
    Media.init({
      // Primary key
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        comment: 'Unique identifier for the media file'
      },

      // Foreign key to Post (optional - for post attachments)
      post_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: 'posts',
          key: 'id'
        },
        onDelete: 'CASCADE',
        comment: 'ID of the post this media belongs to'
      },

      // Foreign key to Comment (optional - for comment attachments)
      comment_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: 'comments',
          key: 'id'
        },
        onDelete: 'CASCADE',
        comment: 'ID of the comment this media belongs to'
      },

      // Foreign key to User (required - who uploaded the file)
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onDelete: 'CASCADE',
        comment: 'ID of the user who uploaded the media'
      },

      // File information
      filename: {
        type: DataTypes.STRING(255),
        allowNull: false,
        validate: {
          len: {
            args: [1, 255],
            msg: 'Filename must be between 1 and 255 characters'
          },
          notEmpty: {
            msg: 'Filename cannot be empty'
          }
        },
        comment: 'Generated filename for the media file'
      },

      original_filename: {
        type: DataTypes.STRING(255),
        allowNull: false,
        validate: {
          len: {
            args: [1, 255],
            msg: 'Original filename must be between 1 and 255 characters'
          },
          notEmpty: {
            msg: 'Original filename cannot be empty'
          }
        },
        comment: 'Original filename as uploaded by user'
      },

      file_path: {
        type: DataTypes.STRING(500),
        allowNull: false,
        validate: {
          len: {
            args: [1, 500],
            msg: 'File path must be between 1 and 500 characters'
          },
          notEmpty: {
            msg: 'File path cannot be empty'
          }
        },
        comment: 'Full path to the media file'
      },

      file_size: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
          min: {
            args: [1],
            msg: 'File size must be at least 1 byte'
          },
          max: {
            args: [10485760], // 10MB
            msg: 'File size cannot exceed 10MB'
          }
        },
        comment: 'File size in bytes'
      },

      mime_type: {
        type: DataTypes.STRING(100),
        allowNull: false,
        validate: {
          len: {
            args: [1, 100],
            msg: 'MIME type must be between 1 and 100 characters'
          },
          notEmpty: {
            msg: 'MIME type cannot be empty'
          }
        },
        comment: 'MIME type of the file'
      },

      media_type: {
        type: DataTypes.ENUM('image', 'video', 'audio', 'document'),
        allowNull: false,
        validate: {
          isIn: {
            args: [['image', 'video', 'audio', 'document']],
            msg: 'Media type must be image, video, audio, or document'
          }
        },
        comment: 'Category of the media file'
      },

      // Accessibility
      alt_text: {
        type: DataTypes.STRING(500),
        allowNull: true,
        validate: {
          len: {
            args: [0, 500],
            msg: 'Alt text cannot exceed 500 characters'
          }
        },
        comment: 'Alternative text for accessibility'
      },

      // Media dimensions (for images/videos)
      width: {
        type: DataTypes.INTEGER,
        allowNull: true,
        validate: {
          min: {
            args: [1],
            msg: 'Width must be at least 1 pixel'
          },
          max: {
            args: [10000],
            msg: 'Width cannot exceed 10000 pixels'
          }
        },
        comment: 'Width in pixels (for images/videos)'
      },

      height: {
        type: DataTypes.INTEGER,
        allowNull: true,
        validate: {
          min: {
            args: [1],
            msg: 'Height must be at least 1 pixel'
          },
          max: {
            args: [10000],
            msg: 'Height cannot exceed 10000 pixels'
          }
        },
        comment: 'Height in pixels (for images/videos)'
      },

      // Media duration (for videos/audio)
      duration: {
        type: DataTypes.INTEGER,
        allowNull: true,
        validate: {
          min: {
            args: [0],
            msg: 'Duration cannot be negative'
          },
          max: {
            args: [3600], // 1 hour max
            msg: 'Duration cannot exceed 1 hour'
          }
        },
        comment: 'Duration in seconds (for videos/audio)'
      },

      // Timestamps
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        comment: 'When the media was uploaded'
      }
    }, {
      sequelize,
      modelName: 'Media',
      tableName: 'media',
      timestamps: false, // Only created_at, no updated_at for media files
      underscored: true,

      // Model indexes for performance
      indexes: [
        {
          fields: ['post_id']
        },
        {
          fields: ['comment_id']
        },
        {
          fields: ['user_id']
        },
        {
          fields: ['media_type']
        },
        {
          fields: ['mime_type']
        },
        {
          fields: ['created_at']
        }
      ],

      // Custom validation
      validate: {
        // Ensure media belongs to either a post or comment, not both
        mediaAssociation() {
          if (!this.post_id && !this.comment_id) {
            throw new Error('Media must belong to either a post or comment');
          }
          if (this.post_id && this.comment_id) {
            throw new Error('Media cannot belong to both a post and comment');
          }
        }
      },

      // Model scopes for common queries
      scopes: {
        // Images only
        images: {
          where: {
            media_type: 'image'
          }
        },

        // Videos only
        videos: {
          where: {
            media_type: 'video'
          }
        },

        // Audio files only
        audio: {
          where: {
            media_type: 'audio'
          }
        },

        // Documents only
        documents: {
          where: {
            media_type: 'document'
          }
        },

        // Recent uploads (last 24 hours)
        recent: {
          where: {
            created_at: {
              [sequelize.Sequelize.Op.gte]: new Date(Date.now() - 24 * 60 * 60 * 1000)
            }
          }
        }
      },

      // Model hooks
      hooks: {
        beforeValidate: (media) => {
          // Determine media type from MIME type if not set
          if (!media.media_type && media.mime_type) {
            if (media.mime_type.startsWith('image/')) {
              media.media_type = 'image';
            } else if (media.mime_type.startsWith('video/')) {
              media.media_type = 'video';
            } else if (media.mime_type.startsWith('audio/')) {
              media.media_type = 'audio';
            } else {
              media.media_type = 'document';
            }
          }

          // Trim text fields
          if (media.filename) {
            media.filename = media.filename.trim();
          }
          if (media.original_filename) {
            media.original_filename = media.original_filename.trim();
          }
          if (media.alt_text) {
            media.alt_text = media.alt_text.trim();
          }
        }
      }
    });

    return Media;
  }

  /**
   * Get file extension from filename
   * @returns {string} File extension (without dot)
   */
  getFileExtension() {
    return path.extname(this.filename).slice(1).toLowerCase();
  }

  /**
   * Get human-readable file size
   * @returns {string} Formatted file size
   */
  getFormattedFileSize() {
    const bytes = this.file_size;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';

    const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }

  /**
   * Get formatted duration (for video/audio)
   * @returns {string} Formatted duration (MM:SS or HH:MM:SS)
   */
  getFormattedDuration() {
    if (!this.duration) return null;

    const hours = Math.floor(this.duration / 3600);
    const minutes = Math.floor((this.duration % 3600) / 60);
    const seconds = this.duration % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    } else {
      return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
  }

  /**
   * Check if media is an image
   * @returns {boolean} Whether the media is an image
   */
  isImage() {
    return this.media_type === 'image';
  }

  /**
   * Check if media is a video
   * @returns {boolean} Whether the media is a video
   */
  isVideo() {
    return this.media_type === 'video';
  }

  /**
   * Check if media is audio
   * @returns {boolean} Whether the media is audio
   */
  isAudio() {
    return this.media_type === 'audio';
  }

  /**
   * Check if media is a document
   * @returns {boolean} Whether the media is a document
   */
  isDocument() {
    return this.media_type === 'document';
  }

  /**
   * Get URL for accessing the media file
   * @param {string} baseUrl - Base URL of the server
   * @returns {string} Public URL to access the media
   */
  getUrl(baseUrl = '') {
    return `${baseUrl}/uploads/${this.file_path}`;
  }

  /**
   * Check if user can delete this media
   * @param {Object} user - User object to check permissions for
   * @returns {boolean} Whether user can delete the media
   */
  canUserDelete(user) {
    return user && user.id === this.user_id;
  }

  /**
   * Get media data with computed fields
   * @returns {Object} Media data with additional computed fields
   */
  getMediaData() {
    return {
      id: this.id,
      post_id: this.post_id,
      comment_id: this.comment_id,
      user_id: this.user_id,
      filename: this.filename,
      original_filename: this.original_filename,
      file_path: this.file_path,
      file_size: this.file_size,
      formatted_file_size: this.getFormattedFileSize(),
      mime_type: this.mime_type,
      media_type: this.media_type,
      alt_text: this.alt_text,
      width: this.width,
      height: this.height,
      duration: this.duration,
      formatted_duration: this.getFormattedDuration(),
      file_extension: this.getFileExtension(),
      created_at: this.created_at,

      // Helper flags
      is_image: this.isImage(),
      is_video: this.isVideo(),
      is_audio: this.isAudio(),
      is_document: this.isDocument()
    };
  }

  /**
   * Convert to JSON (automatically called by JSON.stringify)
   * @returns {Object} JSON representation
   */
  toJSON() {
    return this.getMediaData();
  }
}

module.exports = Media;