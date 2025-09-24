/**
 * Reaction model for the social media platform
 * Handles emoji reactions on posts and comments
 */

const { DataTypes, Model } = require('sequelize');

class Reaction extends Model {
  /**
   * Initialize the Reaction model with sequelize instance
   * @param {Sequelize} sequelize - Sequelize instance
   */
  static initModel(sequelize) {
    Reaction.init({
      // Primary key
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        comment: 'Unique identifier for the reaction'
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
        comment: 'ID of the user who made the reaction'
      },

      // Foreign key to Post (optional - for post reactions)
      post_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: 'posts',
          key: 'id'
        },
        onDelete: 'CASCADE',
        comment: 'ID of the post this reaction is on'
      },

      // Foreign key to Comment (optional - for comment reactions)
      comment_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: 'comments',
          key: 'id'
        },
        onDelete: 'CASCADE',
        comment: 'ID of the comment this reaction is on'
      },

      // Emoji information
      emoji_unicode: {
        type: DataTypes.STRING(20),
        allowNull: false,
        validate: {
          len: {
            args: [1, 20],
            msg: 'Emoji unicode must be between 1 and 20 characters'
          },
          notEmpty: {
            msg: 'Emoji unicode cannot be empty'
          }
        },
        comment: 'Unicode representation of the emoji'
      },

      emoji_name: {
        type: DataTypes.STRING(50),
        allowNull: false,
        validate: {
          len: {
            args: [1, 50],
            msg: 'Emoji name must be between 1 and 50 characters'
          },
          notEmpty: {
            msg: 'Emoji name cannot be empty'
          },
          isAlphanumeric: {
            msg: 'Emoji name can only contain letters, numbers, and underscores'
          }
        },
        comment: 'Human-readable name of the emoji (e.g., thumbs_up, heart, laugh)'
      },

      // Timestamp
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        comment: 'When the reaction was created'
      }
    }, {
      sequelize,
      modelName: 'Reaction',
      tableName: 'reactions',
      timestamps: false, // Only created_at, reactions are not updated
      underscored: true,

      // Model indexes for performance
      indexes: [
        {
          fields: ['user_id']
        },
        {
          fields: ['post_id']
        },
        {
          fields: ['comment_id']
        },
        {
          fields: ['emoji_name']
        },
        {
          fields: ['post_id', 'emoji_name']
        },
        {
          fields: ['comment_id', 'emoji_name']
        },
        {
          fields: ['created_at']
        },
        // Unique constraints to prevent duplicate reactions
        {
          unique: true,
          fields: ['user_id', 'post_id', 'emoji_unicode'],
          name: 'unique_user_post_emoji'
        },
        {
          unique: true,
          fields: ['user_id', 'comment_id', 'emoji_unicode'],
          name: 'unique_user_comment_emoji'
        }
      ],

      // Custom validation
      validate: {
        // Ensure reaction is on either a post or comment, not both
        reactionAssociation() {
          if (!this.post_id && !this.comment_id) {
            throw new Error('Reaction must be on either a post or comment');
          }
          if (this.post_id && this.comment_id) {
            throw new Error('Reaction cannot be on both a post and comment');
          }
        }
      },

      // Model scopes for common queries
      scopes: {
        // Post reactions only
        postReactions: {
          where: {
            post_id: {
              [sequelize.Sequelize.Op.not]: null
            }
          }
        },

        // Comment reactions only
        commentReactions: {
          where: {
            comment_id: {
              [sequelize.Sequelize.Op.not]: null
            }
          }
        },

        // Reactions with user information
        withUser: {
          include: [{
            model: sequelize.models?.User || 'User',
            as: 'user',
            attributes: ['id', 'username', 'first_name', 'last_name', 'avatar_url']
          }]
        },

        // Recent reactions (last 24 hours)
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
        beforeValidate: (reaction) => {
          // Normalize emoji name (lowercase, replace spaces with underscores)
          if (reaction.emoji_name) {
            reaction.emoji_name = reaction.emoji_name
              .toLowerCase()
              .replace(/\s+/g, '_')
              .replace(/[^a-z0-9_]/g, '');
          }

          // Trim unicode
          if (reaction.emoji_unicode) {
            reaction.emoji_unicode = reaction.emoji_unicode.trim();
          }
        }
      }
    });

    return Reaction;
  }

  /**
   * Get aggregated reaction counts for a post
   * @param {number} postId - ID of the post
   * @returns {Promise<Array>} Array of reaction counts grouped by emoji
   */
  static async getPostReactionCounts(postId) {
    return await Reaction.findAll({
      attributes: [
        'emoji_name',
        'emoji_unicode',
        [this.sequelize.fn('COUNT', this.sequelize.col('id')), 'count']
      ],
      where: {
        post_id: postId
      },
      group: ['emoji_name', 'emoji_unicode'],
      order: [[this.sequelize.col('count'), 'DESC']]
    });
  }

  /**
   * Get aggregated reaction counts for a comment
   * @param {number} commentId - ID of the comment
   * @returns {Promise<Array>} Array of reaction counts grouped by emoji
   */
  static async getCommentReactionCounts(commentId) {
    return await Reaction.findAll({
      attributes: [
        'emoji_name',
        'emoji_unicode',
        [this.sequelize.fn('COUNT', this.sequelize.col('id')), 'count']
      ],
      where: {
        comment_id: commentId
      },
      group: ['emoji_name', 'emoji_unicode'],
      order: [[this.sequelize.col('count'), 'DESC']]
    });
  }

  /**
   * Get user's reaction on a specific post
   * @param {number} userId - ID of the user
   * @param {number} postId - ID of the post
   * @returns {Promise<Reaction|null>} User's reaction or null
   */
  static async getUserPostReaction(userId, postId) {
    return await Reaction.findOne({
      where: {
        user_id: userId,
        post_id: postId
      }
    });
  }

  /**
   * Get user's reaction on a specific comment
   * @param {number} userId - ID of the user
   * @param {number} commentId - ID of the comment
   * @returns {Promise<Reaction|null>} User's reaction or null
   */
  static async getUserCommentReaction(userId, commentId) {
    return await Reaction.findOne({
      where: {
        user_id: userId,
        comment_id: commentId
      }
    });
  }

  /**
   * Toggle reaction on a post (add if doesn't exist, remove if exists with same emoji, update if different emoji)
   * @param {number} userId - ID of the user
   * @param {number} postId - ID of the post
   * @param {string} emojiUnicode - Unicode of the emoji
   * @param {string} emojiName - Name of the emoji
   * @returns {Promise<Object>} Result object with action and reaction data
   */
  static async togglePostReaction(userId, postId, emojiUnicode, emojiName) {
    const existingReaction = await Reaction.getUserPostReaction(userId, postId);

    if (existingReaction) {
      if (existingReaction.emoji_unicode === emojiUnicode) {
        // Same emoji - remove reaction
        await existingReaction.destroy();
        return {
          action: 'removed',
          reaction: null
        };
      } else {
        // Different emoji - update reaction
        existingReaction.emoji_unicode = emojiUnicode;
        existingReaction.emoji_name = emojiName;
        await existingReaction.save();
        return {
          action: 'updated',
          reaction: existingReaction
        };
      }
    } else {
      // No existing reaction - create new one
      const newReaction = await Reaction.create({
        user_id: userId,
        post_id: postId,
        emoji_unicode: emojiUnicode,
        emoji_name: emojiName
      });
      return {
        action: 'added',
        reaction: newReaction
      };
    }
  }

  /**
   * Toggle reaction on a comment (similar to post reaction)
   * @param {number} userId - ID of the user
   * @param {number} commentId - ID of the comment
   * @param {string} emojiUnicode - Unicode of the emoji
   * @param {string} emojiName - Name of the emoji
   * @returns {Promise<Object>} Result object with action and reaction data
   */
  static async toggleCommentReaction(userId, commentId, emojiUnicode, emojiName) {
    const existingReaction = await Reaction.getUserCommentReaction(userId, commentId);

    if (existingReaction) {
      if (existingReaction.emoji_unicode === emojiUnicode) {
        // Same emoji - remove reaction
        await existingReaction.destroy();
        return {
          action: 'removed',
          reaction: null
        };
      } else {
        // Different emoji - update reaction
        existingReaction.emoji_unicode = emojiUnicode;
        existingReaction.emoji_name = emojiName;
        await existingReaction.save();
        return {
          action: 'updated',
          reaction: existingReaction
        };
      }
    } else {
      // No existing reaction - create new one
      const newReaction = await Reaction.create({
        user_id: userId,
        comment_id: commentId,
        emoji_unicode: emojiUnicode,
        emoji_name: emojiName
      });
      return {
        action: 'added',
        reaction: newReaction
      };
    }
  }

  /**
   * Check if this is a post reaction
   * @returns {boolean} Whether this reaction is on a post
   */
  isPostReaction() {
    return this.post_id !== null;
  }

  /**
   * Check if this is a comment reaction
   * @returns {boolean} Whether this reaction is on a comment
   */
  isCommentReaction() {
    return this.comment_id !== null;
  }

  /**
   * Get reaction data with computed fields
   * @returns {Object} Reaction data with additional computed fields
   */
  getReactionData() {
    return {
      id: this.id,
      user_id: this.user_id,
      post_id: this.post_id,
      comment_id: this.comment_id,
      emoji_unicode: this.emoji_unicode,
      emoji_name: this.emoji_name,
      created_at: this.created_at,

      // Helper flags
      is_post_reaction: this.isPostReaction(),
      is_comment_reaction: this.isCommentReaction()
    };
  }

  /**
   * Convert to JSON (automatically called by JSON.stringify)
   * @returns {Object} JSON representation
   */
  toJSON() {
    return this.getReactionData();
  }
}

module.exports = Reaction;