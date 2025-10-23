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
  onSendMessage: (content: string, replyToId?: number) => void;
  onEditMessage: (messageId: number, content: string) => void;
  onDeleteMessage: (messageId: number) => void;
  isLoading?: boolean;
}

const Container = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  background: ${props => props.theme.colors.background};
`;

const MessagesContainer = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;

  /* Smooth scrolling */
  scroll-behavior: smooth;

  /* Custom scrollbar */
  &::-webkit-scrollbar {
    width: 8px;
  }

  &::-webkit-scrollbar-track {
    background: ${props => props.theme.colors.background};
  }

  &::-webkit-scrollbar-thumb {
    background: ${props => props.theme.colors.border};
    border-radius: 4px;
  }

  &::-webkit-scrollbar-thumb:hover {
    background: ${props => props.theme.colors.text.muted};
  }
`;

const ComposerContainer = styled.div`
  padding: 16px;
  background: ${props => props.theme.colors.surface};
  border-top: 1px solid ${props => props.theme.colors.border};
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
  isLoading = false,
}) => {
  const { user } = useAuth();
  const { socket } = useWebSocket();
  const [replyingTo, setReplyingTo] = useState<{ id: number; content: string; senderName: string } | null>(null);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Listen for typing indicators
  useEffect(() => {
    if (!socket) return;

    const handleTypingStart = (data: { userId: number; username: string; conversationId: number }) => {
      if (data.conversationId === conversationId && data.userId !== user?.id) {
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
  }, [socket, conversationId, user?.id]);

  const handleSendMessage = (content: string) => {
    onSendMessage(content, replyingTo?.id);
    setReplyingTo(null);
  };

  const handleReply = (messageId: number, content: string, senderName: string) => {
    setReplyingTo({ id: messageId, content, senderName });
  };

  if (isLoading) {
    return (
      <Container>
        <LoadingContainer>Loading messages...</LoadingContainer>
      </Container>
    );
  }

  if (messages.length === 0) {
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
            onSend={handleSendMessage}
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
        {messages.map((message) => (
          <MessageBubble
            key={message.id}
            message={message}
            onReply={handleReply}
            onEdit={onEditMessage}
            onDelete={onDeleteMessage}
          />
        ))}
        <TypingIndicator usernames={typingUsers} />
        <div ref={messagesEndRef} />
      </MessagesContainer>
      <ComposerContainer>
        <MessageComposer
          conversationId={conversationId}
          onSend={handleSendMessage}
          replyingTo={replyingTo || undefined}
          onClearReply={() => setReplyingTo(null)}
        />
      </ComposerContainer>
    </Container>
  );
};
