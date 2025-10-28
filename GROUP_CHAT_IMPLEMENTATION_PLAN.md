# Group Chat Integration - Implementation Plan

## Overview
Add optional group chat functionality to community Groups, allowing admins to enable a group-wide chat room for all members.

## Difficulty Assessment: **EASY TO MEDIUM** ⭐⭐⭐☆☆

**Estimated Time**: 4-6 hours for a skilled developer

**Why It's Relatively Easy**:
- Both systems (Groups & Messaging) already fully implemented
- Just need to connect existing components
- Can leverage existing conversation UI
- Most code already exists and can be reused

---

## Required Changes

### 1. Database Changes (30 minutes)

#### Migration File: `backend/src/database/migrations/020_group_chat_integration.sql`

```sql
-- Add conversation_id to groups table
ALTER TABLE groups
ADD COLUMN conversation_id INTEGER REFERENCES conversations(id) ON DELETE SET NULL;

-- Add index
CREATE INDEX idx_groups_conversation ON groups(conversation_id);

-- Add group_id to conversations table for reverse lookup (optional but useful)
ALTER TABLE conversations
ADD COLUMN group_id INTEGER REFERENCES groups(id) ON DELETE SET NULL;

-- Add index
CREATE INDEX idx_conversations_group ON conversations(group_id);

-- Add chat_enabled to group settings
-- (Can use existing JSONB settings field, no schema change needed)

-- Update comment
COMMENT ON COLUMN groups.conversation_id IS 'Optional group chat conversation for members';
COMMENT ON COLUMN conversations.group_id IS 'Associated group if this is a group chat';
```

**Complexity**: ⭐ Very Simple
- Just adding two foreign key columns
- No data migration needed (all NULL initially)

---

### 2. Backend API Changes (1.5 hours)

#### A. Update Group Settings Model
**File**: `backend/src/models/group.js`

Add to group settings validation:
```javascript
// Add to settings schema
const validSettings = {
  chat_enabled: typeof settings.chat_enabled === 'boolean' ? settings.chat_enabled : false,
  // ... existing settings
};
```

**Complexity**: ⭐ Very Simple

---

#### B. Create/Update Group Settings Endpoint
**File**: `backend/src/routes/groups.js`

Add handler for enabling/disabling chat:

```javascript
/**
 * @route   PUT /api/groups/:slug/settings
 * @desc    Update group settings (including chat)
 * @access  Private (Admin only)
 */
router.put('/:slug/settings', auth, async (req, res) => {
  try {
    const { slug } = req.params;
    const { chat_enabled, ...otherSettings } = req.body;

    // Get group and verify admin
    const group = await Group.findBySlug(slug);
    if (!group) {
      return res.status(404).json({ success: false, error: 'Group not found' });
    }

    // Check admin permission
    const membership = await GroupMembership.findByGroupAndUser(group.id, req.user.id);
    if (!membership || membership.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Admin access required' });
    }

    // Handle chat_enabled change
    if (typeof chat_enabled === 'boolean') {
      if (chat_enabled && !group.conversation_id) {
        // Create group conversation
        const conversation = await createGroupConversation(group);
        await Group.update(group.id, { conversation_id: conversation.id });

        // Add all current members to conversation
        const members = await GroupMembership.findByGroup(group.id);
        for (const member of members) {
          if (member.status === 'active') {
            await ConversationParticipant.add(conversation.id, member.user_id);
          }
        }
      } else if (!chat_enabled && group.conversation_id) {
        // Disable chat (could archive or delete conversation)
        // For now, just remove the link
        await Group.update(group.id, { conversation_id: null });
      }

      // Update settings
      const newSettings = { ...group.settings, chat_enabled };
      await Group.updateSettings(group.id, newSettings);
    }

    // ... handle other settings

    res.json({ success: true, data: { group: updatedGroup } });
  } catch (error) {
    console.error('Error updating group settings:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// Helper function
async function createGroupConversation(group) {
  const conversation = await Conversation.create({
    type: 'group',
    title: `${group.display_name} Chat`,
    created_by: group.creator_id,
    group_id: group.id
  });
  return conversation;
}
```

**Complexity**: ⭐⭐ Simple
- Reuses existing conversation creation logic
- Standard admin permission check pattern

---

#### C. Update Group Membership Endpoints
**File**: `backend/src/routes/groups.js`

Add to join/leave handlers:

```javascript
// When user joins group
router.post('/:slug/join', auth, async (req, res) => {
  // ... existing join logic

  // If group has chat enabled, add to conversation
  if (group.conversation_id && group.settings?.chat_enabled) {
    await ConversationParticipant.add(group.conversation_id, req.user.id);
  }

  // ... rest of handler
});

// When user leaves group
router.post('/:slug/leave', auth, async (req, res) => {
  // ... existing leave logic

  // Remove from group chat
  if (group.conversation_id) {
    await ConversationParticipant.remove(group.conversation_id, req.user.id);
  }

  // ... rest of handler
});
```

**Complexity**: ⭐ Very Simple
- Just 2-3 lines added to existing functions

---

#### D. Get Group Chat Endpoint
**File**: `backend/src/routes/groups.js`

```javascript
/**
 * @route   GET /api/groups/:slug/chat
 * @desc    Get group chat conversation
 * @access  Private (Members only)
 */
router.get('/:slug/chat', auth, async (req, res) => {
  try {
    const { slug } = req.params;

    const group = await Group.findBySlug(slug);
    if (!group) {
      return res.status(404).json({ success: false, error: 'Group not found' });
    }

    // Check membership
    const membership = await GroupMembership.findByGroupAndUser(group.id, req.user.id);
    if (!membership || membership.status !== 'active') {
      return res.status(403).json({ success: false, error: 'Members only' });
    }

    // Check if chat is enabled
    if (!group.conversation_id || !group.settings?.chat_enabled) {
      return res.status(404).json({ success: false, error: 'Group chat not enabled' });
    }

    // Get conversation
    const conversation = await Conversation.findById(group.conversation_id);

    res.json({ success: true, data: { conversation } });
  } catch (error) {
    console.error('Error getting group chat:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});
```

**Complexity**: ⭐ Very Simple
- Standard membership check pattern
- Returns existing conversation object

---

### 3. Frontend API Service (15 minutes)

**File**: `frontend/src/services/groupsApi.ts`

Add methods:

```typescript
// Add to groupsApi
getGroupChat: async (slug: string): Promise<ApiResponse<Conversation>> => {
  const response = await apiClient.get(`/groups/${slug}/chat`);
  return response.data;
},

updateGroupSettings: async (slug: string, settings: {
  chat_enabled?: boolean;
  // ... other settings
}): Promise<ApiResponse<Group>> => {
  const response = await apiClient.put(`/groups/${slug}/settings`, settings);
  return response.data;
},
```

**Complexity**: ⭐ Very Simple
- Standard API wrapper methods

---

### 4. Frontend UI Changes (2 hours)

#### A. Update GroupSettingsPage
**File**: `frontend/src/pages/GroupSettingsPage.tsx`

Add state and UI:

```typescript
// Add state
const [chatEnabled, setChatEnabled] = useState(false);

// Load from group
useEffect(() => {
  if (group) {
    setChatEnabled(group.settings?.chat_enabled || false);
  }
}, [group]);

// Add to save handler
const handleSave = async () => {
  // ... existing save logic

  await groupsApi.updateGroupSettings(slug, {
    chat_enabled: chatEnabled,
    // ... other settings
  });
};

// Add to JSX (in settings form)
<SettingSection>
  <SettingHeader>Group Chat</SettingHeader>
  <SettingDescription>
    Enable a group-wide chat room for all members
  </SettingDescription>
  <CheckboxLabel>
    <Checkbox
      type="checkbox"
      checked={chatEnabled}
      onChange={(e) => setChatEnabled(e.target.checked)}
    />
    Enable group chat
  </CheckboxLabel>
  {chatEnabled && (
    <InfoBox>
      All current and future members will have access to the group chat.
      The chat will appear on the group page.
    </InfoBox>
  )}
</SettingSection>
```

**Complexity**: ⭐ Very Simple
- Copy existing checkbox pattern
- One boolean state variable

---

#### B. Update GroupPage - Add Chat Tab
**File**: `frontend/src/pages/GroupPage.tsx`

Add tab navigation and chat view:

```typescript
import { ConversationView } from '../components/messaging/ConversationView';
import { messagesApi } from '../services/api';

// Add state
const [activeTab, setActiveTab] = useState<'posts' | 'chat'>('posts');
const [conversation, setConversation] = useState<Conversation | null>(null);
const [chatLoading, setChatLoading] = useState(false);

// Load group chat if enabled
useEffect(() => {
  if (group?.settings?.chat_enabled && isMember) {
    loadGroupChat();
  }
}, [group, isMember]);

const loadGroupChat = async () => {
  try {
    setChatLoading(true);
    const response = await groupsApi.getGroupChat(slug);
    if (response.success && response.data) {
      setConversation(response.data);
    }
  } catch (err) {
    console.error('Failed to load group chat:', err);
  } finally {
    setChatLoading(false);
  }
};

// Add tab navigation JSX (after group header)
{isMember && group?.settings?.chat_enabled && (
  <TabNavigation>
    <Tab
      $active={activeTab === 'posts'}
      onClick={() => setActiveTab('posts')}
    >
      Posts
    </Tab>
    <Tab
      $active={activeTab === 'chat'}
      onClick={() => setActiveTab('chat')}
    >
      Chat
    </Tab>
  </TabNavigation>
)}

// Add conditional rendering
{activeTab === 'posts' && (
  <PostsList>
    {/* Existing posts list */}
  </PostsList>
)}

{activeTab === 'chat' && (
  <ChatContainer>
    {chatLoading ? (
      <LoadingMessage>Loading chat...</LoadingMessage>
    ) : conversation ? (
      <ConversationView conversation={conversation} />
    ) : (
      <EmptyMessage>Chat not available</EmptyMessage>
    )}
  </ChatContainer>
)}

// Add styled components
const TabNavigation = styled.div`
  display: flex;
  gap: 8px;
  margin: 20px 0;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
`;

const Tab = styled.button<{ $active: boolean }>`
  padding: 12px 24px;
  background: none;
  border: none;
  border-bottom: 2px solid ${({ theme, $active }) =>
    $active ? theme.colors.primary : 'transparent'};
  color: ${({ theme, $active }) =>
    $active ? theme.colors.primary : theme.colors.text.secondary};
  font-weight: ${({ $active }) => $active ? 600 : 400};
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    color: ${({ theme }) => theme.colors.primary};
  }
`;

const ChatContainer = styled.div`
  background: ${({ theme }) => theme.colors.surface};
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  padding: 20px;
  min-height: 500px;
`;
```

**Complexity**: ⭐⭐ Simple to Medium
- Reuses existing ConversationView component (already built!)
- Standard tab navigation pattern
- ~50 lines of code

---

#### C. Update Group Type Definition
**File**: `frontend/src/types/group.ts`

```typescript
export interface Group {
  // ... existing fields
  conversation_id?: number;
  settings?: {
    chat_enabled?: boolean;
    // ... other settings
  };
}
```

**Complexity**: ⭐ Very Simple

---

### 5. WebSocket Integration (Already Done!) ✅

**No changes needed** - The existing WebSocketContext already handles:
- Joining/leaving conversations
- Real-time messages
- Typing indicators
- Read receipts

The ConversationView component automatically handles all WebSocket events!

---

### 6. Automated Member Sync (30 minutes - Optional Enhancement)

Add database triggers to auto-sync members:

```sql
-- Auto-add to chat when joining group
CREATE OR REPLACE FUNCTION sync_group_chat_on_join()
RETURNS TRIGGER AS $$
BEGIN
  -- If group has chat enabled and user is joining
  IF NEW.status = 'active' THEN
    DECLARE
      v_conversation_id INTEGER;
      v_chat_enabled BOOLEAN;
    BEGIN
      SELECT conversation_id, settings->>'chat_enabled'::boolean
      INTO v_conversation_id, v_chat_enabled
      FROM groups
      WHERE id = NEW.group_id;

      IF v_conversation_id IS NOT NULL AND v_chat_enabled = true THEN
        -- Add to conversation
        INSERT INTO conversation_participants (conversation_id, user_id, role)
        VALUES (v_conversation_id, NEW.user_id, 'member')
        ON CONFLICT (conversation_id, user_id) DO NOTHING;
      END IF;
    END;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_sync_group_chat_on_join
AFTER INSERT OR UPDATE ON group_memberships
FOR EACH ROW
EXECUTE FUNCTION sync_group_chat_on_join();

-- Auto-remove from chat when leaving group
CREATE OR REPLACE FUNCTION sync_group_chat_on_leave()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status = 'active' AND NEW.status != 'active' THEN
    DECLARE
      v_conversation_id INTEGER;
    BEGIN
      SELECT conversation_id INTO v_conversation_id
      FROM groups
      WHERE id = NEW.group_id;

      IF v_conversation_id IS NOT NULL THEN
        -- Mark as left
        UPDATE conversation_participants
        SET left_at = CURRENT_TIMESTAMP
        WHERE conversation_id = v_conversation_id
        AND user_id = NEW.user_id
        AND left_at IS NULL;
      END IF;
    END;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_sync_group_chat_on_leave
AFTER UPDATE ON group_memberships
FOR EACH ROW
EXECUTE FUNCTION sync_group_chat_on_leave();
```

**Complexity**: ⭐⭐ Medium
- Makes it automatic (no manual sync needed)
- Prevents sync bugs

---

## Testing Checklist

### Backend Tests
- [ ] Create group with chat enabled
- [ ] Disable chat for existing group
- [ ] Re-enable chat (should create new conversation)
- [ ] New member joins → auto-added to chat
- [ ] Member leaves → auto-removed from chat
- [ ] Non-member cannot access chat endpoint
- [ ] Non-admin cannot enable chat

### Frontend Tests
- [ ] Settings page shows chat toggle
- [ ] Chat tab appears when enabled
- [ ] Chat tab hidden when disabled
- [ ] ConversationView loads correctly
- [ ] Messages send/receive in group chat
- [ ] Typing indicators work
- [ ] Read receipts work
- [ ] Tab switching works smoothly

---

## Summary

### Total Time Estimate: **4-6 hours**

| Task | Time | Difficulty |
|------|------|-----------|
| Database migration | 30 min | ⭐ Very Easy |
| Backend API endpoints | 1.5 hrs | ⭐⭐ Easy |
| Frontend API service | 15 min | ⭐ Very Easy |
| Group Settings UI | 30 min | ⭐ Very Easy |
| Group Page Chat Tab | 1.5 hrs | ⭐⭐ Easy |
| Testing & Bug fixes | 1 hr | ⭐⭐ Easy |
| **TOTAL** | **5 hours** | **⭐⭐⭐ Easy-Medium** |

### Why It's Easy:
1. ✅ **Both systems fully implemented** - Just connecting them
2. ✅ **ConversationView component exists** - Can reuse 100%
3. ✅ **WebSocket already working** - No changes needed
4. ✅ **Settings UI pattern exists** - Copy checkbox pattern
5. ✅ **Tab navigation is simple** - Standard React pattern
6. ✅ **No complex data migration** - Just adding FK columns

### Risks & Gotchas:
1. ⚠️ **Member sync** - Must ensure members stay in sync (solved with triggers)
2. ⚠️ **Conversation deletion** - Decide if disabling chat deletes or archives
3. ⚠️ **Large groups** - Chat could get noisy (consider adding mute option)
4. ⚠️ **Permissions** - Banned members should be removed from chat

### Recommended Approach:
1. Start with database migration
2. Implement backend endpoints (test with Postman)
3. Add frontend API methods
4. Update GroupSettingsPage (test toggle on/off)
5. Add chat tab to GroupPage
6. Test full flow end-to-end
7. Add automated triggers for member sync
8. Polish and add error handling

### Future Enhancements (Post-MVP):
- Chat notifications
- @mentions in group chat
- Pin important messages
- Chat moderation (delete messages, mute users)
- Separate chat permissions (members vs moderators)
- Chat search
- Rich media in chat (images, files)

---

## Conclusion

**Difficulty: EASY** - This is a straightforward feature addition that primarily involves:
- Connecting two existing, working systems
- Adding a settings toggle
- Reusing an existing UI component
- Standard database foreign keys

Most of the heavy lifting (messaging system, real-time updates, UI components) is **already done**. You're just wiring them together, which is why this is much easier than building from scratch.

A competent developer should complete this in a **single day** (~5 hours of focused work).
