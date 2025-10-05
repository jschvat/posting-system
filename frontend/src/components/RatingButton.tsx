/**
 * RatingButton Component
 * Button to initiate rating a user
 */

import React, { useState } from 'react';
import styled from 'styled-components';
import { getTheme } from '../utils/themeHelpers';
import { FaStar } from 'react-icons/fa';
import RatingModal from './RatingModal';
import { useAuth } from '../contexts/AuthContext';

interface RatingButtonProps {
  userId: number;
  username: string;
  onRatingSubmitted?: () => void;
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'small' | 'medium';
}

const RatingButton: React.FC<RatingButtonProps> = ({
  userId,
  username,
  onRatingSubmitted,
  variant = 'outline',
  size = 'medium',
}) => {
  const [showModal, setShowModal] = useState(false);
  const { state } = useAuth();
  const user = state.user;

  // Don't show button for own profile
  if (user?.id === userId) {
    return null;
  }

  const handleClick = () => {
    setShowModal(true);
  };

  const handleClose = () => {
    setShowModal(false);
  };

  const handleSuccess = () => {
    setShowModal(false);
    if (onRatingSubmitted) {
      onRatingSubmitted();
    }
  };

  return (
    <>
      <Button onClick={handleClick} $variant={variant} $size={size}>
        <FaStar />
        <span>Rate User</span>
      </Button>

      {showModal && (
        <RatingModal
          userId={userId}
          username={username}
          onClose={handleClose}
          onSuccess={handleSuccess}
        />
      )}
    </>
  );
};

const Button = styled.button<{ $variant: 'primary' | 'secondary' | 'outline'; $size: 'small' | 'medium' }>`
  display: flex;
  align-items: center;
  gap: ${(props) => getTheme(props).spacing.sm};
  padding: ${({ $size, ...props }) =>
    $size === 'small' ? `${getTheme(props).spacing.xs} ${getTheme(props).spacing.sm}` : `${getTheme(props).spacing.sm} ${getTheme(props).spacing.md}`};
  font-size: ${({ $size }) => $size === 'small' ? '13px' : '14px'};
  font-weight: ${(props) => getTheme(props).fontWeight.medium};
  border-radius: ${(props) => getTheme(props).borderRadius.md};
  cursor: pointer;
  transition: all 0.2s ease;
  border: 1px solid;

  ${({ $variant, ...props }) => {
    const theme = getTheme(props);
    switch ($variant) {
      case 'primary':
        return `
          background: ${theme.colors.primary};
          color: white;
          border-color: ${theme.colors.primary};

          &:hover {
            background: ${theme.colors.primaryDark};
          }
        `;
      case 'secondary':
        return `
          background: ${theme.colors.surface};
          color: ${theme.colors.text.primary};
          border-color: ${theme.colors.border};

          &:hover {
            background: ${theme.colors.hover};
          }
        `;
      case 'outline':
      default:
        return `
          background: transparent;
          color: ${theme.colors.primary};
          border-color: ${theme.colors.primary};

          &:hover {
            background: ${theme.colors.primaryLight};
          }
        `;
    }
  }}

  &:active {
    transform: scale(0.98);
  }

  svg {
    font-size: ${({ $size }) => $size === 'small' ? '12px' : '14px'};
  }
`;

export default RatingButton;
