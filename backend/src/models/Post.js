/**
 * Post model for the social media platform
 * Handles main posts created by users with content and privacy settings
 */

const { DataTypes, Model } = require('sequelize');

class Post extends Model {
  /**
   * Initialize the Post model with sequelize instance
   * @param {Sequelize} sequelize - Sequelize instance
   */
  static initModel(sequelize) {
    Post.init({
      // Primary key
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        comment: 'Unique identifier for the post'
      },

      // Foreign key to User
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onDelete: 'CASCADE',
        comment: 'ID of the user who created the post'
      },

      // Post content
      content: {
        type: DataTypes.TEXT,
        allowNull: false,
        validate: {
          len: {
            args: [1, 10000],
            msg: 'Post content must be between 1 and 10000 characters'
          },
          notEmpty: {
            msg: 'Post content cannot be empty'
          }
        },
        comment: 'Main text content of the post'
      },

      // Privacy and publishing settings
      privacy_level: {
        type: DataTypes.ENUM('public', 'friends', 'private'),
        defaultValue: 'public',
        allowNull: false,
        validate: {
          isIn: {
            args: [['public', 'friends', 'private']],
            msg: 'Privacy level must be public, friends, or private'
          }
        },
        comment: 'Privacy level of the post'
      },

      is_published: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        allowNull: false,
        comment: 'Whether the post is published and visible'
      },

      // Timestamps
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        comment: 'When the post was created'
      },

      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        comment: 'When the post was last updated'
      }
    }, {
      sequelize,
      modelName: 'Post',
      tableName: 'posts',
      timestamps: true,
      underscored: true,

      // Model indexes for performance
      indexes: [
        {
          fields: ['user_id']
        },
        {
          fields: ['created_at']
        },
        {
          fields: ['user_id', 'created_at']
        },
        {
          fields: ['privacy_level']
        },
        {
          fields: ['is_published']
        },
        {
          fields: ['is_published', 'privacy_level', 'created_at']
        }
      ],

      // Model scopes for common queries
      scopes: {
        // Only published posts
        published: {
          where: {
            is_published: true
          }
        },

        // Only public posts
        public: {
          where: {
            privacy_level: 'public',
            is_published: true
          }
        },

        // Posts with user information
        withAuthor: {
          include: [{
            model: sequelize.models?.User || 'User',
            as: 'author',
            attributes: ['id', 'username', 'first_name', 'last_name', 'avatar_url']
          }]
        },

        // Posts with media
        withMedia: {
          include: [{
            model: sequelize.models?.Media || 'Media',
            as: 'media',
            required: false
          }]
        },

        // Recent posts (last 30 days)
        recent: {
          where: {
            created_at: {
              [sequelize.Sequelize.Op.gte]: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
            }
          }
        }
      },

      // Model hooks
      hooks: {
        beforeValidate: (post) => {
          // Trim whitespace from content
          if (post.content) {
            post.content = post.content.trim();
          }
        }
      }
    });

    return Post;
  }

  /**
   * Get abbreviated post content (for previews)
   * @param {number} maxLength - Maximum length of preview
   * @returns {string} Abbreviated content
   */
  getPreview(maxLength = 200) {
    if (!this.content) return '';

    if (this.content.length <= maxLength) {
      return this.content;
    }

    return this.content.substring(0, maxLength).trim() + '...';
  }

  /**
   * Check if user can view this post
   * @param {Object} user - User object to check permissions for
   * @returns {boolean} Whether user can view the post
   */
  canUserView(user) {
    // Post is not published
    if (!this.is_published) {
      return user && user.id === this.user_id;
    }

    // Public posts can be viewed by anyone
    if (this.privacy_level === 'public') {
      return true;
    }

    // Private posts can only be viewed by the author
    if (this.privacy_level === 'private') {
      return user && user.id === this.user_id;
    }

    // Friends posts require friend relationship (not implemented yet)
    if (this.privacy_level === 'friends') {
      if (!user) return false;
      if (user.id === this.user_id) return true;
      // TODO: Implement friend relationship check
      return false;
    }

    return false;
  }

  /**
   * Check if user can edit this post
   * @param {Object} user - User object to check permissions for
   * @returns {boolean} Whether user can edit the post
   */
  canUserEdit(user) {
    return user && user.id === this.user_id;
  }

  /**
   * Check if user can delete this post
   * @param {Object} user - User object to check permissions for
   * @returns {boolean} Whether user can delete the post
   */
  canUserDelete(user) {
    return user && user.id === this.user_id;
  }

  /**
   * Get post data with computed fields
   * @returns {Object} Post data with additional computed fields
   */
  getPostData() {
    return {
      id: this.id,
      user_id: this.user_id,
      content: this.content,
      preview: this.getPreview(),
      privacy_level: this.privacy_level,
      is_published: this.is_published,
      created_at: this.created_at,
      updated_at: this.updated_at,

      // Additional computed fields
      is_edited: this.updated_at > this.created_at,
      word_count: this.content ? this.content.split(/\s+/).length : 0
    };
  }

  /**
   * Convert to JSON (automatically called by JSON.stringify)
   * @returns {Object} JSON representation
   */
  toJSON() {
    return this.getPostData();
  }
}

module.exports = Post;