/**
 * ShareButton Component
 * Button to share/unshare posts with optional comment
 */

import React, { useState } from 'react';
import styled from 'styled-components';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { sharesApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

interface ShareButtonProps {
  postId: number;
  initialShareCount?: number;
  onShareChange?: (isShared: boolean, shareCount: number) => void;
}

const ShareContainer = styled.div`
  position: relative;
`;

const ShareBtn = styled.button<{ $isShared: boolean }>`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: transparent;
  border: none;
  color: ${({ theme, $isShared }) => $isShared ? theme.colors.success : theme.colors.text.secondary};
  font-size: 0.9rem;
  cursor: pointer;
  border-radius: ${({ theme }) => theme.borderRadius.md};
  transition: all 0.2s ease;

  &:hover:not(:disabled) {
    background: ${({ theme }) => theme.colors.success}15;
    color: ${({ theme }) => theme.colors.success};
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  svg {
    width: 18px;
    height: 18px;
  }
`;

const ShareCount = styled.span`
  font-weight: 500;
  min-width: 20px;
`;

const ShareModal = styled.div`
  position: absolute;
  top: 100%;
  left: 0;
  margin-top: 8px;
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  box-shadow: ${({ theme }) => theme.shadows.lg};
  padding: ${({ theme }) => theme.spacing.md};
  min-width: 300px;
  z-index: 1000;
`;

const ModalTitle = styled.h3`
  margin: 0 0 ${({ theme }) => theme.spacing.md};
  font-size: 1.1rem;
  color: ${({ theme }) => theme.colors.text.primary};
`;

const ShareTextarea = styled.textarea`
  width: 100%;
  min-height: 80px;
  padding: ${({ theme }) => theme.spacing.sm};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  font-family: inherit;
  font-size: 0.9rem;
  resize: vertical;
  margin-bottom: ${({ theme }) => theme.spacing.sm};

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.primary};
  }
`;

const ModalActions = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing.sm};
  justify-content: flex-end;
`;

const ModalButton = styled.button<{ $variant?: 'primary' | 'secondary' }>`
  padding: 8px 16px;
  border-radius: ${({ theme }) => theme.borderRadius.md};
  border: none;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;

  background: ${({ theme, $variant }) =>
    $variant === 'primary' ? theme.colors.success : 'transparent'
  };
  color: ${({ theme, $variant }) =>
    $variant === 'primary' ? 'white' : theme.colors.text.secondary
  };

  &:hover:not(:disabled) {
    opacity: 0.9;
    transform: translateY(-1px);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const Overlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 999;
`;

const ShareButton: React.FC<ShareButtonProps> = ({
  postId,
  initialShareCount = 0,
  onShareChange
}) => {
  const { state } = useAuth();
  const user = state.user;
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [shareComment, setShareComment] = useState('');
  const [shareCount, setShareCount] = useState(initialShareCount);

  // Check if currently shared
  const { data: shareStatus, isLoading: isCheckingShare } = useQuery({
    queryKey: ['shareStatus', postId],
    queryFn: () => sharesApi.checkShared(postId),
    enabled: !!user,
  });

  const isShared = shareStatus?.data?.has_shared || false;

  // Share mutation
  const shareMutation = useMutation({
    mutationFn: (data: { comment?: string }) => sharesApi.sharePost(postId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shareStatus', postId] });
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      const newCount = shareCount + 1;
      setShareCount(newCount);
      onShareChange?.(true, newCount);
      setShowModal(false);
      setShareComment('');
    },
  });

  // Unshare mutation
  const unshareMutation = useMutation({
    mutationFn: () => sharesApi.unsharePost(postId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shareStatus', postId] });
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      const newCount = Math.max(0, shareCount - 1);
      setShareCount(newCount);
      onShareChange?.(false, newCount);
    },
  });

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!user) {
      alert('Please login to share posts');
      return;
    }

    if (isShared) {
      // Unshare immediately
      unshareMutation.mutate();
    } else {
      // Show modal to optionally add comment
      setShowModal(true);
    }
  };

  const handleShare = () => {
    shareMutation.mutate({
      comment: shareComment.trim() || undefined
    });
  };

  const handleCancel = () => {
    setShowModal(false);
    setShareComment('');
  };

  const isLoading = isCheckingShare || shareMutation.isPending || unshareMutation.isPending;

  return (
    <ShareContainer>
      <ShareBtn
        onClick={handleClick}
        disabled={isLoading}
        $isShared={isShared}
        title={isShared ? 'Unshare' : 'Share'}
      >
        <svg fill="currentColor" viewBox="0 0 24 24">
          <path d="M23.77 15.67a.749.749 0 0 0-1.06 0l-2.22 2.22V7.65a3.755 3.755 0 0 0-3.75-3.75h-5.85a.75.75 0 0 0 0 1.5h5.85c1.24 0 2.25 1.01 2.25 2.25v10.24l-2.22-2.22a.749.749 0 1 0-1.06 1.06l3.5 3.5a.747.747 0 0 0 1.06 0l3.5-3.5a.749.749 0 0 0 0-1.06Zm-10.66 3.28H7.26a2.25 2.25 0 0 1-2.25-2.25V6.46l2.22 2.22a.75.75 0 0 0 1.06-1.06l-3.5-3.5a.747.747 0 0 0-1.06 0l-3.5 3.5a.749.749 0 1 0 1.06 1.06l2.22-2.22V16.7a3.755 3.755 0 0 0 3.75 3.75h5.85a.75.75 0 0 0 0-1.5Z"/>
        </svg>
        <ShareCount>{shareCount > 0 ? shareCount : ''}</ShareCount>
      </ShareBtn>

      {showModal && (
        <>
          <Overlay onClick={handleCancel} />
          <ShareModal>
            <ModalTitle>Share this post</ModalTitle>
            <ShareTextarea
              placeholder="Add a comment (optional)..."
              value={shareComment}
              onChange={(e) => setShareComment(e.target.value)}
              maxLength={500}
            />
            <ModalActions>
              <ModalButton onClick={handleCancel}>
                Cancel
              </ModalButton>
              <ModalButton
                $variant="primary"
                onClick={handleShare}
                disabled={shareMutation.isPending}
              >
                {shareMutation.isPending ? 'Sharing...' : 'Share'}
              </ModalButton>
            </ModalActions>
          </ShareModal>
        </>
      )}
    </ShareContainer>
  );
};

export default ShareButton;
