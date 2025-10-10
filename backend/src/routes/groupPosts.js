const express = require('express');
const router = express.Router();
const { authenticate: authenticateToken, optionalAuthenticate: optionalAuth } = require('../middleware/auth');
const Group = require('../models/Group');
const GroupPost = require('../models/GroupPost');
const GroupMembership = require('../models/GroupMembership');
const GroupVote = require('../models/GroupVote');

/**
 * @route   GET /api/groups/:slug/posts
 * @desc    Get posts in a group
 * @access  Public (for public groups) / Members only (for private groups)
 */
router.get('/:slug/posts', optionalAuth, async (req, res) => {
  try {
    const { slug } = req.params;
    const { sort_by = 'hot', limit = 20, offset = 0 } = req.query;

    const group = await Group.findBySlug(slug);
    if (!group) {
      return res.status(404).json({
        success: false,
        error: 'Group not found'
      });
    }

    // Check visibility and membership
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
          error: 'Only members can view posts in private groups'
        });
      }
    }

    const result = await GroupPost.getGroupPosts(group.id, {
      status: 'published',
      user_id: req.user?.userId,
      limit: parseInt(limit),
      offset: parseInt(offset),
      sort_by
    });

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error getting group posts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get group posts'
    });
  }
});

/**
 * @route   POST /api/groups/:slug/posts
 * @desc    Create a post in a group
 * @access  Private (Members only)
 */
router.post('/:slug/posts', authenticateToken, async (req, res) => {
  try {
    const { slug } = req.params;
    const {
      title,
      content,
      post_type = 'text',
      link_url,
      link_title,
      link_description,
      link_thumbnail,
      is_nsfw = false,
      is_spoiler = false
    } = req.body;

    const group = await Group.findBySlug(slug);
    if (!group) {
      return res.status(404).json({
        success: false,
        error: 'Group not found'
      });
    }

    // Check if user is a member
    const membership = await GroupMembership.findByGroupAndUser(group.id, req.user.id);
    if (!membership || membership.status !== 'active') {
      return res.status(403).json({
        success: false,
        error: 'You must be a member to post in this group'
      });
    }

    // Check if posts are allowed
    if (!group.allow_posts) {
      return res.status(403).json({
        success: false,
        error: 'Posting is disabled in this group'
      });
    }

    // Determine post status based on group settings
    let status = 'published';
    if (group.post_approval_required && membership.role === 'member') {
      status = 'pending';
    }

    const post = await GroupPost.create({
      group_id: group.id,
      user_id: req.user.id,
      title,
      content,
      post_type,
      link_url,
      link_title,
      link_description,
      link_thumbnail,
      status,
      is_nsfw,
      is_spoiler
    });

    res.status(201).json({
      success: true,
      data: post,
      message: status === 'pending' ? 'Post pending moderator approval' : 'Post created successfully'
    });
  } catch (error) {
    console.error('Error creating group post:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create post'
    });
  }
});

/**
 * @route   GET /api/groups/:slug/posts/:postId
 * @desc    Get a single post with details
 * @access  Public (for public groups) / Members only (for private groups)
 */
router.get('/:slug/posts/:postId', optionalAuth, async (req, res) => {
  try {
    const { slug, postId } = req.params;

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
          error: 'Only members can view posts in private groups'
        });
      }
    }

    const post = await GroupPost.getWithMedia(parseInt(postId), req.user?.userId);
    if (!post) {
      return res.status(404).json({
        success: false,
        error: 'Post not found'
      });
    }

    res.json({
      success: true,
      data: post
    });
  } catch (error) {
    console.error('Error getting group post:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get post'
    });
  }
});

/**
 * @route   PUT /api/groups/:slug/posts/:postId
 * @desc    Update a post
 * @access  Private (Author or Moderator)
 */
router.put('/:slug/posts/:postId', authenticateToken, async (req, res) => {
  try {
    const { slug, postId } = req.params;
    const { title, content, is_nsfw, is_spoiler } = req.body;

    const group = await Group.findBySlug(slug);
    if (!group) {
      return res.status(404).json({
        success: false,
        error: 'Group not found'
      });
    }

    const post = await GroupPost.findById(parseInt(postId));
    if (!post) {
      return res.status(404).json({
        success: false,
        error: 'Post not found'
      });
    }

    // Check permissions: author or moderator
    const isModerator = await GroupMembership.isModerator(group.id, req.user.id);
    const isAuthor = post.user_id === req.user.id;

    if (!isAuthor && !isModerator) {
      return res.status(403).json({
        success: false,
        error: 'Only the author or moderators can edit this post'
      });
    }

    const updatedPost = await GroupPost.update(parseInt(postId), {
      title,
      content,
      is_nsfw,
      is_spoiler
    });

    res.json({
      success: true,
      data: updatedPost
    });
  } catch (error) {
    console.error('Error updating group post:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update post'
    });
  }
});

/**
 * @route   DELETE /api/groups/:slug/posts/:postId
 * @desc    Delete a post
 * @access  Private (Author or Moderator)
 */
router.delete('/:slug/posts/:postId', authenticateToken, async (req, res) => {
  try {
    const { slug, postId } = req.params;

    const group = await Group.findBySlug(slug);
    if (!group) {
      return res.status(404).json({
        success: false,
        error: 'Group not found'
      });
    }

    const post = await GroupPost.findById(parseInt(postId));
    if (!post) {
      return res.status(404).json({
        success: false,
        error: 'Post not found'
      });
    }

    // Check permissions
    const isModerator = await GroupMembership.isModerator(group.id, req.user.id);
    const isAuthor = post.user_id === req.user.id;

    if (!isAuthor && !isModerator) {
      return res.status(403).json({
        success: false,
        error: 'Only the author or moderators can delete this post'
      });
    }

    await GroupPost.delete(parseInt(postId));

    res.json({
      success: true,
      message: 'Post deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting group post:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete post'
    });
  }
});

/**
 * @route   POST /api/groups/:slug/posts/:postId/vote
 * @desc    Vote on a post
 * @access  Private (Members only)
 */
router.post('/:slug/posts/:postId/vote', authenticateToken, async (req, res) => {
  try {
    const { slug, postId } = req.params;
    const { vote_type } = req.body; // 'upvote' or 'downvote'

    if (!['upvote', 'downvote'].includes(vote_type)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid vote type. Must be "upvote" or "downvote"'
      });
    }

    const group = await Group.findBySlug(slug);
    if (!group) {
      return res.status(404).json({
        success: false,
        error: 'Group not found'
      });
    }

    // Check if user is a member
    const isMember = await GroupMembership.isMember(group.id, req.user.id);
    if (!isMember) {
      return res.status(403).json({
        success: false,
        error: 'You must be a member to vote'
      });
    }

    const vote = await GroupVote.toggleVote({
      user_id: req.user.id,
      post_id: parseInt(postId),
      vote_type
    });

    // Get updated vote counts
    const voteCounts = await GroupVote.getPostVotes(parseInt(postId));

    res.json({
      success: true,
      data: {
        vote,
        counts: voteCounts
      }
    });
  } catch (error) {
    console.error('Error voting on post:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to vote on post'
    });
  }
});

/**
 * @route   DELETE /api/groups/:slug/posts/:postId/vote
 * @desc    Remove vote from a post
 * @access  Private
 */
router.delete('/:slug/posts/:postId/vote', authenticateToken, async (req, res) => {
  try {
    const { slug, postId } = req.params;

    const group = await Group.findBySlug(slug);
    if (!group) {
      return res.status(404).json({
        success: false,
        error: 'Group not found'
      });
    }

    await GroupVote.unvote({
      user_id: req.user.id,
      post_id: parseInt(postId)
    });

    // Get updated vote counts
    const voteCounts = await GroupVote.getPostVotes(parseInt(postId));

    res.json({
      success: true,
      data: voteCounts
    });
  } catch (error) {
    console.error('Error removing vote:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to remove vote'
    });
  }
});

/**
 * @route   POST /api/groups/:slug/posts/:postId/pin
 * @desc    Pin/unpin a post
 * @access  Private (Moderator only)
 */
router.post('/:slug/posts/:postId/pin', authenticateToken, async (req, res) => {
  try {
    const { slug, postId } = req.params;

    const group = await Group.findBySlug(slug);
    if (!group) {
      return res.status(404).json({
        success: false,
        error: 'Group not found'
      });
    }

    const isModerator = await GroupMembership.isModerator(group.id, req.user.id);
    if (!isModerator) {
      return res.status(403).json({
        success: false,
        error: 'Only moderators can pin posts'
      });
    }

    const post = await GroupPost.togglePin(parseInt(postId));

    res.json({
      success: true,
      data: post
    });
  } catch (error) {
    console.error('Error pinning post:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to pin post'
    });
  }
});

/**
 * @route   POST /api/groups/:slug/posts/:postId/lock
 * @desc    Lock/unlock a post
 * @access  Private (Moderator only)
 */
router.post('/:slug/posts/:postId/lock', authenticateToken, async (req, res) => {
  try {
    const { slug, postId } = req.params;

    const group = await Group.findBySlug(slug);
    if (!group) {
      return res.status(404).json({
        success: false,
        error: 'Group not found'
      });
    }

    const isModerator = await GroupMembership.isModerator(group.id, req.user.id);
    if (!isModerator) {
      return res.status(403).json({
        success: false,
        error: 'Only moderators can lock posts'
      });
    }

    const post = await GroupPost.toggleLock(parseInt(postId));

    res.json({
      success: true,
      data: post
    });
  } catch (error) {
    console.error('Error locking post:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to lock post'
    });
  }
});

/**
 * @route   POST /api/groups/:slug/posts/:postId/remove
 * @desc    Remove a post (moderator action)
 * @access  Private (Moderator only)
 */
router.post('/:slug/posts/:postId/remove', authenticateToken, async (req, res) => {
  try {
    const { slug, postId } = req.params;
    const { reason } = req.body;

    const group = await Group.findBySlug(slug);
    if (!group) {
      return res.status(404).json({
        success: false,
        error: 'Group not found'
      });
    }

    const isModerator = await GroupMembership.isModerator(group.id, req.user.id);
    if (!isModerator) {
      return res.status(403).json({
        success: false,
        error: 'Only moderators can remove posts'
      });
    }

    const post = await GroupPost.remove(parseInt(postId), req.user.id, reason);

    res.json({
      success: true,
      data: post
    });
  } catch (error) {
    console.error('Error removing post:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to remove post'
    });
  }
});

/**
 * @route   POST /api/groups/:slug/posts/:postId/approve
 * @desc    Approve a pending post
 * @access  Private (Moderator only)
 */
router.post('/:slug/posts/:postId/approve', authenticateToken, async (req, res) => {
  try {
    const { slug, postId } = req.params;

    const group = await Group.findBySlug(slug);
    if (!group) {
      return res.status(404).json({
        success: false,
        error: 'Group not found'
      });
    }

    const isModerator = await GroupMembership.isModerator(group.id, req.user.id);
    if (!isModerator) {
      return res.status(403).json({
        success: false,
        error: 'Only moderators can approve posts'
      });
    }

    const post = await GroupPost.approve(parseInt(postId), req.user.id);

    res.json({
      success: true,
      data: post
    });
  } catch (error) {
    console.error('Error approving post:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to approve post'
    });
  }
});

/**
 * @route   GET /api/groups/:slug/posts/pending
 * @desc    Get pending posts (requiring approval)
 * @access  Private (Moderator only)
 */
router.get('/:slug/posts/pending', authenticateToken, async (req, res) => {
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

    const isModerator = await GroupMembership.isModerator(group.id, req.user.id);
    if (!isModerator) {
      return res.status(403).json({
        success: false,
        error: 'Only moderators can view pending posts'
      });
    }

    const posts = await GroupPost.getPendingPosts(group.id, {
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      success: true,
      data: posts
    });
  } catch (error) {
    console.error('Error getting pending posts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get pending posts'
    });
  }
});

/**
 * @route   GET /api/groups/:slug/posts/top
 * @desc    Get top posts in a time period
 * @access  Public (for public groups) / Members only (for private groups)
 */
router.get('/:slug/posts/top', optionalAuth, async (req, res) => {
  try {
    const { slug } = req.params;
    const { period = 'week', limit = 20, offset = 0 } = req.query;

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
          error: 'Only members can view posts in private groups'
        });
      }
    }

    const posts = await GroupPost.getTopPosts(group.id, {
      period,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      success: true,
      data: posts
    });
  } catch (error) {
    console.error('Error getting top posts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get top posts'
    });
  }
});

module.exports = router;
