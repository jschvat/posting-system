/**
 * Header component - top navigation bar for the application
 */

import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import styled from 'styled-components';

// Styled components
const HeaderContainer = styled.header`
  background: ${({ theme }) => theme.colors.surface};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  box-shadow: ${({ theme }) => theme.shadows.sm};
  position: sticky;
  top: 0;
  z-index: 1000;
`;

const HeaderContent = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 ${({ theme }) => theme.spacing.md};
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 60px;
`;

const Logo = styled(Link)`
  font-size: 1.5rem;
  font-weight: bold;
  color: ${({ theme }) => theme.colors.primary};
  text-decoration: none;

  &:hover {
    text-decoration: none;
  }
`;

const Nav = styled.nav`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.lg};

  @media (max-width: ${({ theme }) => theme.breakpoints.tablet}) {
    gap: ${({ theme }) => theme.spacing.md};
  }
`;

const NavLink = styled(Link)<{ $isActive?: boolean }>`
  color: ${({ theme, $isActive }) =>
    $isActive ? theme.colors.primary : theme.colors.text.primary
  };
  text-decoration: none;
  font-weight: ${({ $isActive }) => $isActive ? '600' : '400'};
  padding: ${({ theme }) => theme.spacing.sm} ${({ theme }) => theme.spacing.md};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  transition: all 0.2s;

  &:hover {
    background: ${({ theme }) => theme.colors.background};
    text-decoration: none;
  }

  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    padding: ${({ theme }) => theme.spacing.sm};
    font-size: 0.9rem;
  }
`;

const CreateButton = styled(Link)`
  background: ${({ theme }) => theme.colors.primary};
  color: white;
  padding: ${({ theme }) => theme.spacing.sm} ${({ theme }) => theme.spacing.md};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  text-decoration: none;
  font-weight: 500;
  transition: background 0.2s;

  &:hover {
    background: ${({ theme }) => theme.colors.primary}dd;
    text-decoration: none;
  }

  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    padding: ${({ theme }) => theme.spacing.sm};
    font-size: 0.9rem;
  }
`;

const UserSection = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.md};
`;

const UserAvatar = styled.div`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: ${({ theme }) => theme.colors.primary};
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: bold;
  font-size: 0.9rem;
`;

/**
 * Header Component
 */
const Header: React.FC = () => {
  const location = useLocation();

  // Mock user data (will be replaced with real authentication)
  const mockUser = {
    id: 1,
    first_name: 'Demo',
    last_name: 'User',
    username: 'demouser'
  };

  const isActive = (path: string): boolean => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <HeaderContainer>
      <HeaderContent>
        {/* Logo */}
        <Logo to="/">
          Social Platform
        </Logo>

        {/* Main Navigation */}
        <Nav>
          <NavLink to="/" $isActive={isActive('/')}>
            Home
          </NavLink>
          <CreateButton to="/create">
            Create Post
          </CreateButton>
        </Nav>

        {/* User Section */}
        <UserSection>
          <NavLink
            to={`/user/${mockUser.id}`}
            $isActive={isActive(`/user/${mockUser.id}`)}
          >
            Profile
          </NavLink>
          <UserAvatar title={`${mockUser.first_name} ${mockUser.last_name}`}>
            {mockUser.first_name[0]}{mockUser.last_name[0]}
          </UserAvatar>
        </UserSection>
      </HeaderContent>
    </HeaderContainer>
  );
};

export default Header;