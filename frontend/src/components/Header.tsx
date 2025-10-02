/**
 * Header component - top navigation bar for the application
 */

import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import styled from 'styled-components';
import { useAuth } from '../contexts/AuthContext';
import { getUserAvatarUrl } from '../services/api';

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

const UserAvatar = styled.div<{ $hasImage?: boolean }>`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: ${({ theme, $hasImage }) => $hasImage ? 'transparent' : theme.colors.primary};
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: bold;
  font-size: 0.9rem;
  cursor: pointer;
  position: relative;
  overflow: hidden;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`;

const DropdownContainer = styled.div`
  position: relative;
`;

const DropdownMenu = styled.div<{ $isOpen: boolean }>`
  position: absolute;
  top: 100%;
  right: 0;
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  box-shadow: ${({ theme }) => theme.shadows.lg};
  min-width: 180px;
  z-index: 1000;
  display: ${({ $isOpen }) => $isOpen ? 'block' : 'none'};
  margin-top: ${({ theme }) => theme.spacing.sm};
`;

const DropdownItem = styled.button`
  width: 100%;
  padding: ${({ theme }) => theme.spacing.md};
  background: none;
  border: none;
  text-align: left;
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: 0.9rem;
  cursor: pointer;
  transition: background-color 0.2s;

  &:hover {
    background: ${({ theme }) => theme.colors.background};
  }

  &:first-child {
    border-radius: ${({ theme }) => theme.borderRadius.md} ${({ theme }) => theme.borderRadius.md} 0 0;
  }

  &:last-child {
    border-radius: 0 0 ${({ theme }) => theme.borderRadius.md} ${({ theme }) => theme.borderRadius.md};
  }
`;

const DropdownLink = styled(Link)`
  display: block;
  width: 100%;
  padding: ${({ theme }) => theme.spacing.md};
  color: ${({ theme }) => theme.colors.text.primary};
  text-decoration: none;
  font-size: 0.9rem;
  transition: background-color 0.2s;

  &:hover {
    background: ${({ theme }) => theme.colors.background};
    text-decoration: none;
  }

  &:first-child {
    border-radius: ${({ theme }) => theme.borderRadius.md} ${({ theme }) => theme.borderRadius.md} 0 0;
  }

  &:last-child {
    border-radius: 0 0 ${({ theme }) => theme.borderRadius.md} ${({ theme }) => theme.borderRadius.md};
  }
`;

const UserInfo = styled.div`
  padding: ${({ theme }) => theme.spacing.md};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};

  .name {
    font-weight: 600;
    color: ${({ theme }) => theme.colors.text.primary};
    margin-bottom: 2px;
  }

  .username {
    font-size: 0.8rem;
    color: ${({ theme }) => theme.colors.text.secondary};
  }
`;

/**
 * Header Component
 */
const Header: React.FC = () => {
  const location = useLocation();
  const { state, logout } = useAuth();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isActive = (path: string): boolean => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  const handleLogout = () => {
    logout();
    setIsDropdownOpen(false);
  };

  const toggleDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen);
  };

  const user = state.user;
  if (!user) return null;

  const avatarUrl = getUserAvatarUrl(user);
  const hasAvatar: boolean = Boolean(user.avatar_url);

  return (
    <HeaderContainer>
      <HeaderContent>
        {/* Logo */}
        <Logo to="/">
          SocialPost
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
          <DropdownContainer ref={dropdownRef}>
            <UserAvatar
              onClick={toggleDropdown}
              title={`${user.first_name} ${user.last_name}`}
              $hasImage={hasAvatar}
            >
              {hasAvatar ? (
                <img src={avatarUrl} alt={`${user.first_name} ${user.last_name}`} />
              ) : (
                `${user.first_name[0]}${user.last_name[0]}`
              )}
            </UserAvatar>

            <DropdownMenu $isOpen={isDropdownOpen}>
              <UserInfo>
                <div className="name">{user.first_name} {user.last_name}</div>
                <div className="username">@{user.username}</div>
              </UserInfo>

              <DropdownLink
                to={`/user/${user.id}`}
                onClick={() => setIsDropdownOpen(false)}
              >
                My Profile
              </DropdownLink>

              <DropdownLink
                to="/settings"
                onClick={() => setIsDropdownOpen(false)}
              >
                Settings
              </DropdownLink>

              <DropdownItem onClick={handleLogout}>
                Logout
              </DropdownItem>
            </DropdownMenu>
          </DropdownContainer>
        </UserSection>
      </HeaderContent>
    </HeaderContainer>
  );
};

export default Header;