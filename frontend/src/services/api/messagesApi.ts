/**
 * Messages API Service
 * Handles all messaging-related API calls
 */

import { apiClient } from '../api';
import { ApiResponse } from '../../types';

export interface Reaction {
  emoji: string;
  count: number;
  users: Array<{ user_id: number; username: string }>;
}

export interface Message {
  id: number;
  conversation_id: number;
  sender_id: number;
  content: string;
  message_type: 'text' | 'image' | 'video' | 'file' | 'system';
  attachment_url?: string;
  reply_to_id?: number;
  edited_at?: string;
  deleted_at?: string;
  created_at: string;
  reactions?: Reaction[];
  sender?: {
    id: number;
    username: string;
    avatar_url?: string;
  };
  reply_to?: Message;
}

export interface Conversation {
  id: number;
  type: 'direct' | 'group';
  title?: string;
  created_by?: number;
  created_at: string;
  updated_at: string;
  last_message_id?: number;
  muted: boolean;
  archived: boolean;
  other_participants?: Array<{
    id: number;
    username: string;
    avatar_url?: string;
  }>;
  participants?: Array<{
    id: number;
    user_id?: number;
    username: string;
    avatar_url?: string;
    role?: string;
  }>;
  unread_count: number;
  last_message?: Message;
}

export const messagesApi = {
  // Conversations
  getConversations: async (params?: {
    limit?: number;
    offset?: number;
    include_archived?: boolean;
  }): Promise<ApiResponse<Conversation[]>> => {
    const response = await apiClient.get('/conversations', { params });
    return response.data;
  },

  getConversation: async (id: number): Promise<ApiResponse<Conversation>> => {
    const response = await apiClient.get(`/conversations/${id}`);
    return response.data;
  },

  createConversation: async (data: {
    type: 'direct' | 'group';
    participant_ids: number[];
    title?: string;
  }): Promise<ApiResponse<Conversation>> => {
    const response = await apiClient.post('/conversations', data);
    return response.data;
  },

  getUnreadCount: async (): Promise<ApiResponse<{ count: number }>> => {
    const response = await apiClient.get('/conversations/unread-count');
    return response.data;
  },

  archiveConversation: async (id: number, archived: boolean): Promise<ApiResponse<any>> => {
    const response = await apiClient.post(`/conversations/${id}/archive`, { archived });
    return response.data;
  },

  muteConversation: async (id: number, muted: boolean): Promise<ApiResponse<any>> => {
    const response = await apiClient.post(`/conversations/${id}/mute`, { muted });
    return response.data;
  },

  deleteConversation: async (id: number): Promise<ApiResponse<any>> => {
    const response = await apiClient.delete(`/conversations/${id}`);
    return response.data;
  },

  // Messages
  getMessages: async (conversationId: number, params?: {
    limit?: number;
    before_cursor?: string;
    after_cursor?: string;
  }): Promise<ApiResponse<{ messages: Message[]; has_more: boolean }>> => {
    const response = await apiClient.get(`/conversations/${conversationId}/messages`, { params });
    return response.data;
  },

  sendMessage: async (conversationId: number, data: {
    content: string;
    message_type?: string;
    attachment_url?: string;
    reply_to_id?: number;
  }): Promise<ApiResponse<Message>> => {
    const response = await apiClient.post(`/conversations/${conversationId}/messages`, data);
    return response.data;
  },

  editMessage: async (messageId: number, content: string): Promise<ApiResponse<Message>> => {
    const response = await apiClient.put(`/messages/${messageId}`, { content });
    return response.data;
  },

  deleteMessage: async (messageId: number): Promise<ApiResponse<any>> => {
    const response = await apiClient.delete(`/messages/${messageId}`);
    return response.data;
  },

  markAsRead: async (conversationId: number): Promise<ApiResponse<any>> => {
    const response = await apiClient.post(`/conversations/${conversationId}/read`);
    return response.data;
  },

  searchMessages: async (conversationId: number, query: string): Promise<ApiResponse<Message[]>> => {
    const response = await apiClient.get(`/conversations/${conversationId}/messages/search`, {
      params: { q: query }
    });
    return response.data;
  },

  // Reactions
  toggleReaction: async (messageId: number, emoji: string): Promise<ApiResponse<{ reactions: Reaction[] }>> => {
    const response = await apiClient.post(`/messages/${messageId}/reactions`, { emoji });
    return response.data;
  }
};
