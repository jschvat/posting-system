/**
 * Reaction model for the social media platform
 * Raw SQL implementation
 */

const BaseModel = require('./BaseModel');

class Reaction extends BaseModel {
  constructor() {
    super('reactions');
  }

  /**
   * Create a new reaction
   * @param {Object} reactionData - Reaction data
   * @returns {Object} Created reaction
   */
  async create(reactionData) {
    // Normalize emoji name (lowercase, replace spaces with underscores)
    if (reactionData.emoji_name) {
      reactionData.emoji_name = reactionData.emoji_name
        .toLowerCase()
        .replace(/\s+/g, '_')
        .replace(/[^a-z0-9_]/g, '');
    }

    // Validate reaction association (must be on either post or comment, not both)
    if (!reactionData.post_id && !reactionData.comment_id) {
      throw new Error('Reaction must be on either a post or comment');
    }
    if (reactionData.post_id && reactionData.comment_id) {
      throw new Error('Reaction cannot be on both a post and comment');
    }

    const reaction = await super.create(reactionData);
    return this.getReactionData(reaction);
  }

  /**
   * Get aggregated reaction counts for a post
   * @param {number} postId - ID of the post
   * @returns {Promise<Array>} Array of reaction counts grouped by type
   */
  async getPostReactionCounts(postId) {
    const result = await this.raw(
      `SELECT emoji_name,
              COUNT(*) as count
       FROM reactions
       WHERE post_id = $1
       GROUP BY emoji_name
       ORDER BY count DESC`,
      [postId]
    );

    return result.rows.map(row => ({
      emoji_name: row.emoji_name,
      count: parseInt(row.count)
    }));
  }

  /**
   * Get aggregated reaction counts for a comment
   * @param {number} commentId - ID of the comment
   * @returns {Promise<Array>} Array of reaction counts grouped by type
   */
  async getCommentReactionCounts(commentId) {
    const result = await this.raw(
      `SELECT emoji_name,
              COUNT(*) as count
       FROM reactions
       WHERE comment_id = $1
       GROUP BY emoji_name
       ORDER BY count DESC`,
      [commentId]
    );

    return result.rows.map(row => ({
      emoji_name: row.emoji_name,
      count: parseInt(row.count)
    }));
  }

  /**
   * Get user's reaction on a specific post
   * @param {number} userId - ID of the user
   * @param {number} postId - ID of the post
   * @returns {Promise<Object|null>} User's reaction or null
   */
  async getUserPostReaction(userId, postId) {
    const result = await this.raw(
      'SELECT * FROM reactions WHERE user_id = $1 AND post_id = $2',
      [userId, postId]
    );

    return result.rows[0] ? this.getReactionData(result.rows[0]) : null;
  }

  /**
   * Get user's reaction on a specific comment
   * @param {number} userId - ID of the user
   * @param {number} commentId - ID of the comment
   * @returns {Promise<Object|null>} User's reaction or null
   */
  async getUserCommentReaction(userId, commentId) {
    const result = await this.raw(
      'SELECT * FROM reactions WHERE user_id = $1 AND comment_id = $2',
      [userId, commentId]
    );

    return result.rows[0] ? this.getReactionData(result.rows[0]) : null;
  }

  /**
   * Get reactions for a post with user info
   * @param {number} postId - Post ID
   * @param {number} limit - Limit
   * @param {number} offset - Offset
   * @returns {Array} Array of reactions with user info
   */
  async getPostReactions(postId, limit = 50, offset = 0) {
    const result = await this.raw(
      `SELECT r.*,
              u.username, u.first_name, u.last_name, u.avatar_url
       FROM reactions r
       JOIN users u ON r.user_id = u.id
       WHERE r.post_id = $1
       ORDER BY r.created_at DESC
       LIMIT $2 OFFSET $3`,
      [postId, limit, offset]
    );

    return result.rows.map(reaction => this.getReactionData(reaction));
  }

  /**
   * Get reactions for a comment with user info
   * @param {number} commentId - Comment ID
   * @param {number} limit - Limit
   * @param {number} offset - Offset
   * @returns {Array} Array of reactions with user info
   */
  async getCommentReactions(commentId, limit = 50, offset = 0) {
    const result = await this.raw(
      `SELECT r.*,
              u.username, u.first_name, u.last_name, u.avatar_url
       FROM reactions r
       JOIN users u ON r.user_id = u.id
       WHERE r.comment_id = $1
       ORDER BY r.created_at DESC
       LIMIT $2 OFFSET $3`,
      [commentId, limit, offset]
    );

    return result.rows.map(reaction => this.getReactionData(reaction));
  }

  /**
   * Toggle reaction on a post (add if doesn't exist, remove if exists with same type, update if different type)
   * @param {number} userId - ID of the user
   * @param {number} postId - ID of the post
   * @param {string} reactionType - Type of the reaction (like, dislike, love, etc.)
   * @param {string} emojiUnicode - Unicode representation of the emoji
   * @returns {Promise<Object>} Result object with action and reaction data
   */
  async togglePostReaction(userId, postId, reactionType, emojiUnicode = '👍') {
    const existingReaction = await this.getUserPostReaction(userId, postId);

    if (existingReaction) {
      if (existingReaction.emoji_name === reactionType) {
        // Same reaction type - remove reaction
        await this.delete(existingReaction.id);
        return {
          action: 'removed',
          reaction: null
        };
      } else {
        // Different reaction type - update reaction
        const updatedReaction = await this.update(existingReaction.id, {
          emoji_name: reactionType,
          emoji_unicode: emojiUnicode
        });
        return {
          action: 'updated',
          reaction: this.getReactionData(updatedReaction)
        };
      }
    } else {
      // No existing reaction - create new one
      const newReaction = await this.create({
        user_id: userId,
        post_id: postId,
        emoji_name: reactionType,
        emoji_unicode: emojiUnicode
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
   * @param {string} reactionType - Type of the reaction (like, dislike, love, etc.)
   * @param {string} emojiUnicode - Unicode representation of the emoji
   * @returns {Promise<Object>} Result object with action and reaction data
   */
  async toggleCommentReaction(userId, commentId, reactionType, emojiUnicode = '👍') {
    const existingReaction = await this.getUserCommentReaction(userId, commentId);

    if (existingReaction) {
      if (existingReaction.emoji_name === reactionType) {
        // Same reaction type - remove reaction
        await this.delete(existingReaction.id);
        return {
          action: 'removed',
          reaction: null
        };
      } else {
        // Different reaction type - update reaction
        const updatedReaction = await this.update(existingReaction.id, {
          emoji_name: reactionType,
          emoji_unicode: emojiUnicode
        });
        return {
          action: 'updated',
          reaction: this.getReactionData(updatedReaction)
        };
      }
    } else {
      // No existing reaction - create new one
      const newReaction = await this.create({
        user_id: userId,
        comment_id: commentId,
        emoji_name: reactionType,
        emoji_unicode: emojiUnicode
      });
      return {
        action: 'added',
        reaction: newReaction
      };
    }
  }

  /**
   * Remove user's reaction from a post
   * @param {number} userId - ID of the user
   * @param {number} postId - ID of the post
   * @returns {Promise<boolean>} True if reaction was removed
   */
  async removePostReaction(userId, postId) {
    const reaction = await this.getUserPostReaction(userId, postId);
    if (reaction) {
      await this.delete(reaction.id);
      return true;
    }
    return false;
  }

  /**
   * Remove user's reaction from a comment
   * @param {number} userId - ID of the user
   * @param {number} commentId - ID of the comment
   * @returns {Promise<boolean>} True if reaction was removed
   */
  async removeCommentReaction(userId, commentId) {
    const reaction = await this.getUserCommentReaction(userId, commentId);
    if (reaction) {
      await this.delete(reaction.id);
      return true;
    }
    return false;
  }

  /**
   * Check if this is a post reaction
   * @param {Object} reaction - Reaction object
   * @returns {boolean} Whether this reaction is on a post
   */
  isPostReaction(reaction) {
    return reaction.post_id !== null;
  }

  /**
   * Check if this is a comment reaction
   * @param {Object} reaction - Reaction object
   * @returns {boolean} Whether this reaction is on a comment
   */
  isCommentReaction(reaction) {
    return reaction.comment_id !== null;
  }

  /**
   * Get reaction data with computed fields
   * @param {Object} reaction - Raw reaction data from database
   * @returns {Object} Reaction data with additional computed fields
   */
  getReactionData(reaction) {
    if (!reaction) return null;

    return {
      id: reaction.id,
      user_id: reaction.user_id,
      post_id: reaction.post_id,
      comment_id: reaction.comment_id,
      emoji_name: reaction.emoji_name,
      emoji_unicode: reaction.emoji_unicode,
      created_at: reaction.created_at,
      updated_at: reaction.updated_at,

      // Author information (if joined)
      author: reaction.username ? {
        id: reaction.user_id,
        username: reaction.username,
        first_name: reaction.first_name,
        last_name: reaction.last_name,
        full_name: `${reaction.first_name} ${reaction.last_name}`,
        avatar_url: reaction.avatar_url
      } : undefined,

      // User information (alias for author, for test compatibility)
      user: reaction.username ? {
        id: reaction.user_id,
        username: reaction.username,
        first_name: reaction.first_name,
        last_name: reaction.last_name,
        full_name: `${reaction.first_name} ${reaction.last_name}`,
        avatar_url: reaction.avatar_url
      } : undefined,

      // Helper flags
      is_post_reaction: this.isPostReaction(reaction),
      is_comment_reaction: this.isCommentReaction(reaction)
    };
  }
}

module.exports = new Reaction();