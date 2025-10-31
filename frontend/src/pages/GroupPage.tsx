import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import styled from 'styled-components';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/Toast';
import { useWebSocket } from '../contexts/WebSocketContext';
import groupsApi from '../services/groupsApi';
import groupPostsApi from '../services/groupPostsApi';
import { Group, GroupPost, PostSortType, VoteType, CreatePostData } from '../types/group';
import GroupPostCard from '../components/groups/GroupPostCard';
import GroupPostComposer from '../components/groups/GroupPostComposer';
import { ConversationView } from '../components/messaging/ConversationView';
import { messagesApi, Conversation, Message } from '../services/api/messagesApi';

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
  const { showError, showSuccess, showInfo } = useToast();

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

  // Chat popup state
  const [showChatPopup, setShowChatPopup] = useState(false);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatLoading, setChatLoading] = useState(false);

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

  const loadGroupChat = async () => {
    if (!slug || !isMember) return;

    try {
      setChatLoading(true);
      const response = await groupsApi.getGroupChat(slug);
      if (response.success && response.data) {
        setConversation(response.data.conversation);
        // Load messages for the conversation
        const messagesResponse = await messagesApi.getMessages(response.data.conversation.id, { limit: 100 });
        if (messagesResponse.success && messagesResponse.data) {
          setMessages(messagesResponse.data.messages || []);
        } else {
          setMessages([]);
        }
      }
    } catch (err: any) {
      console.error('Failed to load group chat:', err);
      showError('Failed to load group chat');
      setMessages([]);
    } finally {
      setChatLoading(false);
    }
  };

  // Load chat when opening popup
  useEffect(() => {
    if (showChatPopup && group?.settings?.chat_enabled && isMember && !conversation) {
      loadGroupChat();
    }
  }, [showChatPopup, group, isMember]);

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
      showError(getErrorMessage(err) || 'Failed to join group');
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
      showError(getErrorMessage(err) || 'Failed to leave group');
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
          showInfo('Your post has been submitted for approval by moderators.');
        }
      }
    } catch (err: any) {
      const errorMsg = getErrorMessage(err);
      if (errorMsg.toLowerCase().includes('member')) {
        showError('You must be a member of this group to create posts. Please join the group first.');
      } else {
        showError(errorMsg || 'Failed to create post');
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
        showError('You must be a member of this group to vote on posts. Please join the group first.');
      } else {
        showError(errorMsg || 'Failed to vote');
      }
    }
  };

  const handlePin = async (postId: number) => {
    if (!slug) return;

    try {
      await groupPostsApi.togglePinPost(slug, postId);
      loadPosts();
    } catch (err: any) {
      showError(getErrorMessage(err) || 'Failed to pin post');
    }
  };

  const handleLock = async (postId: number) => {
    if (!slug) return;

    try {
      await groupPostsApi.toggleLockPost(slug, postId);
      loadPosts();
    } catch (err: any) {
      showError(getErrorMessage(err) || 'Failed to lock post');
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
      showError(getErrorMessage(err) || 'Failed to remove post');
    }
  };

  // Chat message handlers
  const handleSendMessage = async (content: string) => {
    if (!conversation) return;

    try {
      const response = await messagesApi.sendMessage(conversation.id, {
        content,
        message_type: 'text'
      });

      if (response.success && response.data) {
        setMessages(prev => [...(prev || []), response.data!]);
      }
    } catch (err: any) {
      showError('Failed to send message');
    }
  };

  const handleEditMessage = async (messageId: number, content: string) => {
    try {
      const response = await messagesApi.editMessage(messageId, content);
      if (response.success && response.data) {
        setMessages(prev => (prev || []).map(msg =>
          msg.id === messageId
            ? { ...msg, content, edited_at: new Date().toISOString() }
            : msg
        ));
      }
    } catch (err: any) {
      showError('Failed to edit message');
    }
  };

  const handleDeleteMessage = async (messageId: number) => {
    try {
      const response = await messagesApi.deleteMessage(messageId);
      if (response.success) {
        setMessages(prev => (prev || []).map(msg =>
          msg.id === messageId
            ? { ...msg, deleted_at: new Date().toISOString(), content: 'This message was deleted' }
            : msg
        ));
      }
    } catch (err: any) {
      showError('Failed to delete message');
    }
  };

  const handleReactionToggle = async (messageId: number, emoji: string) => {
    try {
      const response = await messagesApi.toggleReaction(messageId, emoji);
      if (response.success && response.data) {
        setMessages(prev => (prev || []).map(msg =>
          msg.id === messageId
            ? { ...msg, reactions: response.data!.reactions }
            : msg
        ));
      }
    } catch (err: any) {
      showError('Failed to toggle reaction');
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
            {group.avatar_url && <GroupIcon src={group.avatar_url} alt={group.display_name} />}
            {!group.avatar_url && <DefaultIcon>{group.name.charAt(0).toUpperCase()}</DefaultIcon>}
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
                {group?.settings?.chat_enabled && (
                  <ActionButton onClick={() => setShowChatPopup(true)}>
                    💬 Chat
                  </ActionButton>
                )}
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

      {/* Group Chat Popup */}
      {showChatPopup && conversation && (
        <GroupChatPopup
          conversation={conversation}
          messages={messages}
          chatLoading={chatLoading}
          onClose={() => setShowChatPopup(false)}
          onSendMessage={handleSendMessage}
          onEditMessage={handleEditMessage}
          onDeleteMessage={handleDeleteMessage}
          onReactionToggle={handleReactionToggle}
          groupName={group.display_name}
          groupSlug={slug!}
        />
      )}
    </Container>
  );
};

// Group Chat Popup Component
interface GroupChatPopupProps {
  conversation: Conversation;
  messages: Message[];
  chatLoading: boolean;
  onClose: () => void;
  onSendMessage: (content: string) => Promise<void>;
  onEditMessage: (messageId: number, content: string) => Promise<void>;
  onDeleteMessage: (messageId: number) => Promise<void>;
  onReactionToggle: (messageId: number, emoji: string) => Promise<void>;
  groupName: string;
  groupSlug: string;
}

const GroupChatPopup: React.FC<GroupChatPopupProps> = ({
  conversation,
  messages,
  chatLoading,
  onClose,
  onSendMessage,
  onEditMessage,
  onDeleteMessage,
  onReactionToggle,
  groupName,
  groupSlug
}) => {
  const [position, setPosition] = useState({ x: window.innerWidth - 420, y: 100 });
  const [size, setSize] = useState({ width: 400, height: 600 });
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const [showMembersList, setShowMembersList] = useState(false);
  const [participants, setParticipants] = useState<any[]>([]);
  const [activeUserIds, setActiveUserIds] = useState<Set<number>>(new Set());
  const { state } = useAuth();
  const { socket } = useWebSocket();

  // Load participants from conversation data
  React.useEffect(() => {
    if (conversation?.participants) {
      setParticipants(conversation.participants);
    }
  }, [conversation]);

  // Join conversation room and track active users
  React.useEffect(() => {
    if (!socket || !conversation?.id) return;

    // Join the conversation room
    socket.emit('conversation:join', { conversationId: conversation.id });

    // Handle joined response with active users
    const handleJoined = (data: any) => {
      if (data.conversationId === conversation.id && data.activeUsers) {
        const activeIds = new Set<number>(data.activeUsers.map((u: any) => u.userId as number));
        setActiveUserIds(activeIds);
      }
    };

    // Handle user joined
    const handleUserJoined = (data: any) => {
      if (data.conversationId === conversation.id) {
        setActiveUserIds(prev => new Set(prev).add(data.userId));
      }
    };

    // Handle user left
    const handleUserLeft = (data: any) => {
      if (data.conversationId === conversation.id) {
        setActiveUserIds(prev => {
          const newSet = new Set(prev);
          newSet.delete(data.userId);
          return newSet;
        });
      }
    };

    socket.on('conversation:joined', handleJoined);
    socket.on('conversation:user:joined', handleUserJoined);
    socket.on('conversation:user:left', handleUserLeft);

    // Cleanup: leave conversation room
    return () => {
      socket.emit('conversation:leave', { conversationId: conversation.id });
      socket.off('conversation:joined', handleJoined);
      socket.off('conversation:user:joined', handleUserJoined);
      socket.off('conversation:user:left', handleUserLeft);
    };
  }, [socket, conversation]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    });
  };

  const handleResizeMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsResizing(true);
    setResizeStart({
      x: e.clientX,
      y: e.clientY,
      width: size.width,
      height: size.height
    });
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (isDragging) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    } else if (isResizing) {
      const newWidth = Math.max(300, resizeStart.width + (e.clientX - resizeStart.x));
      const newHeight = Math.max(400, resizeStart.height + (e.clientY - resizeStart.y));
      setSize({
        width: newWidth,
        height: newHeight
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setIsResizing(false);
  };

  React.useEffect(() => {
    if (isDragging || isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, isResizing, dragStart, resizeStart]);

  return (
    <ChatPopupContainer $position={position} $size={size} $isDragging={isDragging} $isResizing={isResizing}>
      <ChatPopupHeader onMouseDown={handleMouseDown}>
        <ChatPopupTitle>{groupName} Chat</ChatPopupTitle>
        <HeaderActions>
          <MembersButton onClick={() => setShowMembersList(!showMembersList)} title="Toggle active members">
            👥 {activeUserIds.size}
          </MembersButton>
          <CloseButton onClick={onClose}>&times;</CloseButton>
        </HeaderActions>
      </ChatPopupHeader>
      <ChatPopupBody>
        <ChatPopupContent $showSidebar={showMembersList}>
          {chatLoading ? (
            <LoadingMessage>Loading chat...</LoadingMessage>
          ) : (
            <ConversationView
              messages={messages}
              onSendMessage={onSendMessage}
              onEditMessage={onEditMessage}
              onDeleteMessage={onDeleteMessage}
              onReactionToggle={onReactionToggle}
              conversationId={conversation.id}
            />
          )}
        </ChatPopupContent>
        {showMembersList && (
          <MembersSidebar>
            <MembersSidebarHeader>
              Active Now ({activeUserIds.size})
            </MembersSidebarHeader>
            <MembersList>
              {activeUserIds.size === 0 ? (
                <EmptyMembersMessage>
                  No one else is active in this chat right now
                </EmptyMembersMessage>
              ) : (
                participants
                  .filter(participant => activeUserIds.has(participant.user_id || participant.id))
                  .map((participant) => (
                  <MemberItem key={participant.user_id || participant.id}>
                    <MemberAvatar>
                      {participant.avatar_url ? (
                        <img src={participant.avatar_url} alt={participant.username} />
                      ) : (
                        <div>{participant.username?.[0]?.toUpperCase() || '?'}</div>
                      )}
                    </MemberAvatar>
                    <MemberInfo>
                      <MemberName $isCurrentUser={participant.user_id === state.user?.id || participant.id === state.user?.id}>
                        {participant.username}
                        {(participant.user_id === state.user?.id || participant.id === state.user?.id) && ' (You)'}
                      </MemberName>
                      {participant.role && participant.role !== 'member' && (
                        <MemberRole>{participant.role}</MemberRole>
                      )}
                    </MemberInfo>
                  </MemberItem>
                ))
              )}
            </MembersList>
          </MembersSidebar>
        )}
      </ChatPopupBody>
      <ResizeHandle onMouseDown={handleResizeMouseDown} />
    </ChatPopupContainer>
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

// Chat Popup Styled Components
const ChatPopupContainer = styled.div.attrs<{ $position: { x: number; y: number }; $size: { width: number; height: number }; $isDragging: boolean; $isResizing: boolean }>(props => ({
  style: {
    left: `${props.$position.x}px`,
    top: `${props.$position.y}px`,
    width: `${props.$size.width}px`,
    height: `${props.$size.height}px`,
    userSelect: (props.$isDragging || props.$isResizing) ? 'none' : 'auto',
    cursor: props.$isDragging ? 'move' : 'default'
  }
}))<{ $position: { x: number; y: number }; $size: { width: number; height: number }; $isDragging: boolean; $isResizing: boolean }>`
  position: fixed;
  background: ${props => props.theme.colors.surface};
  border-radius: 8px 8px 0 0;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  display: flex;
  flex-direction: column;
  z-index: 1000;
  overflow: hidden;
`;

const ChatPopupHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: ${props => props.theme.colors.primary};
  color: white;
  cursor: move;
  user-select: none;
`;

const ChatPopupTitle = styled.div`
  font-weight: 600;
  font-size: 14px;
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  color: white;
  font-size: 24px;
  cursor: pointer;
  padding: 0;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    opacity: 0.8;
  }
`;

const HeaderActions = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const MembersButton = styled.button`
  background: rgba(255, 255, 255, 0.2);
  border: none;
  color: white;
  font-size: 14px;
  font-weight: 600;
  padding: 6px 12px;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.2s ease;
  display: flex;
  align-items: center;
  gap: 4px;

  &:hover {
    background: rgba(255, 255, 255, 0.3);
  }
`;

const ChatPopupBody = styled.div`
  flex: 1;
  display: flex;
  overflow: hidden;
`;

const ChatPopupContent = styled.div<{ $showSidebar?: boolean }>`
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  width: ${props => props.$showSidebar ? 'calc(100% - 220px)' : '100%'};
  transition: width 0.2s ease;
`;

const MembersSidebar = styled.div`
  width: 220px;
  border-left: 1px solid ${props => props.theme.colors.border};
  background: ${props => props.theme.colors.background};
  display: flex;
  flex-direction: column;
  overflow: hidden;
`;

const MembersSidebarHeader = styled.div`
  padding: 12px 16px;
  border-bottom: 1px solid ${props => props.theme.colors.border};
  font-weight: 600;
  font-size: 13px;
  color: ${props => props.theme.colors.text.secondary};
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const MembersList = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 8px;
`;

const MemberItem = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.2s ease;

  &:hover {
    background: ${props => props.theme.colors.surface};
  }
`;

const MemberAvatar = styled.div`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  overflow: hidden;
  flex-shrink: 0;
  background: ${props => props.theme.colors.primary};
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 14px;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`;

const MemberInfo = styled.div`
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

const MemberName = styled.div<{ $isCurrentUser?: boolean }>`
  font-size: 13px;
  font-weight: ${props => props.$isCurrentUser ? '600' : '500'};
  color: ${props => props.$isCurrentUser ? props.theme.colors.primary : props.theme.colors.text};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const MemberRole = styled.div`
  font-size: 11px;
  color: ${props => props.theme.colors.text.secondary};
  text-transform: capitalize;
  padding: 2px 6px;
  background: ${props => props.theme.colors.surface};
  border-radius: 3px;
  width: fit-content;
`;

const EmptyMembersMessage = styled.div`
  padding: 24px 16px;
  text-align: center;
  font-size: 13px;
  color: ${props => props.theme.colors.text.secondary};
  line-height: 1.5;
`;

const ResizeHandle = styled.div`
  position: absolute;
  bottom: 0;
  right: 0;
  width: 20px;
  height: 20px;
  cursor: nwse-resize;
  background: linear-gradient(
    135deg,
    transparent 0%,
    transparent 50%,
    ${props => props.theme.colors.border} 50%,
    ${props => props.theme.colors.border} 55%,
    transparent 55%,
    transparent 60%,
    ${props => props.theme.colors.border} 60%,
    ${props => props.theme.colors.border} 65%,
    transparent 65%,
    transparent 70%,
    ${props => props.theme.colors.border} 70%,
    ${props => props.theme.colors.border} 75%,
    transparent 75%
  );

  &:hover {
    background: linear-gradient(
      135deg,
      transparent 0%,
      transparent 50%,
      ${props => props.theme.colors.primary} 50%,
      ${props => props.theme.colors.primary} 55%,
      transparent 55%,
      transparent 60%,
      ${props => props.theme.colors.primary} 60%,
      ${props => props.theme.colors.primary} 65%,
      transparent 65%,
      transparent 70%,
      ${props => props.theme.colors.primary} 70%,
      ${props => props.theme.colors.primary} 75%,
      transparent 75%
    );
  }
`;

export default GroupPage;
