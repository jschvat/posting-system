/**
 * NotificationsPanel Component
 * Displays notifications with real-time updates via WebSocket
 */

import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import styled from 'styled-components';
import { notificationsApi, Notification } from '../services/api/notificationsApi';
import { useWebSocket } from '../contexts/WebSocketContext';

// Styled components
const NotificationButton = styled.button<{ $hasUnread: boolean }>`
  position: relative;
  background: none;
  border: none;
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: 1.25rem;
  cursor: pointer;
  padding: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: background 0.2s;

  &:hover {
    background: ${({ theme }) => theme.colors.background};
  }

  ${({ $hasUnread, theme }) => $hasUnread && `
    &::after {
      content: '';
      position: absolute;
      top: 6px;
      right: 6px;
      width: 8px;
      height: 8px;
      background: ${theme.colors.error};
      border-radius: 50%;
    }
  `}
`;

const Badge = styled.span`
  position: absolute;
  top: 2px;
  right: 2px;
  background: ${({ theme }) => theme.colors.error};
  color: white;
  font-size: 0.625rem;
  font-weight: 600;
  padding: 2px 5px;
  border-radius: 10px;
  min-width: 16px;
  text-align: center;
`;

const Panel = styled.div<{ $isOpen: boolean }>`
  position: absolute;
  top: 100%;
  right: 0;
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  box-shadow: ${({ theme }) => theme.shadows.lg};
  width: 380px;
  max-height: 500px;
  z-index: 1000;
  display: ${({ $isOpen }) => $isOpen ? 'flex' : 'none'};
  flex-direction: column;
  margin-top: ${({ theme }) => theme.spacing.sm};

  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    width: calc(100vw - 32px);
    right: -100px;
  }
`;

const PanelHeader = styled.div`
  padding: 16px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  display: flex;
  justify-content: space-between;
  align-items: center;

  h3 {
    margin: 0;
    font-size: 1rem;
    font-weight: 600;
    color: ${({ theme }) => theme.colors.text.primary};
  }
`;

const MarkAllButton = styled.button`
  background: none;
  border: none;
  color: ${({ theme }) => theme.colors.primary};
  font-size: 0.8125rem;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;

  &:hover {
    background: ${({ theme }) => theme.colors.background};
  }
`;

const NotificationsList = styled.div`
  flex: 1;
  overflow-y: auto;
  max-height: 400px;
`;

const NotificationItem = styled.div<{ $isRead: boolean }>`
  padding: 12px 16px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  cursor: pointer;
  background: ${({ theme, $isRead }) =>
    $isRead ? 'transparent' : `${theme.colors.primary}08`
  };
  transition: background 0.2s;

  &:hover {
    background: ${({ theme }) => theme.colors.background};
  }

  &:last-child {
    border-bottom: none;
  }
`;

const NotificationContent = styled.div`
  display: flex;
  gap: 12px;
  align-items: flex-start;
  min-width: 0;
`;

const NotificationIcon = styled.div`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: ${({ theme }) => theme.colors.primary};
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 1.125rem;
  flex-shrink: 0;
  overflow: hidden;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`;

const NotificationText = styled.div`
  flex: 1;
  min-width: 0;
  overflow: hidden;

  .title {
    font-weight: ${({ theme }) => theme.fontWeight.medium};
    color: ${({ theme }) => theme.colors.text.primary};
    margin-bottom: 2px;
    font-size: 0.875rem;
    word-wrap: break-word;
    overflow-wrap: break-word;
  }

  .message {
    color: ${({ theme }) => theme.colors.text.secondary};
    font-size: 0.8125rem;
    line-height: 1.4;
    word-wrap: break-word;
    overflow-wrap: break-word;
  }

  .time {
    color: ${({ theme }) => theme.colors.text.secondary};
    font-size: 0.75rem;
    margin-top: 4px;
    opacity: 0.7;
  }
`;

const EmptyState = styled.div`
  padding: 40px 16px;
  text-align: center;
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: 0.875rem;
`;

const ViewAllLink = styled(Link)`
  display: block;
  padding: 12px 16px;
  text-align: center;
  color: ${({ theme }) => theme.colors.primary};
  font-size: 0.875rem;
  font-weight: 500;
  border-top: 1px solid ${({ theme }) => theme.colors.border};
  text-decoration: none;

  &:hover {
    background: ${({ theme }) => theme.colors.background};
    text-decoration: none;
  }
`;

const Container = styled.div`
  position: relative;
`;

// Helper function to format notification time
const formatTime = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString();
};

// Helper function to get notification icon
const getNotificationIcon = (notification: Notification): string => {
  if (notification.actor?.avatar_url) {
    return notification.actor.avatar_url;
  }

  // Return emoji based on notification type
  switch (notification.type) {
    case 'like':
    case 'reaction':
      return '❤️';
    case 'comment':
      return '💬';
    case 'follow':
      return '👤';
    case 'mention':
      return '@';
    case 'message':
      return '📧';
    default:
      return '🔔';
  }
};

export const NotificationsPanel: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const websocket = useWebSocket();

  // Load notifications when panel opens
  useEffect(() => {
    if (isOpen && notifications.length === 0) {
      loadNotifications();
    }
  }, [isOpen]);

  // Load unread count on mount
  useEffect(() => {
    loadUnreadCount();
  }, []);

  // Subscribe to WebSocket notifications
  useEffect(() => {
    if (!websocket) return;

    const unsubscribe = websocket.onNotification((data: any) => {
      const notification: Notification = data.notification || data;
      setNotifications(prev => [notification, ...prev]);
      setUnreadCount(prev => prev + 1);
    });

    return () => {
      unsubscribe();
    };
  }, [websocket]);

  // Close panel when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const response = await notificationsApi.getNotifications({ limit: 20 });
      if (response.success && response.data) {
        setNotifications(response.data);
      }
    } catch (err) {
      console.error('Failed to load notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadUnreadCount = async () => {
    try {
      const response = await notificationsApi.getUnreadCount();
      if (response.success && response.data) {
        setUnreadCount(response.data.count);
      }
    } catch (err) {
      console.error('Failed to load unread count:', err);
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    // Mark as read if unread
    if (!notification.read_at) {
      try {
        await notificationsApi.markAsRead(notification.id);
        setNotifications(prev => prev.map(n =>
          n.id === notification.id ? { ...n, read_at: new Date().toISOString() } : n
        ));
        setUnreadCount(prev => Math.max(0, prev - 1));
      } catch (err) {
        console.error('Failed to mark notification as read:', err);
      }
    }

    // Navigate to action URL if provided
    if (notification.action_url) {
      window.location.href = notification.action_url;
    }

    setIsOpen(false);
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationsApi.markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, read_at: new Date().toISOString() })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  };

  const togglePanel = () => {
    setIsOpen(!isOpen);
  };

  return (
    <Container ref={panelRef}>
      <NotificationButton
        onClick={togglePanel}
        $hasUnread={unreadCount > 0}
        title="Notifications"
      >
        🔔
        {unreadCount > 0 && <Badge>{unreadCount > 99 ? '99+' : unreadCount}</Badge>}
      </NotificationButton>

      <Panel $isOpen={isOpen}>
        <PanelHeader>
          <h3>Notifications</h3>
          {unreadCount > 0 && (
            <MarkAllButton onClick={handleMarkAllAsRead}>
              Mark all read
            </MarkAllButton>
          )}
        </PanelHeader>

        <NotificationsList>
          {loading ? (
            <EmptyState>Loading notifications...</EmptyState>
          ) : notifications.length === 0 ? (
            <EmptyState>No notifications yet</EmptyState>
          ) : (
            notifications.map(notification => {
              const icon = getNotificationIcon(notification);
              const isEmoji = icon.length <= 2;

              return (
                <NotificationItem
                  key={notification.id}
                  $isRead={Boolean(notification.read_at)}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <NotificationContent>
                    <NotificationIcon>
                      {isEmoji ? icon : <img src={icon} alt="" />}
                    </NotificationIcon>
                    <NotificationText>
                      <div className="title">{notification.title}</div>
                      <div className="message">{notification.message}</div>
                      <div className="time">{formatTime(notification.created_at)}</div>
                    </NotificationText>
                  </NotificationContent>
                </NotificationItem>
              );
            })
          )}
        </NotificationsList>

        <ViewAllLink to="/notifications" onClick={() => setIsOpen(false)}>
          View all notifications
        </ViewAllLink>
      </Panel>
    </Container>
  );
};
