/**
 * Create post page component - form for creating new posts
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
  font-size: 1.5rem;
`;

const Placeholder = styled.div`
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  padding: ${({ theme }) => theme.spacing.xl};
  text-align: center;
  color: ${({ theme }) => theme.colors.text.secondary};
`;

const CreatePostPage: React.FC = () => {
  return (
    <Container>
      <Title>Create New Post</Title>
      <Placeholder>
        <h3>Post Creation Form</h3>
        <p>Form for creating new posts with media upload will be here.</p>
      </Placeholder>
    </Container>
  );
};

export default CreatePostPage;