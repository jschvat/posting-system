/**
 * Theme configuration for styled-components
 */

export const theme = {
  colors: {
    primary: '#1877f2',
    primaryDark: '#166fe5',
    primaryLight: 'rgba(24, 119, 242, 0.1)',
    secondary: '#42b883',
    accent: '#e74c3c',
    background: '#f0f2f5',
    surface: '#ffffff',
    text: {
      primary: '#1c1e21',
      secondary: '#65676b',
      muted: '#8a8d91'
    },
    textLight: '#8a8d91',
    textSecondary: '#65676b',
    border: '#e4e6ea',
    error: '#e74c3c',
    errorLight: 'rgba(231, 76, 60, 0.1)',
    success: '#00d084',
    successLight: 'rgba(0, 208, 132, 0.1)',
    warning: '#f39c12',
    hover: '#f7f8fa'
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
    lg: '12px',
    full: '9999px'
  },
  fontSize: {
    xs: '12px',
    sm: '14px',
    md: '16px',
    lg: '18px',
    xl: '24px'
  },
  fontWeight: {
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700
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

export type Theme = typeof theme;
