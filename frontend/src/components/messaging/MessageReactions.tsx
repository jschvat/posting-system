import React, { useState } from 'react';
import styled from 'styled-components';

interface Reaction {
  emoji: string;
  count: number;
  users: Array<{ user_id: number; username: string }>;
}

interface MessageReactionsProps {
  messageId: number;
  reactions: Reaction[];
  currentUserId: number;
  onReactionToggle: (messageId: number, emoji: string) => void;
}

const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

const ReactionsContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 4px;
`;

const ReactionBubble = styled.button<{ isActive: boolean }>`
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: 12px;
  border: 1px solid ${props => props.isActive ? props.theme.colors.primary : props.theme.colors.border};
  background: ${props => props.isActive ? 'rgba(0, 122, 255, 0.1)' : props.theme.colors.surface};
  cursor: pointer;
  font-size: 0.813rem;
  transition: all 0.2s ease;

  &:hover {
    transform: scale(1.1);
    border-color: ${props => props.theme.colors.primary};
  }

  &:active {
    transform: scale(0.95);
  }
`;

const Emoji = styled.span`
  font-size: 1rem;
`;

const Count = styled.span`
  font-size: 0.75rem;
  color: ${props => props.theme.colors.text.primary};
  font-weight: 500;
`;

const AddReactionButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: 1px solid ${props => props.theme.colors.border};
  background: ${props => props.theme.colors.surface};
  cursor: pointer;
  font-size: 0.875rem;
  transition: all 0.2s ease;

  &:hover {
    transform: scale(1.1);
    border-color: ${props => props.theme.colors.primary};
    background: rgba(0, 122, 255, 0.1);
  }
`;

const EmojiPicker = styled.div`
  position: absolute;
  bottom: calc(100% + 4px);
  left: 0;
  display: flex;
  gap: 4px;
  padding: 8px;
  background: ${props => props.theme.colors.surface};
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
  z-index: 1000;
  white-space: nowrap;
`;

const EmojiOption = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  cursor: pointer;
  font-size: 1.25rem;
  border-radius: 8px;
  transition: all 0.2s ease;

  &:hover {
    background: ${props => props.theme.colors.background};
    transform: scale(1.2);
  }
`;

const ReactionWrapper = styled.div`
  position: relative;
`;

export const MessageReactions: React.FC<MessageReactionsProps> = ({
  messageId,
  reactions,
  currentUserId,
  onReactionToggle
}) => {
  const [showPicker, setShowPicker] = useState(false);

  const handleReactionClick = (emoji: string) => {
    onReactionToggle(messageId, emoji);
    setShowPicker(false);
  };

  const isUserReacted = (reaction: Reaction): boolean => {
    return reaction.users.some(user => user.user_id === currentUserId);
  };

  return (
    <ReactionsContainer>
      {reactions.map((reaction) => (
        <ReactionBubble
          key={reaction.emoji}
          isActive={isUserReacted(reaction)}
          onClick={() => handleReactionClick(reaction.emoji)}
          title={reaction.users.map(u => u.username).join(', ')}
        >
          <Emoji>{reaction.emoji}</Emoji>
          <Count>{reaction.count}</Count>
        </ReactionBubble>
      ))}

      <ReactionWrapper>
        <AddReactionButton onClick={() => setShowPicker(!showPicker)}>
          +
        </AddReactionButton>
        {showPicker && (
          <EmojiPicker>
            {QUICK_REACTIONS.map((emoji) => (
              <EmojiOption
                key={emoji}
                onClick={() => handleReactionClick(emoji)}
              >
                {emoji}
              </EmojiOption>
            ))}
          </EmojiPicker>
        )}
      </ReactionWrapper>
    </ReactionsContainer>
  );
};

export default MessageReactions;
