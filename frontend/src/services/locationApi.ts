/**
 * Location API Service
 * Handles all geolocation-related API calls
 */

import { apiRequest } from './api';
import { ApiResponse } from '../types';

export interface Location {
  latitude: number | null;
  longitude: number | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  country: string | null;
  accuracy: number | null;
  updated_at: string | null;
  sharing: 'exact' | 'city' | 'off';
}

export interface LocationUpdate {
  latitude: number;
  longitude: number;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
  accuracy?: number;
}

export interface NearbyUser {
  user_id: number;
  username: string;
  first_name: string;
  last_name: string;
  avatar_url: string;
  distance_miles: number;
  location_city: string | null;
  location_state: string | null;
  location_sharing: string;
}

export interface NearbySearchParams {
  latitude: number;
  longitude: number;
  radiusMiles?: number;
  limit?: number;
  offset?: number;
}

export interface LocationPreferences {
  sharing: 'exact' | 'city' | 'off';
  showDistance?: boolean;
}

export interface LocationHistory {
  id: number;
  latitude: number;
  longitude: number;
  city: string | null;
  state: string | null;
  country: string | null;
  accuracy: number | null;
  created_at: string;
}

export interface LocationStats {
  users_with_location: number;
  sharing_exact: number;
  sharing_city: number;
  sharing_off: number;
  unique_cities: number;
  unique_states: number;
  unique_countries: number;
}

const locationApi = {
  /**
   * Update user's current location
   */
  updateLocation: async (data: LocationUpdate): Promise<ApiResponse<void>> => {
    return apiRequest('POST', '/location/update', data);
  },

  /**
   * Get current user's location
   */
  getMyLocation: async (): Promise<ApiResponse<{ location: Location }>> => {
    return apiRequest('GET', '/location/me');
  },

  /**
   * Get another user's location (respects privacy)
   */
  getUserLocation: async (userId: number): Promise<ApiResponse<{ location: Location }>> => {
    return apiRequest('GET', `/location/user/${userId}`);
  },

  /**
   * Find nearby users
   */
  findNearby: async (params: NearbySearchParams): Promise<ApiResponse<{ users: NearbyUser[]; count: number; cached: boolean }>> => {
    return apiRequest('POST', '/location/nearby', params);
  },

  /**
   * Update location sharing preferences
   */
  updatePreferences: async (preferences: LocationPreferences): Promise<ApiResponse<{ preferences: LocationPreferences }>> => {
    return apiRequest('PUT', '/location/preferences', preferences);
  },

  /**
   * Get location history
   */
  getHistory: async (limit?: number): Promise<ApiResponse<{ history: LocationHistory[] }>> => {
    const params = limit ? { limit: limit.toString() } : undefined;
    return apiRequest('GET', '/location/history', null, { params });
  },

  /**
   * Calculate distance between two points
   */
  calculateDistance: async (
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): Promise<ApiResponse<{ distance: number }>> => {
    return apiRequest('POST', '/location/distance', { lat1, lon1, lat2, lon2 });
  },

  /**
   * Get location statistics
   */
  getStats: async (): Promise<ApiResponse<{ stats: LocationStats }>> => {
    return apiRequest('GET', '/location/stats');
  },

  /**
   * Cleanup expired cache entries
   */
  cleanupCache: async (): Promise<ApiResponse<{ deletedCount: number }>> => {
    return apiRequest('DELETE', '/location/cache/cleanup');
  },
};

export default locationApi;
