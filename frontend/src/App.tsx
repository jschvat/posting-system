/**
 * Main App component for the social media posting platform
 * Sets up routing, React Query client, and global providers
 */

import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import styled, { ThemeProvider, createGlobalStyle } from 'styled-components';

// Import centralized configuration
import { config } from './config/app.config';

// Import contexts
import { AuthProvider, useAuth } from './contexts/AuthContext';

// Import pages
import LoginPage from './pages/LoginPage';
import HomePage from './pages/HomePage';
import PostPage from './pages/PostPage';
import UserProfilePage from './pages/UserProfilePage';
import CreatePostPage from './pages/CreatePostPage';
import EditProfilePage from './pages/EditProfilePage';
import NotFoundPage from './pages/NotFoundPage';
import GroupListPage from './pages/GroupListPage';
import GroupPage from './pages/GroupPage';
import CreateGroupPage from './pages/CreateGroupPage';
import GroupPostPage from './pages/GroupPostPage';
import GroupModPage from './pages/GroupModPage';
import GroupSettingsPage from './pages/GroupSettingsPage';

// Import components
import Header from './components/Header';
import Sidebar from './components/Sidebar';

// Import theme
import { theme } from './styles/theme';

// Create React Query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

// Global styles
const GlobalStyle = createGlobalStyle`
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
      'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
      sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    background-color: ${({ theme }) => theme.colors.background};
    color: ${({ theme }) => theme.colors.text.primary};
    line-height: 1.6;
  }

  code {
    font-family: source-code-pro, Menlo, Monaco, Consolas, 'Courier New',
      monospace;
  }

  a {
    color: ${({ theme }) => theme.colors.primary};
    text-decoration: none;

    &:hover {
      text-decoration: underline;
    }
  }

  button {
    cursor: pointer;
    border: none;
    outline: none;
    font-family: inherit;

    &:disabled {
      cursor: not-allowed;
      opacity: 0.6;
    }
  }

  input, textarea {
    font-family: inherit;
    outline: none;
  }

  img {
    max-width: 100%;
    height: auto;
  }

  .visually-hidden {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }
`;

// Styled components for layout
const AppContainer = styled.div`
  min-height: 100vh;
  display: flex;
  flex-direction: column;
`;

const MainContainer = styled.div`
  display: flex;
  flex: 1;
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;
`;

const ContentArea = styled.main`
  flex: 1;
  padding: ${({ theme }) => theme.spacing.md};
  min-height: calc(100vh - 60px); // Adjust based on header height

  @media (max-width: ${({ theme }) => theme.breakpoints.tablet}) {
    padding: ${({ theme }) => theme.spacing.sm};
  }
`;

const SidebarContainer = styled.aside`
  width: 280px;
  padding: ${({ theme }) => theme.spacing.md};
  background-color: ${({ theme }) => theme.colors.surface};
  border-right: 1px solid ${({ theme }) => theme.colors.border};

  @media (max-width: ${({ theme }) => theme.breakpoints.tablet}) {
    display: none;
  }
`;

// Protected Route wrapper component
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { state } = useAuth();

  if (state.isLoading) {
    return (
      <AppContainer>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
          <div>Loading...</div>
        </div>
      </AppContainer>
    );
  }

  if (!state.isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

// Main app layout for authenticated users
const AuthenticatedApp: React.FC = () => {
  return (
    <AppContainer>
      {/* Header Navigation */}
      <Header />

      <MainContainer>
        {/* Sidebar Navigation */}
        <SidebarContainer>
          <Sidebar />
        </SidebarContainer>

        {/* Main Content Area */}
        <ContentArea>
          <Routes>
            {/* Home page - main feed */}
            <Route path="/" element={<HomePage />} />

            {/* Create new post */}
            <Route path="/create" element={<CreatePostPage />} />

            {/* Single post view */}
            <Route path="/post/:postId" element={<PostPage />} />

            {/* User profile */}
            <Route path="/user/:userId" element={<UserProfilePage />} />
            <Route path="/profile/:userId" element={<UserProfilePage />} />

            {/* Edit profile / Settings */}
            <Route path="/settings" element={<EditProfilePage />} />
            <Route path="/profile/edit" element={<EditProfilePage />} />

            {/* Groups */}
            <Route path="/groups" element={<GroupListPage />} />
            <Route path="/groups/create" element={<CreateGroupPage />} />
            <Route path="/g/:slug" element={<GroupPage />} />
            <Route path="/g/:slug/moderate" element={<GroupModPage />} />
            <Route path="/g/:slug/settings" element={<GroupSettingsPage />} />
            <Route path="/g/:slug/posts/:postId" element={<GroupPostPage />} />

            {/* Redirect to home for any other routes */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </ContentArea>
      </MainContainer>
    </AppContainer>
  );
};

/**
 * Main App Component
 */
const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <GlobalStyle />
        <Router>
          <AuthProvider>
            <Routes>
              {/* Login page for unauthenticated users */}
              <Route path="/login" element={<LoginPage />} />

              {/* All other routes require authentication */}
              <Route path="/*" element={
                <ProtectedRoute>
                  <AuthenticatedApp />
                </ProtectedRoute>
              } />
            </Routes>
          </AuthProvider>
        </Router>

        {/* React Query DevTools (only in development) */}
        {config.isDevelopment && (
          <ReactQueryDevtools initialIsOpen={false} />
        )}
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;