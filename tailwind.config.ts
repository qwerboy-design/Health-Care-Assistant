import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        // Medical AI Design System - Warm Notion-inspired
        terracotta: {
          DEFAULT: '#D97757',
          soft: '#F1A98A',
          deep: '#C35E3F',
        },
        paper: {
          DEFAULT: '#FDFAF7',
          gray50: '#FAF8F6',
          gray100: '#F5F2EE',
          gray200: '#E8E4DF',
          gray700: '#57534E',
          gray900: '#292524',
        },
        medical: {
          purple: '#8B5CF6',
        },
      },
      fontFamily: {
        sans: ['Inter', 'Noto Sans TC', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        serif: ['Merriweather', 'Noto Serif TC', 'Georgia', 'serif'],
        mono: ['JetBrains Mono', 'Consolas', 'monospace'],
      },
      spacing: {
        'xs': '4px',
        'sm': '8px',
        'md': '16px',
        'lg': '24px',
        'xl': '32px',
        '2xl': '48px',
        '3xl': '64px',
      },
      borderRadius: {
        'sm': '4px',
        'md': '8px',
        'lg': '10px',
        'xl': '12px',
        '2xl': '18px',
      },
      boxShadow: {
        'soft': '0 1px 2px rgba(0, 0, 0, 0.04)',
        'card': '0 2px 8px rgba(0, 0, 0, 0.06)',
        'hover': '0 4px 16px rgba(0, 0, 0, 0.08)',
        'modal': '0 8px 24px rgba(0, 0, 0, 0.12)',
        'terracotta': '0 4px 12px rgba(217, 119, 87, 0.2)',
      },
    },
  },
  plugins: [],
};
export default config;
