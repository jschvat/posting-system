import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { useAuth } from '../contexts/AuthContext';
import groupsApi from '../services/groupsApi';
import { Group } from '../types/group';

const getErrorMessage = (err: any): string => {
  const error = err.response?.data?.error;
  if (typeof error === 'string') return error;
  if (error?.message) return error.message;
  return err.message || 'An error occurred';
};

type TabType = 'pending-members' | 'pending-posts' | 'members' | 'banned' | 'activity';

const GroupModPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const { state } = useAuth();
  const user = state.user;
  const navigate = useNavigate();

  const [group, setGroup] = useState<Group | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('pending-members');
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    loadGroupAndCheckRole();
  }, [slug, user]);

  const loadGroupAndCheckRole = async () => {
    if (!slug || !user) return;

    try {
      setLoading(true);
      const groupRes = await groupsApi.getGroup(slug);

      if (groupRes.success && groupRes.data) {
        setGroup(groupRes.data.group);

        // Check membership and role
        const membershipRes = await groupsApi.checkMembership(slug);
        if (membershipRes.success && membershipRes.data) {
          const membership = membershipRes.data.membership;

          // Only admins and moderators can access this page
          if (membership?.role === 'admin' || membership?.role === 'moderator') {
            setUserRole(membership.role);
          } else {
            alert('You must be an admin or moderator to access this page');
            navigate(`/g/${slug}`);
          }
        }
      }
    } catch (err: any) {
      alert(getErrorMessage(err));
      navigate('/groups');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <Container><LoadingMessage>Loading moderation console...</LoadingMessage></Container>;
  }

  if (!group || !userRole) {
    return null;
  }

  return (
    <Container>
      <Header>
        <BackLink onClick={() => navigate(`/g/${slug}`)}>← Back to {group.display_name}</BackLink>
        <Title>Moderation Console</Title>
        <RoleBadge $isAdmin={userRole === 'admin'}>
          {userRole === 'admin' ? 'Admin' : 'Moderator'}
        </RoleBadge>
      </Header>

      <TabBar>
        <Tab
          $active={activeTab === 'pending-members'}
          onClick={() => setActiveTab('pending-members')}
        >
          Pending Members
        </Tab>
        <Tab
          $active={activeTab === 'pending-posts'}
          onClick={() => setActiveTab('pending-posts')}
        >
          Pending Posts
        </Tab>
        <Tab
          $active={activeTab === 'members'}
          onClick={() => setActiveTab('members')}
        >
          Members
        </Tab>
        <Tab
          $active={activeTab === 'banned'}
          onClick={() => setActiveTab('banned')}
        >
          Banned
        </Tab>
        <Tab
          $active={activeTab === 'activity'}
          onClick={() => setActiveTab('activity')}
        >
          Activity Log
        </Tab>
      </TabBar>

      <ContentArea>
        {activeTab === 'pending-members' && <PendingMembersTab slug={slug!} />}
        {activeTab === 'pending-posts' && <PendingPostsTab slug={slug!} />}
        {activeTab === 'members' && <MembersTab slug={slug!} userRole={userRole} />}
        {activeTab === 'banned' && <BannedMembersTab slug={slug!} />}
        {activeTab === 'activity' && <ActivityLogTab slug={slug!} />}
      </ContentArea>
    </Container>
  );
};

// Tab Components (simplified for now - will expand)
const PendingMembersTab: React.FC<{ slug: string }> = ({ slug }) => {
  return <Placeholder>Pending Members - Coming soon</Placeholder>;
};

const PendingPostsTab: React.FC<{ slug: string }> = ({ slug }) => {
  return <Placeholder>Pending Posts - Coming soon</Placeholder>;
};

const MembersTab: React.FC<{ slug: string; userRole: string }> = ({ slug, userRole }) => {
  return <Placeholder>Member Management - Coming soon</Placeholder>;
};

const BannedMembersTab: React.FC<{ slug: string }> = ({ slug }) => {
  return <Placeholder>Banned Members - Coming soon</Placeholder>;
};

const ActivityLogTab: React.FC<{ slug: string }> = ({ slug }) => {
  return <Placeholder>Activity Log - Coming soon</Placeholder>;
};

// Styled Components
const Container = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 24px;
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;
`;

const BackLink = styled.button`
  background: none;
  border: none;
  color: ${props => props.theme.colors.primary};
  cursor: pointer;
  font-size: 14px;
  padding: 8px 0;

  &:hover {
    text-decoration: underline;
  }
`;

const Title = styled.h1`
  flex: 1;
  margin: 0;
  font-size: 28px;
  font-weight: 700;
  color: ${props => props.theme.colors.text};
`;

const RoleBadge = styled.span<{ $isAdmin: boolean }>`
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  background: ${props => props.$isAdmin ? '#e74c3c' : '#27ae60'};
  color: white;
`;

const TabBar = styled.div`
  display: flex;
  gap: 8px;
  border-bottom: 2px solid ${props => props.theme.colors.border};
  margin-bottom: 24px;
`;

const Tab = styled.button<{ $active: boolean }>`
  padding: 12px 20px;
  border: none;
  background: none;
  color: ${props => props.$active ? props.theme.colors.primary : props.theme.colors.text.secondary};
  font-weight: ${props => props.$active ? 600 : 400};
  font-size: 15px;
  cursor: pointer;
  border-bottom: 2px solid ${props => props.$active ? props.theme.colors.primary : 'transparent'};
  margin-bottom: -2px;
  transition: all 0.2s ease;

  &:hover {
    color: ${props => props.theme.colors.primary};
  }
`;

const ContentArea = styled.div`
  background: ${props => props.theme.colors.surface};
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: 8px;
  padding: 24px;
  min-height: 400px;
`;

const LoadingMessage = styled.div`
  text-align: center;
  padding: 48px;
  color: ${props => props.theme.colors.text.secondary};
  font-size: 18px;
`;

const Placeholder = styled.div`
  text-align: center;
  padding: 48px;
  color: ${props => props.theme.colors.text.secondary};
  font-size: 16px;
`;

export default GroupModPage;
