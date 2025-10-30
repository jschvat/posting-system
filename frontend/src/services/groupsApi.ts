/**
 * API Service for Group Management
 * Handles all API calls related to groups, memberships, and member management
 */

import { apiClient as api } from './api';
import {
  ApiResponse,
  PaginatedResponse,
  Group,
  GroupMember,
  CreateGroupData,
  UpdateGroupData,
  UpdateMemberRoleData,
  BanMemberData
} from '../types/group';
import { Conversation } from './api/messagesApi';

// ============================================================================
// GROUP CRUD OPERATIONS
// ============================================================================

/**
 * Create a new group
 */
export const createGroup = async (data: CreateGroupData): Promise<ApiResponse<{ group: Group }>> => {
  const response = await api.post('/groups', data);
  return response.data;
};

/**
 * Get list of groups with pagination and filtering
 */
export const getGroups = async (params?: {
  page?: number;
  limit?: number;
  visibility?: string;
}): Promise<ApiResponse<PaginatedResponse<Group>>> => {
  const response = await api.get('/groups', { params });
  return response.data;
};

/**
 * Get a single group by slug
 */
export const getGroup = async (slug: string): Promise<ApiResponse<Group>> => {
  const response = await api.get(`/groups/${slug}`);
  return response.data;
};

/**
 * Update group settings (admin only)
 */
export const updateGroup = async (
  slug: string,
  data: UpdateGroupData
): Promise<ApiResponse<{ group: Group }>> => {
  const response = await api.put(`/groups/${slug}`, data);
  return response.data;
};

/**
 * Delete a group (admin only)
 */
export const deleteGroup = async (slug: string): Promise<ApiResponse<{ message: string }>> => {
  const response = await api.delete(`/groups/${slug}`);
  return response.data;
};

/**
 * Upload group avatar (admin only)
 */
export const uploadGroupAvatar = async (slug: string, file: File): Promise<ApiResponse<{ group: Group; avatar_url: string }>> => {
  const formData = new FormData();
  formData.append('avatar', file);
  const response = await api.post(`/groups/${slug}/avatar`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  });
  return response.data;
};

/**
 * Upload group banner (admin only)
 */
export const uploadGroupBanner = async (slug: string, file: File): Promise<ApiResponse<{ group: Group; banner_url: string }>> => {
  const formData = new FormData();
  formData.append('banner', file);
  const response = await api.post(`/groups/${slug}/banner`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  });
  return response.data;
};

/**
 * Search groups by name or description
 */
export const searchGroups = async (params: {
  q: string;
  page?: number;
  limit?: number;
}): Promise<ApiResponse<PaginatedResponse<Group>>> => {
  const response = await api.get('/groups/search', { params });
  return response.data;
};

/**
 * Get filtered groups by membership/location status
 */
export const getFilteredGroups = async (params: {
  filter: 'all' | 'joined' | 'pending' | 'available' | 'unavailable';
  page?: number;
  limit?: number;
  offset?: number;
}): Promise<ApiResponse<PaginatedResponse<Group>>> => {
  const response = await api.get('/groups/filtered', { params });
  return response.data;
};

// ============================================================================
// MEMBERSHIP OPERATIONS
// ============================================================================

/**
 * Join a group
 */
export const joinGroup = async (slug: string): Promise<ApiResponse<{
  message: string;
  membership: {
    group_id: number;
    user_id: number;
    role: string;
    status: string;
  };
}>> => {
  const response = await api.post(`/groups/${slug}/join`);
  return response.data;
};

/**
 * Leave a group
 */
export const leaveGroup = async (slug: string): Promise<ApiResponse<{ message: string }>> => {
  const response = await api.post(`/groups/${slug}/leave`);
  return response.data;
};

/**
 * Get list of group members
 */
export const getGroupMembers = async (
  slug: string,
  params?: {
    page?: number;
    limit?: number;
    role?: string;
    status?: string;
  }
): Promise<ApiResponse<{ members: GroupMember[]; total: number; limit: number; offset: number }>> => {
  const response = await api.get(`/groups/${slug}/members`, { params });
  return response.data;
};

/**
 * Check if current user is a member of the group
 */
export const checkMembership = async (slug: string): Promise<ApiResponse<{
  is_member: boolean;
  membership?: {
    role: string;
    status: string;
    joined_at: string;
  };
}>> => {
  const response = await api.get(`/groups/${slug}/membership`);
  return response.data;
};

// ============================================================================
// MEMBER MANAGEMENT (ADMIN/MODERATOR)
// ============================================================================

/**
 * Update a member's role (admin only)
 */
export const updateMemberRole = async (
  slug: string,
  userId: number,
  data: UpdateMemberRoleData
): Promise<ApiResponse<{ message: string; membership: any }>> => {
  const response = await api.post(`/groups/${slug}/members/${userId}/role`, data);
  return response.data;
};

/**
 * Ban a member from the group (moderator/admin)
 */
export const banMember = async (
  slug: string,
  userId: number,
  data: BanMemberData
): Promise<ApiResponse<{ message: string }>> => {
  const response = await api.post(`/groups/${slug}/members/${userId}/ban`, data);
  return response.data;
};

/**
 * Unban a member from the group (moderator/admin)
 */
export const unbanMember = async (
  slug: string,
  userId: number
): Promise<ApiResponse<{ message: string }>> => {
  const response = await api.post(`/groups/${slug}/members/${userId}/unban`);
  return response.data;
};

/**
 * Remove a member from the group (admin only)
 */
export const removeMember = async (
  slug: string,
  userId: number
): Promise<ApiResponse<{ message: string }>> => {
  const response = await api.delete(`/groups/${slug}/members/${userId}`);
  return response.data;
};

// ============================================================================
// MODERATION OPERATIONS
// ============================================================================

/**
 * Get pending membership requests
 */
export const getPendingMembers = async (slug: string): Promise<ApiResponse<{ members: GroupMember[] }>> => {
  const response = await api.get(`/groups/${slug}/members/pending`);
  return response.data;
};

/**
 * Approve pending membership
 */
export const approveMember = async (
  slug: string,
  userId: number
): Promise<ApiResponse<{ message: string }>> => {
  const response = await api.post(`/groups/${slug}/members/${userId}/approve`);
  return response.data;
};

/**
 * Reject pending membership
 */
export const rejectMember = async (
  slug: string,
  userId: number
): Promise<ApiResponse<{ message: string }>> => {
  const response = await api.post(`/groups/${slug}/members/${userId}/reject`);
  return response.data;
};

/**
 * Get banned members
 */
export const getBannedMembers = async (slug: string): Promise<ApiResponse<{ members: GroupMember[] }>> => {
  const response = await api.get(`/groups/${slug}/members/banned`);
  return response.data;
};

/**
 * Get activity log
 */
export const getActivityLog = async (slug: string, params?: {
  limit?: number;
  offset?: number;
}): Promise<ApiResponse<{ activities: any[]; total: number }>> => {
  const response = await api.get(`/groups/${slug}/activity`, { params });
  return response.data;
};

// ============================================================================
// GROUP CHAT OPERATIONS
// ============================================================================

/**
 * Get group chat conversation (members only)
 */
export const getGroupChat = async (slug: string): Promise<ApiResponse<{
  conversation: Conversation;
  participants: Array<{
    user_id: number;
    username: string;
    avatar_url?: string;
    role: string;
  }>;
}>> => {
  const response = await api.get(`/groups/${slug}/chat`);
  return response.data;
};

/**
 * Toggle group chat enabled/disabled (admin only)
 */
export const toggleGroupChat = async (
  slug: string,
  enabled: boolean
): Promise<ApiResponse<{
  group: Group;
  message: string;
}>> => {
  const response = await api.put(`/groups/${slug}/chat/toggle`, { enabled });
  return response.data;
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Check if user has moderator or admin role in a group
 */
export const hasModeratorRole = (membership?: { role: string }): boolean => {
  if (!membership) return false;
  return membership.role === 'moderator' || membership.role === 'admin';
};

/**
 * Check if user has admin role in a group
 */
export const hasAdminRole = (membership?: { role: string }): boolean => {
  if (!membership) return false;
  return membership.role === 'admin';
};

/**
 * Check if user can post in a group
 */
export const canPost = (group: Group, membership?: { role: string; status: string }): boolean => {
  if (!membership || membership.status !== 'active') return false;
  return true;
};

/**
 * Check if user can moderate posts
 */
export const canModerate = (membership?: { role: string; status: string }): boolean => {
  if (!membership || membership.status !== 'active') return false;
  return hasModeratorRole(membership);
};

export default {
  createGroup,
  getGroups,
  getGroup,
  updateGroup,
  deleteGroup,
  uploadGroupAvatar,
  uploadGroupBanner,
  searchGroups,
  getFilteredGroups,
  joinGroup,
  leaveGroup,
  getGroupMembers,
  checkMembership,
  updateMemberRole,
  banMember,
  unbanMember,
  removeMember,
  getPendingMembers,
  approveMember,
  rejectMember,
  getBannedMembers,
  getActivityLog,
  getGroupChat,
  toggleGroupChat,
  hasModeratorRole,
  hasAdminRole,
  canPost,
  canModerate
};
