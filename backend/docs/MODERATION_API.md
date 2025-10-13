# Group Moderation API Documentation

Complete API reference for admin and moderator group management features.

## Authentication

All moderation endpoints require authentication via JWT token:
```
Authorization: Bearer <token>
```

## Permission Levels

- **Admin**: Full control of the group (created the group or promoted by another admin)
- **Moderator**: Can moderate content and members but cannot change group settings
- **Member**: Regular group member

---

## Member Management

### Get Pending Membership Requests
Get list of users waiting for membership approval.

**Endpoint:** `GET /api/groups/:slug/members/pending`

**Access:** Moderators/Admins only

**Query Parameters:**
- `limit` (optional, default: 20): Number of results to return
- `offset` (optional, default: 0): Pagination offset

**Response:**
```json
{
  "success": true,
  "data": {
    "members": [
      {
        "id": 1,
        "group_id": 1,
        "user_id": 5,
        "role": "member",
        "status": "pending",
        "joined_at": "2025-10-12T10:30:00Z",
        "username": "john_doe",
        "first_name": "John",
        "last_name": "Doe"
      }
    ],
    "total": 5,
    "pagination": {
      "limit": 20,
      "offset": 0
    }
  }
}
```

---

### Approve Membership Request
Approve a pending membership request.

**Endpoint:** `POST /api/groups/:slug/members/:userId/approve`

**Access:** Moderators/Admins only

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "group_id": 1,
    "user_id": 5,
    "role": "member",
    "status": "active",
    "joined_at": "2025-10-12T10:30:00Z"
  },
  "message": "Membership approved successfully"
}
```

---

### Reject Membership Request
Reject a pending membership request (removes the request).

**Endpoint:** `POST /api/groups/:slug/members/:userId/reject`

**Access:** Moderators/Admins only

**Response:**
```json
{
  "success": true,
  "message": "Membership rejected successfully"
}
```

---

### Change Member Role
Promote or demote a member's role.

**Endpoint:** `POST /api/groups/:slug/members/:userId/role`

**Access:** Admins only

**Body:**
```json
{
  "role": "moderator"  // Options: "member", "moderator", "admin"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "group_id": 1,
    "user_id": 5,
    "role": "moderator",
    "status": "active"
  },
  "message": "Member role updated successfully"
}
```

---

### Ban Member
Ban a member from the group.

**Endpoint:** `POST /api/groups/:slug/members/:userId/ban`

**Access:** Moderators/Admins only

**Body:**
```json
{
  "banned_reason": "Spamming" // Optional
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "group_id": 1,
    "user_id": 5,
    "status": "banned",
    "banned_by": 2,
    "banned_reason": "Spamming",
    "banned_at": "2025-10-12T11:00:00Z"
  },
  "message": "Member banned successfully"
}
```

---

### Unban Member
Remove a ban from a member.

**Endpoint:** `POST /api/groups/:slug/members/:userId/unban`

**Access:** Moderators/Admins only

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "group_id": 1,
    "user_id": 5,
    "status": "active"
  },
  "message": "Member unbanned successfully"
}
```

---

### Get Banned Members
Get list of all banned members.

**Endpoint:** `GET /api/groups/:slug/members/banned`

**Access:** Moderators/Admins only

**Query Parameters:**
- `limit` (optional, default: 20)
- `offset` (optional, default: 0)

**Response:**
```json
{
  "success": true,
  "data": {
    "members": [
      {
        "id": 1,
        "user_id": 5,
        "username": "spammer",
        "status": "banned",
        "banned_by": 2,
        "banned_reason": "Spamming",
        "banned_at": "2025-10-12T11:00:00Z"
      }
    ],
    "total": 3
  }
}
```

---

## Post Moderation

### Get Pending Posts
Get posts waiting for approval (when `post_approval_required` is enabled).

**Endpoint:** `GET /api/groups/:slug/posts/pending`

**Access:** Moderators/Admins only

**Query Parameters:**
- `limit` (optional, default: 20)
- `offset` (optional, default: 0)

**Response:**
```json
{
  "success": true,
  "data": {
    "posts": [
      {
        "id": 10,
        "title": "My Post Title",
        "content": "Post content...",
        "author": "john_doe",
        "status": "pending",
        "created_at": "2025-10-12T09:00:00Z"
      }
    ],
    "total": 5
  }
}
```

---

### Approve Post
Approve a pending post (makes it visible to all members).

**Endpoint:** `POST /api/groups/:slug/posts/:postId/approve`

**Access:** Moderators/Admins only

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 10,
    "status": "published"
  },
  "message": "Post approved successfully"
}
```

---

### Reject Post
Reject a pending post (deletes it).

**Endpoint:** `POST /api/groups/:slug/posts/:postId/reject`

**Access:** Moderators/Admins only

**Body (optional):**
```json
{
  "rejection_reason": "Violates community guidelines"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Post rejected and removed",
  "data": {
    "rejection_reason": "Violates community guidelines"
  }
}
```

---

### Remove Post
Remove a post (with reason). Post status becomes "removed".

**Endpoint:** `POST /api/groups/:slug/posts/:postId/remove`

**Access:** Moderators/Admins only

**Body:**
```json
{
  "removal_reason": "Spam content"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 10,
    "status": "removed",
    "removed_by": 2,
    "removal_reason": "Spam content"
  },
  "message": "Post removed successfully"
}
```

---

### Restore Post
Restore a previously removed post.

**Endpoint:** `POST /api/groups/:slug/posts/:postId/restore`

**Access:** Moderators/Admins only

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 10,
    "status": "published"
  },
  "message": "Post restored successfully"
}
```

---

### Get Removed Posts
View all removed posts (for moderation review).

**Endpoint:** `GET /api/groups/:slug/posts/removed`

**Access:** Moderators/Admins only

**Query Parameters:**
- `limit` (optional, default: 20)
- `offset` (optional, default: 0)

**Response:**
```json
{
  "success": true,
  "data": {
    "posts": [
      {
        "id": 10,
        "title": "Removed Post",
        "status": "removed",
        "removed_by": 2,
        "removal_reason": "Spam",
        "removed_at": "2025-10-12T10:00:00Z"
      }
    ]
  }
}
```

---

### Pin Post
Pin or unpin a post (keeps it at top of feed).

**Endpoint:** `POST /api/groups/:slug/posts/:postId/pin`

**Access:** Moderators/Admins only

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 10,
    "is_pinned": true
  },
  "message": "Post pinned successfully"
}
```

---

### Lock Post
Lock or unlock a post (prevents new comments).

**Endpoint:** `POST /api/groups/:slug/posts/:postId/lock`

**Access:** Moderators/Admins only

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 10,
    "is_locked": true
  },
  "message": "Post locked successfully"
}
```

---

## Activity & Audit

### Get Group Activity Log
View moderation and administrative actions.

**Endpoint:** `GET /api/groups/:slug/activity`

**Access:** Moderators/Admins only

**Query Parameters:**
- `limit` (optional, default: 50)
- `offset` (optional, default: 0)

**Response:**
```json
{
  "success": true,
  "data": {
    "activities": [
      {
        "id": 1,
        "group_id": 1,
        "user_id": 2,
        "user_username": "admin_alice",
        "action": "ban_member",
        "target_user_id": 5,
        "target_username": "spammer",
        "details": {
          "reason": "Repeated spam"
        },
        "created_at": "2025-10-12T11:00:00Z"
      },
      {
        "id": 2,
        "action": "approve_post",
        "details": {
          "post_id": 10,
          "post_title": "My Post"
        },
        "created_at": "2025-10-12T10:30:00Z"
      }
    ],
    "pagination": {
      "limit": 50,
      "offset": 0
    }
  }
}
```

**Activity Types:**
- `ban_member` - Member was banned
- `unban_member` - Member was unbanned
- `approve_member` - Membership request approved
- `reject_member` - Membership request rejected
- `change_role` - Member role changed
- `approve_post` - Post approved
- `reject_post` - Post rejected
- `remove_post` - Post removed
- `restore_post` - Post restored
- `pin_post` - Post pinned
- `unpin_post` - Post unpinned
- `lock_post` - Post locked
- `unlock_post` - Post unlocked

---

## Error Responses

All endpoints return errors in this format:

```json
{
  "success": false,
  "error": "Error message here"
}
```

**Common Error Codes:**
- `401 Unauthorized` - Not logged in or invalid token
- `403 Forbidden` - Insufficient permissions (not a moderator/admin)
- `404 Not Found` - Group, user, or post not found
- `500 Internal Server Error` - Server error

---

## Usage Examples

### Approve a pending member (cURL)
```bash
curl -X POST http://localhost:3001/api/groups/techcommunity/members/5/approve \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json"
```

### Ban a user (JavaScript/Axios)
```javascript
await axios.post(
  '/api/groups/techcommunity/members/5/ban',
  { banned_reason: 'Violating community guidelines' },
  { headers: { Authorization: `Bearer ${token}` } }
);
```

### Get pending posts (JavaScript/Fetch)
```javascript
const response = await fetch('/api/groups/techcommunity/posts/pending', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
const data = await response.json();
```

---

## Notes

- All timestamps are in ISO 8601 format (UTC)
- Pagination is 0-indexed
- Moderators can perform all actions except:
  - Changing group settings (admins only)
  - Deleting the group (admins only)
  - Changing member roles (admins only)
- Activity log entries are immutable and never deleted
- Banned users cannot view group content or rejoin
