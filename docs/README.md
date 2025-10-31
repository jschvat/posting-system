# Social Media Posting Platform

A comprehensive social media platform similar to Facebook with posting, commenting, media sharing, and emoji reactions.

## Architecture

- **Backend**: Node.js with Express and Sequelize ORM
- **Frontend**: React with modern UI components
- **Database**: PostgreSQL
- **File Storage**: Local file system for images and media
- **Containerization**: Docker for PostgreSQL

## Features

- ✅ Create and view posts
- ✅ Nested comments and replies
- ✅ Image and media upload
- ✅ Emoji reactions
- ✅ User profiles with avatars
- ✅ Real-time updates
- ✅ Responsive design
- ✅ Direct messaging with WebSocket support
- ✅ Group chat with draggable/resizable popup
- ✅ Real-time active user tracking in group chats
- ✅ Online status presence system (currently hidden on homepage)

## Quick Start

1. Start PostgreSQL container:
   ```bash
   docker-compose up -d
   ```

2. Install and start backend:
   ```bash
   cd backend
   npm install
   npm run dev
   ```

3. Install and start frontend:
   ```bash
   cd frontend
   npm install
   npm start
   ```

4. Seed the database with test data:
   ```bash
   cd backend
   npm run seed
   ```

## Project Structure

```
posting-system/
├── backend/           # Node.js API server
├── frontend/          # React application
├── uploads/          # Media file storage
│   ├── images/       # Post images
│   └── avatars/      # User avatars
├── docker-compose.yml # PostgreSQL container
└── README.md         # This file
```

## API Endpoints

- `GET /api/posts` - Get all posts
- `POST /api/posts` - Create new post
- `GET /api/posts/:id` - Get single post with comments
- `POST /api/posts/:id/comments` - Add comment to post
- `POST /api/posts/:id/react` - Add emoji reaction
- `POST /api/upload` - Upload media files
- `GET /api/users` - Get all users
- `GET /api/users/:id` - Get user profile

## UI Feature Toggles

### Online Followers Sidebar

The "Online Followers" component shows which of your followed users are currently online. This feature is fully functional but currently hidden from the homepage.

**To show it on the homepage:**

Edit `frontend/src/pages/HomePage.tsx` and uncomment the `<OnlineFollowers />` component in the Sidebar sections (appears in 3 locations around lines 258, 279, and 349):

```tsx
<Sidebar>
  <OnlineFollowers />  {/* Uncomment this line */}
</Sidebar>
```

**Technical Details:**
- The presence tracking system remains active in the background via WebSocket
- Users' online status is still tracked and available through the WebSocket context
- The component is only hidden from the UI, not disabled
- Online status is still visible in group chat "Active Now" sidebars

**Related Components:**
- `frontend/src/components/sidebar/OnlineFollowers.tsx` - The component itself
- `frontend/src/contexts/WebSocketContext.tsx` - Manages WebSocket connections and presence
- `backend/src/websocket/handlers/presenceHandlers.js` - Backend presence tracking logic