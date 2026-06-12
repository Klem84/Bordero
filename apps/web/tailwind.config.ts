import type { Config } from 'tailwindcss';

export default {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: 'var(--bg)',
        surface: 'var(--surface)',
        'surface-2': 'var(--surface-2)',
        border: 'var(--border)',
        ink: { DEFAULT: 'var(--ink)', muted: 'var(--ink-muted)' },
        brand: {
          DEFAULT: 'var(--brand)',
          hover: 'var(--brand-hover)',
          subtle: 'var(--brand-subtle)',
          ink: 'var(--brand-ink)',
        },
        sidebar: {
          DEFAULT: 'var(--sidebar)',
          2: 'var(--sidebar-2)',
          ink: 'var(--sidebar-ink)',
          muted: 'var(--sidebar-muted)',
        },
        success: { DEFAULT: 'var(--success)', subtle: 'var(--success-subtle)' },
        warning: { DEFAULT: 'var(--warning)', subtle: 'var(--warning-subtle)' },
        danger: { DEFAULT: 'var(--danger)', subtle: 'var(--danger-subtle)' },
        info: { DEFAULT: 'var(--info)', subtle: 'var(--info-subtle)' },
        // Alias transitoire le temps de migrer tous les écrans vers les tokens.
        bordero: {
          DEFAULT: 'var(--brand)',
          50: 'var(--brand-subtle)',
          500: 'var(--brand-hover)',
        },
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      borderRadius: {
        lg: '0.625rem',
        xl: '0.875rem',
      },
      boxShadow: {
        card: '0 1px 2px -1px oklch(0.27 0.022 235 / 0.08), 0 2px 8px -2px oklch(0.27 0.022 235 / 0.06)',
        'card-hover': '0 2px 4px -1px oklch(0.27 0.022 235 / 0.1), 0 8px 24px -4px oklch(0.27 0.022 235 / 0.1)',
        ring: '0 0 0 3px var(--ring)',
      },
      transitionTimingFunction: {
        'out-quart': 'cubic-bezier(0.25, 1, 0.5, 1)',
      },
    },
  },
  plugins: [],
} satisfies Config;
