/**
 * TypeScript interfaces for Group System
 * Matches backend API response structures
 */

// ============================================================================
// ENUMS AND CONSTANTS
// ============================================================================

export type GroupVisibility = 'public' | 'private' | 'invite_only';
export type MemberRole = 'admin' | 'moderator' | 'member';
export type MemberStatus = 'active' | 'banned' | 'pending';
export type PostStatus = 'published' | 'pending' | 'removed';
export type ContentType = 'text' | 'link' | 'image' | 'video' | 'poll';
export type VoteType = 'upvote' | 'downvote';
export type PostSortType = 'hot' | 'new' | 'top' | 'controversial';
export type TopPeriod = 'hour' | 'day' | 'week' | 'month' | 'year' | 'all';

// ============================================================================
// GROUP INTERFACES
// ============================================================================

export interface Group {
  id: number;
  name: string;
  slug: string;
  display_name: string;
  description?: string;
  icon_url?: string;
  avatar_url?: string;
  banner_url?: string;
  visibility: GroupVisibility;
  post_approval_required: boolean;
  allow_text_posts: boolean;
  allow_link_posts: boolean;
  allow_image_posts: boolean;
  allow_video_posts: boolean;
  allow_poll_posts: boolean;
  moderator_can_remove_posts: boolean;
  moderator_can_remove_comments: boolean;
  moderator_can_ban_members: boolean;
  moderator_can_approve_posts: boolean;
  moderator_can_approve_members: boolean;
  moderator_can_pin_posts: boolean;
  moderator_can_lock_posts: boolean;
  creator_id: number;
  member_count: number;
  post_count: number;
  rules?: string;
  conversation_id?: number;
  settings?: {
    chat_enabled?: boolean;
    [key: string]: any;
  };
  created_at: string;
  updated_at: string;
  user_membership?: {
    status: MemberStatus;
    role: MemberRole;
  };
}

export interface GroupMembership {
  id: number;
  group_id: number;
  user_id: number;
  role: MemberRole;
  status: MemberStatus;
  banned_by?: number;
  banned_at?: string;
  banned_reason?: string;
  joined_at: string;
  updated_at: string;
}

export interface GroupMember {
  user_id: number;
  username: string;
  display_name?: string;
  avatar_url?: string;
  role: MemberRole;
  status: MemberStatus;
  joined_at: string;
}

// ============================================================================
// POST INTERFACES
// ============================================================================

export interface GroupPost {
  id: number;
  group_id: number;
  user_id: number;
  title: string;
  content?: string;
  content_type: ContentType;
  link_url?: string;
  status: PostStatus;
  is_pinned: boolean;
  is_locked: boolean;
  removed_by?: number;
  removed_at?: string;
  removal_reason?: string;
  approved_by?: number;
  approved_at?: string;
  upvotes: number;
  downvotes: number;
  score: number;
  comment_count: number;
  created_at: string;
  updated_at: string;
  // Joined fields
  username?: string;
  display_name?: string;
  avatar_url?: string;
  reputation_score?: number;
  group_name?: string;
  group_slug?: string;
  user_vote?: VoteType | null;
  media?: PostMedia[];
}

export interface PostMedia {
  id: number;
  post_id: number;
  media_type: string;
  file_path: string;
  file_url: string;
  file_size: number;
  mime_type: string;
  width?: number;
  height?: number;
  duration?: number;
  thumbnail_url?: string;
  alt_text?: string;
  display_order: number;
  created_at: string;
}

export interface CreatePostData {
  title: string;
  content?: string;
  content_type: ContentType;
  link_url?: string;
  media_ids?: number[];
  poll_question?: string;
  poll_options?: string[];
  poll_ends_at?: string | null;
  poll_allow_multiple?: boolean;
}

export interface UpdatePostData {
  title?: string;
  content?: string;
  link_url?: string;
}

// ============================================================================
// COMMENT INTERFACES
// ============================================================================

export interface GroupComment {
  id: number;
  post_id: number;
  user_id: number;
  parent_id?: number;
  path: string;
  depth: number;
  content: string;
  upvotes: number;
  downvotes: number;
  score: number;
  is_removed: boolean;
  removed_by?: number;
  removed_at?: string;
  removal_reason?: string;
  created_at: string;
  updated_at: string;
  // Joined fields
  username?: string;
  display_name?: string;
  avatar_url?: string;
  user_vote?: VoteType | null;
  replies?: GroupComment[];
  media?: CommentMedia[];
}

export interface CommentMedia {
  id: number;
  comment_id: number;
  media_type: string;
  file_path: string;
  file_url: string;
  file_size: number;
  mime_type: string;
  width?: number;
  height?: number;
  duration?: number;
  thumbnail_url?: string;
  alt_text?: string;
  display_order: number;
  created_at: string;
}

export interface CreateCommentData {
  content: string;
  parent_id?: number;
}

export interface UpdateCommentData {
  content: string;
}

// ============================================================================
// VOTE INTERFACES
// ============================================================================

export interface VoteResponse {
  upvotes: number;
  downvotes: number;
  score: number;
  user_vote: VoteType | null;
}

// ============================================================================
// API RESPONSE INTERFACES
// ============================================================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string | {
    message: string;
    type?: string;
    code?: string;
  };
  pagination?: PaginationInfo;
}

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  pagination: PaginationInfo;
}

// ============================================================================
// CREATE/UPDATE INTERFACES
// ============================================================================

export interface CreateGroupData {
  name: string;
  display_name: string;
  description?: string;
  visibility?: GroupVisibility;
  post_approval_required?: boolean;
  allow_text_posts?: boolean;
  allow_link_posts?: boolean;
  allow_image_posts?: boolean;
  allow_video_posts?: boolean;
  allow_poll_posts?: boolean;
  rules?: string;
}

export interface UpdateGroupData {
  display_name?: string;
  description?: string;
  icon_url?: string;
  avatar_url?: string;
  banner_url?: string;
  visibility?: GroupVisibility;
  post_approval_required?: boolean;
  allow_text_posts?: boolean;
  allow_link_posts?: boolean;
  allow_image_posts?: boolean;
  allow_video_posts?: boolean;
  allow_poll_posts?: boolean;
  moderator_can_remove_posts?: boolean;
  moderator_can_remove_comments?: boolean;
  moderator_can_ban_members?: boolean;
  moderator_can_approve_posts?: boolean;
  moderator_can_approve_members?: boolean;
  moderator_can_pin_posts?: boolean;
  moderator_can_lock_posts?: boolean;
  rules?: string;
}

export interface UpdateMemberRoleData {
  role: MemberRole;
}

export interface BanMemberData {
  banned_reason: string;
}

export interface RemovePostData {
  removal_reason: string;
}

export interface RemoveCommentData {
  removal_reason: string;
}
