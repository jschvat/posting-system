const db = require('../config/database');

class Group {
  /**
   * Create a new group
   */
  static async create({
    name,
    slug,
    display_name,
    description,
    avatar_url,
    banner_url,
    visibility = 'public',
    require_approval = false,
    allow_posts = true,
    post_approval_required = false,
    allow_multimedia = true,
    allowed_media_types = ['image', 'video', 'pdf', 'model', 'link'],
    max_file_size_mb = 50,
    creator_id,
    settings = {}
  }) {
    const query = `
      INSERT INTO groups (
        name, slug, display_name, description, avatar_url, banner_url,
        visibility, require_approval, allow_posts, post_approval_required,
        allow_multimedia, allowed_media_types, max_file_size_mb,
        creator_id, settings
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING *
    `;

    const values = [
      name, slug, display_name, description, avatar_url, banner_url,
      visibility, require_approval, allow_posts, post_approval_required,
      allow_multimedia, allowed_media_types, max_file_size_mb,
      creator_id, JSON.stringify(settings)
    ];

    const result = await db.query(query, values);
    return result.rows[0];
  }

  /**
   * Find group by ID
   */
  static async findById(id) {
    const query = 'SELECT * FROM groups WHERE id = $1';
    const result = await db.query(query, [id]);
    return result.rows[0];
  }

  /**
   * Find group by slug
   */
  static async findBySlug(slug) {
    const query = 'SELECT * FROM groups WHERE slug = $1';
    const result = await db.query(query, [slug]);
    return result.rows[0];
  }

  /**
   * Find group by name
   */
  static async findByName(name) {
    const query = 'SELECT * FROM groups WHERE name = $1';
    const result = await db.query(query, [name]);
    return result.rows[0];
  }

  /**
   * Update group
   */
  static async update(id, updates) {
    const allowedFields = [
      'display_name', 'description', 'avatar_url', 'banner_url',
      'visibility', 'require_approval', 'allow_posts', 'post_approval_required',
      'allow_multimedia', 'allowed_media_types', 'max_file_size_mb', 'settings', 'rules',
      'allow_text_posts', 'allow_link_posts', 'allow_image_posts', 'allow_video_posts', 'allow_poll_posts',
      'moderator_can_remove_posts', 'moderator_can_remove_comments', 'moderator_can_ban_members',
      'moderator_can_approve_posts', 'moderator_can_approve_members', 'moderator_can_pin_posts', 'moderator_can_lock_posts'
    ];

    const fields = [];
    const values = [];
    let paramIndex = 1;

    Object.keys(updates).forEach(key => {
      if (allowedFields.includes(key) && updates[key] !== undefined) {
        fields.push(`${key} = $${paramIndex}`);
        values.push(key === 'settings' ? JSON.stringify(updates[key]) : updates[key]);
        paramIndex++;
      }
    });

    if (fields.length === 0) {
      return null;
    }

    values.push(id);
    const query = `
      UPDATE groups
      SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await db.query(query, values);
    return result.rows[0];
  }

  /**
   * Delete group
   */
  static async delete(id) {
    const query = 'DELETE FROM groups WHERE id = $1 RETURNING *';
    const result = await db.query(query, [id]);
    return result.rows[0];
  }

  /**
   * List groups with pagination and filters
   */
  static async list({
    limit = 20,
    offset = 0,
    visibility = null,
    creator_id = null,
    search = null,
    sort_by = 'created_at',
    sort_order = 'DESC'
  }) {
    const conditions = [];
    const values = [];
    let paramIndex = 1;

    if (visibility) {
      conditions.push(`visibility = $${paramIndex}`);
      values.push(visibility);
      paramIndex++;
    }

    if (creator_id) {
      conditions.push(`creator_id = $${paramIndex}`);
      values.push(creator_id);
      paramIndex++;
    }

    if (search) {
      conditions.push(`(display_name ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`);
      values.push(`%${search}%`);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Validate sort fields to prevent SQL injection
    const validSortFields = ['created_at', 'member_count', 'post_count', 'display_name'];
    const sortField = validSortFields.includes(sort_by) ? sort_by : 'created_at';
    const sortDirection = sort_order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    values.push(limit, offset);

    const query = `
      SELECT g.*, u.username as creator_username, u.avatar_url as creator_avatar
      FROM groups g
      LEFT JOIN users u ON g.creator_id = u.id
      ${whereClause}
      ORDER BY g.${sortField} ${sortDirection}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    const countQuery = `
      SELECT COUNT(*) as total
      FROM groups g
      ${whereClause}
    `;

    const [groupsResult, countResult] = await Promise.all([
      db.query(query, values),
      db.query(countQuery, values.slice(0, -2))
    ]);

    return {
      groups: groupsResult.rows,
      total: parseInt(countResult.rows[0].total),
      limit,
      offset
    };
  }

  /**
   * Get group with creator info
   */
  static async getWithCreator(id) {
    const query = `
      SELECT g.*, u.username as creator_username, u.avatar_url as creator_avatar,
             u.first_name as creator_first_name, u.last_name as creator_last_name
      FROM groups g
      LEFT JOIN users u ON g.creator_id = u.id
      WHERE g.id = $1
    `;

    const result = await db.query(query, [id]);
    return result.rows[0];
  }

  /**
   * Get groups user is a member of
   */
  static async getUserGroups(user_id, status = 'active') {
    const query = `
      SELECT g.*, gm.role, gm.joined_at,
             u.username as creator_username, u.avatar_url as creator_avatar
      FROM groups g
      INNER JOIN group_memberships gm ON g.id = gm.group_id
      LEFT JOIN users u ON g.creator_id = u.id
      WHERE gm.user_id = $1 AND gm.status = $2
      ORDER BY gm.joined_at DESC
    `;

    const result = await db.query(query, [user_id, status]);
    return result.rows;
  }

  /**
   * Search groups by name or description (full-text search)
   */
  static async search(searchTerm, limit = 20, offset = 0) {
    const query = `
      SELECT g.*, u.username as creator_username, u.avatar_url as creator_avatar,
             ts_rank(to_tsvector('english', g.display_name || ' ' || COALESCE(g.description, '')),
                     plainto_tsquery('english', $1)) as rank
      FROM groups g
      LEFT JOIN users u ON g.creator_id = u.id
      WHERE to_tsvector('english', g.display_name || ' ' || COALESCE(g.description, '')) @@ plainto_tsquery('english', $1)
      ORDER BY rank DESC, g.member_count DESC
      LIMIT $2 OFFSET $3
    `;

    const result = await db.query(query, [searchTerm, limit, offset]);
    return result.rows;
  }

  /**
   * Get popular groups
   */
  static async getPopular(limit = 10) {
    const query = `
      SELECT g.*, u.username as creator_username, u.avatar_url as creator_avatar
      FROM groups g
      LEFT JOIN users u ON g.creator_id = u.id
      WHERE g.visibility = 'public'
      ORDER BY g.member_count DESC, g.post_count DESC
      LIMIT $1
    `;

    const result = await db.query(query, [limit]);
    return result.rows;
  }

  /**
   * Get recently created groups
   */
  static async getRecent(limit = 10) {
    const query = `
      SELECT g.*, u.username as creator_username, u.avatar_url as creator_avatar
      FROM groups g
      LEFT JOIN users u ON g.creator_id = u.id
      WHERE g.visibility = 'public'
      ORDER BY g.created_at DESC
      LIMIT $1
    `;

    const result = await db.query(query, [limit]);
    return result.rows;
  }

  /**
   * Check if slug is available
   */
  static async isSlugAvailable(slug, excludeId = null) {
    const query = excludeId
      ? 'SELECT id FROM groups WHERE slug = $1 AND id != $2'
      : 'SELECT id FROM groups WHERE slug = $1';

    const values = excludeId ? [slug, excludeId] : [slug];
    const result = await db.query(query, values);
    return result.rows.length === 0;
  }

  /**
   * Generate a unique slug from name
   */
  static async generateSlug(name, baseSlug = null) {
    const slug = (baseSlug || name)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 100);

    if (await this.isSlugAvailable(slug)) {
      return slug;
    }

    // Append number if slug exists
    let counter = 1;
    let newSlug = `${slug}-${counter}`;
    while (!(await this.isSlugAvailable(newSlug))) {
      counter++;
      newSlug = `${slug}-${counter}`;
    }

    return newSlug;
  }
}

module.exports = Group;
