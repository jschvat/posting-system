/**
 * HelpfulButton Component
 * Button to mark content as helpful
 */

import React from 'react';
import styled from 'styled-components';
import { FaThumbsUp } from 'react-icons/fa';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import reputationApi from '../services/reputationApi';
import { useAuth } from '../contexts/AuthContext';

interface HelpfulButtonProps {
  targetType: 'post' | 'comment' | 'user';
  targetId: number;
  size?: 'small' | 'medium';
}

const HelpfulButton: React.FC<HelpfulButtonProps> = ({
  targetType,
  targetId,
  size = 'medium',
}) => {
  const queryClient = useQueryClient();
  const { user, isAuthenticated } = useAuth();

  // Check if marked as helpful
  const { data: helpfulData } = useQuery({
    queryKey: ['helpful', targetType, targetId],
    queryFn: () => reputationApi.checkHelpful(targetType, targetId),
    enabled: isAuthenticated,
  });

  // Get helpful count for non-authenticated users
  const { data: countData } = useQuery({
    queryKey: ['helpfulCount', targetType, targetId],
    queryFn: () => reputationApi.getHelpfulCount(targetType, targetId),
    enabled: !isAuthenticated,
  });

  const isMarked = helpfulData?.data?.has_marked || false;
  const helpfulCount = isAuthenticated
    ? helpfulData?.data?.helpful_count || 0
    : countData?.data?.helpful_count || 0;

  // Mark helpful mutation
  const markMutation = useMutation({
    mutationFn: () => reputationApi.markHelpful(targetType, targetId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['helpful', targetType, targetId] });
      queryClient.invalidateQueries({ queryKey: ['helpfulCount', targetType, targetId] });
      queryClient.invalidateQueries({ queryKey: ['reputation'] });
    },
  });

  // Unmark helpful mutation
  const unmarkMutation = useMutation({
    mutationFn: () => reputationApi.unmarkHelpful(targetType, targetId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['helpful', targetType, targetId] });
      queryClient.invalidateQueries({ queryKey: ['helpfulCount', targetType, targetId] });
      queryClient.invalidateQueries({ queryKey: ['reputation'] });
    },
  });

  const handleClick = () => {
    if (!isAuthenticated) {
      // Could show a login prompt here
      return;
    }

    if (isMarked) {
      unmarkMutation.mutate();
    } else {
      markMutation.mutate();
    }
  };

  const isPending = markMutation.isPending || unmarkMutation.isPending;

  return (
    <Button
      onClick={handleClick}
      $marked={isMarked}
      $size={size}
      disabled={isPending || !isAuthenticated}
      title={isMarked ? 'Remove helpful mark' : 'Mark as helpful'}
    >
      <Icon $marked={isMarked}>
        <FaThumbsUp />
      </Icon>
      {helpfulCount > 0 && <Count $size={size}>{helpfulCount}</Count>}
    </Button>
  );
};

const Button = styled.button<{ $marked: boolean; $size: 'small' | 'medium' }>`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.xs};
  padding: ${({ $size, theme }) =>
    $size === 'small' ? theme.spacing.xs : `${theme.spacing.xs} ${theme.spacing.sm}`};
  background: ${({ $marked, theme }) =>
    $marked ? theme.colors.primary : 'transparent'};
  border: 1px solid ${({ $marked, theme }) =>
    $marked ? theme.colors.primary : theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.full};
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: ${({ $size }) => ($size === 'small' ? '12px' : '14px')};

  &:hover:not(:disabled) {
    background: ${({ $marked, theme }) =>
      $marked
        ? theme.colors.primaryDark || theme.colors.primary
        : theme.colors.hover};
    border-color: ${({ $marked, theme }) =>
      $marked ? theme.colors.primaryDark || theme.colors.primary : theme.colors.primary};
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  &:active:not(:disabled) {
    transform: scale(0.95);
  }
`;

const Icon = styled.span<{ $marked: boolean }>`
  display: flex;
  align-items: center;
  color: ${({ $marked, theme }) => ($marked ? 'white' : theme.colors.textLight)};
  transition: color 0.2s ease;

  ${Button}:hover:not(:disabled) & {
    color: ${({ $marked, theme }) => ($marked ? 'white' : theme.colors.primary)};
  }
`;

const Count = styled.span<{ $size: 'small' | 'medium' }>`
  color: ${({ theme }) => theme.colors.textLight};
  font-weight: ${({ theme }) => theme.fontWeight.medium};
  font-size: ${({ $size }) => ($size === 'small' ? '11px' : '12px')};

  ${Button}:hover:not(:disabled) & {
    color: ${({ theme }) => theme.colors.text};
  }
`;

export default HelpfulButton;
