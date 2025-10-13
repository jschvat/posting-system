const express = require('express');
const router = express.Router();
const { authenticate: authenticateToken, optionalAuthenticate: optionalAuth } = require('../middleware/auth');
const Group = require('../models/Group');
const GroupMembership = require('../models/GroupMembership');
const User = require('../models/User');
const { validateUserLocation } = require('../utils/geolocation');

/**
 * @route   GET /api/groups
 * @desc    List groups with pagination and filters
 * @access  Public
 */
router.get('/', optionalAuth, async (req, res) => {
  try {
    const {
      limit = 20,
      offset = 0,
      visibility,
      creator_id,
      search,
      sort_by = 'created_at',
      sort_order = 'DESC'
    } = req.query;

    const result = await Group.list({
      limit: parseInt(limit),
      offset: parseInt(offset),
      visibility,
      creator_id: creator_id ? parseInt(creator_id) : null,
      search,
      sort_by,
      sort_order
    });

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error listing groups:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to list groups'
    });
  }
});

/**
 * @route   GET /api/groups/popular
 * @desc    Get popular groups
 * @access  Public
 */
router.get('/popular', async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    const groups = await Group.getPopular(parseInt(limit));

    res.json({
      success: true,
      data: groups
    });
  } catch (error) {
    console.error('Error getting popular groups:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get popular groups'
    });
  }
});

/**
 * @route   GET /api/groups/recent
 * @desc    Get recently created groups
 * @access  Public
 */
router.get('/recent', async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    const groups = await Group.getRecent(parseInt(limit));

    res.json({
      success: true,
      data: groups
    });
  } catch (error) {
    console.error('Error getting recent groups:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get recent groups'
    });
  }
});

/**
 * @route   GET /api/groups/search
 * @desc    Search groups by name or description
 * @access  Public
 */
router.get('/search', async (req, res) => {
  try {
    const { q, limit = 20, offset = 0 } = req.query;

    if (!q) {
      return res.status(400).json({
        success: false,
        error: 'Search query is required'
      });
    }

    const groups = await Group.search(q, parseInt(limit), parseInt(offset));

    res.json({
      success: true,
      data: {
        groups,
        total: groups.length,
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });
  } catch (error) {
    console.error('Error searching groups:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to search groups'
    });
  }
});

/**
 * @route   POST /api/groups
 * @desc    Create a new group
 * @access  Private
 */
router.post('/', authenticateToken, async (req, res) => {
  try {
    const {
      name,
      display_name,
      description,
      avatar_url,
      banner_url,
      visibility = 'public',
      require_approval = false,
      post_approval_required = false,
      allow_multimedia = true,
      allowed_media_types = ['image', 'video', 'pdf', 'model', 'link'],
      max_file_size_mb = 50
    } = req.body;

    // Validation
    if (!name || !display_name) {
      return res.status(400).json({
        success: false,
        error: 'Name and display name are required'
      });
    }

    // Check if name is available
    const existingGroup = await Group.findByName(name);
    if (existingGroup) {
      return res.status(400).json({
        success: false,
        error: 'Group name already exists'
      });
    }

    // Generate slug
    const slug = await Group.generateSlug(name);

    // Create group
    const group = await Group.create({
      name,
      slug,
      display_name,
      description,
      avatar_url,
      banner_url,
      visibility,
      require_approval,
      post_approval_required,
      allow_multimedia,
      allowed_media_types,
      max_file_size_mb,
      creator_id: req.user.id
    });

    // Add creator as admin
    await GroupMembership.create({
      group_id: group.id,
      user_id: req.user.id,
      role: 'admin',
      status: 'active'
    });

    res.status(201).json({
      success: true,
      data: group
    });
  } catch (error) {
    console.error('Error creating group:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create group'
    });
  }
});

/**
 * @route   GET /api/groups/:slug
 * @desc    Get group by slug
 * @access  Public
 */
router.get('/:slug', optionalAuth, async (req, res) => {
  try {
    const { slug } = req.params;
    const group = await Group.findBySlug(slug);

    if (!group) {
      return res.status(404).json({
        success: false,
        error: 'Group not found'
      });
    }

    // Check if user is a member (if authenticated)
    let membership = null;
    if (req.user) {
      membership = await GroupMembership.getUserRole(group.id, req.user.id);
    }

    // Check visibility
    if (group.visibility === 'private' && (!membership || membership.status !== 'active')) {
      return res.status(403).json({
        success: false,
        error: 'This group is private'
      });
    }

    // Get group with creator info
    const groupWithCreator = await Group.getWithCreator(group.id);

    res.json({
      success: true,
      data: {
        ...groupWithCreator,
        user_role: membership?.role || null,
        user_status: membership?.status || null
      }
    });
  } catch (error) {
    console.error('Error getting group:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get group'
    });
  }
});

/**
 * @route   PUT /api/groups/:slug
 * @desc    Update group
 * @access  Private (Admin only)
 */
router.put('/:slug', authenticateToken, async (req, res) => {
  try {
    const { slug } = req.params;
    const group = await Group.findBySlug(slug);

    if (!group) {
      return res.status(404).json({
        success: false,
        error: 'Group not found'
      });
    }

    // Check if user is admin
    const isAdmin = await GroupMembership.isAdmin(group.id, req.user.id);
    if (!isAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Only admins can update group settings'
      });
    }

    const updatedGroup = await Group.update(group.id, req.body);

    res.json({
      success: true,
      data: updatedGroup
    });
  } catch (error) {
    console.error('Error updating group:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update group'
    });
  }
});

/**
 * @route   DELETE /api/groups/:slug
 * @desc    Delete group
 * @access  Private (Admin only)
 */
router.delete('/:slug', authenticateToken, async (req, res) => {
  try {
    const { slug } = req.params;
    const group = await Group.findBySlug(slug);

    if (!group) {
      return res.status(404).json({
        success: false,
        error: 'Group not found'
      });
    }

    // Check if user is admin
    const isAdmin = await GroupMembership.isAdmin(group.id, req.user.id);
    if (!isAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Only admins can delete groups'
      });
    }

    await Group.delete(group.id);

    res.json({
      success: true,
      message: 'Group deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting group:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete group'
    });
  }
});

/**
 * @route   GET /api/groups/:slug/members
 * @desc    Get group members
 * @access  Public (for public groups) / Members only (for private groups)
 */
router.get('/:slug/members', optionalAuth, async (req, res) => {
  try {
    const { slug } = req.params;
    const { status = 'active', role, limit = 50, offset = 0 } = req.query;

    const group = await Group.findBySlug(slug);
    if (!group) {
      return res.status(404).json({
        success: false,
        error: 'Group not found'
      });
    }

    // Check visibility
    if (group.visibility === 'private') {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }

      const isMember = await GroupMembership.isMember(group.id, req.user.id);
      if (!isMember) {
        return res.status(403).json({
          success: false,
          error: 'Only members can view member list'
        });
      }
    }

    const result = await GroupMembership.getGroupMembers(group.id, {
      status,
      role,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error getting group members:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get group members'
    });
  }
});

/**
 * @route   POST /api/groups/:slug/join
 * @desc    Join a group
 * @access  Private
 */
router.post('/:slug/join', authenticateToken, async (req, res) => {
  try {
    const { slug } = req.params;
    const group = await Group.findBySlug(slug);

    if (!group) {
      return res.status(404).json({
        success: false,
        error: 'Group not found'
      });
    }

    // Check if already a member
    const existingMembership = await GroupMembership.findByGroupAndUser(group.id, req.user.id);
    if (existingMembership) {
      return res.status(400).json({
        success: false,
        error: 'Already a member of this group'
      });
    }

    // Check location restrictions
    if (group.location_restricted) {
      const user = await User.findById(req.user.id);

      // Construct location object from individual columns
      const userLocation = {
        latitude: user.location_latitude,
        longitude: user.location_longitude,
        city: user.location_city,
        state: user.location_state,
        country: user.location_country,
        sharing: user.location_sharing
      };

      const locationCheck = validateUserLocation(userLocation, group);
      if (!locationCheck.allowed) {
        return res.status(403).json({
          success: false,
          error: locationCheck.reason
        });
      }
    }

    // Check group settings
    let status = 'active';
    if (group.visibility === 'invite_only') {
      return res.status(403).json({
        success: false,
        error: 'This group is invite-only'
      });
    }
    if (group.require_approval) {
      status = 'pending';
    }

    const membership = await GroupMembership.create({
      group_id: group.id,
      user_id: req.user.id,
      role: 'member',
      status
    });

    res.status(201).json({
      success: true,
      data: membership,
      message: status === 'pending' ? 'Membership pending approval' : 'Successfully joined group'
    });
  } catch (error) {
    console.error('Error joining group:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to join group'
    });
  }
});

/**
 * @route   POST /api/groups/:slug/leave
 * @desc    Leave a group
 * @access  Private
 */
router.post('/:slug/leave', authenticateToken, async (req, res) => {
  try {
    const { slug } = req.params;
    const group = await Group.findBySlug(slug);

    if (!group) {
      return res.status(404).json({
        success: false,
        error: 'Group not found'
      });
    }

    // Check if user is the creator
    if (group.creator_id === req.user.id) {
      return res.status(400).json({
        success: false,
        error: 'Group creator cannot leave. Transfer ownership or delete the group.'
      });
    }

    // Check if user is a member
    const isMember = await GroupMembership.isMember(group.id, req.user.id);
    if (!isMember) {
      return res.status(400).json({
        success: false,
        error: 'You are not a member of this group'
      });
    }

    await GroupMembership.delete(group.id, req.user.id);

    res.json({
      success: true,
      message: 'Successfully left group'
    });
  } catch (error) {
    console.error('Error leaving group:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to leave group'
    });
  }
});

/**
 * @route   POST /api/groups/:slug/members/:userId/role
 * @desc    Update member role
 * @access  Private (Admin only)
 */
router.post('/:slug/members/:userId/role', authenticateToken, async (req, res) => {
  try {
    const { slug, userId } = req.params;
    const { role } = req.body;

    if (!['member', 'moderator', 'admin'].includes(role)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid role'
      });
    }

    const group = await Group.findBySlug(slug);
    if (!group) {
      return res.status(404).json({
        success: false,
        error: 'Group not found'
      });
    }

    // Check if user is admin
    const isAdmin = await GroupMembership.isAdmin(group.id, req.user.id);
    if (!isAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Only admins can change member roles'
      });
    }

    const updatedMembership = await GroupMembership.update(group.id, parseInt(userId), { role });

    res.json({
      success: true,
      data: updatedMembership
    });
  } catch (error) {
    console.error('Error updating member role:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update member role'
    });
  }
});

/**
 * @route   POST /api/groups/:slug/members/:userId/ban
 * @desc    Ban a member
 * @access  Private (Moderator/Admin only)
 */
router.post('/:slug/members/:userId/ban', authenticateToken, async (req, res) => {
  try {
    const { slug, userId } = req.params;
    const { banned_reason } = req.body;

    const group = await Group.findBySlug(slug);
    if (!group) {
      return res.status(404).json({
        success: false,
        error: 'Group not found'
      });
    }

    // Check if user is moderator or admin
    const isModerator = await GroupMembership.isModerator(group.id, req.user.id);
    if (!isModerator) {
      return res.status(403).json({
        success: false,
        error: 'Only moderators and admins can ban members'
      });
    }

    const updatedMembership = await GroupMembership.ban(
      group.id,
      parseInt(userId),
      req.user.id,
      banned_reason
    );

    res.json({
      success: true,
      data: updatedMembership
    });
  } catch (error) {
    console.error('Error banning member:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to ban member'
    });
  }
});

/**
 * @route   POST /api/groups/:slug/members/:userId/unban
 * @desc    Unban a member
 * @access  Private (Moderator/Admin only)
 */
router.post('/:slug/members/:userId/unban', authenticateToken, async (req, res) => {
  try {
    const { slug, userId } = req.params;

    const group = await Group.findBySlug(slug);
    if (!group) {
      return res.status(404).json({
        success: false,
        error: 'Group not found'
      });
    }

    // Check if user is moderator or admin
    const isModerator = await GroupMembership.isModerator(group.id, req.user.id);
    if (!isModerator) {
      return res.status(403).json({
        success: false,
        error: 'Only moderators and admins can unban members'
      });
    }

    const updatedMembership = await GroupMembership.unban(group.id, parseInt(userId));

    res.json({
      success: true,
      data: updatedMembership
    });
  } catch (error) {
    console.error('Error unbanning member:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to unban member'
    });
  }
});

/**
 * @route   GET /api/groups/:slug/members/pending
 * @desc    Get pending membership requests
 * @access  Private (Moderators/Admins only)
 */
router.get('/:slug/members/pending', authenticateToken, async (req, res) => {
  try {
    const { slug } = req.params;
    const { limit = 20, offset = 0 } = req.query;

    const group = await Group.findBySlug(slug);
    if (!group) {
      return res.status(404).json({
        success: false,
        error: 'Group not found'
      });
    }

    // Check if user is moderator or admin
    const isModerator = await GroupMembership.isModerator(group.id, req.user.id);
    if (!isModerator) {
      return res.status(403).json({
        success: false,
        error: 'Only moderators and admins can view pending membership requests'
      });
    }

    const result = await GroupMembership.list({
      group_id: group.id,
      status: 'pending',
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error getting pending members:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get pending members'
    });
  }
});

/**
 * @route   POST /api/groups/:slug/members/:userId/approve
 * @desc    Approve a pending membership request
 * @access  Private (Moderators/Admins only)
 */
router.post('/:slug/members/:userId/approve', authenticateToken, async (req, res) => {
  try {
    const { slug, userId } = req.params;

    const group = await Group.findBySlug(slug);
    if (!group) {
      return res.status(404).json({
        success: false,
        error: 'Group not found'
      });
    }

    // Check if user is moderator or admin
    const isModerator = await GroupMembership.isModerator(group.id, req.user.id);
    if (!isModerator) {
      return res.status(403).json({
        success: false,
        error: 'Only moderators and admins can approve membership requests'
      });
    }

    const membership = await GroupMembership.approve(group.id, parseInt(userId));

    res.json({
      success: true,
      data: membership,
      message: 'Membership approved successfully'
    });
  } catch (error) {
    console.error('Error approving membership:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to approve membership'
    });
  }
});

/**
 * @route   POST /api/groups/:slug/members/:userId/reject
 * @desc    Reject a pending membership request
 * @access  Private (Moderators/Admins only)
 */
router.post('/:slug/members/:userId/reject', authenticateToken, async (req, res) => {
  try {
    const { slug, userId } = req.params;

    const group = await Group.findBySlug(slug);
    if (!group) {
      return res.status(404).json({
        success: false,
        error: 'Group not found'
      });
    }

    // Check if user is moderator or admin
    const isModerator = await GroupMembership.isModerator(group.id, req.user.id);
    if (!isModerator) {
      return res.status(403).json({
        success: false,
        error: 'Only moderators and admins can reject membership requests'
      });
    }

    await GroupMembership.reject(group.id, parseInt(userId));

    res.json({
      success: true,
      message: 'Membership rejected successfully'
    });
  } catch (error) {
    console.error('Error rejecting membership:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reject membership'
    });
  }
});

/**
 * @route   GET /api/groups/:slug/activity
 * @desc    Get group activity log
 * @access  Private (Moderators/Admins only)
 */
router.get('/:slug/activity', authenticateToken, async (req, res) => {
  try {
    const { slug } = req.params;
    const { limit = 50, offset = 0 } = req.query;

    const group = await Group.findBySlug(slug);
    if (!group) {
      return res.status(404).json({
        success: false,
        error: 'Group not found'
      });
    }

    // Check if user is moderator or admin
    const isModerator = await GroupMembership.isModerator(group.id, req.user.id);
    if (!isModerator) {
      return res.status(403).json({
        success: false,
        error: 'Only moderators and admins can view activity log'
      });
    }

    // Query activity log
    const query = `
      SELECT
        ga.*,
        u.username as user_username,
        u.first_name,
        u.last_name,
        t.username as target_username
      FROM group_activity_log ga
      LEFT JOIN users u ON ga.user_id = u.id
      LEFT JOIN users t ON ga.target_user_id = t.id
      WHERE ga.group_id = $1
      ORDER BY ga.created_at DESC
      LIMIT $2 OFFSET $3
    `;

    const result = await sequelize.query(query, {
      bind: [group.id, parseInt(limit), parseInt(offset)],
      type: sequelize.QueryTypes.SELECT
    });

    res.json({
      success: true,
      data: {
        activities: result,
        pagination: {
          limit: parseInt(limit),
          offset: parseInt(offset)
        }
      }
    });
  } catch (error) {
    console.error('Error getting activity log:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get activity log'
    });
  }
});

/**
 * @route   GET /api/groups/:slug/members/banned
 * @desc    Get banned members list
 * @access  Private (Moderators/Admins only)
 */
router.get('/:slug/members/banned', authenticateToken, async (req, res) => {
  try {
    const { slug } = req.params;
    const { limit = 20, offset = 0 } = req.query;

    const group = await Group.findBySlug(slug);
    if (!group) {
      return res.status(404).json({
        success: false,
        error: 'Group not found'
      });
    }

    // Check if user is moderator or admin
    const isModerator = await GroupMembership.isModerator(group.id, req.user.id);
    if (!isModerator) {
      return res.status(403).json({
        success: false,
        error: 'Only moderators and admins can view banned members'
      });
    }

    const result = await GroupMembership.list({
      group_id: group.id,
      status: 'banned',
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error getting banned members:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get banned members'
    });
  }
});

module.exports = router;
