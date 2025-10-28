/**
 * useOnlineStatus Hook
 * Manages online/offline status tracking for users via WebSocket presence
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useWebSocket } from '../contexts/WebSocketContext';
import { followsApi, FollowUser } from '../services/api/followsApi';

interface OnlineStatusMap {
  [userId: number]: boolean;
}

interface UseOnlineStatusReturn {
  onlineUsers: OnlineStatusMap;
  followedUsers: FollowUser[];
  isLoading: boolean;
  error: string | null;
  refreshFollowing: () => Promise<void>;
}

/**
 * Hook to track online status of followed users
 * Fetches the list of users you follow and subscribes to their presence updates
 */
export const useOnlineStatus = (): UseOnlineStatusReturn => {
  const { socket, connected } = useWebSocket();
  const [onlineUsers, setOnlineUsers] = useState<OnlineStatusMap>({});
  const [followedUsers, setFollowedUsers] = useState<FollowUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const subscribedRef = useRef(false);
  const followedUserIdsRef = useRef<number[]>([]);

  // Fetch followed users
  const fetchFollowing = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Fetch all followed users (with a high limit to get them all)
      const response = await followsApi.getFollowing(undefined, { limit: 1000 });

      if (response.success && response.data.following) {
        setFollowedUsers(response.data.following);
        followedUserIdsRef.current = response.data.following.map(u => u.id);
      }
    } catch (err: any) {
      console.error('Error fetching followed users:', err);
      setError(err.message || 'Failed to fetch followed users');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Subscribe to presence updates for followed users
  useEffect(() => {
    if (!socket || !connected || followedUserIdsRef.current.length === 0 || subscribedRef.current) {
      return;
    }

    const userIds = followedUserIdsRef.current;

    // Subscribe to presence updates
    socket.emit('presence:subscribe', { userIds });

    // Listen for subscription confirmation and initial status
    const handleSubscribed = (data: { users: OnlineStatusMap; timestamp: Date }) => {
      console.log('Presence subscribed:', data);
      setOnlineUsers(data.users);
      subscribedRef.current = true;
    };

    // Listen for presence status updates
    const handlePresenceStatus = (data: { users: OnlineStatusMap; timestamp: Date }) => {
      console.log('Presence status update:', data);
      setOnlineUsers(data.users);
    };

    socket.on('presence:subscribed', handleSubscribed);
    socket.on('presence:status', handlePresenceStatus);

    // Cleanup
    return () => {
      socket.off('presence:subscribed', handleSubscribed);
      socket.off('presence:status', handlePresenceStatus);

      // Unsubscribe from presence updates
      if (subscribedRef.current) {
        socket.emit('presence:unsubscribe', { userIds });
        subscribedRef.current = false;
      }
    };
  }, [socket, connected, followedUsers]);

  // Listen for real-time online/offline events
  useEffect(() => {
    if (!socket || !connected) {
      return;
    }

    const handleUserOnline = (data: { userId: number; username: string; timestamp: Date }) => {
      console.log(`User ${data.userId} (${data.username}) is now online`);
      setOnlineUsers(prev => ({ ...prev, [data.userId]: true }));
    };

    const handleUserOffline = (data: { userId: number; username: string; timestamp: Date }) => {
      console.log(`User ${data.userId} (${data.username}) is now offline`);
      setOnlineUsers(prev => ({ ...prev, [data.userId]: false }));
    };

    socket.on('user:online', handleUserOnline);
    socket.on('user:offline', handleUserOffline);

    return () => {
      socket.off('user:online', handleUserOnline);
      socket.off('user:offline', handleUserOffline);
    };
  }, [socket, connected]);

  // Initial fetch of followed users
  useEffect(() => {
    fetchFollowing();
  }, [fetchFollowing]);

  // Reset subscription flag when socket disconnects
  useEffect(() => {
    if (!connected) {
      subscribedRef.current = false;
    }
  }, [connected]);

  return {
    onlineUsers,
    followedUsers,
    isLoading,
    error,
    refreshFollowing: fetchFollowing
  };
};

/**
 * Hook to check if a specific user is online
 */
export const useUserOnlineStatus = (userId: number): boolean => {
  const { socket, connected } = useWebSocket();
  const [isOnline, setIsOnline] = useState(false);

  useEffect(() => {
    if (!socket || !connected || !userId) {
      return;
    }

    // Check current status
    socket.emit('presence:check', { userIds: [userId] });

    const handlePresenceStatus = (data: { users: OnlineStatusMap; timestamp: Date }) => {
      if (data.users[userId] !== undefined) {
        setIsOnline(data.users[userId]);
      }
    };

    const handleUserOnline = (data: { userId: number; username: string; timestamp: Date }) => {
      if (data.userId === userId) {
        setIsOnline(true);
      }
    };

    const handleUserOffline = (data: { userId: number; username: string; timestamp: Date }) => {
      if (data.userId === userId) {
        setIsOnline(false);
      }
    };

    socket.on('presence:status', handlePresenceStatus);
    socket.on('user:online', handleUserOnline);
    socket.on('user:offline', handleUserOffline);

    return () => {
      socket.off('presence:status', handlePresenceStatus);
      socket.off('user:online', handleUserOnline);
      socket.off('user:offline', handleUserOffline);
    };
  }, [socket, connected, userId]);

  return isOnline;
};
