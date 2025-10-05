/**
 * Reputation API Service
 * Handles all reputation-related API calls
 */

import { apiClient } from './api';
import { ApiResponse } from '../types';

export interface Reputation {
  user_id: number;
  total_ratings_received: number;
  average_rating: string;
  rating_distribution: {
    '1': number;
    '2': number;
    '3': number;
    '4': number;
    '5': number;
  };
  reputation_score: number; // 0-1000
  reputation_level: 'newcomer' | 'member' | 'contributor' | 'veteran' | 'expert' | 'legend';
  post_rating_avg: string;
  comment_rating_avg: string;
  interaction_rating_avg: string;
  verified_ratings_count: number;
  positive_ratings_count: number;
  neutral_ratings_count: number;
  negative_ratings_count: number;
  helpful_count: number;
  reported_count: number;
  quality_posts_count: number;
  quality_comments_count: number;
  badges: any[];
  achievements: any[];
  first_rating_at: string | null;
  last_rating_at: string | null;
  reputation_peak: number;
  reputation_peak_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface LeaderboardUser extends Reputation {
  rank: string;
  username: string;
  first_name: string;
  last_name: string;
  avatar_url: string;
  bio: string;
}

export interface HelpfulMark {
  id: number;
  user_id: number;
  target_type: 'post' | 'comment' | 'user';
  target_id: number;
  created_at: string;
}

const reputationApi = {
  /**
   * Get reputation for a user
   */
  getUserReputation: async (userId: number): Promise<ApiResponse<{ reputation: Reputation; rank: string | null }>> => {
    const response = await apiClient.get(`/reputation/${userId}`);
    return response.data;
  },

  /**
   * Get reputation leaderboard
   */
  getLeaderboard: async (params?: { limit?: number; offset?: number }): Promise<ApiResponse<{ leaderboard: LeaderboardUser[]; pagination: any }>> => {
    const response = await apiClient.get('/api/reputation/leaderboard/top', { params });
    return response.data;
  },

  /**
   * Get top users by reputation
   */
  getTopUsers: async (params?: { limit?: number; level?: string }): Promise<ApiResponse<{ users: LeaderboardUser[] }>> => {
    const response = await apiClient.get('/api/reputation/top-users', { params });
    return response.data;
  },

  /**
   * Mark content as helpful
   */
  markHelpful: async (targetType: 'post' | 'comment' | 'user', targetId: number): Promise<ApiResponse<{ helpful_mark: HelpfulMark; helpful_count: number }>> => {
    const response = await apiClient.post(`/reputation/helpful/${targetType}/${targetId}`);
    return response.data;
  },

  /**
   * Remove helpful mark
   */
  unmarkHelpful: async (targetType: 'post' | 'comment' | 'user', targetId: number): Promise<ApiResponse<{ helpful_count: number }>> => {
    const response = await apiClient.delete(`/reputation/helpful/${targetType}/${targetId}`);
    return response.data;
  },

  /**
   * Check if content is marked as helpful by current user
   */
  checkHelpful: async (targetType: 'post' | 'comment' | 'user', targetId: number): Promise<ApiResponse<{ has_marked: boolean; helpful_count: number }>> => {
    const response = await apiClient.get(`/reputation/helpful/${targetType}/${targetId}/check`);
    return response.data;
  },

  /**
   * Get helpful count for content
   */
  getHelpfulCount: async (targetType: 'post' | 'comment' | 'user', targetId: number): Promise<ApiResponse<{ helpful_count: number }>> => {
    const response = await apiClient.get(`/reputation/helpful/${targetType}/${targetId}/count`);
    return response.data;
  },

  /**
   * Get badges for a user
   */
  getUserBadges: async (userId: number): Promise<ApiResponse<{ badges: any[] }>> => {
    const response = await apiClient.get(`/reputation/badges/${userId}`);
    return response.data;
  },

  /**
   * Recalculate reputation score for current user
   */
  recalculateScore: async (): Promise<ApiResponse<{ reputation_score: number }>> => {
    const response = await apiClient.post('/api/reputation/recalculate');
    return response.data;
  },

  /**
   * Recalculate all reputation scores (admin only)
   */
  recalculateAll: async (): Promise<ApiResponse<{ users_updated: number }>> => {
    const response = await apiClient.post('/api/reputation/recalculate-all');
    return response.data;
  },
};

export default reputationApi;
