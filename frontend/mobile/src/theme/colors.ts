export const lightColors = {
  // Primary - Green (from Stitch)
  primary: '#10b77f',
  primaryDark: '#0d9668',
  primaryLight: '#14c99e',

  // Secondary/Accent - Orange (from Stitch)
  secondary: '#f59e0b',
  secondaryDark: '#d97706',
  secondaryLight: '#fbbf24',

  // Accent Yellow
  accent: '#facc15',
  accentDark: '#eab308',
  accentLight: '#fde047',

  // Status colors
  success: '#10b77f',
  warning: '#f59e0b',
  error: '#ef4444',
  info: '#3b82f6',

  // Neutral colors
  white: '#ffffff',
  black: '#000000',
  background: '#f6f8f7',  // Changed from #f8fafc
  backgroundDark: '#10221c',
  surface: '#ffffff',
  surfaceSecondary: '#f8fafc',
  surfaceDark: '#1e293b',

  // Text colors
  textPrimary: '#1e293b',
  textSecondary: '#64748b',
  textTertiary: '#94a3b8',
  textWhite: '#ffffff',
  textLight: '#cbd5e1',

  // Border colors
  border: '#e2e8f0',
  borderDark: '#475569',

  // Overlay
  overlay: 'rgba(0, 0, 0, 0.5)',
  overlayLight: 'rgba(0, 0, 0, 0.3)',

  // Gradients - Updated for Stitch design
  gradientPrimary: ['#10b77f', '#0d9668'] as const,
  gradientSecondary: ['#10b77f', '#f59e0b'] as const,
  gradientAccent: ['#f59e0b', '#facc15'] as const,
  gradientDark: ['#1e293b', '#334155'] as const,

  // New Stitch-specific
  accentOrange: '#f59e0b',
  accentYellow: '#facc15',
  backgroundLight: '#f6f8f7',
  backgroundDarkStitch: '#10221c',

  // Legacy aliases
  text: '#1e293b',
};

export const darkColors = {
  primary: '#10b77f',
  primaryDark: '#0d9668',
  primaryLight: '#14c99e',

  secondary: '#f59e0b',
  secondaryDark: '#d97706',
  secondaryLight: '#fbbf24',

  accent: '#facc15',
  accentDark: '#eab308',
  accentLight: '#fde047',

  success: '#10b77f',
  warning: '#f59e0b',
  error: '#ef4444',
  info: '#3b82f6',

  white: '#ffffff',
  black: '#000000',
  background: '#0f1a14',
  backgroundDark: '#0a1209',
  surface: '#1a2e22',
  surfaceSecondary: '#16241c',
  surfaceDark: '#0f1a14',

  textPrimary: '#f1f5f4',
  textSecondary: '#94a3b8',
  textTertiary: '#64748b',
  textWhite: '#ffffff',
  textLight: '#475569',

  border: '#2d4a38',
  borderDark: '#1a3025',

  overlay: 'rgba(0, 0, 0, 0.7)',
  overlayLight: 'rgba(0, 0, 0, 0.5)',

  gradientPrimary: ['#10b77f', '#0d9668'] as const,
  gradientSecondary: ['#10b77f', '#f59e0b'] as const,
  gradientAccent: ['#f59e0b', '#facc15'] as const,
  gradientDark: ['#0f1a14', '#1a2e22'] as const,

  accentOrange: '#f59e0b',
  accentYellow: '#facc15',
  backgroundLight: '#1a2e22',
  backgroundDarkStitch: '#0a1209',

  text: '#f1f5f4',
};

export type AppColors = typeof lightColors;

// Keep backward-compatible default export so existing imports don't break during migration
export const colors = lightColors;
