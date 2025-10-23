import 'styled-components';
import React from 'react';

// Add JSX namespace for compatibility with react-icons
declare global {
  namespace JSX {
    interface Element extends React.ReactElement<any, any> { }
  }
}

declare module 'styled-components' {
  export interface DefaultTheme {
    colors: {
      primary: string;
      primaryDark: string;
      primaryLight: string;
      secondary: string;
      accent: string;
      background: string;
      surface: string;
      text: {
        primary: string;
        secondary: string;
        muted: string;
      };
      textLight: string;
      textSecondary: string;
      border: string;
      error: string;
      errorLight: string;
      success: string;
      successLight: string;
      warning: string;
      hover: string;
    };
    spacing: {
      xs: string;
      sm: string;
      md: string;
      lg: string;
      xl: string;
      xxl: string;
    };
    borderRadius: {
      sm: string;
      md: string;
      lg: string;
      full: string;
    };
    fontSize: {
      xs: string;
      sm: string;
      md: string;
      lg: string;
      xl: string;
    };
    fontWeight: {
      normal: number;
      medium: number;
      semibold: number;
      bold: number;
    };
    shadows: {
      sm: string;
      md: string;
      lg: string;
    };
    breakpoints: {
      mobile: string;
      tablet: string;
      desktop: string;
      wide: string;
    };
  }
}
