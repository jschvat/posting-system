/**
 * TypeScript type definitions for the social media posting platform
 * Defines interfaces and types used throughout the application
 */

// Base entity interface
export interface BaseEntity {
  id: number;
  created_at: string;
  updated_at?: string;
}

// User related types
export interface User extends BaseEntity {
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  full_name?: string;
  display_name?: string;
  bio?: string;
  avatar_url?: string;
  is_active: boolean;
}

export interface UserStats {
  total_posts: number;
  total_comments: number;
}

export interface UserWithStats extends User {
  stats?: UserStats;
}

// Post related types
export type PrivacyLevel = 'public' | 'friends' | 'private';

export interface Post extends BaseEntity {
  user_id: number;
  content: string;
  privacy_level: PrivacyLevel;
  is_published: boolean;
  preview?: string;
  is_edited?: boolean;
  word_count?: number;
  comment_count?: number;
  author?: User;
  media?: Media[];
  comments?: Comment[];
  reaction_counts?: ReactionCount[];
}

// Comment related types
export interface Comment extends BaseEntity {
  post_id: number;
  user_id: number;
  parent_id?: number;
  content: string;
  is_published: boolean;
  preview?: string;
  is_reply?: boolean;
  is_edited?: boolean;
  word_count?: number;
  author?: User;
  media?: Media[];
  replies?: Comment[];
  reaction_counts?: ReactionCount[];
}

// Media related types
export type MediaType = 'image' | 'video' | 'audio' | 'document';

export interface Media extends Omit<BaseEntity, 'updated_at'> {
  post_id?: number;
  comment_id?: number;
  user_id: number;
  filename: string;
  original_filename: string;
  file_path: string;
  file_size: number;
  formatted_file_size?: string;
  mime_type: string;
  media_type: MediaType;
  alt_text?: string;
  width?: number;
  height?: number;
  duration?: number;
  formatted_duration?: string;
  file_extension?: string;
  uploader?: User;
  is_image?: boolean;
  is_video?: boolean;
  is_audio?: boolean;
  is_document?: boolean;
}

// Reaction related types
export interface Reaction extends Omit<BaseEntity, 'updated_at'> {
  user_id: number;
  post_id?: number;
  comment_id?: number;
  emoji_unicode: string;
  emoji_name: string;
  user?: User;
  is_post_reaction?: boolean;
  is_comment_reaction?: boolean;
}

export interface ReactionCount {
  emoji_name: string;
  emoji_unicode: string;
  count: number;
  users?: User[];
}

export interface EmojiOption {
  name: string;
  unicode: string;
  display_name: string;
}

// API response types
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  error?: ApiError;
}

export interface ApiError {
  message: string;
  type: string;
  field?: string;
  details?: any[];
}

export interface PaginationInfo {
  current_page: number;
  total_pages: number;
  total_count: number;
  limit: number;
  has_next_page: boolean;
  has_prev_page: boolean;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: {
    [key: string]: T[] | PaginationInfo;
    pagination: PaginationInfo;
  };
}

// Form and component types
export interface PostFormData {
  content: string;
  privacy_level: PrivacyLevel;
  files?: FileList;
}

export interface CommentFormData {
  content: string;
  parent_id?: number;
  files?: FileList;
}

export interface UserFormData {
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  bio?: string;
  avatar?: File;
}

// Hook return types
export interface UsePostsReturn {
  posts: Post[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  hasNextPage: boolean;
  fetchNextPage: () => void;
  refetch: () => void;
}

export interface UseCommentsReturn {
  comments: Comment[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  addComment: (data: CommentFormData) => Promise<void>;
  updateComment: (id: number, content: string) => Promise<void>;
  deleteComment: (id: number) => Promise<void>;
}

export interface UseReactionsReturn {
  reactions: ReactionCount[];
  userReaction: Reaction | null;
  isLoading: boolean;
  toggleReaction: (emoji: EmojiOption) => Promise<void>;
}

// Component prop types
export interface PostCardProps {
  post: Post;
  onEdit?: (post: Post) => void;
  onDelete?: (postId: number) => void;
  showFullContent?: boolean;
}

export interface CommentListProps {
  comments: Comment[];
  postId: number;
  onReply?: (comment: Comment) => void;
  onEdit?: (comment: Comment) => void;
  onDelete?: (commentId: number) => void;
}

export interface CommentItemProps {
  comment: Comment;
  postId: number;
  level?: number;
  onReply?: (comment: Comment) => void;
  onEdit?: (comment: Comment) => void;
  onDelete?: (commentId: number) => void;
}

export interface EmojiPickerProps {
  onEmojiSelect: (emoji: EmojiOption) => void;
  isOpen: boolean;
  onClose: () => void;
}

export interface MediaUploadProps {
  onFilesSelected: (files: File[]) => void;
  maxFiles?: number;
  acceptedTypes?: string[];
  children?: React.ReactNode;
}

export interface UserAvatarProps {
  user: User;
  size?: 'small' | 'medium' | 'large';
  showName?: boolean;
  showStatus?: boolean;
}

// Utility types
export type SortOrder = 'newest' | 'oldest';
export type LoadingState = 'idle' | 'loading' | 'success' | 'error';

// Theme types (for styled-components)
declare module 'styled-components' {
  export interface DefaultTheme {
    colors: {
      primary: string;
      secondary: string;
      accent: string;
      background: string;
      surface: string;
      text: {
        primary: string;
        secondary: string;
        muted: string;
      };
      border: string;
      error: string;
      success: string;
      warning: string;
    };
    spacing: {
      xs: string;
      sm: string;
      md: string;
      lg: string;
      xl: string;
      xxl: string;
    };
    borderRadius: {
      sm: string;
      md: string;
      lg: string;
    };
    shadows: {
      sm: string;
      md: string;
      lg: string;
    };
    breakpoints: {
      mobile: string;
      tablet: string;
      desktop: string;
      wide: string;
    };
  }
}

// Environment variables
export interface EnvConfig {
  REACT_APP_API_BASE_URL: string;
  REACT_APP_UPLOAD_MAX_SIZE: number;
  REACT_APP_SUPPORTED_IMAGE_TYPES: string[];
  REACT_APP_SUPPORTED_VIDEO_TYPES: string[];
}