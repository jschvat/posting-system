import React, { useState, useMemo } from 'react';
import styled from 'styled-components';
import { ConversationView } from '../components/messaging/ConversationView';
import { Message } from '../services/api/messagesApi';
import AuthContext from '../contexts/AuthContext';

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
    background: ${props => props.theme.colors.background};
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

  // Mock auth context with user ID 1
  const mockAuthValue = useMemo(() => ({
    state: {
      user: {
        id: 1,
        username: 'You',
        email: 'you@test.com',
        first_name: 'Test',
        last_name: 'User',
        is_active: true,
        created_at: new Date().toISOString(),
      },
      token: 'mock-token',
      isAuthenticated: true,
      isLoading: false,
      error: null,
    },
    login: async () => {},
    logout: () => {},
    register: async () => {},
    updateUser: async () => {},
    clearError: () => {},
  }), []);

  const handleSendMessage = (content: string, replyToId?: number, mediaFile?: { file: File; type: 'image' | 'video'; dataUrl: string }) => {
    const newMessage: Message = {
      id: nextId,
      conversation_id: 1,
      sender_id: 1,
      content,
      message_type: mediaFile ? mediaFile.type : 'text',
      attachment_url: mediaFile?.dataUrl,
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

  const handleReactionToggle = (messageId: number, emoji: string) => {
    setMessages(prev =>
      prev.map(msg => {
        if (msg.id !== messageId) return msg;

        const reactions = msg.reactions || [];

        // Find if user has ANY existing reaction (one reaction per user limit)
        const userCurrentReaction = reactions.find(r =>
          r.users.some(u => u.user_id === 1)
        );

        // If clicking the same emoji user already reacted with, remove it
        if (userCurrentReaction && userCurrentReaction.emoji === emoji) {
          const updatedUsers = userCurrentReaction.users.filter(u => u.user_id !== 1);

          if (updatedUsers.length === 0) {
            // Remove emoji entirely if no other users
            return {
              ...msg,
              reactions: reactions.filter(r => r.emoji !== emoji)
            };
          } else {
            // Keep emoji but remove current user
            return {
              ...msg,
              reactions: reactions.map(r =>
                r.emoji === emoji
                  ? { ...r, count: updatedUsers.length, users: updatedUsers }
                  : r
              )
            };
          }
        }

        // Remove user's old reaction (if any) and add new one
        let updatedReactions = reactions;

        // First, remove user from their old reaction
        if (userCurrentReaction) {
          updatedReactions = reactions
            .map(r => {
              if (r.emoji === userCurrentReaction.emoji) {
                const newUsers = r.users.filter(u => u.user_id !== 1);
                return newUsers.length > 0
                  ? { ...r, count: newUsers.length, users: newUsers }
                  : null;
              }
              return r;
            })
            .filter(r => r !== null) as typeof reactions;
        }

        // Then add user to new reaction
        const targetReaction = updatedReactions.find(r => r.emoji === emoji);

        if (targetReaction) {
          // Add user to existing emoji
          return {
            ...msg,
            reactions: updatedReactions.map(r =>
              r.emoji === emoji
                ? {
                    ...r,
                    count: r.count + 1,
                    users: [...r.users, { user_id: 1, username: 'You' }]
                  }
                : r
            )
          };
        } else {
          // Create new emoji reaction
          return {
            ...msg,
            reactions: [
              ...updatedReactions,
              {
                emoji,
                count: 1,
                users: [{ user_id: 1, username: 'You' }]
              }
            ]
          };
        }
      })
    );
  };

  return (
    <AuthContext.Provider value={mockAuthValue}>
      <PageContainer>
        <Header>
          <div>
            <Title>Messaging System Test</Title>
            <SubTitle>Test conversation with Alice (logged in as User #1)</SubTitle>
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
            onReactionToggle={handleReactionToggle}
          />
        </ConversationContainer>
      </PageContainer>
    </AuthContext.Provider>
  );
};
