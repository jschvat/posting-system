/**
 * Comment model for the social media platform
 * Raw SQL implementation
 */

const BaseModel = require('./BaseModel');

class Comment extends BaseModel {
  constructor() {
    super('comments');
  }

  /**
   * Create a new comment
   * @param {Object} commentData - Comment data
   * @returns {Object} Created comment
   */
  async create(commentData) {
    // Trim whitespace from content
    if (commentData.content) {
      commentData.content = commentData.content.trim();
    }

    // Set default values
    commentData.is_published = commentData.is_published !== false;

    // Validate parent comment belongs to same post
    if (commentData.parent_id) {
      const parentComment = await this.findById(commentData.parent_id);
      if (!parentComment || parentComment.post_id !== commentData.post_id) {
        throw new Error('Parent comment must belong to the same post');
      }

      // Prevent excessive nesting (max 5 levels deep)
      const parentDepth = await this.getCommentDepth(commentData.parent_id);
      const newCommentDepth = parentDepth + 1;
      if (newCommentDepth >= 5) {
        throw new Error('Maximum comment nesting depth exceeded');
      }
    }

    const comment = await super.create(commentData);
    return this.getCommentData(comment);
  }

  /**
   * Get the depth/level of a comment in the reply tree
   * @param {number} commentId - ID of the comment to check depth for
   * @returns {Promise<number>} Depth level (0 for top-level, 1 for first reply, etc.)
   */
  async getCommentDepth(commentId) {
    if (!commentId) return 0;

    const comment = await this.findById(commentId);
    if (!comment || !comment.parent_id) {
      return 0;
    }

    return 1 + await this.getCommentDepth(comment.parent_id);
  }

  /**
   * Get comments for a post with pagination
   * @param {number} postId - Post ID
   * @param {number} limit - Limit
   * @param {number} offset - Offset
   * @returns {Array} Array of comments with author info
   */
  async getByPostId(postId, limit = 20, offset = 0) {
    const result = await this.raw(
      `SELECT c.*,
              u.username, u.first_name, u.last_name, u.avatar_url,
              COUNT(r.id) as reaction_count
       FROM comments c
       JOIN users u ON c.user_id = u.id
       LEFT JOIN reactions r ON c.id = r.comment_id
       WHERE c.post_id = $1 AND c.is_published = true AND c.parent_id IS NULL
       GROUP BY c.id, u.id
       ORDER BY c.created_at DESC
       LIMIT $2 OFFSET $3`,
      [postId, limit, offset]
    );

    return result.rows.map(comment => this.getCommentData(comment));
  }

  /**
   * Get all comments for a post in hierarchical structure
   * @param {number} postId - ID of the post
   * @returns {Promise<Array>} Hierarchical array of comments
   */
  async getCommentTree(postId) {
    // Get all comments for the post
    const result = await this.raw(
      `SELECT c.*,
              u.username, u.first_name, u.last_name, u.avatar_url,
              COUNT(r.id) as reaction_count
       FROM comments c
       JOIN users u ON c.user_id = u.id
       LEFT JOIN reactions r ON c.id = r.comment_id
       WHERE c.post_id = $1 AND c.is_published = true
       GROUP BY c.id, u.id
       ORDER BY c.created_at ASC`,
      [postId]
    );

    const comments = result.rows.map(comment => {
      const commentData = this.getCommentData(comment);
      commentData.replies = [];
      return commentData;
    });

    // Build hierarchical structure
    const commentMap = new Map();
    const rootComments = [];

    // Create map of all comments
    comments.forEach(comment => {
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
   * Get replies for a specific comment
   * @param {number} parentId - Parent comment ID
   * @param {number} limit - Limit
   * @param {number} offset - Offset
   * @returns {Array} Array of reply comments
   */
  async getReplies(parentId, limit = 10, offset = 0) {
    const result = await this.raw(
      `SELECT c.*,
              u.username, u.first_name, u.last_name, u.avatar_url,
              COUNT(r.id) as reaction_count
       FROM comments c
       JOIN users u ON c.user_id = u.id
       LEFT JOIN reactions r ON c.id = r.comment_id
       WHERE c.parent_id = $1 AND c.is_published = true
       GROUP BY c.id, u.id
       ORDER BY c.created_at ASC
       LIMIT $2 OFFSET $3`,
      [parentId, limit, offset]
    );

    return result.rows.map(comment => this.getCommentData(comment));
  }

  /**
   * Get comment preview (truncated content)
   * @param {string} content - Comment content
   * @param {number} maxLength - Maximum length of preview
   * @returns {string} Abbreviated content
   */
  getPreview(content, maxLength = 100) {
    if (!content) return '';

    if (content.length <= maxLength) {
      return content;
    }

    return content.substring(0, maxLength).trim() + '...';
  }

  /**
   * Check if user can edit this comment
   * @param {Object} comment - Comment object
   * @param {Object} user - User object to check permissions for
   * @returns {boolean} Whether user can edit the comment
   */
  canUserEdit(comment, user) {
    return user && user.id === comment.user_id;
  }

  /**
   * Check if user can delete this comment
   * @param {Object} comment - Comment object
   * @param {Object} user - User object to check permissions for
   * @returns {boolean} Whether user can delete the comment
   */
  canUserDelete(comment, user) {
    return user && user.id === comment.user_id;
  }

  /**
   * Check if this is a reply (has parent comment)
   * @param {Object} comment - Comment object
   * @returns {boolean} Whether this comment is a reply
   */
  isReply(comment) {
    return comment.parent_id !== null;
  }

  /**
   * Get comment data with computed fields
   * @param {Object} comment - Raw comment data from database
   * @returns {Object} Comment data with additional computed fields
   */
  getCommentData(comment) {
    if (!comment) return null;

    // Ensure boolean fields are properly typed
    const normalizedComment = {
      ...comment,
      is_published: Boolean(comment.is_published),
      is_edited: Boolean(comment.is_edited || false) // Default to false if not present
    };

    return {
      id: normalizedComment.id,
      post_id: normalizedComment.post_id,
      user_id: normalizedComment.user_id,
      parent_id: normalizedComment.parent_id,
      content: normalizedComment.content,
      preview: this.getPreview(normalizedComment.content),
      is_published: normalizedComment.is_published,
      is_edited: normalizedComment.is_edited,
      is_reply: this.isReply(normalizedComment),
      created_at: normalizedComment.created_at,
      updated_at: normalizedComment.updated_at,
      edited_at: normalizedComment.edited_at,

      // Author information (if joined)
      author: normalizedComment.username ? {
        id: normalizedComment.user_id,
        username: normalizedComment.username,
        first_name: normalizedComment.first_name,
        last_name: normalizedComment.last_name,
        full_name: `${normalizedComment.first_name} ${normalizedComment.last_name}`,
        avatar_url: normalizedComment.avatar_url
      } : undefined,

      // Additional computed fields
      word_count: normalizedComment.content ? normalizedComment.content.split(/\s+/).length : 0,
      reaction_count: parseInt(normalizedComment.reaction_count) || 0,
      replies: normalizedComment.replies || undefined,

      // Media attachments (if present)
      media: normalizedComment.media_id ? {
        id: normalizedComment.media_id,
        filename: normalizedComment.filename,
        mime_type: normalizedComment.mime_type,
        file_size: normalizedComment.file_size
      } : null
    };
  }
}

module.exports = new Comment();