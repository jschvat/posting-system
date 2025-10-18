/**
 * API Service for Group Posts
 * Handles all API calls related to group posts, voting, and moderation
 */

import { apiClient as api } from './api';
import {
  ApiResponse,
  PaginatedResponse,
  GroupPost,
  CreatePostData,
  UpdatePostData,
  VoteResponse,
  RemovePostData,
  PostSortType,
  TopPeriod,
  VoteType
} from '../types/group';

// ============================================================================
// POST CRUD OPERATIONS
// ============================================================================

/**
 * Get posts for a group with sorting and pagination
 */
export const getGroupPosts = async (
  slug: string,
  params?: {
    page?: number;
    limit?: number;
    sort?: PostSortType;
  }
): Promise<ApiResponse<PaginatedResponse<GroupPost>>> => {
  const response = await api.get(`/groups/${slug}/posts`, { params });
  return response.data;
};

/**
 * Get top posts by time period
 */
export const getTopPosts = async (
  slug: string,
  params?: {
    period?: TopPeriod;
    page?: number;
    limit?: number;
  }
): Promise<ApiResponse<PaginatedResponse<GroupPost>>> => {
  const response = await api.get(`/groups/${slug}/posts/top`, { params });
  return response.data;
};

/**
 * Get pending posts (moderator only)
 */
export const getPendingPosts = async (
  slug: string,
  params?: {
    page?: number;
    limit?: number;
  }
): Promise<ApiResponse<PaginatedResponse<GroupPost>>> => {
  const response = await api.get(`/groups/${slug}/posts/pending`, { params });
  return response.data;
};

/**
 * Get a single post by ID
 */
export const getPost = async (
  slug: string,
  postId: number
): Promise<ApiResponse<{ post: GroupPost }>> => {
  const response = await api.get(`/groups/${slug}/posts/${postId}`);
  return response.data;
};

/**
 * Create a new post in a group
 */
export const createPost = async (
  slug: string,
  data: CreatePostData
): Promise<ApiResponse<{ post: GroupPost }>> => {
  const response = await api.post(`/groups/${slug}/posts`, data);
  return response.data;
};

/**
 * Update a post (author or moderator)
 */
export const updatePost = async (
  slug: string,
  postId: number,
  data: UpdatePostData
): Promise<ApiResponse<{ post: GroupPost }>> => {
  const response = await api.put(`/groups/${slug}/posts/${postId}`, data);
  return response.data;
};

/**
 * Delete a post (author or moderator)
 */
export const deletePost = async (
  slug: string,
  postId: number
): Promise<ApiResponse<{ message: string }>> => {
  const response = await api.delete(`/groups/${slug}/posts/${postId}`);
  return response.data;
};

// ============================================================================
// VOTING OPERATIONS
// ============================================================================

/**
 * Vote on a post (upvote or downvote)
 */
export const voteOnPost = async (
  slug: string,
  postId: number,
  voteType: VoteType
): Promise<ApiResponse<{
  message: string;
  counts: VoteResponse;
}>> => {
  const response = await api.post(`/groups/${slug}/posts/${postId}/vote`, {
    vote_type: voteType
  });
  return response.data;
};

/**
 * Remove vote from a post
 */
export const removeVote = async (
  slug: string,
  postId: number
): Promise<ApiResponse<{
  message: string;
  counts: VoteResponse;
}>> => {
  const response = await api.delete(`/groups/${slug}/posts/${postId}/vote`);
  return response.data;
};

/**
 * Toggle vote on a post (smart voting)
 * If user clicks same vote type, it removes the vote
 * If user clicks different vote type, it changes the vote
 */
export const toggleVote = async (
  slug: string,
  postId: number,
  voteType: VoteType,
  currentVote?: VoteType | null
): Promise<ApiResponse<{
  message: string;
  counts: VoteResponse;
}>> => {
  // If clicking same vote type, remove the vote
  if (currentVote === voteType) {
    return await removeVote(slug, postId);
  }
  // Otherwise, add/change the vote
  return await voteOnPost(slug, postId, voteType);
};

// ============================================================================
// MODERATION OPERATIONS
// ============================================================================

/**
 * Pin or unpin a post (moderator/admin)
 */
export const togglePinPost = async (
  slug: string,
  postId: number
): Promise<ApiResponse<{
  message: string;
  is_pinned: boolean;
}>> => {
  const response = await api.post(`/groups/${slug}/posts/${postId}/pin`);
  return response.data;
};

/**
 * Lock or unlock a post (moderator/admin)
 */
export const toggleLockPost = async (
  slug: string,
  postId: number
): Promise<ApiResponse<{
  message: string;
  is_locked: boolean;
}>> => {
  const response = await api.post(`/groups/${slug}/posts/${postId}/lock`);
  return response.data;
};

/**
 * Remove a post with reason (moderator/admin)
 */
export const removePost = async (
  slug: string,
  postId: number,
  data: RemovePostData
): Promise<ApiResponse<{ message: string }>> => {
  const response = await api.post(`/groups/${slug}/posts/${postId}/remove`, data);
  return response.data;
};

/**
 * Approve a pending post (moderator/admin)
 */
export const approvePost = async (
  slug: string,
  postId: number
): Promise<ApiResponse<{ message: string }>> => {
  const response = await api.post(`/groups/${slug}/posts/${postId}/approve`);
  return response.data;
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Calculate post age in hours
 */
export const getPostAge = (createdAt: string): number => {
  const now = new Date().getTime();
  const created = new Date(createdAt).getTime();
  return (now - created) / (1000 * 60 * 60); // hours
};

/**
 * Format post score for display
 */
export const formatScore = (score: number): string => {
  if (Math.abs(score) >= 1000000) {
    return `${(score / 1000000).toFixed(1)}M`;
  }
  if (Math.abs(score) >= 1000) {
    return `${(score / 1000).toFixed(1)}K`;
  }
  return score.toString();
};

/**
 * Get vote state for UI display
 */
export const getVoteState = (post: GroupPost): {
  upvoted: boolean;
  downvoted: boolean;
  score: number;
} => {
  return {
    upvoted: post.user_vote === 'upvote',
    downvoted: post.user_vote === 'downvote',
    score: post.score
  };
};

/**
 * Check if post can be edited by user
 */
export const canEditPost = (
  post: GroupPost,
  userId?: number,
  isModerator?: boolean
): boolean => {
  if (!userId) return false;
  if (post.user_id === userId) return true;
  if (isModerator) return true;
  return false;
};

/**
 * Check if post can be deleted by user
 */
export const canDeletePost = (
  post: GroupPost,
  userId?: number,
  isModerator?: boolean
): boolean => {
  if (!userId) return false;
  if (post.user_id === userId) return true;
  if (isModerator) return true;
  return false;
};

/**
 * Check if post is locked or removed
 */
export const isPostLocked = (post: GroupPost): boolean => {
  return post.is_locked || post.status === 'removed';
};

/**
 * Get post status display text
 */
export const getPostStatusText = (post: GroupPost): string | null => {
  if (post.status === 'pending') return 'Pending approval';
  if (post.status === 'removed') return `Removed: ${post.removal_reason || 'No reason given'}`;
  if (post.is_locked) return 'Locked';
  return null;
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
 * Get all posts for moderation (including deleted)
 */
export const getAllPostsForModeration = async (
  slug: string,
  params?: { limit?: number; offset?: number }
): Promise<ApiResponse<{ posts: any[]; pagination: any }>> => {
  const response = await api.get(`/groups/${slug}/posts/moderate/all`, { params });
  return response.data;
};

/**
 * Moderate delete a post (soft delete)
 */
export const moderateDeletePost = async (
  slug: string,
  postId: number,
  reason?: string
): Promise<ApiResponse<{ message: string }>> => {
  const response = await api.post(`/groups/${slug}/posts/${postId}/moderate/delete`, { reason });
  return response.data;
};

/**
 * Restore a deleted post
 */
export const restorePost = async (
  slug: string,
  postId: number
): Promise<ApiResponse<{ message: string }>> => {
  const response = await api.post(`/groups/${slug}/posts/${postId}/moderate/restore`);
  return response.data;
};

export default {
  getGroupPosts,
  getTopPosts,
  getPendingPosts,
  getPost,
  createPost,
  updatePost,
  deletePost,
  voteOnPost,
  removeVote,
  toggleVote,
  togglePinPost,
  toggleLockPost,
  removePost,
  approvePost,
  getAllPostsForModeration,
  moderateDeletePost,
  restorePost,
  getPostAge,
  formatScore,
  getVoteState,
  canEditPost,
  canDeletePost,
  isPostLocked,
  getPostStatusText,
  formatRelativeTime
};
