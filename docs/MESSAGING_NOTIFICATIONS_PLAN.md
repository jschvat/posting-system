# Messaging and Notifications System - Architecture Plan

## Overview
This document outlines the architecture for implementing a comprehensive messaging and notifications system for the social media platform.

## System Components

### 1. Direct Messaging System

#### Features
- One-on-one private messaging
- Group conversations (multiple participants)
- Message threads/conversations
- Read receipts and typing indicators
- Message search within conversations
- Media attachments (images, files)
- Message deletion and editing
- Online/offline status
- Real-time delivery via WebSockets

#### Database Schema

**conversations table**
```sql
- id (SERIAL PRIMARY KEY)
- type (VARCHAR) -- 'direct' or 'group'
- title (VARCHAR) -- for group conversations
- created_by (INTEGER) -- user who created conversation
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP) -- last message time
- last_message_id (INTEGER) -- for quick preview
```

**conversation_participants table**
```sql
- id (SERIAL PRIMARY KEY)
- conversation_id (INTEGER) -- FK to conversations
- user_id (INTEGER) -- FK to users
- joined_at (TIMESTAMP)
- left_at (TIMESTAMP) -- NULL if still active
- role (VARCHAR) -- 'admin', 'member'
- muted (BOOLEAN) -- user muted this conversation
- archived (BOOLEAN) -- user archived this conversation
```

**messages table**
```sql
- id (SERIAL PRIMARY KEY)
- conversation_id (INTEGER) -- FK to conversations
- sender_id (INTEGER) -- FK to users
- content (TEXT)
- message_type (VARCHAR) -- 'text', 'image', 'file', 'system'
- attachment_url (VARCHAR) -- for media messages
- attachment_type (VARCHAR) -- mime type
- attachment_size (INTEGER) -- file size in bytes
- reply_to_id (INTEGER) -- FK to messages (for replies)
- edited_at (TIMESTAMP)
- deleted_at (TIMESTAMP) -- soft delete
- created_at (TIMESTAMP)
- INDEXES: conversation_id, sender_id, created_at
```

**message_reads table**
```sql
- id (SERIAL PRIMARY KEY)
- message_id (INTEGER) -- FK to messages
- user_id (INTEGER) -- FK to users
- read_at (TIMESTAMP)
- UNIQUE(message_id, user_id)
```

**typing_indicators table** (in-memory or Redis recommended)
```sql
- conversation_id (INTEGER)
- user_id (INTEGER)
- started_at (TIMESTAMP)
- expires_at (TIMESTAMP) -- auto-expire after 5 seconds
```

### 2. Notifications System

#### Notification Types
1. **Social Interactions**
   - New follower
   - Post reaction (like, etc.)
   - Comment on post
   - Reply to comment
   - Mention in post/comment
   - Share of your post

2. **Group Activity**
   - Invited to group
   - Join request approved/denied
   - New post in followed group
   - Moderator actions (ban, post removal, etc.)

3. **Messaging**
   - New message received
   - Added to group conversation

4. **System Notifications**
   - Account security alerts
   - Policy updates
   - Feature announcements

#### Database Schema

**notifications table**
```sql
- id (SERIAL PRIMARY KEY)
- user_id (INTEGER) -- FK to users (recipient)
- type (VARCHAR) -- notification type (e.g., 'follow', 'comment', 'message')
- title (VARCHAR) -- notification title
- message (TEXT) -- notification content
- actor_id (INTEGER) -- FK to users (who triggered it)
- entity_type (VARCHAR) -- 'post', 'comment', 'group', etc.
- entity_id (INTEGER) -- ID of the related entity
- action_url (VARCHAR) -- where to navigate when clicked
- priority (VARCHAR) -- 'low', 'normal', 'high', 'urgent'
- read_at (TIMESTAMP) -- NULL if unread
- clicked_at (TIMESTAMP) -- NULL if not clicked
- created_at (TIMESTAMP)
- expires_at (TIMESTAMP) -- optional expiration
- INDEXES: user_id, read_at, created_at, type
```

**notification_preferences table**
```sql
- id (SERIAL PRIMARY KEY)
- user_id (INTEGER) -- FK to users
- notification_type (VARCHAR) -- type of notification
- email_enabled (BOOLEAN) -- send email notifications
- push_enabled (BOOLEAN) -- send push notifications
- in_app_enabled (BOOLEAN) -- show in-app notifications
- frequency (VARCHAR) -- 'instant', 'digest_hourly', 'digest_daily'
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
- UNIQUE(user_id, notification_type)
```

**notification_batches table** (for grouped notifications)
```sql
- id (SERIAL PRIMARY KEY)
- user_id (INTEGER) -- FK to users
- type (VARCHAR) -- e.g., 'multiple_reactions'
- entity_type (VARCHAR)
- entity_id (INTEGER)
- count (INTEGER) -- number of similar notifications
- last_actor_id (INTEGER) -- most recent actor
- sample_actor_ids (INTEGER[]) -- array of recent actors
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

### 3. Real-Time Communication (WebSockets)

#### Implementation: Socket.io

**Events to Support:**

**Messaging Events:**
- `message:send` - Send a message
- `message:receive` - Receive a message
- `message:read` - Mark messages as read
- `message:typing` - User is typing
- `message:edit` - Edit a message
- `message:delete` - Delete a message
- `conversation:create` - New conversation created
- `conversation:join` - User joined conversation
- `conversation:leave` - User left conversation
- `user:online` - User came online
- `user:offline` - User went offline

**Notification Events:**
- `notification:new` - New notification received
- `notification:read` - Notification marked as read
- `notification:clear` - Clear all notifications

**Connection Management:**
- Authentication via JWT token
- Room-based messaging (one room per conversation)
- User presence tracking
- Automatic reconnection
- Message queuing for offline users

### 4. API Endpoints

#### Messaging Endpoints

**Conversations:**
```
GET    /api/conversations              - List user's conversations
POST   /api/conversations              - Create new conversation
GET    /api/conversations/:id          - Get conversation details
PUT    /api/conversations/:id          - Update conversation (title, etc.)
DELETE /api/conversations/:id          - Leave/delete conversation
POST   /api/conversations/:id/archive  - Archive conversation
POST   /api/conversations/:id/mute     - Mute conversation
GET    /api/conversations/:id/members  - Get conversation members
POST   /api/conversations/:id/members  - Add members to group
DELETE /api/conversations/:id/members/:userId - Remove member
```

**Messages:**
```
GET    /api/conversations/:id/messages        - Get messages (paginated)
POST   /api/conversations/:id/messages        - Send message
PUT    /api/messages/:id                      - Edit message
DELETE /api/messages/:id                      - Delete message
POST   /api/messages/:id/read                 - Mark as read
GET    /api/conversations/:id/messages/search - Search messages
POST   /api/messages/:id/reply                - Reply to message
```

**Status:**
```
GET    /api/users/:id/online-status    - Get user online status
POST   /api/users/typing               - Send typing indicator
```

#### Notification Endpoints

```
GET    /api/notifications              - Get user notifications (paginated)
GET    /api/notifications/unread       - Get unread count
POST   /api/notifications/:id/read     - Mark as read
POST   /api/notifications/read-all     - Mark all as read
DELETE /api/notifications/:id          - Delete notification
DELETE /api/notifications/clear-all    - Clear all notifications
GET    /api/notifications/preferences  - Get notification preferences
PUT    /api/notifications/preferences  - Update preferences
```

### 5. Frontend Components

#### Messaging Components

**ConversationList.tsx**
- List of all conversations
- Search/filter conversations
- Unread message indicators
- Online status indicators
- Archive/mute actions

**ConversationView.tsx**
- Message thread display
- Send message input
- Typing indicators
- Read receipts
- Scroll to load more (pagination)
- Media preview and upload

**MessageBubble.tsx**
- Individual message display
- Sender info and timestamp
- Edit/delete options
- Reply indicator
- Media attachments

**MessageComposer.tsx**
- Rich text input
- Media upload
- Emoji picker
- @mention autocomplete
- Send button with loading state

**ConversationHeader.tsx**
- Conversation title/participants
- Online status
- Actions (info, mute, archive, leave)

**NewConversationModal.tsx**
- User search
- Create direct or group conversation
- Add multiple participants

#### Notification Components

**NotificationDropdown.tsx**
- Icon with unread badge
- Dropdown list of recent notifications
- Mark all read button
- See all link

**NotificationList.tsx**
- Full notification list page
- Filter by type
- Pagination
- Mark as read/unread
- Delete actions

**NotificationItem.tsx**
- Individual notification display
- Actor avatar and name
- Notification message
- Timestamp
- Action buttons
- Click to navigate

**NotificationPreferences.tsx**
- Settings page for notification preferences
- Toggle email/push/in-app for each type
- Frequency settings
- Quiet hours

### 6. Technical Requirements

#### Backend Dependencies
```json
{
  "socket.io": "^4.6.0",
  "socket.io-client": "^4.6.0",
  "multer": "^1.4.5-lts.1" // for file uploads
}
```

#### Database Triggers
- Auto-update conversation.updated_at on new message
- Auto-update conversation.last_message_id
- Notification aggregation triggers

#### Performance Optimizations
- Message pagination (20-50 per page)
- Virtual scrolling for long message lists
- Debounced typing indicators
- Lazy loading of media
- Notification batching (group similar notifications)
- Redis caching for online status and typing indicators

#### Security Considerations
- Validate user has access to conversation before sending/reading
- Rate limiting on message sending
- File upload validation (type, size)
- XSS prevention in messages
- Message content moderation (optional)

### 7. Implementation Phases

**Phase 1: Database & Backend Core**
1. Create database migrations
2. Create backend models (Conversation, Message, Notification)
3. Implement basic REST API endpoints
4. Add authorization middleware

**Phase 2: Real-Time Communication**
1. Set up Socket.io server
2. Implement WebSocket event handlers
3. Add authentication for WebSocket connections
4. Implement presence tracking

**Phase 3: Frontend Core**
1. Create messaging components
2. Create notification components
3. Implement WebSocket client
4. Add to navigation/routing

**Phase 4: Advanced Features**
1. Message search
2. Media attachments
3. Read receipts
4. Typing indicators
5. Notification preferences
6. Message editing/deletion

**Phase 5: Polish & Testing**
1. Error handling
2. Loading states
3. Optimistic UI updates
4. End-to-end testing
5. Performance optimization

### 8. Migration Strategy

**Migration 018: Messaging System**
- conversations table
- conversation_participants table
- messages table
- message_reads table

**Migration 019: Notifications System**
- notifications table
- notification_preferences table
- notification_batches table

### 9. Success Metrics

- Message delivery time < 200ms
- Notification delivery time < 500ms
- 99.9% WebSocket uptime
- Support for 10,000+ concurrent connections
- Message throughput: 1000+ messages/second

---

## Next Steps

1. Review and approve architecture plan
2. Begin Phase 1 implementation
3. Set up development/testing environment
4. Create database migrations
5. Implement backend models and API
