import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { useAuth } from '../contexts/AuthContext';
import groupsApi from '../services/groupsApi';
import groupPostsApi from '../services/groupPostsApi';
import { Group, GroupPost } from '../types/group';

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

// Tab Components
const PendingMembersTab: React.FC<{ slug: string }> = ({ slug }) => {
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  useEffect(() => {
    loadPendingMembers();
  }, [slug]);

  const loadPendingMembers = async () => {
    try {
      setLoading(true);
      const res = await groupsApi.getPendingMembers(slug);
      if (res.success && res.data) {
        setMembers(res.data.members);
      }
    } catch (err: any) {
      alert(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (userId: number) => {
    if (!window.confirm('Approve this membership request?')) return;

    try {
      setActionLoading(userId);
      const res = await groupsApi.approveMember(slug, userId);
      if (res.success) {
        alert('Member approved successfully');
        loadPendingMembers();
      }
    } catch (err: any) {
      alert(getErrorMessage(err));
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (userId: number) => {
    if (!window.confirm('Reject this membership request? This action cannot be undone.')) return;

    try {
      setActionLoading(userId);
      const res = await groupsApi.rejectMember(slug, userId);
      if (res.success) {
        alert('Membership request rejected');
        loadPendingMembers();
      }
    } catch (err: any) {
      alert(getErrorMessage(err));
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return <LoadingMessage>Loading pending members...</LoadingMessage>;
  }

  if (members.length === 0) {
    return <EmptyState>No pending membership requests</EmptyState>;
  }

  return (
    <div>
      <SectionTitle>Pending Membership Requests ({members.length})</SectionTitle>
      {members.map(member => (
        <MemberCard key={member.user_id}>
          <MemberInfo>
            {member.avatar_url && <MemberAvatar src={member.avatar_url} alt={member.username} />}
            {!member.avatar_url && <MemberAvatarPlaceholder>{member.username.charAt(0).toUpperCase()}</MemberAvatarPlaceholder>}
            <MemberDetails>
              <MemberName>{member.display_name || member.username}</MemberName>
              <MemberUsername>@{member.username}</MemberUsername>
              <MemberDate>Requested {new Date(member.joined_at).toLocaleDateString()}</MemberDate>
            </MemberDetails>
          </MemberInfo>
          <MemberActions>
            <ApproveButton
              onClick={() => handleApprove(member.user_id)}
              disabled={actionLoading === member.user_id}
            >
              {actionLoading === member.user_id ? 'Processing...' : 'Approve'}
            </ApproveButton>
            <RejectButton
              onClick={() => handleReject(member.user_id)}
              disabled={actionLoading === member.user_id}
            >
              Reject
            </RejectButton>
          </MemberActions>
        </MemberCard>
      ))}
    </div>
  );
};

const PendingPostsTab: React.FC<{ slug: string }> = ({ slug }) => {
  const [posts, setPosts] = useState<GroupPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  useEffect(() => {
    loadPendingPosts();
  }, [slug]);

  const loadPendingPosts = async () => {
    try {
      setLoading(true);
      const res = await groupPostsApi.getPendingPosts(slug);
      if (res.success && res.data) {
        const data = res.data as any;
        setPosts(data.posts || data.items || []);
      }
    } catch (err: any) {
      alert(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (postId: number) => {
    if (!window.confirm('Approve this post?')) return;

    try {
      setActionLoading(postId);
      const res = await groupPostsApi.approvePost(slug, postId);
      if (res.success) {
        alert('Post approved successfully');
        loadPendingPosts();
      }
    } catch (err: any) {
      alert(getErrorMessage(err));
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (postId: number) => {
    const reason = prompt('Reject this post? Enter reason:');
    if (!reason) return;

    try {
      setActionLoading(postId);
      const res = await groupPostsApi.removePost(slug, postId, { removal_reason: reason });
      if (res.success) {
        alert('Post rejected');
        loadPendingPosts();
      }
    } catch (err: any) {
      alert(getErrorMessage(err));
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return <LoadingMessage>Loading pending posts...</LoadingMessage>;
  }

  if (posts.length === 0) {
    return <EmptyState>No pending posts</EmptyState>;
  }

  return (
    <div>
      <SectionTitle>Pending Posts ({posts.length})</SectionTitle>
      {posts.map(post => (
        <PostCard key={post.id}>
          <PostHeader>
            <PostAuthor>
              {post.username && `@${post.username}`}
              {!post.username && 'Unknown User'}
            </PostAuthor>
            <PostDate>{new Date(post.created_at).toLocaleString()}</PostDate>
          </PostHeader>
          <PostTitle>{post.title}</PostTitle>
          {post.content && <PostContent>{post.content.substring(0, 200)}{post.content.length > 200 ? '...' : ''}</PostContent>}
          {post.link_url && <PostUrl href={post.link_url} target="_blank" rel="noopener noreferrer">{post.link_url}</PostUrl>}
          <PostActions>
            <ApproveButton
              onClick={() => handleApprove(post.id)}
              disabled={actionLoading === post.id}
            >
              {actionLoading === post.id ? 'Processing...' : 'Approve'}
            </ApproveButton>
            <RejectButton
              onClick={() => handleReject(post.id)}
              disabled={actionLoading === post.id}
            >
              Reject
            </RejectButton>
          </PostActions>
        </PostCard>
      ))}
    </div>
  );
};

const MembersTab: React.FC<{ slug: string; userRole: string }> = ({ slug, userRole }) => {
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [roleFilter, setRoleFilter] = useState<string>('all');

  useEffect(() => {
    loadMembers();
  }, [slug, roleFilter]);

  const loadMembers = async () => {
    try {
      setLoading(true);
      const params: any = { status: 'active' };
      if (roleFilter !== 'all') {
        params.role = roleFilter;
      }
      const res = await groupsApi.getGroupMembers(slug, params);
      if (res.success && res.data) {
        setMembers(res.data.items);
      }
    } catch (err: any) {
      alert(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleChangeRole = async (userId: number, newRole: string) => {
    if (!window.confirm(`Change this member's role to ${newRole}?`)) return;

    try {
      setActionLoading(userId);
      const res = await groupsApi.updateMemberRole(slug, userId, { role: newRole as any });
      if (res.success) {
        alert('Role updated successfully');
        loadMembers();
      }
    } catch (err: any) {
      alert(getErrorMessage(err));
    } finally {
      setActionLoading(null);
    }
  };

  const handleBanMember = async (userId: number, username: string) => {
    const reason = prompt(`Ban ${username}? Enter reason:`);
    if (!reason) return;

    try {
      setActionLoading(userId);
      const res = await groupsApi.banMember(slug, userId, { banned_reason: reason });
      if (res.success) {
        alert('Member banned successfully');
        loadMembers();
      }
    } catch (err: any) {
      alert(getErrorMessage(err));
    } finally {
      setActionLoading(null);
    }
  };

  const handleRemoveMember = async (userId: number, username: string) => {
    if (!window.confirm(`Remove ${username} from this group? This action cannot be undone.`)) return;

    try {
      setActionLoading(userId);
      const res = await groupsApi.removeMember(slug, userId);
      if (res.success) {
        alert('Member removed successfully');
        loadMembers();
      }
    } catch (err: any) {
      alert(getErrorMessage(err));
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return <LoadingMessage>Loading members...</LoadingMessage>;
  }

  return (
    <div>
      <MemberManagementHeader>
        <SectionTitle>Members ({members.length})</SectionTitle>
        <RoleFilterBar>
          <RoleFilterButton $active={roleFilter === 'all'} onClick={() => setRoleFilter('all')}>All</RoleFilterButton>
          <RoleFilterButton $active={roleFilter === 'admin'} onClick={() => setRoleFilter('admin')}>Admins</RoleFilterButton>
          <RoleFilterButton $active={roleFilter === 'moderator'} onClick={() => setRoleFilter('moderator')}>Moderators</RoleFilterButton>
          <RoleFilterButton $active={roleFilter === 'member'} onClick={() => setRoleFilter('member')}>Members</RoleFilterButton>
        </RoleFilterBar>
      </MemberManagementHeader>

      {members.length === 0 && <EmptyState>No members found</EmptyState>}

      {members.map(member => (
        <MemberCard key={member.user_id}>
          <MemberInfo>
            {member.avatar_url && <MemberAvatar src={member.avatar_url} alt={member.username} />}
            {!member.avatar_url && <MemberAvatarPlaceholder>{member.username.charAt(0).toUpperCase()}</MemberAvatarPlaceholder>}
            <MemberDetails>
              <MemberName>{member.display_name || member.username}</MemberName>
              <MemberUsername>@{member.username}</MemberUsername>
              <MemberRoleBadge $role={member.role}>{member.role}</MemberRoleBadge>
            </MemberDetails>
          </MemberInfo>
          {userRole === 'admin' && (
            <MemberActions>
              {member.role !== 'admin' && (
                <RoleSelect
                  value={member.role}
                  onChange={(e) => handleChangeRole(member.user_id, e.target.value)}
                  disabled={actionLoading === member.user_id}
                >
                  <option value="member">Member</option>
                  <option value="moderator">Moderator</option>
                  <option value="admin">Admin</option>
                </RoleSelect>
              )}
              <BanButton
                onClick={() => handleBanMember(member.user_id, member.username)}
                disabled={actionLoading === member.user_id}
              >
                Ban
              </BanButton>
              {member.role !== 'admin' && (
                <RemoveButton
                  onClick={() => handleRemoveMember(member.user_id, member.username)}
                  disabled={actionLoading === member.user_id}
                >
                  Remove
                </RemoveButton>
              )}
            </MemberActions>
          )}
        </MemberCard>
      ))}
    </div>
  );
};

const BannedMembersTab: React.FC<{ slug: string }> = ({ slug }) => {
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  useEffect(() => {
    loadBannedMembers();
  }, [slug]);

  const loadBannedMembers = async () => {
    try {
      setLoading(true);
      const res = await groupsApi.getBannedMembers(slug);
      if (res.success && res.data) {
        setMembers(res.data.members);
      }
    } catch (err: any) {
      alert(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleUnban = async (userId: number, username: string) => {
    if (!window.confirm(`Unban ${username}?`)) return;

    try {
      setActionLoading(userId);
      const res = await groupsApi.unbanMember(slug, userId);
      if (res.success) {
        alert('Member unbanned successfully');
        loadBannedMembers();
      }
    } catch (err: any) {
      alert(getErrorMessage(err));
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return <LoadingMessage>Loading banned members...</LoadingMessage>;
  }

  if (members.length === 0) {
    return <EmptyState>No banned members</EmptyState>;
  }

  return (
    <div>
      <SectionTitle>Banned Members ({members.length})</SectionTitle>
      {members.map(member => (
        <MemberCard key={member.user_id}>
          <MemberInfo>
            {member.avatar_url && <MemberAvatar src={member.avatar_url} alt={member.username} />}
            {!member.avatar_url && <MemberAvatarPlaceholder>{member.username.charAt(0).toUpperCase()}</MemberAvatarPlaceholder>}
            <MemberDetails>
              <MemberName>{member.display_name || member.username}</MemberName>
              <MemberUsername>@{member.username}</MemberUsername>
              <MemberDate>Banned {new Date(member.joined_at).toLocaleDateString()}</MemberDate>
            </MemberDetails>
          </MemberInfo>
          <MemberActions>
            <ApproveButton
              onClick={() => handleUnban(member.user_id, member.username)}
              disabled={actionLoading === member.user_id}
            >
              {actionLoading === member.user_id ? 'Processing...' : 'Unban'}
            </ApproveButton>
          </MemberActions>
        </MemberCard>
      ))}
    </div>
  );
};

const ActivityLogTab: React.FC<{ slug: string }> = ({ slug }) => {
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    loadActivityLog();
  }, [slug]);

  const loadActivityLog = async () => {
    try {
      setLoading(true);
      const res = await groupsApi.getActivityLog(slug, { limit: 50 });
      if (res.success && res.data) {
        setActivities(res.data.activities);
        setTotal(res.data.total);
      }
    } catch (err: any) {
      alert(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const getActionLabel = (action: string): string => {
    const labels: { [key: string]: string } = {
      'member_approved': 'Approved member',
      'member_rejected': 'Rejected member',
      'member_banned': 'Banned member',
      'member_unbanned': 'Unbanned member',
      'member_removed': 'Removed member',
      'role_changed': 'Changed role',
      'post_approved': 'Approved post',
      'post_removed': 'Removed post',
      'comment_removed': 'Removed comment'
    };
    return labels[action] || action;
  };

  if (loading) {
    return <LoadingMessage>Loading activity log...</LoadingMessage>;
  }

  if (activities.length === 0) {
    return <EmptyState>No moderation activity yet</EmptyState>;
  }

  return (
    <div>
      <SectionTitle>Recent Activity ({total} total actions)</SectionTitle>
      <ActivityList>
        {activities.map((activity, index) => (
          <ActivityItem key={index}>
            <ActivityIcon>📋</ActivityIcon>
            <ActivityContent>
              <ActivityAction>
                <strong>{activity.moderator_username}</strong> {getActionLabel(activity.action)}
              </ActivityAction>
              {activity.target_username && (
                <ActivityTarget>Target: @{activity.target_username}</ActivityTarget>
              )}
              {activity.details && (
                <ActivityDetails>{activity.details}</ActivityDetails>
              )}
              <ActivityTimestamp>
                {new Date(activity.created_at).toLocaleString()}
              </ActivityTimestamp>
            </ActivityContent>
          </ActivityItem>
        ))}
      </ActivityList>
    </div>
  );
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

const EmptyState = styled.div`
  text-align: center;
  padding: 48px;
  color: ${props => props.theme.colors.text.secondary};
  font-size: 16px;
`;

const SectionTitle = styled.h2`
  font-size: 18px;
  font-weight: 600;
  color: ${props => props.theme.colors.text};
  margin: 0 0 16px 0;
`;

const MemberCard = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  background: ${props => props.theme.colors.background};
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: 8px;
  margin-bottom: 12px;
`;

const MemberInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
`;

const MemberAvatar = styled.img`
  width: 48px;
  height: 48px;
  border-radius: 50%;
  object-fit: cover;
`;

const MemberAvatarPlaceholder = styled.div`
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: ${props => props.theme.colors.primary};
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  font-weight: bold;
`;

const MemberDetails = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const MemberName = styled.div`
  font-size: 16px;
  font-weight: 600;
  color: ${props => props.theme.colors.text};
`;

const MemberUsername = styled.div`
  font-size: 14px;
  color: ${props => props.theme.colors.text.secondary};
`;

const MemberDate = styled.div`
  font-size: 12px;
  color: ${props => props.theme.colors.text.secondary};
`;

const MemberActions = styled.div`
  display: flex;
  gap: 8px;
`;

const ApproveButton = styled.button`
  padding: 8px 16px;
  border-radius: 6px;
  border: none;
  background: ${props => props.theme.colors.primary};
  color: white;
  font-weight: 600;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover:not(:disabled) {
    opacity: 0.9;
    transform: translateY(-1px);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const RejectButton = styled.button`
  padding: 8px 16px;
  border-radius: 6px;
  border: 1px solid ${props => props.theme.colors.border};
  background: transparent;
  color: ${props => props.theme.colors.error};
  font-weight: 600;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover:not(:disabled) {
    background: ${props => props.theme.colors.error}10;
    border-color: ${props => props.theme.colors.error};
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const MemberManagementHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
`;

const RoleFilterBar = styled.div`
  display: flex;
  gap: 8px;
`;

const RoleFilterButton = styled.button<{ $active: boolean }>`
  padding: 6px 12px;
  border-radius: 6px;
  border: 1px solid ${props => props.$active ? props.theme.colors.primary : props.theme.colors.border};
  background: ${props => props.$active ? props.theme.colors.primary : 'transparent'};
  color: ${props => props.$active ? 'white' : props.theme.colors.text};
  font-size: 13px;
  font-weight: ${props => props.$active ? 600 : 400};
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    border-color: ${props => props.theme.colors.primary};
    color: ${props => props.$active ? 'white' : props.theme.colors.primary};
  }
`;

const MemberRoleBadge = styled.span<{ $role: string }>`
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  background: ${props => {
    if (props.$role === 'admin') return '#e74c3c';
    if (props.$role === 'moderator') return '#27ae60';
    return '#95a5a6';
  }};
  color: white;
`;

const RoleSelect = styled.select`
  padding: 6px 12px;
  border-radius: 6px;
  border: 1px solid ${props => props.theme.colors.border};
  background: ${props => props.theme.colors.surface};
  color: ${props => props.theme.colors.text};
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover:not(:disabled) {
    border-color: ${props => props.theme.colors.primary};
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const BanButton = styled.button`
  padding: 6px 12px;
  border-radius: 6px;
  border: 1px solid ${props => props.theme.colors.border};
  background: transparent;
  color: ${props => props.theme.colors.error};
  font-weight: 600;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover:not(:disabled) {
    background: ${props => props.theme.colors.error}10;
    border-color: ${props => props.theme.colors.error};
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const RemoveButton = styled.button`
  padding: 6px 12px;
  border-radius: 6px;
  border: 1px solid ${props => props.theme.colors.border};
  background: transparent;
  color: ${props => props.theme.colors.text.secondary};
  font-weight: 600;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover:not(:disabled) {
    background: ${props => props.theme.colors.error}10;
    border-color: ${props => props.theme.colors.error};
    color: ${props => props.theme.colors.error};
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const ActivityList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const ActivityItem = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px;
  background: ${props => props.theme.colors.background};
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: 8px;
`;

const ActivityIcon = styled.div`
  font-size: 24px;
  line-height: 1;
`;

const ActivityContent = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const ActivityAction = styled.div`
  font-size: 14px;
  color: ${props => props.theme.colors.text};

  strong {
    font-weight: 600;
  }
`;

const ActivityTarget = styled.div`
  font-size: 13px;
  color: ${props => props.theme.colors.text.secondary};
`;

const ActivityDetails = styled.div`
  font-size: 13px;
  color: ${props => props.theme.colors.text.secondary};
  font-style: italic;
`;

const ActivityTimestamp = styled.div`
  font-size: 12px;
  color: ${props => props.theme.colors.text.secondary};
  margin-top: 4px;
`;

const PostCard = styled.div`
  padding: 16px;
  background: ${props => props.theme.colors.background};
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: 8px;
  margin-bottom: 12px;
`;

const PostHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
`;

const PostAuthor = styled.div`
  font-size: 14px;
  font-weight: 600;
  color: ${props => props.theme.colors.text};
`;

const PostDate = styled.div`
  font-size: 12px;
  color: ${props => props.theme.colors.text.secondary};
`;

const PostTitle = styled.h3`
  font-size: 16px;
  font-weight: 600;
  color: ${props => props.theme.colors.text};
  margin: 0 0 8px 0;
`;

const PostContent = styled.p`
  font-size: 14px;
  line-height: 1.5;
  color: ${props => props.theme.colors.text.secondary};
  margin: 0 0 8px 0;
`;

const PostUrl = styled.a`
  font-size: 13px;
  color: ${props => props.theme.colors.primary};
  text-decoration: none;
  word-break: break-all;
  display: block;
  margin-bottom: 12px;

  &:hover {
    text-decoration: underline;
  }
`;

const PostActions = styled.div`
  display: flex;
  gap: 8px;
  margin-top: 12px;
`;

export default GroupModPage;
