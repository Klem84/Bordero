import type { Config } from 'tailwindcss';

export default {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Identité Bordero (provisoire, à affiner avec la charte)
        bordero: {
          DEFAULT: '#0f4c5c',
          600: '#0f4c5c',
          500: '#15697f',
          50: '#eef6f8',
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
