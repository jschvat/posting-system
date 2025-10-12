/**
 * API Service for Group Comments
 * Handles all API calls related to group comments, voting, and moderation
 */

import { apiClient as api } from './api';
import {
  ApiResponse,
  PaginatedResponse,
  GroupComment,
  CreateCommentData,
  UpdateCommentData,
  VoteResponse,
  RemoveCommentData,
  VoteType
} from '../types/group';

// ============================================================================
// COMMENT CRUD OPERATIONS
// ============================================================================

/**
 * Get comments for a post (flat list)
 */
export const getComments = async (
  slug: string,
  postId: number,
  params?: {
    page?: number;
    limit?: number;
  }
): Promise<ApiResponse<{ comments: GroupComment[] }>> => {
  const response = await api.get(`/groups/${slug}/posts/${postId}/comments`, { params });
  return response.data;
};

/**
 * Get comments in nested tree structure
 */
export const getNestedComments = async (
  slug: string,
  postId: number,
  params?: {
    page?: number;
    limit?: number;
  }
): Promise<ApiResponse<{ comments: GroupComment[] }>> => {
  const response = await api.get(`/groups/${slug}/posts/${postId}/comments/nested`, { params });
  return response.data;
};

/**
 * Get a single comment by ID
 */
export const getComment = async (
  slug: string,
  commentId: number
): Promise<ApiResponse<{ comment: GroupComment }>> => {
  const response = await api.get(`/groups/${slug}/comments/${commentId}`);
  return response.data;
};

/**
 * Get direct replies to a comment
 */
export const getCommentReplies = async (
  slug: string,
  commentId: number,
  params?: {
    page?: number;
    limit?: number;
  }
): Promise<ApiResponse<{ comments: GroupComment[] }>> => {
  const response = await api.get(`/groups/${slug}/comments/${commentId}/replies`, { params });
  return response.data;
};

/**
 * Create a new comment or reply
 */
export const createComment = async (
  slug: string,
  postId: number,
  data: CreateCommentData
): Promise<ApiResponse<{ comment: GroupComment }>> => {
  const response = await api.post(`/groups/${slug}/posts/${postId}/comments`, data);
  return response.data;
};

/**
 * Update a comment (author only)
 */
export const updateComment = async (
  slug: string,
  commentId: number,
  data: UpdateCommentData
): Promise<ApiResponse<{ comment: GroupComment }>> => {
  const response = await api.put(`/groups/${slug}/comments/${commentId}`, data);
  return response.data;
};

/**
 * Delete a comment (author or moderator)
 */
export const deleteComment = async (
  slug: string,
  commentId: number
): Promise<ApiResponse<{ message: string }>> => {
  const response = await api.delete(`/groups/${slug}/comments/${commentId}`);
  return response.data;
};

// ============================================================================
// VOTING OPERATIONS
// ============================================================================

/**
 * Vote on a comment (upvote or downvote)
 */
export const voteOnComment = async (
  slug: string,
  commentId: number,
  voteType: VoteType
): Promise<ApiResponse<{
  message: string;
  counts: VoteResponse;
}>> => {
  const response = await api.post(`/groups/${slug}/comments/${commentId}/vote`, {
    vote_type: voteType
  });
  return response.data;
};

/**
 * Remove vote from a comment
 */
export const removeVote = async (
  slug: string,
  commentId: number
): Promise<ApiResponse<{
  message: string;
  counts: VoteResponse;
}>> => {
  const response = await api.delete(`/groups/${slug}/comments/${commentId}/vote`);
  return response.data;
};

/**
 * Toggle vote on a comment (smart voting)
 * If user clicks same vote type, it removes the vote
 * If user clicks different vote type, it changes the vote
 */
export const toggleVote = async (
  slug: string,
  commentId: number,
  voteType: VoteType,
  currentVote?: VoteType | null
): Promise<ApiResponse<{
  message: string;
  counts: VoteResponse;
}>> => {
  // If clicking same vote type, remove the vote
  if (currentVote === voteType) {
    return await removeVote(slug, commentId);
  }
  // Otherwise, add/change the vote
  return await voteOnComment(slug, commentId, voteType);
};

// ============================================================================
// MODERATION OPERATIONS
// ============================================================================

/**
 * Remove a comment with reason (moderator/admin)
 */
export const removeComment = async (
  slug: string,
  commentId: number,
  data: RemoveCommentData
): Promise<ApiResponse<{ message: string }>> => {
  const response = await api.post(`/groups/${slug}/comments/${commentId}/remove`, data);
  return response.data;
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Build nested comment tree from flat list
 * Useful when backend returns flat list but you want to display as tree
 */
export const buildCommentTree = (comments: GroupComment[]): GroupComment[] => {
  const commentMap = new Map<number, GroupComment>();
  const rootComments: GroupComment[] = [];

  // Initialize all comments in map
  comments.forEach(comment => {
    commentMap.set(comment.id, { ...comment, replies: [] });
  });

  // Build tree structure
  comments.forEach(comment => {
    const commentWithReplies = commentMap.get(comment.id)!;

    if (comment.parent_id) {
      const parent = commentMap.get(comment.parent_id);
      if (parent) {
        parent.replies = parent.replies || [];
        parent.replies.push(commentWithReplies);
      }
    } else {
      rootComments.push(commentWithReplies);
    }
  });

  return rootComments;
};

/**
 * Flatten nested comment tree to array
 */
export const flattenCommentTree = (comments: GroupComment[]): GroupComment[] => {
  const flattened: GroupComment[] = [];

  const flatten = (comment: GroupComment) => {
    flattened.push(comment);
    if (comment.replies && comment.replies.length > 0) {
      comment.replies.forEach(flatten);
    }
  };

  comments.forEach(flatten);
  return flattened;
};

/**
 * Get comment depth (0 = top-level, 1 = reply, 2 = reply to reply, etc.)
 */
export const getCommentDepth = (comment: GroupComment): number => {
  return comment.depth || 0;
};

/**
 * Check if comment should show "Load more replies" button
 */
export const hasMoreReplies = (comment: GroupComment, loadedCount: number): boolean => {
  // This would need to be tracked by backend in a real implementation
  // For now, just check if replies array exists and might have more
  return false; // Placeholder
};

/**
 * Format comment score for display
 */
export const formatScore = (score: number): string => {
  if (Math.abs(score) >= 1000) {
    return `${(score / 1000).toFixed(1)}K`;
  }
  return score.toString();
};

/**
 * Get vote state for UI display
 */
export const getVoteState = (comment: GroupComment): {
  upvoted: boolean;
  downvoted: boolean;
  score: number;
} => {
  return {
    upvoted: comment.user_vote === 'upvote',
    downvoted: comment.user_vote === 'downvote',
    score: comment.score
  };
};

/**
 * Check if comment can be edited by user
 */
export const canEditComment = (
  comment: GroupComment,
  userId?: number
): boolean => {
  if (!userId) return false;
  if (comment.is_removed) return false;
  return comment.user_id === userId;
};

/**
 * Check if comment can be deleted by user
 */
export const canDeleteComment = (
  comment: GroupComment,
  userId?: number,
  isModerator?: boolean
): boolean => {
  if (!userId) return false;
  if (comment.user_id === userId) return true;
  if (isModerator) return true;
  return false;
};

/**
 * Check if comment is removed
 */
export const isCommentRemoved = (comment: GroupComment): boolean => {
  return comment.is_removed;
};

/**
 * Get comment display text (handles removed comments)
 */
export const getCommentDisplayText = (comment: GroupComment): string => {
  if (comment.is_removed) {
    return `[removed] ${comment.removal_reason || 'No reason given'}`;
  }
  return comment.content;
};

/**
 * Format relative time (e.g., "2 hours ago")
 */
export const formatRelativeTime = (timestamp: string): string => {
  const now = new Date().getTime();
  const then = new Date(timestamp).getTime();
  const diff = now - then;

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const months = Math.floor(days / 30);
  const years = Math.floor(days / 365);

  if (years > 0) return `${years} year${years > 1 ? 's' : ''} ago`;
  if (months > 0) return `${months} month${months > 1 ? 's' : ''} ago`;
  if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
  if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  return 'just now';
};

/**
 * Sort comments by score (best first)
 */
export const sortByScore = (comments: GroupComment[]): GroupComment[] => {
  return [...comments].sort((a, b) => b.score - a.score);
};

/**
 * Sort comments by date (newest first)
 */
export const sortByDate = (comments: GroupComment[]): GroupComment[] => {
  return [...comments].sort((a, b) =>
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
};

/**
 * Sort comments by controversy (most controversial first)
 */
export const sortByControversy = (comments: GroupComment[]): GroupComment[] => {
  return [...comments].sort((a, b) => {
    const aControversy = Math.abs(a.upvotes - a.downvotes);
    const bControversy = Math.abs(b.upvotes - b.downvotes);
    return bControversy - aControversy;
  });
};

export default {
  getComments,
  getNestedComments,
  getComment,
  getCommentReplies,
  createComment,
  updateComment,
  deleteComment,
  voteOnComment,
  removeVote,
  toggleVote,
  removeComment,
  buildCommentTree,
  flattenCommentTree,
  getCommentDepth,
  hasMoreReplies,
  formatScore,
  getVoteState,
  canEditComment,
  canDeleteComment,
  isCommentRemoved,
  getCommentDisplayText,
  formatRelativeTime,
  sortByScore,
  sortByDate,
  sortByControversy
};
