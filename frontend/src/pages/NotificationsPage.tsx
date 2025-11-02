/**
 * NotificationsPage Component
 * Full-page view for browsing all notifications with pagination and filters
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { notificationsApi, Notification } from '../services/api/notificationsApi';
import { useWebSocket } from '../contexts/WebSocketContext';

// Styled components
const PageContainer = styled.div`
  max-width: 800px;
  margin: 0 auto;
  padding: ${({ theme }) => theme.spacing.lg};

  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    padding: ${({ theme }) => theme.spacing.md};
  }
`;

const PageHeader = styled.div`
  margin-bottom: ${({ theme }) => theme.spacing.lg};
`;

const Title = styled.h1`
  font-size: 1.75rem;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.primary};
  margin: 0 0 ${({ theme }) => theme.spacing.md};
`;

const HeaderActions = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing.md};
  align-items: center;
  flex-wrap: wrap;
`;

const FilterTabs = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing.sm};
  flex: 1;
  overflow-x: auto;

  &::-webkit-scrollbar {
    height: 4px;
  }
`;

const FilterTab = styled.button<{ $active: boolean }>`
  padding: 8px 16px;
  border: none;
  background: ${({ theme, $active }) =>
    $active ? theme.colors.primary : theme.colors.background};
  color: ${({ theme, $active }) =>
    $active ? 'white' : theme.colors.text.secondary};
  font-size: 0.875rem;
  font-weight: 500;
  border-radius: 999px;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s;

  &:hover {
    background: ${({ theme, $active }) =>
      $active ? theme.colors.primary : theme.colors.border};
  }
`;

const MarkAllButton = styled.button`
  padding: 8px 16px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.primary};
  font-size: 0.875rem;
  font-weight: 500;
  border-radius: ${({ theme }) => theme.borderRadius.md};
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: ${({ theme }) => theme.colors.background};
    border-color: ${({ theme }) => theme.colors.primary};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const NotificationsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.sm};
`;

const NotificationCard = styled.div<{ $isRead: boolean }>`
  padding: ${({ theme }) => theme.spacing.md};
  background: ${({ theme, $isRead }) =>
    $isRead ? theme.colors.surface : `${theme.colors.primary}08`};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    border-color: ${({ theme }) => theme.colors.primary};
    box-shadow: ${({ theme }) => theme.shadows.sm};
  }
`;

const NotificationContent = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing.md};
`;

const NotificationIcon = styled.div`
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: ${({ theme }) => theme.colors.primary};
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 1.5rem;
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

  .title {
    font-weight: ${({ theme }) => theme.fontWeight.semibold};
    color: ${({ theme }) => theme.colors.text.primary};
    margin-bottom: 4px;
    font-size: 1rem;
  }

  .message {
    color: ${({ theme }) => theme.colors.text.secondary};
    font-size: 0.875rem;
    line-height: 1.5;
    margin-bottom: 8px;
  }

  .meta {
    display: flex;
    gap: ${({ theme }) => theme.spacing.md};
    font-size: 0.8125rem;
    color: ${({ theme }) => theme.colors.text.secondary};
  }
`;

const LoadingState = styled.div`
  padding: 40px;
  text-align: center;
  color: ${({ theme }) => theme.colors.text.secondary};
`;

const EmptyState = styled.div`
  padding: 80px 20px;
  text-align: center;
  color: ${({ theme }) => theme.colors.text.secondary};

  .icon {
    font-size: 3rem;
    margin-bottom: ${({ theme }) => theme.spacing.md};
    opacity: 0.5;
  }

  .message {
    font-size: 1rem;
    margin-bottom: ${({ theme }) => theme.spacing.sm};
  }

  .submessage {
    font-size: 0.875rem;
    opacity: 0.7;
  }
`;

const Pagination = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.md};
  margin-top: ${({ theme }) => theme.spacing.lg};
`;

const PageButton = styled.button`
  padding: 8px 16px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: 0.875rem;
  border-radius: ${({ theme }) => theme.borderRadius.md};
  cursor: pointer;
  transition: all 0.2s;

  &:hover:not(:disabled) {
    background: ${({ theme }) => theme.colors.background};
    border-color: ${({ theme }) => theme.colors.primary};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const PageInfo = styled.span`
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: 0.875rem;
`;

// Helper functions
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

const getNotificationIcon = (notification: Notification): string => {
  if (notification.actor?.avatar_url) {
    return notification.actor.avatar_url;
  }

  switch (notification.type) {
    case 'like':
    case 'reaction':
      return '❤️';
    case 'comment':
    case 'comment_reply':
      return '💬';
    case 'follow':
      return '👤';
    case 'mention':
      return '@';
    case 'message':
      return '📧';
    case 'share':
      return '🔄';
    default:
      return '🔔';
  }
};

const FILTER_TYPES = [
  { value: 'all', label: 'All' },
  { value: 'unread', label: 'Unread' },
  { value: 'interactions', label: 'Interactions' },
  { value: 'comment', label: 'Comments' },
  { value: 'follow', label: 'Follows' },
  { value: 'message', label: 'Messages' }
];

export const NotificationsPage: React.FC = () => {
  const navigate = useNavigate();
  const websocket = useWebSocket();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 20;

  // Load notifications
  const loadNotifications = async () => {
    try {
      setLoading(true);
      const params: any = {
        limit,
        offset: (page - 1) * limit
      };

      if (filter === 'unread') {
        params.unread_only = true;
      } else if (filter === 'interactions') {
        // Use backend multi-type support with comma-separated types
        params.type = 'reaction,share';
      } else if (filter !== 'all') {
        params.type = filter;
      }

      const response = await notificationsApi.getNotifications(params);

      if (response.success && response.data) {
        // The API returns an array directly in data
        const notificationsArray = Array.isArray(response.data) ? response.data : [];
        setNotifications(notificationsArray);

        // Calculate total pages based on returned data
        // If we get less than limit, we're on the last page
        if (notificationsArray.length < limit) {
          setTotalPages(page);
        } else {
          // Assume there might be more pages
          setTotalPages(page + 1);
        }
      }
    } catch (error) {
      console.error('Failed to load notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load notifications when filter or page changes
  useEffect(() => {
    loadNotifications();
  }, [filter, page]);

  // Subscribe to WebSocket notifications
  useEffect(() => {
    if (!websocket) return;

    const unsubscribe = websocket.onNotification((data: any) => {
      const notification: Notification = data.notification || data;
      // Only add to list if on first page and 'all' or 'unread' filter
      if (page === 1 && (filter === 'all' || filter === 'unread')) {
        setNotifications(prev => [notification, ...prev].slice(0, limit));
      }
    });

    return () => {
      unsubscribe();
    };
  }, [websocket, page, filter]);

  const handleNotificationClick = async (notification: Notification) => {
    // Mark as read
    if (!notification.read_at) {
      try {
        await notificationsApi.markAsRead(notification.id);
        setNotifications(prev =>
          prev.map(n =>
            n.id === notification.id
              ? { ...n, read_at: new Date().toISOString() }
              : n
          )
        );
      } catch (error) {
        console.error('Failed to mark notification as read:', error);
      }
    }

    // Navigate to action URL
    if (notification.action_url) {
      navigate(notification.action_url);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationsApi.markAllAsRead();
      setNotifications(prev =>
        prev.map(n => ({ ...n, read_at: n.read_at || new Date().toISOString() }))
      );
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  const hasUnread = notifications.some(n => !n.read_at);

  return (
    <PageContainer>
      <PageHeader>
        <Title>Notifications</Title>
        <HeaderActions>
          <FilterTabs>
            {FILTER_TYPES.map(type => (
              <FilterTab
                key={type.value}
                $active={filter === type.value}
                onClick={() => {
                  setFilter(type.value);
                  setPage(1);
                }}
              >
                {type.label}
              </FilterTab>
            ))}
          </FilterTabs>
          <MarkAllButton
            onClick={handleMarkAllAsRead}
            disabled={!hasUnread}
          >
            Mark all as read
          </MarkAllButton>
        </HeaderActions>
      </PageHeader>

      {loading ? (
        <LoadingState>Loading notifications...</LoadingState>
      ) : notifications.length === 0 ? (
        <EmptyState>
          <div className="icon">🔔</div>
          <div className="message">No notifications yet</div>
          <div className="submessage">
            {filter === 'unread'
              ? "You're all caught up!"
              : 'When you get notifications, they will appear here'}
          </div>
        </EmptyState>
      ) : (
        <>
          <NotificationsList>
            {notifications.map(notification => {
              const icon = getNotificationIcon(notification);
              const isImage = icon.startsWith('http');

              return (
                <NotificationCard
                  key={notification.id}
                  $isRead={!!notification.read_at}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <NotificationContent>
                    <NotificationIcon>
                      {isImage ? (
                        <img src={icon} alt="" />
                      ) : (
                        icon
                      )}
                    </NotificationIcon>
                    <NotificationText>
                      <div className="title">{notification.title}</div>
                      <div className="message">{notification.message}</div>
                      <div className="meta">
                        <span>{formatTime(notification.created_at)}</span>
                        {notification.priority && notification.priority !== 'normal' && (
                          <span>• {notification.priority}</span>
                        )}
                      </div>
                    </NotificationText>
                  </NotificationContent>
                </NotificationCard>
              );
            })}
          </NotificationsList>

          {totalPages > 1 && (
            <Pagination>
              <PageButton
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                Previous
              </PageButton>
              <PageInfo>
                Page {page} of {totalPages}
              </PageInfo>
              <PageButton
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                Next
              </PageButton>
            </Pagination>
          )}
        </>
      )}
    </PageContainer>
  );
};

export default NotificationsPage;
