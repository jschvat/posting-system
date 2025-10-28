/**
 * OnlineIndicator Component
 * Displays a visual indicator showing whether a user is currently online
 */

import React from 'react';
import styled from 'styled-components';

interface OnlineIndicatorProps {
  isOnline: boolean;
  size?: 'small' | 'medium' | 'large';
  position?: 'bottom-right' | 'top-right' | 'bottom-left' | 'top-left';
  showOffline?: boolean;
}

interface IndicatorDotProps {
  $isOnline: boolean;
  $size: 'small' | 'medium' | 'large';
  $position: 'bottom-right' | 'top-right' | 'bottom-left' | 'top-left';
}

const getSizePixels = (size: 'small' | 'medium' | 'large'): number => {
  switch (size) {
    case 'small':
      return 8;
    case 'medium':
      return 12;
    case 'large':
      return 16;
    default:
      return 12;
  }
};

const getPositionStyles = (position: 'bottom-right' | 'top-right' | 'bottom-left' | 'top-left') => {
  switch (position) {
    case 'bottom-right':
      return `
        bottom: 0;
        right: 0;
      `;
    case 'top-right':
      return `
        top: 0;
        right: 0;
      `;
    case 'bottom-left':
      return `
        bottom: 0;
        left: 0;
      `;
    case 'top-left':
      return `
        top: 0;
        left: 0;
      `;
    default:
      return `
        bottom: 0;
        right: 0;
      `;
  }
};

const IndicatorDot = styled.div<IndicatorDotProps>`
  position: absolute;
  ${props => getPositionStyles(props.$position)}
  width: ${props => getSizePixels(props.$size)}px;
  height: ${props => getSizePixels(props.$size)}px;
  border-radius: 50%;
  background-color: ${props => props.$isOnline ? '#44b700' : '#9e9e9e'};
  border: 2px solid white;
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.1);
  z-index: 1;

  /* Pulse animation for online status */
  ${props => props.$isOnline && `
    animation: pulse 2s ease-in-out infinite;

    @keyframes pulse {
      0%, 100% {
        opacity: 1;
      }
      50% {
        opacity: 0.7;
      }
    }
  `}
`;

/**
 * OnlineIndicator - Shows a colored dot indicating online/offline status
 *
 * @param isOnline - Whether the user is currently online
 * @param size - Size of the indicator (small, medium, large)
 * @param position - Position relative to parent element
 * @param showOffline - Whether to show the indicator when user is offline (default: false)
 */
export const OnlineIndicator: React.FC<OnlineIndicatorProps> = ({
  isOnline,
  size = 'medium',
  position = 'bottom-right',
  showOffline = false
}) => {
  // Don't render anything if offline and showOffline is false
  if (!isOnline && !showOffline) {
    return null;
  }

  return (
    <IndicatorDot
      $isOnline={isOnline}
      $size={size}
      $position={position}
      title={isOnline ? 'Online' : 'Offline'}
    />
  );
};
