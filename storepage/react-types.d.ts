// Fix for React 19 type compatibility with Radix UI and other libraries
declare module 'react' {
  // Override ReactNode to be compatible with both React 18 and 19
  type ReactNode = import('react').ReactElement | string | number | Iterable<import('react').ReactNode> | import('react').ReactPortal | boolean | null | undefined;
}
