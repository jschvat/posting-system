/**
 * NewConversationModal Component
 * Modal for creating a new conversation with user search
 */

import React, { useState } from 'react';
import styled from 'styled-components';
import { usersApi } from '../../services/api';
import { User } from '../../types';

const Overlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
`;

const Modal = styled.div`
  background: ${({ theme }) => theme.colors.surface};
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  padding: 24px;
  width: 90%;
  max-width: 500px;
  max-height: 600px;
  display: flex;
  flex-direction: column;
  box-shadow: ${({ theme }) => theme.shadows.lg};
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;

  h2 {
    margin: 0;
    font-size: 1.25rem;
    font-weight: 600;
    color: ${({ theme }) => theme.colors.text.primary};
  }
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  font-size: 1.5rem;
  color: ${({ theme }) => theme.colors.text.secondary};
  cursor: pointer;
  padding: 4px 8px;

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
  }
`;

const SearchInput = styled.input`
  width: 100%;
  padding: 12px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  font-size: 1rem;
  margin-bottom: 16px;
  background: ${({ theme }) => theme.colors.background};
  color: ${({ theme }) => theme.colors.text.primary};

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.primary};
  }

  &::placeholder {
    color: ${({ theme }) => theme.colors.text.secondary};
  }
`;

const UserList = styled.div`
  flex: 1;
  overflow-y: auto;
  margin-bottom: 16px;
`;

const UserItem = styled.div<{ $selected: boolean }>`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border-radius: ${({ theme }) => theme.borderRadius.md};
  cursor: pointer;
  background: ${({ theme, $selected }) =>
    $selected ? theme.colors.primary + '20' : 'transparent'};
  transition: background 0.2s;

  &:hover {
    background: ${({ theme, $selected }) =>
      $selected ? theme.colors.primary + '30' : theme.colors.background};
  }
`;

const UserAvatar = styled.div`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: ${({ theme }) => theme.colors.primary};
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 600;
  flex-shrink: 0;
  overflow: hidden;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`;

const UserInfo = styled.div`
  flex: 1;

  .name {
    font-weight: 500;
    color: ${({ theme }) => theme.colors.text.primary};
    margin-bottom: 2px;
  }

  .username {
    font-size: 0.875rem;
    color: ${({ theme }) => theme.colors.text.secondary};
  }
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 40px 20px;
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: 0.875rem;
`;

const Actions = styled.div`
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  margin-top: auto;
`;

const Button = styled.button<{ $primary?: boolean }>`
  padding: 10px 20px;
  border-radius: ${({ theme }) => theme.borderRadius.md};
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  border: 1px solid ${({ theme, $primary }) =>
    $primary ? theme.colors.primary : theme.colors.border};
  background: ${({ theme, $primary }) =>
    $primary ? theme.colors.primary : 'transparent'};
  color: ${({ theme, $primary }) =>
    $primary ? 'white' : theme.colors.text.primary};

  &:hover {
    background: ${({ theme, $primary }) =>
      $primary ? theme.colors.primary + 'dd' : theme.colors.background};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const ConversationType = styled.div`
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
`;

const TypeButton = styled.button<{ $active: boolean }>`
  flex: 1;
  padding: 8px 16px;
  border-radius: ${({ theme }) => theme.borderRadius.md};
  border: 1px solid ${({ theme, $active }) =>
    $active ? theme.colors.primary : theme.colors.border};
  background: ${({ theme, $active }) =>
    $active ? theme.colors.primary + '20' : 'transparent'};
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    border-color: ${({ theme }) => theme.colors.primary};
  }
`;

const GroupTitleInput = styled.input`
  width: 100%;
  padding: 10px 12px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  font-size: 0.875rem;
  margin-bottom: 12px;
  background: ${({ theme }) => theme.colors.background};
  color: ${({ theme }) => theme.colors.text.primary};

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.primary};
  }

  &::placeholder {
    color: ${({ theme }) => theme.colors.text.secondary};
  }
`;

interface NewConversationModalProps {
  onClose: () => void;
  onCreate: (type: 'direct' | 'group', participantIds: number[], title?: string) => Promise<void>;
}

export const NewConversationModal: React.FC<NewConversationModalProps> = ({
  onClose,
  onCreate
}) => {
  const [type, setType] = useState<'direct' | 'group'>('direct');
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<number[]>([]);
  const [groupTitle, setGroupTitle] = useState('');
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);

  const searchUsers = async (query: string) => {
    if (!query.trim()) {
      setUsers([]);
      return;
    }

    try {
      setLoading(true);
      const response = await usersApi.getUsers({ search: query, limit: 20 });
      setUsers((response.data as any).users || []);
    } catch (err) {
      console.error('Failed to search users:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    searchUsers(query);
  };

  const toggleUser = (userId: number) => {
    if (type === 'direct') {
      // For direct messages, only one user can be selected
      setSelectedUsers([userId]);
    } else {
      // For group chats, multiple users can be selected
      setSelectedUsers(prev =>
        prev.includes(userId)
          ? prev.filter(id => id !== userId)
          : [...prev, userId]
      );
    }
  };

  const handleCreate = async () => {
    if (selectedUsers.length === 0) return;
    if (type === 'group' && !groupTitle.trim()) {
      alert('Please enter a group title');
      return;
    }

    try {
      setCreating(true);
      await onCreate(type, selectedUsers, type === 'group' ? groupTitle : undefined);
      onClose();
    } catch (err) {
      console.error('Failed to create conversation:', err);
      alert('Failed to create conversation');
    } finally {
      setCreating(false);
    }
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <Overlay onClick={handleOverlayClick}>
      <Modal>
        <Header>
          <h2>New Message</h2>
          <CloseButton onClick={onClose}>&times;</CloseButton>
        </Header>

        <ConversationType>
          <TypeButton
            $active={type === 'direct'}
            onClick={() => setType('direct')}
          >
            Direct Message
          </TypeButton>
          <TypeButton
            $active={type === 'group'}
            onClick={() => setType('group')}
          >
            Group Chat
          </TypeButton>
        </ConversationType>

        {type === 'group' && (
          <GroupTitleInput
            type="text"
            placeholder="Group title"
            value={groupTitle}
            onChange={(e) => setGroupTitle(e.target.value)}
          />
        )}

        <SearchInput
          type="text"
          placeholder="Search users..."
          value={searchQuery}
          onChange={handleSearchChange}
        />

        <UserList>
          {loading ? (
            <EmptyState>Searching...</EmptyState>
          ) : users.length === 0 ? (
            <EmptyState>
              {searchQuery ? 'No users found' : 'Start typing to search for users'}
            </EmptyState>
          ) : (
            users.map(user => (
              <UserItem
                key={user.id}
                $selected={selectedUsers.includes(user.id)}
                onClick={() => toggleUser(user.id)}
              >
                <UserAvatar>
                  {user.avatar_url ? (
                    <img src={user.avatar_url} alt={user.username} />
                  ) : (
                    `${user.first_name?.[0] || ''}${user.last_name?.[0] || ''}`
                  )}
                </UserAvatar>
                <UserInfo>
                  <div className="name">
                    {user.first_name} {user.last_name}
                  </div>
                  <div className="username">@{user.username}</div>
                </UserInfo>
              </UserItem>
            ))
          )}
        </UserList>

        <Actions>
          <Button onClick={onClose}>Cancel</Button>
          <Button
            $primary
            onClick={handleCreate}
            disabled={selectedUsers.length === 0 || creating}
          >
            {creating ? 'Creating...' : 'Create'}
          </Button>
        </Actions>
      </Modal>
    </Overlay>
  );
};
