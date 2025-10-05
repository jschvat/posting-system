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
import { getTheme } from '../utils/themeHelpers';

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
  const { state } = useAuth();
  const user = state.user;
  const isAuthenticated = state.isAuthenticated;

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
  gap: ${(props) => getTheme(props).spacing.xs};
  padding: ${({ $size, ...props }) =>
    $size === 'small' ? getTheme(props).spacing.xs : `${getTheme(props).spacing.xs} ${getTheme(props).spacing.sm}`};
  background: ${({ $marked, ...props }) =>
    $marked ? getTheme(props).colors.primary : 'transparent'};
  border: 1px solid ${({ $marked, ...props }) =>
    $marked ? getTheme(props).colors.primary : getTheme(props).colors.border};
  border-radius: ${(props) => getTheme(props).borderRadius.full};
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: ${({ $size }) => ($size === 'small' ? '12px' : '14px')};

  &:hover:not(:disabled) {
    background: ${({ $marked, ...props }) =>
      $marked
        ? getTheme(props).colors.primaryDark
        : getTheme(props).colors.hover};
    border-color: ${({ $marked, ...props }) =>
      $marked ? getTheme(props).colors.primaryDark : getTheme(props).colors.primary};
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
  color: ${({ $marked, ...props }) => ($marked ? 'white' : getTheme(props).colors.textLight)};
  transition: color 0.2s ease;

  ${Button}:hover:not(:disabled) & {
    color: ${({ $marked, ...props }) => ($marked ? 'white' : getTheme(props).colors.primary)};
  }
`;

const Count = styled.span<{ $size: 'small' | 'medium' }>`
  color: ${(props) => getTheme(props).colors.textLight};
  font-weight: ${(props) => getTheme(props).fontWeight.medium};
  font-size: ${({ $size }) => ($size === 'small' ? '11px' : '12px')};

  ${Button}:hover:not(:disabled) & {
    color: ${(props) => getTheme(props).colors.text.primary};
  }
`;

export default HelpfulButton;
