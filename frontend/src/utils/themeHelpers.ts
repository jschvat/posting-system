/**
 * Theme utility helpers for styled-components
 * Workaround for TypeScript module augmentation issues with react-scripts
 */

import { theme } from '../styles/theme';

export type AppTheme = typeof theme;

// Helper to properly type theme in styled components
export const getTheme = <P extends object>(
  props: P & { theme?: any }
): AppTheme => {
  return props.theme as AppTheme;
};
