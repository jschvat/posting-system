/**
 * WebSocket Context
 * Provides real-time messaging and notification functionality via Socket.io
 */

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';

/**
 * Get WebSocket URL dynamically based on current hostname
 * This enables remote access to work correctly
 */
const getWebSocketUrl = (): string => {
  // Check for explicit environment variable first
  if (process.env.REACT_APP_WS_URL) {
    return process.env.REACT_APP_WS_URL;
  }

  // If running in browser, use the current window location's hostname
  if (typeof window !== 'undefined' && window.location) {
    const hostname = window.location.hostname;
    const protocol = window.location.protocol.replace(':', ''); // Remove trailing ':'
    return `${protocol}://${hostname}:3002`;
  }

  // Fallback for server-side rendering
  return 'http://localhost:3002';
};

const WS_URL = getWebSocketUrl();

interface WebSocketContextType {
  socket: Socket | null;
  connected: boolean;
  joinConversation: (conversationId: number) => void;
  leaveConversation: (conversationId: number) => void;
  sendMessage: (conversationId: number, content: string, messageType?: string) => void;
  sendTyping: (conversationId: number, isTyping: boolean) => void;
  onMessage: (callback: (data: any) => void) => () => void;
  onTyping: (callback: (data: any) => void) => () => void;
  onNotification: (callback: (data: any) => void) => () => void;
  onPresence: (callback: (data: any) => void) => () => void;
}

const WebSocketContext = createContext<WebSocketContextType>({
  socket: null,
  connected: false,
  joinConversation: () => {},
  leaveConversation: () => {},
  sendMessage: () => {},
  sendTyping: () => {},
  onMessage: () => () => {},
  onTyping: () => () => {},
  onNotification: () => () => {},
  onPresence: () => () => {}
});

export const useWebSocket = () => useContext(WebSocketContext);

interface WebSocketProviderProps {
  children: React.ReactNode;
}

export const WebSocketProvider: React.FC<WebSocketProviderProps> = ({ children }) => {
  const { state } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  // Initialize WebSocket connection
  useEffect(() => {
    if (!state.token || !state.user) {
      // Disconnect if no auth
      if (socketRef.current) {
        console.log('🔌 Disconnecting WebSocket (no auth)');
        socketRef.current.close();
        socketRef.current = null;
        setSocket(null);
        setConnected(false);
      }
      return;
    }

    // Create socket connection
    console.log('🔌 Connecting to WebSocket...');
    const newSocket = io(WS_URL, {
      auth: { token: state.token }
    });

    newSocket.on('connect', () => {
      console.log('✅ WebSocket connected');
      setConnected(true);
    });

    newSocket.on('disconnect', () => {
      console.log('❌ WebSocket disconnected');
      setConnected(false);
    });

    newSocket.on('connect_error', (error) => {
      console.error('❌ WebSocket connection error:', error.message);
      setConnected(false);
    });

    newSocket.on('error', (error) => {
      console.error('❌ WebSocket error:', error);
    });

    socketRef.current = newSocket;
    setSocket(newSocket);

    // Cleanup on unmount
    return () => {
      console.log('🔌 Cleaning up WebSocket connection');
      newSocket.close();
    };
  }, [state.token, state.user]);

  // Join conversation room
  const joinConversation = useCallback((conversationId: number) => {
    if (socketRef.current && connected) {
      console.log(`🔌 Joining conversation ${conversationId}`);
      socketRef.current.emit('conversation:join', { conversationId });
    }
  }, [connected]);

  // Leave conversation room
  const leaveConversation = useCallback((conversationId: number) => {
    if (socketRef.current && connected) {
      console.log(`🔌 Leaving conversation ${conversationId}`);
      socketRef.current.emit('conversation:leave', { conversationId });
    }
  }, [connected]);

  // Send message
  const sendMessage = useCallback((conversationId: number, content: string, messageType: string = 'text') => {
    if (socketRef.current && connected) {
      console.log(`📨 Sending message to conversation ${conversationId}`);
      socketRef.current.emit('message:send', {
        conversationId,
        content,
        messageType
      });
    }
  }, [connected]);

  // Send typing indicator
  const sendTyping = useCallback((conversationId: number, isTyping: boolean) => {
    if (socketRef.current && connected) {
      const event = isTyping ? 'user:typing:start' : 'user:typing:stop';
      socketRef.current.emit(event, { conversationId });
    }
  }, [connected]);

  // Subscribe to message events
  const onMessage = useCallback((callback: (data: any) => void) => {
    if (!socketRef.current) return () => {};

    const handler = (data: any) => callback(data);
    socketRef.current.on('message:new', handler);
    socketRef.current.on('message:edited', handler);
    socketRef.current.on('message:deleted', handler);

    return () => {
      if (socketRef.current) {
        socketRef.current.off('message:new', handler);
        socketRef.current.off('message:edited', handler);
        socketRef.current.off('message:deleted', handler);
      }
    };
  }, []);

  // Subscribe to typing events
  const onTyping = useCallback((callback: (data: any) => void) => {
    if (!socketRef.current) return () => {};

    const startHandler = (data: any) => callback({ ...data, isTyping: true });
    const stopHandler = (data: any) => callback({ ...data, isTyping: false });

    socketRef.current.on('user:typing:start', startHandler);
    socketRef.current.on('user:typing:stop', stopHandler);

    return () => {
      if (socketRef.current) {
        socketRef.current.off('user:typing:start', startHandler);
        socketRef.current.off('user:typing:stop', stopHandler);
      }
    };
  }, []);

  // Subscribe to notification events
  const onNotification = useCallback((callback: (data: any) => void) => {
    if (!socketRef.current) return () => {};

    const handler = (data: any) => callback(data);
    socketRef.current.on('notification:new', handler);

    return () => {
      if (socketRef.current) {
        socketRef.current.off('notification:new', handler);
      }
    };
  }, []);

  // Subscribe to presence events
  const onPresence = useCallback((callback: (data: any) => void) => {
    if (!socketRef.current) return () => {};

    const onlineHandler = (data: any) => callback({ ...data, online: true });
    const offlineHandler = (data: any) => callback({ ...data, online: false });

    socketRef.current.on('user:online', onlineHandler);
    socketRef.current.on('user:offline', offlineHandler);

    return () => {
      if (socketRef.current) {
        socketRef.current.off('user:online', onlineHandler);
        socketRef.current.off('user:offline', offlineHandler);
      }
    };
  }, []);

  const value: WebSocketContextType = {
    socket,
    connected,
    joinConversation,
    leaveConversation,
    sendMessage,
    sendTyping,
    onMessage,
    onTyping,
    onNotification,
    onPresence
  };

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
};
