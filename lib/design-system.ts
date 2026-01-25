// Design System Constants for OS Athena
// Centralized spacing, typography, and component styles

/**
 * Spacing scale (4px base unit)
 * Based on Tailwind's spacing scale for consistency
 */
export const spacing = {
  xs: '0.25rem',   // 4px
  sm: '0.5rem',    // 8px
  md: '1rem',      // 16px
  lg: '1.5rem',    // 24px
  xl: '2rem',      // 32px
  '2xl': '3rem',   // 48px
  '3xl': '4rem',   // 64px
} as const;

/**
 * Border radius values
 * Consistent rounded corners for different UI elements
 */
export const radius = {
  sm: '0.375rem',  // 6px - small elements (tags, badges)
  md: '0.5rem',    // 8px - cards, buttons
  lg: '0.75rem',   // 12px - larger cards
  xl: '1rem',      // 16px - modals, panels
  '2xl': '1.25rem', // 20px - large containers
  full: '9999px',  // Pill shape
} as const;

/**
 * Component heights
 * Standardized heights for consistent touch targets
 */
export const heights = {
  input: '2.75rem',  // 44px - touch friendly input
  button: '2.5rem',  // 40px - standard button
  toolbar: '3rem',   // 48px - toolbar height
  header: '4rem',    // 64px - page header
} as const;

/**
 * Shadow styles
 * Enhanced flat design with subtle depth
 */
export const shadows = {
  flat: '0 2px 0 0 rgba(0, 0, 0, 0.15)',
  'flat-lg': '0 4px 0 0 rgba(0, 0, 0, 0.18)',
  'flat-xl': '0 6px 0 0 rgba(0, 0, 0, 0.2)',
  'flat-blue': '0 3px 0 0 rgba(3, 102, 214, 0.45)',
  'flat-blue-lg': '0 5px 0 0 rgba(3, 102, 214, 0.55)',
  glow: '0 0 20px rgba(3, 102, 214, 0.25)',
  'glow-lg': '0 0 30px rgba(3, 102, 214, 0.3)',
} as const;

/**
 * Font sizes
 * Consistent type scale for headings and body text
 */
export const fontSizes = {
  xs: '0.75rem',    // 12px
  sm: '0.875rem',   // 14px
  base: '1rem',     // 16px
  lg: '1.125rem',   // 18px
  xl: '1.25rem',    // 20px
  '2xl': '1.5rem',  // 24px
  '3xl': '1.875rem', // 30px
  '4xl': '2.25rem', // 36px
} as const;

/**
 * Font weights
 */
export const fontWeights = {
  normal: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
} as const;

/**
 * Z-index scale
 * Organized layering for components
 */
export const zIndex = {
  base: 0,
  dropdown: 10,
  sticky: 20,
  fixed: 30,
  modalBackdrop: 40,
  modal: 50,
  popover: 60,
  tooltip: 70,
} as const;

/**
 * Transition durations
 */
export const durations = {
  fast: '100ms',
  normal: '150ms',
  slow: '200ms',
  slower: '300ms',
} as const;
