import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CommentForm from '../../components/CommentForm';
import { renderWithProviders } from '../utils/testUtils';

// Mock the API module
const mockCreateComment = jest.fn();
const mockGetPostComments = jest.fn();

jest.mock('../../services/api', () => ({
  commentsApi: {
    createComment: (...args: any[]) => mockCreateComment(...args),
    getPostComments: (...args: any[]) => mockGetPostComments(...args),
  },
}));

describe('CommentForm', () => {
  const mockOnSuccess = jest.fn();
  const mockOnCancel = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.setItem('auth', JSON.stringify({
      user: { user_id: 1, username: 'testuser' },
      token: 'test-token',
    }));
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('Rendering', () => {
    it('should render comment form', () => {
      renderWithProviders(<CommentForm postId={1} />);
      expect(screen.getByPlaceholderText(/add a comment/i)).toBeInTheDocument();
    });

    it('should render with custom placeholder', () => {
      renderWithProviders(
        <CommentForm postId={1} placeholder="Write your reply..." />
      );
      expect(screen.getByPlaceholderText('Write your reply...')).toBeInTheDocument();
    });

    it('should render submit button', () => {
      renderWithProviders(<CommentForm postId={1} />);
      expect(screen.getByRole('button', { name: /post/i })).toBeInTheDocument();
    });

    it('should render cancel button when onCancel is provided', () => {
      renderWithProviders(<CommentForm postId={1} onCancel={mockOnCancel} />);
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    });

    it('should not render cancel button when onCancel is not provided', () => {
      renderWithProviders(<CommentForm postId={1} />);
      expect(screen.queryByRole('button', { name: /cancel/i })).not.toBeInTheDocument();
    });
  });

  describe('Form Input', () => {
    it('should allow typing in textarea', async () => {
      renderWithProviders(<CommentForm postId={1} />);
      const user = userEvent.setup();
      const textarea = screen.getByPlaceholderText(/add a comment/i);

      await user.type(textarea, 'This is a test comment');

      expect(textarea).toHaveValue('This is a test comment');
    });

    it('should handle multiline input', async () => {
      renderWithProviders(<CommentForm postId={1} />);
      const user = userEvent.setup();
      const textarea = screen.getByPlaceholderText(/add a comment/i);

      await user.type(textarea, 'Line 1{Enter}Line 2{Enter}Line 3');

      expect(textarea).toHaveValue('Line 1\nLine 2\nLine 3');
    });
  });

  describe('Form Submission', () => {
    it('should submit comment successfully', async () => {
      mockCreateComment.mockResolvedValue({
        comment_id: 1,
        post_id: 1,
        content: 'Test comment',
        user_id: 1,
        created_at: new Date().toISOString(),
      });

      renderWithProviders(
        <CommentForm postId={1} onSuccess={mockOnSuccess} />
      );
      const user = userEvent.setup();

      const textarea = screen.getByPlaceholderText(/add a comment/i);
      await user.type(textarea, 'Test comment');

      const submitButton = screen.getByRole('button', { name: /post/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockCreateComment).toHaveBeenCalledWith({
          post_id: 1,
          content: 'Test comment',
          parent_comment_id: null,
        });
      });

      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalled();
      });

      // Form should be cleared after successful submission
      expect(textarea).toHaveValue('');
    });

    it('should submit reply to parent comment', async () => {
      mockCreateComment.mockResolvedValue({
        comment_id: 2,
        post_id: 1,
        parent_comment_id: 5,
        content: 'Test reply',
        user_id: 1,
        created_at: new Date().toISOString(),
      });

      renderWithProviders(
        <CommentForm postId={1} parentId={5} onSuccess={mockOnSuccess} />
      );
      const user = userEvent.setup();

      const textarea = screen.getByPlaceholderText(/add a comment/i);
      await user.type(textarea, 'Test reply');

      const submitButton = screen.getByRole('button', { name: /post/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockCreateComment).toHaveBeenCalledWith({
          post_id: 1,
          content: 'Test reply',
          parent_comment_id: 5,
        });
      });
    });

    it('should trim whitespace from comment', async () => {
      mockCreateComment.mockResolvedValue({
        comment_id: 1,
        post_id: 1,
        content: 'Trimmed comment',
        user_id: 1,
        created_at: new Date().toISOString(),
      });

      renderWithProviders(<CommentForm postId={1} />);
      const user = userEvent.setup();

      const textarea = screen.getByPlaceholderText(/add a comment/i);
      await user.type(textarea, '   Trimmed comment   ');

      const submitButton = screen.getByRole('button', { name: /post/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockCreateComment).toHaveBeenCalledWith(
          expect.objectContaining({
            content: 'Trimmed comment',
          })
        );
      });
    });
  });

  describe('Validation', () => {
    it('should not submit empty comment', async () => {
      renderWithProviders(<CommentForm postId={1} />);
      const user = userEvent.setup();

      const submitButton = screen.getByRole('button', { name: /post/i });
      await user.click(submitButton);

      expect(mockCreateComment).not.toHaveBeenCalled();
    });

    it('should not submit comment with only whitespace', async () => {
      renderWithProviders(<CommentForm postId={1} />);
      const user = userEvent.setup();

      const textarea = screen.getByPlaceholderText(/add a comment/i);
      await user.type(textarea, '    ');

      const submitButton = screen.getByRole('button', { name: /post/i });
      await user.click(submitButton);

      expect(mockCreateComment).not.toHaveBeenCalled();
    });

    it('should not submit comment exceeding max length (2000 chars)', async () => {
      renderWithProviders(<CommentForm postId={1} />);
      const user = userEvent.setup();

      const longComment = 'a'.repeat(2001);
      const textarea = screen.getByPlaceholderText(/add a comment/i);
      await user.type(textarea, longComment);

      const submitButton = screen.getByRole('button', { name: /post/i });
      await user.click(submitButton);

      expect(mockCreateComment).not.toHaveBeenCalled();
    });

    it('should accept comment at max length (2000 chars)', async () => {
      mockCreateComment.mockResolvedValue({
        comment_id: 1,
        post_id: 1,
        content: 'a'.repeat(2000),
        user_id: 1,
        created_at: new Date().toISOString(),
      });

      renderWithProviders(<CommentForm postId={1} />);
      const user = userEvent.setup();

      const maxComment = 'a'.repeat(2000);
      const textarea = screen.getByPlaceholderText(/add a comment/i);
      await user.type(textarea, maxComment);

      const submitButton = screen.getByRole('button', { name: /post/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockCreateComment).toHaveBeenCalled();
      });
    });
  });

  describe('Error Handling', () => {
    it('should display error message on submission failure', async () => {
      mockCreateComment.mockRejectedValue(
        new Error('Failed to post comment')
      );

      renderWithProviders(<CommentForm postId={1} />);
      const user = userEvent.setup();

      const textarea = screen.getByPlaceholderText(/add a comment/i);
      await user.type(textarea, 'Test comment');

      const submitButton = screen.getByRole('button', { name: /post/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/failed to post comment/i)).toBeInTheDocument();
      });
    });

    it('should not clear form on submission failure', async () => {
      mockCreateComment.mockRejectedValue(
        new Error('Server error')
      );

      renderWithProviders(<CommentForm postId={1} />);
      const user = userEvent.setup();

      const textarea = screen.getByPlaceholderText(/add a comment/i);
      await user.type(textarea, 'Test comment');

      const submitButton = screen.getByRole('button', { name: /post/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/server error/i)).toBeInTheDocument();
      });

      // Form should retain content
      expect(textarea).toHaveValue('Test comment');
    });
  });

  describe('Loading State', () => {
    it('should disable submit button while submitting', async () => {
      let resolveSubmit: any;
      mockCreateComment.mockReturnValue(
        new Promise(resolve => {
          resolveSubmit = resolve;
        })
      );

      renderWithProviders(<CommentForm postId={1} />);
      const user = userEvent.setup();

      const textarea = screen.getByPlaceholderText(/add a comment/i);
      await user.type(textarea, 'Test comment');

      const submitButton = screen.getByRole('button', { name: /post/i });
      await user.click(submitButton);

      expect(submitButton).toBeDisabled();

      resolveSubmit({
        comment_id: 1,
        post_id: 1,
        content: 'Test comment',
        user_id: 1,
        created_at: new Date().toISOString(),
      });

      await waitFor(() => {
        expect(submitButton).not.toBeDisabled();
      });
    });

    it('should show loading state during submission', async () => {
      let resolveSubmit: any;
      mockCreateComment.mockReturnValue(
        new Promise(resolve => {
          resolveSubmit = resolve;
        })
      );

      renderWithProviders(<CommentForm postId={1} />);
      const user = userEvent.setup();

      const textarea = screen.getByPlaceholderText(/add a comment/i);
      await user.type(textarea, 'Test comment');

      const submitButton = screen.getByRole('button', { name: /post/i });
      await user.click(submitButton);

      expect(submitButton).toHaveTextContent(/posting/i);

      resolveSubmit({
        comment_id: 1,
        post_id: 1,
        content: 'Test comment',
        user_id: 1,
        created_at: new Date().toISOString(),
      });

      await waitFor(() => {
        expect(submitButton).toHaveTextContent(/post/i);
      });
    });
  });

  describe('Cancel Functionality', () => {
    it('should call onCancel when cancel button is clicked', async () => {
      renderWithProviders(<CommentForm postId={1} onCancel={mockOnCancel} />);
      const user = userEvent.setup();

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      expect(mockOnCancel).toHaveBeenCalled();
    });

    it('should not clear form when cancel is clicked', async () => {
      renderWithProviders(<CommentForm postId={1} onCancel={mockOnCancel} />);
      const user = userEvent.setup();

      const textarea = screen.getByPlaceholderText(/add a comment/i);
      await user.type(textarea, 'Test comment');

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      // Parent component should handle clearing
      expect(mockOnCancel).toHaveBeenCalled();
    });
  });

  describe('Authentication', () => {
    it('should not allow submission when not authenticated', async () => {
      localStorage.clear();

      renderWithProviders(<CommentForm postId={1} />);
      const user = userEvent.setup();

      const textarea = screen.getByPlaceholderText(/add a comment/i);
      await user.type(textarea, 'Test comment');

      const submitButton = screen.getByRole('button', { name: /post/i });
      await user.click(submitButton);

      expect(mockCreateComment).not.toHaveBeenCalled();
    });
  });
});
