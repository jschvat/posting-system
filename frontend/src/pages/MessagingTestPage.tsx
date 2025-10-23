import React, { useState } from 'react';
import styled from 'styled-components';
import { ConversationView } from '../components/messaging/ConversationView';
import { Message } from '../services/api/messagesApi';

const PageContainer = styled.div`
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: ${props => props.theme.colors.background};
`;

const Header = styled.div`
  background: ${props => props.theme.colors.surface};
  border-bottom: 1px solid ${props => props.theme.colors.border};
  padding: 16px 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const Title = styled.h1`
  font-size: 1.25rem;
  font-weight: 600;
  color: ${props => props.theme.colors.text.primary};
  margin: 0;
`;

const SubTitle = styled.p`
  font-size: 0.875rem;
  color: ${props => props.theme.colors.text.secondary};
  margin: 4px 0 0 0;
`;

const ConversationContainer = styled.div`
  flex: 1;
  overflow: hidden;
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 8px;
`;

const Button = styled.button`
  padding: 8px 16px;
  border-radius: 6px;
  border: 1px solid ${props => props.theme.colors.border};
  background: ${props => props.theme.colors.surface};
  color: ${props => props.theme.colors.text.primary};
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: ${props => props.theme.colors.hover};
  }

  &:active {
    transform: scale(0.98);
  }
`;

// Mock data for testing
const mockMessages: Message[] = [
  {
    id: 1,
    conversation_id: 1,
    sender_id: 2,
    content: 'Hey! How are you doing?',
    message_type: 'text',
    created_at: new Date(Date.now() - 3600000).toISOString(),
    sender: {
      id: 2,
      username: 'Alice',
      avatar_url: undefined,
    },
  },
  {
    id: 2,
    conversation_id: 1,
    sender_id: 1,
    content: "I'm doing great! Just working on the messaging system. How about you?",
    message_type: 'text',
    created_at: new Date(Date.now() - 3500000).toISOString(),
    sender: {
      id: 1,
      username: 'You',
      avatar_url: undefined,
    },
  },
  {
    id: 3,
    conversation_id: 1,
    sender_id: 2,
    content: 'Nice! That sounds interesting. What features are you implementing?',
    message_type: 'text',
    created_at: new Date(Date.now() - 3400000).toISOString(),
    sender: {
      id: 2,
      username: 'Alice',
      avatar_url: undefined,
    },
  },
  {
    id: 4,
    conversation_id: 1,
    sender_id: 1,
    content: 'Real-time messaging with WebSockets, typing indicators, read receipts, message editing, and replies!',
    message_type: 'text',
    created_at: new Date(Date.now() - 3300000).toISOString(),
    sender: {
      id: 1,
      username: 'You',
      avatar_url: undefined,
    },
  },
  {
    id: 5,
    conversation_id: 1,
    sender_id: 2,
    content: 'Wow, that\'s a lot of features! Can I reply to a specific message?',
    message_type: 'text',
    reply_to_id: 4,
    created_at: new Date(Date.now() - 3200000).toISOString(),
    sender: {
      id: 2,
      username: 'Alice',
      avatar_url: undefined,
    },
    reply_to: {
      id: 4,
      conversation_id: 1,
      sender_id: 1,
      content: 'Real-time messaging with WebSockets, typing indicators, read receipts, message editing, and replies!',
      message_type: 'text',
      created_at: new Date(Date.now() - 3300000).toISOString(),
    },
  },
  {
    id: 6,
    conversation_id: 1,
    sender_id: 1,
    content: 'Yes! That\'s exactly what the reply feature does. Try clicking the reply button on any message.',
    message_type: 'text',
    reply_to_id: 5,
    created_at: new Date(Date.now() - 3100000).toISOString(),
    sender: {
      id: 1,
      username: 'You',
      avatar_url: undefined,
    },
    reply_to: {
      id: 5,
      conversation_id: 1,
      sender_id: 2,
      content: 'Wow, that\'s a lot of features! Can I reply to a specific message?',
      message_type: 'text',
      created_at: new Date(Date.now() - 3200000).toISOString(),
    },
  },
  {
    id: 7,
    conversation_id: 1,
    sender_id: 2,
    content: 'This is so cool! I love the UI design.',
    message_type: 'text',
    edited_at: new Date(Date.now() - 2900000).toISOString(),
    created_at: new Date(Date.now() - 3000000).toISOString(),
    sender: {
      id: 2,
      username: 'Alice',
      avatar_url: undefined,
    },
  },
];

export const MessagingTestPage: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>(mockMessages);
  const [nextId, setNextId] = useState(8);

  const handleSendMessage = (content: string, replyToId?: number) => {
    const newMessage: Message = {
      id: nextId,
      conversation_id: 1,
      sender_id: 1,
      content,
      message_type: 'text',
      reply_to_id: replyToId,
      created_at: new Date().toISOString(),
      sender: {
        id: 1,
        username: 'You',
        avatar_url: undefined,
      },
      reply_to: replyToId ? messages.find(m => m.id === replyToId) : undefined,
    };

    setMessages(prev => [...prev, newMessage]);
    setNextId(prev => prev + 1);
  };

  const handleEditMessage = (messageId: number, content: string) => {
    setMessages(prev =>
      prev.map(msg =>
        msg.id === messageId
          ? { ...msg, content, edited_at: new Date().toISOString() }
          : msg
      )
    );
  };

  const handleDeleteMessage = (messageId: number) => {
    if (window.confirm('Are you sure you want to delete this message?')) {
      setMessages(prev =>
        prev.map(msg =>
          msg.id === messageId
            ? { ...msg, deleted_at: new Date().toISOString(), content: 'This message was deleted' }
            : msg
        )
      );
    }
  };

  const handleClearMessages = () => {
    if (window.confirm('Clear all messages?')) {
      setMessages([]);
    }
  };

  const handleResetMessages = () => {
    setMessages(mockMessages);
    setNextId(8);
  };

  return (
    <PageContainer>
      <Header>
        <div>
          <Title>Messaging System Test</Title>
          <SubTitle>Test conversation with Alice</SubTitle>
        </div>
        <ButtonGroup>
          <Button onClick={handleClearMessages}>Clear Messages</Button>
          <Button onClick={handleResetMessages}>Reset to Default</Button>
        </ButtonGroup>
      </Header>
      <ConversationContainer>
        <ConversationView
          conversationId={1}
          messages={messages}
          onSendMessage={handleSendMessage}
          onEditMessage={handleEditMessage}
          onDeleteMessage={handleDeleteMessage}
        />
      </ConversationContainer>
    </PageContainer>
  );
};
