const express = require('express');
const router = express.Router();
const { authenticate: authenticateToken, optionalAuthenticate: optionalAuth } = require('../middleware/auth');
const Group = require('../models/Group');
const GroupPost = require('../models/GroupPost');
const GroupComment = require('../models/GroupComment');
const GroupMembership = require('../models/GroupMembership');
const GroupVote = require('../models/GroupVote');

/**
 * @route   GET /api/groups/:slug/posts/:postId/comments
 * @desc    Get comments for a post
 * @access  Public (for public groups) / Members only (for private groups)
 */
router.get('/:slug/posts/:postId/comments', optionalAuth, async (req, res) => {
  try {
    const { slug, postId } = req.params;
    const { sort_by = 'best', limit = 100, offset = 0 } = req.query;

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
          error: 'Only members can view comments in private groups'
        });
      }
    }

    const comments = await GroupComment.getPostComments(parseInt(postId), {
      user_id: req.user?.userId,
      sort_by,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      success: true,
      data: {
        comments
      }
    });
  } catch (error) {
    console.error('Error getting comments:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get comments'
    });
  }
});

/**
 * @route   GET /api/groups/:slug/posts/:postId/comments/nested
 * @desc    Get nested comments for a post (tree structure)
 * @access  Public (for public groups) / Members only (for private groups)
 */
router.get('/:slug/posts/:postId/comments/nested', optionalAuth, async (req, res) => {
  try {
    const { slug, postId } = req.params;
    const { max_depth = 10 } = req.query;

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
          error: 'Only members can view comments in private groups'
        });
      }
    }

    const comments = await GroupComment.getNestedComments(parseInt(postId), {
      user_id: req.user?.userId,
      max_depth: parseInt(max_depth)
    });

    res.json({
      success: true,
      data: {
        comments
      }
    });
  } catch (error) {
    console.error('Error getting nested comments:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get nested comments'
    });
  }
});

/**
 * @route   POST /api/groups/:slug/posts/:postId/comments
 * @desc    Create a comment on a post
 * @access  Private (Members only)
 */
router.post('/:slug/posts/:postId/comments', authenticateToken, async (req, res) => {
  try {
    const { slug, postId } = req.params;
    const { content, parent_id = null } = req.body;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Comment content is required'
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
        error: 'You must be a member to comment'
      });
    }

    // Check if post exists and is not locked
    const post = await GroupPost.findById(parseInt(postId));
    if (!post) {
      return res.status(404).json({
        success: false,
        error: 'Post not found'
      });
    }

    if (post.is_locked) {
      const isModerator = await GroupMembership.isModerator(group.id, req.user.id);
      if (!isModerator) {
        return res.status(403).json({
          success: false,
          error: 'This post is locked. Only moderators can comment.'
        });
      }
    }

    const comment = await GroupComment.create({
      post_id: parseInt(postId),
      parent_id: parent_id ? parseInt(parent_id) : null,
      user_id: req.user.id,
      content
    });

    // Get comment with author info
    const commentWithAuthor = await GroupComment.getWithAuthor(comment.id, req.user.id);

    res.status(201).json({
      success: true,
      data: commentWithAuthor
    });
  } catch (error) {
    console.error('Error creating comment:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create comment'
    });
  }
});

/**
 * @route   GET /api/groups/:slug/comments/:commentId
 * @desc    Get a single comment
 * @access  Public (for public groups) / Members only (for private groups)
 */
router.get('/:slug/comments/:commentId', optionalAuth, async (req, res) => {
  try {
    const { slug, commentId } = req.params;

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
          error: 'Only members can view comments in private groups'
        });
      }
    }

    const comment = await GroupComment.getWithMedia(parseInt(commentId), req.user?.userId);
    if (!comment) {
      return res.status(404).json({
        success: false,
        error: 'Comment not found'
      });
    }

    res.json({
      success: true,
      data: comment
    });
  } catch (error) {
    console.error('Error getting comment:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get comment'
    });
  }
});

/**
 * @route   GET /api/groups/:slug/comments/:commentId/replies
 * @desc    Get replies to a comment
 * @access  Public (for public groups) / Members only (for private groups)
 */
router.get('/:slug/comments/:commentId/replies', optionalAuth, async (req, res) => {
  try {
    const { slug, commentId } = req.params;

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
          error: 'Only members can view comments in private groups'
        });
      }
    }

    const replies = await GroupComment.getReplies(parseInt(commentId), {
      user_id: req.user?.userId
    });

    res.json({
      success: true,
      data: {
        replies
      }
    });
  } catch (error) {
    console.error('Error getting comment replies:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get comment replies'
    });
  }
});

/**
 * @route   PUT /api/groups/:slug/comments/:commentId
 * @desc    Update a comment
 * @access  Private (Author only)
 */
router.put('/:slug/comments/:commentId', authenticateToken, async (req, res) => {
  try {
    const { slug, commentId } = req.params;
    const { content } = req.body;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Comment content is required'
      });
    }

    const group = await Group.findBySlug(slug);
    if (!group) {
      return res.status(404).json({
        success: false,
        error: 'Group not found'
      });
    }

    const comment = await GroupComment.findById(parseInt(commentId));
    if (!comment) {
      return res.status(404).json({
        success: false,
        error: 'Comment not found'
      });
    }

    // Check if user is the author
    if (comment.user_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Only the author can edit this comment'
      });
    }

    const updatedComment = await GroupComment.update(parseInt(commentId), { content });

    res.json({
      success: true,
      data: updatedComment
    });
  } catch (error) {
    console.error('Error updating comment:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update comment'
    });
  }
});

/**
 * @route   DELETE /api/groups/:slug/comments/:commentId
 * @desc    Delete a comment
 * @access  Private (Author or Moderator)
 */
router.delete('/:slug/comments/:commentId', authenticateToken, async (req, res) => {
  try {
    const { slug, commentId } = req.params;

    const group = await Group.findBySlug(slug);
    if (!group) {
      return res.status(404).json({
        success: false,
        error: 'Group not found'
      });
    }

    const comment = await GroupComment.findById(parseInt(commentId));
    if (!comment) {
      return res.status(404).json({
        success: false,
        error: 'Comment not found'
      });
    }

    // Check permissions
    const isModerator = await GroupMembership.isModerator(group.id, req.user.id);
    const isAuthor = comment.user_id === req.user.id;

    if (!isAuthor && !isModerator) {
      return res.status(403).json({
        success: false,
        error: 'Only the author or moderators can delete this comment'
      });
    }

    await GroupComment.delete(parseInt(commentId));

    res.json({
      success: true,
      message: 'Comment deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting comment:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete comment'
    });
  }
});

/**
 * @route   POST /api/groups/:slug/comments/:commentId/vote
 * @desc    Vote on a comment
 * @access  Private (Members only)
 */
router.post('/:slug/comments/:commentId/vote', authenticateToken, async (req, res) => {
  try {
    const { slug, commentId } = req.params;
    const { vote_type } = req.body;

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
      comment_id: parseInt(commentId),
      vote_type
    });

    // Get updated vote counts
    const voteCounts = await GroupVote.getCommentVotes(parseInt(commentId));

    res.json({
      success: true,
      data: {
        vote,
        counts: voteCounts
      },
      message: vote ? 'Vote recorded' : 'Vote removed'
    });
  } catch (error) {
    console.error('Error voting on comment:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to vote on comment'
    });
  }
});

/**
 * @route   DELETE /api/groups/:slug/comments/:commentId/vote
 * @desc    Remove vote from a comment
 * @access  Private
 */
router.delete('/:slug/comments/:commentId/vote', authenticateToken, async (req, res) => {
  try {
    const { slug, commentId } = req.params;

    const group = await Group.findBySlug(slug);
    if (!group) {
      return res.status(404).json({
        success: false,
        error: 'Group not found'
      });
    }

    await GroupVote.unvote({
      user_id: req.user.id,
      comment_id: parseInt(commentId)
    });

    // Get updated vote counts
    const voteCounts = await GroupVote.getCommentVotes(parseInt(commentId));

    res.json({
      success: true,
      data: {
        counts: voteCounts
      },
      message: 'Vote removed'
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
 * @route   POST /api/groups/:slug/comments/:commentId/remove
 * @desc    Remove a comment (moderator action)
 * @access  Private (Moderator only)
 */
router.post('/:slug/comments/:commentId/remove', authenticateToken, async (req, res) => {
  try {
    const { slug, commentId } = req.params;
    const { removal_reason } = req.body;

    if (!removal_reason) {
      return res.status(400).json({
        success: false,
        error: 'Removal reason is required'
      });
    }

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
        error: 'Only moderators can remove comments'
      });
    }

    const comment = await GroupComment.remove(parseInt(commentId), req.user.id, removal_reason);

    res.json({
      success: true,
      data: comment
    });
  } catch (error) {
    console.error('Error removing comment:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to remove comment'
    });
  }
});

module.exports = router;
