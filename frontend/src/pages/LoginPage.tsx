/**
 * Login and Registration Page
 */

import React, { useState } from 'react';
import styled from 'styled-components';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const LoginContainer = styled.div`
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: ${({ theme }) => theme.spacing.md};
`;

const LoginCard = styled.div`
  background: ${({ theme }) => theme.colors.surface};
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  box-shadow: ${({ theme }) => theme.shadows.lg};
  padding: ${({ theme }) => theme.spacing.xxl};
  width: 100%;
  max-width: 400px;
`;

const Logo = styled.h1`
  text-align: center;
  color: ${({ theme }) => theme.colors.primary};
  margin-bottom: ${({ theme }) => theme.spacing.xl};
  font-size: 2rem;
  font-weight: bold;
`;

const TabContainer = styled.div`
  display: flex;
  margin-bottom: ${({ theme }) => theme.spacing.lg};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
`;

const Tab = styled.button<{ $active: boolean }>`
  flex: 1;
  padding: ${({ theme }) => theme.spacing.md};
  background: none;
  border: none;
  font-size: 1rem;
  font-weight: 500;
  color: ${({ theme, $active }) => $active ? theme.colors.primary : theme.colors.text.secondary};
  border-bottom: 2px solid ${({ theme, $active }) => $active ? theme.colors.primary : 'transparent'};
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    color: ${({ theme }) => theme.colors.primary};
  }
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.md};
`;

const InputGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.xs};
`;

const Label = styled.label`
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: 0.9rem;
`;

const Input = styled.input`
  padding: ${({ theme }) => theme.spacing.md};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  font-size: 1rem;
  transition: border-color 0.2s ease;

  &:focus {
    border-color: ${({ theme }) => theme.colors.primary};
    outline: none;
  }

  &::placeholder {
    color: ${({ theme }) => theme.colors.text.muted};
  }
`;

const TextArea = styled.textarea`
  padding: ${({ theme }) => theme.spacing.md};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  font-size: 1rem;
  min-height: 80px;
  resize: vertical;
  font-family: inherit;
  transition: border-color 0.2s ease;

  &:focus {
    border-color: ${({ theme }) => theme.colors.primary};
    outline: none;
  }

  &::placeholder {
    color: ${({ theme }) => theme.colors.text.muted};
  }
`;

const SubmitButton = styled.button<{ $loading?: boolean }>`
  background: ${({ theme }) => theme.colors.primary};
  color: white;
  border: none;
  padding: ${({ theme }) => theme.spacing.md};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s ease;
  margin-top: ${({ theme }) => theme.spacing.md};

  &:hover {
    background: ${({ theme }) => theme.colors.primary}dd;
  }

  &:disabled {
    background: ${({ theme }) => theme.colors.text.muted};
    cursor: not-allowed;
  }

  ${({ $loading }) => $loading && `
    position: relative;
    color: transparent;

    &::after {
      content: '';
      position: absolute;
      width: 20px;
      height: 20px;
      margin: auto;
      border: 2px solid white;
      border-top: 2px solid transparent;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      top: 0;
      left: 0;
      bottom: 0;
      right: 0;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  `}
`;

const ErrorMessage = styled.div`
  background: ${({ theme }) => theme.colors.error}20;
  color: ${({ theme }) => theme.colors.error};
  padding: ${({ theme }) => theme.spacing.md};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  font-size: 0.9rem;
  text-align: center;
`;

const NameInputs = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing.md};
`;

interface LoginFormData {
  username: string;
  password: string;
}

interface RegisterFormData {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
  first_name: string;
  last_name: string;
  bio: string;
}

const LoginPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  const [isLoading, setIsLoading] = useState(false);
  const { state, login, register, clearError } = useAuth();
  const navigate = useNavigate();

  const [loginData, setLoginData] = useState<LoginFormData>({
    username: '',
    password: '',
  });

  const [registerData, setRegisterData] = useState<RegisterFormData>({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    first_name: '',
    last_name: '',
    bio: '',
  });

  // Redirect if already authenticated
  React.useEffect(() => {
    if (state.isAuthenticated) {
      navigate('/');
    }
  }, [state.isAuthenticated, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;

    clearError();
    setIsLoading(true);

    try {
      await login(loginData.username, loginData.password);
      // Navigation will happen automatically due to useEffect above
    } catch (error) {
      // Error is handled by the auth context
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;

    // Validate passwords match
    if (registerData.password !== registerData.confirmPassword) {
      return; // You could set a local error state here
    }

    clearError();
    setIsLoading(true);

    try {
      await register({
        username: registerData.username,
        email: registerData.email,
        password: registerData.password,
        first_name: registerData.first_name,
        last_name: registerData.last_name,
        bio: registerData.bio || undefined,
      });
      // Navigation will happen automatically due to useEffect above
    } catch (error) {
      // Error is handled by the auth context
    } finally {
      setIsLoading(false);
    }
  };

  const handleTabChange = (tab: 'login' | 'register') => {
    setActiveTab(tab);
    clearError();
  };

  return (
    <LoginContainer>
      <LoginCard>
        <Logo>SocialPost</Logo>

        <TabContainer>
          <Tab
            $active={activeTab === 'login'}
            onClick={() => handleTabChange('login')}
          >
            Login
          </Tab>
          <Tab
            $active={activeTab === 'register'}
            onClick={() => handleTabChange('register')}
          >
            Register
          </Tab>
        </TabContainer>

        {state.error && (
          <ErrorMessage>{state.error}</ErrorMessage>
        )}

        {activeTab === 'login' ? (
          <Form onSubmit={handleLogin}>
            <InputGroup>
              <Label htmlFor="login-username">Username</Label>
              <Input
                id="login-username"
                type="text"
                placeholder="Enter your username"
                value={loginData.username}
                onChange={(e) => setLoginData({ ...loginData, username: e.target.value })}
                required
              />
            </InputGroup>

            <InputGroup>
              <Label htmlFor="login-password">Password</Label>
              <Input
                id="login-password"
                type="password"
                placeholder="Enter your password"
                value={loginData.password}
                onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                required
              />
            </InputGroup>

            <SubmitButton
              type="submit"
              disabled={isLoading}
              $loading={isLoading}
            >
              {isLoading ? 'Logging in...' : 'Login'}
            </SubmitButton>
          </Form>
        ) : (
          <Form onSubmit={handleRegister}>
            <InputGroup>
              <Label htmlFor="register-username">Username</Label>
              <Input
                id="register-username"
                type="text"
                placeholder="Choose a username"
                value={registerData.username}
                onChange={(e) => setRegisterData({ ...registerData, username: e.target.value })}
                required
              />
            </InputGroup>

            <InputGroup>
              <Label htmlFor="register-email">Email</Label>
              <Input
                id="register-email"
                type="email"
                placeholder="Enter your email"
                value={registerData.email}
                onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })}
                required
              />
            </InputGroup>

            <NameInputs>
              <InputGroup>
                <Label htmlFor="register-first-name">First Name</Label>
                <Input
                  id="register-first-name"
                  type="text"
                  placeholder="First name"
                  value={registerData.first_name}
                  onChange={(e) => setRegisterData({ ...registerData, first_name: e.target.value })}
                  required
                />
              </InputGroup>

              <InputGroup>
                <Label htmlFor="register-last-name">Last Name</Label>
                <Input
                  id="register-last-name"
                  type="text"
                  placeholder="Last name"
                  value={registerData.last_name}
                  onChange={(e) => setRegisterData({ ...registerData, last_name: e.target.value })}
                  required
                />
              </InputGroup>
            </NameInputs>

            <InputGroup>
              <Label htmlFor="register-password">Password</Label>
              <Input
                id="register-password"
                type="password"
                placeholder="Create a password"
                value={registerData.password}
                onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
                required
              />
            </InputGroup>

            <InputGroup>
              <Label htmlFor="register-confirm-password">Confirm Password</Label>
              <Input
                id="register-confirm-password"
                type="password"
                placeholder="Confirm your password"
                value={registerData.confirmPassword}
                onChange={(e) => setRegisterData({ ...registerData, confirmPassword: e.target.value })}
                required
              />
            </InputGroup>

            <InputGroup>
              <Label htmlFor="register-bio">Bio (Optional)</Label>
              <TextArea
                id="register-bio"
                placeholder="Tell us about yourself..."
                value={registerData.bio}
                onChange={(e) => setRegisterData({ ...registerData, bio: e.target.value })}
                maxLength={500}
              />
            </InputGroup>

            <SubmitButton
              type="submit"
              disabled={isLoading || registerData.password !== registerData.confirmPassword}
              $loading={isLoading}
            >
              {isLoading ? 'Creating Account...' : 'Create Account'}
            </SubmitButton>
          </Form>
        )}
      </LoginCard>
    </LoginContainer>
  );
};

export default LoginPage;