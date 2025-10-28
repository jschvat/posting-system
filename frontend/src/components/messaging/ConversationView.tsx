import React, { useState, useEffect, useRef } from 'react';
import styled from 'styled-components';
import { MessageBubble } from './MessageBubble';
import { MessageComposer } from './MessageComposer';
import { TypingIndicator } from './TypingIndicator';
import { useWebSocket } from '../../contexts/WebSocketContext';
import { useAuth } from '../../contexts/AuthContext';
import { Message } from '../../services/api/messagesApi';

interface ConversationViewProps {
  conversationId: number;
  messages: Message[];
  onSendMessage: (content: string, replyToId?: number, mediaFile?: { file: File; type: 'image' | 'video'; dataUrl: string }) => void;
  onEditMessage: (messageId: number, content: string) => void;
  onDeleteMessage: (messageId: number) => void;
  onReactionToggle?: (messageId: number, emoji: string) => void;
  isLoading?: boolean;
}

const Container = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #ffffff;
`;

const MessagesContainer = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 16px 0;
  display: flex;
  flex-direction: column;
  gap: 1px;

  /* Smooth scrolling */
  scroll-behavior: smooth;

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
  padding: 12px 16px;
  background: #f6f6f6;
  border-top: 1px solid #e5e5e5;
`;

const LoadingContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  color: ${props => props.theme.colors.text.secondary};
`;

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: ${props => props.theme.colors.text.secondary};
  font-size: 0.938rem;
`;

export const ConversationView: React.FC<ConversationViewProps> = ({
  conversationId,
  messages,
  onSendMessage,
  onEditMessage,
  onDeleteMessage,
  onReactionToggle,
  isLoading = false,
}) => {
  const { state } = useAuth();
  const { socket } = useWebSocket();
  const [replyingTo, setReplyingTo] = useState<{ messageId: number; content: string; senderName: string } | null>(null);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Ensure messages is always an array
  const safeMessages = messages || [];

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [safeMessages]);

  // Listen for typing indicators
  useEffect(() => {
    if (!socket) return;

    const handleTypingStart = (data: { userId: number; username: string; conversationId: number }) => {
      if (data.conversationId === conversationId && data.userId !== state.user?.id) {
        setTypingUsers(prev => {
          if (!prev.includes(data.username)) {
            return [...prev, data.username];
          }
          return prev;
        });
      }
    };

    const handleTypingStop = (data: { userId: number; username: string; conversationId: number }) => {
      if (data.conversationId === conversationId) {
        setTypingUsers(prev => prev.filter(name => name !== data.username));
      }
    };

    socket.on('user:typing:started', handleTypingStart);
    socket.on('user:typing:stopped', handleTypingStop);

    return () => {
      socket.off('user:typing:started', handleTypingStart);
      socket.off('user:typing:stopped', handleTypingStop);
    };
  }, [socket, conversationId, state.user?.id]);

  const handleSendMessage = (content: string, replyToId?: number, mediaFile?: { file: File; type: 'image' | 'video'; dataUrl: string }) => {
    onSendMessage(content, replyingTo?.messageId || replyToId, mediaFile);
    setReplyingTo(null);
  };

  const handleReply = (message: any) => {
    setReplyingTo({
      messageId: message.id,
      content: message.content,
      senderName: message.sender_username
    });
  };

  if (isLoading) {
    return (
      <Container>
        <LoadingContainer>Loading messages...</LoadingContainer>
      </Container>
    );
  }

  if (safeMessages.length === 0) {
    return (
      <Container>
        <EmptyState>
          <p>No messages yet</p>
          <p style={{ fontSize: '0.813rem', marginTop: '8px' }}>
            Start the conversation by sending a message below
          </p>
        </EmptyState>
        <ComposerContainer>
          <MessageComposer
            conversationId={conversationId}
            onSendMessage={handleSendMessage}
            replyingTo={replyingTo || undefined}
            onClearReply={() => setReplyingTo(null)}
          />
        </ComposerContainer>
      </Container>
    );
  }

  return (
    <Container>
      <MessagesContainer>
        {safeMessages.map((message) => (
          <MessageBubble
            key={message.id}
            message={{
              ...message,
              sender_username: message.sender?.username || 'Unknown',
              sender_avatar: message.sender?.avatar_url
            } as any}
            isOwnMessage={message.sender_id === state.user?.id}
            onReply={handleReply}
            onEdit={onEditMessage}
            onDelete={onDeleteMessage}
            onReactionToggle={onReactionToggle}
          />
        ))}
        <TypingIndicator usernames={typingUsers} />
        <div ref={messagesEndRef} />
      </MessagesContainer>
      <ComposerContainer>
        <MessageComposer
          conversationId={conversationId}
          onSendMessage={handleSendMessage}
          replyingTo={replyingTo || undefined}
          onClearReply={() => setReplyingTo(null)}
        />
      </ComposerContainer>
    </Container>
  );
};
