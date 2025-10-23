const express = require('express');
const router = express.Router();
const { authenticate: authenticateToken } = require('../middleware/auth');
const PollOption = require('../models/PollOption');
const PollVote = require('../models/PollVote');
const GroupPost = require('../models/GroupPost');
const Group = require('../models/Group');
const GroupMembership = require('../models/GroupMembership');

/**
 * @route   POST /api/polls/:postId/vote
 * @desc    Vote on a poll
 * @access  Private
 */
router.post('/:postId/vote', authenticateToken, async (req, res) => {
  try {
    const { postId } = req.params;
    const { option_id } = req.body;

    if (!option_id) {
      return res.status(400).json({
        success: false,
        error: 'Option ID is required'
      });
    }

    // Get the post
    const post = await GroupPost.findById(parseInt(postId));
    if (!post) {
      return res.status(404).json({
        success: false,
        error: 'Post not found'
      });
    }

    // Verify it's a poll
    if (post.post_type !== 'poll') {
      return res.status(400).json({
        success: false,
        error: 'This is not a poll post'
      });
    }

    // Check if poll has ended
    const hasEnded = await PollVote.isPollEnded(parseInt(postId));
    if (hasEnded) {
      return res.status(400).json({
        success: false,
        error: 'This poll has ended'
      });
    }

    // Get the group
    const group = await Group.findById(post.group_id);
    if (!group) {
      return res.status(404).json({
        success: false,
        error: 'Group not found'
      });
    }

    // Check if user is a member or if group allows public voting
    const membership = await GroupMembership.findByGroupAndUser(group.id, req.user.id);
    if (group.visibility === 'private' && (!membership || membership.status !== 'active')) {
      return res.status(403).json({
        success: false,
        error: 'You must be a member to vote in this poll'
      });
    }

    // Verify the option belongs to this poll
    const option = await PollOption.findById(option_id);
    if (!option || option.post_id !== parseInt(postId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid poll option'
      });
    }

    // Check if user has already voted
    const existingVote = await PollVote.getUserVote(parseInt(postId), req.user.id);

    if (existingVote) {
      // If user already voted, update their vote
      if (existingVote.option_id === option_id) {
        return res.status(400).json({
          success: false,
          error: 'You have already voted for this option'
        });
      }

      await PollVote.update(parseInt(postId), req.user.id, option_id);
    } else {
      // Create new vote
      await PollVote.create(parseInt(postId), option_id, req.user.id);
    }

    // Get updated results
    const results = await PollOption.getVoteDistribution(parseInt(postId));
    const totalVotes = await PollVote.getTotalVotes(parseInt(postId));

    res.json({
      success: true,
      data: {
        results,
        total_votes: totalVotes,
        user_vote: option_id
      },
      message: existingVote ? 'Vote updated successfully' : 'Vote recorded successfully'
    });
  } catch (error) {
    console.error('Error voting on poll:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to vote on poll'
    });
  }
});

/**
 * @route   DELETE /api/polls/:postId/vote
 * @desc    Remove vote from a poll
 * @access  Private
 */
router.delete('/:postId/vote', authenticateToken, async (req, res) => {
  try {
    const { postId } = req.params;

    // Check if poll has ended
    const hasEnded = await PollVote.isPollEnded(parseInt(postId));
    if (hasEnded) {
      return res.status(400).json({
        success: false,
        error: 'Cannot remove vote from ended poll'
      });
    }

    // Check if user has voted
    const existingVote = await PollVote.getUserVote(parseInt(postId), req.user.id);
    if (!existingVote) {
      return res.status(404).json({
        success: false,
        error: 'You have not voted on this poll'
      });
    }

    // Delete the vote
    await PollVote.delete(parseInt(postId), req.user.id);

    // Get updated results
    const results = await PollOption.getVoteDistribution(parseInt(postId));
    const totalVotes = await PollVote.getTotalVotes(parseInt(postId));

    res.json({
      success: true,
      data: {
        results,
        total_votes: totalVotes
      },
      message: 'Vote removed successfully'
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
 * @route   GET /api/polls/:postId/results
 * @desc    Get poll results
 * @access  Public
 */
router.get('/:postId/results', async (req, res) => {
  try {
    const { postId } = req.params;
    const user_id = req.user ? req.user.id : null;

    // Get the post
    const post = await GroupPost.findById(parseInt(postId));
    if (!post) {
      return res.status(404).json({
        success: false,
        error: 'Post not found'
      });
    }

    // Verify it's a poll
    if (post.post_type !== 'poll') {
      return res.status(400).json({
        success: false,
        error: 'This is not a poll post'
      });
    }

    // Get vote distribution
    const results = await PollOption.getVoteDistribution(parseInt(postId));
    const totalVotes = await PollVote.getTotalVotes(parseInt(postId));

    // Get user's vote if authenticated
    let userVote = null;
    if (user_id) {
      const vote = await PollVote.getUserVote(parseInt(postId), user_id);
      userVote = vote ? vote.option_id : null;
    }

    // Check if poll has ended
    const hasEnded = await PollVote.isPollEnded(parseInt(postId));

    res.json({
      success: true,
      data: {
        poll_question: post.poll_question,
        poll_ends_at: post.poll_ends_at,
        poll_allow_multiple: post.poll_allow_multiple,
        has_ended: hasEnded,
        results,
        total_votes: totalVotes,
        user_vote: userVote
      }
    });
  } catch (error) {
    console.error('Error getting poll results:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get poll results'
    });
  }
});

/**
 * @route   GET /api/polls/:postId/voters/:optionId
 * @desc    Get voters for a specific option
 * @access  Private
 */
router.get('/:postId/voters/:optionId', authenticateToken, async (req, res) => {
  try {
    const { postId, optionId } = req.params;
    const { limit = 50, offset = 0 } = req.query;

    // Verify the option belongs to this poll
    const option = await PollOption.findById(parseInt(optionId));
    if (!option || option.post_id !== parseInt(postId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid poll option'
      });
    }

    // Get voters
    const voters = await PollVote.getOptionVoters(parseInt(optionId), {
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      success: true,
      data: {
        option_text: option.option_text,
        voters,
        total: option.vote_count
      }
    });
  } catch (error) {
    console.error('Error getting voters:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get voters'
    });
  }
});

module.exports = router;
