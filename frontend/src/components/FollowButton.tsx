/**
 * FollowButton Component
 * Button to follow/unfollow users with loading and error states
 */

import React from 'react';
import styled from 'styled-components';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { followsApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

interface FollowButtonProps {
  userId: number;
  size?: 'small' | 'medium' | 'large';
  variant?: 'primary' | 'secondary';
  onFollowChange?: (isFollowing: boolean) => void;
}

const Button = styled.button<{ $size: string; $variant: string; $isFollowing: boolean }>`
  padding: ${({ $size }) => {
    if ($size === 'small') return '4px 12px';
    if ($size === 'large') return '10px 24px';
    return '6px 16px';
  }};
  font-size: ${({ $size }) => {
    if ($size === 'small') return '0.8rem';
    if ($size === 'large') return '1rem';
    return '0.9rem';
  }};
  font-weight: 600;
  border-radius: ${({ theme }) => theme.borderRadius.md};
  border: 2px solid ${({ theme, $isFollowing, $variant }) =>
    $isFollowing ? theme.colors.border :
    $variant === 'secondary' ? theme.colors.border : theme.colors.primary
  };
  background: ${({ theme, $isFollowing, $variant }) =>
    $isFollowing ? 'transparent' :
    $variant === 'secondary' ? 'transparent' : theme.colors.primary
  };
  color: ${({ theme, $isFollowing, $variant }) =>
    $isFollowing ? theme.colors.text.primary :
    $variant === 'secondary' ? theme.colors.primary : 'white'
  };
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;

  &:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: ${({ theme }) => theme.shadows.sm};
    background: ${({ theme, $isFollowing, $variant }) =>
      $isFollowing ? theme.colors.error + '10' :
      $variant === 'secondary' ? theme.colors.primary + '10' : theme.colors.primary
    };
    border-color: ${({ theme, $isFollowing }) =>
      $isFollowing ? theme.colors.error : theme.colors.primary
    };
    color: ${({ theme, $isFollowing, $variant }) =>
      $isFollowing ? theme.colors.error :
      $variant === 'secondary' ? theme.colors.primary : 'white'
    };
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const FollowButton: React.FC<FollowButtonProps> = ({
  userId,
  size = 'medium',
  variant = 'primary',
  onFollowChange
}) => {
  const { state } = useAuth();
  const user = state.user;
  const queryClient = useQueryClient();

  // Check if currently following
  const { data: followStatus, isLoading: isCheckingFollow } = useQuery({
    queryKey: ['followStatus', userId],
    queryFn: () => followsApi.checkFollowing(userId),
    enabled: !!user && user.id !== userId,
  });

  const isFollowing = followStatus?.data?.is_following || false;

  // Follow mutation
  const followMutation = useMutation({
    mutationFn: () => followsApi.followUser(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['followStatus', userId] });
      queryClient.invalidateQueries({ queryKey: ['followStats', userId] });
      queryClient.invalidateQueries({ queryKey: ['followStats'] });
      onFollowChange?.(true);
    },
  });

  // Unfollow mutation
  const unfollowMutation = useMutation({
    mutationFn: () => followsApi.unfollowUser(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['followStatus', userId] });
      queryClient.invalidateQueries({ queryKey: ['followStats', userId] });
      queryClient.invalidateQueries({ queryKey: ['followStats'] });
      onFollowChange?.(false);
    },
  });

  // Don't show button if viewing own profile
  if (user?.id === userId) {
    return null;
  }

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!user) {
      // Redirect to login or show login modal
      alert('Please login to follow users');
      return;
    }

    if (isFollowing) {
      unfollowMutation.mutate();
    } else {
      followMutation.mutate();
    }
  };

  const isLoading = isCheckingFollow || followMutation.isPending || unfollowMutation.isPending;

  return (
    <Button
      onClick={handleClick}
      disabled={isLoading}
      $size={size}
      $variant={variant}
      $isFollowing={isFollowing}
    >
      {isLoading ? 'Loading...' : isFollowing ? 'Following' : 'Follow'}
    </Button>
  );
};

export default FollowButton;
