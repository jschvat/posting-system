import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { ConversationView } from '../components/messaging/ConversationView';
import { NewConversationModal } from '../components/messaging/NewConversationModal';
import { messagesApi, Conversation, Message } from '../services/api/messagesApi';
import { useAuth } from '../contexts/AuthContext';
import { useWebSocket } from '../contexts/WebSocketContext';

const PageContainer = styled.div`
  display: flex;
  height: 100vh;
  background: ${props => props.theme.colors.background};
`;

const Sidebar = styled.div`
  width: 320px;
  border-right: 1px solid ${props => props.theme.colors.border};
  background: ${props => props.theme.colors.surface};
  display: flex;
  flex-direction: column;
`;

const SidebarHeader = styled.div`
  padding: 16px;
  border-bottom: 1px solid ${props => props.theme.colors.border};
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const Title = styled.h1`
  font-size: 1.5rem;
  font-weight: 600;
  color: ${props => props.theme.colors.text.primary};
  margin: 0;
  display: flex;
  align-items: center;
`;

const NewMessageButton = styled.button`
  background: ${props => props.theme.colors.primary};
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: ${props => props.theme.borderRadius.md};
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;

  &:hover {
    background: ${props => props.theme.colors.primary}dd;
  }
`;

const UnreadBadge = styled.span`
  background: ${props => props.theme.colors.primary};
  color: white;
  font-size: 0.75rem;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 10px;
  margin-left: 8px;
`;

const ConversationList = styled.div`
  flex: 1;
  overflow-y: auto;
`;

const ConversationItem = styled.div<{ active: boolean; unread: boolean }>`
  padding: 12px 16px;
  border-bottom: 1px solid ${props => props.theme.colors.border};
  cursor: pointer;
  background: ${props => props.active ? props.theme.colors.background : 'transparent'};
  font-weight: ${props => props.unread ? '600' : 'normal'};
  transition: background 0.2s ease;
  display: flex;
  align-items: center;
  gap: 8px;

  &:hover {
    background: ${props => props.theme.colors.background};
  }

  &:hover .delete-button {
    opacity: 1;
  }
`;

const ConversationContent = styled.div`
  flex: 1;
  min-width: 0;
`;

const DeleteButton = styled.button`
  opacity: 0;
  background: transparent;
  border: none;
  color: ${props => props.theme.colors.error};
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 0.875rem;
  transition: opacity 0.2s, background 0.2s;

  &:hover {
    background: ${props => props.theme.colors.error}22;
  }

  &:active {
    background: ${props => props.theme.colors.error}33;
  }
`;

const ConversationName = styled.div`
  font-size: 0.9375rem;
  color: ${props => props.theme.colors.text.primary};
  margin-bottom: 4px;
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const LastMessage = styled.div`
  font-size: 0.8125rem;
  color: ${props => props.theme.colors.text.secondary};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const ConversationContainer = styled.div`
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
`;

const EmptyState = styled.div`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${props => props.theme.colors.text.secondary};
  font-size: 1rem;
`;

const Loading = styled.div`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${props => props.theme.colors.text.secondary};
`;

const Error = styled.div`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${props => props.theme.colors.error};
  padding: 16px;
  text-align: center;
`;

export const MessagingPage: React.FC = () => {
  const { state } = useAuth();
  const websocket = useWebSocket();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNewConversationModal, setShowNewConversationModal] = useState(false);

  // Load conversations on mount
  useEffect(() => {
    loadConversations();
    loadUnreadCount();
  }, []);

  // Subscribe to WebSocket events for real-time updates
  useEffect(() => {
    if (!websocket) return;

    const unsubscribeMessage = websocket.onMessage((data: any) => {
      // Handle new message
      if (data.type === 'new' || !data.type) {
        const message: Message = data.message || data;
        // Update messages if it's for the current conversation
        if (selectedConversation && message.conversation_id === selectedConversation.id) {
          setMessages(prev => [...prev, message]);
          // Mark as read
          messagesApi.markAsRead(selectedConversation.id).catch(console.error);
        } else {
          // Update unread count
          loadUnreadCount();
        }
        // Update conversation list with latest message
        loadConversations();
      }

      // Handle message reaction
      if (data.type === 'reaction') {
        setMessages(prev => prev.map(msg =>
          msg.id === data.message_id
            ? { ...msg, reactions: data.reactions }
            : msg
        ));
      }
    });

    return () => {
      unsubscribeMessage();
    };
  }, [selectedConversation, websocket]);

  const loadConversations = async () => {
    try {
      const response = await messagesApi.getConversations({ limit: 50 });
      if (response.success && response.data) {
        setConversations(response.data);
      }
    } catch (err) {
      console.error('Failed to load conversations:', err);
      setError('Failed to load conversations');
    } finally {
      setLoading(false);
    }
  };

  const loadUnreadCount = async () => {
    try {
      const response = await messagesApi.getUnreadCount();
      if (response.success && response.data) {
        setUnreadCount(response.data.count);
      }
    } catch (err) {
      console.error('Failed to load unread count:', err);
    }
  };

  const loadMessages = async (conversation: Conversation) => {
    try {
      setLoading(true);
      const response = await messagesApi.getMessages(conversation.id, { limit: 100 });
      if (response.success && response.data) {
        setMessages(response.data.messages);
        // Mark conversation as read
        await messagesApi.markAsRead(conversation.id);
        loadUnreadCount();
      }
    } catch (err) {
      console.error('Failed to load messages:', err);
      setError('Failed to load messages');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectConversation = (conversation: Conversation) => {
    setSelectedConversation(conversation);
    setMessages([]);
    setError(null);
    loadMessages(conversation);
  };

  const handleSendMessage = async (content: string) => {
    if (!selectedConversation) return;

    try {
      const response = await messagesApi.sendMessage(selectedConversation.id, {
        content,
        message_type: 'text'
      });

      if (response.success && response.data) {
        setMessages(prev => [...prev, response.data!]);
        loadConversations(); // Refresh conversation list
      }
    } catch (err) {
      console.error('Failed to send message:', err);
      setError('Failed to send message');
    }
  };

  const handleReactionToggle = async (messageId: number, emoji: string) => {
    try {
      const response = await messagesApi.toggleReaction(messageId, emoji);
      if (response.success && response.data) {
        // Update the message reactions in local state
        setMessages(prev => prev.map(msg =>
          msg.id === messageId
            ? { ...msg, reactions: response.data!.reactions }
            : msg
        ));
      }
    } catch (err) {
      console.error('Failed to toggle reaction:', err);
    }
  };

  const handleEditMessage = async (messageId: number, content: string) => {
    try {
      const response = await messagesApi.editMessage(messageId, content);
      if (response.success && response.data) {
        setMessages(prev => prev.map(msg =>
          msg.id === messageId
            ? { ...msg, content, edited_at: new Date().toISOString() }
            : msg
        ));
      }
    } catch (err) {
      console.error('Failed to edit message:', err);
      setError('Failed to edit message');
    }
  };

  const handleDeleteMessage = async (messageId: number) => {
    try {
      const response = await messagesApi.deleteMessage(messageId);
      if (response.success) {
        setMessages(prev => prev.map(msg =>
          msg.id === messageId
            ? { ...msg, deleted_at: new Date().toISOString(), content: 'This message was deleted' }
            : msg
        ));
      }
    } catch (err) {
      console.error('Failed to delete message:', err);
      setError('Failed to delete message');
    }
  };

  const handleCreateConversation = async (
    type: 'direct' | 'group',
    participantIds: number[],
    title?: string
  ) => {
    try {
      const response = await messagesApi.createConversation({
        type,
        participant_ids: participantIds,
        title
      });

      if (response.success && response.data) {
        // Add new conversation to list
        setConversations(prev => [response.data!, ...prev]);
        // Select the new conversation
        setSelectedConversation(response.data!);
        // Load messages (should be empty for new conversation)
        setMessages([]);
      }
    } catch (err) {
      console.error('Failed to create conversation:', err);
      throw err;
    }
  };

  const handleDeleteConversation = async (conversationId: number, event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent selecting the conversation

    if (!window.confirm('Are you sure you want to delete this conversation?')) {
      return;
    }

    try {
      const response = await messagesApi.deleteConversation(conversationId);

      if (response.success) {
        // Remove conversation from list
        setConversations(prev => prev.filter(conv => conv.id !== conversationId));

        // If this was the selected conversation, clear it
        if (selectedConversation?.id === conversationId) {
          setSelectedConversation(null);
          setMessages([]);
        }

        // Reload unread count
        loadUnreadCount();
      }
    } catch (err) {
      console.error('Failed to delete conversation:', err);
      setError('Failed to delete conversation');
    }
  };

  if (!state.user) {
    return (
      <PageContainer>
        <EmptyState>Please log in to access messaging</EmptyState>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <Sidebar>
        <SidebarHeader>
          <Title>
            Messages
            {unreadCount > 0 && <UnreadBadge>{unreadCount}</UnreadBadge>}
          </Title>
          <NewMessageButton onClick={() => setShowNewConversationModal(true)}>
            + New
          </NewMessageButton>
        </SidebarHeader>
        <ConversationList>
          {loading && conversations.length === 0 ? (
            <Loading>Loading conversations...</Loading>
          ) : conversations.length === 0 ? (
            <EmptyState>No conversations yet</EmptyState>
          ) : (
            conversations.map(conv => (
              <ConversationItem
                key={conv.id}
                active={selectedConversation?.id === conv.id}
                unread={conv.unread_count > 0}
                onClick={() => handleSelectConversation(conv)}
              >
                <ConversationContent>
                  <ConversationName>
                    {conv.type === 'direct'
                      ? conv.other_participants?.[0]?.username || 'Unknown User'
                      : conv.title || 'Group Chat'
                    }
                    {conv.unread_count > 0 && (
                      <UnreadBadge>{conv.unread_count}</UnreadBadge>
                    )}
                  </ConversationName>
                  <LastMessage>
                    {conv.last_message?.content || 'No messages yet'}
                  </LastMessage>
                </ConversationContent>
                <DeleteButton
                  className="delete-button"
                  onClick={(e) => handleDeleteConversation(conv.id, e)}
                  title="Delete conversation"
                >
                  ✕
                </DeleteButton>
              </ConversationItem>
            ))
          )}
        </ConversationList>
      </Sidebar>

      <ConversationContainer>
        {error ? (
          <Error>{error}</Error>
        ) : !selectedConversation ? (
          <EmptyState>Select a conversation to start messaging</EmptyState>
        ) : loading ? (
          <Loading>Loading messages...</Loading>
        ) : (
          <ConversationView
            messages={messages}
            onSendMessage={handleSendMessage}
            onEditMessage={handleEditMessage}
            onDeleteMessage={handleDeleteMessage}
            onReactionToggle={handleReactionToggle}
            conversationId={selectedConversation.id}
          />
        )}
      </ConversationContainer>

      {showNewConversationModal && (
        <NewConversationModal
          onClose={() => setShowNewConversationModal(false)}
          onCreate={handleCreateConversation}
        />
      )}
    </PageContainer>
  );
};
