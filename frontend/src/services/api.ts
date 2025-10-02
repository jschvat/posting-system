/**
 * API service layer for the social media posting platform
 * Handles HTTP requests to the backend API using Axios
 */

import axios, { AxiosResponse } from 'axios';
import {
  ApiResponse,
  PaginatedResponse,
  PaginationInfo,
  Post,
  Comment,
  User,
  Media,
  Reaction,
  ReactionCount,
  PostFormData,
  CommentFormData,
  UserFormData,
  EmojiOption
} from '../types';

// Import centralized configuration
import { getApiBaseUrl } from '../config/app.config';

// API base URL from centralized configuration
const API_BASE_URL = `${getApiBaseUrl()}/api`;

// Create axios instance with default configuration
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for adding auth tokens (when authentication is implemented)
apiClient.interceptors.request.use(
  (config) => {
    // Add auth token when available
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for handling common responses
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Handle common error responses
    if (error.response?.status === 401) {
      // Unauthorized - clear auth token and redirect to login
      localStorage.removeItem('authToken');
      // window.location.href = '/login'; // Uncomment when login is implemented
    }
    return Promise.reject(error);
  }
);

// Generic API request helper
async function apiRequest<T>(
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  url: string,
  data?: any,
  config?: any
): Promise<T> {
  try {
    const response: AxiosResponse<T> = await apiClient({
      method,
      url,
      data,
      ...config,
    });
    return response.data;
  } catch (error) {
    console.error(`API Error (${method} ${url}):`, error);
    throw error;
  }
}

// Posts API
export const postsApi = {
  /**
   * Get all posts with pagination and filtering
   */
  getPosts: async (params?: {
    page?: number;
    limit?: number;
    sort?: 'newest' | 'oldest';
    privacy?: 'public' | 'friends' | 'private';
    user_id?: number;
  }): Promise<PaginatedResponse<Post>> => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.sort) searchParams.append('sort', params.sort);
    if (params?.privacy) searchParams.append('privacy', params.privacy);
    if (params?.user_id) searchParams.append('user_id', params.user_id.toString());

    return apiRequest<PaginatedResponse<Post>>('GET', `/posts?${searchParams}`);
  },

  /**
   * Get a single post by ID
   */
  getPost: async (id: number): Promise<ApiResponse<Post>> => {
    return apiRequest<ApiResponse<Post>>('GET', `/posts/${id}`);
  },

  /**
   * Create a new post
   */
  createPost: async (data: PostFormData): Promise<ApiResponse<Post>> => {
    return apiRequest<ApiResponse<Post>>('POST', '/posts', data);
  },

  /**
   * Update a post
   */
  updatePost: async (id: number, data: Partial<PostFormData>): Promise<ApiResponse<Post>> => {
    return apiRequest<ApiResponse<Post>>('PUT', `/posts/${id}`, data);
  },

  /**
   * Delete a post
   */
  deletePost: async (id: number): Promise<ApiResponse<void>> => {
    return apiRequest<ApiResponse<void>>('DELETE', `/posts/${id}`);
  },
};

// Comments API
export const commentsApi = {
  /**
   * Get comments for a post
   */
  getPostComments: async (postId: number, params?: {
    sort?: 'newest' | 'oldest';
    limit?: number;
    page?: number;
  }): Promise<ApiResponse<{ post_id: number; comments: Comment[]; total_count: number; sort: string; pagination: PaginationInfo }>> => {
    const searchParams = new URLSearchParams();
    if (params?.sort) searchParams.append('sort', params.sort);
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.page) searchParams.append('page', params.page.toString());

    return apiRequest<ApiResponse<any>>('GET', `/comments/post/${postId}?${searchParams}`);
  },

  /**
   * Get a single comment by ID
   */
  getComment: async (id: number): Promise<ApiResponse<Comment>> => {
    return apiRequest<ApiResponse<Comment>>('GET', `/comments/${id}`);
  },

  /**
   * Create a new comment or reply
   */
  createComment: async (data: CommentFormData & { post_id: number }): Promise<ApiResponse<Comment>> => {
    return apiRequest<ApiResponse<Comment>>('POST', '/comments', data);
  },

  /**
   * Update a comment
   */
  updateComment: async (id: number, data: { content: string }): Promise<ApiResponse<Comment>> => {
    return apiRequest<ApiResponse<Comment>>('PUT', `/comments/${id}`, data);
  },

  /**
   * Delete a comment
   */
  deleteComment: async (id: number): Promise<ApiResponse<void>> => {
    return apiRequest<ApiResponse<void>>('DELETE', `/comments/${id}`);
  },

  /**
   * Get replies for a comment
   */
  getCommentReplies: async (commentId: number, params?: {
    sort?: 'newest' | 'oldest';
    limit?: number;
  }): Promise<ApiResponse<{ parent_comment_id: number; replies: Comment[]; total_count: number; sort: string }>> => {
    const searchParams = new URLSearchParams();
    if (params?.sort) searchParams.append('sort', params.sort);
    if (params?.limit) searchParams.append('limit', params.limit.toString());

    return apiRequest<ApiResponse<any>>('GET', `/comments/${commentId}/replies?${searchParams}`);
  },
};

// Users API
export const usersApi = {
  /**
   * Get all users with pagination and search
   */
  getUsers: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
    active?: boolean;
  }): Promise<PaginatedResponse<User>> => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.search) searchParams.append('search', params.search);
    if (params?.active !== undefined) searchParams.append('active', params.active.toString());

    return apiRequest<PaginatedResponse<User>>('GET', `/users?${searchParams}`);
  },

  /**
   * Get a single user by ID
   */
  getUser: async (id: number): Promise<ApiResponse<User>> => {
    return apiRequest<ApiResponse<User>>('GET', `/users/${id}`);
  },

  /**
   * Create a new user
   */
  createUser: async (data: UserFormData): Promise<ApiResponse<User>> => {
    return apiRequest<ApiResponse<User>>('POST', '/users', data);
  },

  /**
   * Update a user
   */
  updateUser: async (id: number, data: Partial<UserFormData>): Promise<ApiResponse<User>> => {
    return apiRequest<ApiResponse<User>>('PUT', `/users/${id}`, data);
  },

  /**
   * Delete/deactivate a user
   */
  deleteUser: async (id: number): Promise<ApiResponse<void>> => {
    return apiRequest<ApiResponse<void>>('DELETE', `/users/${id}`);
  },

  /**
   * Get posts by a specific user
   */
  getUserPosts: async (userId: number, params?: {
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<Post> & { user: User }> => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());

    return apiRequest<any>('GET', `/users/${userId}/posts?${searchParams}`);
  },
};

// Media API
export const mediaApi = {
  /**
   * Upload media files
   */
  uploadFiles: async (data: {
    files: File[];
    post_id?: number;
    comment_id?: number;
    alt_text?: string;
  }): Promise<ApiResponse<Media[]>> => {
    const formData = new FormData();

    // Add files to FormData
    data.files.forEach(file => {
      formData.append('files', file);
    });

    // Add other fields (user_id is now handled by authentication)
    if (data.post_id) formData.append('post_id', data.post_id.toString());
    if (data.comment_id) formData.append('comment_id', data.comment_id.toString());
    if (data.alt_text) formData.append('alt_text', data.alt_text);

    return apiRequest<ApiResponse<Media[]>>('POST', '/media/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  /**
   * Get media file by ID
   */
  getMedia: async (id: number): Promise<ApiResponse<Media>> => {
    return apiRequest<ApiResponse<Media>>('GET', `/media/${id}`);
  },

  /**
   * Get media files for a post
   */
  getPostMedia: async (postId: number, params?: {
    type?: 'image' | 'video' | 'audio' | 'document';
  }): Promise<ApiResponse<{ post_id: number; media: Media[]; count: number }>> => {
    const searchParams = new URLSearchParams();
    if (params?.type) searchParams.append('type', params.type);

    return apiRequest<ApiResponse<any>>('GET', `/media/post/${postId}?${searchParams}`);
  },

  /**
   * Get media files for a comment
   */
  getCommentMedia: async (commentId: number, params?: {
    type?: 'image' | 'video' | 'audio' | 'document';
  }): Promise<ApiResponse<{ comment_id: number; media: Media[]; count: number }>> => {
    const searchParams = new URLSearchParams();
    if (params?.type) searchParams.append('type', params.type);

    return apiRequest<ApiResponse<any>>('GET', `/media/comment/${commentId}?${searchParams}`);
  },

  /**
   * Update media metadata
   */
  updateMedia: async (id: number, data: { alt_text?: string }): Promise<ApiResponse<Media>> => {
    return apiRequest<ApiResponse<Media>>('PUT', `/media/${id}`, data);
  },

  /**
   * Delete media file
   */
  deleteMedia: async (id: number): Promise<ApiResponse<void>> => {
    return apiRequest<ApiResponse<void>>('DELETE', `/media/${id}`);
  },

  /**
   * Get media files by user
   */
  getUserMedia: async (userId: number, params?: {
    page?: number;
    limit?: number;
    type?: 'image' | 'video' | 'audio' | 'document';
  }): Promise<PaginatedResponse<Media> & { user: User }> => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.type) searchParams.append('type', params.type);

    return apiRequest<any>('GET', `/media/user/${userId}?${searchParams}`);
  },
};

// Reactions API
export const reactionsApi = {
  /**
   * Toggle reaction on a post
   */
  togglePostReaction: async (postId: number, data: {
    emoji_name: string;
    emoji_unicode?: string;
  }): Promise<ApiResponse<{ action: string; reaction: Reaction | null; reaction_counts: ReactionCount[] }>> => {
    return apiRequest<ApiResponse<any>>('POST', `/reactions/post/${postId}`, data);
  },

  /**
   * Toggle reaction on a comment
   */
  toggleCommentReaction: async (commentId: number, data: {
    emoji_name: string;
    emoji_unicode?: string;
  }): Promise<ApiResponse<{ action: string; reaction: Reaction | null; reaction_counts: ReactionCount[] }>> => {
    return apiRequest<ApiResponse<any>>('POST', `/reactions/comment/${commentId}`, data);
  },

  /**
   * Get reactions for a post
   */
  getPostReactions: async (postId: number, params?: {
    include_users?: boolean;
  }): Promise<ApiResponse<{ post_id: number; reaction_counts: ReactionCount[]; total_reactions: number; detailed_reactions?: Reaction[] }>> => {
    const searchParams = new URLSearchParams();
    if (params?.include_users !== undefined) searchParams.append('include_users', params.include_users.toString());

    return apiRequest<ApiResponse<any>>('GET', `/reactions/post/${postId}?${searchParams}`);
  },

  /**
   * Get reactions for a comment
   */
  getCommentReactions: async (commentId: number, params?: {
    include_users?: boolean;
  }): Promise<ApiResponse<{ comment_id: number; reaction_counts: ReactionCount[]; total_reactions: number; detailed_reactions?: Reaction[] }>> => {
    const searchParams = new URLSearchParams();
    if (params?.include_users !== undefined) searchParams.append('include_users', params.include_users.toString());

    return apiRequest<ApiResponse<any>>('GET', `/reactions/comment/${commentId}?${searchParams}`);
  },

  /**
   * Get reactions by user
   */
  getUserReactions: async (userId: number, params?: {
    page?: number;
    limit?: number;
    type?: 'post' | 'comment';
  }): Promise<PaginatedResponse<Reaction> & { user: User }> => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.type) searchParams.append('type', params.type);

    return apiRequest<any>('GET', `/reactions/user/${userId}?${searchParams}`);
  },

  /**
   * Delete a reaction
   */
  deleteReaction: async (id: number): Promise<ApiResponse<{ reaction_counts: ReactionCount[] }>> => {
    return apiRequest<ApiResponse<any>>('DELETE', `/reactions/${id}`);
  },

  /**
   * Get list of available emojis
   */
  getEmojiList: async (): Promise<ApiResponse<{ emojis: EmojiOption[]; total_count: number }>> => {
    return apiRequest<ApiResponse<any>>('GET', '/reactions/emoji-list');
  },

  /**
   * Get popular emojis statistics
   */
  getPopularEmojis: async (params?: {
    days?: number;
    limit?: number;
  }): Promise<ApiResponse<{ popular_emojis: ReactionCount[]; period: string; total_count: number }>> => {
    const searchParams = new URLSearchParams();
    if (params?.days) searchParams.append('days', params.days.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());

    return apiRequest<ApiResponse<any>>('GET', `/reactions/stats/popular?${searchParams}`);
  },
};

// Authentication API
export const authApi = {
  /**
   * Register a new user
   */
  register: async (data: {
    username: string;
    email: string;
    password: string;
    first_name: string;
    last_name: string;
    bio?: string;
  }): Promise<ApiResponse<{ user: User; token: string }>> => {
    return apiRequest<ApiResponse<any>>('POST', '/auth/register', data);
  },

  /**
   * Login user
   */
  login: async (data: {
    username: string;
    password: string;
  }): Promise<ApiResponse<{ user: User; token: string }>> => {
    return apiRequest<ApiResponse<any>>('POST', '/auth/login', {
      identifier: data.username,
      password: data.password
    });
  },

  /**
   * Logout user
   */
  logout: async (): Promise<ApiResponse<void>> => {
    return apiRequest<ApiResponse<void>>('POST', '/auth/logout');
  },

  /**
   * Get current user profile
   */
  getProfile: async (): Promise<ApiResponse<User>> => {
    return apiRequest<ApiResponse<User>>('GET', '/auth/me');
  },

  /**
   * Update current user profile
   */
  updateProfile: async (data: Partial<UserFormData>): Promise<ApiResponse<User>> => {
    return apiRequest<ApiResponse<User>>('PUT', '/auth/profile', data);
  },

  /**
   * Change password
   */
  changePassword: async (data: {
    current_password: string;
    new_password: string;
  }): Promise<ApiResponse<void>> => {
    return apiRequest<ApiResponse<void>>('PUT', '/auth/password', data);
  },

  /**
   * Request password reset
   */
  requestPasswordReset: async (data: { email: string }): Promise<ApiResponse<void>> => {
    return apiRequest<ApiResponse<void>>('POST', '/auth/forgot-password', data);
  },

  /**
   * Reset password with token
   */
  resetPassword: async (data: {
    token: string;
    new_password: string;
  }): Promise<ApiResponse<void>> => {
    return apiRequest<ApiResponse<void>>('POST', '/auth/reset-password', data);
  },
};

/**
 * Follows API
 * Endpoints for following/unfollowing users
 */
export const followsApi = {
  /**
   * Follow a user
   */
  followUser: async (userId: number): Promise<ApiResponse<any>> => {
    return apiRequest<ApiResponse<any>>('POST', `/follows/${userId}`);
  },

  /**
   * Unfollow a user
   */
  unfollowUser: async (userId: number): Promise<ApiResponse<void>> => {
    return apiRequest<ApiResponse<void>>('DELETE', `/follows/${userId}`);
  },

  /**
   * Check if following a user
   */
  checkFollowing: async (userId: number): Promise<ApiResponse<{ is_following: boolean }>> => {
    return apiRequest<ApiResponse<{ is_following: boolean }>>('GET', `/follows/check/${userId}`);
  },

  /**
   * Get followers for a user
   */
  getFollowers: async (userId?: number, params?: { page?: number; limit?: number }): Promise<ApiResponse<any>> => {
    const url = userId ? `/follows/followers/${userId}` : '/follows/followers';
    return apiRequest<ApiResponse<any>>('GET', url, null, { params });
  },

  /**
   * Get following for a user
   */
  getFollowing: async (userId?: number, params?: { page?: number; limit?: number }): Promise<ApiResponse<any>> => {
    const url = userId ? `/follows/following/${userId}` : '/follows/following';
    return apiRequest<ApiResponse<any>>('GET', url, null, { params });
  },

  /**
   * Get follow stats
   */
  getFollowStats: async (userId?: number): Promise<ApiResponse<any>> => {
    const url = userId ? `/follows/stats/${userId}` : '/follows/stats';
    return apiRequest<ApiResponse<any>>('GET', url);
  },

  /**
   * Get follow suggestions
   */
  getSuggestions: async (params?: { limit?: number }): Promise<ApiResponse<any>> => {
    return apiRequest<ApiResponse<any>>('GET', '/follows/suggestions', null, { params });
  },
};

/**
 * Shares API
 * Endpoints for sharing/unsharing posts
 */
export const sharesApi = {
  /**
   * Share a post
   */
  sharePost: async (postId: number, data?: { comment?: string; share_type?: string }): Promise<ApiResponse<any>> => {
    return apiRequest<ApiResponse<any>>('POST', `/shares/${postId}`, data);
  },

  /**
   * Unshare a post
   */
  unsharePost: async (postId: number): Promise<ApiResponse<void>> => {
    return apiRequest<ApiResponse<void>>('DELETE', `/shares/${postId}`);
  },

  /**
   * Check if shared a post
   */
  checkShared: async (postId: number): Promise<ApiResponse<{ has_shared: boolean }>> => {
    return apiRequest<ApiResponse<{ has_shared: boolean }>>('GET', `/shares/check/${postId}`);
  },

  /**
   * Get shares for a post
   */
  getPostShares: async (postId: number, params?: { page?: number; limit?: number }): Promise<ApiResponse<any>> => {
    return apiRequest<ApiResponse<any>>('GET', `/shares/post/${postId}`, null, { params });
  },

  /**
   * Get popular shares
   */
  getPopularShares: async (params?: { limit?: number; timeframe?: string }): Promise<ApiResponse<any>> => {
    return apiRequest<ApiResponse<any>>('GET', '/shares/popular', null, { params });
  },
};

/**
 * Timeline API
 * Endpoints for personalized timeline/feed
 */
export const timelineApi = {
  /**
   * Get personalized timeline
   */
  getTimeline: async (params?: { page?: number; limit?: number; min_score?: number }): Promise<ApiResponse<any>> => {
    return apiRequest<ApiResponse<any>>('GET', '/timeline', null, { params });
  },

  /**
   * Get following feed
   */
  getFollowingFeed: async (params?: { page?: number; limit?: number }): Promise<ApiResponse<any>> => {
    return apiRequest<ApiResponse<any>>('GET', '/timeline/following', null, { params });
  },

  /**
   * Get discover feed
   */
  getDiscoverFeed: async (params?: { limit?: number }): Promise<ApiResponse<any>> => {
    return apiRequest<ApiResponse<any>>('GET', '/timeline/discover', null, { params });
  },

  /**
   * Get trending posts
   */
  getTrendingPosts: async (params?: { limit?: number; timeframe?: string }): Promise<ApiResponse<any>> => {
    return apiRequest<ApiResponse<any>>('GET', '/timeline/trending', null, { params });
  },

  /**
   * Refresh timeline cache
   */
  refreshTimeline: async (): Promise<ApiResponse<any>> => {
    return apiRequest<ApiResponse<any>>('POST', '/timeline/refresh');
  },
};

// Export the configured axios client for custom requests
export { apiClient };

// Helper function to get media URL
export const getMediaUrl = (media: Media): string => {
  const baseUrl = getApiBaseUrl();
  return `${baseUrl}/uploads/${media.file_path}`;
};

// Helper function to get user avatar URL or default
export const getUserAvatarUrl = (user: User): string => {
  if (user.avatar_url) {
    // If avatar_url starts with '/', it's a relative path - prepend base URL
    if (user.avatar_url.startsWith('/')) {
      const baseUrl = getApiBaseUrl();
      return `${baseUrl}${user.avatar_url}`;
    }
    // If it's already a full URL, return as-is
    return user.avatar_url;
  }

  // Generate a default avatar using user initials
  const initials = `${user.first_name[0] || ''}${user.last_name[0] || ''}`.toUpperCase();
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&background=1877f2&color=fff&size=150`;
};