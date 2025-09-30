/**
 * ReactionsPopup Component - hover popup showing all reactions and counts
 */

import React, { useState } from 'react';
import styled from 'styled-components';
import {
  useFloating,
  autoUpdate,
  offset,
  flip,
  shift,
  useHover,
  useDismiss,
  useRole,
  useInteractions,
  FloatingPortal
} from '@floating-ui/react';

const PopupContainer = styled.div`
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  box-shadow: ${({ theme }) => theme.shadows.lg};
  padding: ${({ theme }) => theme.spacing.sm} ${({ theme }) => theme.spacing.md};
  z-index: 1000;
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.sm};
`;

const ReactionBubble = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: ${({ theme }) => theme.spacing.xs};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  transition: all 0.2s ease;
  cursor: default;

  &:hover {
    background: ${({ theme }) => theme.colors.background};
    transform: scale(1.1);
  }
`;

const ReactionEmoji = styled.span`
  font-size: 1.3rem;
  line-height: 1;
`;

const ReactionCount = styled.span`
  position: absolute;
  bottom: -2px;
  right: -2px;
  background: ${({ theme }) => theme.colors.primary};
  color: white;
  font-size: 0.65rem;
  font-weight: 700;
  min-width: 16px;
  height: 16px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 3px;
  border: 2px solid ${({ theme }) => theme.colors.surface};
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
`;

const TriggerElement = styled.div`
  cursor: pointer;
  display: inline-flex;
  align-items: center;
`;

// Emoji mapping - same as ReactionPicker
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

interface ReactionsPopupProps {
  reactionCounts: ReactionCount[];
  totalReactions: number;
  children: React.ReactNode;
}

const ReactionsPopup: React.FC<ReactionsPopupProps> = ({
  reactionCounts,
  totalReactions,
  children
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

  const hover = useHover(context, {
    delay: { open: 300, close: 150 }
  });
  const dismiss = useDismiss(context);
  const role = useRole(context, { role: 'tooltip' });

  const { getReferenceProps, getFloatingProps } = useInteractions([
    hover,
    dismiss,
    role,
  ]);

  // Filter and sort reactions that actually exist
  const displayReactions = reactionCounts
    .map(reactionCount => {
      const emojiData = REACTION_EMOJIS.find(emoji => emoji.name === reactionCount.emoji_name);
      return {
        ...reactionCount,
        emoji: emojiData?.emoji || '❓',
        label: emojiData?.label || reactionCount.emoji_name
      };
    })
    .sort((a, b) => b.count - a.count); // Sort by count descending

  // Don't show popup if no reactions
  if (totalReactions === 0) {
    return <>{children}</>;
  }

  return (
    <>
      <TriggerElement
        ref={refs.setReference}
        {...getReferenceProps()}
      >
        {children}
      </TriggerElement>

      {isOpen && (
        <FloatingPortal>
          <div
            ref={refs.setFloating}
            style={floatingStyles}
            {...getFloatingProps()}
          >
            <PopupContainer>
              {displayReactions.map((reaction) => (
                <ReactionBubble key={reaction.emoji_name} title={`${reaction.label}: ${reaction.count}`}>
                  <ReactionEmoji>{reaction.emoji}</ReactionEmoji>
                  <ReactionCount>{reaction.count}</ReactionCount>
                </ReactionBubble>
              ))}
            </PopupContainer>
          </div>
        </FloatingPortal>
      )}
    </>
  );
};

export default ReactionsPopup;