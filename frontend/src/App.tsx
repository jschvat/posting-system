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
import NotFoundPage from './pages/NotFoundPage';

// Import components
import Header from './components/Header';
import Sidebar from './components/Sidebar';

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

// Theme configuration
const theme = {
  colors: {
    primary: '#1877f2',
    secondary: '#42b883',
    accent: '#e74c3c',
    background: '#f0f2f5',
    surface: '#ffffff',
    text: {
      primary: '#1c1e21',
      secondary: '#65676b',
      muted: '#8a8d91'
    },
    border: '#e4e6ea',
    error: '#e74c3c',
    success: '#00d084',
    warning: '#f39c12'
  },
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px',
    xxl: '48px'
  },
  borderRadius: {
    sm: '4px',
    md: '8px',
    lg: '12px'
  },
  shadows: {
    sm: '0 1px 2px rgba(0, 0, 0, 0.1)',
    md: '0 2px 8px rgba(0, 0, 0, 0.1)',
    lg: '0 4px 16px rgba(0, 0, 0, 0.15)'
  },
  breakpoints: {
    mobile: '480px',
    tablet: '768px',
    desktop: '1024px',
    wide: '1200px'
  }
};

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