/**
 * Home page component - displays the main post feed
 */

import React from 'react';
import styled from 'styled-components';

const Container = styled.div`
  max-width: 680px;
  margin: 0 auto;
  padding: ${({ theme }) => theme.spacing.md};
`;

const Title = styled.h1`
  color: ${({ theme }) => theme.colors.text.primary};
  margin-bottom: ${({ theme }) => theme.spacing.lg};
  font-size: 2rem;
`;

const Placeholder = styled.div`
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  padding: ${({ theme }) => theme.spacing.xl};
  text-align: center;
  color: ${({ theme }) => theme.colors.text.secondary};
`;

const HomePage: React.FC = () => {
  return (
    <Container>
      <Title>Welcome to Social Media Platform</Title>
      <Placeholder>
        <h3>Post Feed Coming Soon!</h3>
        <p>This will display the main feed of posts from all users.</p>
      </Placeholder>
    </Container>
  );
};

export default HomePage;