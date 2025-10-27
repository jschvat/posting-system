import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { WebSocketProvider, useWebSocket } from '../../contexts/WebSocketContext';
import { AuthProvider } from '../../contexts/AuthContext';
import { mockUser, mockMessage } from '../utils/testUtils';
import { io } from 'socket.io-client';

// Mock socket.io-client
jest.mock('socket.io-client');
const mockedIo = io as jest.MockedFunction<typeof io>;

describe('WebSocketContext', () => {
  let mockSocket: any;

  beforeEach(() => {
    mockSocket = {
      on: jest.fn(),
      off: jest.fn(),
      emit: jest.fn(),
      connect: jest.fn(),
      disconnect: jest.fn(),
      connected: false,
    };

    mockedIo.mockReturnValue(mockSocket);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <AuthProvider>
      <WebSocketProvider>{children}</WebSocketProvider>
    </AuthProvider>
  );

  describe('Socket Connection', () => {
    it('should initialize socket connection when authenticated', () => {
      localStorage.setItem('auth', JSON.stringify({
        user: mockUser,
        token: 'test-token',
      }));

      renderHook(() => useWebSocket(), { wrapper });

      expect(mockedIo).toHaveBeenCalled();
    });

    it('should not connect when not authenticated', () => {
      localStorage.clear();

      renderHook(() => useWebSocket(), { wrapper });

      expect(mockSocket.connect).not.toHaveBeenCalled();
    });

    it('should disconnect on unmount', () => {
      localStorage.setItem('auth', JSON.stringify({
        user: mockUser,
        token: 'test-token',
      }));

      const { unmount } = renderHook(() => useWebSocket(), { wrapper });

      unmount();

      expect(mockSocket.disconnect).toHaveBeenCalled();
    });
  });

  describe('joinConversation', () => {
    it('should emit join_conversation event', () => {
      localStorage.setItem('auth', JSON.stringify({
        user: mockUser,
        token: 'test-token',
      }));

      const { result } = renderHook(() => useWebSocket(), { wrapper });

      act(() => {
        result.current.joinConversation(1);
      });

      expect(mockSocket.emit).toHaveBeenCalledWith('join_conversation', { conversationId: 1 });
    });
  });

  describe('leaveConversation', () => {
    it('should emit leave_conversation event', () => {
      localStorage.setItem('auth', JSON.stringify({
        user: mockUser,
        token: 'test-token',
      }));

      const { result } = renderHook(() => useWebSocket(), { wrapper });

      act(() => {
        result.current.leaveConversation(1);
      });

      expect(mockSocket.emit).toHaveBeenCalledWith('leave_conversation', { conversationId: 1 });
    });
  });

  describe('sendMessage', () => {
    it('should emit send_message event with text type', () => {
      localStorage.setItem('auth', JSON.stringify({
        user: mockUser,
        token: 'test-token',
      }));

      const { result } = renderHook(() => useWebSocket(), { wrapper });

      act(() => {
        result.current.sendMessage(1, 'Hello world');
      });

      expect(mockSocket.emit).toHaveBeenCalledWith('send_message', {
        conversationId: 1,
        content: 'Hello world',
        messageType: 'text',
      });
    });

    it('should emit send_message event with custom message type', () => {
      localStorage.setItem('auth', JSON.stringify({
        user: mockUser,
        token: 'test-token',
      }));

      const { result } = renderHook(() => useWebSocket(), { wrapper });

      act(() => {
        result.current.sendMessage(1, 'image.jpg', 'image');
      });

      expect(mockSocket.emit).toHaveBeenCalledWith('send_message', {
        conversationId: 1,
        content: 'image.jpg',
        messageType: 'image',
      });
    });
  });

  describe('sendTyping', () => {
    it('should emit typing event', () => {
      localStorage.setItem('auth', JSON.stringify({
        user: mockUser,
        token: 'test-token',
      }));

      const { result } = renderHook(() => useWebSocket(), { wrapper });

      act(() => {
        result.current.sendTyping(1, true);
      });

      expect(mockSocket.emit).toHaveBeenCalledWith('typing', {
        conversationId: 1,
        isTyping: true,
      });
    });
  });

  describe('Event Subscriptions', () => {
    it('should register onMessage callback and receive messages', () => {
      localStorage.setItem('auth', JSON.stringify({
        user: mockUser,
        token: 'test-token',
      }));

      const { result } = renderHook(() => useWebSocket(), { wrapper });
      const mockCallback = jest.fn();

      act(() => {
        result.current.onMessage(mockCallback);
      });

      // Simulate receiving a message
      const messageHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'message'
      )?.[1];

      act(() => {
        messageHandler?.(mockMessage);
      });

      expect(mockCallback).toHaveBeenCalledWith(mockMessage);
    });

    it('should unsubscribe from onMessage', () => {
      localStorage.setItem('auth', JSON.stringify({
        user: mockUser,
        token: 'test-token',
      }));

      const { result } = renderHook(() => useWebSocket(), { wrapper });
      const mockCallback = jest.fn();

      let unsubscribe: () => void;
      act(() => {
        unsubscribe = result.current.onMessage(mockCallback);
      });

      act(() => {
        unsubscribe();
      });

      // Get message handler
      const messageHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'message'
      )?.[1];

      // Simulate receiving a message after unsubscribe
      act(() => {
        messageHandler?.(mockMessage);
      });

      // Callback should not be called
      expect(mockCallback).not.toHaveBeenCalled();
    });

    it('should register onTyping callback', () => {
      localStorage.setItem('auth', JSON.stringify({
        user: mockUser,
        token: 'test-token',
      }));

      const { result } = renderHook(() => useWebSocket(), { wrapper });
      const mockCallback = jest.fn();

      act(() => {
        result.current.onTyping(mockCallback);
      });

      const typingData = {
        conversationId: 1,
        userId: 2,
        username: 'otheruser',
        isTyping: true,
      };

      const typingHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'typing'
      )?.[1];

      act(() => {
        typingHandler?.(typingData);
      });

      expect(mockCallback).toHaveBeenCalledWith(typingData);
    });

    it('should register onNotification callback', () => {
      localStorage.setItem('auth', JSON.stringify({
        user: mockUser,
        token: 'test-token',
      }));

      const { result } = renderHook(() => useWebSocket(), { wrapper });
      const mockCallback = jest.fn();

      act(() => {
        result.current.onNotification(mockCallback);
      });

      const notification = {
        type: 'message',
        message: 'New message received',
      };

      const notificationHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'notification'
      )?.[1];

      act(() => {
        notificationHandler?.(notification);
      });

      expect(mockCallback).toHaveBeenCalledWith(notification);
    });

    it('should register onPresence callback', () => {
      localStorage.setItem('auth', JSON.stringify({
        user: mockUser,
        token: 'test-token',
      }));

      const { result } = renderHook(() => useWebSocket(), { wrapper });
      const mockCallback = jest.fn();

      act(() => {
        result.current.onPresence(mockCallback);
      });

      const presenceData = {
        userId: 2,
        status: 'online',
      };

      const presenceHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'user_status'
      )?.[1];

      act(() => {
        presenceHandler?.(presenceData);
      });

      expect(mockCallback).toHaveBeenCalledWith(presenceData);
    });
  });

  describe('Multiple Subscriptions', () => {
    it('should handle multiple message subscribers', () => {
      localStorage.setItem('auth', JSON.stringify({
        user: mockUser,
        token: 'test-token',
      }));

      const { result } = renderHook(() => useWebSocket(), { wrapper });
      const mockCallback1 = jest.fn();
      const mockCallback2 = jest.fn();

      act(() => {
        result.current.onMessage(mockCallback1);
        result.current.onMessage(mockCallback2);
      });

      const messageHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'message'
      )?.[1];

      act(() => {
        messageHandler?.(mockMessage);
      });

      expect(mockCallback1).toHaveBeenCalledWith(mockMessage);
      expect(mockCallback2).toHaveBeenCalledWith(mockMessage);
    });
  });

  describe('Error Handling', () => {
    it('should not throw when calling methods without socket connection', () => {
      const { result } = renderHook(() => useWebSocket(), { wrapper });

      expect(() => {
        result.current.sendMessage(1, 'test');
        result.current.joinConversation(1);
        result.current.leaveConversation(1);
        result.current.sendTyping(1, true);
      }).not.toThrow();
    });

    it('should throw when useWebSocket is called outside provider', () => {
      expect(() => {
        renderHook(() => useWebSocket());
      }).toThrow('useWebSocket must be used within a WebSocketProvider');
    });
  });
});
