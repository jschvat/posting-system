/**
 * GroupCommentMedia model
 * Handles media attachments for group comments
 */

const db = require('../config/database');

class GroupCommentMedia {
  /**
   * Create a new media record for a group comment
   */
  static async create({
    comment_id,
    file_name,
    file_path,
    file_url,
    file_type,
    file_size,
    mime_type,
    media_type,
    width,
    height,
    duration,
    thumbnail_url,
    display_order = 0
  }) {
    const query = `
      INSERT INTO group_comment_media (
        comment_id, file_name, file_path, file_url, file_type, file_size,
        mime_type, media_type, width, height, duration, thumbnail_url, display_order
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *
    `;

    const values = [
      comment_id, file_name, file_path, file_url, file_type, file_size,
      mime_type, media_type, width, height, duration, thumbnail_url, display_order
    ];

    const result = await db.query(query, values);
    return result.rows[0];
  }

  /**
   * Get media files by comment ID
   */
  static async getByCommentId(commentId) {
    const query = `
      SELECT * FROM group_comment_media
      WHERE comment_id = $1
      ORDER BY display_order ASC, uploaded_at ASC
    `;

    const result = await db.query(query, [commentId]);
    return result.rows;
  }

  /**
   * Get single media by ID
   */
  static async findById(id) {
    const query = 'SELECT * FROM group_comment_media WHERE id = $1';
    const result = await db.query(query, [id]);
    return result.rows[0];
  }

  /**
   * Delete media by ID
   */
  static async deleteById(id) {
    const query = 'DELETE FROM group_comment_media WHERE id = $1 RETURNING *';
    const result = await db.query(query, [id]);
    return result.rows[0];
  }

  /**
   * Delete all media for a comment
   */
  static async deleteByCommentId(commentId) {
    const query = 'DELETE FROM group_comment_media WHERE comment_id = $1 RETURNING *';
    const result = await db.query(query, [commentId]);
    return result.rows;
  }

  /**
   * Get media type from MIME type
   */
  static getMediaTypeFromMime(mimeType) {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType === 'application/pdf') return 'pdf';
    if (mimeType.startsWith('model/')) return 'model';
    return 'other';
  }

  /**
   * Get human-readable file size
   */
  static getFormattedFileSize(bytes) {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';

    const i = parseInt(Math.floor(Math.log(bytes) / Math.pow(1024)));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }
}

module.exports = GroupCommentMedia;
