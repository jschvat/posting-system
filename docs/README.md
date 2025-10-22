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