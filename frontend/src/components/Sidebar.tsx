/**
 * Sidebar component - left navigation panel
 */

import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import styled from 'styled-components';

// Styled components
const SidebarContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.md};
`;

const Section = styled.div`
  margin-bottom: ${({ theme }) => theme.spacing.lg};
`;

const SectionTitle = styled.h3`
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: 0.9rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: ${({ theme }) => theme.spacing.md};
`;

const NavList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.xs};
`;

const NavItem = styled.li`
  margin: 0;
`;

const NavLink = styled(Link)<{ $isActive?: boolean }>`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.sm};
  padding: ${({ theme }) => theme.spacing.sm} ${({ theme }) => theme.spacing.md};
  color: ${({ theme, $isActive }) =>
    $isActive ? theme.colors.primary : theme.colors.text.primary
  };
  background: ${({ theme, $isActive }) =>
    $isActive ? `${theme.colors.primary}15` : 'transparent'
  };
  text-decoration: none;
  border-radius: ${({ theme }) => theme.borderRadius.md};
  font-weight: ${({ $isActive }) => $isActive ? '600' : '400'};
  transition: all 0.2s;

  &:hover {
    background: ${({ theme, $isActive }) =>
      $isActive ? `${theme.colors.primary}15` : theme.colors.background
    };
    text-decoration: none;
  }
`;

const IconPlaceholder = styled.span`
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
`;

const QuickStats = styled.div`
  background: ${({ theme }) => theme.colors.background};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  padding: ${({ theme }) => theme.spacing.md};
`;

const StatItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: ${({ theme }) => theme.spacing.xs} 0;
  font-size: 0.9rem;

  &:not(:last-child) {
    border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  }
`;

const StatLabel = styled.span`
  color: ${({ theme }) => theme.colors.text.secondary};
`;

const StatValue = styled.span`
  color: ${({ theme }) => theme.colors.text.primary};
  font-weight: 600;
`;

/**
 * Sidebar Component
 */
const Sidebar: React.FC = () => {
  const location = useLocation();

  // Mock user data
  const mockUser = {
    id: 1,
    username: 'demouser'
  };

  const isActive = (path: string): boolean => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <SidebarContent>
      {/* Main Navigation */}
      <Section>
        <SectionTitle>Navigation</SectionTitle>
        <NavList>
          <NavItem>
            <NavLink to="/" $isActive={isActive('/')}>
              <IconPlaceholder>🏠</IconPlaceholder>
              Home Feed
            </NavLink>
          </NavItem>
          <NavItem>
            <NavLink to="/create" $isActive={isActive('/create')}>
              <IconPlaceholder>✏️</IconPlaceholder>
              Create Post
            </NavLink>
          </NavItem>
          <NavItem>
            <NavLink
              to={`/user/${mockUser.id}`}
              $isActive={isActive(`/user/${mockUser.id}`)}
            >
              <IconPlaceholder>👤</IconPlaceholder>
              My Profile
            </NavLink>
          </NavItem>
        </NavList>
      </Section>

      {/* Quick Stats */}
      <Section>
        <SectionTitle>Quick Stats</SectionTitle>
        <QuickStats>
          <StatItem>
            <StatLabel>Total Posts</StatLabel>
            <StatValue>-</StatValue>
          </StatItem>
          <StatItem>
            <StatLabel>Comments</StatLabel>
            <StatValue>-</StatValue>
          </StatItem>
          <StatItem>
            <StatLabel>Reactions</StatLabel>
            <StatValue>-</StatValue>
          </StatItem>
        </QuickStats>
      </Section>

      {/* Popular Emojis */}
      <Section>
        <SectionTitle>Popular Reactions</SectionTitle>
        <QuickStats>
          <StatItem>
            <StatLabel>👍 Like</StatLabel>
            <StatValue>-</StatValue>
          </StatItem>
          <StatItem>
            <StatLabel>❤️ Love</StatLabel>
            <StatValue>-</StatValue>
          </StatItem>
          <StatItem>
            <StatLabel>😂 Laugh</StatLabel>
            <StatValue>-</StatValue>
          </StatItem>
          <StatItem>
            <StatLabel>🔥 Fire</StatLabel>
            <StatValue>-</StatValue>
          </StatItem>
        </QuickStats>
      </Section>

      {/* Footer Info */}
      <Section style={{ marginTop: 'auto', fontSize: '0.8rem', color: '#8a8d91' }}>
        <p>
          Built with React, TypeScript, and Node.js
        </p>
      </Section>
    </SidebarContent>
  );
};

export default Sidebar;