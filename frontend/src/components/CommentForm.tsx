/**
 * CommentForm Component - form for creating new comments
 */

import React, { useState } from 'react';
import styled from 'styled-components';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { commentsApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const FormContainer = styled.div`
  padding: ${({ theme }) => theme.spacing.md};
  border-top: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.background};
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.sm};
`;

const TextArea = styled.textarea`
  padding: ${({ theme }) => theme.spacing.sm};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  font-size: 0.9rem;
  font-family: inherit;
  resize: vertical;
  min-height: 60px;
  max-height: 120px;
  transition: border-color 0.2s ease;

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.primary};
  }

  &::placeholder {
    color: ${({ theme }) => theme.colors.text.muted};
  }
`;

const ButtonContainer = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: ${({ theme }) => theme.spacing.sm};
`;

const Button = styled.button<{ variant?: 'primary' | 'secondary' }>`
  padding: ${({ theme }) => theme.spacing.sm} ${({ theme }) => theme.spacing.md};
  border: 1px solid ${({ theme, variant }) =>
    variant === 'primary' ? theme.colors.primary : theme.colors.border
  };
  background: ${({ theme, variant }) =>
    variant === 'primary' ? theme.colors.primary : theme.colors.surface
  };
  color: ${({ theme, variant }) =>
    variant === 'primary' ? 'white' : theme.colors.text.primary
  };
  border-radius: ${({ theme }) => theme.borderRadius.md};
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: ${({ theme, variant }) =>
      variant === 'primary' ? theme.colors.primary + 'dd' : theme.colors.background
    };
  }

  &:disabled {
    background: ${({ theme }) => theme.colors.text.muted};
    border-color: ${({ theme }) => theme.colors.text.muted};
    color: white;
    cursor: not-allowed;
  }
`;

const ErrorMessage = styled.div`
  color: ${({ theme }) => theme.colors.error};
  font-size: 0.8rem;
  margin-top: ${({ theme }) => theme.spacing.sm};
`;

interface CommentFormProps {
  postId: number;
  parentId?: number;
  onSuccess?: () => void;
  onCancel?: () => void;
  placeholder?: string;
}

const CommentForm: React.FC<CommentFormProps> = ({
  postId,
  parentId,
  onSuccess,
  onCancel,
  placeholder = "Write a comment..."
}) => {
  const { state } = useAuth();
  const queryClient = useQueryClient();
  const [content, setContent] = useState('');
  const [error, setError] = useState<string | null>(null);

  const createCommentMutation = useMutation({
    mutationFn: (data: { content: string; post_id: number; parent_id?: number }) =>
      commentsApi.createComment(data),
    onSuccess: () => {
      // Clear form
      setContent('');
      setError(null);

      // Invalidate comments cache to refresh
      queryClient.invalidateQueries({ queryKey: ['comments', 'post', postId] });

      // Call success callback
      onSuccess?.();
    },
    onError: (error: any) => {
      setError(error.response?.data?.error?.message || 'Failed to create comment');
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!state.isAuthenticated) {
      setError('You must be logged in to comment');
      return;
    }

    if (!content.trim()) {
      setError('Please enter a comment');
      return;
    }

    if (content.length > 2000) {
      setError('Comment must be 2000 characters or less');
      return;
    }

    createCommentMutation.mutate({
      content: content.trim(),
      post_id: postId,
      parent_id: parentId
    });
  };

  const handleCancel = () => {
    setContent('');
    setError(null);
    onCancel?.();
  };

  if (!state.isAuthenticated) {
    return (
      <FormContainer>
        <div style={{ textAlign: 'center', color: '#65676b', fontSize: '0.9rem' }}>
          Please log in to comment on this post.
        </div>
      </FormContainer>
    );
  }

  return (
    <FormContainer>
      <Form onSubmit={handleSubmit}>
        <TextArea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={placeholder}
          disabled={createCommentMutation.isPending}
        />

        {error && <ErrorMessage>{error}</ErrorMessage>}

        <ButtonContainer>
          {onCancel && (
            <Button type="button" variant="secondary" onClick={handleCancel}>
              Cancel
            </Button>
          )}
          <Button
            type="submit"
            variant="primary"
            disabled={createCommentMutation.isPending || !content.trim()}
          >
            {createCommentMutation.isPending ? 'Posting...' : 'Comment'}
          </Button>
        </ButtonContainer>
      </Form>
    </FormContainer>
  );
};

export default CommentForm;