/**
 * Loading Spinner Component
 */

import React from 'react';
import styled, { keyframes } from 'styled-components';

const spin = keyframes`
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
`;

const SpinnerContainer = styled.div<{ size: 'small' | 'medium' | 'large' }>`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: ${({ theme, size }) =>
    size === 'small' ? theme.spacing.sm :
    size === 'medium' ? theme.spacing.md :
    theme.spacing.xl
  };
`;

const Spinner = styled.div<{ size: 'small' | 'medium' | 'large' }>`
  width: ${({ size }) =>
    size === 'small' ? '20px' :
    size === 'medium' ? '32px' :
    '48px'
  };
  height: ${({ size }) =>
    size === 'small' ? '20px' :
    size === 'medium' ? '32px' :
    '48px'
  };
  border: ${({ size }) =>
    size === 'small' ? '2px' :
    size === 'medium' ? '3px' :
    '4px'
  } solid ${({ theme }) => theme.colors.border};
  border-top: ${({ size }) =>
    size === 'small' ? '2px' :
    size === 'medium' ? '3px' :
    '4px'
  } solid ${({ theme }) => theme.colors.primary};
  border-radius: 50%;
  animation: ${spin} 1s linear infinite;
`;

const LoadingText = styled.p<{ size: 'small' | 'medium' | 'large' }>`
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: ${({ size }) =>
    size === 'small' ? '0.8rem' :
    size === 'medium' ? '0.9rem' :
    '1rem'
  };
  margin-top: ${({ theme }) => theme.spacing.sm};
  text-align: center;
`;

interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large';
  text?: string;
  className?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'medium',
  text,
  className
}) => {
  return (
    <SpinnerContainer size={size} className={className}>
      <div>
        <Spinner size={size} />
        {text && <LoadingText size={size}>{text}</LoadingText>}
      </div>
    </SpinnerContainer>
  );
};

export default LoadingSpinner;