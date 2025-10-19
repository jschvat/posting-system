/**
 * Toast notification component for displaying temporary messages
 */

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import styled, { keyframes } from 'styled-components';

// Toast types
export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType, duration?: number) => void;
  showSuccess: (message: string, duration?: number) => void;
  showError: (message: string, duration?: number) => void;
  showWarning: (message: string, duration?: number) => void;
  showInfo: (message: string, duration?: number) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

// Animations
const slideIn = keyframes`
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
`;

const slideOut = keyframes`
  from {
    transform: translateX(0);
    opacity: 1;
  }
  to {
    transform: translateX(100%);
    opacity: 0;
  }
`;

// Styled components
const ToastContainer = styled.div`
  position: fixed;
  top: 80px;
  right: 20px;
  z-index: 10000;
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.sm};
  max-width: 400px;

  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    left: 20px;
    right: 20px;
    max-width: none;
  }
`;

const ToastItem = styled.div<{ $type: ToastType; $isExiting?: boolean }>`
  background: ${({ theme, $type }) => {
    switch ($type) {
      case 'success': return theme.colors.success || '#10b981';
      case 'error': return theme.colors.error;
      case 'warning': return '#f59e0b';
      case 'info': return theme.colors.primary;
      default: return theme.colors.primary;
    }
  }};
  color: white;
  padding: ${({ theme }) => theme.spacing.md} ${({ theme }) => theme.spacing.lg};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  box-shadow: ${({ theme }) => theme.shadows.lg};
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.sm};
  animation: ${({ $isExiting }) => $isExiting ? slideOut : slideIn} 0.3s ease-in-out;
  cursor: pointer;
  transition: transform 0.2s ease;

  &:hover {
    transform: translateX(-4px);
  }
`;

const ToastIcon = styled.span`
  font-size: 1.25rem;
  flex-shrink: 0;
`;

const ToastMessage = styled.div`
  flex: 1;
  font-size: 0.95rem;
  line-height: 1.4;
  word-break: break-word;
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  color: white;
  font-size: 1.5rem;
  cursor: pointer;
  padding: 0;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  flex-shrink: 0;
  transition: background 0.2s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.2);
  }
`;

// Toast icon mapping
const getToastIcon = (type: ToastType): string => {
  switch (type) {
    case 'success': return '✓';
    case 'error': return '✕';
    case 'warning': return '⚠';
    case 'info': return 'ℹ';
    default: return 'ℹ';
  }
};

// Toast provider component
export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [exitingToasts, setExitingToasts] = useState<Set<string>>(new Set());

  const removeToast = useCallback((id: string) => {
    // Mark as exiting for animation
    setExitingToasts(prev => new Set(prev).add(id));

    // Remove after animation
    setTimeout(() => {
      setToasts(prev => prev.filter(toast => toast.id !== id));
      setExitingToasts(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }, 300);
  }, []);

  const showToast = useCallback((message: string, type: ToastType = 'info', duration: number = 5000) => {
    const id = `${Date.now()}-${Math.random()}`;
    const newToast: Toast = { id, message, type, duration };

    setToasts(prev => [...prev, newToast]);

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
  }, [removeToast]);

  const showSuccess = useCallback((message: string, duration?: number) => {
    showToast(message, 'success', duration);
  }, [showToast]);

  const showError = useCallback((message: string, duration?: number) => {
    showToast(message, 'error', duration);
  }, [showToast]);

  const showWarning = useCallback((message: string, duration?: number) => {
    showToast(message, 'warning', duration);
  }, [showToast]);

  const showInfo = useCallback((message: string, duration?: number) => {
    showToast(message, 'info', duration);
  }, [showToast]);

  const value: ToastContextType = {
    showToast,
    showSuccess,
    showError,
    showWarning,
    showInfo,
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastContainer>
        {toasts.map(toast => (
          <ToastItem
            key={toast.id}
            $type={toast.type}
            $isExiting={exitingToasts.has(toast.id)}
            onClick={() => removeToast(toast.id)}
          >
            <ToastIcon>{getToastIcon(toast.type)}</ToastIcon>
            <ToastMessage>{toast.message}</ToastMessage>
            <CloseButton onClick={(e) => {
              e.stopPropagation();
              removeToast(toast.id);
            }}>
              ×
            </CloseButton>
          </ToastItem>
        ))}
      </ToastContainer>
    </ToastContext.Provider>
  );
};

export default ToastProvider;
