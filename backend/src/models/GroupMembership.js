const db = require('../config/database');

class GroupMembership {
  /**
   * Add a member to a group
   */
  static async create({
    group_id,
    user_id,
    role = 'member',
    status = 'active',
    invited_by = null
  }) {
    const query = `
      INSERT INTO group_memberships (group_id, user_id, role, status, invited_by)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;

    const values = [group_id, user_id, role, status, invited_by];
    const result = await db.query(query, values);
    return result.rows[0];
  }

  /**
   * Find membership by ID
   */
  static async findById(id) {
    const query = 'SELECT * FROM group_memberships WHERE id = $1';
    const result = await db.query(query, [id]);
    return result.rows[0];
  }

  /**
   * Find membership by group and user
   */
  static async findByGroupAndUser(group_id, user_id) {
    const query = 'SELECT * FROM group_memberships WHERE group_id = $1 AND user_id = $2';
    const result = await db.query(query, [group_id, user_id]);
    return result.rows[0];
  }

  /**
   * Check if user is member of group
   */
  static async isMember(group_id, user_id, status = 'active') {
    const query = `
      SELECT EXISTS(
        SELECT 1 FROM group_memberships
        WHERE group_id = $1 AND user_id = $2 AND status = $3
      ) as is_member
    `;
    const result = await db.query(query, [group_id, user_id, status]);
    return result.rows[0].is_member;
  }

  /**
   * Check if user is moderator or admin
   */
  static async isModerator(group_id, user_id) {
    const query = `
      SELECT EXISTS(
        SELECT 1 FROM group_memberships
        WHERE group_id = $1 AND user_id = $2 AND status = 'active'
        AND role IN ('moderator', 'admin')
      ) as is_moderator
    `;
    const result = await db.query(query, [group_id, user_id]);
    return result.rows[0].is_moderator;
  }

  /**
   * Check if user is admin
   */
  static async isAdmin(group_id, user_id) {
    const query = `
      SELECT EXISTS(
        SELECT 1 FROM group_memberships
        WHERE group_id = $1 AND user_id = $2 AND status = 'active' AND role = 'admin'
      ) as is_admin
    `;
    const result = await db.query(query, [group_id, user_id]);
    return result.rows[0].is_admin;
  }

  /**
   * Get user's role in group
   */
  static async getUserRole(group_id, user_id) {
    const query = `
      SELECT role, status FROM group_memberships
      WHERE group_id = $1 AND user_id = $2
    `;
    const result = await db.query(query, [group_id, user_id]);
    return result.rows[0];
  }

  /**
   * Update membership (change role or status)
   */
  static async update(group_id, user_id, updates) {
    const allowedFields = ['role', 'status', 'banned_by', 'banned_reason', 'banned_at'];

    const fields = [];
    const values = [];
    let paramIndex = 1;

    Object.keys(updates).forEach(key => {
      if (allowedFields.includes(key) && updates[key] !== undefined) {
        fields.push(`${key} = $${paramIndex}`);
        values.push(updates[key]);
        paramIndex++;
      }
    });

    if (fields.length === 0) {
      return null;
    }

    values.push(group_id, user_id);
    const query = `
      UPDATE group_memberships
      SET ${fields.join(', ')}
      WHERE group_id = $${paramIndex} AND user_id = $${paramIndex + 1}
      RETURNING *
    `;

    const result = await db.query(query, values);
    return result.rows[0];
  }

  /**
   * Remove membership (leave group)
   */
  static async delete(group_id, user_id) {
    const query = 'DELETE FROM group_memberships WHERE group_id = $1 AND user_id = $2 RETURNING *';
    const result = await db.query(query, [group_id, user_id]);
    return result.rows[0];
  }

  /**
   * Get group members with user info
   */
  static async getGroupMembers(group_id, {
    status = 'active',
    role = null,
    limit = 50,
    offset = 0
  } = {}) {
    const conditions = ['gm.group_id = $1'];
    const values = [group_id];
    let paramIndex = 2;

    if (status) {
      conditions.push(`gm.status = $${paramIndex}`);
      values.push(status);
      paramIndex++;
    }

    if (role) {
      conditions.push(`gm.role = $${paramIndex}`);
      values.push(role);
      paramIndex++;
    }

    values.push(limit, offset);

    const query = `
      SELECT gm.*,
             u.username, u.first_name, u.last_name, u.avatar_url, u.bio,
             inviter.username as invited_by_username
      FROM group_memberships gm
      INNER JOIN users u ON gm.user_id = u.id
      LEFT JOIN users inviter ON gm.invited_by = inviter.id
      WHERE ${conditions.join(' AND ')}
      ORDER BY
        CASE gm.role
          WHEN 'admin' THEN 1
          WHEN 'moderator' THEN 2
          ELSE 3
        END,
        gm.joined_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    const countQuery = `
      SELECT COUNT(*) as total
      FROM group_memberships gm
      WHERE ${conditions.join(' AND ')}
    `;

    const [membersResult, countResult] = await Promise.all([
      db.query(query, values),
      db.query(countQuery, values.slice(0, -2))
    ]);

    return {
      members: membersResult.rows,
      total: parseInt(countResult.rows[0].total),
      limit,
      offset
    };
  }

  /**
   * Get user's groups
   */
  static async getUserGroups(user_id, {
    status = 'active',
    limit = 50,
    offset = 0
  } = {}) {
    const query = `
      SELECT gm.*, g.name, g.slug, g.display_name, g.avatar_url,
             g.member_count, g.post_count, g.visibility
      FROM group_memberships gm
      INNER JOIN groups g ON gm.group_id = g.id
      WHERE gm.user_id = $1 AND gm.status = $2
      ORDER BY gm.joined_at DESC
      LIMIT $3 OFFSET $4
    `;

    const result = await db.query(query, [user_id, status, limit, offset]);
    return result.rows;
  }

  /**
   * Get admins of a group
   */
  static async getAdmins(group_id) {
    const query = `
      SELECT gm.*, u.username, u.first_name, u.last_name, u.avatar_url
      FROM group_memberships gm
      INNER JOIN users u ON gm.user_id = u.id
      WHERE gm.group_id = $1 AND gm.role = 'admin' AND gm.status = 'active'
      ORDER BY gm.joined_at ASC
    `;

    const result = await db.query(query, [group_id]);
    return result.rows;
  }

  /**
   * Get moderators of a group
   */
  static async getModerators(group_id) {
    const query = `
      SELECT gm.*, u.username, u.first_name, u.last_name, u.avatar_url
      FROM group_memberships gm
      INNER JOIN users u ON gm.user_id = u.id
      WHERE gm.group_id = $1 AND gm.role IN ('admin', 'moderator') AND gm.status = 'active'
      ORDER BY
        CASE gm.role WHEN 'admin' THEN 1 ELSE 2 END,
        gm.joined_at ASC
    `;

    const result = await db.query(query, [group_id]);
    return result.rows;
  }

  /**
   * Promote user to moderator
   */
  static async promoteToModerator(group_id, user_id) {
    return this.update(group_id, user_id, { role: 'moderator' });
  }

  /**
   * Promote user to admin
   */
  static async promoteToAdmin(group_id, user_id) {
    return this.update(group_id, user_id, { role: 'admin' });
  }

  /**
   * Demote user to member
   */
  static async demoteToMember(group_id, user_id) {
    return this.update(group_id, user_id, { role: 'member' });
  }

  /**
   * Ban user from group
   */
  static async ban(group_id, user_id, banned_by, banned_reason = null) {
    return this.update(group_id, user_id, {
      status: 'banned',
      banned_by,
      banned_reason,
      banned_at: new Date().toISOString()
    });
  }

  /**
   * Unban user from group
   */
  static async unban(group_id, user_id) {
    return this.update(group_id, user_id, {
      status: 'active',
      banned_by: null,
      banned_reason: null,
      banned_at: null
    });
  }

  /**
   * Get banned users
   */
  static async getBannedUsers(group_id) {
    const query = `
      SELECT gm.*,
             u.username, u.first_name, u.last_name, u.avatar_url,
             banner.username as banned_by_username
      FROM group_memberships gm
      INNER JOIN users u ON gm.user_id = u.id
      LEFT JOIN users banner ON gm.banned_by = banner.id
      WHERE gm.group_id = $1 AND gm.status = 'banned'
      ORDER BY gm.banned_at DESC
    `;

    const result = await db.query(query, [group_id]);
    return result.rows;
  }

  /**
   * Get pending membership requests
   */
  static async getPendingRequests(group_id) {
    const query = `
      SELECT gm.*, u.username, u.first_name, u.last_name, u.avatar_url, u.bio
      FROM group_memberships gm
      INNER JOIN users u ON gm.user_id = u.id
      WHERE gm.group_id = $1 AND gm.status = 'pending'
      ORDER BY gm.joined_at ASC
    `;

    const result = await db.query(query, [group_id]);
    return result.rows;
  }

  /**
   * Approve pending membership
   */
  static async approve(group_id, user_id) {
    return this.update(group_id, user_id, { status: 'active' });
  }

  /**
   * Reject pending membership
   */
  static async reject(group_id, user_id) {
    return this.delete(group_id, user_id);
  }

  /**
   * Get member count by role
   */
  static async getMemberCountByRole(group_id) {
    const query = `
      SELECT role, COUNT(*) as count
      FROM group_memberships
      WHERE group_id = $1 AND status = 'active'
      GROUP BY role
    `;

    const result = await db.query(query, [group_id]);
    return result.rows.reduce((acc, row) => {
      acc[row.role] = parseInt(row.count);
      return acc;
    }, {});
  }
}

module.exports = GroupMembership;
