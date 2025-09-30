# Social Media Posting System - Backend

A robust backend API for a social media posting platform built with **PostgreSQL and raw SQL** (no ORM).

## Features

- 🔐 **Complete Authentication System**: Registration, login, password reset, email verification
- 📝 **Post Management**: Create, read, update, delete posts with privacy levels
- 💬 **Comment System**: Nested comments with hierarchical structure
- 📎 **Media Handling**: File uploads with metadata and processing
- 👍 **Reactions**: Like/dislike system for posts and comments
- 🔒 **Security**: JWT tokens, bcrypt hashing, rate limiting, input validation
- 🧪 **Comprehensive Testing**: 46+ tests with PostgreSQL test database isolation

## Tech Stack

- **Runtime**: Node.js 16+
- **Framework**: Express.js
- **Database**: PostgreSQL (raw SQL, no ORM)
- **Authentication**: JWT + HTTP-only cookies
- **Security**: Helmet, CORS, Rate limiting, bcryptjs
- **Testing**: Jest + Supertest with isolated PostgreSQL databases
- **Validation**: express-validator

## Quick Start

### Prerequisites

- Node.js 16+ and npm 8+
- PostgreSQL 12+ running locally or accessible via connection string

### Installation

1. **Clone and install dependencies:**
   ```bash
   git clone <repository-url>
   cd posting-system/backend
   npm install
   ```

2. **Set up PostgreSQL database:**
   ```bash
   # Create your main database
   createdb posting_system
   ```

3. **Configure environment:**
   ```bash
   cp .env.example .env
   ```

   Update `.env` with your PostgreSQL connection details:
   ```env
   # Database Configuration (PostgreSQL)
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=posting_system
   DB_USER=your_username
   DB_PASSWORD=your_password

   # OR use a connection string
   DATABASE_URL=postgresql://username:password@localhost:5432/posting_system

   # Application Configuration
   PORT=3002
   NODE_ENV=development
   JWT_SECRET=your-super-secret-jwt-key-here
   ```

4. **Run database migrations:**
   ```bash
   npm run migrate
   ```

5. **Start the development server:**
   ```bash
   npm run dev
   ```

The API will be available at `http://localhost:3002`

## Database Operations

### Migrations
```bash
# Run all migrations
npm run migrate

# Drop all tables (destructive!)
npm run migrate:drop

# Reset database (drop + recreate)
npm run migrate:reset
```

### Raw SQL Architecture

This backend uses **raw SQL queries** instead of an ORM for:
- ✅ **Performance**: Direct SQL execution without ORM overhead
- ✅ **Control**: Full control over queries and optimizations
- ✅ **Transparency**: Clear understanding of database operations
- ✅ **PostgreSQL Features**: Access to PostgreSQL-specific features

All database operations go through the `BaseModel` class which provides:
- Connection pooling via `pg` driver
- Parameter binding for security ($1, $2, etc.)
- Transaction support
- CRUD operations with `RETURNING` clauses

## API Endpoints

### Authentication (`/api/auth`)
- `POST /register` - User registration with validation
- `POST /login` - Login with username/email + password
- `POST /logout` - Logout (clear JWT cookie)
- `GET /me` - Get current user profile
- `POST /refresh` - Refresh JWT token
- `POST /forgot-password` - Request password reset
- `POST /reset-password` - Reset password with token
- `POST /change-password` - Change password (authenticated)
- `POST /verify-email` - Verify email address

### Posts (`/api/posts`)
- `GET /` - Get public posts feed
- `POST /` - Create new post (authenticated)
- `GET /:id` - Get specific post
- `PUT /:id` - Update post (owner only)
- `DELETE /:id` - Delete post (owner only)

### Comments (`/api/comments`)
- `GET /post/:postId` - Get comments for post
- `POST /post/:postId` - Create comment on post
- `GET /:id/replies` - Get replies to comment
- `POST /:id/reply` - Reply to comment
- `PUT /:id` - Update comment (owner only)
- `DELETE /:id` - Delete comment (owner only)

### And more endpoints for media and reactions...

## Testing

### Running Tests

The testing system uses **isolated PostgreSQL databases** for each test run:

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run in watch mode
npm run test:watch

# Run specific test file
npm test src/__tests__/auth.test.js
```

### Test Database Setup

Tests automatically:
1. Create a unique PostgreSQL database (e.g., `test_posting_system_1234567890_abcde`)
2. Run the full schema migration
3. Execute tests with isolated data
4. Clean up and drop the test database

**Test Environment Variables:**
```env
# Required for testing
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=password

# OR use DATABASE_URL
DATABASE_URL=postgresql://user:pass@localhost:5432/postgres
```

### Test Coverage

Current test coverage:
- ✅ **Authentication**: 46/46 tests passing (100%)
- 🔄 **Posts, Comments, Media, Reactions**: Models ready, routes pending

## Project Structure

```
src/
├── config/
│   ├── app.config.js         # Application configuration
│   └── database.js           # PostgreSQL connection setup
├── database/
│   ├── schema.sql           # PostgreSQL schema definition
│   └── migrate.js           # Migration runner
├── middleware/
│   ├── auth.js              # JWT authentication
│   ├── error.js             # Error handling
│   └── validation.js        # Input validation
├── models/
│   ├── BaseModel.js         # Base class for all models (raw SQL)
│   ├── User.js              # User model with auth methods
│   ├── Post.js              # Post model with privacy levels
│   ├── Comment.js           # Comment model with nesting
│   ├── Media.js             # Media model with file handling
│   └── Reaction.js          # Reaction model with aggregation
├── routes/
│   ├── auth.js              # Authentication endpoints
│   ├── posts.js             # Post management
│   ├── users.js             # User profiles
│   └── index.js             # Route aggregation
├── __tests__/
│   ├── testDb.js            # PostgreSQL test database setup
│   ├── testHelpers.js       # Test utilities
│   └── auth.test.js         # Authentication tests (46 tests)
└── server.js                # Express app setup
```

## Security Features

- **JWT Authentication**: Secure token-based auth with HTTP-only cookies
- **Password Security**: bcrypt hashing with configurable rounds
- **Rate Limiting**: Configurable limits on auth endpoints
- **Input Validation**: Comprehensive validation with express-validator
- **SQL Injection Protection**: Parameterized queries ($1, $2, etc.)
- **CORS Configuration**: Configurable cross-origin policies
- **Helmet Security**: Security headers and protections

## Development Scripts

```bash
npm run dev          # Start development server with nodemon
npm run start        # Start production server
npm run lint         # Run ESLint
npm run lint:fix     # Fix ESLint issues
npm test             # Run Jest tests
npm run migrate      # Run database migrations
```

## Environment Configuration

### Required Environment Variables

```env
# Database (choose one)
DATABASE_URL=postgresql://user:pass@host:port/dbname
# OR
DB_HOST=localhost
DB_PORT=5432
DB_NAME=posting_system
DB_USER=postgres
DB_PASSWORD=password

# Application
PORT=3002
NODE_ENV=production
JWT_SECRET=your-jwt-secret-key

# Optional: Email configuration for password reset
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
```

## Production Deployment

1. **Environment Setup:**
   - Set `NODE_ENV=production`
   - Configure `DATABASE_URL` for your PostgreSQL instance
   - Set strong `JWT_SECRET`

2. **Database Migration:**
   ```bash
   npm run migrate
   ```

3. **Start Application:**
   ```bash
   npm start
   ```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Write tests for new features
4. Ensure all tests pass: `npm test`
5. Submit a pull request

## License

MIT License - see LICENSE file for details.