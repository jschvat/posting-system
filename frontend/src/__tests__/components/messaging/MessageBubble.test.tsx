import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from 'styled-components';
import MessageBubble from '../../../components/messaging/MessageBubble';
import { mockMessage, mockUser } from '../../utils/testUtils';
import { theme } from '../../../styles/theme';

const renderWithTheme = (component: React.ReactElement) => {
  return render(
    <ThemeProvider theme={theme}>
      {component}
    </ThemeProvider>
  );
};

describe('MessageBubble', () => {
  const mockOnEdit = jest.fn();
  const mockOnDelete = jest.fn();
  const mockOnReply = jest.fn();
  const mockOnReactionToggle = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render message content', () => {
      renderWithTheme(
        <MessageBubble message={mockMessage} isOwnMessage={false} />
      );
      expect(screen.getByText(mockMessage.content)).toBeInTheDocument();
    });

    it('should render sender name for received messages', () => {
      renderWithTheme(
        <MessageBubble message={mockMessage} isOwnMessage={false} />
      );
      expect(screen.getByText(mockMessage.sender.username)).toBeInTheDocument();
    });

    it('should not render sender name for own messages', () => {
      renderWithTheme(
        <MessageBubble message={mockMessage} isOwnMessage={true} />
      );
      expect(screen.queryByText(mockMessage.sender.username)).not.toBeInTheDocument();
    });

    it('should render message timestamp', () => {
      renderWithTheme(
        <MessageBubble message={mockMessage} isOwnMessage={false} />
      );
      // Check for time-related text
      expect(screen.getByText(/ago|at/i)).toBeInTheDocument();
    });
  });

  describe('Message Types', () => {
    it('should render text message', () => {
      const textMessage = { ...mockMessage, message_type: 'text' as const };
      renderWithTheme(
        <MessageBubble message={textMessage} isOwnMessage={false} />
      );
      expect(screen.getByText(textMessage.content)).toBeInTheDocument();
    });

    it('should render image message', () => {
      const imageMessage = {
        ...mockMessage,
        message_type: 'image' as const,
        content: 'https://example.com/image.jpg',
      };
      renderWithTheme(
        <MessageBubble message={imageMessage} isOwnMessage={false} />
      );
      const image = screen.getByAltText(/message/i);
      expect(image).toBeInTheDocument();
      expect(image).toHaveAttribute('src', 'https://example.com/image.jpg');
    });

    it('should render file message with link', () => {
      const fileMessage = {
        ...mockMessage,
        message_type: 'file' as const,
        content: 'document.pdf',
      };
      renderWithTheme(
        <MessageBubble message={fileMessage} isOwnMessage={false} />
      );
      expect(screen.getByText(/document.pdf/i)).toBeInTheDocument();
    });
  });

  describe('Message Status', () => {
    it('should display edited indicator for edited messages', () => {
      const editedMessage = { ...mockMessage, is_edited: true };
      renderWithTheme(
        <MessageBubble message={editedMessage} isOwnMessage={false} />
      );
      expect(screen.getByText(/edited/i)).toBeInTheDocument();
    });

    it('should display deleted indicator for deleted messages', () => {
      const deletedMessage = {
        ...mockMessage,
        is_deleted: true,
        content: 'This message was deleted',
      };
      renderWithTheme(
        <MessageBubble message={deletedMessage} isOwnMessage={false} />
      );
      expect(screen.getByText(/deleted/i)).toBeInTheDocument();
    });
  });

  describe('Reply Context', () => {
    it('should display replied message context', () => {
      const messageWithReply = {
        ...mockMessage,
        replied_to_message: {
          message_id: 2,
          content: 'Original message',
          sender: { ...mockUser, username: 'otheruser' },
        },
      };
      renderWithTheme(
        <MessageBubble message={messageWithReply} isOwnMessage={false} />
      );
      expect(screen.getByText(/original message/i)).toBeInTheDocument();
      expect(screen.getByText(/otheruser/i)).toBeInTheDocument();
    });

    it('should not display reply context when no replied message', () => {
      renderWithTheme(
        <MessageBubble message={mockMessage} isOwnMessage={false} />
      );
      expect(screen.queryByText(/replying to/i)).not.toBeInTheDocument();
    });
  });

  describe('Message Actions', () => {
    it('should show edit button for own messages', () => {
      renderWithTheme(
        <MessageBubble
          message={mockMessage}
          isOwnMessage={true}
          onEdit={mockOnEdit}
        />
      );
      expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument();
    });

    it('should not show edit button for other users messages', () => {
      renderWithTheme(
        <MessageBubble
          message={mockMessage}
          isOwnMessage={false}
          onEdit={mockOnEdit}
        />
      );
      expect(screen.queryByRole('button', { name: /edit/i })).not.toBeInTheDocument();
    });

    it('should call onEdit when edit button is clicked', async () => {
      renderWithTheme(
        <MessageBubble
          message={mockMessage}
          isOwnMessage={true}
          onEdit={mockOnEdit}
        />
      );
      const user = userEvent.setup();

      await user.click(screen.getByRole('button', { name: /edit/i }));

      expect(mockOnEdit).toHaveBeenCalledWith(mockMessage);
    });

    it('should show delete button for own messages', () => {
      renderWithTheme(
        <MessageBubble
          message={mockMessage}
          isOwnMessage={true}
          onDelete={mockOnDelete}
        />
      );
      expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();
    });

    it('should call onDelete when delete button is clicked', async () => {
      renderWithTheme(
        <MessageBubble
          message={mockMessage}
          isOwnMessage={true}
          onDelete={mockOnDelete}
        />
      );
      const user = userEvent.setup();

      await user.click(screen.getByRole('button', { name: /delete/i }));

      expect(mockOnDelete).toHaveBeenCalledWith(mockMessage.message_id);
    });

    it('should show reply button for all messages', () => {
      renderWithTheme(
        <MessageBubble
          message={mockMessage}
          isOwnMessage={false}
          onReply={mockOnReply}
        />
      );
      expect(screen.getByRole('button', { name: /reply/i })).toBeInTheDocument();
    });

    it('should call onReply when reply button is clicked', async () => {
      renderWithTheme(
        <MessageBubble
          message={mockMessage}
          isOwnMessage={false}
          onReply={mockOnReply}
        />
      );
      const user = userEvent.setup();

      await user.click(screen.getByRole('button', { name: /reply/i }));

      expect(mockOnReply).toHaveBeenCalledWith(mockMessage);
    });
  });

  describe('Message Reactions', () => {
    it('should display reactions when present', () => {
      const messageWithReactions = {
        ...mockMessage,
        reactions: [
          { emoji: '👍', count: 5, user_reacted: false },
          { emoji: '❤️', count: 2, user_reacted: true },
        ],
      };
      renderWithTheme(
        <MessageBubble message={messageWithReactions} isOwnMessage={false} />
      );
      expect(screen.getByText('👍')).toBeInTheDocument();
      expect(screen.getByText('❤️')).toBeInTheDocument();
      expect(screen.getByText('5')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
    });

    it('should call onReactionToggle when reaction is clicked', async () => {
      const messageWithReactions = {
        ...mockMessage,
        reactions: [{ emoji: '👍', count: 5, user_reacted: false }],
      };
      renderWithTheme(
        <MessageBubble
          message={messageWithReactions}
          isOwnMessage={false}
          onReactionToggle={mockOnReactionToggle}
        />
      );
      const user = userEvent.setup();

      await user.click(screen.getByText('👍'));

      expect(mockOnReactionToggle).toHaveBeenCalledWith(mockMessage.message_id, '👍');
    });

    it('should highlight user\'s own reactions', () => {
      const messageWithReactions = {
        ...mockMessage,
        reactions: [
          { emoji: '👍', count: 5, user_reacted: true },
          { emoji: '❤️', count: 2, user_reacted: false },
        ],
      };
      renderWithTheme(
        <MessageBubble message={messageWithReactions} isOwnMessage={false} />
      );
      // Check that user's reaction has different styling
      const reactionButtons = screen.getAllByRole('button');
      const likedReaction = reactionButtons.find(btn => btn.textContent?.includes('👍'));
      expect(likedReaction).toHaveAttribute('data-user-reacted', 'true');
    });
  });

  describe('Read Receipts', () => {
    it('should display read receipts for own messages', () => {
      const messageWithReceipts = {
        ...mockMessage,
        read_by: [
          { user_id: 2, username: 'user2', read_at: new Date().toISOString() },
        ],
      };
      renderWithTheme(
        <MessageBubble message={messageWithReceipts} isOwnMessage={true} />
      );
      expect(screen.getByText(/read/i)).toBeInTheDocument();
    });

    it('should not display read receipts for other users messages', () => {
      const messageWithReceipts = {
        ...mockMessage,
        read_by: [
          { user_id: 2, username: 'user2', read_at: new Date().toISOString() },
        ],
      };
      renderWithTheme(
        <MessageBubble message={messageWithReceipts} isOwnMessage={false} />
      );
      expect(screen.queryByText(/read by/i)).not.toBeInTheDocument();
    });

    it('should show delivered status when not read', () => {
      const deliveredMessage = {
        ...mockMessage,
        read_by: [],
        delivered: true,
      };
      renderWithTheme(
        <MessageBubble message={deliveredMessage} isOwnMessage={true} />
      );
      expect(screen.getByText(/delivered/i)).toBeInTheDocument();
    });
  });

  describe('Styling', () => {
    it('should apply different styles for own messages', () => {
      const { container } = renderWithTheme(
        <MessageBubble message={mockMessage} isOwnMessage={true} />
      );
      const bubble = container.querySelector('[data-own-message="true"]');
      expect(bubble).toBeInTheDocument();
    });

    it('should apply different styles for received messages', () => {
      const { container } = renderWithTheme(
        <MessageBubble message={mockMessage} isOwnMessage={false} />
      );
      const bubble = container.querySelector('[data-own-message="false"]');
      expect(bubble).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have accessible button labels', () => {
      renderWithTheme(
        <MessageBubble
          message={mockMessage}
          isOwnMessage={true}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onReply={mockOnReply}
        />
      );
      expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /reply/i })).toBeInTheDocument();
    });
  });
});
