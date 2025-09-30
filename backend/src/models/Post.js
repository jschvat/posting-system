/**
 * Post model for the social media platform
 * Raw SQL implementation
 */

const BaseModel = require('./BaseModel');

class Post extends BaseModel {
  constructor() {
    super('posts');
  }

  /**
   * Create a new post
   * @param {Object} postData - Post data
   * @returns {Object} Created post
   */
  async create(postData) {
    // Trim whitespace from content
    if (postData.content) {
      postData.content = postData.content.trim();
    }

    // Set default values
    postData.privacy_level = postData.privacy_level || 'public';
    postData.is_published = postData.is_published !== false; // default true unless explicitly false
    postData.is_archived = postData.is_archived || false;

    const post = await super.create(postData);
    return this.getPostData(post);
  }

  /**
   * Get posts by user ID with pagination
   * @param {number} userId - User ID
   * @param {number} limit - Limit
   * @param {number} offset - Offset
   * @returns {Array} Array of posts
   */
  async getByUserId(userId, limit = 10, offset = 0) {
    const result = await this.raw(
      `SELECT p.*,
              u.username, u.first_name, u.last_name, u.avatar_url,
              COUNT(r.id) as reaction_count,
              COUNT(c.id) as comment_count
       FROM posts p
       JOIN users u ON p.user_id = u.id
       LEFT JOIN reactions r ON p.id = r.post_id
       LEFT JOIN comments c ON p.id = c.post_id
       WHERE p.user_id = $1 AND p.is_published = true
       GROUP BY p.id, u.id
       ORDER BY p.created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );

    return result.rows.map(post => this.getPostData(post));
  }

  /**
   * Get public posts with pagination (feed)
   * @param {number} limit - Limit
   * @param {number} offset - Offset
   * @returns {Array} Array of public posts
   */
  async getPublicPosts(limit = 10, offset = 0) {
    const result = await this.raw(
      `SELECT p.*,
              u.username, u.first_name, u.last_name, u.avatar_url,
              COUNT(r.id) as reaction_count,
              COUNT(c.id) as comment_count
       FROM posts p
       JOIN users u ON p.user_id = u.id
       LEFT JOIN reactions r ON p.id = r.post_id
       LEFT JOIN comments c ON p.id = c.post_id
       WHERE p.privacy_level = 'public' AND p.is_published = true AND p.is_archived = false
       GROUP BY p.id, u.id
       ORDER BY p.created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    return result.rows.map(post => this.getPostData(post));
  }

  /**
   * Get post by ID with author and counts
   * @param {number} postId - Post ID
   * @returns {Object|null} Post with author info
   */
  async getByIdWithAuthor(postId) {
    const result = await this.raw(
      `SELECT p.*,
              u.username, u.first_name, u.last_name, u.avatar_url,
              COUNT(r.id) as reaction_count,
              COUNT(c.id) as comment_count
       FROM posts p
       JOIN users u ON p.user_id = u.id
       LEFT JOIN reactions r ON p.id = r.post_id
       LEFT JOIN comments c ON p.id = c.post_id
       WHERE p.id = $1
       GROUP BY p.id, u.id`,
      [postId]
    );

    return result.rows[0] ? this.getPostData(result.rows[0]) : null;
  }

  /**
   * Archive/unarchive a post
   * @param {number} postId - Post ID
   * @param {boolean} archived - Whether to archive or unarchive
   * @returns {Object|null} Updated post
   */
  async setArchived(postId, archived = true) {
    return await this.update(postId, { is_archived: archived });
  }

  /**
   * Get abbreviated post content (for previews)
   * @param {string} content - Post content
   * @param {number} maxLength - Maximum length of preview
   * @returns {string} Abbreviated content
   */
  getPreview(content, maxLength = 200) {
    if (!content) return '';

    if (content.length <= maxLength) {
      return content;
    }

    return content.substring(0, maxLength).trim() + '...';
  }

  /**
   * Check if user can view this post
   * @param {Object} post - Post object
   * @param {Object} user - User object to check permissions for
   * @returns {boolean} Whether user can view the post
   */
  canUserView(post, user) {
    // Post is not published
    if (!post.is_published) {
      return user && user.id === post.user_id;
    }

    // Public posts can be viewed by anyone
    if (post.privacy_level === 'public') {
      return true;
    }

    // Private posts can only be viewed by the author
    if (post.privacy_level === 'private') {
      return user && user.id === post.user_id;
    }

    // Friends posts require friend relationship (not implemented yet)
    if (post.privacy_level === 'friends') {
      if (!user) return false;
      if (user.id === post.user_id) return true;
      // TODO: Implement friend relationship check
      return false;
    }

    return false;
  }

  /**
   * Check if user can edit this post
   * @param {Object} post - Post object
   * @param {Object} user - User object to check permissions for
   * @returns {boolean} Whether user can edit the post
   */
  canUserEdit(post, user) {
    return user && user.id === post.user_id;
  }

  /**
   * Check if user can delete this post
   * @param {Object} post - Post object
   * @param {Object} user - User object to check permissions for
   * @returns {boolean} Whether user can delete the post
   */
  canUserDelete(post, user) {
    return user && user.id === post.user_id;
  }

  /**
   * Get post data with computed fields
   * @param {Object} post - Raw post data from database
   * @returns {Object} Post data with additional computed fields
   */
  getPostData(post) {
    if (!post) return null;

    // Ensure boolean fields are properly typed
    const normalizedPost = {
      ...post,
      is_published: Boolean(post.is_published),
      is_archived: Boolean(post.is_archived)
    };

    return {
      id: normalizedPost.id,
      user_id: normalizedPost.user_id,
      content: normalizedPost.content,
      preview: this.getPreview(normalizedPost.content),
      privacy_level: normalizedPost.privacy_level,
      is_published: normalizedPost.is_published,
      is_archived: normalizedPost.is_archived,
      scheduled_for: normalizedPost.scheduled_for,
      created_at: normalizedPost.created_at,
      updated_at: normalizedPost.updated_at,

      // Author information (if joined)
      author: normalizedPost.username ? {
        id: normalizedPost.user_id,
        username: normalizedPost.username,
        first_name: normalizedPost.first_name,
        last_name: normalizedPost.last_name,
        full_name: `${normalizedPost.first_name} ${normalizedPost.last_name}`,
        avatar_url: normalizedPost.avatar_url
      } : undefined,

      // Additional computed fields
      is_edited: new Date(normalizedPost.updated_at) > new Date(normalizedPost.created_at),
      word_count: normalizedPost.content ? normalizedPost.content.split(/\s+/).length : 0,
      reaction_count: parseInt(normalizedPost.reaction_count) || 0,
      comment_count: parseInt(normalizedPost.comment_count) || 0
    };
  }
}

module.exports = new Post();