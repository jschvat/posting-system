/**
 * Comment model for the social media platform
 * Handles comments and nested replies on posts with hierarchical structure
 */

const { DataTypes, Model } = require('sequelize');

class Comment extends Model {
  /**
   * Initialize the Comment model with sequelize instance
   * @param {Sequelize} sequelize - Sequelize instance
   */
  static initModel(sequelize) {
    Comment.init({
      // Primary key
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        comment: 'Unique identifier for the comment'
      },

      // Foreign key to Post
      post_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'posts',
          key: 'id'
        },
        onDelete: 'CASCADE',
        comment: 'ID of the post this comment belongs to'
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
        comment: 'ID of the user who created the comment'
      },

      // Foreign key to parent Comment (for nested replies)
      parent_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: 'comments',
          key: 'id'
        },
        onDelete: 'CASCADE',
        comment: 'ID of the parent comment (null for top-level comments)'
      },

      // Comment content
      content: {
        type: DataTypes.TEXT,
        allowNull: false,
        validate: {
          len: {
            args: [1, 2000],
            msg: 'Comment content must be between 1 and 2000 characters'
          },
          notEmpty: {
            msg: 'Comment content cannot be empty'
          }
        },
        comment: 'Text content of the comment'
      },

      // Publishing status
      is_published: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        allowNull: false,
        comment: 'Whether the comment is published and visible'
      },

      // Timestamps
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        comment: 'When the comment was created'
      },

      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        comment: 'When the comment was last updated'
      }
    }, {
      sequelize,
      modelName: 'Comment',
      tableName: 'comments',
      timestamps: true,
      underscored: true,

      // Model indexes for performance
      indexes: [
        {
          fields: ['post_id']
        },
        {
          fields: ['user_id']
        },
        {
          fields: ['parent_id']
        },
        {
          fields: ['post_id', 'created_at']
        },
        {
          fields: ['post_id', 'parent_id']
        },
        {
          fields: ['is_published']
        },
        {
          fields: ['created_at']
        }
      ],

      // Model scopes for common queries
      scopes: {
        // Only published comments
        published: {
          where: {
            is_published: true
          }
        },

        // Top-level comments only (not replies)
        topLevel: {
          where: {
            parent_id: null
          }
        },

        // Replies only (not top-level comments)
        replies: {
          where: {
            parent_id: {
              [sequelize.Sequelize.Op.not]: null
            }
          }
        },

        // Comments with author information
        withAuthor: {
          include: [{
            model: sequelize.models?.User || 'User',
            as: 'author',
            attributes: ['id', 'username', 'first_name', 'last_name', 'avatar_url']
          }]
        },

        // Comments with replies included
        withReplies: {
          include: [{
            model: 'Comment',
            as: 'replies',
            separate: true,
            order: [['created_at', 'ASC']]
          }]
        },

        // Recent comments (last 7 days)
        recent: {
          where: {
            created_at: {
              [sequelize.Sequelize.Op.gte]: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
            }
          }
        }
      },

      // Model hooks
      hooks: {
        beforeValidate: (comment) => {
          // Trim whitespace from content
          if (comment.content) {
            comment.content = comment.content.trim();
          }
        },

        beforeCreate: async (comment) => {
          // Validate parent comment belongs to same post
          if (comment.parent_id) {
            const parentComment = await Comment.findByPk(comment.parent_id);
            if (!parentComment || parentComment.post_id !== comment.post_id) {
              throw new Error('Parent comment must belong to the same post');
            }

            // Prevent excessive nesting (max 5 levels deep)
            const depth = await Comment.getCommentDepth(comment.parent_id);
            if (depth >= 5) {
              throw new Error('Maximum comment nesting depth exceeded');
            }
          }
        }
      }
    });

    return Comment;
  }

  /**
   * Get the depth/level of a comment in the reply tree
   * @param {number} commentId - ID of the comment to check depth for
   * @returns {Promise<number>} Depth level (0 for top-level, 1 for first reply, etc.)
   */
  static async getCommentDepth(commentId) {
    if (!commentId) return 0;

    const comment = await Comment.findByPk(commentId, {
      attributes: ['parent_id']
    });

    if (!comment || !comment.parent_id) {
      return 0;
    }

    return 1 + await Comment.getCommentDepth(comment.parent_id);
  }

  /**
   * Get all comments for a post in hierarchical structure
   * @param {number} postId - ID of the post
   * @returns {Promise<Array>} Hierarchical array of comments
   */
  static async getCommentTree(postId) {
    // Get all comments for the post
    const comments = await Comment.findAll({
      where: {
        post_id: postId,
        is_published: true
      },
      include: [{
        model: this.sequelize.models.User,
        as: 'author',
        attributes: ['id', 'username', 'first_name', 'last_name', 'avatar_url']
      }],
      order: [['created_at', 'ASC']]
    });

    // Build hierarchical structure
    const commentMap = new Map();
    const rootComments = [];

    // Create map of all comments
    comments.forEach(comment => {
      comment.replies = [];
      commentMap.set(comment.id, comment);
    });

    // Build parent-child relationships
    comments.forEach(comment => {
      if (comment.parent_id) {
        const parent = commentMap.get(comment.parent_id);
        if (parent) {
          parent.replies.push(comment);
        }
      } else {
        rootComments.push(comment);
      }
    });

    return rootComments;
  }

  /**
   * Get comment preview (truncated content)
   * @param {number} maxLength - Maximum length of preview
   * @returns {string} Abbreviated content
   */
  getPreview(maxLength = 100) {
    if (!this.content) return '';

    if (this.content.length <= maxLength) {
      return this.content;
    }

    return this.content.substring(0, maxLength).trim() + '...';
  }

  /**
   * Check if user can edit this comment
   * @param {Object} user - User object to check permissions for
   * @returns {boolean} Whether user can edit the comment
   */
  canUserEdit(user) {
    return user && user.id === this.user_id;
  }

  /**
   * Check if user can delete this comment
   * @param {Object} user - User object to check permissions for
   * @returns {boolean} Whether user can delete the comment
   */
  canUserDelete(user) {
    return user && user.id === this.user_id;
  }

  /**
   * Get comment depth level
   * @returns {Promise<number>} Depth level of this comment
   */
  async getDepth() {
    return Comment.getCommentDepth(this.parent_id);
  }

  /**
   * Check if this is a reply (has parent comment)
   * @returns {boolean} Whether this comment is a reply
   */
  isReply() {
    return this.parent_id !== null;
  }

  /**
   * Get comment data with computed fields
   * @returns {Object} Comment data with additional computed fields
   */
  getCommentData() {
    return {
      id: this.id,
      post_id: this.post_id,
      user_id: this.user_id,
      parent_id: this.parent_id,
      content: this.content,
      preview: this.getPreview(),
      is_published: this.is_published,
      is_reply: this.isReply(),
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
    const data = this.getCommentData();

    // Include replies if they exist
    if (this.replies) {
      data.replies = this.replies;
    }

    return data;
  }
}

module.exports = Comment;