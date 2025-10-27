import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import HomePage from '../../pages/HomePage';
import { renderWithProviders, mockPost, mockUser } from '../utils/testUtils';

// Mock the API module
const mockGetPosts = jest.fn();
const mockCreatePost = jest.fn();
const mockDeletePost = jest.fn();

jest.mock('../../services/api', () => ({
  postsApi: {
    getPosts: (...args: any[]) => mockGetPosts(...args),
    createPost: (...args: any[]) => mockCreatePost(...args),
    deletePost: (...args: any[]) => mockDeletePost(...args),
  },
}));

describe('HomePage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.setItem('auth', JSON.stringify({
      user: mockUser,
      token: 'test-token',
    }));
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('Loading State', () => {
    it('should show loading spinner while fetching posts', () => {
      mockGetPosts.mockReturnValue(new Promise(() => {}));

      renderWithProviders(<HomePage />);

      expect(screen.getByRole('status', { hidden: true })).toBeInTheDocument();
    });
  });

  describe('Posts Display', () => {
    it('should display posts when loaded successfully', async () => {
      const posts = [
        { ...mockPost, post_id: 1, title: 'First Post', content: 'First content' },
        { ...mockPost, post_id: 2, title: 'Second Post', content: 'Second content' },
      ];

      mockGetPosts.mockResolvedValue({
        posts,
        pagination: { page: 1, limit: 20, totalPages: 1, totalCount: 2 },
      });

      renderWithProviders(<HomePage />);

      await waitFor(() => {
        expect(screen.getByText('First Post')).toBeInTheDocument();
        expect(screen.getByText('Second Post')).toBeInTheDocument();
      });
    });

    it('should display post content', async () => {
      const posts = [
        { ...mockPost, post_id: 1, title: 'Test Post', content: 'Test content here' },
      ];

      mockGetPosts.mockResolvedValue({
        posts,
        pagination: { page: 1, limit: 20, totalPages: 1, totalCount: 1 },
      });

      renderWithProviders(<HomePage />);

      await waitFor(() => {
        expect(screen.getByText('Test content here')).toBeInTheDocument();
      });
    });

    it('should display author information', async () => {
      const posts = [
        {
          ...mockPost,
          post_id: 1,
          author: { ...mockUser, username: 'authorname', display_name: 'Author Name' },
        },
      ];

      mockGetPosts.mockResolvedValue({
        posts,
        pagination: { page: 1, limit: 20, totalPages: 1, totalCount: 1 },
      });

      renderWithProviders(<HomePage />);

      await waitFor(() => {
        expect(screen.getByText('Author Name')).toBeInTheDocument();
      });
    });
  });

  describe('Empty State', () => {
    it('should display empty state when no posts', async () => {
      mockGetPosts.mockResolvedValue({
        posts: [],
        pagination: { page: 1, limit: 20, totalPages: 0, totalCount: 0 },
      });

      renderWithProviders(<HomePage />);

      await waitFor(() => {
        expect(screen.getByText(/no posts/i)).toBeInTheDocument();
      });
    });

    it('should display create post prompt in empty state', async () => {
      mockGetPosts.mockResolvedValue({
        posts: [],
        pagination: { page: 1, limit: 20, totalPages: 0, totalCount: 0 },
      });

      renderWithProviders(<HomePage />);

      await waitFor(() => {
        expect(screen.getByText(/create.*first post/i)).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('should display error message on fetch failure', async () => {
      mockGetPosts.mockRejectedValue(
        new Error('Failed to fetch posts')
      );

      renderWithProviders(<HomePage />);

      await waitFor(() => {
        expect(screen.getByText(/failed to fetch posts/i)).toBeInTheDocument();
      });
    });

    it('should display generic error for network issues', async () => {
      mockGetPosts.mockRejectedValue(
        new Error('Network Error')
      );

      renderWithProviders(<HomePage />);

      await waitFor(() => {
        expect(screen.getByText(/error/i)).toBeInTheDocument();
      });
    });
  });

  describe('Pagination', () => {
    it('should display load more button when more posts available', async () => {
      const posts = [
        { ...mockPost, post_id: 1, title: 'Post 1' },
      ];

      mockGetPosts.mockResolvedValue({
        posts,
        pagination: { page: 1, limit: 20, totalPages: 3, totalCount: 50 },
      });

      renderWithProviders(<HomePage />);

      await waitFor(() => {
        expect(screen.getByText(/load more/i)).toBeInTheDocument();
      });
    });

    it('should not display load more button on last page', async () => {
      const posts = [
        { ...mockPost, post_id: 1, title: 'Post 1' },
      ];

      mockGetPosts.mockResolvedValue({
        posts,
        pagination: { page: 3, limit: 20, totalPages: 3, totalCount: 50 },
      });

      renderWithProviders(<HomePage />);

      await waitFor(() => {
        expect(screen.queryByText(/load more/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('Post Interactions', () => {
    it('should display reaction counts', async () => {
      const posts = [
        { ...mockPost, post_id: 1, reaction_count: 10 },
      ];

      mockGetPosts.mockResolvedValue({
        posts,
        pagination: { page: 1, limit: 20, totalPages: 1, totalCount: 1 },
      });

      renderWithProviders(<HomePage />);

      await waitFor(() => {
        expect(screen.getByText('10')).toBeInTheDocument();
      });
    });

    it('should display comment counts', async () => {
      const posts = [
        { ...mockPost, post_id: 1, comment_count: 5 },
      ];

      mockGetPosts.mockResolvedValue({
        posts,
        pagination: { page: 1, limit: 20, totalPages: 1, totalCount: 1 },
      });

      renderWithProviders(<HomePage />);

      await waitFor(() => {
        expect(screen.getByText(/5.*comment/i)).toBeInTheDocument();
      });
    });

    it('should display share counts', async () => {
      const posts = [
        { ...mockPost, post_id: 1, share_count: 3 },
      ];

      mockGetPosts.mockResolvedValue({
        posts,
        pagination: { page: 1, limit: 20, totalPages: 1, totalCount: 1 },
      });

      renderWithProviders(<HomePage />);

      await waitFor(() => {
        expect(screen.getByText(/3.*share/i)).toBeInTheDocument();
      });
    });
  });

  describe('Post Media', () => {
    it('should display posts with images', async () => {
      const posts = [
        {
          ...mockPost,
          post_id: 1,
          media: [
            { media_id: 1, media_url: 'https://example.com/image1.jpg', media_type: 'image' },
          ],
        },
      ];

      mockGetPosts.mockResolvedValue({
        posts,
        pagination: { page: 1, limit: 20, totalPages: 1, totalCount: 1 },
      });

      renderWithProviders(<HomePage />);

      await waitFor(() => {
        const image = screen.getByAltText(/post media/i);
        expect(image).toBeInTheDocument();
        expect(image).toHaveAttribute('src', 'https://example.com/image1.jpg');
      });
    });

    it('should display multiple images in post', async () => {
      const posts = [
        {
          ...mockPost,
          post_id: 1,
          media: [
            { media_id: 1, media_url: 'https://example.com/image1.jpg', media_type: 'image' },
            { media_id: 2, media_url: 'https://example.com/image2.jpg', media_type: 'image' },
          ],
        },
      ];

      mockGetPosts.mockResolvedValue({
        posts,
        pagination: { page: 1, limit: 20, totalPages: 1, totalCount: 1 },
      });

      renderWithProviders(<HomePage />);

      await waitFor(() => {
        const images = screen.getAllByAltText(/post media/i);
        expect(images).toHaveLength(2);
      });
    });
  });

  describe('Post Privacy', () => {
    it('should display public posts', async () => {
      const posts = [
        { ...mockPost, post_id: 1, privacy_level: 'public' as const, title: 'Public Post' },
      ];

      mockGetPosts.mockResolvedValue({
        posts,
        pagination: { page: 1, limit: 20, totalPages: 1, totalCount: 1 },
      });

      renderWithProviders(<HomePage />);

      await waitFor(() => {
        expect(screen.getByText('Public Post')).toBeInTheDocument();
      });
    });

    it('should display privacy level indicator for private posts', async () => {
      const posts = [
        { ...mockPost, post_id: 1, privacy_level: 'private' as const },
      ];

      mockGetPosts.mockResolvedValue({
        posts,
        pagination: { page: 1, limit: 20, totalPages: 1, totalCount: 1 },
      });

      renderWithProviders(<HomePage />);

      await waitFor(() => {
        expect(screen.getByText(/private/i)).toBeInTheDocument();
      });
    });
  });

  describe('Timestamps', () => {
    it('should display post creation time', async () => {
      const posts = [
        { ...mockPost, post_id: 1, created_at: '2024-01-01T12:00:00Z' },
      ];

      mockGetPosts.mockResolvedValue({
        posts,
        pagination: { page: 1, limit: 20, totalPages: 1, totalCount: 1 },
      });

      renderWithProviders(<HomePage />);

      await waitFor(() => {
        expect(screen.getByText(/ago|at/i)).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have accessible post navigation', async () => {
      const posts = [
        { ...mockPost, post_id: 1, title: 'Accessible Post' },
      ];

      mockGetPosts.mockResolvedValue({
        posts,
        pagination: { page: 1, limit: 20, totalPages: 1, totalCount: 1 },
      });

      renderWithProviders(<HomePage />);

      await waitFor(() => {
        expect(screen.getByText('Accessible Post')).toBeInTheDocument();
      });
    });
  });
});
