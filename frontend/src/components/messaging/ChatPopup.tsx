import React, { useState, useEffect, useRef } from 'react';
import styled from 'styled-components';
import { MessageBubble } from './MessageBubble';
import { MessageComposer } from './MessageComposer';
import { messagesApi, Message, Conversation } from '../../services/api/messagesApi';
import { useWebSocket } from '../../contexts/WebSocketContext';
import { useAuth } from '../../contexts/AuthContext';

interface ChatPopupProps {
  userId: number;
  username: string;
  avatarUrl?: string;
  onClose: () => void;
}

interface Position {
  x: number;
  y: number;
}

interface Size {
  width: number;
  height: number;
}

const PopupContainer = styled.div<{ $position: Position; $size: Size; $isDragging: boolean; $isResizing: boolean }>`
  position: fixed;
  left: ${props => props.$position.x}px;
  top: ${props => props.$position.y}px;
  width: ${props => props.$size.width}px;
  height: ${props => props.$size.height}px;
  background: white;
  border-radius: 8px 8px 0 0;
  box-shadow: 0 0 16px rgba(0, 0, 0, 0.2);
  display: flex;
  flex-direction: column;
  z-index: 1000;

  /* Prevent text selection when dragging or resizing */
  ${props => (props.$isDragging || props.$isResizing) && `
    user-select: none;
    pointer-events: none;

    * {
      user-select: none;
      pointer-events: auto;
    }
  `}
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  padding: 12px 16px;
  background: ${props => props.theme.colors.primary};
  color: white;
  border-radius: 8px 8px 0 0;
  cursor: move;
  user-select: none;
`;

const Avatar = styled.img`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  margin-right: 12px;
  object-fit: cover;
`;

const DefaultAvatar = styled.div`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  margin-right: 12px;
  background: rgba(255, 255, 255, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.875rem;
  font-weight: 600;
`;

const Username = styled.div`
  flex: 1;
  font-weight: 600;
  font-size: 0.938rem;
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  color: white;
  font-size: 1.25rem;
  cursor: pointer;
  padding: 0;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: background 0.2s;

  &:hover {
    background: rgba(255, 255, 255, 0.2);
  }
`;

const MessagesContainer = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 1px;
  background: #f0f2f5;

  /* Custom scrollbar */
  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }

  &::-webkit-scrollbar-thumb {
    background: rgba(0, 0, 0, 0.2);
    border-radius: 3px;
  }

  &::-webkit-scrollbar-thumb:hover {
    background: rgba(0, 0, 0, 0.3);
  }
`;

const ComposerContainer = styled.div`
  padding: 12px;
  background: white;
  border-top: 1px solid #e5e5e5;
`;

const LoadingContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  color: ${props => props.theme.colors.text.secondary};
  font-size: 0.875rem;
`;

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: ${props => props.theme.colors.text.secondary};
  font-size: 0.875rem;
  text-align: center;
  padding: 24px;
`;

const ResizeHandle = styled.div`
  position: absolute;
  width: 16px;
  height: 16px;
  right: 0;
  bottom: 0;
  cursor: nwse-resize;

  &::after {
    content: '';
    position: absolute;
    right: 3px;
    bottom: 3px;
    width: 10px;
    height: 10px;
    border-right: 2px solid #ccc;
    border-bottom: 2px solid #ccc;
  }
`;

export const ChatPopup: React.FC<ChatPopupProps> = ({ userId, username, avatarUrl, onClose }) => {
  const { state } = useAuth();
  const websocket = useWebSocket();
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Position and size state
  const [position, setPosition] = useState<Position>({
    x: window.innerWidth - 408, // 328px width + 80px from right
    y: window.innerHeight - 455  // 455px height from bottom
  });
  const [size, setSize] = useState<Size>({ width: 328, height: 455 });

  // Drag state
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<Position>({ x: 0, y: 0 });

  // Resize state
  const [isResizing, setIsResizing] = useState(false);
  const [resizeStart, setResizeStart] = useState<{ pos: Position; size: Size }>({
    pos: { x: 0, y: 0 },
    size: { width: 0, height: 0 }
  });

  // Ensure messages is always an array
  const safeMessages = messages || [];

  // Load or create conversation
  useEffect(() => {
    const initConversation = async () => {
      try {
        setLoading(true);
        // Create or get existing conversation
        const response = await messagesApi.createConversation({
          type: 'direct',
          participant_ids: [userId]
        });

        if (response.success && response.data) {
          setConversation(response.data);
          // Load messages
          const messagesResponse = await messagesApi.getMessages(response.data.id, { limit: 50 });
          if (messagesResponse.success && messagesResponse.data) {
            setMessages(messagesResponse.data.messages);
            // Mark as read
            await messagesApi.markAsRead(response.data.id);
          }
        }
      } catch (error) {
        console.error('Failed to initialize conversation:', error);
      } finally {
        setLoading(false);
      }
    };

    initConversation();
  }, [userId]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [safeMessages]);

  // Listen for new messages via WebSocket
  useEffect(() => {
    if (!websocket || !conversation) return;

    const unsubscribe = websocket.onMessage((data: any) => {
      const message = data.message || data;
      if (message.conversation_id === conversation.id) {
        setMessages(prev => {
          // Avoid duplicates
          if (prev.some(m => m.id === message.id)) {
            return prev;
          }
          return [...prev, message];
        });
      }
    });

    return () => unsubscribe();
  }, [conversation, websocket]);

  // Prevent text selection globally when dragging or resizing
  useEffect(() => {
    if (isDragging || isResizing) {
      document.body.style.userSelect = 'none';
      document.body.style.cursor = isDragging ? 'move' : 'nwse-resize';
    } else {
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    }

    return () => {
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };
  }, [isDragging, isResizing]);

  // Dragging logic
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        e.preventDefault(); // Prevent text selection
        const newX = e.clientX - dragStart.x;
        const newY = e.clientY - dragStart.y;

        // Keep within viewport bounds
        const maxX = window.innerWidth - size.width;
        const maxY = window.innerHeight - size.height;

        setPosition({
          x: Math.max(0, Math.min(newX, maxX)),
          y: Math.max(0, Math.min(newY, maxY))
        });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragStart, size]);

  // Resizing logic
  const handleResizeStart = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsResizing(true);
    setResizeStart({
      pos: { x: e.clientX, y: e.clientY },
      size: { ...size }
    });
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isResizing) {
        e.preventDefault(); // Prevent text selection
        const deltaX = e.clientX - resizeStart.pos.x;
        const deltaY = e.clientY - resizeStart.pos.y;

        const newWidth = Math.max(280, Math.min(600, resizeStart.size.width + deltaX));
        const newHeight = Math.max(300, Math.min(800, resizeStart.size.height + deltaY));

        setSize({ width: newWidth, height: newHeight });
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, resizeStart]);

  const handleSendMessage = async (content: string) => {
    if (!conversation) return;

    try {
      const response = await messagesApi.sendMessage(conversation.id, { content });
      if (response.success && response.data) {
        // Message will be added via WebSocket
        // But add optimistically in case WebSocket is slow
        setMessages(prev => {
          if (prev.some(m => m.id === response.data!.id)) {
            return prev;
          }
          return [...prev, response.data!];
        });
      }
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const handleReactionToggle = async (messageId: number, emoji: string) => {
    if (!conversation) return;

    try {
      const response = await messagesApi.toggleReaction(messageId, emoji);
      if (response.success && response.data) {
        setMessages(prev =>
          prev.map(msg =>
            msg.id === messageId ? { ...msg, reactions: response.data!.reactions } : msg
          )
        );
      }
    } catch (error) {
      console.error('Failed to toggle reaction:', error);
    }
  };

  const handleEditMessage = async (messageId: number, content: string) => {
    if (!conversation) return;

    try {
      const response = await messagesApi.editMessage(messageId, content);
      if (response.success && response.data) {
        setMessages(prev =>
          prev.map(msg => (msg.id === messageId ? response.data! : msg))
        );
      }
    } catch (error) {
      console.error('Failed to edit message:', error);
    }
  };

  const handleDeleteMessage = async (messageId: number) => {
    if (!conversation) return;

    try {
      const response = await messagesApi.deleteMessage(messageId);
      if (response.success) {
        setMessages(prev => prev.filter(msg => msg.id !== messageId));
      }
    } catch (error) {
      console.error('Failed to delete message:', error);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <PopupContainer $position={position} $size={size} $isDragging={isDragging} $isResizing={isResizing}>
      <Header onMouseDown={handleMouseDown}>
        {avatarUrl ? (
          <Avatar src={avatarUrl} alt={username} />
        ) : (
          <DefaultAvatar>{getInitials(username)}</DefaultAvatar>
        )}
        <Username>{username}</Username>
        <CloseButton onClick={onClose}>×</CloseButton>
      </Header>

      {loading ? (
        <LoadingContainer>Loading conversation...</LoadingContainer>
      ) : (
        <>
          <MessagesContainer>
            {safeMessages.length === 0 ? (
              <EmptyState>
                <p>No messages yet</p>
                <p style={{ fontSize: '0.75rem', marginTop: '8px' }}>
                  Start the conversation below
                </p>
              </EmptyState>
            ) : (
              <>
                {safeMessages.map(message => (
                  <MessageBubble
                    key={message.id}
                    message={{
                      ...message,
                      sender_username: message.sender?.username || 'Unknown',
                      sender_avatar: message.sender?.avatar_url
                    } as any}
                    isOwnMessage={message.sender_id === state.user?.id}
                    onReply={() => {}} // Disable reply in popup for simplicity
                    onEdit={handleEditMessage}
                    onDelete={handleDeleteMessage}
                    onReactionToggle={handleReactionToggle}
                  />
                ))}
                <div ref={messagesEndRef} />
              </>
            )}
          </MessagesContainer>

          {conversation && (
            <ComposerContainer>
              <MessageComposer
                conversationId={conversation.id}
                onSendMessage={handleSendMessage}
              />
            </ComposerContainer>
          )}
        </>
      )}

      <ResizeHandle onMouseDown={handleResizeStart} />
    </PopupContainer>
  );
};
