/**
 * Single post page component - displays a post with comments
 */

import React from 'react';
import { useParams } from 'react-router-dom';
import styled from 'styled-components';

const Container = styled.div`
  max-width: 680px;
  margin: 0 auto;
  padding: ${({ theme }) => theme.spacing.md};
`;

const Placeholder = styled.div`
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  padding: ${({ theme }) => theme.spacing.xl};
  text-align: center;
  color: ${({ theme }) => theme.colors.text.secondary};
`;

const PostPage: React.FC = () => {
  const { postId } = useParams<{ postId: string }>();

  return (
    <Container>
      <Placeholder>
        <h3>Post #{postId}</h3>
        <p>Single post view with comments will be displayed here.</p>
      </Placeholder>
    </Container>
  );
};

export default PostPage;