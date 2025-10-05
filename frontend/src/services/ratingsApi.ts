/**
 * Ratings API Service
 * Handles all rating-related API calls
 */

import { apiClient } from './api';
import { ApiResponse } from '../types';

export interface Rating {
  id: number;
  rater_id: number;
  rated_user_id: number;
  rating_type: 'profile' | 'post' | 'comment' | 'interaction';
  rating_value: number; // 1-5
  context_type?: string;
  context_id?: number;
  review_text?: string;
  is_anonymous: boolean;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
  // Additional fields from joins
  rater_username?: string;
  rater_first_name?: string;
  rater_last_name?: string;
  rater_avatar?: string;
}

export interface RatingStats {
  total_ratings: string;
  average_rating: string;
  five_star: string;
  four_star: string;
  three_star: string;
  two_star: string;
  one_star: string;
}

export interface CreateRatingRequest {
  rating_type: 'profile' | 'post' | 'comment' | 'interaction';
  rating_value: number;
  context_type?: string;
  context_id?: number;
  review_text?: string;
  is_anonymous?: boolean;
}

export interface UpdateRatingRequest {
  rating_value?: number;
  review_text?: string;
}

const ratingsApi = {
  /**
   * Rate a user
   */
  rateUser: async (userId: number, data: CreateRatingRequest): Promise<ApiResponse<{ rating: Rating }>> => {
    const response = await apiClient.post(`/ratings/${userId}`, data);
    return response.data;
  },

  /**
   * Update a rating
   */
  updateRating: async (ratingId: number, data: UpdateRatingRequest): Promise<ApiResponse<{ rating: Rating }>> => {
    const response = await apiClient.put(`/ratings/${ratingId}`, data);
    return response.data;
  },

  /**
   * Delete a rating
   */
  deleteRating: async (ratingId: number): Promise<ApiResponse<void>> => {
    const response = await apiClient.delete(`/ratings/${ratingId}`);
    return response.data;
  },

  /**
   * Get ratings for a user
   */
  getUserRatings: async (
    userId: number,
    params?: { page?: number; limit?: number; rating_type?: string }
  ): Promise<ApiResponse<{ ratings: Rating[]; stats: RatingStats; pagination: any }>> => {
    const response = await apiClient.get(`/ratings/user/${userId}`, { params });
    return response.data;
  },

  /**
   * Get ratings given by current user
   */
  getGivenRatings: async (params?: { page?: number; limit?: number }): Promise<ApiResponse<{ ratings: Rating[]; pagination: any }>> => {
    const response = await apiClient.get('/api/ratings/given', { params });
    return response.data;
  },

  /**
   * Get ratings received by current user
   */
  getReceivedRatings: async (
    params?: { page?: number; limit?: number; rating_type?: string }
  ): Promise<ApiResponse<{ ratings: Rating[]; stats: RatingStats; pagination: any }>> => {
    const response = await apiClient.get('/api/ratings/received', { params });
    return response.data;
  },

  /**
   * Check if current user can rate a user
   */
  canRate: async (userId: number): Promise<ApiResponse<{ can_rate: boolean }>> => {
    const response = await apiClient.get(`/ratings/check/${userId}`);
    return response.data;
  },

  /**
   * Report a rating
   */
  reportRating: async (
    ratingId: number,
    data: { report_reason: string; report_details?: string }
  ): Promise<ApiResponse<{ report: any }>> => {
    const response = await apiClient.post(`/ratings/${ratingId}/report`, data);
    return response.data;
  },

  /**
   * Get reports for a rating
   */
  getRatingReports: async (ratingId: number): Promise<ApiResponse<{ reports: any[] }>> => {
    const response = await apiClient.get(`/ratings/${ratingId}/reports`);
    return response.data;
  },
};

export default ratingsApi;
