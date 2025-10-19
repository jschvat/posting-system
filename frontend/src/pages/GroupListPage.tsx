import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/Toast';
import groupsApi from '../services/groupsApi';
import { Group } from '../types/group';
import GroupCard from '../components/groups/GroupCard';

const getErrorMessage = (err: any): string => {
  const error = err.response?.data?.error;
  if (typeof error === 'string') return error;
  if (error?.message) return error.message;
  return err.message || 'An error occurred';
};

type FilterType = 'all' | 'joined' | 'pending' | 'available' | 'unavailable';

const GroupListPage: React.FC = () => {
  const { state } = useAuth();
  const user = state.user;
  const navigate = useNavigate();
  const { showError, showSuccess } = useToast();
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filter, setFilter] = useState<FilterType>('all');

  useEffect(() => {
    loadGroups();
  }, [page, filter]);

  const loadGroups = async () => {
    try {
      setLoading(true);
      setError(null);
      const limit = 20;
      const offset = (page - 1) * limit;

      let response;
      if (user && filter !== 'all') {
        // Use filtered endpoint for logged-in users with active filters
        response = await groupsApi.getFilteredGroups({
          filter,
          page,
          limit,
          offset
        });
      } else {
        // Use regular endpoint for 'all' filter or non-logged-in users
        response = await groupsApi.getGroups({ page, limit, offset } as any);
      }

      if (response.success && response.data) {
        const data = response.data as any;
        const groupsList = data.groups || [];
        setGroups(groupsList);
        const total = data.total || 0;
        setTotalPages(Math.ceil(total / limit));

        // Note: Membership status would need individual API calls per group
        // For now, users can click into groups to see full details and join
      }
    } catch (err: any) {
      setError(getErrorMessage(err) || 'Failed to load groups');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      loadGroups();
      return;
    }

    try {
      setIsSearching(true);
      setError(null);
      const limit = 20;
      const response = await groupsApi.searchGroups({ q: searchQuery, page: 1, limit, offset: 0 } as any);

      if (response.success && response.data) {
        const data = response.data as any;
        setGroups(data.groups || []);
        const total = data.total || 0;
        setTotalPages(Math.ceil(total / limit));
        setPage(1);
      }
    } catch (err: any) {
      setError(getErrorMessage(err) || 'Failed to search groups');
    } finally {
      setIsSearching(false);
    }
  };

  const handleJoin = async (groupSlug: string) => {
    if (!user) {
      navigate('/login');
      return;
    }

    try {
      const response = await groupsApi.joinGroup(groupSlug);
      if (response.success) {
        // Update group with membership info
        setGroups(groups.map(g =>
          g.slug === groupSlug
            ? {
                ...g,
                member_count: g.member_count + 1,
                user_membership: {
                  status: 'active' as const,
                  role: 'member' as const
                }
              }
            : g
        ));
      }
    } catch (err: any) {
      showError(getErrorMessage(err) || 'Failed to join group');
    }
  };

  const handleLeave = async (groupSlug: string) => {
    if (!user) return;

    if (!window.confirm('Are you sure you want to leave this group?')) {
      return;
    }

    try {
      const response = await groupsApi.leaveGroup(groupSlug);
      if (response.success) {
        // Remove membership info
        setGroups(groups.map(g =>
          g.slug === groupSlug
            ? {
                ...g,
                member_count: Math.max(0, g.member_count - 1),
                user_membership: undefined
              }
            : g
        ));
      }
    } catch (err: any) {
      showError(getErrorMessage(err) || 'Failed to leave group');
    }
  };

  const handleCreateGroup = () => {
    if (!user) {
      navigate('/login');
      return;
    }
    navigate('/groups/create');
  };

  const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (!user && e.target.value !== 'all') {
      navigate('/login');
      return;
    }
    setFilter(e.target.value as FilterType);
    setPage(1); // Reset to first page when filter changes
  };

  return (
    <Container>
      <Header>
        <Title>Groups</Title>
        <CreateButton onClick={handleCreateGroup}>
          Create Group
        </CreateButton>
      </Header>

      <FiltersRow>
        <SearchForm onSubmit={handleSearch}>
          <SearchInput
            type="text"
            placeholder="Search groups..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <SearchButton type="submit" disabled={isSearching}>
            {isSearching ? 'Searching...' : 'Search'}
          </SearchButton>
        </SearchForm>

        {user && (
          <FilterSelect value={filter} onChange={handleFilterChange}>
            <option value="all">All Groups</option>
            <option value="joined">Joined</option>
            <option value="pending">Pending Approval</option>
            <option value="available">Available to Join</option>
            <option value="unavailable">Location Restricted</option>
          </FilterSelect>
        )}
      </FiltersRow>

      {error && <ErrorMessage>{error}</ErrorMessage>}

      {loading ? (
        <LoadingMessage>Loading groups...</LoadingMessage>
      ) : groups.length === 0 ? (
        <EmptyMessage>
          {searchQuery ? 'No groups found matching your search.' : 'No groups yet. Be the first to create one!'}
        </EmptyMessage>
      ) : (
        <>
          <GroupGrid>
            {groups.map(group => (
              <GroupCard
                key={group.id}
                group={group}
                showJoinButton={!!user}
                onJoin={handleJoin}
                onLeave={handleLeave}
              />
            ))}
          </GroupGrid>

          {totalPages > 1 && (
            <Pagination>
              <PageButton
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                Previous
              </PageButton>
              <PageInfo>
                Page {page} of {totalPages}
              </PageInfo>
              <PageButton
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                Next
              </PageButton>
            </Pagination>
          )}
        </>
      )}
    </Container>
  );
};

const Container = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 24px;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
`;

const Title = styled.h1`
  margin: 0;
  font-size: 32px;
  font-weight: 700;
  color: ${props => props.theme.colors.text};
`;

const CreateButton = styled.button`
  padding: 12px 24px;
  border-radius: 8px;
  border: none;
  background: ${props => props.theme.colors.primary};
  color: white;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s ease;

  &:hover {
    background: ${props => props.theme.colors.primary};
  }
`;

const FiltersRow = styled.div`
  display: flex;
  gap: 12px;
  margin-bottom: 24px;
  align-items: center;

  @media (max-width: 768px) {
    flex-direction: column;
  }
`;

const SearchForm = styled.form`
  display: flex;
  gap: 12px;
  flex: 1;
`;

const SearchInput = styled.input`
  flex: 1;
  padding: 12px 16px;
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: 8px;
  background: ${props => props.theme.colors.surface};
  color: ${props => props.theme.colors.text};
  font-size: 16px;

  &:focus {
    outline: none;
    border-color: ${props => props.theme.colors.primary};
  }
`;

const SearchButton = styled.button`
  padding: 12px 24px;
  border-radius: 8px;
  border: 1px solid ${props => props.theme.colors.primary};
  background: transparent;
  color: ${props => props.theme.colors.primary};
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover:not(:disabled) {
    background: ${props => props.theme.colors.primary};
    color: white;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const FilterSelect = styled.select`
  padding: 12px 16px;
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: 8px;
  background: ${props => props.theme.colors.surface};
  color: ${props => props.theme.colors.text};
  font-size: 16px;
  cursor: pointer;
  min-width: 200px;

  &:focus {
    outline: none;
    border-color: ${props => props.theme.colors.primary};
  }

  @media (max-width: 768px) {
    width: 100%;
  }
`;

const ErrorMessage = styled.div`
  padding: 16px;
  background: rgba(244, 67, 54, 0.1);
  border: 1px solid #f44336;
  border-radius: 8px;
  color: #f44336;
  margin-bottom: 24px;
`;

const LoadingMessage = styled.div`
  text-align: center;
  padding: 48px;
  color: ${props => props.theme.colors.text.secondary};
  font-size: 18px;
`;

const EmptyMessage = styled.div`
  text-align: center;
  padding: 48px;
  color: ${props => props.theme.colors.text.secondary};
  font-size: 18px;
`;

const GroupGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 20px;
  margin-bottom: 32px;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const Pagination = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 16px;
`;

const PageButton = styled.button`
  padding: 8px 16px;
  border-radius: 8px;
  border: 1px solid ${props => props.theme.colors.border};
  background: ${props => props.theme.colors.surface};
  color: ${props => props.theme.colors.text};
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover:not(:disabled) {
    border-color: ${props => props.theme.colors.primary};
    color: ${props => props.theme.colors.primary};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const PageInfo = styled.span`
  color: ${props => props.theme.colors.text.secondary};
  font-size: 14px;
`;

export default GroupListPage;
