# Frontend Testing Documentation

## Overview

This document provides comprehensive information about the frontend test suite for the Posting System application. The test suite covers all major components, pages, contexts, and utilities to ensure code quality and prevent regressions.

## Test Stack

- **Testing Framework**: Jest
- **Testing Library**: React Testing Library
- **User Interaction**: @testing-library/user-event
- **Assertion Library**: @testing-library/jest-dom
- **Mocking**: Jest mocks for API calls and external dependencies

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run tests with coverage
npm test -- --coverage

# Run specific test file
npm test -- CommentForm.test.tsx

# Run tests matching a pattern
npm test -- --testNamePattern="should submit comment"
```

## Test Structure

```
frontend/src/
├── __tests__/
│   ├── components/
│   │   ├── CommentForm.test.tsx
│   │   ├── LoadingSpinner.test.tsx
│   │   ├── RatingBadge.test.tsx
│   │   ├── Toast.test.tsx
│   │   ├── messaging/
│   │   │   └── MessageBubble.test.tsx
│   │   └── groups/
│   │       └── GroupCard.test.tsx
│   ├── contexts/
│   │   ├── AuthContext.test.tsx
│   │   └── WebSocketContext.test.tsx
│   ├── pages/
│   │   ├── HomePage.test.tsx
│   │   └── LoginPage.test.tsx
│   └── utils/
│       ├── testUtils.tsx      # Shared test utilities
│       └── mockApi.ts         # API mocking helpers
├── setupTests.ts              # Global test setup
└── App.test.tsx               # App-level tests
```

## Test Utilities

### `testUtils.tsx`

Provides helper functions and mock data for testing:

#### `renderWithProviders()`

Renders components with all necessary providers (Router, Query Client, Theme, Auth, WebSocket, Toast):

```typescript
import { renderWithProviders } from '../utils/testUtils';

it('should render component', () => {
  renderWithProviders(<MyComponent />);
  expect(screen.getByText('Hello')).toBeInTheDocument();
});
```

#### Mock Data

Pre-configured mock data for common entities:

- `mockUser` - Sample user object
- `mockPost` - Sample post object
- `mockComment` - Sample comment object
- `mockGroup` - Sample group object
- `mockMessage` - Sample message object
- `mockConversation` - Sample conversation object

Example usage:

```typescript
import { mockUser, mockPost } from '../utils/testUtils';

it('should display user info', () => {
  renderWithProviders(<UserCard user={mockUser} />);
  expect(screen.getByText(mockUser.username)).toBeInTheDocument();
});
```

### `mockApi.ts`

Utilities for mocking API responses:

```typescript
import { mockAxiosSuccess, mockAxiosError } from '../utils/mockApi';

it('should handle API success', () => {
  mockAxiosSuccess({ data: 'response' });
  // Test component behavior
});

it('should handle API error', () => {
  mockAxiosError({ message: 'Network error', status: 500 });
  // Test error handling
});
```

## Test Categories

### 1. Context Tests

**Location**: `__tests__/contexts/`

Tests for React Context providers that manage global state.

#### AuthContext Tests
- Initial authentication state
- Login flow (success and error cases)
- Registration flow
- Logout functionality
- Token persistence in localStorage
- User data updates
- Error handling

#### WebSocketContext Tests
- Socket connection lifecycle
- Event subscriptions (message, typing, notification, presence)
- Event emission (join, leave, sendMessage, typing)
- Unsubscribe functionality
- Multiple subscriber handling
- Error handling without connection

### 2. Component Tests

**Location**: `__tests__/components/`

Tests for individual React components.

#### Core Components

##### CommentForm
- Form rendering
- Input handling
- Validation (empty, whitespace, max length)
- Successful submission
- Error handling
- Loading states
- Cancel functionality
- Reply to parent comments
- Authentication checks

##### LoadingSpinner
- Size variants (small, medium, large)
- Loading text display
- Custom className support
- Accessibility (role="status")

##### Toast
- Toast display (success, error, warning, info)
- Auto-dismiss after duration
- Custom duration support
- Manual dismissal
- Multiple toast handling
- Hook usage (useToast)
- Accessibility (role="alert")

##### RatingBadge
- All score ranges (0-99, 100-199, ..., 900-1000)
- Badge types (Newcomer, Star, Badge, Trophy)
- Badge tiers (Bronze, Silver, Gold)
- Size variants (tiny, small, medium, large)
- Score display toggle
- Inline vs block display
- Tooltip functionality
- Edge cases (negative scores, scores > 1000)

#### Messaging Components

##### MessageBubble
- Message content rendering
- Message types (text, image, file)
- Own vs received message styling
- Edit/delete/reply actions
- Message reactions
- Read receipts
- Reply context display
- Edited/deleted indicators
- Timestamp display
- Accessibility

#### Group Components

##### GroupCard
- Group information display (name, description, icon)
- Member and post count formatting (K, M suffixes)
- Visibility badges (private, invite-only)
- Role badges (admin, moderator)
- Join/leave button functionality
- Navigation to group page
- Edge cases (zero members, long names)
- Accessibility

### 3. Page Tests

**Location**: `__tests__/pages/`

Tests for full page components.

#### HomePage
- Loading state
- Posts display
- Empty state handling
- Error handling
- Pagination (load more)
- Post interactions (reactions, comments, shares)
- Media display
- Privacy level indicators
- Timestamp display
- Accessibility

#### LoginPage
- Login form rendering
- Registration form rendering
- Form validation
- Successful login/registration
- Error handling
- Loading states
- Password visibility toggle
- Tab switching
- Authentication redirect
- Keyboard navigation

### 4. App-Level Tests

**Location**: `App.test.tsx`

Tests for the main App component.

- Initial rendering
- Authentication flow
- Provider initialization (Auth, WebSocket, Theme, Query, Toast)
- Routing configuration
- 404 handling
- Error boundaries
- Accessibility

## Testing Patterns

### 1. Component Rendering

```typescript
it('should render component', () => {
  renderWithProviders(<Component />);
  expect(screen.getByText('Expected Text')).toBeInTheDocument();
});
```

### 2. User Interactions

```typescript
it('should handle click', async () => {
  renderWithProviders(<Button onClick={mockFn} />);
  const user = userEvent.setup();

  await user.click(screen.getByRole('button'));

  expect(mockFn).toHaveBeenCalled();
});
```

### 3. Form Submission

```typescript
it('should submit form', async () => {
  renderWithProviders(<Form onSubmit={mockSubmit} />);
  const user = userEvent.setup();

  await user.type(screen.getByLabelText(/name/i), 'John');
  await user.click(screen.getByRole('button', { name: /submit/i }));

  await waitFor(() => {
    expect(mockSubmit).toHaveBeenCalledWith({ name: 'John' });
  });
});
```

### 4. API Mocking

```typescript
import * as api from '../../services/api';

jest.mock('../../services/api');
const mockedApi = api as jest.Mocked<typeof api>;

it('should fetch data', async () => {
  mockedApi.postsApi.getPosts.mockResolvedValue({ posts: [] });

  renderWithProviders(<HomePage />);

  await waitFor(() => {
    expect(screen.getByText(/no posts/i)).toBeInTheDocument();
  });
});
```

### 5. Async Testing

```typescript
it('should wait for async operation', async () => {
  renderWithProviders(<AsyncComponent />);

  await waitFor(() => {
    expect(screen.getByText('Loaded')).toBeInTheDocument();
  });
});
```

### 6. Error Handling

```typescript
it('should display error', async () => {
  mockedApi.postsApi.getPosts.mockRejectedValue(
    new Error('Failed to fetch')
  );

  renderWithProviders(<HomePage />);

  await waitFor(() => {
    expect(screen.getByText(/failed to fetch/i)).toBeInTheDocument();
  });
});
```

## Best Practices

### 1. Test Isolation

- Each test should be independent
- Clean up after each test (localStorage, mocks)
- Use `beforeEach` and `afterEach` hooks

```typescript
beforeEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
});

afterEach(() => {
  jest.restoreAllMocks();
});
```

### 2. Use Semantic Queries

Prefer queries that reflect how users interact with the app:

```typescript
// Good - semantic and accessible
screen.getByRole('button', { name: /submit/i })
screen.getByLabelText(/username/i)
screen.getByText(/welcome/i)

// Avoid - implementation details
screen.getByClassName('submit-button')
screen.getByTestId('username-input')
```

### 3. Test User Behavior

Focus on what the user sees and does, not implementation:

```typescript
// Good - tests behavior
it('should show error when form is empty', async () => {
  renderWithProviders(<Form />);
  await userEvent.click(screen.getByRole('button', { name: /submit/i }));
  expect(screen.getByText(/required/i)).toBeInTheDocument();
});

// Avoid - tests implementation
it('should set error state', () => {
  const { result } = renderHook(() => useForm());
  act(() => result.current.submit());
  expect(result.current.error).toBe('Required');
});
```

### 4. Descriptive Test Names

Use clear, descriptive test names:

```typescript
// Good
it('should display error message when login fails')
it('should disable submit button while form is submitting')
it('should clear form after successful submission')

// Avoid
it('works')
it('test login')
it('handles error')
```

### 5. Group Related Tests

Use `describe` blocks to organize tests:

```typescript
describe('CommentForm', () => {
  describe('Validation', () => {
    it('should not submit empty comment');
    it('should not submit comment exceeding max length');
  });

  describe('Submission', () => {
    it('should submit valid comment');
    it('should clear form after submission');
  });
});
```

### 6. Mock External Dependencies

Always mock external services:

```typescript
// Mock API
jest.mock('../../services/api');

// Mock Socket.io
jest.mock('socket.io-client');

// Mock router
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));
```

## Common Testing Scenarios

### Testing Forms

```typescript
it('should validate and submit form', async () => {
  const mockSubmit = jest.fn();
  renderWithProviders(<Form onSubmit={mockSubmit} />);
  const user = userEvent.setup();

  // Fill form
  await user.type(screen.getByLabelText(/username/i), 'testuser');
  await user.type(screen.getByLabelText(/password/i), 'password123');

  // Submit
  await user.click(screen.getByRole('button', { name: /submit/i }));

  // Verify
  await waitFor(() => {
    expect(mockSubmit).toHaveBeenCalledWith({
      username: 'testuser',
      password: 'password123',
    });
  });
});
```

### Testing Modals

```typescript
it('should open and close modal', async () => {
  renderWithProviders(<Component />);
  const user = userEvent.setup();

  // Open modal
  await user.click(screen.getByRole('button', { name: /open/i }));
  expect(screen.getByRole('dialog')).toBeInTheDocument();

  // Close modal
  await user.click(screen.getByRole('button', { name: /close/i }));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});
```

### Testing Lists

```typescript
it('should render list of items', async () => {
  const items = [
    { id: 1, name: 'Item 1' },
    { id: 2, name: 'Item 2' },
  ];

  mockedApi.getItems.mockResolvedValue(items);
  renderWithProviders(<ItemList />);

  await waitFor(() => {
    expect(screen.getByText('Item 1')).toBeInTheDocument();
    expect(screen.getByText('Item 2')).toBeInTheDocument();
  });
});
```

### Testing Timers

```typescript
it('should auto-dismiss after timeout', async () => {
  jest.useFakeTimers();

  renderWithProviders(<Toast message="Test" duration={3000} />);
  expect(screen.getByText('Test')).toBeInTheDocument();

  act(() => {
    jest.advanceTimersByTime(3000);
  });

  await waitFor(() => {
    expect(screen.queryByText('Test')).not.toBeInTheDocument();
  });

  jest.useRealTimers();
});
```

## Coverage Goals

Target coverage metrics:

- **Statements**: > 80%
- **Branches**: > 75%
- **Functions**: > 80%
- **Lines**: > 80%

Check coverage:

```bash
npm test -- --coverage
```

## Continuous Integration

Tests should run automatically on:

- Every commit (pre-commit hook)
- Every pull request
- Before deployment

## Troubleshooting

### Common Issues

#### 1. "act" Warnings

Wrap state updates in `act()` or use `waitFor()`:

```typescript
// Good
await waitFor(() => {
  expect(screen.getByText('Loaded')).toBeInTheDocument();
});

// Also good
await act(async () => {
  await user.click(button);
});
```

#### 2. Async Queries Not Finding Elements

Use `findBy` queries for async elements:

```typescript
// Good
const element = await screen.findByText('Async Content');

// Avoid
const element = screen.getByText('Async Content'); // May fail
```

#### 3. Timer Issues

Use fake timers and advance them properly:

```typescript
beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.runOnlyPendingTimers();
  jest.useRealTimers();
});
```

#### 4. localStorage Not Persisting

Clear and set localStorage in tests:

```typescript
beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('auth', JSON.stringify(mockAuth));
});
```

## Additional Resources

- [React Testing Library Docs](https://testing-library.com/react)
- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Testing Library Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
- [User Event Documentation](https://testing-library.com/docs/user-event/intro/)

## Contributing

When adding new features:

1. Write tests before or alongside the implementation
2. Ensure tests are comprehensive and cover edge cases
3. Follow existing test patterns
4. Update this documentation if adding new test utilities
5. Maintain or improve coverage metrics

## Summary

This comprehensive test suite provides:

- ✅ **High Coverage**: Tests for all major components and pages
- ✅ **User-Centric**: Tests focus on user behavior and interactions
- ✅ **Maintainable**: Well-organized with shared utilities
- ✅ **Reliable**: Isolated tests with proper mocking
- ✅ **Documented**: Clear patterns and examples

Run the tests regularly during development to catch issues early and ensure code quality!
