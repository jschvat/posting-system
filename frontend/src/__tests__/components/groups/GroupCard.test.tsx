import React from 'react';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import GroupCard from '../../../components/groups/GroupCard';
import { renderWithProviders, mockGroup, mockUser } from '../../utils/testUtils';

describe('GroupCard', () => {
  const mockOnJoin = jest.fn();
  const mockOnLeave = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render group name', () => {
      renderWithProviders(<GroupCard group={mockGroup} />);
      expect(screen.getByText(mockGroup.name)).toBeInTheDocument();
    });

    it('should render group description', () => {
      renderWithProviders(<GroupCard group={mockGroup} />);
      expect(screen.getByText(mockGroup.description)).toBeInTheDocument();
    });

    it('should render group icon when available', () => {
      const groupWithIcon = {
        ...mockGroup,
        icon_url: 'https://example.com/icon.jpg',
      };
      renderWithProviders(<GroupCard group={groupWithIcon} />);
      const icon = screen.getByAltText(`${mockGroup.name} icon`);
      expect(icon).toBeInTheDocument();
      expect(icon).toHaveAttribute('src', 'https://example.com/icon.jpg');
    });

    it('should render fallback icon when no icon_url', () => {
      renderWithProviders(<GroupCard group={mockGroup} />);
      // Fallback would be initials or default icon
      expect(screen.getByText(mockGroup.name[0])).toBeInTheDocument();
    });

    it('should render member count', () => {
      renderWithProviders(<GroupCard group={mockGroup} />);
      expect(screen.getByText(/10.*member/i)).toBeInTheDocument();
    });

    it('should render post count', () => {
      renderWithProviders(<GroupCard group={mockGroup} />);
      expect(screen.getByText(/5.*post/i)).toBeInTheDocument();
    });
  });

  describe('Member Count Formatting', () => {
    it('should format large member counts with K', () => {
      const largeGroup = { ...mockGroup, member_count: 5000 };
      renderWithProviders(<GroupCard group={largeGroup} />);
      expect(screen.getByText(/5K.*member/i)).toBeInTheDocument();
    });

    it('should format very large member counts with M', () => {
      const veryLargeGroup = { ...mockGroup, member_count: 2500000 };
      renderWithProviders(<GroupCard group={veryLargeGroup} />);
      expect(screen.getByText(/2\.5M.*member/i)).toBeInTheDocument();
    });

    it('should handle singular member text', () => {
      const singleMemberGroup = { ...mockGroup, member_count: 1 };
      renderWithProviders(<GroupCard group={singleMemberGroup} />);
      expect(screen.getByText(/1.*member$/i)).toBeInTheDocument();
    });
  });

  describe('Post Count Formatting', () => {
    it('should format large post counts with K', () => {
      const activeGroup = { ...mockGroup, post_count: 3500 };
      renderWithProviders(<GroupCard group={activeGroup} />);
      expect(screen.getByText(/3\.5K.*post/i)).toBeInTheDocument();
    });

    it('should handle singular post text', () => {
      const newGroup = { ...mockGroup, post_count: 1 };
      renderWithProviders(<GroupCard group={newGroup} />);
      expect(screen.getByText(/1.*post$/i)).toBeInTheDocument();
    });
  });

  describe('Visibility Badge', () => {
    it('should display private badge for private groups', () => {
      const privateGroup = { ...mockGroup, visibility: 'private' as const };
      renderWithProviders(<GroupCard group={privateGroup} />);
      expect(screen.getByText(/private/i)).toBeInTheDocument();
    });

    it('should display invite-only badge', () => {
      const inviteGroup = { ...mockGroup, visibility: 'invite_only' as const };
      renderWithProviders(<GroupCard group={inviteGroup} />);
      expect(screen.getByText(/invite.only/i)).toBeInTheDocument();
    });

    it('should not display badge for public groups', () => {
      const publicGroup = { ...mockGroup, visibility: 'public' as const };
      renderWithProviders(<GroupCard group={publicGroup} />);
      expect(screen.queryByText(/private|invite/i)).not.toBeInTheDocument();
    });
  });

  describe('Role Badge', () => {
    it('should display admin badge when user is admin', () => {
      renderWithProviders(
        <GroupCard
          group={mockGroup}
          isMember={true}
          userRole="admin"
        />
      );
      expect(screen.getByText(/admin/i)).toBeInTheDocument();
    });

    it('should display moderator badge when user is moderator', () => {
      renderWithProviders(
        <GroupCard
          group={mockGroup}
          isMember={true}
          userRole="moderator"
        />
      );
      expect(screen.getByText(/moderator/i)).toBeInTheDocument();
    });

    it('should not display role badge for regular members', () => {
      renderWithProviders(
        <GroupCard
          group={mockGroup}
          isMember={true}
          userRole="member"
        />
      );
      expect(screen.queryByText(/admin|moderator/i)).not.toBeInTheDocument();
    });

    it('should not display role badge when not a member', () => {
      renderWithProviders(
        <GroupCard
          group={mockGroup}
          isMember={false}
        />
      );
      expect(screen.queryByText(/admin|moderator/i)).not.toBeInTheDocument();
    });
  });

  describe('Join/Leave Button', () => {
    it('should display join button when showJoinButton is true and not a member', () => {
      renderWithProviders(
        <GroupCard
          group={mockGroup}
          showJoinButton={true}
          isMember={false}
          onJoin={mockOnJoin}
        />
      );
      expect(screen.getByRole('button', { name: /join/i })).toBeInTheDocument();
    });

    it('should display leave button when member', () => {
      renderWithProviders(
        <GroupCard
          group={mockGroup}
          showJoinButton={true}
          isMember={true}
          onLeave={mockOnLeave}
        />
      );
      expect(screen.getByRole('button', { name: /leave/i })).toBeInTheDocument();
    });

    it('should not display join button when showJoinButton is false', () => {
      renderWithProviders(
        <GroupCard
          group={mockGroup}
          showJoinButton={false}
          isMember={false}
        />
      );
      expect(screen.queryByRole('button', { name: /join/i })).not.toBeInTheDocument();
    });

    it('should call onJoin when join button is clicked', async () => {
      renderWithProviders(
        <GroupCard
          group={mockGroup}
          showJoinButton={true}
          isMember={false}
          onJoin={mockOnJoin}
        />
      );
      const user = userEvent.setup();

      await user.click(screen.getByRole('button', { name: /join/i }));

      expect(mockOnJoin).toHaveBeenCalledWith(mockGroup.group_id);
    });

    it('should call onLeave when leave button is clicked', async () => {
      renderWithProviders(
        <GroupCard
          group={mockGroup}
          showJoinButton={true}
          isMember={true}
          onLeave={mockOnLeave}
        />
      );
      const user = userEvent.setup();

      await user.click(screen.getByRole('button', { name: /leave/i }));

      expect(mockOnLeave).toHaveBeenCalledWith(mockGroup.group_id);
    });
  });

  describe('Navigation', () => {
    it('should have clickable link to group page', () => {
      renderWithProviders(<GroupCard group={mockGroup} />);
      const link = screen.getByRole('link', { name: new RegExp(mockGroup.name, 'i') });
      expect(link).toHaveAttribute('href', `/groups/${mockGroup.slug}`);
    });

    it('should navigate on card click', async () => {
      renderWithProviders(<GroupCard group={mockGroup} />);
      const link = screen.getByRole('link', { name: new RegExp(mockGroup.name, 'i') });
      expect(link).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle group with zero members', () => {
      const emptyGroup = { ...mockGroup, member_count: 0 };
      renderWithProviders(<GroupCard group={emptyGroup} />);
      expect(screen.getByText(/0.*member/i)).toBeInTheDocument();
    });

    it('should handle group with zero posts', () => {
      const newGroup = { ...mockGroup, post_count: 0 };
      renderWithProviders(<GroupCard group={newGroup} />);
      expect(screen.getByText(/0.*post/i)).toBeInTheDocument();
    });

    it('should handle missing description', () => {
      const noDescGroup = { ...mockGroup, description: '' };
      renderWithProviders(<GroupCard group={noDescGroup} />);
      expect(screen.queryByText(mockGroup.description)).not.toBeInTheDocument();
    });

    it('should handle very long group names', () => {
      const longNameGroup = {
        ...mockGroup,
        name: 'This is a very long group name that should be handled properly',
      };
      renderWithProviders(<GroupCard group={longNameGroup} />);
      expect(screen.getByText(longNameGroup.name)).toBeInTheDocument();
    });

    it('should handle very long descriptions', () => {
      const longDescGroup = {
        ...mockGroup,
        description: 'This is a very long description that goes on and on and should be truncated or handled gracefully in the UI',
      };
      renderWithProviders(<GroupCard group={longDescGroup} />);
      expect(screen.getByText(longDescGroup.description)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have accessible group link', () => {
      renderWithProviders(<GroupCard group={mockGroup} />);
      const link = screen.getByRole('link');
      expect(link).toHaveAccessibleName();
    });

    it('should have accessible join button', () => {
      renderWithProviders(
        <GroupCard
          group={mockGroup}
          showJoinButton={true}
          isMember={false}
          onJoin={mockOnJoin}
        />
      );
      const button = screen.getByRole('button', { name: /join/i });
      expect(button).toHaveAccessibleName();
    });

    it('should have alt text for group icon', () => {
      const groupWithIcon = {
        ...mockGroup,
        icon_url: 'https://example.com/icon.jpg',
      };
      renderWithProviders(<GroupCard group={groupWithIcon} />);
      const icon = screen.getByAltText(`${mockGroup.name} icon`);
      expect(icon).toBeInTheDocument();
    });
  });
});
