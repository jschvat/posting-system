/**
 * ReactionPicker Component - floating popup for emoji reactions
 */

import React, { useState } from 'react';
import styled from 'styled-components';
import {
  useFloating,
  autoUpdate,
  offset,
  flip,
  shift,
  useClick,
  useDismiss,
  useRole,
  useInteractions,
  FloatingFocusManager,
  FloatingPortal
} from '@floating-ui/react';

const TriggerButton = styled.button<{ $active?: boolean }>`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.sm};
  background: none;
  border: none;
  color: ${({ theme, $active }) => $active ? theme.colors.primary : theme.colors.text.secondary};
  font-size: 0.9rem;
  cursor: pointer;
  padding: ${({ theme }) => theme.spacing.sm};
  border-radius: ${({ theme }) => theme.borderRadius.sm};
  transition: all 0.2s ease;

  &:hover {
    background: ${({ theme }) => theme.colors.background};
    color: ${({ theme }) => theme.colors.primary};
  }

  .emoji {
    font-size: 1.1em;
  }
`;

const PopupContainer = styled.div`
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  box-shadow: ${({ theme }) => theme.shadows.lg};
  padding: ${({ theme }) => theme.spacing.md};
  z-index: 1000;
  min-width: 280px;
`;

const PopupTitle = styled.div`
  font-size: 0.85rem;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text.secondary};
  margin-bottom: ${({ theme }) => theme.spacing.sm};
  text-align: center;
`;

const EmojiGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: ${({ theme }) => theme.spacing.sm};
`;

const EmojiButton = styled.button<{ $selected?: boolean }>`
  width: 40px;
  height: 40px;
  border: none;
  border-radius: ${({ theme }) => theme.borderRadius.md};
  background: ${({ theme, $selected }) =>
    $selected ? theme.colors.primary + '20' : theme.colors.background
  };
  cursor: pointer;
  font-size: 1.2rem;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  position: relative;

  &:hover {
    background: ${({ theme }) => theme.colors.primary + '30'};
    transform: scale(1.1);
  }

  &::after {
    content: '';
    position: absolute;
    inset: -2px;
    border: 2px solid ${({ theme }) => theme.colors.primary};
    border-radius: ${({ theme }) => theme.borderRadius.md};
    opacity: ${({ $selected }) => $selected ? 1 : 0};
    transition: opacity 0.2s ease;
  }
`;

const EmojiContainer = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const CountBadge = styled.span`
  position: absolute;
  top: -2px;
  right: -2px;
  background: ${({ theme }) => theme.colors.primary};
  color: white;
  font-size: 0.7rem;
  font-weight: 600;
  min-width: 16px;
  height: 16px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 4px;
  z-index: 1;
`;

const RemoveButton = styled.button`
  width: 100%;
  margin-top: ${({ theme }) => theme.spacing.sm};
  padding: ${({ theme }) => theme.spacing.sm};
  background: ${({ theme }) => theme.colors.background};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: ${({ theme }) => theme.colors.error + '20'};
    color: ${({ theme }) => theme.colors.error};
    border-color: ${({ theme }) => theme.colors.error};
  }
`;

const REACTION_EMOJIS = [
  { emoji: '❤️', name: 'heart', label: 'Love' },
  { emoji: '👍', name: 'thumbs_up', label: 'Like' },
  { emoji: '👎', name: 'thumbs_down', label: 'Dislike' },
  { emoji: '😂', name: 'joy', label: 'Funny' },
  { emoji: '😮', name: 'astonished', label: 'Wow' },
  { emoji: '😢', name: 'cry', label: 'Sad' },
  { emoji: '😡', name: 'rage', label: 'Angry' },
  { emoji: '🤔', name: 'thinking', label: 'Thinking' },
  { emoji: '🎉', name: 'tada', label: 'Celebrate' },
  { emoji: '👏', name: 'clap', label: 'Applause' },
  { emoji: '🔥', name: 'fire', label: 'Fire' },
  { emoji: '💯', name: '100', label: 'Perfect' }
];

interface ReactionCount {
  emoji_name: string;
  count: number;
}

interface ReactionPickerProps {
  currentReaction: string | null;
  totalReactions: number;
  reactionCounts: ReactionCount[];
  onReactionSelect: (emojiName: string) => void;
  onReactionRemove: () => void;
}

const ReactionPicker: React.FC<ReactionPickerProps> = ({
  currentReaction,
  totalReactions,
  reactionCounts,
  onReactionSelect,
  onReactionRemove
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const { refs, floatingStyles, context } = useFloating({
    open: isOpen,
    onOpenChange: setIsOpen,
    middleware: [
      offset(10),
      flip(),
      shift()
    ],
    whileElementsMounted: autoUpdate,
  });

  const click = useClick(context);
  const dismiss = useDismiss(context);
  const role = useRole(context);

  const { getReferenceProps, getFloatingProps } = useInteractions([
    click,
    dismiss,
    role,
  ]);

  const handleEmojiSelect = (emojiName: string) => {
    onReactionSelect(emojiName);
    setIsOpen(false);
  };

  const handleRemoveReaction = () => {
    onReactionRemove();
    setIsOpen(false);
  };

  // Get current reaction emoji for display
  const currentEmojiData = REACTION_EMOJIS.find(r =>
    r.name === currentReaction
  );

  return (
    <>
      <TriggerButton
        ref={refs.setReference}
        {...getReferenceProps()}
        $active={!!currentReaction}
      >
        <span className="emoji">
          {currentReaction ? currentEmojiData?.emoji : '👍'}
        </span>
        <span>{totalReactions}</span>
      </TriggerButton>

      {isOpen && (
        <FloatingPortal>
          <FloatingFocusManager context={context} modal={false}>
            <div
              ref={refs.setFloating}
              style={floatingStyles}
              {...getFloatingProps()}
            >
              <PopupContainer>
                <PopupTitle>React to this post</PopupTitle>
                <EmojiGrid>
                  {REACTION_EMOJIS.map((reaction) => {
                    const reactionCount = reactionCounts.find(rc => rc.emoji_name === reaction.name)?.count || 0;
                    return (
                      <EmojiButton
                        key={reaction.name}
                        onClick={() => handleEmojiSelect(reaction.name)}
                        title={reaction.label}
                        $selected={currentReaction === reaction.name}
                      >
                        <EmojiContainer>
                          {reaction.emoji}
                          {reactionCount > 0 && (
                            <CountBadge>{reactionCount}</CountBadge>
                          )}
                        </EmojiContainer>
                      </EmojiButton>
                    );
                  })}
                </EmojiGrid>
                {currentReaction && (
                  <RemoveButton onClick={handleRemoveReaction}>
                    Remove reaction
                  </RemoveButton>
                )}
              </PopupContainer>
            </div>
          </FloatingFocusManager>
        </FloatingPortal>
      )}
    </>
  );
};

export default ReactionPicker;