/** Shared accent colors for RoPE views, dashboard legend, and SVG styling. */
export const VISUAL_TOKENS = {
  query: '#38bdf8',
  key: '#fb7185',
  relative: '#a78bfa',
  edge: '#e879f9',
  cyan: '#00f0ff',
  magenta: '#ff007f',
  amber: '#ffb000',
  mainline: '#e2e8f0',
} as const

export type VisualTokenKey = keyof typeof VISUAL_TOKENS
