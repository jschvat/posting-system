/**
 * Notifications API Service
 * Handles all notification-related API calls
 */

import api from './index';
import { ApiResponse } from '../../types';

export interface Notification {
  id: number;
  user_id: number;
  type: string;
  title: string;
  message: string;
  actor_id?: number;
  entity_type?: string;
  entity_id?: number;
  action_url?: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  read_at?: string;
  clicked_at?: string;
  created_at: string;
  expires_at?: string;
  actor?: {
    id: number;
    username: string;
    avatar_url?: string;
  };
}

export interface NotificationPreference {
  id: number;
  user_id: number;
  notification_type: string;
  email_enabled: boolean;
  push_enabled: boolean;
  in_app_enabled: boolean;
  frequency: 'realtime' | 'hourly' | 'daily';
}

export const notificationsApi = {
  getNotifications: async (params?: {
    unread_only?: boolean;
    type?: string;
    limit?: number;
    offset?: number;
  }): Promise<ApiResponse<Notification[]>> => {
    const response = await api.get('/notifications', { params });
    return response.data;
  },

  getUnreadCount: async (): Promise<ApiResponse<{ count: number }>> => {
    const response = await api.get('/notifications/unread-count');
    return response.data;
  },

  markAsRead: async (notificationId: number): Promise<ApiResponse<any>> => {
    const response = await api.post(`/notifications/${notificationId}/read`);
    return response.data;
  },

  markAllAsRead: async (): Promise<ApiResponse<any>> => {
    const response = await api.post('/notifications/read-all');
    return response.data;
  },

  deleteNotification: async (notificationId: number): Promise<ApiResponse<any>> => {
    const response = await api.delete(`/notifications/${notificationId}`);
    return response.data;
  },

  clearAll: async (): Promise<ApiResponse<any>> => {
    const response = await api.delete('/notifications/clear-all');
    return response.data;
  },

  getPreferences: async (): Promise<ApiResponse<NotificationPreference[]>> => {
    const response = await api.get('/notifications/preferences');
    return response.data;
  },

  updatePreference: async (type: string, data: {
    email_enabled?: boolean;
    push_enabled?: boolean;
    in_app_enabled?: boolean;
    frequency?: 'realtime' | 'hourly' | 'daily';
  }): Promise<ApiResponse<NotificationPreference>> => {
    const response = await api.put(`/notifications/preferences/${type}`, data);
    return response.data;
  }
};
