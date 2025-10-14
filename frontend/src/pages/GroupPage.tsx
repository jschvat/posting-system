import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import styled from 'styled-components';
import { useAuth } from '../contexts/AuthContext';
import groupsApi from '../services/groupsApi';
import groupPostsApi from '../services/groupPostsApi';
import { Group, GroupPost, PostSortType, VoteType, CreatePostData } from '../types/group';
import GroupPostCard from '../components/groups/GroupPostCard';
import GroupPostComposer from '../components/groups/GroupPostComposer';

const getErrorMessage = (err: any): string => {
  const error = err.response?.data?.error;
  if (typeof error === 'string') return error;
  if (error?.message) return error.message;
  return err.message || 'An error occurred';
};

const GroupPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const { state } = useAuth();
  const user = state.user;
  const navigate = useNavigate();

  const [group, setGroup] = useState<Group | null>(null);
  const [posts, setPosts] = useState<GroupPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isMember, setIsMember] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<PostSortType>('hot');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showComposer, setShowComposer] = useState(false);
  const [moderators, setModerators] = useState<any[]>([]);

  useEffect(() => {
    if (slug) {
      loadGroupData();
      loadModerators();
    }
  }, [slug]);

  useEffect(() => {
    if (slug && group) {
      loadPosts();
    }
  }, [slug, group, sortBy, page]);

  const loadGroupData = async () => {
    if (!slug) return;

    try {
      setLoading(true);
      setError(null);

      const groupResponse = await groupsApi.getGroup(slug);

      if (groupResponse.success && groupResponse.data) {
        const groupData = groupResponse.data as any;
        setGroup(groupData.group || groupData);

        // Check membership from group response (backend includes user_role and user_status)
        if (user) {
          setIsMember(groupData.user_status === 'active');
          setUserRole(groupData.user_role || null);
        }
      }
    } catch (err: any) {
      setError(getErrorMessage(err) || 'Failed to load group');
    } finally {
      setLoading(false);
    }
  };

  const loadModerators = async () => {
    if (!slug) return;

    try {
      // Fetch admins and moderators
      const response = await groupsApi.getGroupMembers(slug, {
        limit: 50,
        status: 'active'
      });

      if (response.success && response.data) {
        const data = response.data as any;
        const members = data.members || data.items || [];

        // Filter for admin and moderator roles
        const modList = members.filter((m: any) =>
          m.role === 'admin' || m.role === 'moderator'
        );

        setModerators(modList);
      }
    } catch (err: any) {
      console.error('Failed to load moderators:', err);
      // Don't show error to user, just log it
    }
  };

  const loadPosts = async () => {
    if (!slug) return;

    try {
      const response = await groupPostsApi.getGroupPosts(slug, {
        page,
        limit: 20,
        sort: sortBy
      });

      if (response.success && response.data) {
        const data = response.data as any;
        setPosts(data.posts || []);
        if (data.total) {
          setTotalPages(Math.ceil(data.total / 20));
        }
      }
    } catch (err: any) {
      console.error('Failed to load posts:', err);
      setPosts([]); // Ensure posts is always an array
    }
  };

  const handleJoin = async () => {
    if (!user || !slug) {
      navigate('/login');
      return;
    }

    try {
      const response = await groupsApi.joinGroup(slug);
      if (response.success) {
        setIsMember(true);
        if (group) {
          setGroup({ ...group, member_count: group.member_count + 1 });
        }
      }
    } catch (err: any) {
      alert(getErrorMessage(err) || 'Failed to join group');
    }
  };

  const handleLeave = async () => {
    if (!user || !slug) return;

    if (!window.confirm('Are you sure you want to leave this group?')) return;

    try {
      const response = await groupsApi.leaveGroup(slug);
      if (response.success) {
        setIsMember(false);
        setUserRole(null);
        if (group) {
          setGroup({ ...group, member_count: Math.max(0, group.member_count - 1) });
        }
      }
    } catch (err: any) {
      alert(getErrorMessage(err) || 'Failed to leave group');
    }
  };

  const handleCreatePost = async (data: CreatePostData) => {
    if (!slug) return;

    try {
      const response = await groupPostsApi.createPost(slug, data);
      if (response.success) {
        setShowComposer(false);
        loadPosts(); // Reload posts
        if (group?.post_approval_required && userRole === 'member') {
          alert('Your post has been submitted for approval by moderators.');
        }
      }
    } catch (err: any) {
      const errorMsg = getErrorMessage(err);
      if (errorMsg.toLowerCase().includes('member')) {
        alert('You must be a member of this group to create posts. Please join the group first.');
      } else {
        alert(errorMsg || 'Failed to create post');
      }
    }
  };

  const handleVote = async (postId: number, voteType: VoteType) => {
    if (!user || !slug) {
      navigate('/login');
      return;
    }

    try {
      const post = posts.find(p => p.id === postId);
      const response = await groupPostsApi.toggleVote(slug, postId, voteType, post?.user_vote);

      if (response.success && response.data) {
        setPosts(posts.map(p =>
          p.id === postId
            ? {
                ...p,
                upvotes: response.data!.counts.upvotes,
                downvotes: response.data!.counts.downvotes,
                score: response.data!.counts.score,
                user_vote: response.data!.counts.user_vote
              }
            : p
        ));
      }
    } catch (err: any) {
      const errorMsg = getErrorMessage(err);
      if (errorMsg.toLowerCase().includes('member')) {
        alert('You must be a member of this group to vote on posts. Please join the group first.');
      } else {
        alert(errorMsg || 'Failed to vote');
      }
    }
  };

  const handlePin = async (postId: number) => {
    if (!slug) return;

    try {
      await groupPostsApi.togglePinPost(slug, postId);
      loadPosts();
    } catch (err: any) {
      alert(getErrorMessage(err) || 'Failed to pin post');
    }
  };

  const handleLock = async (postId: number) => {
    if (!slug) return;

    try {
      await groupPostsApi.toggleLockPost(slug, postId);
      loadPosts();
    } catch (err: any) {
      alert(getErrorMessage(err) || 'Failed to lock post');
    }
  };

  const handleRemove = async (postId: number) => {
    if (!slug) return;

    const reason = window.prompt('Enter removal reason:');
    if (!reason) return;

    try {
      await groupPostsApi.removePost(slug, postId, { removal_reason: reason });
      loadPosts();
    } catch (err: any) {
      alert(getErrorMessage(err) || 'Failed to remove post');
    }
  };

  const canModerate = userRole === 'moderator' || userRole === 'admin';

  if (loading) {
    return (
      <Container>
        <LoadingMessage>Loading group...</LoadingMessage>
      </Container>
    );
  }

  if (error || !group) {
    return (
      <Container>
        <ErrorMessage>{error || 'Group not found'}</ErrorMessage>
      </Container>
    );
  }

  return (
    <Container>
      <GroupHeader>
        {group.banner_url && <Banner src={group.banner_url} alt={group.display_name} />}
        <GroupInfo>
          <GroupIconSection>
            {group.icon_url && <GroupIcon src={group.icon_url} alt={group.display_name} />}
            {!group.icon_url && <DefaultIcon>{group.name.charAt(0).toUpperCase()}</DefaultIcon>}
          </GroupIconSection>
          <GroupMeta>
            <GroupName>{group.display_name}</GroupName>
            <GroupSlug>g/{group.name}</GroupSlug>
            {group.description && <GroupDescription>{group.description}</GroupDescription>}
            <GroupStats>
              <Stat>{group.member_count.toLocaleString()} members</Stat>
              <Separator>•</Separator>
              <Stat>{group.post_count.toLocaleString()} posts</Stat>
              {moderators.length > 0 && (
                <>
                  <Separator>•</Separator>
                  <ModeratorsList>
                    {moderators.map((mod: any) => (
                      <ModeratorItem key={mod.user_id}>
                        <ModeratorAvatar
                          src={mod.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(mod.username || 'User')}&background=random`}
                          alt={mod.username}
                        />
                        <ModeratorLink to={`/user/${mod.user_id}`} $isAdmin={mod.role === 'admin'}>
                          {mod.display_name || mod.username}
                        </ModeratorLink>
                      </ModeratorItem>
                    ))}
                  </ModeratorsList>
                </>
              )}
            </GroupStats>
          </GroupMeta>
          <GroupActions>
            {user && !isMember && (
              <ActionButton onClick={handleJoin}>Join</ActionButton>
            )}
            {user && isMember && (
              <>
                <ActionButton $secondary onClick={handleLeave}>Leave</ActionButton>
                {canModerate && (
                  <ActionButton onClick={() => navigate(`/g/${slug}/moderate`)}>
                    Moderate
                  </ActionButton>
                )}
                {userRole === 'admin' && (
                  <ActionButton onClick={() => navigate(`/g/${slug}/settings`)}>
                    Settings
                  </ActionButton>
                )}
              </>
            )}
          </GroupActions>
        </GroupInfo>
      </GroupHeader>

      <ContentArea>
        <MainContent>
          <FeedHeader>
            <SortButtons>
              <SortButton
                $active={sortBy === 'hot'}
                onClick={() => setSortBy('hot')}
              >
                Hot
              </SortButton>
              <SortButton
                $active={sortBy === 'new'}
                onClick={() => setSortBy('new')}
              >
                New
              </SortButton>
              <SortButton
                $active={sortBy === 'top'}
                onClick={() => setSortBy('top')}
              >
                Top
              </SortButton>
            </SortButtons>
            {isMember && (
              <CreatePostButton onClick={() => setShowComposer(!showComposer)}>
                {showComposer ? 'Cancel' : 'Create Post'}
              </CreatePostButton>
            )}
          </FeedHeader>

          {showComposer && (
            <GroupPostComposer
              onSubmit={handleCreatePost}
              allowedTypes={{
                text: group.allow_text_posts,
                link: group.allow_link_posts,
                image: group.allow_image_posts,
                video: group.allow_video_posts,
                poll: group.allow_poll_posts
              }}
              requiresApproval={group.post_approval_required && userRole === 'member'}
            />
          )}

          {posts.length === 0 ? (
            <EmptyMessage>
              No posts yet. {isMember ? 'Be the first to post!' : 'Join to start posting!'}
            </EmptyMessage>
          ) : (
            <>
              <PostList>
                {posts.map(post => (
                  <GroupPostCard
                    key={post.id}
                    post={post}
                    groupSlug={slug}
                    onVote={user ? handleVote : undefined}
                    canModerate={canModerate}
                    onPin={canModerate ? handlePin : undefined}
                    onLock={canModerate ? handleLock : undefined}
                    onRemove={canModerate ? handleRemove : undefined}
                  />
                ))}
              </PostList>

              {totalPages > 1 && (
                <Pagination>
                  <PageButton
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    Previous
                  </PageButton>
                  <PageInfo>Page {page} of {totalPages}</PageInfo>
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
        </MainContent>

        <Sidebar>
          {group.rules && (
            <SidebarCard>
              <SidebarTitle>Rules</SidebarTitle>
              <SidebarText style={{ whiteSpace: 'pre-wrap' }}>{group.rules}</SidebarText>
            </SidebarCard>
          )}
        </Sidebar>
      </ContentArea>
    </Container>
  );
};

const Container = styled.div`
  min-height: 100vh;
  background: ${props => props.theme.colors.background};
`;

const GroupHeader = styled.div`
  background: ${props => props.theme.colors.surface};
  border-bottom: 1px solid ${props => props.theme.colors.border};
  margin-bottom: 24px;
`;

const Banner = styled.img`
  width: 100%;
  height: 200px;
  object-fit: cover;
`;

const GroupInfo = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 24px;
  display: flex;
  gap: 20px;
  align-items: flex-start;
`;

const GroupIconSection = styled.div`
  margin-top: -40px;
`;

const GroupIcon = styled.img`
  width: 80px;
  height: 80px;
  border-radius: 12px;
  border: 4px solid ${props => props.theme.colors.surface};
  object-fit: cover;
`;

const DefaultIcon = styled.div`
  width: 80px;
  height: 80px;
  border-radius: 12px;
  border: 4px solid ${props => props.theme.colors.surface};
  background: ${props => props.theme.colors.primary};
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 36px;
  font-weight: bold;
`;

const GroupMeta = styled.div`
  flex: 1;
`;

const GroupName = styled.h1`
  margin: 0 0 4px 0;
  font-size: 28px;
  font-weight: 700;
  color: ${props => props.theme.colors.text};
`;

const GroupSlug = styled.div`
  font-size: 16px;
  color: ${props => props.theme.colors.text.secondary};
  margin-bottom: 12px;
`;

const GroupDescription = styled.p`
  margin: 0 0 12px 0;
  font-size: 14px;
  line-height: 1.5;
  color: ${props => props.theme.colors.text};
`;

const GroupStats = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
`;

const Stat = styled.span`
  color: ${props => props.theme.colors.text.secondary};
`;

const Separator = styled.span`
  color: ${props => props.theme.colors.text.secondary};
`;

const ModeratorsList = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 8px;
`;

const ModeratorItem = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 6px;
`;

const ModeratorAvatar = styled.img`
  width: 24px;
  height: 24px;
  border-radius: 50%;
  object-fit: cover;
`;

const ModeratorLink = styled(Link)<{ $isAdmin?: boolean }>`
  color: ${props => props.$isAdmin ? '#e74c3c' : '#27ae60'};
  text-decoration: none;
  font-weight: 600;
  font-size: 14px;

  &:hover {
    color: ${props => props.$isAdmin ? '#c0392b' : '#229954'};
    text-decoration: underline;
  }
`;

const GroupActions = styled.div`
  display: flex;
  gap: 12px;
`;

const ActionButton = styled.button<{ $secondary?: boolean }>`
  padding: 10px 24px;
  border-radius: 20px;
  border: 1px solid ${props => props.$secondary ? props.theme.colors.border : props.theme.colors.primary};
  background: ${props => props.$secondary ? 'transparent' : props.theme.colors.primary};
  color: ${props => props.$secondary ? props.theme.colors.text : 'white'};
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;

  &:hover {
    background: ${props => props.$secondary ? props.theme.colors.error : props.theme.colors.primary};
    border-color: ${props => props.$secondary ? props.theme.colors.error : props.theme.colors.primary};
    color: ${props => props.$secondary ? props.theme.colors.error : 'white'};
  }
`;

const ContentArea = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 24px 24px;
  display: flex;
  gap: 24px;

  @media (max-width: 968px) {
    flex-direction: column;
  }
`;

const MainContent = styled.div`
  flex: 1;
  min-width: 0;
`;

const FeedHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
`;

const SortButtons = styled.div`
  display: flex;
  gap: 8px;
`;

const SortButton = styled.button<{ $active: boolean }>`
  padding: 8px 16px;
  border-radius: 20px;
  border: 1px solid ${props => props.$active ? props.theme.colors.primary : props.theme.colors.border};
  background: ${props => props.$active ? props.theme.colors.primary : 'transparent'};
  color: ${props => props.$active ? 'white' : props.theme.colors.text};
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    border-color: ${props => props.theme.colors.primary};
  }
`;

const CreatePostButton = styled.button`
  padding: 8px 16px;
  border-radius: 20px;
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

const PostList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const EmptyMessage = styled.div`
  text-align: center;
  padding: 48px;
  color: ${props => props.theme.colors.text.secondary};
  font-size: 16px;
`;

const LoadingMessage = styled.div`
  text-align: center;
  padding: 48px;
  color: ${props => props.theme.colors.text.secondary};
  font-size: 18px;
`;

const ErrorMessage = styled.div`
  padding: 16px;
  background: rgba(244, 67, 54, 0.1);
  border: 1px solid #f44336;
  border-radius: 8px;
  color: #f44336;
  margin: 24px;
`;

const Pagination = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 16px;
  margin-top: 24px;
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

const Sidebar = styled.aside`
  width: 320px;
  flex-shrink: 0;

  @media (max-width: 968px) {
    width: 100%;
  }
`;

const SidebarCard = styled.div`
  background: ${props => props.theme.colors.surface};
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 16px;
`;

const SidebarTitle = styled.h3`
  margin: 0 0 12px 0;
  font-size: 16px;
  font-weight: 700;
  color: ${props => props.theme.colors.text};
`;

const SidebarText = styled.p`
  margin: 0 0 12px 0;
  font-size: 14px;
  line-height: 1.5;
  color: ${props => props.theme.colors.text};
`;

const SidebarStat = styled.div`
  padding: 8px 0;
  font-size: 14px;
  color: ${props => props.theme.colors.text.secondary};
  border-bottom: 1px solid ${props => props.theme.colors.border};

  &:last-child {
    border-bottom: none;
  }
`;

export default GroupPage;
