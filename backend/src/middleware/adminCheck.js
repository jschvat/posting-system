/**
 * Middleware to check if user has platform admin privileges
 * For now, checks if user is an admin in at least one group
 * Can be enhanced later with dedicated platform admin role
 */

const GroupMembership = require('../models/GroupMembership');

/**
 * Check if user is a platform admin
 * Currently considers users who are admins in at least one group as platform admins
 * This can be replaced with a dedicated platform role in the future
 */
const requireAdmin = async (req, res, next) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Authentication required',
          type: 'auth_error'
        }
      });
    }

    // Check if user is an admin in any group
    const result = await GroupMembership.raw(
      `SELECT COUNT(*) as admin_count
       FROM group_memberships
       WHERE user_id = $1 AND role = 'admin' AND status = 'active'`,
      [req.user.id]
    );

    const isAdmin = parseInt(result.rows[0].admin_count) > 0;

    if (!isAdmin) {
      return res.status(403).json({
        success: false,
        error: {
          message: 'Admin access required. You must be an admin of at least one group.',
          type: 'permission_error'
        }
      });
    }

    // User is an admin, allow access
    next();
  } catch (error) {
    console.error('Admin check error:', error);
    return res.status(500).json({
      success: false,
      error: {
        message: 'Error checking admin permissions',
        type: 'server_error'
      }
    });
  }
};

module.exports = { requireAdmin };
