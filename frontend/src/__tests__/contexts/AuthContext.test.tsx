import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from '../../contexts/AuthContext';
import { mockUser } from '../utils/testUtils';

// Mock the API module
const mockLogin = jest.fn();
const mockRegister = jest.fn();
const mockLogout = jest.fn();

jest.mock('../../services/api', () => ({
  authApi: {
    login: (...args: any[]) => mockLogin(...args),
    register: (...args: any[]) => mockRegister(...args),
    logout: (...args: any[]) => mockLogout(...args),
  },
}));

describe('AuthContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <AuthProvider>{children}</AuthProvider>
  );

  describe('Initial State', () => {
    it('should start with unauthenticated state', () => {
      const { result } = renderHook(() => useAuth(), { wrapper });

      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.user).toBeNull();
      expect(result.current.token).toBeNull();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should restore auth from localStorage on mount', () => {
      const authData = {
        user: mockUser,
        token: 'test-token',
      };
      localStorage.setItem('auth', JSON.stringify(authData));

      const { result } = renderHook(() => useAuth(), { wrapper });

      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.user).toEqual(mockUser);
      expect(result.current.token).toBe('test-token');
    });
  });

  describe('login', () => {
    it('should successfully login and store auth data', async () => {
      mockLogin.mockResolvedValue({
        user: mockUser,
        token: 'test-token',
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await result.current.login('testuser', 'password');
      });

      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.user).toEqual(mockUser);
      expect(result.current.token).toBe('test-token');
      expect(result.current.error).toBeNull();

      // Check localStorage
      const stored = JSON.parse(localStorage.getItem('auth') || '{}');
      expect(stored.user).toEqual(mockUser);
      expect(stored.token).toBe('test-token');
    });

    it('should handle login error', async () => {
      const errorMessage = 'Invalid credentials';
      mockLogin.mockRejectedValue(new Error(errorMessage));

      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await result.current.login('testuser', 'wrongpassword');
      });

      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.user).toBeNull();
      expect(result.current.error).toBe(errorMessage);
    });

    it('should set loading state during login', async () => {
      let resolveLogin: any;
      mockLogin.mockReturnValue(
        new Promise(resolve => {
          resolveLogin = resolve;
        })
      );

      const { result } = renderHook(() => useAuth(), { wrapper });

      act(() => {
        result.current.login('testuser', 'password');
      });

      expect(result.current.isLoading).toBe(true);

      await act(async () => {
        resolveLogin({ user: mockUser, token: 'test-token' });
        await waitFor(() => expect(result.current.isLoading).toBe(false));
      });
    });
  });

  describe('register', () => {
    it('should successfully register and store auth data', async () => {
      const registerData = {
        username: 'newuser',
        email: 'new@example.com',
        password: 'password123',
        display_name: 'New User',
      };

      mockRegister.mockResolvedValue({
        user: { ...mockUser, ...registerData },
        token: 'new-token',
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await result.current.register(registerData);
      });

      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.user).toMatchObject(registerData);
      expect(result.current.token).toBe('new-token');
    });

    it('should handle registration error', async () => {
      const errorMessage = 'Username already exists';
      mockRegister.mockRejectedValue(new Error(errorMessage));

      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await result.current.register({
          username: 'existinguser',
          email: 'test@example.com',
          password: 'password',
        });
      });

      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.error).toBe(errorMessage);
    });
  });

  describe('logout', () => {
    it('should clear auth state and localStorage', async () => {
      // Set up authenticated state
      localStorage.setItem('auth', JSON.stringify({
        user: mockUser,
        token: 'test-token',
      }));

      mockLogout.mockResolvedValue(undefined);

      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await result.current.logout();
      });

      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.user).toBeNull();
      expect(result.current.token).toBeNull();
      expect(localStorage.getItem('auth')).toBeNull();
    });

    it('should clear state even if API call fails', async () => {
      localStorage.setItem('auth', JSON.stringify({
        user: mockUser,
        token: 'test-token',
      }));

      mockLogout.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await result.current.logout();
      });

      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.user).toBeNull();
      expect(localStorage.getItem('auth')).toBeNull();
    });
  });

  describe('updateUser', () => {
    it('should update user data in state and localStorage', () => {
      localStorage.setItem('auth', JSON.stringify({
        user: mockUser,
        token: 'test-token',
      }));

      const { result } = renderHook(() => useAuth(), { wrapper });

      const updatedUser = { ...mockUser, display_name: 'Updated Name' };

      act(() => {
        result.current.updateUser(updatedUser);
      });

      expect(result.current.user).toEqual(updatedUser);

      const stored = JSON.parse(localStorage.getItem('auth') || '{}');
      expect(stored.user).toEqual(updatedUser);
    });
  });

  describe('clearError', () => {
    it('should clear error state', async () => {
      mockLogin.mockRejectedValue(new Error('Test error'));

      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await result.current.login('test', 'wrong');
      });

      expect(result.current.error).toBe('Test error');

      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe('Edge Cases', () => {
    it('should handle corrupted localStorage data', () => {
      localStorage.setItem('auth', 'invalid-json');

      const { result } = renderHook(() => useAuth(), { wrapper });

      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.user).toBeNull();
    });

    it('should handle missing user or token in localStorage', () => {
      localStorage.setItem('auth', JSON.stringify({ user: mockUser }));

      const { result } = renderHook(() => useAuth(), { wrapper });

      expect(result.current.isAuthenticated).toBe(false);
    });

    it('should not throw when calling useAuth outside provider', () => {
      expect(() => {
        renderHook(() => useAuth());
      }).toThrow('useAuth must be used within an AuthProvider');
    });
  });
});
