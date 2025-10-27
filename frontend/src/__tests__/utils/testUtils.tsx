import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'styled-components';
import { AuthProvider } from '../../contexts/AuthContext';
import { WebSocketProvider } from '../../contexts/WebSocketContext';
import { ToastProvider } from '../../components/Toast';
import { theme } from '../../styles/theme';

// Create a fresh QueryClient for each test
const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      cacheTime: 0,
    },
    mutations: {
      retry: false,
    },
  },
});

interface AllProvidersProps {
  children: React.ReactNode;
  queryClient?: QueryClient;
}

// Wrapper with all providers
export const AllProviders: React.FC<AllProvidersProps> = ({ children, queryClient }) => {
  const testQueryClient = queryClient || createTestQueryClient();

  return (
    <BrowserRouter>
      <QueryClientProvider client={testQueryClient}>
        <ThemeProvider theme={theme}>
          <AuthProvider>
            <WebSocketProvider>
              <ToastProvider>
                {children}
              </ToastProvider>
            </WebSocketProvider>
          </AuthProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </BrowserRouter>
  );
};

// Custom render function with all providers
export const renderWithProviders = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'> & { queryClient?: QueryClient }
) => {
  const { queryClient, ...renderOptions } = options || {};

  return render(ui, {
    wrapper: ({ children }) => (
      <AllProviders queryClient={queryClient}>{children}</AllProviders>
    ),
    ...renderOptions,
  });
};

// Mock user data
export const mockUser = {
  user_id: 1,
  username: 'testuser',
  email: 'test@example.com',
  display_name: 'Test User',
  bio: 'Test bio',
  avatar_url: 'https://example.com/avatar.jpg',
  reputation_score: 500,
  created_at: '2024-01-01T00:00:00Z',
  is_active: true,
};

// Mock post data
export const mockPost = {
  post_id: 1,
  user_id: 1,
  title: 'Test Post',
  content: 'Test content',
  media: [],
  privacy_level: 'public' as const,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  author: mockUser,
  reaction_count: 0,
  comment_count: 0,
  share_count: 0,
  user_reaction: null,
  is_helpful: false,
  helpful_count: 0,
};

// Mock comment data
export const mockComment = {
  comment_id: 1,
  post_id: 1,
  user_id: 1,
  parent_comment_id: null,
  content: 'Test comment',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  author: mockUser,
  reaction_count: 0,
  reply_count: 0,
  user_reaction: null,
};

// Mock group data
export const mockGroup = {
  group_id: 1,
  name: 'Test Group',
  slug: 'test-group',
  description: 'Test description',
  icon_url: null,
  visibility: 'public' as const,
  created_at: '2024-01-01T00:00:00Z',
  member_count: 10,
  post_count: 5,
  creator_id: 1,
};

// Mock message data
export const mockMessage = {
  message_id: 1,
  conversation_id: 1,
  sender_id: 1,
  content: 'Test message',
  message_type: 'text' as const,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  is_edited: false,
  is_deleted: false,
  sender: mockUser,
  read_by: [],
};

// Mock conversation data
export const mockConversation = {
  conversation_id: 1,
  participants: [mockUser],
  last_message: mockMessage,
  unread_count: 0,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

// Helper to wait for async updates
export const waitForAsync = () => new Promise(resolve => setTimeout(resolve, 0));

// Re-export everything from testing library
export * from '@testing-library/react';
export { default as userEvent } from '@testing-library/user-event';
