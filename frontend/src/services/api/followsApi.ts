/**
 * Follows API Service
 * Handles all follow/following-related API calls
 */

import { apiClient } from '../api';
import { ApiResponse } from '../../types';

export interface FollowUser {
  id: number;
  username: string;
  first_name?: string;
  last_name?: string;
  avatar_url?: string;
  bio?: string;
  follower_count?: number;
  following_count?: number;
  post_count?: number;
  is_following?: boolean;
  is_mutual?: boolean;
}

export interface Follow {
  id: number;
  follower_id: number;
  following_id: number;
  status: 'active' | 'muted';
  notifications_enabled: boolean;
  created_at: string;
}

export interface FollowCounts {
  follower_count: number;
  following_count: number;
}

export interface PaginatedFollowsResponse {
  followers?: FollowUser[];
  following?: FollowUser[];
  pagination: {
    current_page: number;
    limit: number;
    total_count: number;
    total_pages: number;
    has_next_page: boolean;
    has_prev_page: boolean;
  };
}

export interface FollowCheckResponse {
  is_following: boolean;
  is_mutual: boolean;
  follow?: Follow;
}

export const followsApi = {
  /**
   * Follow a user
   */
  follow: async (userId: number): Promise<ApiResponse<{ follow: Follow; counts: FollowCounts }>> => {
    const response = await apiClient.post(`/follows/${userId}`);
    return response.data;
  },

  /**
   * Unfollow a user
   */
  unfollow: async (userId: number): Promise<ApiResponse<{ counts: FollowCounts }>> => {
    const response = await apiClient.delete(`/follows/${userId}`);
    return response.data;
  },

  /**
   * Get followers for a user (defaults to current user if no userId provided)
   */
  getFollowers: async (userId?: number, params?: { page?: number; limit?: number; status?: string }): Promise<ApiResponse<PaginatedFollowsResponse>> => {
    const endpoint = userId ? `/follows/followers/${userId}` : '/follows/followers';
    const response = await apiClient.get(endpoint, { params });
    return response.data;
  },

  /**
   * Get users that a user follows (defaults to current user if no userId provided)
   */
  getFollowing: async (userId?: number, params?: { page?: number; limit?: number; status?: string }): Promise<ApiResponse<PaginatedFollowsResponse>> => {
    const endpoint = userId ? `/follows/following/${userId}` : '/follows/following';
    const response = await apiClient.get(endpoint, { params });
    return response.data;
  },

  /**
   * Get mutual follows for current user
   */
  getMutualFollows: async (params?: { page?: number; limit?: number }): Promise<ApiResponse<{ mutual_follows: FollowUser[] }>> => {
    const response = await apiClient.get('/follows/mutual', { params });
    return response.data;
  },

  /**
   * Get follow suggestions
   */
  getSuggestions: async (limit: number = 10): Promise<ApiResponse<{ suggestions: FollowUser[] }>> => {
    const response = await apiClient.get('/follows/suggestions', { params: { limit } });
    return response.data;
  },

  /**
   * Check if current user follows a specific user
   */
  checkFollowing: async (userId: number): Promise<ApiResponse<FollowCheckResponse>> => {
    const response = await apiClient.get(`/follows/check/${userId}`);
    return response.data;
  },

  /**
   * Mute a followed user
   */
  mute: async (userId: number): Promise<ApiResponse<{ follow: Follow }>> => {
    const response = await apiClient.patch(`/follows/${userId}/mute`);
    return response.data;
  },

  /**
   * Unmute a followed user
   */
  unmute: async (userId: number): Promise<ApiResponse<{ follow: Follow }>> => {
    const response = await apiClient.patch(`/follows/${userId}/unmute`);
    return response.data;
  },

  /**
   * Toggle notifications for a followed user
   */
  toggleNotifications: async (userId: number, enabled: boolean): Promise<ApiResponse<{ follow: Follow }>> => {
    const response = await apiClient.patch(`/follows/${userId}/notifications`, { enabled });
    return response.data;
  },

  /**
   * Get follow statistics for a user
   */
  getStats: async (userId?: number): Promise<ApiResponse<{ counts: FollowCounts; stats: any }>> => {
    const endpoint = userId ? `/follows/stats/${userId}` : '/follows/stats';
    const response = await apiClient.get(endpoint);
    return response.data;
  }
};
